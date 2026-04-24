import { useReducer, useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { gameReducer, createInitialState, savePuzzleEverSolved } from './game/gameReducer';
import { canPlacePiece, placePiece, detectCompletedLines, computeLandingOrigin } from './game/board';
import { calculatePlacementScore, calculateClearScore } from './game/scoring';
import { GameContext } from './hooks/useGame';
import { Board } from './components/Board';
import { PieceTray, FloatingPiece } from './components/PieceTray';
import { ScoreBar } from './components/ScoreBar';
import { GameOverOverlay } from './components/GameOverOverlay';
import type { CascadeStep, Coord } from './game/types';
import {
  BOARD_SIZE,
  CLASSIC_DIFFICULTIES,
  DROP_DIFFICULTIES,
  GRAVITY_DIFFICULTIES,
  PUZZLE_DIFFICULTIES,
  puzzleDifficultyLabel,
} from './game/types';
import { haptics } from './haptics';
import { sounds } from './sounds';
import { DRAG_POINTER_OFFSET_X, DRAG_POINTER_OFFSET_Y, dragPointerToEffective } from './dragConstants';
import { buildShareUrl, clearShareHash, decodePuzzle, parseSharePayload } from './game/sharing';
import { TUTORIAL_STEPS, TUTORIAL_STEP_COUNT } from './game/tutorial';
import { TutorialBanner } from './components/TutorialBanner';
import { Celebration } from './components/Celebration';
import { Wordmark } from './components/Wordmark';
import { Monogram } from './components/Monogram';
import { PuzzleLegend } from './components/PuzzleLegend';
import { CoachMark } from './components/CoachMark';
import { CustomPuzzleModal } from './components/CustomPuzzleModal';
import { useCoachMarks, type CoachSymbol } from './hooks/useCoachMarks';
import type { PuzzleDifficulty } from './game/types';

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
 * Map a puzzle difficulty to a 0..1 celebration intensity. Tutorial steps
 * get a modest cheer (with the final step bumped a bit for graduation);
 * numeric puzzles ramp linearly so Expert feels genuinely triumphant.
 */
function difficultyToCelebrationIntensity(
  difficulty: PuzzleDifficulty,
  tutorialStep: number
): number {
  if (difficulty === 'tutorial') {
    const isLast = tutorialStep >= TUTORIAL_STEP_COUNT - 1;
    return isLast ? 0.55 : 0.2;
  }
  // Puzzle levels 1..4 map to 0.32..1.0 — noticeable escalation between steps.
  const t = (difficulty - 1) / 3;
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

  // Variant A — collapsible mode/difficulty menu. Hidden by default so the
  // header can hand more room to the Blockit wordmark below.
  const [menuOpen, setMenuOpen] = useState(false);

  // Custom-puzzle configurator is a modal overlay, opened from the chrome
  // menu. On Generate it dispatches LOAD_SHARED_PUZZLE so the produced
  // puzzle is ephemeral (no localStorage write) and doesn't clobber the
  // stored puzzle for the nominal difficulty.
  const [customOpen, setCustomOpen] = useState(false);

  /**
   * Live board cell size in device pixels. Kept in state (fed by a
   * ResizeObserver on the board element) so the floating-piece overlay
   * stays aligned when the viewport resizes mid-drag (orientation change,
   * iOS URL-bar collapse, keyboard opening, user-initiated resize) —
   * events that don't necessarily fire a pointer move. Falls back to 40
   * on first render before the observer has measured.
   */
  const [boardCellSize, setBoardCellSize] = useState<number>(40);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setBoardCellSize(rect.width / BOARD_SIZE);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  /**
   * Gravity-mode cascade animation state machine. The reducer commits the
   * final post-cascade board in one dispatch, but carries the ordered
   * resolution steps on `state.lastCascade` so the UI can replay them as
   * animation. Each step has two visible phases:
   *   'flash' — render `steps[i].boardBefore` with `clearedCells` pulsed
   *             via `cell--will-clear`, so the player sees what is about
   *             to disappear. Ends after CASCADE_FLASH_MS.
   *   'fall'  — render `steps[i].boardAfter` with per-cell `fallRows`
   *             driving the `cell--falling` CSS animation. Ends after
   *             CASCADE_FALL_MS and either advances to the next step's
   *             flash or terminates playback.
   * Null between cascades (idle state).
   */
  const [cascadePlayback, setCascadePlayback] = useState<{
    steps: CascadeStep[];
    stepIndex: number;
    phase: 'flash' | 'fall';
  } | null>(null);
  /**
   * Incremented when a chain step >= 3 lands; drives a transient board
   * shake CSS class. Each bump un-applies and re-applies the class via
   * a short timer so successive big chains in the same cascade re-fire
   * the animation cleanly.
   */
  const [boardShakeTick, setBoardShakeTick] = useState(0);
  const [boardShaking, setBoardShaking] = useState(false);
  useEffect(() => {
    if (boardShakeTick === 0) return;
    setBoardShaking(true);
    const t = window.setTimeout(() => setBoardShaking(false), 220);
    return () => window.clearTimeout(t);
  }, [boardShakeTick]);
  const cascadeAnimating = cascadePlayback !== null;
  // Mirror in a ref so drag/place handlers can gate on it without
  // re-subscribing pointer listeners each time the flag flips.
  const cascadeAnimatingRef = useRef(false);
  useEffect(() => {
    cascadeAnimatingRef.current = cascadeAnimating;
  }, [cascadeAnimating]);

  const { seen: coachSeen, markSeen: markCoachSeen } = useCoachMarks();
  const [coachAnchor, setCoachAnchor] = useState<HTMLElement | null>(null);
  const [activeCoach, setActiveCoach] = useState<CoachSymbol | null>(null);
  // Mirror activeCoach in a ref so handlePlace can react to it without having
  // to re-memoise (and re-subscribe drag listeners) on every coach change.
  const activeCoachRef = useRef<CoachSymbol | null>(null);
  useEffect(() => {
    activeCoachRef.current = activeCoach;
  }, [activeCoach]);

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

  // Gravity cascade animation timings. Tuned so short chains feel snappy
  // and long chains (step >= 4) still resolve in well under a second per
  // step. Flash is deliberately longer than fall — the player needs to
  // register WHICH cells are about to go before they vanish.
  const CASCADE_FLASH_MS = 220;
  const CASCADE_FALL_MS = 180;

  /**
   * Kick off cascade playback whenever the reducer hands us a new
   * `state.lastCascade`. Uses a ref-tracked identity guard so StrictMode
   * double-invocations in dev don't double-trigger the animation, and
   * runs in `useLayoutEffect` so the first frame already shows the
   * step-0 boardBefore override — otherwise there would be a one-frame
   * flash of the settled post-cascade board slipping through before the
   * animation begins.
   */
  const activeCascadeRef = useRef<CascadeStep[] | null>(null);
  useLayoutEffect(() => {
    const steps = state.lastCascade;
    if (!steps || steps.length === 0) {
      // A mid-cascade RESTART / SET_MODE / rotation wipes `lastCascade`
      // but leaves our local playback state dangling with stale step
      // boards — which would then paint on top of the new fresh board.
      // Clear it here so the Board snaps back to the fresh `state.board`.
      activeCascadeRef.current = null;
      setCascadePlayback(null);
      return;
    }
    if (activeCascadeRef.current === steps) return;
    activeCascadeRef.current = steps;
    setCascadePlayback({ steps, stepIndex: 0, phase: 'flash' });
    // Fire audio/haptic feedback for the first step's clear immediately
    // so the flash phase has matching presence; subsequent steps get
    // their own ticks from the playback driver below.
    haptics.lineClear(steps[0].clearedRows.length + steps[0].clearedCols.length);
    sounds.lineClear(steps[0].clearedRows.length + steps[0].clearedCols.length);
  }, [state.lastCascade]);

  /**
   * Drive the cascade playback state machine. Each phase transition is
   * scheduled via `setTimeout` on a single cleanup-safe timer; clearing
   * the active cascade (e.g. mid-animation RESTART) cancels the timer
   * and wipes playback state.
   */
  useEffect(() => {
    if (!cascadePlayback) return;
    const { steps, stepIndex, phase } = cascadePlayback;

    if (phase === 'flash') {
      const t = window.setTimeout(() => {
        // Fire cascade tick for steps >= 2 (the chain kicks in) so the
        // audio rises with the chain. Step 1 already got the lineClear
        // feedback when the cascade started.
        if (stepIndex >= 1) {
          sounds.cascadeTick(stepIndex + 1);
          haptics.cascadeTick(stepIndex + 1);
        }
        if (stepIndex + 1 >= 3) {
          sounds.bigChain(stepIndex + 1);
          // Big-chain board shake: toggle on, then off after the shake
          // animation finishes so the class can re-apply next time.
          setBoardShakeTick((n) => n + 1);
        }
        setCascadePlayback({ steps, stepIndex, phase: 'fall' });
      }, CASCADE_FLASH_MS);
      return () => window.clearTimeout(t);
    }

    // phase === 'fall'
    const t = window.setTimeout(() => {
      if (stepIndex + 1 < steps.length) {
        setCascadePlayback({ steps, stepIndex: stepIndex + 1, phase: 'flash' });
      } else {
        setCascadePlayback(null);
      }
    }, CASCADE_FALL_MS);
    return () => window.clearTimeout(t);
  }, [cascadePlayback]);

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
      const cursorOrigin = computeOrigin(clientX, clientY, piece);
      if (!cursorOrigin) {
        setPreview(null);
        return;
      }

      // Drop mode overrides the preview geometry: horizontal position is
      // taken from the cursor, but vertical is resolved by simulating the
      // rigid-body fall. If the piece can't land (off-board horizontally,
      // or columns already filled to the ceiling), mark every cell under
      // the cursor invalid so the player gets the same red-wash feedback
      // they already recognize from Classic.
      const isDrop = state.mode === 'drop';
      let origin = cursorOrigin;
      let valid: boolean;
      if (isDrop) {
        const landed = computeLandingOrigin(state.board, piece, cursorOrigin);
        if (landed) {
          origin = landed;
          valid = true;
        } else {
          valid = false;
        }
      } else {
        const enforceColorAdjacency = state.mode === 'chroma';
        valid = canPlacePiece(state.board, piece, cursorOrigin, { enforceColorAdjacency });
      }

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
        // Drop mode disables column clears by design — only rows contribute
        // to the will-clear preview so the ghost matches what actually
        // happens on commit.
        const previewRows = rows;
        const previewCols = isDrop ? [] : cols;
        if (previewRows.length > 0 || previewCols.length > 0) {
          clearCells = new Set<string>();
          for (const r of previewRows) {
            for (let c = 0; c < BOARD_SIZE; c++) clearCells.add(`${r},${c}`);
          }
          for (const c of previewCols) {
            for (let r = 0; r < BOARD_SIZE; r++) clearCells.add(`${r},${c}`);
          }
        }
      }

      setPreview(cells.size > 0 ? { cells, color: piece.color, clearCells } : null);
    },
    [state.board, state.tray, state.mode, computeOrigin]
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
      const enforceColorAdjacency = state.mode === 'chroma';
      if (!canPlacePiece(state.board, piece, origin, { enforceColorAdjacency })) return;

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
      // Drop mode disables column clears — only row fills produce a clear.
      // Filter cols out here so the feedback (orbs, score popup, haptics)
      // matches what the reducer will actually do on commit.
      const effectiveCols = state.mode === 'drop' ? [] : cols;
      const linesCleared = rows.length + effectiveCols.length;

      if (linesCleared > 0) {
        // Gravity and Drop modes own the line-clear feedback end-to-end via
        // the cascade playback effect (which handles step-by-step haptics
        // and sound on a timer). Firing here too would double-play the
        // first step's clear. Classic/Puzzle/Chroma still need this
        // immediate feedback because they don't run the cascade pipeline.
        if (state.mode !== 'gravity' && state.mode !== 'drop') {
          haptics.lineClear(linesCleared);
          sounds.lineClear(linesCleared);
        }

        // Puzzle mode has no score display, so skip the +N popup and the
        // cells-flying-to-the-score-bar animation — the board's own cell
        // clear animation is still plenty of feedback. Classic / Chroma /
        // Drop mode keep them because the score is the primary feedback
        // loop there. Gravity mode skips: the cascade playback IS the
        // feedback, and orbs flying out of a board that's mid-cascade
        // reads as visual noise against the rising/falling tiles.
        if (state.mode !== 'puzzle' && state.mode !== 'gravity') {
          const clearScore = calculateClearScore(linesCleared, state.combo);
          const totalPopup = calculatePlacementScore(piece) + clearScore;
          spawnScorePopup(totalPopup, origin);

          // Build the set of cells about to be cleared, capturing their
          // colors from the hypothetical board (which already includes the
          // piece we just placed). This must happen BEFORE dispatch, so we
          // can read colors/positions before the reducer wipes them.
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
          for (const c of effectiveCols) {
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
      }

      dispatch({ type: 'PLACE_PIECE', trayIndex, origin });

      // A successful placement is the clearest possible "I got it" signal, so
      // retire any active coach-mark immediately — no need to linger.
      if (activeCoachRef.current) {
        const sym = activeCoachRef.current;
        markCoachSeen(sym);
        setActiveCoach(null);
        setCoachAnchor(null);
      }
    },
    [state.board, state.tray, state.combo, state.mode, spawnScorePopup, spawnCollectOrbs, markCoachSeen]
  );

  const handleShare = useCallback(async () => {
    const { puzzleInitialBoard, puzzleInitialTray, puzzleTarget, puzzleDifficulty, puzzleResult } = state;
    if (!puzzleInitialBoard || !puzzleInitialTray || !puzzleTarget) return;
    // Tutorial puzzles are authored per-step and aren't shareable — the
    // encoder expects a numeric difficulty anyway.
    if (puzzleDifficulty === 'tutorial') return;
    let url: string;
    try {
      url = buildShareUrl({
        difficulty: puzzleDifficulty,
        board: puzzleInitialBoard,
        tray: puzzleInitialTray,
        target: puzzleTarget,
      });
    } catch {
      setShareStatus('failed');
      return;
    }

    haptics.pickup();
    sounds.pickup();

    // Tailor the share copy to the moment: a just-solved puzzle reads as a
    // brag / dare, a just-failed one as a "beat this one for me", and any
    // mid-game share (header button) stays neutral.
    const difficultyLabel = puzzleDifficultyLabel(puzzleDifficulty);
    const { title, text } = (() => {
      if (puzzleResult === 'solved') {
        return {
          title: 'Blockit challenge',
          text: `Just cracked this ${difficultyLabel} Blockit puzzle. Your move — think you can match it?`,
        };
      }
      if (puzzleResult === 'failed') {
        return {
          title: 'Blockit challenge',
          text: `This ${difficultyLabel} Blockit puzzle got me. See if you can crack it.`,
        };
      }
      return {
        title: 'Blockit puzzle',
        text: `Take a shot at this ${difficultyLabel} Blockit puzzle.`,
      };
    })();

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('copied');
    } catch {
      const ok = window.prompt('Copy this link to share the puzzle:', url);
      setShareStatus(ok === null ? null : 'copied');
    }
  }, [state]);

  useEffect(() => {
    if (shareStatus === null) return;
    const t = window.setTimeout(() => setShareStatus(null), 1800);
    return () => window.clearTimeout(t);
  }, [shareStatus]);

  // Puzzle-solve celebration. Wait one frame after puzzleResult flips to
  // 'solved' so the board has painted its final cleared state underneath —
  // otherwise the confetti lands on the board mid-clear animation.
  const lastSolveKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.mode !== 'puzzle') return;
    if (state.puzzleResult !== 'solved') {
      // Reset tracker so the next solve of the same puzzle re-fires.
      lastSolveKeyRef.current = null;
      return;
    }
    const key = `${state.puzzleDifficulty}:${state.tutorialStep}`;
    if (lastSolveKeyRef.current === key) return;
    lastSolveKeyRef.current = key;

    const rect = boardRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const centerY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    const baseIntensity = difficultyToCelebrationIntensity(
      state.puzzleDifficulty,
      state.tutorialStep
    );
    // First-time solves of a numeric difficulty are milestones the player
    // will only experience once per difficulty — punch the celebration up a
    // touch so it *feels* different from their 15th Normal solve. The bump
    // is capped at 1.0 so Expert (already near the ceiling) doesn't wrap.
    const intensity = state.puzzleLevelUp !== null
      ? Math.min(1, baseIntensity + 0.2)
      : baseIntensity;

    setCelebration({ intensity, centerX, centerY, runId: ++celebrationRunId });
    haptics.celebrate(intensity);
    sounds.celebrate(intensity);
  }, [state.mode, state.puzzleResult, state.puzzleDifficulty, state.tutorialStep, state.puzzleLevelUp]);

  // Persist the "ever solved" set whenever it changes. Deliberately in an
  // effect (not the reducer) so the reducer stays idempotent under React
  // 19 StrictMode's double-invocation guard: the reducer reads and writes
  // the flag through `state.puzzleEverSolved`, and this effect mirrors
  // that to localStorage exactly once per committed state change.
  useEffect(() => {
    savePuzzleEverSolved(state.puzzleEverSolved);
  }, [state.puzzleEverSolved]);

  // Puzzle coach-marks: the first time a player sees each symbol in a real
  // (non-tutorial) puzzle, surface a one-line tooltip anchored to the first
  // cell that carries it. We pick at most one active coach at a time — the
  // "fill" hint takes precedence because it's the base rule; "clear" comes
  // next. Dismisses on placement (handlePlace) or the CoachMark's own
  // internal timeout. The effect queries DOM directly (boardRef) to anchor
  // to a specific cell, so this is legitimate side-effect work — not state
  // derivable in render. Guarding each setState with an equality check keeps
  // React from re-rendering when nothing actually changes.
  useEffect(() => {
    if (state.mode !== 'puzzle' || state.puzzleDifficulty === 'tutorial') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale coach state when the user leaves puzzle mode
      if (activeCoach !== null) setActiveCoach(null);
      if (coachAnchor !== null) setCoachAnchor(null);
      return;
    }
    if (activeCoach !== null) return;

    const target = state.puzzleTarget;
    if (!target || !boardRef.current) return;

    const findFirstCellMatching = (
      predicate: (r: number, c: number) => boolean
    ): HTMLElement | null => {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (!predicate(r, c)) continue;
          const selector = `[data-coord="${r},${c}"]`;
          const el = boardRef.current?.querySelector<HTMLElement>(selector);
          if (el) return el;
        }
      }
      return null;
    };

    if (!coachSeen.fill) {
      const anchor = findFirstCellMatching(
        (r, c) => target[r][c] && state.board[r][c] === null
      );
      if (anchor) {
        setCoachAnchor(anchor);
        setActiveCoach('fill');
        return;
      }
    }

    if (!coachSeen.clear) {
      const anchor = findFirstCellMatching(
        (r, c) => !target[r][c] && state.board[r][c] !== null
      );
      if (anchor) {
        setCoachAnchor(anchor);
        setActiveCoach('clear');
      }
    }
  }, [
    state.mode,
    state.puzzleDifficulty,
    state.puzzleTarget,
    state.board,
    coachSeen.fill,
    coachSeen.clear,
    activeCoach,
    coachAnchor,
  ]);

  const dismissCoach = useCallback(() => {
    if (activeCoach === null) return;
    markCoachSeen(activeCoach);
    setActiveCoach(null);
    setCoachAnchor(null);
  }, [activeCoach, markCoachSeen]);

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
      const decoded = decodePuzzle(payload);
      if (!decoded) return;
      dispatch({
        type: 'LOAD_SHARED_PUZZLE',
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
    // Lock input while a Gravity-mode cascade animation is mid-flight —
    // any placement made before the board settles would operate on the
    // final post-cascade board (that's already committed in state) but
    // look wildly out of sync with what the player visually sees.
    if (cascadeAnimatingRef.current) return;
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
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, [contenteditable="true"]')) return;

      // Cmd/Ctrl+Z → undo last puzzle placement. Shift+Z is intentionally
      // not wired up (no redo in v1). Ignored unless we're in puzzle mode
      // with a pending snapshot.
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.repeat) return;
        if (state.mode !== 'puzzle' || state.puzzleUndo === null) return;
        e.preventDefault();
        haptics.pickup();
        sounds.pickup();
        dispatch({ type: 'UNDO_PLACEMENT' });
        return;
      }

      if (e.key !== 'r' && e.key !== 'R') return;
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = drag?.index ?? lastTrayIndexRef.current;
      if (idx === null) return;
      if (!state.tray[idx]) return;
      e.preventDefault();
      dispatch({ type: 'ROTATE_TRAY_PIECE', trayIndex: idx });
      sounds.rotate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drag, state.tray, state.mode, state.puzzleUndo, dispatch]);

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
        const cursorOrigin = computeOrigin(ex, ey, piece);
        // Drop mode resolves the landed origin by simulating the rigid-body
        // fall; every other mode commits at the cursor's origin directly.
        const origin = cursorOrigin
          ? state.mode === 'drop'
            ? computeLandingOrigin(state.board, piece, cursorOrigin)
            : cursorOrigin
          : null;
        const enforceColorAdjacency = state.mode === 'chroma';
        if (origin && canPlacePiece(state.board, piece, origin, { enforceColorAdjacency })) {
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
  }, [drag, state.board, state.tray, state.mode, computeOrigin, updatePreview, handlePlace]);

  const dragPiece = drag ? state.tray[drag.index] : null;
  const dragFloatPos =
    drag && dragPiece
      ? dragPointerToEffective(drag.x, drag.y, drag.anchorX, drag.anchorY)
      : null;
  const dragFloatCellSize = boardCellSize;

  const modes: { id: 'classic' | 'puzzle' | 'chroma' | 'gravity' | 'drop'; label: string }[] = [
    { id: 'classic', label: 'Classic' },
    { id: 'puzzle', label: 'Puzzle' },
    { id: 'chroma', label: 'Chroma' },
    { id: 'gravity', label: 'Gravity' },
    { id: 'drop', label: 'Drop' },
  ];

  // Gravity cascade playback → Board override props. Derived per render
  // from the current playback phase; null / undefined when idle, which
  // makes Board fall back to `state.board`.
  let cascadeBoard: ReturnType<typeof getCascadeFrame> = null;
  function getCascadeFrame() {
    if (!cascadePlayback) return null;
    const { steps, stepIndex, phase } = cascadePlayback;
    const step = steps[stepIndex];
    if (phase === 'flash') {
      // Paint the pre-clear board, highlight soon-to-clear cells.
      const willClear = new Set<string>(step.clearedCells);
      return {
        board: step.boardBefore,
        willClear,
        fallDistances: undefined as (number | null)[][] | undefined,
        renderKey: `flash-${stepIndex}`,
      };
    }
    // phase === 'fall' — render the post-compaction board with per-cell
    // fall distances so the animation plays. No will-clear overlay here
    // (those cells are already gone).
    return {
      board: step.boardAfter,
      willClear: undefined as Set<string> | undefined,
      fallDistances: step.fallDistances,
      renderKey: `fall-${stepIndex}`,
    };
  }
  cascadeBoard = getCascadeFrame();
  const effectivePreviewCells = cascadeBoard ? undefined : preview?.cells;
  const effectivePreviewColor = cascadeBoard ? undefined : preview?.color;
  const effectiveClearPreview =
    cascadeBoard?.willClear ?? (preview?.clearCells ?? undefined);
  const effectivePlacedCells = cascadeBoard ? undefined : (placedCells ?? undefined);

  // Human-readable "you are here" label for the collapsed menu toggle.
  // Tutorial is mode-unambiguous so we drop the "Puzzle · " prefix to save
  // space; every other combo carries Mode + Difficulty because names
  // overlap across modes (Easy/Normal/Hard appear in both). Chroma v1 has
  // a single difficulty so the mode name alone is enough.
  const currentSelectionLabel = (() => {
    if (state.mode === 'classic') {
      const d = state.classicDifficulty;
      return `Classic · ${d.charAt(0).toUpperCase() + d.slice(1)}`;
    }
    if (state.mode === 'chroma') return 'Chroma';
    if (state.mode === 'gravity') {
      const d = state.gravityDifficulty;
      return `Gravity · ${d.charAt(0).toUpperCase() + d.slice(1)}`;
    }
    if (state.mode === 'drop') {
      const d = state.dropDifficulty;
      return `Drop · ${d.charAt(0).toUpperCase() + d.slice(1)}`;
    }
    if (state.puzzleDifficulty === 'tutorial') return 'Tutorial';
    return `Puzzle · ${puzzleDifficultyLabel(state.puzzleDifficulty)}`;
  })();

  return (
    <GameContext value={{ state, dispatch }}>
      <div className="app">
        {/*
         * `.app-aside` holds every non-board element (chrome + tray /
         * game-over). In portrait it uses `display: contents` so its
         * children flow straight into the `.app` flex column exactly as
         * before. In landscape-short it becomes a flex column that sits to
         * the right of the board (see `index.css` landscape media query).
         * Wrapper-first ordering is intentional: the Board still appears
         * before the tray in portrait via CSS `order` on the tray.
         */}
        <div className="app-aside">
        {/*
         * Header-row compacts three distinct affordances — title, mode
         * selector, mute toggle — onto a single line via a 3-col grid.
         * The title carries both the full wordmark and a block-B monogram;
         * CSS swaps between them at a media-query break so the header
         * stays horizontally balanced on narrow phones (≤389 px) without
         * JS. Pulling the mode pill out of its own row saves ~49 px of
         * vertical chrome, which is critical to keeping gameplay
         * scroll-free on portrait phones.
         */}
        <div className="header-row header-row--big-logo">
          <button
            className={`menu-toggle${menuOpen ? ' menu-toggle--open' : ''}`}
            aria-label={`${menuOpen ? 'Close menu' : 'Open menu'} — current selection: ${currentSelectionLabel}`}
            aria-expanded={menuOpen}
            aria-controls="chrome-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span aria-hidden className="menu-toggle__icon">{'\u2630'}</span>
            <span className="menu-toggle__label">{currentSelectionLabel}</span>
          </button>
          <h1 className="title title--big">
            <Wordmark className="title__wordmark" />
            <Monogram className="title__monogram" />
          </h1>
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
        {menuOpen && (
          <div id="chrome-menu" className="chrome-menu">
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
            {state.mode !== 'chroma' && (
              <div className="difficulty-selector" role="tablist" aria-label="Difficulty">
                {state.mode === 'classic' &&
                  CLASSIC_DIFFICULTIES.map((d) => (
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
                        // Difficulty is the terminal pick — close the drawer
                        // so the player gets straight back to the board.
                        setMenuOpen(false);
                      }}
                    >
                      {d}
                    </button>
                  ))}
                {state.mode === 'gravity' &&
                  GRAVITY_DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      role="tab"
                      aria-selected={d === state.gravityDifficulty}
                      className={`difficulty-btn${d === state.gravityDifficulty ? ' difficulty-btn--active' : ''}`}
                      onClick={() => {
                        if (d !== state.gravityDifficulty) {
                          clearShareHash();
                          dispatch({ type: 'SET_GRAVITY_DIFFICULTY', difficulty: d });
                        }
                        setMenuOpen(false);
                      }}
                    >
                      {d}
                    </button>
                  ))}
                {state.mode === 'drop' &&
                  DROP_DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      role="tab"
                      aria-selected={d === state.dropDifficulty}
                      className={`difficulty-btn${d === state.dropDifficulty ? ' difficulty-btn--active' : ''}`}
                      onClick={() => {
                        if (d !== state.dropDifficulty) {
                          clearShareHash();
                          dispatch({ type: 'SET_DROP_DIFFICULTY', difficulty: d });
                        }
                        setMenuOpen(false);
                      }}
                    >
                      {d}
                    </button>
                  ))}
                {state.mode === 'puzzle' &&
                  PUZZLE_DIFFICULTIES.map((d) => {
                    const label = puzzleDifficultyLabel(d);
                    const tutorialClass = d === 'tutorial' ? ' difficulty-btn--tutorial' : '';
                    return (
                      <button
                        key={d}
                        role="tab"
                        aria-selected={d === state.puzzleDifficulty}
                        className={`difficulty-btn difficulty-btn--puzzle${tutorialClass}${d === state.puzzleDifficulty ? ' difficulty-btn--active' : ''}`}
                        onClick={() => {
                          if (d !== state.puzzleDifficulty) {
                            clearShareHash();
                            dispatch({ type: 'SET_PUZZLE_DIFFICULTY', difficulty: d });
                          }
                          // Difficulty is the terminal pick — close the drawer
                          // so the player gets straight back to the board.
                          setMenuOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
              </div>
            )}
            {/*
             * "Custom puzzle…" is deliberately low-key: a small, muted text
             * link tucked under the difficulty row so it doesn't compete
             * with the primary difficulty picks. It lives inside the
             * hamburger drawer — a closed-by-default menu players have to
             * open on purpose — and the visual demotion (muted, small,
             * right-aligned) keeps it from stealing focus from the primary
             * picks, without hiding it from anyone. Hidden in Chroma,
             * Gravity, and Drop modes because the modal generates Puzzle
             * content and would yank the player out of the mode they
             * picked.
             */}
            {state.mode !== 'chroma' && state.mode !== 'gravity' && state.mode !== 'drop' && (
              <button
                type="button"
                className="chrome-menu__custom-link"
                onClick={() => {
                  setCustomOpen(true);
                  setMenuOpen(false);
                }}
              >
                Custom puzzle&hellip;
              </button>
            )}
          </div>
        )}
        {state.mode !== 'puzzle' && <ScoreBar scoreValueRef={scoreValueRef} />}
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
          {state.mode === 'puzzle' && state.puzzleDifficulty !== 'tutorial' && (
            <button
              className="board-restart-btn board-restart-btn--ghost"
              aria-label="Generate a new puzzle"
              title="Generate a new puzzle"
              onClick={() => {
                clearShareHash();
                dispatch({ type: 'NEW_PUZZLE' });
              }}
            >
              <span aria-hidden>{'\u2728'}</span>
              <span className="board-restart-btn__label">New puzzle</span>
            </button>
          )}
          {state.mode === 'puzzle' &&
            state.puzzleDifficulty !== 'tutorial' &&
            state.puzzleInitialBoard &&
            state.puzzleTarget && (
              <button
                className="board-restart-btn board-restart-btn--ghost"
                aria-label="Share this puzzle"
                title="Share this puzzle"
                onClick={handleShare}
              >
                <span aria-hidden>{'\u{1F517}'}</span>
                <span className="board-restart-btn__label">
                  {shareStatus === 'copied' ? 'Link copied!' : shareStatus === 'failed' ? 'Share failed' : 'Share'}
                </span>
              </button>
            )}
        </div>
        {state.mode === 'puzzle' && state.puzzleDifficulty === 'tutorial' && (
          <TutorialBanner
            stepIndex={state.tutorialStep}
            totalSteps={TUTORIAL_STEPS.length}
            step={TUTORIAL_STEPS[state.tutorialStep]}
            onJump={(idx) => dispatch({ type: 'TUTORIAL_GOTO', step: idx })}
          />
        )}
        {state.mode === 'puzzle' && state.puzzleDifficulty !== 'tutorial' && (
          <PuzzleLegend />
        )}
        {state.isGameOver ? (
          <GameOverOverlay onShare={handleShare} shareStatus={shareStatus} />
        ) : (
          <div className="piece-tray-wrap">
            {state.mode === 'puzzle' && (
              // Move-level action, so it lives with the pieces (not with the
              // round/meta buttons in .board-controls above the board). Icon
              // only + right-aligned keeps the tray visually uncluttered;
              // the reserved row height is stable whether the button is
              // enabled or disabled so the tray doesn't shift when the
              // first placement happens.
              <div className="piece-tray-topbar">
                <button
                  type="button"
                  className="piece-tray-undo"
                  aria-label="Undo last placement"
                  title="Undo last placement"
                  disabled={state.puzzleUndo === null}
                  onClick={() => {
                    haptics.pickup();
                    sounds.pickup();
                    dispatch({ type: 'UNDO_PLACEMENT' });
                  }}
                >
                  <span aria-hidden>{'\u21A9'}</span>
                </button>
              </div>
            )}
            <PieceTray onTrayPointerDown={handleTrayPointerDown} draggingIndex={drag?.index ?? null} />
            <p className="piece-tray-hint">
              {state.mode === 'puzzle' && state.puzzleDifficulty !== 'tutorial'
                ? `${puzzleDifficultyLabel(state.puzzleDifficulty)} puzzle · tap to rotate · drag to place`
                : state.mode === 'chroma'
                  ? "Chroma · pieces can't touch a different color"
                  : state.mode === 'gravity'
                    ? 'Gravity · clears make blocks fall — chain reactions score big'
                    : state.mode === 'drop'
                      ? 'Drop · pieces fall from release — clear rows to survive'
                      : 'Tap to rotate · drag to place'}
            </p>
          </div>
        )}
        </div>
        <Board
          boardRef={boardRef}
          previewCells={effectivePreviewCells}
          previewColor={effectivePreviewColor}
          placedCells={effectivePlacedCells}
          clearPreviewCells={effectiveClearPreview}
          overrideBoard={cascadeBoard?.board}
          overrideFallDistances={cascadeBoard?.fallDistances}
          cellSize={boardCellSize}
          cascadeRenderKey={cascadeBoard?.renderKey}
          shake={boardShaking}
        />
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
        {activeCoach && coachAnchor && (
          <CoachMark
            anchor={coachAnchor}
            text={
              activeCoach === 'fill'
                ? 'Fill the ringed cells to win.'
                : 'Cells marked X must be empty at the end.'
            }
            onDismiss={dismissCoach}
          />
        )}
        {customOpen && (
          <CustomPuzzleModal
            onClose={() => setCustomOpen(false)}
            onGenerate={(result) => {
              // Ephemeral load: re-uses the shared-puzzle path so we don't
              // persist the custom puzzle under the nominal difficulty's
              // storage slot. Share-link hash is cleared so the URL reflects
              // this is a one-off local puzzle.
              clearShareHash();
              dispatch({
                type: 'LOAD_SHARED_PUZZLE',
                difficulty: result.difficulty,
                board: result.board,
                tray: result.tray,
                target: result.target,
              });
              setCustomOpen(false);
            }}
          />
        )}
      </div>
    </GameContext>
  );
}
