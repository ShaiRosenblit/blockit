import type {
  BoardGrid,
  CascadeStep,
  ChromaDifficulty,
  ClassicDifficulty,
  Coord,
  DropDifficulty,
  GameMode,
  GravityDifficulty,
  PieceShape,
  PuzzleDifficulty,
  PuzzleLevel,
  TargetPattern,
  TraySlot,
} from './types';
import {
  BOARD_SIZE,
  CLASSIC_DIFFICULTIES,
  DROP_DIFFICULTIES,
  GRAVITY_DIFFICULTIES,
  isPuzzleLevel,
} from './types';
import {
  createEmptyBoard,
  canPlacePiece,
  placePiece,
  detectCompletedLines,
  clearLines,
  hasValidMoves,
  hasValidDrops,
  rotatePiece90Clockwise,
  applySlabCollapse,
  boardMatchesTarget,
  resolveCascades,
} from './board';
import { generateChromaTray, generateClassicTray } from './pieces';
import {
  generatePuzzle,
  clampPuzzleDifficulty,
  PUZZLE_MAX_DIFFICULTY,
} from './puzzleGenerator';
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
  | { type: 'TUTORIAL_GOTO'; step: number };

const MODE_KEY = 'blockit-mode';
const CLASSIC_DIFFICULTY_KEY = 'blockit-classic-difficulty';
const PUZZLE_DIFFICULTY_KEY = 'blockit-puzzle-difficulty';
const CHROMA_DIFFICULTY_KEY = 'blockit-chroma-difficulty';
const GRAVITY_DIFFICULTY_KEY = 'blockit-gravity-difficulty';
const DROP_DIFFICULTY_KEY = 'blockit-drop-difficulty';
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
  difficulty: ClassicDifficulty | PuzzleLevel | ChromaDifficulty | GravityDifficulty | DropDifficulty
): string {
  return `blockit-best-${mode}-${difficulty}`;
}

function puzzleKey(difficulty: PuzzleLevel): string {
  return `blockit-puzzle-${difficulty}`;
}

function loadBestScore(
  mode: GameMode,
  difficulty: ClassicDifficulty | PuzzleLevel | ChromaDifficulty | GravityDifficulty | DropDifficulty
): number {
  try {
    return Number(localStorage.getItem(bestScoreKey(mode, difficulty))) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(
  mode: GameMode,
  difficulty: ClassicDifficulty | PuzzleLevel | ChromaDifficulty | GravityDifficulty | DropDifficulty,
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
      stored === 'drop'
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
    puzzleResult: null,
    puzzleTarget: cloneTarget(stored.target),
    puzzleInitialBoard: cloneBoard(stored.board),
    puzzleInitialTray: cloneTray(stored.tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
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
    puzzleResult: null,
    puzzleTarget: cloneTarget(data.target),
    puzzleInitialBoard: cloneBoard(data.board),
    puzzleInitialTray: cloneTray(data.tray),
    tutorialStep: safeStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
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
    puzzleResult: null,
    puzzleTarget: cloneTarget(shared.target),
    puzzleInitialBoard: cloneBoard(shared.board),
    puzzleInitialTray: cloneTray(shared.tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
  };
}

function freshClassicState(
  difficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
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
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
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
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
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
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
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
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
  };
}

export function createInitialState(): GameState {
  migrateLegacyKeys();
  const classicDifficulty = loadClassicDifficulty();
  const puzzleDifficulty = loadPuzzleDifficulty();
  const chromaDifficulty = loadChromaDifficulty();
  const gravityDifficulty = loadGravityDifficulty();
  const dropDifficulty = loadDropDifficulty();
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
        loadBestScore('puzzle', decoded.difficulty),
        tutorialStep,
        puzzleEverSolved
      );
    }
  }

  const mode = loadMode();
  if (mode === 'puzzle') {
    if (puzzleDifficulty === 'tutorial') {
      return freshTutorialState(tutorialStep, classicDifficulty, chromaDifficulty, gravityDifficulty, dropDifficulty, puzzleEverSolved);
    }
    return freshPuzzleState(
      puzzleDifficulty,
      classicDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
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
      loadBestScore('drop', dropDifficulty),
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
      const piece = state.tray[trayIndex];
      if (!piece) return state;
      const newTray = [...state.tray];
      newTray[trayIndex] = rotatePiece90Clockwise(piece);
      const enforceColorAdjacency = state.mode === 'chroma';
      const isGameOver = !hasValidMoves(state.board, newTray, { enforceColorAdjacency });
      const puzzleResult =
        state.mode === 'puzzle' && isGameOver ? 'failed' : state.puzzleResult;
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
      const enforceColorAdjacency = state.mode === 'chroma';
      if (!canPlacePiece(state.board, piece, action.origin, { enforceColorAdjacency })) return state;

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
      };
    }

    case 'SET_MODE': {
      if (action.mode === state.mode) return state;
      saveMode(action.mode);
      if (action.mode === 'puzzle') {
        // Entering puzzle mode: resume the stored puzzle at the current
        // difficulty if there is one, otherwise generate and persist a new one.
        if (state.puzzleDifficulty === 'tutorial') {
          return freshTutorialState(
            state.tutorialStep,
            state.classicDifficulty,
            state.chromaDifficulty,
            state.gravityDifficulty,
            state.dropDifficulty,
            state.puzzleEverSolved
          );
        }
        return freshPuzzleState(
          state.puzzleDifficulty,
          state.classicDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
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
          loadBestScore('drop', state.dropDifficulty),
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
        loadBestScore('classic', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_PUZZLE_DIFFICULTY': {
      if (action.difficulty === 'tutorial') {
        savePuzzleDifficulty('tutorial');
        saveMode('puzzle');
        return freshTutorialState(
          state.tutorialStep,
          state.classicDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
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
        loadBestScore('drop', action.difficulty),
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
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
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
        state.puzzleEverSolved
      );
    }

    case 'RESTART': {
      // Puzzle mode: reset to the CURRENT puzzle's initial position without
      // generating a new one. The same board, tray, and target are restored;
      // only score / combo / result flags are wiped.
      if (state.mode === 'puzzle' && state.puzzleInitialBoard && state.puzzleInitialTray) {
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
        };
      }
      return { ...createInitialState(), bestScore: state.bestScore };
    }

    default:
      return state;
  }
}
