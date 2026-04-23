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

/**
 * Multiplier applied to each Gravity-mode cascade step on top of the usual
 * combo. Step 1 is the initial (player-caused) clear so it's 1x; step 2+
 * are chain reactions triggered by gravity compaction and are rewarded
 * progressively. Capped at 3x so late-game mega-chains don't balloon the
 * score beyond recognition.
 */
export function chainMultiplier(step: number): number {
  if (step <= 1) return 1;
  if (step === 2) return 1.5;
  if (step === 3) return 2;
  return 3;
}
