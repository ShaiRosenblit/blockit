import type { Coord, PieceShape } from './types';
import { COLORS } from './types';

type PieceDef = { id: string; cells: Coord[] };

function dims(cells: Coord[]): { width: number; height: number } {
  let maxR = 0, maxC = 0;
  for (const c of cells) {
    if (c.row > maxR) maxR = c.row;
    if (c.col > maxC) maxC = c.col;
  }
  return { width: maxC + 1, height: maxR + 1 };
}

const PIECE_DEFS: PieceDef[] = [
  // Single
  { id: 'dot', cells: [{ row: 0, col: 0 }] },

  // Horizontal lines
  { id: 'h2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
  { id: 'h3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
  { id: 'h4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }] },
  { id: 'h5', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }] },

  // Vertical lines
  { id: 'v2', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }] },
  { id: 'v3', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }] },
  { id: 'v4', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 3, col: 0 }] },
  { id: 'v5', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 3, col: 0 }, { row: 4, col: 0 }] },

  // Squares
  { id: 'sq2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  { id: 'sq3', cells: [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
    { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
  ]},

  // L-shapes (small, 3 cells)
  { id: 'l1', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  { id: 'l2', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  { id: 'l3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }] },
  { id: 'l4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }] },

  // L-shapes (medium, 5 cells)
  { id: 'L1', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }] },
  { id: 'L2', cells: [{ row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }] },
  { id: 'L3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 }] },
  { id: 'L4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 2, col: 0 }] },

  // T-shapes
  { id: 't1', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }] },
  { id: 't2', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }] },
  { id: 't3', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
  { id: 't4', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }] },

  // Zig-zag
  { id: 's1', cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  { id: 's2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
  { id: 's3', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }] },
  { id: 's4', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }] },

  // Plus / cross
  { id: 'plus', cells: [
    { row: 0, col: 1 },
    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
    { row: 2, col: 1 },
  ]},

  // Rectangles
  { id: 'r2x3', cells: [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
  ]},
  { id: 'r3x2', cells: [
    { row: 0, col: 0 }, { row: 0, col: 1 },
    { row: 1, col: 0 }, { row: 1, col: 1 },
    { row: 2, col: 0 }, { row: 2, col: 1 },
  ]},

  // U-shapes
  { id: 'u1', cells: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
  { id: 'u2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 2 }] },
  { id: 'u3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
  { id: 'u4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },

  // T-shapes (big, 5 cells)
  { id: 'T1', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 1 }] },
  { id: 'T2', cells: [{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }] },
  { id: 'T3', cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }] },
  { id: 'T4', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 0 }] },

  // Stairs / W-shapes
  { id: 'w1', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 2 }] },
  { id: 'w2', cells: [{ row: 0, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
  { id: 'w3', cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }] },
  { id: 'w4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }] },

  // P-shapes / thumbs
  { id: 'p1', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }] },
  { id: 'p2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }] },
  { id: 'p3', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
  { id: 'p4', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
];

export const PIECE_CATALOG: PieceShape[] = PIECE_DEFS.map((def) => {
  const { width, height } = dims(def.cells);
  return { ...def, width, height, color: '' };
});

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomPiece(): PieceShape {
  const template = PIECE_CATALOG[Math.floor(Math.random() * PIECE_CATALOG.length)];
  return { ...template, color: randomColor() };
}

export function generatePieces(): [PieceShape, PieceShape, PieceShape] {
  return [randomPiece(), randomPiece(), randomPiece()];
}
