import { useReducer, useRef, useState, useCallback, useEffect } from 'react';
import { gameReducer, createInitialState } from './game/gameReducer';
import { canPlacePiece, placePiece, detectCompletedLines } from './game/board';
import { calculatePlacementScore, calculateClearScore } from './game/scoring';
import { GameContext } from './hooks/useGame';
import { Board } from './components/Board';
import { PieceTray, FloatingPiece } from './components/PieceTray';
import { ScoreBar } from './components/ScoreBar';
import { GameOverOverlay } from './components/GameOverOverlay';
import type { Coord } from './game/types';
import { BOARD_SIZE, CLASSIC_DIFFICULTIES, RIDDLE_DIFFICULTIES } from './game/types';
import { haptics } from './haptics';
import { sounds } from './sounds';
import { DRAG_POINTER_OFFSET_X, DRAG_POINTER_OFFSET_Y, dragPointerToEffective } from './dragConstants';
import { buildShareUrl, clearShareHash, decodeRiddle, parseSharePayload } from './game/sharing';
import { TUTORIAL_STEPS, TUTORIAL_STEP_COUNT } from './game/tutorial';
import { TutorialBanner } from './components/TutorialBanner';
import { Celebration } from './components/Celebration';
import type { RiddleDifficulty } from './game/types';

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
let celebrationRunId = 0;

/**
 * Map a riddle difficulty to a 0..1 celebration intensity. Tutorial steps
 * get a modest cheer (with the final step bumped a bit for graduation);
 * numeric riddles ramp linearly so Riddle 5 feels genuinely triumphant.
 */
function difficultyToCelebrationIntensity(
  difficulty: RiddleDifficulty,
  tutorialStep: number
): number {
  if (difficulty === 'tutorial') {
    const isLast = tutorialStep >= TUTORIAL_STEP_COUNT - 1;
    return isLast ? 0.55 : 0.2;
  }
  // Riddle levels 1..5 map to 0.32..1.0 — noticeable escalation between steps.
  const t = (difficulty - 1) / 4;
  return 0.32 + t * 0.68;
}

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
    /** Pointer when drag started (after threshold); deltas are scaled from here. */
    anchorX: number;
    anchorY: number;
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
  const [shareStatus, setShareStatus] = useState<null | 'copied' | 'failed'>(null);
  const [celebration, setCelebration] = useState<{
    intensity: number;
    centerX: number;
    centerY: number;
    runId: number;
  } | null>(null);

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
      const lx = clientX + DRAG_POINTER_OFFSET_X;
      const ly = clientY + DRAG_POINTER_OFFSET_Y;
      const centerCol = (lx - rect.left) / cellSize - piece.width / 2;
      const centerRow = (ly - rect.top) / cellSize - piece.height / 2;
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

      const STAGGER = 22;
      const newOrbs: FlyingOrb[] = withDistance.map((cell, i) => {
        const startX = boardRect.left + (cell.col + 0.5) * cellSize;
        const startY = boardRect.top + (cell.row + 0.5) * cellSize;

        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.hypot(dx, dy);

        const invLen = distance > 0 ? 1 / distance : 0;
        const perpX = -dy * invLen;
        const perpY = dx * invLen;

        const bias = endY < startY ? 1 : -1;
        const arc = (0.16 + Math.random() * 0.18) * distance * bias;
        const jitter = (Math.random() - 0.5) * 32;

        const midX = startX + dx * 0.5 + perpX * arc + jitter;
        const midY = startY + dy * 0.5 + perpY * arc;

        const path = `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`;

        const duration = Math.round(320 + Math.min(distance, 600) * 0.22);
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
        const arrivalMs = orb.delay + Math.round(orb.duration * 0.88);
        window.setTimeout(() => {
          setScorePulseTick((n) => n + 1);
        }, arrivalMs);

        const removeMs = orb.delay + orb.duration + 100;
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

  const handleShare = useCallback(async () => {
    const { riddleInitialBoard, riddleInitialTray, riddleTarget, riddleDifficulty } = state;
    if (!riddleInitialBoard || !riddleInitialTray || !riddleTarget) return;
    // Tutorial puzzles are authored per-step and aren't shareable — the
    // encoder expects a numeric difficulty anyway.
    if (riddleDifficulty === 'tutorial') return;
    let url: string;
    try {
      url = buildShareUrl({
        difficulty: riddleDifficulty,
        board: riddleInitialBoard,
        tray: riddleInitialTray,
        target: riddleTarget,
      });
    } catch {
      setShareStatus('failed');
      return;
    }

    haptics.pickup();
    sounds.pickup();

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Blockit riddle', text: 'Can you solve this Blockit riddle?', url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('copied');
    } catch {
      const ok = window.prompt('Copy this link to share the riddle:', url);
      setShareStatus(ok === null ? null : 'copied');
    }
  }, [state]);

  useEffect(() => {
    if (shareStatus === null) return;
    const t = window.setTimeout(() => setShareStatus(null), 1800);
    return () => window.clearTimeout(t);
  }, [shareStatus]);

  // Riddle-solve celebration. Wait one frame after riddleResult flips to
  // 'solved' so the board has painted its final cleared state underneath —
  // otherwise the confetti lands on the board mid-clear animation.
  const lastSolveKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.mode !== 'riddle') return;
    if (state.riddleResult !== 'solved') {
      // Reset tracker so the next solve of the same puzzle re-fires.
      lastSolveKeyRef.current = null;
      return;
    }
    const key = `${state.riddleDifficulty}:${state.tutorialStep}`;
    if (lastSolveKeyRef.current === key) return;
    lastSolveKeyRef.current = key;

    const rect = boardRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const centerY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    const intensity = difficultyToCelebrationIntensity(
      state.riddleDifficulty,
      state.tutorialStep
    );

    setCelebration({ intensity, centerX, centerY, runId: ++celebrationRunId });
    haptics.celebrate(intensity);
    sounds.celebrate(intensity);
  }, [state.mode, state.riddleResult, state.riddleDifficulty, state.tutorialStep]);

  // A hash-based share link arriving while the app is already open (e.g.
  // the browser focuses an existing tab instead of reloading) only triggers
  // `hashchange` — the initial-load code path in createInitialState won't
  // run. We also cover `popstate` for back/forward navigation. Internal
  // hash cleanup uses history.replaceState, which does not fire either of
  // these, so there's no feedback loop to worry about.
  useEffect(() => {
    const loadFromHash = () => {
      const payload = parseSharePayload();
      if (!payload) return;
      const decoded = decodeRiddle(payload);
      if (!decoded) return;
      dispatch({
        type: 'LOAD_SHARED_RIDDLE',
        difficulty: decoded.difficulty,
        board: decoded.board,
        tray: decoded.tray,
        target: decoded.target,
      });
      setDrag(null);
      setPendingTray(null);
      setPreview(null);
    };
    window.addEventListener('hashchange', loadFromHash);
    window.addEventListener('popstate', loadFromHash);
    return () => {
      window.removeEventListener('hashchange', loadFromHash);
      window.removeEventListener('popstate', loadFromHash);
    };
  }, []);

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
        const ax = e.clientX;
        const ay = e.clientY;
        setDrag({ index, anchorX: ax, anchorY: ay, x: ax, y: ay });
        setPendingTray(null);
        updatePreview(ax, ay, index);
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

  // Refresh placement preview when the tray piece changes during drag (e.g. rotate).
  // Pointer moves call updatePreview in the drag listener — do not also depend on `drag`
  // here or every move runs this effect and double-updates preview (flicker).
  useEffect(() => {
    if (drag === null) return;
    const { x: ex, y: ey } = dragPointerToEffective(drag.x, drag.y, drag.anchorX, drag.anchorY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync preview after tray commit (rotate during drag)
    updatePreview(ex, ey, drag.index);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally tray-only; drag read from latest render
  }, [state.tray, updatePreview]);

  useEffect(() => {
    if (drag === null) return;

    const onMove = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : null));
      const { x: ex, y: ey } = dragPointerToEffective(e.clientX, e.clientY, drag.anchorX, drag.anchorY);
      updatePreview(ex, ey, drag.index);
    };

    const onUp = (e: PointerEvent) => {
      const piece = state.tray[drag.index];
      let placed = false;
      if (piece && boardRef.current) {
        const { x: ex, y: ey } = dragPointerToEffective(e.clientX, e.clientY, drag.anchorX, drag.anchorY);
        const origin = computeOrigin(ex, ey, piece);
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
  const dragFloatPos =
    drag && dragPiece
      ? dragPointerToEffective(drag.x, drag.y, drag.anchorX, drag.anchorY)
      : null;
  const dragFloatCellSize = boardRef.current
    ? boardRef.current.getBoundingClientRect().width / BOARD_SIZE
    : 40;

  const modes: { id: 'classic' | 'riddle'; label: string }[] = [
    { id: 'classic', label: 'Classic' },
    { id: 'riddle', label: 'Riddle' },
  ];

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
        <div className="mode-selector" role="tablist" aria-label="Game mode">
          {modes.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={m.id === state.mode}
              className={`mode-btn${m.id === state.mode ? ' mode-btn--active' : ''}`}
              onClick={() => {
                if (m.id !== state.mode) {
                  clearShareHash();
                  dispatch({ type: 'SET_MODE', mode: m.id });
                }
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="difficulty-selector" role="tablist" aria-label="Difficulty">
          {state.mode === 'classic'
            ? CLASSIC_DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  role="tab"
                  aria-selected={d === state.classicDifficulty}
                  className={`difficulty-btn${d === state.classicDifficulty ? ' difficulty-btn--active' : ''}`}
                  onClick={() => {
                    if (d !== state.classicDifficulty) {
                      clearShareHash();
                      dispatch({ type: 'SET_CLASSIC_DIFFICULTY', difficulty: d });
                    }
                  }}
                >
                  {d}
                </button>
              ))
            : RIDDLE_DIFFICULTIES.map((d) => {
                const label = d === 'tutorial' ? 'Tutorial' : d;
                const tutorialClass = d === 'tutorial' ? ' difficulty-btn--tutorial' : '';
                return (
                  <button
                    key={d}
                    role="tab"
                    aria-selected={d === state.riddleDifficulty}
                    className={`difficulty-btn difficulty-btn--riddle${tutorialClass}${d === state.riddleDifficulty ? ' difficulty-btn--active' : ''}`}
                    onClick={() => {
                      if (d !== state.riddleDifficulty) {
                        clearShareHash();
                        dispatch({ type: 'SET_RIDDLE_DIFFICULTY', difficulty: d });
                      }
                    }}
                  >
                    {label}
                  </button>
                );
              })}
        </div>
        {!(state.mode === 'riddle' && state.riddleDifficulty === 'tutorial') && (
          <ScoreBar scoreValueRef={scoreValueRef} />
        )}
        <div className="board-controls">
          <button
            className="board-restart-btn"
            aria-label="Restart this round"
            title="Restart this round"
            onClick={() => dispatch({ type: 'RESTART' })}
          >
            <span aria-hidden>{'\u21BB'}</span>
            <span className="board-restart-btn__label">Restart</span>
          </button>
          {state.mode === 'riddle' && state.riddleDifficulty !== 'tutorial' && (
            <button
              className="board-restart-btn board-restart-btn--ghost"
              aria-label="Generate a new puzzle"
              title="Generate a new puzzle"
              onClick={() => {
                clearShareHash();
                dispatch({ type: 'NEW_RIDDLE' });
              }}
            >
              <span aria-hidden>{'\u2728'}</span>
              <span className="board-restart-btn__label">New puzzle</span>
            </button>
          )}
          {state.mode === 'riddle' &&
            state.riddleDifficulty !== 'tutorial' &&
            state.riddleInitialBoard &&
            state.riddleTarget && (
              <button
                className="board-restart-btn board-restart-btn--ghost"
                aria-label="Share this riddle"
                title="Share this riddle"
                onClick={handleShare}
              >
                <span aria-hidden>{'\u{1F517}'}</span>
                <span className="board-restart-btn__label">
                  {shareStatus === 'copied' ? 'Link copied!' : shareStatus === 'failed' ? 'Share failed' : 'Share'}
                </span>
              </button>
            )}
        </div>
        {state.mode === 'riddle' && state.riddleDifficulty === 'tutorial' && (
          <TutorialBanner
            stepIndex={state.tutorialStep}
            totalSteps={TUTORIAL_STEPS.length}
            step={TUTORIAL_STEPS[state.tutorialStep]}
            onJump={(idx) => dispatch({ type: 'TUTORIAL_GOTO', step: idx })}
          />
        )}
        <Board
          boardRef={boardRef}
          previewCells={preview?.cells}
          previewColor={preview?.color}
          placedCells={placedCells ?? undefined}
          clearPreviewCells={preview?.clearCells ?? undefined}
        />
        <div className="piece-tray-wrap">
          <PieceTray onTrayPointerDown={handleTrayPointerDown} draggingIndex={drag?.index ?? null} />
          <p className="piece-tray-hint">
            {state.mode === 'riddle'
              ? state.riddleDifficulty === 'tutorial'
                ? 'Tap to rotate · drag to place'
                : `Difficulty ${state.riddleDifficulty} — fill the dashed cells, clear the rest.`
              : 'Tap to rotate · drag to place · R'}
          </p>
        </div>
        {drag && dragPiece && dragFloatPos && (
          <FloatingPiece
            piece={dragPiece}
            x={dragFloatPos.x}
            y={dragFloatPos.y}
            cellSize={dragFloatCellSize}
          />
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
                        animationDelay: `${orb.delay + i * 32}ms`,
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {celebration && (
          <Celebration
            key={celebration.runId}
            intensity={celebration.intensity}
            centerX={celebration.centerX}
            centerY={celebration.centerY}
            onComplete={() => setCelebration(null)}
          />
        )}
        <GameOverOverlay />
      </div>
    </GameContext>
  );
}
