import type { BoardGrid, Coord, Difficulty, TargetPattern, TraySlot } from './types';
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
};

export type GameAction =
  | { type: 'PLACE_PIECE'; trayIndex: number; origin: Coord }
  | { type: 'ROTATE_TRAY_PIECE'; trayIndex: number }
  | { type: 'RESTART' }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_RIDDLE_LEVEL'; level: number };

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
  return 'normal';
}

function saveDifficulty(difficulty: Difficulty) {
  try {
    localStorage.setItem('blockit-difficulty', difficulty);
  } catch { /* noop */ }
}

const RIDDLE_LEVEL_KEY = 'blockit-riddle-level';
const RIDDLE_MAX_LEVEL_KEY = 'blockit-riddle-max-level';

function loadRiddleLevel(): number {
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

/** Build a fresh state for the given riddle level, reusing best score / max level. */
function freshRiddleState(
  level: number,
  bestScore: number,
  riddleMaxLevel: number
): GameState {
  const clamped = clampRiddleLevel(level);
  const { board, tray, target } = generateRiddle({ level: clamped });
  return {
    board,
    tray,
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    difficulty: 'riddle',
    riddleResult: null,
    riddleTarget: target,
    riddleLevel: clamped,
    riddleMaxLevel,
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
      return freshRiddleState(target, state.bestScore, state.riddleMaxLevel);
    }

    case 'RESTART': {
      // In riddle mode, restart the CURRENT level (not a random one) so players
      // can retry the same challenge or replay after solving.
      if (state.difficulty === 'riddle') {
        return freshRiddleState(state.riddleLevel, state.bestScore, state.riddleMaxLevel);
      }
      return { ...createInitialState(), bestScore: state.bestScore };
    }

    default:
      return state;
  }
}
