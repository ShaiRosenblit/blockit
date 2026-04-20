import type {
  BoardGrid,
  ClassicDifficulty,
  Coord,
  GameMode,
  PieceShape,
  RiddleDifficulty,
  RiddleLevel,
  TargetPattern,
  TraySlot,
} from './types';
import { BOARD_SIZE, CLASSIC_DIFFICULTIES, isRiddleLevel } from './types';
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
import { generateClassicTray } from './pieces';
import {
  generateRiddle,
  clampRiddleDifficulty,
  RIDDLE_MAX_DIFFICULTY,
} from './riddleGenerator';
import { calculatePlacementScore, calculateClearScore, RIDDLE_SOLVE_BONUS } from './scoring';
import { decodeRiddle, parseSharePayload } from './sharing';
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
  riddleDifficulty: RiddleDifficulty;
  /** Only set when a riddle round ends. */
  riddleResult: null | 'solved' | 'failed';
  /**
   * Target occupancy the player must reproduce in riddle mode. `null` in
   * non-riddle modes.
   */
  riddleTarget: TargetPattern | null;
  /**
   * Snapshot of the active riddle's starting board/tray so RESTART can return
   * to this exact puzzle without generating a fresh one. `null` outside of
   * riddle mode.
   */
  riddleInitialBoard: BoardGrid | null;
  riddleInitialTray: PieceShape[] | null;
  /**
   * Zero-based index into `TUTORIAL_STEPS`. Only meaningful when
   * `riddleDifficulty === 'tutorial'`; otherwise retains the last tutorial
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
  | { type: 'SET_RIDDLE_DIFFICULTY'; difficulty: RiddleDifficulty }
  /** Discard the active riddle puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_RIDDLE' }
  /**
   * Swap the currently-visible puzzle for a shared riddle (e.g. when the URL
   * hash changes without a full page reload). Does not touch localStorage —
   * the shared puzzle is ephemeral.
   */
  | {
      type: 'LOAD_SHARED_RIDDLE';
      difficulty: RiddleLevel;
      board: BoardGrid;
      tray: PieceShape[];
      target: TargetPattern;
    }
  /** Advance to the next tutorial step; graduate to Riddle 1 after the last step. */
  | { type: 'TUTORIAL_NEXT' }
  /** Jump to a specific tutorial step (for dot-indicator navigation). */
  | { type: 'TUTORIAL_GOTO'; step: number };

const MODE_KEY = 'blockit-mode';
const CLASSIC_DIFFICULTY_KEY = 'blockit-classic-difficulty';
const RIDDLE_DIFFICULTY_KEY = 'blockit-riddle-difficulty';
const TUTORIAL_STEP_KEY = 'blockit-tutorial-step';

const LEGACY_DIFFICULTY_KEY = 'blockit-difficulty';
const LEGACY_RIDDLE_LEVEL_KEY = 'blockit-riddle-level';
const LEGACY_RIDDLE_MAX_LEVEL_KEY = 'blockit-riddle-max-level';
const LEGACY_RIDDLE_PUZZLE_KEY = 'blockit-riddle-puzzle';

function bestScoreKey(mode: GameMode, difficulty: ClassicDifficulty | RiddleLevel): string {
  return `blockit-best-${mode}-${difficulty}`;
}

function riddlePuzzleKey(difficulty: RiddleLevel): string {
  return `blockit-riddle-puzzle-${difficulty}`;
}

function loadBestScore(mode: GameMode, difficulty: ClassicDifficulty | RiddleLevel): number {
  try {
    return Number(localStorage.getItem(bestScoreKey(mode, difficulty))) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(
  mode: GameMode,
  difficulty: ClassicDifficulty | RiddleLevel,
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
 * One-shot migration from the legacy flat-Difficulty persistence scheme to
 * the new mode + difficulty scheme. Idempotent: once the legacy keys are
 * cleared, subsequent calls are no-ops.
 */
function migrateLegacyKeys() {
  try {
    const legacyDifficulty = localStorage.getItem(LEGACY_DIFFICULTY_KEY);
    if (legacyDifficulty) {
      if (legacyDifficulty === 'riddle') {
        if (!localStorage.getItem(MODE_KEY)) localStorage.setItem(MODE_KEY, 'riddle');
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

    const legacyRiddleLevel = localStorage.getItem(LEGACY_RIDDLE_LEVEL_KEY);
    if (legacyRiddleLevel !== null && !localStorage.getItem(RIDDLE_DIFFICULTY_KEY)) {
      // Old 1..10 levels compress into new 1..5 difficulties.
      const n = Number(legacyRiddleLevel);
      if (Number.isFinite(n) && n > 0) {
        const mapped = clampRiddleDifficulty(Math.ceil(n / 2));
        localStorage.setItem(RIDDLE_DIFFICULTY_KEY, String(mapped));
      }
    }
    localStorage.removeItem(LEGACY_RIDDLE_LEVEL_KEY);
    localStorage.removeItem(LEGACY_RIDDLE_MAX_LEVEL_KEY);

    // Legacy stored puzzle was for a single level under one key; it would
    // reference the old 1..10 numbering so simply drop it rather than trying
    // to re-home it to a specific new-difficulty slot.
    localStorage.removeItem(LEGACY_RIDDLE_PUZZLE_KEY);

    // Old flat 'blockit-best-riddle' spanned all riddle levels; its value
    // isn't directly comparable to any single new difficulty so drop it.
    localStorage.removeItem('blockit-best-riddle');
  } catch { /* noop */ }
}

function loadMode(): GameMode {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === 'classic' || stored === 'riddle') return stored;
  } catch { /* noop */ }
  // Dev servers: land in riddle mode first so target-hint bake-offs and all
  // modes stay one click away; production default stays casual.
  return import.meta.env.DEV ? 'riddle' : 'classic';
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

function loadRiddleDifficulty(): RiddleDifficulty {
  if (import.meta.env.DEV) {
    return RIDDLE_MAX_DIFFICULTY;
  }
  try {
    const raw = localStorage.getItem(RIDDLE_DIFFICULTY_KEY);
    if (raw === 'tutorial') return 'tutorial';
    const stored = Number(raw);
    if (Number.isFinite(stored) && stored > 0) return clampRiddleDifficulty(stored);
  } catch { /* noop */ }
  // First-time riddle visitors land on the tutorial so the rules are obvious.
  return 'tutorial';
}

function saveRiddleDifficulty(difficulty: RiddleDifficulty) {
  try {
    if (difficulty === 'tutorial') {
      localStorage.setItem(RIDDLE_DIFFICULTY_KEY, 'tutorial');
    } else {
      localStorage.setItem(RIDDLE_DIFFICULTY_KEY, String(clampRiddleDifficulty(difficulty)));
    }
  } catch { /* noop */ }
}

/**
 * Shape of the active riddle puzzle as persisted to localStorage. Storing the
 * puzzle's starting position (not mid-game state) means refresh restores the
 * same challenge, and Restart returns to this exact beginning.
 */
type StoredRiddle = {
  difficulty: RiddleLevel;
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
};

function isValidStoredRiddle(p: unknown, expected: RiddleLevel): p is StoredRiddle {
  if (!p || typeof p !== 'object') return false;
  const r = p as Partial<StoredRiddle>;
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

function loadRiddlePuzzle(expected: RiddleLevel): StoredRiddle | null {
  try {
    const raw = localStorage.getItem(riddlePuzzleKey(expected));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidStoredRiddle(parsed, expected)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveRiddlePuzzle(p: StoredRiddle) {
  try {
    localStorage.setItem(riddlePuzzleKey(p.difficulty), JSON.stringify(p));
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
 * Build a fresh state for the given riddle difficulty, reusing the passed-in
 * best score and classic-difficulty selection. If `forceNew` is false and a
 * puzzle for this difficulty is already stored in localStorage (from a
 * previous session or a switch), that puzzle is loaded so the player faces
 * the same challenge they were on. Otherwise a new puzzle is generated and
 * persisted.
 */
function freshRiddleState(
  difficulty: RiddleLevel,
  classicDifficulty: ClassicDifficulty,
  bestScore: number,
  tutorialStep: number,
  options: { forceNew?: boolean } = {}
): GameState {
  const clamped = clampRiddleDifficulty(difficulty);

  let stored = options.forceNew ? null : loadRiddlePuzzle(clamped);
  if (!stored) {
    const { board, tray, target } = generateRiddle({ difficulty: clamped });
    stored = { difficulty: clamped, board, tray, target };
    saveRiddlePuzzle(stored);
  }

  return {
    board: cloneBoard(stored.board),
    tray: cloneTray(stored.tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'riddle',
    classicDifficulty,
    riddleDifficulty: clamped,
    riddleResult: null,
    riddleTarget: cloneTarget(stored.target),
    riddleInitialBoard: cloneBoard(stored.board),
    riddleInitialTray: cloneTray(stored.tray),
    tutorialStep,
  };
}

/**
 * Build a state for the given tutorial step. Unlike numeric riddles we do
 * not persist the puzzle — step content is authored in `tutorial.ts` and
 * always reloaded fresh. Best-score tracking is skipped so tutorial plays
 * don't pollute the leaderboard.
 */
function freshTutorialState(
  step: number,
  classicDifficulty: ClassicDifficulty
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
    mode: 'riddle',
    classicDifficulty,
    riddleDifficulty: 'tutorial',
    riddleResult: null,
    riddleTarget: cloneTarget(data.target),
    riddleInitialBoard: cloneBoard(data.board),
    riddleInitialTray: cloneTray(data.tray),
    tutorialStep: safeStep,
  };
}

/**
 * Build a riddle state from an inbound share link's decoded payload. Does
 * NOT touch localStorage — the shared puzzle is ephemeral, so it must not
 * clobber whatever puzzle the player already had at this difficulty. The
 * puzzle is still used for Restart via `riddleInitialBoard/Tray`.
 */
function freshRiddleStateFromShared(
  shared: { difficulty: RiddleLevel; board: BoardGrid; tray: PieceShape[]; target: TargetPattern },
  classicDifficulty: ClassicDifficulty,
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
    mode: 'riddle',
    classicDifficulty,
    riddleDifficulty: shared.difficulty,
    riddleResult: null,
    riddleTarget: cloneTarget(shared.target),
    riddleInitialBoard: cloneBoard(shared.board),
    riddleInitialTray: cloneTray(shared.tray),
    tutorialStep,
  };
}

function freshClassicState(
  difficulty: ClassicDifficulty,
  riddleDifficulty: RiddleDifficulty,
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
    riddleDifficulty,
    riddleResult: null,
    riddleTarget: null,
    riddleInitialBoard: null,
    riddleInitialTray: null,
    tutorialStep,
  };
}

export function createInitialState(): GameState {
  migrateLegacyKeys();
  const classicDifficulty = loadClassicDifficulty();
  const riddleDifficulty = loadRiddleDifficulty();
  const tutorialStep = loadTutorialStep();

  // A share link in the URL hash takes precedence over saved state so the
  // recipient lands directly on the shared riddle. We intentionally do NOT
  // call saveMode / saveRiddleDifficulty / saveRiddlePuzzle here — the
  // shared puzzle is ephemeral and must not overwrite whatever the user
  // had going on at that difficulty.
  const sharedPayload = parseSharePayload();
  if (sharedPayload) {
    const decoded = decodeRiddle(sharedPayload);
    if (decoded) {
      return freshRiddleStateFromShared(
        decoded,
        classicDifficulty,
        loadBestScore('riddle', decoded.difficulty),
        tutorialStep
      );
    }
  }

  const mode = loadMode();
  if (mode === 'riddle') {
    if (riddleDifficulty === 'tutorial') {
      return freshTutorialState(tutorialStep, classicDifficulty);
    }
    return freshRiddleState(
      riddleDifficulty,
      classicDifficulty,
      loadBestScore('riddle', riddleDifficulty),
      tutorialStep
    );
  }

  return freshClassicState(
    classicDifficulty,
    riddleDifficulty,
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
      const isGameOver = !hasValidMoves(state.board, newTray);
      const riddleResult =
        state.mode === 'riddle' && isGameOver ? 'failed' : state.riddleResult;
      return { ...state, tray: newTray, isGameOver, riddleResult };
    }

    case 'PLACE_PIECE': {
      const piece = state.tray[action.trayIndex];
      if (!piece) return state;
      if (!canPlacePiece(state.board, piece, action.origin)) return state;

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

      if (state.mode === 'riddle') {
        const target = state.riddleTarget;
        const riddleDifficulty = state.riddleDifficulty;
        const isTutorial = riddleDifficulty === 'tutorial';
        // Tutorial plays don't count toward best-score tracking: the steps
        // are authored and the "score" number isn't meaningful here.
        const trackableDifficulty: RiddleLevel | null =
          isRiddleLevel(riddleDifficulty) ? riddleDifficulty : null;

        if (allPlaced) {
          const solved = target !== null && boardMatchesTarget(board, target);
          if (solved && !isTutorial) score += RIDDLE_SOLVE_BONUS;

          const bestScore = Math.max(score, state.bestScore);
          if (trackableDifficulty !== null && bestScore > state.bestScore) {
            saveBestScore('riddle', trackableDifficulty, bestScore);
          }

          return {
            ...state,
            board,
            tray: newTray,
            score,
            bestScore,
            combo: solved ? combo : 0,
            isGameOver: true,
            riddleResult: solved ? 'solved' : 'failed',
          };
        }
        const isGameOver = !hasValidMoves(board, newTray);
        const bestScore = Math.max(score, state.bestScore);
        if (trackableDifficulty !== null && bestScore > state.bestScore) {
          saveBestScore('riddle', trackableDifficulty, bestScore);
        }
        return {
          ...state,
          board,
          tray: newTray,
          score,
          bestScore,
          combo,
          isGameOver,
          riddleResult: isGameOver ? 'failed' : null,
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
        riddleResult: null,
      };
    }

    case 'SET_MODE': {
      if (action.mode === state.mode) return state;
      saveMode(action.mode);
      if (action.mode === 'riddle') {
        // Entering riddle mode: resume the stored puzzle at the current
        // difficulty if there is one, otherwise generate and persist a new one.
        if (state.riddleDifficulty === 'tutorial') {
          return freshTutorialState(state.tutorialStep, state.classicDifficulty);
        }
        return freshRiddleState(
          state.riddleDifficulty,
          state.classicDifficulty,
          loadBestScore('riddle', state.riddleDifficulty),
          state.tutorialStep
        );
      }
      return freshClassicState(
        state.classicDifficulty,
        state.riddleDifficulty,
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
        state.riddleDifficulty,
        loadBestScore('classic', action.difficulty),
        state.tutorialStep
      );
    }

    case 'SET_RIDDLE_DIFFICULTY': {
      if (action.difficulty === 'tutorial') {
        saveRiddleDifficulty('tutorial');
        saveMode('riddle');
        return freshTutorialState(state.tutorialStep, state.classicDifficulty);
      }
      const target = clampRiddleDifficulty(action.difficulty);
      saveRiddleDifficulty(target);
      saveMode('riddle');
      // Switching difficulties always starts fresh for the destination: if a
      // stored puzzle exists for it, resume; otherwise generate one.
      return freshRiddleState(
        target,
        state.classicDifficulty,
        loadBestScore('riddle', target),
        state.tutorialStep,
        { forceNew: true }
      );
    }

    case 'NEW_RIDDLE': {
      if (state.mode !== 'riddle') return state;
      // Tutorial steps are authored — "new puzzle" would be meaningless, so
      // this action is a no-op for the tutorial. (The UI also hides the button.)
      if (state.riddleDifficulty === 'tutorial') return state;
      return freshRiddleState(
        state.riddleDifficulty,
        state.classicDifficulty,
        state.bestScore,
        state.tutorialStep,
        { forceNew: true }
      );
    }

    case 'LOAD_SHARED_RIDDLE': {
      // Preserve the per-difficulty best score for the incoming difficulty so
      // the display stays meaningful. Do NOT persist anything about the
      // shared puzzle itself.
      return freshRiddleStateFromShared(
        {
          difficulty: action.difficulty,
          board: action.board,
          tray: action.tray,
          target: action.target,
        },
        state.classicDifficulty,
        loadBestScore('riddle', action.difficulty),
        state.tutorialStep
      );
    }

    case 'TUTORIAL_NEXT': {
      const next = state.tutorialStep + 1;
      if (next >= TUTORIAL_STEP_COUNT) {
        // Graduation: mark the tutorial completed and drop the player into
        // Riddle 1 — the natural next challenge.
        saveTutorialStep(TUTORIAL_STEP_COUNT - 1);
        saveRiddleDifficulty(1);
        saveMode('riddle');
        return freshRiddleState(
          1,
          state.classicDifficulty,
          loadBestScore('riddle', 1),
          TUTORIAL_STEP_COUNT - 1,
          { forceNew: true }
        );
      }
      saveTutorialStep(next);
      return freshTutorialState(next, state.classicDifficulty);
    }

    case 'TUTORIAL_GOTO': {
      const step = clampTutorialStep(action.step);
      saveTutorialStep(step);
      saveRiddleDifficulty('tutorial');
      saveMode('riddle');
      return freshTutorialState(step, state.classicDifficulty);
    }

    case 'RESTART': {
      // Riddle mode: reset to the CURRENT puzzle's initial position without
      // generating a new one. The same board, tray, and target are restored;
      // only score / combo / result flags are wiped.
      if (state.mode === 'riddle' && state.riddleInitialBoard && state.riddleInitialTray) {
        return {
          ...state,
          board: cloneBoard(state.riddleInitialBoard),
          tray: cloneTray(state.riddleInitialTray),
          score: 0,
          combo: 0,
          isGameOver: false,
          riddleResult: null,
        };
      }
      return { ...createInitialState(), bestScore: state.bestScore };
    }

    default:
      return state;
  }
}
