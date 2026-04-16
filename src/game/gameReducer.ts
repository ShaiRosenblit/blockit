import type { BoardGrid, Coord, TraySlot } from './types';
import { createEmptyBoard, canPlacePiece, placePiece, detectCompletedLines, clearLines, hasValidMoves } from './board';
import { generatePieces } from './pieces';
import { calculatePlacementScore, calculateClearScore } from './scoring';

export type GameState = {
  board: BoardGrid;
  tray: [TraySlot, TraySlot, TraySlot];
  score: number;
  bestScore: number;
  combo: number;
  isGameOver: boolean;
};

export type GameAction =
  | { type: 'PLACE_PIECE'; trayIndex: number; origin: Coord }
  | { type: 'RESTART' };

function loadBestScore(): number {
  try {
    return Number(localStorage.getItem('blockit-best')) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score: number) {
  try {
    localStorage.setItem('blockit-best', String(score));
  } catch { /* noop */ }
}

export function createInitialState(): GameState {
  return {
    board: createEmptyBoard(),
    tray: generatePieces(),
    score: 0,
    bestScore: loadBestScore(),
    combo: 0,
    isGameOver: false,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
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
      const finalTray = allPlaced ? generatePieces() : newTray;

      const bestScore = Math.max(score, state.bestScore);
      const isGameOver = !hasValidMoves(board, finalTray);

      if (bestScore > state.bestScore) saveBestScore(bestScore);

      return { board, tray: finalTray, score, bestScore, combo, isGameOver };
    }

    case 'RESTART':
      return { ...createInitialState(), bestScore: state.bestScore };

    default:
      return state;
  }
}
