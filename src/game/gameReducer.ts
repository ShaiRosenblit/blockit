import type {
  BoardGrid,
  ChromaDifficulty,
  ClassicDifficulty,
  Coord,
  GameMode,
  PieceShape,
  PuzzleDifficulty,
  PuzzleLevel,
  TargetPattern,
  TraySlot,
} from './types';
import { BOARD_SIZE, CLASSIC_DIFFICULTIES, isPuzzleLevel } from './types';
import {
  createEmptyBoard,
  canPlacePiece,
  placePiece,
  detectCompletedLines,
  clearLines,
  hasValidMoves,
  rotatePiece90Clockwise,
  boardMatchesTarget,
} from './board';
import { generateChromaTray, generateClassicTray } from './pieces';
import {
  generatePuzzle,
  clampPuzzleDifficulty,
  PUZZLE_MAX_DIFFICULTY,
} from './puzzleGenerator';
import { calculatePlacementScore, calculateClearScore, PUZZLE_SOLVE_BONUS } from './scoring';
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
};

export type GameAction =
  | { type: 'PLACE_PIECE'; trayIndex: number; origin: Coord }
  | { type: 'ROTATE_TRAY_PIECE'; trayIndex: number }
  | { type: 'RESTART' }
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'SET_CLASSIC_DIFFICULTY'; difficulty: ClassicDifficulty }
  | { type: 'SET_PUZZLE_DIFFICULTY'; difficulty: PuzzleDifficulty }
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
const TUTORIAL_STEP_KEY = 'blockit-tutorial-step';

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
  difficulty: ClassicDifficulty | PuzzleLevel | ChromaDifficulty
): string {
  return `blockit-best-${mode}-${difficulty}`;
}

function puzzleKey(difficulty: PuzzleLevel): string {
  return `blockit-puzzle-${difficulty}`;
}

function loadBestScore(
  mode: GameMode,
  difficulty: ClassicDifficulty | PuzzleLevel | ChromaDifficulty
): number {
  try {
    return Number(localStorage.getItem(bestScoreKey(mode, difficulty))) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(
  mode: GameMode,
  difficulty: ClassicDifficulty | PuzzleLevel | ChromaDifficulty,
  score: number
) {
  try {
    localStorage.setItem(bestScoreKey(mode, difficulty), String(score));
  } catch { /* noop */ }
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
    if (stored === 'classic' || stored === 'puzzle' || stored === 'chroma') return stored;
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
  bestScore: number,
  tutorialStep: number,
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
    puzzleResult: null,
    puzzleTarget: cloneTarget(stored.target),
    puzzleInitialBoard: cloneBoard(stored.board),
    puzzleInitialTray: cloneTray(stored.tray),
    tutorialStep,
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
  chromaDifficulty: ChromaDifficulty
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
    puzzleResult: null,
    puzzleTarget: cloneTarget(data.target),
    puzzleInitialBoard: cloneBoard(data.board),
    puzzleInitialTray: cloneTray(data.tray),
    tutorialStep: safeStep,
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
  bestScore: number,
  tutorialStep: number
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
    puzzleResult: null,
    puzzleTarget: cloneTarget(shared.target),
    puzzleInitialBoard: cloneBoard(shared.board),
    puzzleInitialTray: cloneTray(shared.tray),
    tutorialStep,
  };
}

function freshClassicState(
  difficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  bestScore: number,
  tutorialStep: number
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
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
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
  bestScore: number,
  tutorialStep: number
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
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
  };
}

export function createInitialState(): GameState {
  migrateLegacyKeys();
  const classicDifficulty = loadClassicDifficulty();
  const puzzleDifficulty = loadPuzzleDifficulty();
  const chromaDifficulty = loadChromaDifficulty();
  const tutorialStep = loadTutorialStep();

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
        loadBestScore('puzzle', decoded.difficulty),
        tutorialStep
      );
    }
  }

  const mode = loadMode();
  if (mode === 'puzzle') {
    if (puzzleDifficulty === 'tutorial') {
      return freshTutorialState(tutorialStep, classicDifficulty, chromaDifficulty);
    }
    return freshPuzzleState(
      puzzleDifficulty,
      classicDifficulty,
      chromaDifficulty,
      loadBestScore('puzzle', puzzleDifficulty),
      tutorialStep
    );
  }

  if (mode === 'chroma') {
    return freshChromaState(
      chromaDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      loadBestScore('chroma', chromaDifficulty),
      tutorialStep
    );
  }

  return freshClassicState(
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    loadBestScore('classic', classicDifficulty),
    tutorialStep
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
      return { ...state, tray: newTray, isGameOver, puzzleResult };
    }

    case 'PLACE_PIECE': {
      const piece = state.tray[action.trayIndex];
      if (!piece) return state;
      const enforceColorAdjacency = state.mode === 'chroma';
      if (!canPlacePiece(state.board, piece, action.origin, { enforceColorAdjacency })) return state;

      let board = placePiece(state.board, piece, action.origin);
      let score = state.score + calculatePlacementScore(piece);
      let combo = state.combo;

      const { rows, cols } = detectCompletedLines(board);
      const linesCleared = rows.length + cols.length;

      if (linesCleared > 0) {
        board = clearLines(board, rows, cols);
        score += calculateClearScore(linesCleared, combo);
        combo += 1;
      } else {
        combo = 0;
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

          return {
            ...state,
            board,
            tray: newTray,
            score,
            bestScore,
            combo: solved ? combo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
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
      };
    }

    case 'SET_MODE': {
      if (action.mode === state.mode) return state;
      saveMode(action.mode);
      if (action.mode === 'puzzle') {
        // Entering puzzle mode: resume the stored puzzle at the current
        // difficulty if there is one, otherwise generate and persist a new one.
        if (state.puzzleDifficulty === 'tutorial') {
          return freshTutorialState(state.tutorialStep, state.classicDifficulty, state.chromaDifficulty);
        }
        return freshPuzzleState(
          state.puzzleDifficulty,
          state.classicDifficulty,
          state.chromaDifficulty,
          loadBestScore('puzzle', state.puzzleDifficulty),
          state.tutorialStep
        );
      }
      if (action.mode === 'chroma') {
        return freshChromaState(
          state.chromaDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          loadBestScore('chroma', state.chromaDifficulty),
          state.tutorialStep
        );
      }
      return freshClassicState(
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        loadBestScore('classic', state.classicDifficulty),
        state.tutorialStep
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
        loadBestScore('classic', action.difficulty),
        state.tutorialStep
      );
    }

    case 'SET_PUZZLE_DIFFICULTY': {
      if (action.difficulty === 'tutorial') {
        savePuzzleDifficulty('tutorial');
        saveMode('puzzle');
        return freshTutorialState(state.tutorialStep, state.classicDifficulty, state.chromaDifficulty);
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
        loadBestScore('puzzle', target),
        state.tutorialStep,
        { forceNew: true }
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
        state.bestScore,
        state.tutorialStep,
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
        loadBestScore('puzzle', action.difficulty),
        state.tutorialStep
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
          loadBestScore('puzzle', 1),
          TUTORIAL_STEP_COUNT - 1,
          { forceNew: true }
        );
      }
      saveTutorialStep(next);
      return freshTutorialState(next, state.classicDifficulty, state.chromaDifficulty);
    }

    case 'TUTORIAL_GOTO': {
      const step = clampTutorialStep(action.step);
      saveTutorialStep(step);
      savePuzzleDifficulty('tutorial');
      saveMode('puzzle');
      return freshTutorialState(step, state.classicDifficulty, state.chromaDifficulty);
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
        };
      }
      return { ...createInitialState(), bestScore: state.bestScore };
    }

    default:
      return state;
  }
}
