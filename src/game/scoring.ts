import type { PieceShape } from './types';

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
