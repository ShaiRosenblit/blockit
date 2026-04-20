import type { BoardGrid, Coord, Difficulty, PieceShape, TargetPattern, TraySlot } from './types';
import { BOARD_SIZE } from './types';
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
import { generatePieces } from './pieces';
import {
  generateRiddle,
  clampRiddleLevel,
  RIDDLE_FIRST_LEVEL,
  RIDDLE_MAX_LEVEL,
} from './riddleGenerator';
import { type RiddleHintPayload } from './riddleHint';
import { calculatePlacementScore, calculateClearScore, RIDDLE_SOLVE_BONUS } from './scoring';

export type GameState = {
  board: BoardGrid;
  tray: TraySlot[];
  score: number;
  bestScore: number;
  combo: number;
  isGameOver: boolean;
  difficulty: Difficulty;
  /** Only set when a riddle round ends. */
  riddleResult: null | 'solved' | 'failed';
  /**
   * Target occupancy the player must reproduce in riddle mode. `null` in
   * non-riddle modes.
   */
  riddleTarget: TargetPattern | null;
  /** Current riddle level being played (1..RIDDLE_MAX_LEVEL). */
  riddleLevel: number;
  /** Highest riddle level the player has unlocked (1..RIDDLE_MAX_LEVEL). */
  riddleMaxLevel: number;
  /**
   * Snapshot of the active riddle's starting board/tray so RESTART can return
   * to this exact puzzle without generating a fresh one. `null` outside of
   * riddle mode.
   */
  riddleInitialBoard: BoardGrid | null;
  riddleInitialTray: PieceShape[] | null;
};

export type GameAction =
  | { type: 'PLACE_PIECE'; trayIndex: number; origin: Coord }
  | { type: 'ROTATE_TRAY_PIECE'; trayIndex: number }
  | { type: 'RESTART' }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_RIDDLE_LEVEL'; level: number }
  /** Discard the active riddle puzzle and generate a fresh one at the current level. */
  | { type: 'NEW_RIDDLE' }
  /** Riddle hard levels: apply a computed good move (rotate tray slot + place). */
  | { type: 'RIDDLE_APPLY_HINT'; hint: RiddleHintPayload };

function bestScoreKey(difficulty: Difficulty): string {
  return `blockit-best-${difficulty}`;
}

function loadBestScore(difficulty: Difficulty): number {
  try {
    return Number(localStorage.getItem(bestScoreKey(difficulty))) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(difficulty: Difficulty, score: number) {
  try {
    localStorage.setItem(bestScoreKey(difficulty), String(score));
  } catch { /* noop */ }
}

function loadDifficulty(): Difficulty {
  try {
    const stored = localStorage.getItem('blockit-difficulty');
    if (
      stored === 'easy' ||
      stored === 'normal' ||
      stored === 'hard' ||
      stored === 'zen' ||
      stored === 'riddle'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  // Dev servers: land in riddle mode first so target-hint bake-offs and all
  // modes stay one click away; production default stays casual.
  return import.meta.env.DEV ? 'riddle' : 'normal';
}

function saveDifficulty(difficulty: Difficulty) {
  try {
    localStorage.setItem('blockit-difficulty', difficulty);
  } catch { /* noop */ }
}

const RIDDLE_LEVEL_KEY = 'blockit-riddle-level';
const RIDDLE_MAX_LEVEL_KEY = 'blockit-riddle-max-level';
const RIDDLE_PUZZLE_KEY = 'blockit-riddle-puzzle';

/**
 * Shape of the active riddle puzzle as persisted to localStorage. Storing the
 * puzzle's starting position (not mid-game state) means refresh restores the
 * same challenge, and Restart returns to this exact beginning.
 */
type StoredRiddle = {
  level: number;
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
};

function isValidStoredRiddle(p: unknown, expectedLevel: number): p is StoredRiddle {
  if (!p || typeof p !== 'object') return false;
  const r = p as Partial<StoredRiddle>;
  if (r.level !== expectedLevel) return false;
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

function loadRiddlePuzzle(expectedLevel: number): StoredRiddle | null {
  try {
    const raw = localStorage.getItem(RIDDLE_PUZZLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidStoredRiddle(parsed, expectedLevel)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveRiddlePuzzle(p: StoredRiddle) {
  try {
    localStorage.setItem(RIDDLE_PUZZLE_KEY, JSON.stringify(p));
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

function loadRiddleLevel(): number {
  if (import.meta.env.DEV) {
    return RIDDLE_MAX_LEVEL;
  }
  try {
    const stored = Number(localStorage.getItem(RIDDLE_LEVEL_KEY));
    if (Number.isFinite(stored) && stored > 0) return clampRiddleLevel(stored);
  } catch { /* noop */ }
  return RIDDLE_FIRST_LEVEL;
}

function saveRiddleLevel(level: number) {
  try {
    localStorage.setItem(RIDDLE_LEVEL_KEY, String(clampRiddleLevel(level)));
  } catch { /* noop */ }
}

function loadRiddleMaxLevel(): number {
  if (import.meta.env.DEV) {
    return RIDDLE_MAX_LEVEL;
  }
  try {
    const stored = Number(localStorage.getItem(RIDDLE_MAX_LEVEL_KEY));
    if (Number.isFinite(stored) && stored > 0) return clampRiddleLevel(stored);
  } catch { /* noop */ }
  return RIDDLE_FIRST_LEVEL;
}

function saveRiddleMaxLevel(level: number) {
  try {
    localStorage.setItem(RIDDLE_MAX_LEVEL_KEY, String(clampRiddleLevel(level)));
  } catch { /* noop */ }
}

/**
 * Build a fresh state for the given riddle level, reusing best score / max
 * level. If `forceNew` is false and a puzzle for this level is already stored
 * in localStorage (from a previous session or a level switch), that puzzle is
 * loaded so the player faces the same challenge they were on. Otherwise a new
 * puzzle is generated and persisted.
 */
function freshRiddleState(
  level: number,
  bestScore: number,
  riddleMaxLevel: number,
  options: { forceNew?: boolean } = {}
): GameState {
  const clamped = clampRiddleLevel(level);

  let stored = options.forceNew ? null : loadRiddlePuzzle(clamped);
  if (!stored) {
    const { board, tray, target } = generateRiddle({ level: clamped });
    stored = { level: clamped, board, tray, target };
    saveRiddlePuzzle(stored);
  }

  return {
    board: cloneBoard(stored.board),
    tray: cloneTray(stored.tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    difficulty: 'riddle',
    riddleResult: null,
    riddleTarget: cloneTarget(stored.target),
    riddleLevel: clamped,
    riddleMaxLevel,
    riddleInitialBoard: cloneBoard(stored.board),
    riddleInitialTray: cloneTray(stored.tray),
  };
}

export function createInitialState(): GameState {
  const difficulty = loadDifficulty();
  const riddleLevel = loadRiddleLevel();
  const riddleMaxLevel = loadRiddleMaxLevel();

  if (difficulty === 'riddle') {
    return freshRiddleState(riddleLevel, loadBestScore(difficulty), riddleMaxLevel);
  }

  const board = createEmptyBoard();
  return {
    board,
    tray: generatePieces(difficulty, board),
    score: 0,
    bestScore: loadBestScore(difficulty),
    combo: 0,
    isGameOver: false,
    difficulty,
    riddleResult: null,
    riddleTarget: null,
    riddleLevel,
    riddleMaxLevel,
    riddleInitialBoard: null,
    riddleInitialTray: null,
  };
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
        state.difficulty === 'riddle' && isGameOver ? 'failed' : state.riddleResult;
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

      if (state.difficulty === 'riddle') {
        const target = state.riddleTarget;
        if (allPlaced) {
          const solved = target !== null && boardMatchesTarget(board, target);
          if (solved) score += RIDDLE_SOLVE_BONUS;

          const bestScore = Math.max(score, state.bestScore);
          if (bestScore > state.bestScore) saveBestScore(state.difficulty, bestScore);

          // Solving unlocks the next level (up to the max).
          let riddleMaxLevel = state.riddleMaxLevel;
          if (solved && state.riddleLevel + 1 > riddleMaxLevel && state.riddleLevel < RIDDLE_MAX_LEVEL) {
            riddleMaxLevel = state.riddleLevel + 1;
            saveRiddleMaxLevel(riddleMaxLevel);
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
            riddleMaxLevel,
          };
        }
        const isGameOver = !hasValidMoves(board, newTray);
        const bestScore = Math.max(score, state.bestScore);
        if (bestScore > state.bestScore) saveBestScore(state.difficulty, bestScore);
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

      const finalTray = allPlaced ? generatePieces(state.difficulty, board) : newTray;

      const bestScore = Math.max(score, state.bestScore);
      const isGameOver = !hasValidMoves(board, finalTray);

      if (bestScore > state.bestScore) saveBestScore(state.difficulty, bestScore);

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

    case 'SET_DIFFICULTY': {
      saveDifficulty(action.difficulty);
      const difficulty = action.difficulty;
      if (difficulty === 'riddle') {
        // Entering riddle mode: resume the stored puzzle at the current level
        // if there is one, otherwise generate and persist a new one.
        return freshRiddleState(
          state.riddleLevel,
          loadBestScore(difficulty),
          state.riddleMaxLevel
        );
      }
      const freshBoard = createEmptyBoard();
      return {
        board: freshBoard,
        tray: generatePieces(difficulty, freshBoard),
        score: 0,
        bestScore: loadBestScore(difficulty),
        combo: 0,
        isGameOver: false,
        difficulty,
        riddleResult: null,
        riddleTarget: null,
        riddleLevel: state.riddleLevel,
        riddleMaxLevel: state.riddleMaxLevel,
        riddleInitialBoard: null,
        riddleInitialTray: null,
      };
    }

    case 'SET_RIDDLE_LEVEL': {
      const target = clampRiddleLevel(action.level);
      if (target > state.riddleMaxLevel) return state; // locked
      saveRiddleLevel(target);
      if (state.difficulty !== 'riddle') {
        // Just remember the selection; picking the riddle difficulty loads it.
        return { ...state, riddleLevel: target };
      }
      // Switching levels always starts fresh for the destination level: if a
      // stored puzzle exists for it, resume; otherwise generate one.
      return freshRiddleState(target, state.bestScore, state.riddleMaxLevel, { forceNew: true });
    }

    case 'NEW_RIDDLE': {
      if (state.difficulty !== 'riddle') return state;
      return freshRiddleState(
        state.riddleLevel,
        state.bestScore,
        state.riddleMaxLevel,
        { forceNew: true }
      );
    }

    case 'RESTART': {
      // Riddle mode: reset to the CURRENT puzzle's initial position without
      // generating a new one. The same board, tray, and target are restored;
      // only score / combo / result flags are wiped.
      if (state.difficulty === 'riddle' && state.riddleInitialBoard && state.riddleInitialTray) {
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

    case 'RIDDLE_APPLY_HINT': {
      if (state.difficulty !== 'riddle' || state.isGameOver || !state.riddleTarget) return state;
      const { trayIndex, origin, rotations } = action.hint;
      if (trayIndex < 0 || trayIndex >= state.tray.length) return state;
      let s: GameState = state;
      for (let i = 0; i < rotations; i++) {
        s = gameReducer(s, { type: 'ROTATE_TRAY_PIECE', trayIndex });
      }
      const piece = s.tray[trayIndex];
      if (!piece || !canPlacePiece(s.board, piece, origin)) return state;
      return gameReducer(s, { type: 'PLACE_PIECE', trayIndex, origin });
    }

    default:
      return state;
  }
}
