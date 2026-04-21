import type { PieceShape } from './types';

/** Bonus when puzzle mode clears the entire board after placing all three pieces. */
export const PUZZLE_SOLVE_BONUS = 2500;

export function calculatePlacementScore(piece: PieceShape): number {
  return piece.cells.length;
}

export function calculateClearScore(
  linesCleared: number,
  combo: number
): number {
  if (linesCleared === 0) return 0;
  const base = (linesCleared * (linesCleared + 1) / 2) * 10;
  return Math.floor(base * (1 + 0.5 * combo));
}
