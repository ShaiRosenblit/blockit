import { useReducer, useRef, useState, useCallback, useEffect } from 'react';
import { gameReducer, createInitialState } from './game/gameReducer';
import { canPlacePiece, placePiece, detectCompletedLines } from './game/board';
import { calculatePlacementScore, calculateClearScore } from './game/scoring';
import { GameContext } from './hooks/useGame';
import { Board } from './components/Board';
import { PieceTray, FloatingPiece } from './components/PieceTray';
import { ScoreBar } from './components/ScoreBar';
import { GameOverOverlay } from './components/GameOverOverlay';
import type { Coord, Difficulty } from './game/types';
import { BOARD_SIZE } from './game/types';
import { haptics } from './haptics';
import { sounds } from './sounds';

const DRAG_THRESHOLD_PX = 10;

type ScorePopup = { id: number; value: number; x: number; y: number };

type FlyingOrb = {
  id: number;
  color: string;
  path: string;
  duration: number;
  delay: number;
};

let popupId = 0;
let orbId = 0;

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const boardRef = useRef<HTMLDivElement>(null);
  const scoreValueRef = useRef<HTMLSpanElement>(null);

  const [pendingTray, setPendingTray] = useState<{
    index: number;
    startX: number;
    startY: number;
  } | null>(null);

  const [drag, setDrag] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const lastTrayIndexRef = useRef<number | null>(null);

  const [preview, setPreview] = useState<{
    cells: Map<string, 'valid' | 'invalid'>;
    color: string | null;
    clearCells: Set<string> | null;
  } | null>(null);

  const [placedCells, setPlacedCells] = useState<Set<string> | null>(null);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [flyingOrbs, setFlyingOrbs] = useState<FlyingOrb[]>([]);
  const [scorePulseTick, setScorePulseTick] = useState(0);
  const [muted, setMuted] = useState(() => sounds.isMuted());

  useEffect(() => {
    if (scorePulseTick === 0) return;
    const el = scoreValueRef.current;
    if (!el) return;
    el.classList.remove('score-value--collect-pulse');
    // Force reflow so the animation can restart on rapid successive ticks.
    void el.offsetWidth;
    el.classList.add('score-value--collect-pulse');
    const timeout = window.setTimeout(() => {
      el.classList.remove('score-value--collect-pulse');
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [scorePulseTick]);

  const computeOrigin = useCallback(
    (clientX: number, clientY: number, piece: { width: number; height: number }): Coord | null => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const cellSize = rect.width / BOARD_SIZE;
      const centerCol = (clientX - rect.left) / cellSize - piece.width / 2;
      const centerRow = (clientY - rect.top - 40) / cellSize - piece.height / 2;
      const col = Math.round(centerCol);
      const row = Math.round(centerRow);
      return { row, col };
    },
    []
  );

  const updatePreview = useCallback(
    (clientX: number, clientY: number, trayIndex: number) => {
      const piece = state.tray[trayIndex];
      if (!piece || !boardRef.current) {
        setPreview(null);
        return;
      }
      const origin = computeOrigin(clientX, clientY, piece);
      if (!origin) {
        setPreview(null);
        return;
      }
      const valid = canPlacePiece(state.board, piece, origin);
      const cells = new Map<string, 'valid' | 'invalid'>();
      for (const cell of piece.cells) {
        const r = origin.row + cell.row;
        const c = origin.col + cell.col;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          cells.set(`${r},${c}`, valid ? 'valid' : 'invalid');
        }
      }

      let clearCells: Set<string> | null = null;
      if (valid) {
        const hypothetical = placePiece(state.board, piece, origin);
        const { rows, cols } = detectCompletedLines(hypothetical);
        if (rows.length > 0 || cols.length > 0) {
          clearCells = new Set<string>();
          for (const r of rows) {
            for (let c = 0; c < BOARD_SIZE; c++) clearCells.add(`${r},${c}`);
          }
          for (const c of cols) {
            for (let r = 0; r < BOARD_SIZE; r++) clearCells.add(`${r},${c}`);
          }
        }
      }

      setPreview(cells.size > 0 ? { cells, color: piece.color, clearCells } : null);
    },
    [state.board, state.tray, computeOrigin]
  );

  const spawnCollectOrbs = useCallback(
    (
      cellsToClear: Array<{ row: number; col: number; color: string }>,
      originRow: number,
      originCol: number
    ) => {
      if (cellsToClear.length === 0) return;
      if (!boardRef.current || !scoreValueRef.current) return;

      const boardRect = boardRef.current.getBoundingClientRect();
      const cellSize = boardRect.width / BOARD_SIZE;

      const scoreRect = scoreValueRef.current.getBoundingClientRect();
      const endX = scoreRect.left + scoreRect.width / 2;
      const endY = scoreRect.top + scoreRect.height / 2;

      // Sort so cells nearer to the placement origin leave first — visually
      // reads as a wave radiating out of where the piece landed.
      const withDistance = cellsToClear.map((c) => ({
        ...c,
        _dist: Math.hypot(c.row - originRow, c.col - originCol),
      }));
      withDistance.sort((a, b) => a._dist - b._dist);

      const STAGGER = 45;
      const newOrbs: FlyingOrb[] = withDistance.map((cell, i) => {
        const startX = boardRect.left + (cell.col + 0.5) * cellSize;
        const startY = boardRect.top + (cell.row + 0.5) * cellSize;

        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.hypot(dx, dy);

        // Perpendicular unit vector to bend the bezier arc away from the line.
        const invLen = distance > 0 ? 1 / distance : 0;
        const perpX = -dy * invLen;
        const perpY = dx * invLen;

        // Bias the arc so it always bows "outward" from the score bar
        // (upward/outward looks magical rather than crossing itself).
        const bias = endY < startY ? 1 : -1;
        const arc = (0.18 + Math.random() * 0.22) * distance * bias;
        const jitter = (Math.random() - 0.5) * 40;

        const midX = startX + dx * 0.5 + perpX * arc + jitter;
        const midY = startY + dy * 0.5 + perpY * arc;

        const path = `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`;

        // Farther cells travel slightly longer so everything feels weighty.
        const duration = Math.round(620 + Math.min(distance, 600) * 0.4);
        const delay = i * STAGGER;

        return {
          id: ++orbId,
          color: cell.color,
          path,
          duration,
          delay,
        };
      });

      setFlyingOrbs((prev) => [...prev, ...newOrbs]);

      for (const orb of newOrbs) {
        const arrivalMs = orb.delay + Math.round(orb.duration * 0.92);
        window.setTimeout(() => {
          setScorePulseTick((n) => n + 1);
        }, arrivalMs);

        const removeMs = orb.delay + orb.duration + 160;
        window.setTimeout(() => {
          setFlyingOrbs((prev) => prev.filter((o) => o.id !== orb.id));
        }, removeMs);
      }
    },
    []
  );

  const spawnScorePopup = useCallback((value: number, boardOrigin: Coord) => {
    if (!boardRef.current || value === 0) return;
    const rect = boardRef.current.getBoundingClientRect();
    const cellSize = rect.width / BOARD_SIZE;
    const x = rect.left + (boardOrigin.col + 0.5) * cellSize;
    const y = rect.top + (boardOrigin.row + 0.5) * cellSize;
    const id = ++popupId;
    setScorePopups((prev) => [...prev, { id, value, x, y }]);
    setTimeout(() => {
      setScorePopups((prev) => prev.filter((p) => p.id !== id));
    }, 600);
  }, []);

  const handlePlace = useCallback(
    (trayIndex: number, origin: Coord) => {
      const piece = state.tray[trayIndex];
      if (!piece) return;
      if (!canPlacePiece(state.board, piece, origin)) return;

      // Compute placed cells for snap animation
      const placed = new Set<string>();
      for (const cell of piece.cells) {
        placed.add(`${origin.row + cell.row},${origin.col + cell.col}`);
      }
      setPlacedCells(placed);
      setTimeout(() => setPlacedCells(null), 200);
      haptics.place();
      sounds.place();

      const hypothetical = placePiece(state.board, piece, origin);
      const { rows, cols } = detectCompletedLines(hypothetical);
      const linesCleared = rows.length + cols.length;

      if (linesCleared > 0) {
        haptics.lineClear(linesCleared);
        sounds.lineClear(linesCleared);

        const clearScore = calculateClearScore(linesCleared, state.combo);
        const totalPopup = calculatePlacementScore(piece) + clearScore;
        spawnScorePopup(totalPopup, origin);

        // Build the set of cells about to be cleared, capturing their colors
        // from the hypothetical board (which already includes the piece we
        // just placed). This must happen BEFORE dispatch, so we can read the
        // colors and viewport positions before the reducer wipes them.
        const clearSet = new Set<string>();
        const cellsToClear: Array<{ row: number; col: number; color: string }> = [];
        for (const r of rows) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            const key = `${r},${c}`;
            if (clearSet.has(key)) continue;
            clearSet.add(key);
            const color = hypothetical[r][c];
            if (color) cellsToClear.push({ row: r, col: c, color });
          }
        }
        for (const c of cols) {
          for (let r = 0; r < BOARD_SIZE; r++) {
            const key = `${r},${c}`;
            if (clearSet.has(key)) continue;
            clearSet.add(key);
            const color = hypothetical[r][c];
            if (color) cellsToClear.push({ row: r, col: c, color });
          }
        }

        spawnCollectOrbs(cellsToClear, origin.row, origin.col);
      }

      dispatch({ type: 'PLACE_PIECE', trayIndex, origin });
    },
    [state.board, state.tray, state.combo, spawnScorePopup, spawnCollectOrbs]
  );

  const handleTrayPointerDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    lastTrayIndexRef.current = index;
    setPendingTray({ index, startX: e.clientX, startY: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  useEffect(() => {
    if (pendingTray === null) return;
    const { index, startX, startY } = pendingTray;
    const thresh2 = DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;
    let becameDrag = false;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (dx * dx + dy * dy > thresh2) {
        becameDrag = true;
        setDrag({ index, x: e.clientX, y: e.clientY });
        setPendingTray(null);
        updatePreview(e.clientX, e.clientY, index);
        haptics.pickup();
        sounds.pickup();
      }
    };

    const onUp = () => {
      if (!becameDrag) {
        dispatch({ type: 'ROTATE_TRAY_PIECE', trayIndex: index });
        sounds.rotate();
      }
      setPendingTray(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [pendingTray, updatePreview, dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, [contenteditable="true"]')) return;
      const idx = drag?.index ?? lastTrayIndexRef.current;
      if (idx === null) return;
      if (!state.tray[idx]) return;
      e.preventDefault();
      dispatch({ type: 'ROTATE_TRAY_PIECE', trayIndex: idx });
      sounds.rotate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drag, state.tray, dispatch]);

  useEffect(() => {
    if (drag === null) return;
    updatePreview(drag.x, drag.y, drag.index);
  }, [state.tray, drag, updatePreview]);

  useEffect(() => {
    if (drag === null) return;

    const onMove = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : null));
      updatePreview(e.clientX, e.clientY, drag.index);
    };

    const onUp = (e: PointerEvent) => {
      const piece = state.tray[drag.index];
      let placed = false;
      if (piece && boardRef.current) {
        const origin = computeOrigin(e.clientX, e.clientY, piece);
        if (origin && canPlacePiece(state.board, piece, origin)) {
          handlePlace(drag.index, origin);
          placed = true;
        }
      }
      if (!placed) {
        haptics.invalidDrop();
        sounds.invalidDrop();
      }
      setDrag(null);
      setPreview(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, state.board, state.tray, computeOrigin, updatePreview, handlePlace]);

  const dragPiece = drag ? state.tray[drag.index] : null;

  const difficulties: Difficulty[] = ['zen', 'easy', 'normal', 'hard'];

  return (
    <GameContext value={{ state, dispatch }}>
      <div className="app">
        <div className="header-row">
          <h1 className="title">Blockit</h1>
          <button
            className="sound-toggle"
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              sounds.setMuted(next);
            }}
          >
            {muted ? '\u{1F507}' : '\u{1F50A}'}
          </button>
        </div>
        <div className="difficulty-selector">
          {difficulties.map((d) => (
            <button
              key={d}
              className={`difficulty-btn${d === state.difficulty ? ' difficulty-btn--active' : ''}`}
              onClick={() => {
                if (d !== state.difficulty) dispatch({ type: 'SET_DIFFICULTY', difficulty: d });
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <ScoreBar scoreValueRef={scoreValueRef} />
        <Board
          boardRef={boardRef}
          previewCells={preview?.cells}
          previewColor={preview?.color}
          placedCells={placedCells ?? undefined}
          clearPreviewCells={preview?.clearCells ?? undefined}
        />
        <div className="piece-tray-wrap">
          <PieceTray onTrayPointerDown={handleTrayPointerDown} draggingIndex={drag?.index ?? null} />
          <p className="piece-tray-hint">Tap to rotate · drag to place · R</p>
        </div>
        {drag && dragPiece && (
          <FloatingPiece piece={dragPiece} x={drag.x} y={drag.y} />
        )}
        {scorePopups.map((popup) => (
          <div
            key={popup.id}
            className="score-popup"
            style={{ left: popup.x, top: popup.y }}
          >
            +{popup.value}
          </div>
        ))}
        {flyingOrbs.length > 0 && (
          <div className="magnet-overlay" aria-hidden>
            {flyingOrbs.map((orb) => {
              const baseStyle = {
                '--orb-color': orb.color,
                offsetPath: `path('${orb.path}')`,
                animationDuration: `${orb.duration}ms`,
              } as React.CSSProperties;
              return (
                <div key={orb.id} className="magnet-orb-flight">
                  <div
                    className="magnet-orb"
                    style={{ ...baseStyle, animationDelay: `${orb.delay}ms` }}
                  />
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`magnet-sparkle magnet-sparkle--${i}`}
                      style={{
                        ...baseStyle,
                        animationDelay: `${orb.delay + i * 55}ms`,
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
        <GameOverOverlay />
      </div>
    </GameContext>
  );
}
