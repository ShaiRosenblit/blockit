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
type AnimCell = { r: number; c: number; color: string; delay: number };
export type ClearAnim = { id: number; cells: AnimCell[] };

let popupId = 0;
let animId = 0;

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const boardRef = useRef<HTMLDivElement>(null);

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
  const [clearAnim, setClearAnim] = useState<ClearAnim | null>(null);
  const [muted, setMuted] = useState(() => sounds.isMuted());

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

        // Capture clearing cells for topple animation
        const cellMap = new Map<string, AnimCell>();
        for (const r of rows) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            const delay = c * 25;
            const key = `${r},${c}`;
            if (!cellMap.has(key) || cellMap.get(key)!.delay > delay)
              cellMap.set(key, { r, c, color: hypothetical[r][c] ?? '#fff', delay });
          }
        }
        for (const col of cols) {
          for (let r = 0; r < BOARD_SIZE; r++) {
            const delay = r * 25;
            const key = `${r},${col}`;
            if (!cellMap.has(key) || cellMap.get(key)!.delay > delay)
              cellMap.set(key, { r, c: col, color: hypothetical[r][col] ?? '#fff', delay });
          }
        }
        const id = ++animId;
        setClearAnim({ id, cells: [...cellMap.values()] });
        setTimeout(() => setClearAnim((prev) => (prev?.id === id ? null : prev)), 500);
      }

      dispatch({ type: 'PLACE_PIECE', trayIndex, origin });
    },
    [state.board, state.tray, state.combo, spawnScorePopup]
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
        <ScoreBar />
        <Board
          boardRef={boardRef}
          previewCells={preview?.cells}
          previewColor={preview?.color}
          placedCells={placedCells ?? undefined}
          clearPreviewCells={preview?.clearCells ?? undefined}
          clearAnim={clearAnim ?? undefined}
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
        <GameOverOverlay />
      </div>
    </GameContext>
  );
}
