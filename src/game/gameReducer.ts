import type { BoardGrid, Coord, Difficulty, TraySlot } from './types';
import {
  createEmptyBoard,
  canPlacePiece,
  placePiece,
  detectCompletedLines,
  clearLines,
  hasValidMoves,
  rotatePiece90Clockwise,
} from './board';
import { generatePieces } from './pieces';
import { calculatePlacementScore, calculateClearScore } from './scoring';

export type GameState = {
  board: BoardGrid;
  tray: [TraySlot, TraySlot, TraySlot];
  score: number;
  bestScore: number;
  combo: number;
  isGameOver: boolean;
  difficulty: Difficulty;
};

export type GameAction =
  | { type: 'PLACE_PIECE'; trayIndex: number; origin: Coord }
  | { type: 'ROTATE_TRAY_PIECE'; trayIndex: number }
  | { type: 'RESTART' }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty };

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
    if (stored === 'easy' || stored === 'normal' || stored === 'hard' || stored === 'zen') return stored;
  } catch { /* noop */ }
  return 'normal';
}

function saveDifficulty(difficulty: Difficulty) {
  try {
    localStorage.setItem('blockit-difficulty', difficulty);
  } catch { /* noop */ }
}

export function createInitialState(): GameState {
  const difficulty = loadDifficulty();
  const board = createEmptyBoard();
  return {
    board,
    tray: generatePieces(difficulty, board),
    score: 0,
    bestScore: loadBestScore(difficulty),
    combo: 0,
    isGameOver: false,
    difficulty,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ROTATE_TRAY_PIECE': {
      const { trayIndex } = action;
      if (trayIndex < 0 || trayIndex > 2) return state;
      const piece = state.tray[trayIndex];
      if (!piece) return state;
      const newTray = [...state.tray] as [TraySlot, TraySlot, TraySlot];
      newTray[trayIndex] = rotatePiece90Clockwise(piece);
      const isGameOver = !hasValidMoves(state.board, newTray);
      return { ...state, tray: newTray, isGameOver };
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

      const newTray = [...state.tray] as [TraySlot, TraySlot, TraySlot];
      newTray[action.trayIndex] = null;

      const allPlaced = newTray.every((s) => s === null);
      const finalTray = allPlaced ? generatePieces(state.difficulty, board) : newTray;

      const bestScore = Math.max(score, state.bestScore);
      const isGameOver = !hasValidMoves(board, finalTray);

      if (bestScore > state.bestScore) saveBestScore(state.difficulty, bestScore);

      return { ...state, board, tray: finalTray, score, bestScore, combo, isGameOver };
    }

    case 'SET_DIFFICULTY': {
      saveDifficulty(action.difficulty);
      const difficulty = action.difficulty;
      const freshBoard = createEmptyBoard();
      return {
        board: freshBoard,
        tray: generatePieces(difficulty, freshBoard),
        score: 0,
        bestScore: loadBestScore(difficulty),
        combo: 0,
        isGameOver: false,
        difficulty,
      };
    }

    case 'RESTART':
      return { ...createInitialState(), bestScore: state.bestScore };

    default:
      return state;
  }
}
