import type {
  BoardGrid,
  BreatheDifficulty,
  CascadeStep,
  ChromaDifficulty,
  ClassicDifficulty,
  Coord,
  DropDifficulty,
  GameMode,
  GravityDifficulty,
  MirrorDifficulty,
  MonolithDifficulty,
  PieceShape,
  PipelineDifficulty,
  PuzzleDifficulty,
  PuzzleLevel,
  ScarDifficulty,
  TargetPattern,
  TraySlot,
} from './types';
import {
  BOARD_SIZE,
  BREATHE_DIFFICULTIES,
  CLASSIC_DIFFICULTIES,
  DROP_DIFFICULTIES,
  GRAVITY_DIFFICULTIES,
  MIRROR_DIFFICULTIES,
  MONOLITH_DIFFICULTIES,
  PIPELINE_DIFFICULTIES,
  SCAR_DIFFICULTIES,
  isPuzzleLevel,
} from './types';
import {
  createEmptyBoard,
  canPlaceMonolith,
  canPlacePiece,
  canPlacePieceMirrored,
  placePiece,
  placePieceMirrored,
  detectCompletedLines,
  clearLines,
  hasValidMoves,
  hasValidDrops,
  hasValidMirrorMoves,
  hasValidMonolithMoves,
  hasValidPipelineMoves,
  rotatePiece90Clockwise,
  applySlabCollapse,
  boardMatchesTarget,
  boardSatisfiesBreathe,
  resolveCascades,
} from './board';
import { generateChromaTray, generateClassicTray } from './pieces';
import {
  generatePuzzle,
  clampPuzzleDifficulty,
  PUZZLE_MAX_DIFFICULTY,
} from './puzzleGenerator';
import { generateMirrorPuzzle } from './mirrorPuzzleGenerator';
import { generateBreathePuzzle } from './breathePuzzleGenerator';
import { generateMonolithPuzzle } from './monolithGenerator';
import {
  applyScars,
  clearLinesPreservingScars,
  mulberry32,
  pickScarCells,
  scarsPerEvent,
} from './scar';
import {
  calculatePlacementScore,
  calculateClearScore,
  chainMultiplier,
  PUZZLE_SOLVE_BONUS,
} from './scoring';
import { decodePuzzle, parseSharePayload } from './sharing';
import { TUTORIAL_STEP_COUNT, clampTutorialStep, getTutorialStep } from './tutorial';

export type GameState = {
  board: BoardGrid;
  tray: TraySlot[];
  score: number;
  bestScore: number;
  combo: number;
  isGameOver: boolean;
  mode: GameMode;
  /** Remembered selection within each mode, so switching modes resumes where
   *  you left off. */
  classicDifficulty: ClassicDifficulty;
  puzzleDifficulty: PuzzleDifficulty;
  /**
   * Chroma-mode difficulty. v1 only has `'normal'`, but we keep it in state
   * parallel to classic/puzzle so future rungs slot in without a schema
   * change and best-score keys stay per-rung-stable.
   */
  chromaDifficulty: ChromaDifficulty;
  /** Remembered Gravity-mode difficulty (mirrors classic rungs). */
  gravityDifficulty: GravityDifficulty;
  /** Remembered Drop-mode difficulty (mirrors classic rungs). */
  dropDifficulty: DropDifficulty;
  /** Remembered Mirror-mode difficulty. */
  mirrorDifficulty: MirrorDifficulty;
  /** Remembered Breathe-mode difficulty. */
  breatheDifficulty: BreatheDifficulty;
  /** Remembered Pipeline-mode difficulty (mirrors classic rungs). */
  pipelineDifficulty: PipelineDifficulty;
  /**
   * Pipeline-mode round-robin cursor: the only tray slot the player is
   * allowed to place from on the next move. Cycles 0 → 1 → 2 → 0 after
   * every successful placement, regardless of refill — i.e. starting a
   * fresh tray does NOT reset the phase, only RESTART / mode change /
   * fresh-state factories do. Always `0` outside of Pipeline mode.
   */
  pipelinePhase: 0 | 1 | 2;
  /** Remembered Scar-mode difficulty. */
  scarDifficulty: ScarDifficulty;
  /** Remembered Monolith-mode difficulty. */
  monolithDifficulty: MonolithDifficulty;
  /**
   * Per-run RNG seed for Scar mode's scar-burst placement. Initialised on
   * `freshScarState` (e.g. `Date.now() ^ Math.floor(Math.random() *
   * 0x100000000)`); incremented after each scar burst so subsequent
   * bursts are deterministic-given-seed but visibly vary turn to turn.
   * Not persisted across sessions — every `freshScarState` rerolls.
   * Outside Scar mode this field is set but unused; we keep a numeric
   * default rather than `null` so the type stays simple.
   */
  scarRngSeed: number;
  /** Only set when a puzzle round ends. */
  puzzleResult: null | 'solved' | 'failed';
  /**
   * Target occupancy the player must reproduce in puzzle mode. `null` in
   * non-puzzle modes.
   */
  puzzleTarget: TargetPattern | null;
  /**
   * Snapshot of the active puzzle's starting board/tray so RESTART can return
   * to this exact puzzle without generating a fresh one. `null` outside of
   * puzzle mode.
   */
  puzzleInitialBoard: BoardGrid | null;
  puzzleInitialTray: PieceShape[] | null;
  /**
   * Zero-based index into `TUTORIAL_STEPS`. Only meaningful when
   * `puzzleDifficulty === 'tutorial'`; otherwise retains the last tutorial
   * step the player was on (so returning to the tutorial resumes there).
   */
  tutorialStep: number;
  /**
   * Non-null only on the exact tick the player solves a numeric puzzle
   * difficulty for the very first time. Encodes which difficulty was just
   * cleared so `GameOverOverlay` can surface a one-shot "level up" prompt
   * inviting them to step up to the next difficulty (or celebrate mastery
   * when they clear Expert). Cleared on every subsequent action so the
   * promotion CTA never shows up twice for the same difficulty.
   */
  puzzleLevelUp: PuzzleLevel | null;
  /**
   * Set of numeric puzzle difficulties the player has ever solved at
   * least once. Seeded from localStorage at init and updated in-place by
   * the reducer on every first-time solve. Lives in state — not read
   * directly from localStorage inside the reducer — because React 19's
   * StrictMode double-invokes reducers in dev, and a localStorage write
   * on the first invocation would have the second invocation see the
   * flag as already-set and suppress the level-up prompt. Persistence is
   * handled by the App via a useEffect that watches this field.
   */
  puzzleEverSolved: PuzzleEverSolved;
  /**
   * Only set right after a Gravity-mode PLACE_PIECE that triggered at
   * least one clear. Carries the ordered resolution steps (clear → fall →
   * clear → fall …) so the UI can replay them as animation. Null on
   * every other action (including Gravity placements that didn't clear),
   * which is how the view knows to stop the animation sequence.
   */
  lastCascade: CascadeStep[] | null;
  /**
   * Full undo history for puzzle mode, oldest at index 0, most-recent
   * pre-placement snapshot at the end. Each puzzle-mode PLACE_PIECE
   * pushes its pre-placement state onto the stack; UNDO_PLACEMENT pops
   * the top entry and restores it. Empty array means "nothing to undo"
   * (fresh puzzle, just-restarted, fully-undone). Reset to `[]` on
   * RESTART, NEW_PUZZLE, mode/difficulty switches, tutorial navigation,
   * and shared-puzzle loads. Always `[]` outside puzzle mode. We don't
   * track rotations: each snapshot's `tray` also reverts rotations the
   * player performed after that placement, which is acceptable because
   * rotations are one tap to reapply. Memory is bounded by the puzzle's
   * piece count (≤ 7 for Expert) so no cap is necessary.
   */
  puzzleUndoStack: PuzzleUndoSnapshot[];
};

export type PuzzleUndoSnapshot = {
  board: BoardGrid;
  tray: TraySlot[];
  score: number;
  combo: number;
};

/**
 * Present-key-means-solved map. Using `true` (never `false`) means a
 * fresh spread merge (`{ ...state.puzzleEverSolved, [lvl]: true }`)
 * never accidentally un-marks anything.
 */
export type PuzzleEverSolved = {
  1?: true;
  2?: true;
  3?: true;
  4?: true;
};

export type GameAction =
  | { type: 'PLACE_PIECE'; trayIndex: number; origin: Coord }
  | { type: 'ROTATE_TRAY_PIECE'; trayIndex: number }
  | { type: 'RESTART' }
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'SET_CLASSIC_DIFFICULTY'; difficulty: ClassicDifficulty }
  | { type: 'SET_PUZZLE_DIFFICULTY'; difficulty: PuzzleDifficulty }
  | { type: 'SET_GRAVITY_DIFFICULTY'; difficulty: GravityDifficulty }
  | { type: 'SET_DROP_DIFFICULTY'; difficulty: DropDifficulty }
  | { type: 'SET_MIRROR_DIFFICULTY'; difficulty: MirrorDifficulty }
  | { type: 'SET_BREATHE_DIFFICULTY'; difficulty: BreatheDifficulty }
  | { type: 'SET_PIPELINE_DIFFICULTY'; difficulty: PipelineDifficulty }
  | { type: 'SET_SCAR_DIFFICULTY'; difficulty: ScarDifficulty }
  | { type: 'SET_MONOLITH_DIFFICULTY'; difficulty: MonolithDifficulty }
  /** Discard the active mirror puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_MIRROR_PUZZLE' }
  /** Discard the active breathe puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_BREATHE_PUZZLE' }
  /** Discard the active monolith puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_MONOLITH_PUZZLE' }
  /** Discard the active puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_PUZZLE' }
  /**
   * Swap the currently-visible puzzle for a shared puzzle (e.g. when the URL
   * hash changes without a full page reload). Does not touch localStorage —
   * the shared puzzle is ephemeral.
   */
  | {
      type: 'LOAD_SHARED_PUZZLE';
      difficulty: PuzzleLevel;
      board: BoardGrid;
      tray: PieceShape[];
      target: TargetPattern;
    }
  /** Advance to the next tutorial step; graduate to the Easy puzzle after the last step. */
  | { type: 'TUTORIAL_NEXT' }
  /** Jump to a specific tutorial step (for dot-indicator navigation). */
  | { type: 'TUTORIAL_GOTO'; step: number }
  /**
   * Revert the most recent puzzle-mode placement, restoring the board,
   * tray, score, and combo to their pre-placement values. Repeatable
   * back to the puzzle's starting position. No-op when the undo stack
   * is empty or when not in puzzle mode.
   */
  | { type: 'UNDO_PLACEMENT' };

const MODE_KEY = 'blockit-mode';
const CLASSIC_DIFFICULTY_KEY = 'blockit-classic-difficulty';
const PUZZLE_DIFFICULTY_KEY = 'blockit-puzzle-difficulty';
const CHROMA_DIFFICULTY_KEY = 'blockit-chroma-difficulty';
const GRAVITY_DIFFICULTY_KEY = 'blockit-gravity-difficulty';
const DROP_DIFFICULTY_KEY = 'blockit-drop-difficulty';
const MIRROR_DIFFICULTY_KEY = 'blockit-mirror-difficulty';
const BREATHE_DIFFICULTY_KEY = 'blockit-breathe-difficulty';
const PIPELINE_DIFFICULTY_KEY = 'blockit-pipeline-difficulty';
const SCAR_DIFFICULTY_KEY = 'blockit-scar-difficulty';
const MONOLITH_DIFFICULTY_KEY = 'blockit-monolith-difficulty';
const TUTORIAL_STEP_KEY = 'blockit-tutorial-step';
const PUZZLE_FIRST_SOLVED_KEY_PREFIX = 'blockit-puzzle-first-solved-';

const LEGACY_DIFFICULTY_KEY = 'blockit-difficulty';
const LEGACY_RIDDLE_LEVEL_KEY = 'blockit-riddle-level';
const LEGACY_RIDDLE_MAX_LEVEL_KEY = 'blockit-riddle-max-level';
const LEGACY_RIDDLE_PUZZLE_KEY = 'blockit-riddle-puzzle';
const LEGACY_RIDDLE_DIFFICULTY_KEY = 'blockit-riddle-difficulty';
// Marker for the 1..5 → 1..4 rebalance (Easy/Normal/Hard/Expert). One-shot;
// its mere presence means the rename migration has already run.
const PUZZLE_RENUMBER_MARKER_KEY = 'blockit-puzzle-renumbered-v2';

function bestScoreKey(
  mode: GameMode,
  difficulty:
    | ClassicDifficulty
    | PuzzleLevel
    | ChromaDifficulty
    | GravityDifficulty
    | DropDifficulty
    | MirrorDifficulty
    | BreatheDifficulty
    | PipelineDifficulty
    | ScarDifficulty
    | MonolithDifficulty
): string {
  return `blockit-best-${mode}-${difficulty}`;
}

function puzzleKey(difficulty: PuzzleLevel): string {
  return `blockit-puzzle-${difficulty}`;
}

function loadBestScore(
  mode: GameMode,
  difficulty:
    | ClassicDifficulty
    | PuzzleLevel
    | ChromaDifficulty
    | GravityDifficulty
    | DropDifficulty
    | MirrorDifficulty
    | BreatheDifficulty
    | PipelineDifficulty
    | ScarDifficulty
    | MonolithDifficulty
): number {
  try {
    return Number(localStorage.getItem(bestScoreKey(mode, difficulty))) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(
  mode: GameMode,
  difficulty:
    | ClassicDifficulty
    | PuzzleLevel
    | ChromaDifficulty
    | GravityDifficulty
    | DropDifficulty
    | MirrorDifficulty
    | BreatheDifficulty
    | PipelineDifficulty
    | ScarDifficulty
    | MonolithDifficulty,
  score: number
) {
  try {
    localStorage.setItem(bestScoreKey(mode, difficulty), String(score));
  } catch { /* noop */ }
}

/**
 * One-shot "has the player ever solved this difficulty?" flag, driving the
 * level-up promotion in `GameOverOverlay`. Stored as a boolean per level
 * so the prompt appears at most once per difficulty — even if the player
 * later clears it dozens more times. Failures are silent: a missing or
 * corrupt value just means we show the promotion one more time, which is
 * strictly better than suppressing a meant-to-be-seen milestone.
 */
function puzzleFirstSolvedKey(level: PuzzleLevel): string {
  return `${PUZZLE_FIRST_SOLVED_KEY_PREFIX}${level}`;
}

const ALL_PUZZLE_LEVELS: readonly PuzzleLevel[] = [1, 2, 3, 4];

export function loadPuzzleEverSolved(): PuzzleEverSolved {
  const result: PuzzleEverSolved = {};
  try {
    for (const level of ALL_PUZZLE_LEVELS) {
      if (localStorage.getItem(puzzleFirstSolvedKey(level)) === '1') {
        result[level] = true;
      }
    }
  } catch { /* noop */ }
  return result;
}

export function savePuzzleEverSolved(solved: PuzzleEverSolved) {
  try {
    for (const level of ALL_PUZZLE_LEVELS) {
      if (solved[level]) {
        localStorage.setItem(puzzleFirstSolvedKey(level), '1');
      }
    }
  } catch { /* noop */ }
}

/**
 * Resolve the next numeric puzzle difficulty above `level`, or null if the
 * player has just cleared the top. Callers use this to decide whether the
 * level-up prompt should propose a next rung or celebrate mastery instead.
 */
export function nextPuzzleLevel(level: PuzzleLevel): PuzzleLevel | null {
  if (level >= PUZZLE_MAX_DIFFICULTY) return null;
  return (level + 1) as PuzzleLevel;
}

function loadTutorialStep(): number {
  try {
    const raw = localStorage.getItem(TUTORIAL_STEP_KEY);
    if (raw === null) return 0;
    return clampTutorialStep(Number(raw));
  } catch {
    return 0;
  }
}

function saveTutorialStep(step: number) {
  try {
    localStorage.setItem(TUTORIAL_STEP_KEY, String(clampTutorialStep(step)));
  } catch { /* noop */ }
}

/**
 * One-shot migration of legacy persistence keys. Idempotent: once a key has
 * been migrated and removed, subsequent calls are no-ops. Covers two waves:
 *  1. Original flat-Difficulty scheme → mode + difficulty scheme.
 *  2. The "riddle" → "puzzle" rename: old keys & mode value `'riddle'` are
 *     rehomed under the new puzzle-prefixed keys and mode value `'puzzle'`.
 */
function migrateLegacyKeys() {
  try {
    const legacyDifficulty = localStorage.getItem(LEGACY_DIFFICULTY_KEY);
    if (legacyDifficulty) {
      if (legacyDifficulty === 'riddle') {
        if (!localStorage.getItem(MODE_KEY)) localStorage.setItem(MODE_KEY, 'puzzle');
      } else if (
        legacyDifficulty === 'zen' ||
        legacyDifficulty === 'easy' ||
        legacyDifficulty === 'normal' ||
        legacyDifficulty === 'hard'
      ) {
        if (!localStorage.getItem(MODE_KEY)) localStorage.setItem(MODE_KEY, 'classic');
        if (!localStorage.getItem(CLASSIC_DIFFICULTY_KEY)) {
          localStorage.setItem(CLASSIC_DIFFICULTY_KEY, legacyDifficulty);
        }
        // Migrate old per-classic best score into new key naming.
        const legacyBest = localStorage.getItem(`blockit-best-${legacyDifficulty}`);
        if (legacyBest !== null) {
          const newKey = bestScoreKey('classic', legacyDifficulty);
          if (!localStorage.getItem(newKey)) localStorage.setItem(newKey, legacyBest);
          localStorage.removeItem(`blockit-best-${legacyDifficulty}`);
        }
      }
      localStorage.removeItem(LEGACY_DIFFICULTY_KEY);
    }

    // Old mode value of 'riddle' gets rewritten to 'puzzle'.
    if (localStorage.getItem(MODE_KEY) === 'riddle') {
      localStorage.setItem(MODE_KEY, 'puzzle');
    }

    const legacyRiddleLevel = localStorage.getItem(LEGACY_RIDDLE_LEVEL_KEY);
    if (legacyRiddleLevel !== null && !localStorage.getItem(PUZZLE_DIFFICULTY_KEY)) {
      // Old 1..10 riddle levels compress into the old 1..5 scheme here; the
      // second-wave rebalance below then collapses those into the current
      // 1..4 (Easy/Normal/Hard/Expert) range.
      const n = Number(legacyRiddleLevel);
      if (Number.isFinite(n) && n > 0) {
        const mapped = Math.min(5, Math.max(1, Math.ceil(n / 2)));
        localStorage.setItem(PUZZLE_DIFFICULTY_KEY, String(mapped));
      }
    }
    localStorage.removeItem(LEGACY_RIDDLE_LEVEL_KEY);
    localStorage.removeItem(LEGACY_RIDDLE_MAX_LEVEL_KEY);

    // Legacy stored puzzle was for a single level under one key; it would
    // reference the old 1..10 numbering so simply drop it rather than trying
    // to re-home it to a specific new-difficulty slot.
    localStorage.removeItem(LEGACY_RIDDLE_PUZZLE_KEY);

    // Old flat 'blockit-best-riddle' spanned all puzzle levels; its value
    // isn't directly comparable to any single new difficulty so drop it.
    localStorage.removeItem('blockit-best-riddle');

    // Rename of 'riddle' → 'puzzle': rehome the saved difficulty selection.
    const legacyRiddleDifficulty = localStorage.getItem(LEGACY_RIDDLE_DIFFICULTY_KEY);
    if (legacyRiddleDifficulty !== null && !localStorage.getItem(PUZZLE_DIFFICULTY_KEY)) {
      localStorage.setItem(PUZZLE_DIFFICULTY_KEY, legacyRiddleDifficulty);
    }
    localStorage.removeItem(LEGACY_RIDDLE_DIFFICULTY_KEY);

    // Rehome stored per-difficulty puzzles and best scores under the new
    // 'puzzle' names. The old riddle scheme ran 1..5 — after this block
    // they're rehomed under the same numeric keys; the second migration
    // below then collapses the 1..5 range into the new 1..4 range.
    for (let d = 1; d <= 5; d++) {
      const key = `blockit-puzzle-${d}`;
      const legacyPuzzle = localStorage.getItem(`blockit-riddle-puzzle-${d}`);
      if (legacyPuzzle !== null) {
        if (!localStorage.getItem(key)) localStorage.setItem(key, legacyPuzzle);
        localStorage.removeItem(`blockit-riddle-puzzle-${d}`);
      }

      const legacyBest = localStorage.getItem(`blockit-best-riddle-${d}`);
      if (legacyBest !== null) {
        const newKey = `blockit-best-puzzle-${d}`;
        if (!localStorage.getItem(newKey)) localStorage.setItem(newKey, legacyBest);
        localStorage.removeItem(`blockit-best-riddle-${d}`);
      }
    }

    // Second wave: the 1..5 → 1..4 rebalance. Old level 1 was nearly trivial
    // and has been folded into the new Easy, then the rest renumbered.
    // Mapping: 1→1, 2→1, 3→2, 4→3, 5→4. Done once, guarded by a marker.
    if (!localStorage.getItem(PUZZLE_RENUMBER_MARKER_KEY)) {
      const remap = (n: number): number =>
        n <= 2 ? 1 : n === 3 ? 2 : n === 4 ? 3 : 4;

      const rawDiff = localStorage.getItem(PUZZLE_DIFFICULTY_KEY);
      if (rawDiff !== null && rawDiff !== 'tutorial') {
        const n = Number(rawDiff);
        if (Number.isFinite(n) && n >= 1 && n <= 5) {
          localStorage.setItem(PUZZLE_DIFFICULTY_KEY, String(remap(n)));
        }
      }

      // Stored puzzles encode their own `difficulty` field, so simply dropping
      // everything is the cleanest path — a fresh puzzle at the new difficulty
      // will be generated on first load. Best scores, on the other hand,
      // represent real player progress so we migrate the ones whose semantic
      // level survives (old 3/4/5) and drop the ones that were folded away.
      const oldBest3 = localStorage.getItem('blockit-best-puzzle-3');
      const oldBest4 = localStorage.getItem('blockit-best-puzzle-4');
      const oldBest5 = localStorage.getItem('blockit-best-puzzle-5');

      for (let d = 1; d <= 5; d++) {
        localStorage.removeItem(`blockit-puzzle-${d}`);
        localStorage.removeItem(`blockit-best-puzzle-${d}`);
      }

      if (oldBest3 !== null) localStorage.setItem('blockit-best-puzzle-2', oldBest3);
      if (oldBest4 !== null) localStorage.setItem('blockit-best-puzzle-3', oldBest4);
      if (oldBest5 !== null) localStorage.setItem('blockit-best-puzzle-4', oldBest5);

      localStorage.setItem(PUZZLE_RENUMBER_MARKER_KEY, '1');
    }
  } catch { /* noop */ }
}

function loadMode(): GameMode {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (
      stored === 'classic' ||
      stored === 'puzzle' ||
      stored === 'chroma' ||
      stored === 'gravity' ||
      stored === 'drop' ||
      stored === 'mirror' ||
      stored === 'breathe' ||
      stored === 'pipeline' ||
      stored === 'scar' ||
      stored === 'monolith'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  // First-time players land in Puzzle mode; combined with loadPuzzleDifficulty's
  // default of 'tutorial', this drops new visitors straight into the guided
  // intro instead of leaving them to figure Classic out on their own. Anyone
  // who has played before has MODE_KEY saved and is unaffected.
  return 'puzzle';
}

function saveMode(mode: GameMode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch { /* noop */ }
}

function loadClassicDifficulty(): ClassicDifficulty {
  try {
    const stored = localStorage.getItem(CLASSIC_DIFFICULTY_KEY);
    if (
      stored === 'zen' ||
      stored === 'easy' ||
      stored === 'normal' ||
      stored === 'hard'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  return 'normal';
}

function saveClassicDifficulty(difficulty: ClassicDifficulty) {
  try {
    localStorage.setItem(CLASSIC_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadPuzzleDifficulty(): PuzzleDifficulty {
  if (import.meta.env.DEV) {
    return PUZZLE_MAX_DIFFICULTY;
  }
  try {
    const raw = localStorage.getItem(PUZZLE_DIFFICULTY_KEY);
    if (raw === 'tutorial') return 'tutorial';
    const stored = Number(raw);
    if (Number.isFinite(stored) && stored > 0) return clampPuzzleDifficulty(stored);
  } catch { /* noop */ }
  // First-time puzzle visitors land on the tutorial so the rules are obvious.
  return 'tutorial';
}

function savePuzzleDifficulty(difficulty: PuzzleDifficulty) {
  try {
    if (difficulty === 'tutorial') {
      localStorage.setItem(PUZZLE_DIFFICULTY_KEY, 'tutorial');
    } else {
      localStorage.setItem(PUZZLE_DIFFICULTY_KEY, String(clampPuzzleDifficulty(difficulty)));
    }
  } catch { /* noop */ }
}

function loadChromaDifficulty(): ChromaDifficulty {
  try {
    const stored = localStorage.getItem(CHROMA_DIFFICULTY_KEY);
    if (stored === 'normal') return stored;
  } catch { /* noop */ }
  return 'normal';
}

function loadGravityDifficulty(): GravityDifficulty {
  try {
    const stored = localStorage.getItem(GRAVITY_DIFFICULTY_KEY);
    if (
      stored === 'zen' ||
      stored === 'easy' ||
      stored === 'normal' ||
      stored === 'hard'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  return 'normal';
}

function saveGravityDifficulty(difficulty: GravityDifficulty) {
  try {
    localStorage.setItem(GRAVITY_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadDropDifficulty(): DropDifficulty {
  try {
    const stored = localStorage.getItem(DROP_DIFFICULTY_KEY);
    if (
      stored === 'zen' ||
      stored === 'easy' ||
      stored === 'normal' ||
      stored === 'hard'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  return 'normal';
}

function saveDropDifficulty(difficulty: DropDifficulty) {
  try {
    localStorage.setItem(DROP_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadMirrorDifficulty(): MirrorDifficulty {
  try {
    const stored = localStorage.getItem(MIRROR_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

function saveMirrorDifficulty(difficulty: MirrorDifficulty) {
  try {
    localStorage.setItem(MIRROR_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadBreatheDifficulty(): BreatheDifficulty {
  try {
    const stored = localStorage.getItem(BREATHE_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

function saveBreatheDifficulty(difficulty: BreatheDifficulty) {
  try {
    localStorage.setItem(BREATHE_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadPipelineDifficulty(): PipelineDifficulty {
  try {
    const stored = localStorage.getItem(PIPELINE_DIFFICULTY_KEY);
    if (
      stored === 'zen' ||
      stored === 'easy' ||
      stored === 'normal' ||
      stored === 'hard'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  return 'normal';
}

function savePipelineDifficulty(difficulty: PipelineDifficulty) {
  try {
    localStorage.setItem(PIPELINE_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadScarDifficulty(): ScarDifficulty {
  try {
    const stored = localStorage.getItem(SCAR_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'normal';
}

function saveScarDifficulty(difficulty: ScarDifficulty) {
  try {
    localStorage.setItem(SCAR_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadMonolithDifficulty(): MonolithDifficulty {
  try {
    const stored = localStorage.getItem(MONOLITH_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

function saveMonolithDifficulty(difficulty: MonolithDifficulty) {
  try {
    localStorage.setItem(MONOLITH_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

/**
 * Fresh seed for a Scar run's RNG. XOR with a random 32-bit chunk on top
 * of `Date.now()` so two Scar runs started in the same millisecond still
 * diverge — important on auto-restart loops in tests / dev.
 */
function freshScarRngSeed(): number {
  return ((Date.now() & 0xffffffff) ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
}

/**
 * Shape of the active puzzle as persisted to localStorage. Storing the
 * puzzle's starting position (not mid-game state) means refresh restores the
 * same challenge, and Restart returns to this exact beginning.
 */
type StoredPuzzle = {
  difficulty: PuzzleLevel;
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
};

function isValidStoredPuzzle(p: unknown, expected: PuzzleLevel): p is StoredPuzzle {
  if (!p || typeof p !== 'object') return false;
  const r = p as Partial<StoredPuzzle>;
  if (r.difficulty !== expected) return false;
  if (!Array.isArray(r.board) || r.board.length !== BOARD_SIZE) return false;
  for (const row of r.board) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
  }
  if (!Array.isArray(r.tray) || r.tray.length === 0) return false;
  if (!Array.isArray(r.target) || r.target.length !== BOARD_SIZE) return false;
  for (const row of r.target) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
  }
  return true;
}

function loadPuzzle(expected: PuzzleLevel): StoredPuzzle | null {
  try {
    const raw = localStorage.getItem(puzzleKey(expected));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidStoredPuzzle(parsed, expected)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePuzzle(p: StoredPuzzle) {
  try {
    localStorage.setItem(puzzleKey(p.difficulty), JSON.stringify(p));
  } catch { /* noop */ }
}

function cloneBoard(b: BoardGrid): BoardGrid {
  return b.map((row) => [...row]);
}
function cloneTarget(t: TargetPattern): TargetPattern {
  return t.map((row) => [...row]);
}
function cloneTray(t: PieceShape[]): PieceShape[] {
  return t.map((p) => ({ ...p, cells: p.cells.map((c) => ({ ...c })) }));
}

/**
 * Build a fresh state for the given puzzle difficulty, reusing the passed-in
 * best score and classic-difficulty selection. If `forceNew` is false and a
 * puzzle for this difficulty is already stored in localStorage (from a
 * previous session or a switch), that puzzle is loaded so the player faces
 * the same challenge they were on. Otherwise a new puzzle is generated and
 * persisted.
 */
function freshPuzzleState(
  difficulty: PuzzleLevel,
  classicDifficulty: ClassicDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved,
  options: { forceNew?: boolean } = {}
): GameState {
  const clamped = clampPuzzleDifficulty(difficulty);

  let stored = options.forceNew ? null : loadPuzzle(clamped);
  if (!stored) {
    const { board, tray, target } = generatePuzzle({ difficulty: clamped });
    stored = { difficulty: clamped, board, tray, target };
    savePuzzle(stored);
  }

  return {
    board: cloneBoard(stored.board),
    tray: cloneTray(stored.tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'puzzle',
    classicDifficulty,
    puzzleDifficulty: clamped,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: cloneTarget(stored.target),
    puzzleInitialBoard: cloneBoard(stored.board),
    puzzleInitialTray: cloneTray(stored.tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

/**
 * Build a state for the given tutorial step. Unlike numeric puzzles we do
 * not persist the puzzle — step content is authored in `tutorial.ts` and
 * always reloaded fresh. Best-score tracking is skipped so tutorial plays
 * don't pollute the leaderboard.
 */
function freshTutorialState(
  step: number,
  classicDifficulty: ClassicDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const safeStep = clampTutorialStep(step);
  const data = getTutorialStep(safeStep);
  return {
    board: cloneBoard(data.board),
    tray: cloneTray(data.tray),
    score: 0,
    bestScore: 0,
    combo: 0,
    isGameOver: false,
    mode: 'puzzle',
    classicDifficulty,
    puzzleDifficulty: 'tutorial',
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: cloneTarget(data.target),
    puzzleInitialBoard: cloneBoard(data.board),
    puzzleInitialTray: cloneTray(data.tray),
    tutorialStep: safeStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

/**
 * Build a puzzle state from an inbound share link's decoded payload. Does
 * NOT touch localStorage — the shared puzzle is ephemeral, so it must not
 * clobber whatever puzzle the player already had at this difficulty. The
 * puzzle is still used for Restart via `puzzleInitialBoard/Tray`.
 */
function freshPuzzleStateFromShared(
  shared: { difficulty: PuzzleLevel; board: BoardGrid; tray: PieceShape[]; target: TargetPattern },
  classicDifficulty: ClassicDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  return {
    board: cloneBoard(shared.board),
    tray: cloneTray(shared.tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'puzzle',
    classicDifficulty,
    puzzleDifficulty: shared.difficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: cloneTarget(shared.target),
    puzzleInitialBoard: cloneBoard(shared.board),
    puzzleInitialTray: cloneTray(shared.tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

function freshClassicState(
  difficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'classic',
    classicDifficulty: difficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Chroma state. Classic-shaped (empty board, random tray,
 * score-tracked) but with the Chroma palette and the no-touching-colors
 * rule enforced on placement.
 */
function freshChromaState(
  difficulty: ChromaDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateChromaTray(),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'chroma',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty: difficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Gravity state. Structurally identical to Classic (empty
 * board, random tray, score-tracked, classic piece difficulty weights),
 * but `mode: 'gravity'` is what signals the reducer to run the cascade
 * pipeline on each placement.
 */
function freshGravityState(
  difficulty: GravityDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'gravity',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty: difficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Drop state. Same piece pool as Classic/Gravity (classic
 * difficulty weights), but `mode: 'drop'` is what signals the reducer to
 * run the Tetris-style rigid-body fall + row-only clear + slab-collapse
 * pipeline on each placement instead of Classic's clear-in-place logic.
 */
function freshDropState(
  difficulty: DropDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'drop',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty: difficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Mirror state. Reuses the puzzle-mode goal/undo/restart
 * scaffolding (`puzzleTarget`, `puzzleInitialBoard`, `puzzleInitialTray`,
 * `puzzleResult`, `puzzleUndoStack`) since Mirror is a puzzle-style mode
 * with a target pattern and a finite tray. The placement pipeline keys
 * off `mode === 'mirror'` to apply the reflective placement rules.
 *
 * Unlike Puzzle, Mirror puzzles are not persisted to localStorage —
 * mirror generation is fast and the puzzles aren't difficulty-tracked
 * with first-solved milestones, so a fresh puzzle on each entry keeps
 * the experience surprising and the storage footprint tiny.
 */
function freshMirrorState(
  difficulty: MirrorDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const { board, tray, target } = generateMirrorPuzzle({ difficulty });
  return {
    board: cloneBoard(board),
    tray: cloneTray(tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'mirror',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty: difficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: cloneTarget(target),
    puzzleInitialBoard: cloneBoard(board),
    puzzleInitialTray: cloneTray(tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Breathe state. Reuses the puzzle-mode goal/undo/restart
 * scaffolding (`puzzleTarget`, `puzzleInitialBoard`, `puzzleInitialTray`,
 * `puzzleResult`, `puzzleUndoStack`) since Breathe is a puzzle-style mode
 * with a target pattern and a finite tray. The placement pipeline keys
 * off `mode === 'breathe'` to apply the additional no-2×2 win check on
 * the final board.
 *
 * Like Mirror, Breathe puzzles aren't persisted to localStorage —
 * generation is fast and a fresh puzzle on each entry keeps the
 * experience surprising while keeping the storage footprint tiny.
 */
function freshBreatheState(
  difficulty: BreatheDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const { board, tray, target } = generateBreathePuzzle({ difficulty });
  return {
    board: cloneBoard(board),
    tray: cloneTray(tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'breathe',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty: difficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: cloneTarget(target),
    puzzleInitialBoard: cloneBoard(board),
    puzzleInitialTray: cloneTray(tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Pipeline state. Same skeleton as Classic (empty board,
 * random tray drawn from the classic-weighted pool, score-tracked) — the
 * twist is the round-robin tray-slot lock, not the piece vocabulary, so
 * we reuse `generateClassicTray` and let `mode: 'pipeline'` plus
 * `pipelinePhase` drive the placement-rule branching in the reducer.
 *
 * `pipelinePhase` is reset to 0 here (and on RESTART / mode change /
 * difficulty change), giving the player a predictable "always start at
 * slot 0" anchor even when they hop between modes.
 */
function freshPipelineState(
  difficulty: PipelineDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'pipeline',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty: difficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Scar state. Score-attack like Classic — empty board,
 * Classic piece weights, classic line-clear logic — except every cleared
 * line triggers a "scar burst" that permanently damages a few empty
 * cells (see `scar.ts` for the mechanics). Each entry into the mode
 * rerolls `scarRngSeed` so two consecutive runs play out differently
 * even when the player makes identical moves.
 */
function freshScarState(
  difficulty: ScarDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  monolithDifficulty: MonolithDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'scar',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty: difficulty,
    scarRngSeed: freshScarRngSeed(),
    monolithDifficulty,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Monolith state. Reuses the puzzle-mode goal/undo/restart
 * scaffolding (`puzzleTarget`, `puzzleInitialBoard`, `puzzleInitialTray`,
 * `puzzleResult`, `puzzleUndoStack`) since Monolith is a puzzle-style
 * mode with a target pattern and a finite tray. The placement pipeline
 * keys off `mode === 'monolith'` to enforce the "must touch monolith"
 * + "single 4-connected component after clears" invariants.
 *
 * Like Mirror/Breathe, Monolith puzzles aren't persisted to localStorage
 * — generation is fast and a fresh puzzle on each entry keeps the
 * experience surprising while keeping the storage footprint tiny.
 */
function freshMonolithState(
  difficulty: MonolithDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const { board, tray, target } = generateMonolithPuzzle({ difficulty });
  return {
    board: cloneBoard(board),
    tray: cloneTray(tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'monolith',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty: difficulty,
    puzzleResult: null,
    puzzleTarget: cloneTarget(target),
    puzzleInitialBoard: cloneBoard(board),
    puzzleInitialTray: cloneTray(tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    puzzleUndoStack: [],
  };
}

export function createInitialState(): GameState {
  migrateLegacyKeys();
  const classicDifficulty = loadClassicDifficulty();
  const puzzleDifficulty = loadPuzzleDifficulty();
  const chromaDifficulty = loadChromaDifficulty();
  const gravityDifficulty = loadGravityDifficulty();
  const dropDifficulty = loadDropDifficulty();
  const mirrorDifficulty = loadMirrorDifficulty();
  const breatheDifficulty = loadBreatheDifficulty();
  const pipelineDifficulty = loadPipelineDifficulty();
  const scarDifficulty = loadScarDifficulty();
  const monolithDifficulty = loadMonolithDifficulty();
  const tutorialStep = loadTutorialStep();
  // Load the "ever solved" set exactly once at init — from here on the
  // reducer only reads/writes `state.puzzleEverSolved`. Keeping
  // localStorage reads out of the reducer is what lets it stay idempotent
  // under React 19 StrictMode's double-invocation-in-dev guard.
  const puzzleEverSolved = loadPuzzleEverSolved();

  // A share link in the URL hash takes precedence over saved state so the
  // recipient lands directly on the shared puzzle. We intentionally do NOT
  // call saveMode / savePuzzleDifficulty / savePuzzle here — the
  // shared puzzle is ephemeral and must not overwrite whatever the user
  // had going on at that difficulty.
  const sharedPayload = parseSharePayload();
  if (sharedPayload) {
    const decoded = decodePuzzle(sharedPayload);
    if (decoded) {
      return freshPuzzleStateFromShared(
        decoded,
        classicDifficulty,
        chromaDifficulty,
        gravityDifficulty,
        dropDifficulty,
        mirrorDifficulty,
        breatheDifficulty,
        pipelineDifficulty,
        scarDifficulty,
        monolithDifficulty,
        loadBestScore('puzzle', decoded.difficulty),
        tutorialStep,
        puzzleEverSolved
      );
    }
  }

  const mode = loadMode();
  if (mode === 'puzzle') {
    if (puzzleDifficulty === 'tutorial') {
      // Always (re)start the tutorial from step 1 on entry, regardless of
      // any previously-persisted progress. The tutorial is short and
      // players returning to it generally want to replay the full thing.
      return freshTutorialState(
        0,
        classicDifficulty,
        chromaDifficulty,
        gravityDifficulty,
        dropDifficulty,
        mirrorDifficulty,
        breatheDifficulty,
        pipelineDifficulty,
        scarDifficulty,
        monolithDifficulty,
        puzzleEverSolved
      );
    }
    return freshPuzzleState(
      puzzleDifficulty,
      classicDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      loadBestScore('puzzle', puzzleDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'chroma') {
    return freshChromaState(
      chromaDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      loadBestScore('chroma', chromaDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'gravity') {
    return freshGravityState(
      gravityDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      loadBestScore('gravity', gravityDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'drop') {
    return freshDropState(
      dropDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      loadBestScore('drop', dropDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'mirror') {
    return freshMirrorState(
      mirrorDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      loadBestScore('mirror', mirrorDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'breathe') {
    return freshBreatheState(
      breatheDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      loadBestScore('breathe', breatheDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'pipeline') {
    return freshPipelineState(
      pipelineDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      scarDifficulty,
      monolithDifficulty,
      loadBestScore('pipeline', pipelineDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'scar') {
    return freshScarState(
      scarDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      monolithDifficulty,
      loadBestScore('scar', scarDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'monolith') {
    return freshMonolithState(
      monolithDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      loadBestScore('monolith', monolithDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  return freshClassicState(
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    scarDifficulty,
    monolithDifficulty,
    loadBestScore('classic', classicDifficulty),
    tutorialStep,
    puzzleEverSolved
  );
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ROTATE_TRAY_PIECE': {
      const { trayIndex } = action;
      if (trayIndex < 0 || trayIndex >= state.tray.length) return state;
      // Pipeline mode locks rotation to the active slot. The chosen design
      // is "only the active piece can be rotated" (vs. "all rotate but
      // only active is placeable") — easier to read at a glance: if you
      // can't rotate it, you can't place it either, so it's clearly inert
      // until its turn. Non-active rotation requests are silent no-ops.
      if (state.mode === 'pipeline' && trayIndex !== state.pipelinePhase) {
        return state;
      }
      const piece = state.tray[trayIndex];
      if (!piece) return state;
      const newTray = [...state.tray];
      newTray[trayIndex] = rotatePiece90Clockwise(piece);
      const enforceColorAdjacency = state.mode === 'chroma';
      const isGameOver =
        state.mode === 'mirror'
          ? !hasValidMirrorMoves(state.board, newTray)
          : state.mode === 'monolith'
            ? !hasValidMonolithMoves(state.board, newTray)
            : state.mode === 'pipeline'
              ? !hasValidPipelineMoves(state.board, newTray, state.pipelinePhase)
              : !hasValidMoves(state.board, newTray, { enforceColorAdjacency });
      const puzzleResult =
        (state.mode === 'puzzle' ||
          state.mode === 'mirror' ||
          state.mode === 'breathe' ||
          state.mode === 'monolith') &&
        isGameOver
          ? 'failed'
          : state.puzzleResult;
      return {
        ...state,
        tray: newTray,
        isGameOver,
        puzzleResult,
        puzzleLevelUp: null,
        lastCascade: null,
      };
    }

    case 'PLACE_PIECE': {
      const piece = state.tray[action.trayIndex];
      if (!piece) return state;

      // Pipeline mode: the tray is a strict round-robin queue, so only the
      // currently-active slot is legal to place from. Any other index gets
      // bounced just like an off-board placement — UI dispatchers treat the
      // returned-unchanged state as "drop rejected" so the player gets their
      // piece back. This guard runs BEFORE we fall into the shared
      // classic-style placement flow below; the rest of the branch (score,
      // clears, refill) is unchanged from Classic, with the post-placement
      // phase advance + game-over check applied at the tail.
      if (state.mode === 'pipeline' && action.trayIndex !== state.pipelinePhase) {
        return state;
      }

      // Scar mode: classic-style score-attack with one twist — every
      // placement that triggers a line clear "scars" a few empty cells,
      // turning them into permanent blockers. Branched out early so the
      // shared mid-section below stays Classic / Chroma / Gravity / Drop
      // / Puzzle exactly as it was. We deliberately route the cleared-
      // cells through `clearLinesPreservingScars` (NOT the shared
      // `clearLines`) — that's option 1 from the design spec, kept local
      // so other modes' clear semantics stay untouched.
      if (state.mode === 'scar') {
        // canPlacePiece already rejects any non-null cell, and SCAR_COLOR
        // cells are non-null — so scar overlap is rejected here without
        // any extra logic. (The sentinel-color trick is what makes this
        // mode so cheap to bolt on.)
        if (!canPlacePiece(state.board, piece, action.origin)) return state;

        let board = placePiece(state.board, piece, action.origin);
        let score = state.score + calculatePlacementScore(piece);
        let combo = state.combo;
        let scarRngSeed = state.scarRngSeed;

        // Scar cells count as filled by `detectCompletedLines` (they're
        // non-null), which is exactly what we want — a row containing a
        // scar can still be cleared, just like in Classic. The
        // preserve-scars clearer below leaves the scar in place when the
        // row is wiped, so the damaged terrain stays damaged.
        const { rows, cols } = detectCompletedLines(board);
        const linesCleared = rows.length + cols.length;

        if (linesCleared > 0) {
          board = clearLinesPreservingScars(board, rows, cols);
          score += calculateClearScore(linesCleared, combo);
          combo += 1;

          // One scar burst per clear EVENT, not per cleared line —
          // predictable damage cost regardless of how many lines you
          // collapse in a single placement. Difficulty controls only the
          // burst size.
          const k = scarsPerEvent(state.scarDifficulty);
          const avoidClusters = state.scarDifficulty === 'hard';
          const rng = mulberry32(scarRngSeed);
          const scarCells = pickScarCells(board, k, rng, { avoidClusters });
          board = applyScars(board, scarCells);
          // Bump the seed so the next burst (deterministic given the
          // seed) varies turn-to-turn rather than landing in identical
          // patterns when the post-clear board happens to look the same.
          scarRngSeed = (scarRngSeed + 1) >>> 0;
        } else {
          combo = 0;
        }

        const newTray = [...state.tray];
        newTray[action.trayIndex] = null;
        const allPlaced = newTray.every((s) => s === null);
        // Classic piece weights across all difficulties — Scar's challenge
        // is environmental (the scars), not the piece mix.
        const finalTray = allPlaced
          ? generateClassicTray(state.scarDifficulty, board)
          : newTray;

        const bestScore = Math.max(score, state.bestScore);
        // Game-over is the standard Classic-style check. `canPlacePiece`
        // (used inside `hasValidMoves`) already rejects scar cells via the
        // non-null sentinel, so no scar-aware variant is needed here.
        const isGameOver = !hasValidMoves(board, finalTray);

        if (bestScore > state.bestScore) {
          saveBestScore('scar', state.scarDifficulty, bestScore);
        }

        return {
          ...state,
          board,
          tray: finalTray,
          score,
          bestScore,
          combo,
          isGameOver,
          scarRngSeed,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: [],
        };
      }

      // Monolith mode: every placement must touch the existing monolith
      // (SEED + previously-placed cells), and after any line clears the
      // remaining monolith-fill cells must form a single 4-connected
      // component. `canPlaceMonolith` enforces both invariants. Like
      // Mirror/Breathe this is a target-pattern + finite-tray puzzle, so
      // we reuse the puzzle-mode undo/restart scaffolding and check
      // `boardMatchesTarget` on tray-empty.
      if (state.mode === 'monolith') {
        if (!canPlaceMonolith(state.board, piece, action.origin)) return state;

        const monolithUndoStack: PuzzleUndoSnapshot[] = [
          ...state.puzzleUndoStack,
          { board: state.board, tray: state.tray, score: state.score, combo: state.combo },
        ];

        let mboard = placePiece(state.board, piece, action.origin);
        let mscore = state.score + calculatePlacementScore(piece);
        let mcombo = state.combo;
        const { rows: mrows, cols: mcols } = detectCompletedLines(mboard);
        const mlinesCleared = mrows.length + mcols.length;
        if (mlinesCleared > 0) {
          mboard = clearLines(mboard, mrows, mcols);
          mscore += calculateClearScore(mlinesCleared, mcombo);
          mcombo += 1;
        } else {
          mcombo = 0;
        }

        const mNewTray = [...state.tray];
        mNewTray[action.trayIndex] = null;
        const mAllPlaced = mNewTray.every((s) => s === null);
        const mTarget = state.puzzleTarget;
        const mDifficulty = state.monolithDifficulty;

        if (mAllPlaced) {
          const solved = mTarget !== null && boardMatchesTarget(mboard, mTarget);
          if (solved) mscore += PUZZLE_SOLVE_BONUS;
          const bestScore = Math.max(mscore, state.bestScore);
          if (bestScore > state.bestScore) {
            saveBestScore('monolith', mDifficulty, bestScore);
          }
          return {
            ...state,
            board: mboard,
            tray: mNewTray,
            score: mscore,
            bestScore,
            combo: solved ? mcombo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp: null,
            lastCascade: null,
            puzzleUndoStack: monolithUndoStack,
          };
        }

        const isGameOver = !hasValidMonolithMoves(mboard, mNewTray);
        const bestScore = Math.max(mscore, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('monolith', mDifficulty, bestScore);
        }
        return {
          ...state,
          board: mboard,
          tray: mNewTray,
          score: mscore,
          bestScore,
          combo: mcombo,
          isGameOver,
          puzzleResult: isGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: monolithUndoStack,
        };
      }

      // Mirror mode: every placement also writes its horizontal reflection.
      // Validation, board mutation, line clearing, and win/lose detection
      // all use the *_Mirrored variants. We branch out early so the rest of
      // PLACE_PIECE doesn't have to special-case it.
      if (state.mode === 'mirror') {
        if (!canPlacePieceMirrored(state.board, piece, action.origin)) return state;

        const undoStack: PuzzleUndoSnapshot[] = [
          ...state.puzzleUndoStack,
          { board: state.board, tray: state.tray, score: state.score, combo: state.combo },
        ];

        let mboard = placePieceMirrored(state.board, piece, action.origin);
        let mscore = state.score + calculatePlacementScore(piece) * 2;
        let mcombo = state.combo;
        const { rows: mrows, cols: mcols } = detectCompletedLines(mboard);
        const mlinesCleared = mrows.length + mcols.length;
        if (mlinesCleared > 0) {
          mboard = clearLines(mboard, mrows, mcols);
          mscore += calculateClearScore(mlinesCleared, mcombo) * 2;
          mcombo += 1;
        } else {
          mcombo = 0;
        }

        const mNewTray = [...state.tray];
        mNewTray[action.trayIndex] = null;
        const mAllPlaced = mNewTray.every((s) => s === null);
        const mTarget = state.puzzleTarget;
        const mDifficulty = state.mirrorDifficulty;

        if (mAllPlaced) {
          const solved = mTarget !== null && boardMatchesTarget(mboard, mTarget);
          if (solved) mscore += PUZZLE_SOLVE_BONUS;
          const bestScore = Math.max(mscore, state.bestScore);
          if (bestScore > state.bestScore) {
            saveBestScore('mirror', mDifficulty, bestScore);
          }
          return {
            ...state,
            board: mboard,
            tray: mNewTray,
            score: mscore,
            bestScore,
            combo: solved ? mcombo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp: null,
            lastCascade: null,
            puzzleUndoStack: undoStack,
          };
        }

        const isGameOver = !hasValidMirrorMoves(mboard, mNewTray);
        const bestScore = Math.max(mscore, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('mirror', mDifficulty, bestScore);
        }
        return {
          ...state,
          board: mboard,
          tray: mNewTray,
          score: mscore,
          bestScore,
          combo: mcombo,
          isGameOver,
          puzzleResult: isGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: undoStack,
        };
      }

      const enforceColorAdjacency = state.mode === 'chroma';
      if (!canPlacePiece(state.board, piece, action.origin, { enforceColorAdjacency })) return state;

      // Snapshot pre-placement state so Puzzle mode can surface a
      // multi-step Undo. Captured here (before any board mutation) so
      // each restore is an exact revert. The reducer already treats
      // prior state as immutable, so holding references — no clone — is
      // safe. Outside puzzle mode the stack stays empty (we don't track
      // history for Classic / Chroma / Gravity / Drop).
      const puzzleUndoStack: PuzzleUndoSnapshot[] =
        state.mode === 'puzzle' || state.mode === 'breathe'
          ? [
              ...state.puzzleUndoStack,
              { board: state.board, tray: state.tray, score: state.score, combo: state.combo },
            ]
          : [];

      let board = placePiece(state.board, piece, action.origin);
      let score = state.score + calculatePlacementScore(piece);
      let combo = state.combo;
      let cascadeSteps: CascadeStep[] | null = null;

      if (state.mode === 'gravity') {
        // Gravity mode: run the full clear → fall → clear loop and score
        // each step. Step 1 is the player-triggered clear (no chain
        // multiplier); every subsequent step is a gravity-driven cascade
        // and gets a rising multiplier on top of combo. Combo still
        // advances by exactly one per placement (i.e. a single turn
        // triggers one combo step regardless of cascade depth) so the
        // turn-over-turn combo mechanic keeps working the same way.
        const resolved = resolveCascades(board);
        if (resolved.steps.length > 0) {
          for (let i = 0; i < resolved.steps.length; i++) {
            const step = resolved.steps[i];
            const linesThisStep = step.clearedRows.length + step.clearedCols.length;
            const stepMul = chainMultiplier(i + 1);
            score += Math.floor(calculateClearScore(linesThisStep, combo) * stepMul);
          }
          combo += 1;
          cascadeSteps = resolved.steps;
        } else {
          combo = 0;
        }
        board = resolved.board;
      } else if (state.mode === 'drop') {
        // Drop mode: Tetris-style row-only clears + slab collapse. The
        // caller (App.tsx) has already simulated the rigid-body fall and
        // passes us the landed origin, so by the time we get here `board`
        // holds the piece in its final resting position. All we do is
        // detect full ROWS (column clears are disabled in this mode by
        // design), remove them, and shift everything above down by the
        // count of cleared rows strictly below it. Slab collapse cannot
        // create new full rows in one pass, so a single CascadeStep is
        // enough for animation — no loop needed.
        const { rows } = detectCompletedLines(board);
        if (rows.length > 0) {
          const boardBefore = board;
          const { board: collapsed, fallDistances } = applySlabCollapse(board, rows);
          const clearedCells: string[] = [];
          for (const r of rows) {
            for (let c = 0; c < BOARD_SIZE; c++) {
              if (boardBefore[r][c] !== null) {
                clearedCells.push(`${r},${c}`);
              }
            }
          }
          cascadeSteps = [{
            boardBefore,
            clearedRows: rows,
            clearedCols: [],
            clearedCells,
            boardAfter: collapsed,
            fallDistances,
          }];
          score += calculateClearScore(rows.length, combo);
          combo += 1;
          board = collapsed;
        } else {
          combo = 0;
        }
      } else {
        const { rows, cols } = detectCompletedLines(board);
        const linesCleared = rows.length + cols.length;

        if (linesCleared > 0) {
          board = clearLines(board, rows, cols);
          score += calculateClearScore(linesCleared, combo);
          combo += 1;
        } else {
          combo = 0;
        }
      }

      const newTray = [...state.tray];
      newTray[action.trayIndex] = null;

      const allPlaced = newTray.every((s) => s === null);

      if (state.mode === 'puzzle') {
        const target = state.puzzleTarget;
        const puzzleDifficulty = state.puzzleDifficulty;
        const isTutorial = puzzleDifficulty === 'tutorial';
        // Tutorial plays don't count toward best-score tracking: the steps
        // are authored and the "score" number isn't meaningful here.
        const trackableDifficulty: PuzzleLevel | null =
          isPuzzleLevel(puzzleDifficulty) ? puzzleDifficulty : null;

        if (allPlaced) {
          const solved = target !== null && boardMatchesTarget(board, target);
          if (solved && !isTutorial) score += PUZZLE_SOLVE_BONUS;

          const bestScore = Math.max(score, state.bestScore);
          if (trackableDifficulty !== null && bestScore > state.bestScore) {
            saveBestScore('puzzle', trackableDifficulty, bestScore);
          }

          // First-time solve of a numeric difficulty flips a persistent flag
          // so the level-up promotion in the overlay only fires once per
          // difficulty. Tutorial solves never trigger promotion (there's no
          // "next difficulty" story there — the tutorial has its own
          // Graduation flow via TUTORIAL_NEXT). Shared/ephemeral puzzles
          // still count: beating any Hard puzzle for the first time is the
          // milestone worth celebrating, shared or not.
          //
          // Detection reads `state.puzzleEverSolved` (not localStorage), so
          // the decision is a pure function of the incoming state — which
          // is what keeps us correct under React 19 StrictMode's
          // double-invocation of the reducer in dev. The corresponding
          // persistence is handled by the App via a useEffect that
          // observes this same field.
          const alreadySolvedBefore =
            trackableDifficulty !== null &&
            state.puzzleEverSolved[trackableDifficulty] === true;
          const puzzleLevelUp: PuzzleLevel | null =
            solved && trackableDifficulty !== null && !alreadySolvedBefore
              ? trackableDifficulty
              : null;
          const puzzleEverSolved: PuzzleEverSolved =
            puzzleLevelUp !== null
              ? { ...state.puzzleEverSolved, [puzzleLevelUp]: true }
              : state.puzzleEverSolved;

          return {
            ...state,
            board,
            tray: newTray,
            score,
            bestScore,
            combo: solved ? combo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp,
            puzzleEverSolved,
            lastCascade: null,
            puzzleUndoStack,
          };
        }
        const isGameOver = !hasValidMoves(board, newTray);
        const bestScore = Math.max(score, state.bestScore);
        if (trackableDifficulty !== null && bestScore > state.bestScore) {
          saveBestScore('puzzle', trackableDifficulty, bestScore);
        }
        return {
          ...state,
          board,
          tray: newTray,
          score,
          bestScore,
          combo,
          isGameOver,
          puzzleResult: isGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack,
        };
      }

      // Breathe mode: structurally identical to puzzle (target pattern,
      // finite tray, undo-able placements) but the win condition adds an
      // explicit "no solid 2×2 anywhere on the board" check on top of
      // boardMatchesTarget. Failing the Breathe rule with the tray empty
      // counts as a loss — the player has matched the target outline but
      // suffocated it.
      if (state.mode === 'breathe') {
        const target = state.puzzleTarget;
        const breatheDifficulty = state.breatheDifficulty;

        if (allPlaced) {
          const solved =
            target !== null &&
            boardMatchesTarget(board, target) &&
            boardSatisfiesBreathe(board);
          if (solved) score += PUZZLE_SOLVE_BONUS;
          const bestScore = Math.max(score, state.bestScore);
          if (bestScore > state.bestScore) {
            saveBestScore('breathe', breatheDifficulty, bestScore);
          }
          return {
            ...state,
            board,
            tray: newTray,
            score,
            bestScore,
            combo: solved ? combo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp: null,
            lastCascade: null,
            puzzleUndoStack,
          };
        }

        const isGameOver = !hasValidMoves(board, newTray);
        const bestScore = Math.max(score, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('breathe', breatheDifficulty, bestScore);
        }
        return {
          ...state,
          board,
          tray: newTray,
          score,
          bestScore,
          combo,
          isGameOver,
          puzzleResult: isGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack,
        };
      }

      if (state.mode === 'chroma') {
        const finalTray = allPlaced ? generateChromaTray() : newTray;

        const bestScore = Math.max(score, state.bestScore);
        // Chroma game-over uses the adjacency-aware validator so "no move
        // fits" correctly accounts for the color-touching rule.
        const isGameOver = !hasValidMoves(board, finalTray, { enforceColorAdjacency: true });

        if (bestScore > state.bestScore) {
          saveBestScore('chroma', state.chromaDifficulty, bestScore);
        }

        return {
          ...state,
          board,
          tray: finalTray,
          score,
          bestScore,
          combo,
          isGameOver,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: [],
        };
      }

      if (state.mode === 'gravity') {
        const finalTray = allPlaced
          ? generateClassicTray(state.gravityDifficulty, board)
          : newTray;

        const bestScore = Math.max(score, state.bestScore);
        const isGameOver = !hasValidMoves(board, finalTray);

        if (bestScore > state.bestScore) {
          saveBestScore('gravity', state.gravityDifficulty, bestScore);
        }

        return {
          ...state,
          board,
          tray: finalTray,
          score,
          bestScore,
          combo,
          isGameOver,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: cascadeSteps,
          puzzleUndoStack: [],
        };
      }

      if (state.mode === 'drop') {
        const finalTray = allPlaced
          ? generateClassicTray(state.dropDifficulty, board)
          : newTray;

        const bestScore = Math.max(score, state.bestScore);
        // Drop game-over: no tray piece has any (rotation, horizontal
        // column-origin) where its simulated fall fits inside the board.
        // Uses `hasValidDrops` rather than `hasValidMoves` because valid
        // placements here are restricted to the subset reachable by the
        // rigid-body fall simulator.
        const isGameOver = !hasValidDrops(board, finalTray);

        if (bestScore > state.bestScore) {
          saveBestScore('drop', state.dropDifficulty, bestScore);
        }

        return {
          ...state,
          board,
          tray: finalTray,
          score,
          bestScore,
          combo,
          isGameOver,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: cascadeSteps,
          puzzleUndoStack: [],
        };
      }

      if (state.mode === 'pipeline') {
        // Pipeline tray refill mirrors Classic: only refill once ALL three
        // slots are empty, so the round-robin phase has actually completed
        // a full cycle (0 → 1 → 2 → refill → 0). Refilling earlier would
        // shrink the cycle and break the "no cherry-picking" promise.
        const finalTray = allPlaced
          ? generateClassicTray(state.pipelineDifficulty, board)
          : newTray;

        // Advance the cursor regardless of refill: the player just placed
        // from `pipelinePhase`, so the next legal slot is the next index
        // mod 3. If we just placed at slot 2 and refilled, the new active
        // slot is 0 (which is now filled with a fresh piece) — that's the
        // intended start-of-cycle, not a reset.
        const nextPhase = (((state.pipelinePhase + 1) % 3) as 0 | 1 | 2);

        const bestScore = Math.max(score, state.bestScore);
        // Game over: ONLY checks the next active piece, not the whole tray.
        // This is the key UX promise — "No move for your next piece." —
        // and is what makes Pipeline meaningfully different from Classic.
        const isGameOver = !hasValidPipelineMoves(board, finalTray, nextPhase);

        if (bestScore > state.bestScore) {
          saveBestScore('pipeline', state.pipelineDifficulty, bestScore);
        }

        return {
          ...state,
          board,
          tray: finalTray,
          score,
          bestScore,
          combo,
          isGameOver,
          pipelinePhase: nextPhase,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: [],
        };
      }

      const finalTray = allPlaced ? generateClassicTray(state.classicDifficulty, board) : newTray;

      const bestScore = Math.max(score, state.bestScore);
      const isGameOver = !hasValidMoves(board, finalTray);

      if (bestScore > state.bestScore) {
        saveBestScore('classic', state.classicDifficulty, bestScore);
      }

      return {
        ...state,
        board,
        tray: finalTray,
        score,
        bestScore,
        combo,
        isGameOver,
        puzzleResult: null,
        puzzleLevelUp: null,
        lastCascade: null,
        puzzleUndoStack: [],
      };
    }

    case 'SET_MODE': {
      if (action.mode === state.mode) return state;
      saveMode(action.mode);
      if (action.mode === 'puzzle') {
        // Entering puzzle mode: resume the stored puzzle at the current
        // difficulty if there is one, otherwise generate and persist a new one.
        if (state.puzzleDifficulty === 'tutorial') {
          // Always (re)start the tutorial from step 1 on entry — see the
          // equivalent note in createInitialState.
          return freshTutorialState(
            0,
            state.classicDifficulty,
            state.chromaDifficulty,
            state.gravityDifficulty,
            state.dropDifficulty,
            state.mirrorDifficulty,
            state.breatheDifficulty,
            state.pipelineDifficulty,
            state.scarDifficulty,
            state.monolithDifficulty,
            state.puzzleEverSolved
          );
        }
        return freshPuzzleState(
          state.puzzleDifficulty,
          state.classicDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          loadBestScore('puzzle', state.puzzleDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'chroma') {
        return freshChromaState(
          state.chromaDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          loadBestScore('chroma', state.chromaDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'gravity') {
        return freshGravityState(
          state.gravityDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          loadBestScore('gravity', state.gravityDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'drop') {
        return freshDropState(
          state.dropDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          loadBestScore('drop', state.dropDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'mirror') {
        return freshMirrorState(
          state.mirrorDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          loadBestScore('mirror', state.mirrorDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'breathe') {
        return freshBreatheState(
          state.breatheDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          loadBestScore('breathe', state.breatheDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'pipeline') {
        return freshPipelineState(
          state.pipelineDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          loadBestScore('pipeline', state.pipelineDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'scar') {
        return freshScarState(
          state.scarDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.monolithDifficulty,
          loadBestScore('scar', state.scarDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'monolith') {
        return freshMonolithState(
          state.monolithDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          loadBestScore('monolith', state.monolithDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      return freshClassicState(
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        loadBestScore('classic', state.classicDifficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_CLASSIC_DIFFICULTY': {
      if (!CLASSIC_DIFFICULTIES.includes(action.difficulty)) return state;
      saveClassicDifficulty(action.difficulty);
      saveMode('classic');
      return freshClassicState(
        action.difficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        loadBestScore('classic', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_PUZZLE_DIFFICULTY': {
      if (action.difficulty === 'tutorial') {
        savePuzzleDifficulty('tutorial');
        saveMode('puzzle');
        // Always (re)start the tutorial from step 1 on entry, even if the
        // player had previously advanced past it or completed it.
        return freshTutorialState(
          0,
          state.classicDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.puzzleEverSolved
        );
      }
      const target = clampPuzzleDifficulty(action.difficulty);
      savePuzzleDifficulty(target);
      saveMode('puzzle');
      // Switching difficulties always starts fresh for the destination: if a
      // stored puzzle exists for it, resume; otherwise generate one.
      return freshPuzzleState(
        target,
        state.classicDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        loadBestScore('puzzle', target),
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
      );
    }

    case 'SET_GRAVITY_DIFFICULTY': {
      if (!GRAVITY_DIFFICULTIES.includes(action.difficulty)) return state;
      saveGravityDifficulty(action.difficulty);
      saveMode('gravity');
      return freshGravityState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        loadBestScore('gravity', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_DROP_DIFFICULTY': {
      if (!DROP_DIFFICULTIES.includes(action.difficulty)) return state;
      saveDropDifficulty(action.difficulty);
      saveMode('drop');
      return freshDropState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        loadBestScore('drop', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_MIRROR_DIFFICULTY': {
      if (!MIRROR_DIFFICULTIES.includes(action.difficulty)) return state;
      saveMirrorDifficulty(action.difficulty);
      saveMode('mirror');
      return freshMirrorState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        loadBestScore('mirror', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_BREATHE_DIFFICULTY': {
      if (!BREATHE_DIFFICULTIES.includes(action.difficulty)) return state;
      saveBreatheDifficulty(action.difficulty);
      saveMode('breathe');
      return freshBreatheState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        loadBestScore('breathe', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_PIPELINE_DIFFICULTY': {
      if (!PIPELINE_DIFFICULTIES.includes(action.difficulty)) return state;
      savePipelineDifficulty(action.difficulty);
      saveMode('pipeline');
      return freshPipelineState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        loadBestScore('pipeline', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_SCAR_DIFFICULTY': {
      if (!SCAR_DIFFICULTIES.includes(action.difficulty)) return state;
      saveScarDifficulty(action.difficulty);
      saveMode('scar');
      return freshScarState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.monolithDifficulty,
        loadBestScore('scar', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_MONOLITH_DIFFICULTY': {
      if (!MONOLITH_DIFFICULTIES.includes(action.difficulty)) return state;
      saveMonolithDifficulty(action.difficulty);
      saveMode('monolith');
      return freshMonolithState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        loadBestScore('monolith', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'NEW_PUZZLE': {
      if (state.mode !== 'puzzle') return state;
      // Tutorial steps are authored — "new puzzle" would be meaningless, so
      // this action is a no-op for the tutorial. (The UI also hides the button.)
      if (state.puzzleDifficulty === 'tutorial') return state;
      return freshPuzzleState(
        state.puzzleDifficulty,
        state.classicDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
      );
    }

    case 'NEW_MIRROR_PUZZLE': {
      if (state.mode !== 'mirror') return state;
      return freshMirrorState(
        state.mirrorDifficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'NEW_BREATHE_PUZZLE': {
      if (state.mode !== 'breathe') return state;
      return freshBreatheState(
        state.breatheDifficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'NEW_MONOLITH_PUZZLE': {
      if (state.mode !== 'monolith') return state;
      return freshMonolithState(
        state.monolithDifficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'LOAD_SHARED_PUZZLE': {
      // Preserve the per-difficulty best score for the incoming difficulty so
      // the display stays meaningful. Do NOT persist anything about the
      // shared puzzle itself.
      return freshPuzzleStateFromShared(
        {
          difficulty: action.difficulty,
          board: action.board,
          tray: action.tray,
          target: action.target,
        },
        state.classicDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        loadBestScore('puzzle', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'TUTORIAL_NEXT': {
      const next = state.tutorialStep + 1;
      if (next >= TUTORIAL_STEP_COUNT) {
        // Graduation: mark the tutorial completed and drop the player into
        // the Easy puzzle — the natural next challenge.
        saveTutorialStep(TUTORIAL_STEP_COUNT - 1);
        savePuzzleDifficulty(1);
        saveMode('puzzle');
        return freshPuzzleState(
          1,
          state.classicDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          loadBestScore('puzzle', 1),
          TUTORIAL_STEP_COUNT - 1,
          state.puzzleEverSolved,
          { forceNew: true }
        );
      }
      saveTutorialStep(next);
      return freshTutorialState(
        next,
        state.classicDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.puzzleEverSolved
      );
    }

    case 'TUTORIAL_GOTO': {
      const step = clampTutorialStep(action.step);
      saveTutorialStep(step);
      savePuzzleDifficulty('tutorial');
      saveMode('puzzle');
      return freshTutorialState(
        step,
        state.classicDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.puzzleEverSolved
      );
    }

    case 'UNDO_PLACEMENT': {
      if (
        state.mode !== 'puzzle' &&
        state.mode !== 'mirror' &&
        state.mode !== 'breathe' &&
        state.mode !== 'monolith'
      )
        return state;
      const stack = state.puzzleUndoStack;
      if (stack.length === 0) return state;
      // Pop the most recent snapshot; leave the rest of the history
      // intact so the player can keep undoing back to the puzzle's
      // start. Wipe the terminal flags so a just-failed / just-solved
      // puzzle becomes playable again from the restored position.
      const snap = stack[stack.length - 1];
      const remaining = stack.slice(0, -1);
      return {
        ...state,
        board: snap.board,
        tray: snap.tray,
        score: snap.score,
        combo: snap.combo,
        isGameOver: false,
        puzzleResult: null,
        puzzleLevelUp: null,
        lastCascade: null,
        puzzleUndoStack: remaining,
      };
    }

    case 'RESTART': {
      // Puzzle / Mirror / Breathe modes: reset to the CURRENT puzzle's
      // initial position without generating a new one. The same board,
      // tray, and target are restored; only score / combo / result
      // flags are wiped.
      if (
        (state.mode === 'puzzle' ||
          state.mode === 'mirror' ||
          state.mode === 'breathe' ||
          state.mode === 'monolith') &&
        state.puzzleInitialBoard &&
        state.puzzleInitialTray
      ) {
        return {
          ...state,
          board: cloneBoard(state.puzzleInitialBoard),
          tray: cloneTray(state.puzzleInitialTray),
          score: 0,
          combo: 0,
          isGameOver: false,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: [],
        };
      }
      return { ...createInitialState(), bestScore: state.bestScore };
    }

    default:
      return state;
  }
}
