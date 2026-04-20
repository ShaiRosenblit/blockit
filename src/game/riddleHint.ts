import type { BoardGrid, Coord, PieceShape, TargetPattern, TraySlot } from './types';
import { BOARD_SIZE } from './types';
import { canPlacePiece, applyPlacementAndClear, rotatePiece90Clockwise } from './board';
import { canReachTarget, orientations } from './riddleGenerator';

function pieceShapeKey(p: PieceShape): string {
  return p.cells
    .map((c) => `${c.row},${c.col}`)
    .sort()
    .join('|');
}

function rotationStepsFromCurrentTo(piece: PieceShape, oriented: PieceShape): number | null {
  const key = pieceShapeKey(oriented);
  let p = piece;
  for (let i = 0; i < 4; i++) {
    if (pieceShapeKey(p) === key) return i;
    p = rotatePiece90Clockwise(p);
  }
  return null;
}

export type RiddleHintPayload = {
  trayIndex: number;
  origin: Coord;
  rotations: number;
};

/**
 * Finds one legal placement that keeps the puzzle solvable toward `target`
 * (same feasibility check as generation). Deterministic: lowest tray index,
 * then orientation / scan order.
 */
export function findNextRiddleHint(
  board: BoardGrid,
  tray: TraySlot[],
  target: TargetPattern | null
): RiddleHintPayload | null {
  if (!target) return null;

  const indices: number[] = [];
  for (let i = 0; i < tray.length; i++) {
    if (tray[i] !== null) indices.push(i);
  }
  if (indices.length === 0) return null;

  for (const trayIndex of indices) {
    const slot = tray[trayIndex]!;
    for (const oriented of orientations(slot)) {
      for (let r = 0; r <= BOARD_SIZE - oriented.height; r++) {
        for (let c = 0; c <= BOARD_SIZE - oriented.width; c++) {
          const origin: Coord = { row: r, col: c };
          if (!canPlacePiece(board, oriented, origin)) continue;
          const nextBoard = applyPlacementAndClear(board, oriented, origin);
          const remaining: PieceShape[] = [];
          for (let j = 0; j < tray.length; j++) {
            if (j !== trayIndex && tray[j]) remaining.push(tray[j]!);
          }
          if (!canReachTarget(nextBoard, remaining, target)) continue;
          const rotations = rotationStepsFromCurrentTo(slot, oriented);
          if (rotations === null) continue;
          return { trayIndex, origin, rotations };
        }
      }
    }
  }
  return null;
}
