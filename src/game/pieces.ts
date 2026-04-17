import type { BoardGrid, Coord, Difficulty, PieceShape } from './types';
import { BOARD_SIZE, COLORS } from './types';
import { canPlacePiece, placePiece, detectCompletedLines } from './board';

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

function pieceWeight(cellCount: number, difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
    case 'zen':
      if (cellCount <= 3) return 3;
      if (cellCount <= 4) return 1;
      return 0;
    case 'normal':
      return 1;
    case 'hard':
      if (cellCount <= 2) return 0;
      if (cellCount <= 3) return 1;
      return 3;
  }
}

function buildWeightedPool(difficulty: Difficulty): { pieces: PieceShape[]; cumWeights: number[] } {
  const pieces: PieceShape[] = [];
  const cumWeights: number[] = [];
  let total = 0;
  for (const p of PIECE_CATALOG) {
    const w = pieceWeight(p.cells.length, difficulty);
    if (w <= 0) continue;
    total += w;
    pieces.push(p);
    cumWeights.push(total);
  }
  return { pieces, cumWeights };
}

const poolCache = new Map<Difficulty, ReturnType<typeof buildWeightedPool>>();
function getPool(difficulty: Difficulty) {
  let pool = poolCache.get(difficulty);
  if (!pool) {
    pool = buildWeightedPool(difficulty);
    poolCache.set(difficulty, pool);
  }
  return pool;
}

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomPiece(difficulty: Difficulty): PieceShape {
  const { pieces, cumWeights } = getPool(difficulty);
  const total = cumWeights[cumWeights.length - 1];
  const r = Math.random() * total;
  let idx = cumWeights.findIndex((w) => r < w);
  if (idx === -1) idx = pieces.length - 1;
  return { ...pieces[idx], color: randomColor() };
}

function scoreForZen(piece: PieceShape, board: BoardGrid): number {
  let best = -1;

  for (let r = 0; r <= BOARD_SIZE - piece.height; r++) {
    for (let c = 0; c <= BOARD_SIZE - piece.width; c++) {
      const origin = { row: r, col: c };
      if (!canPlacePiece(board, piece, origin)) continue;

      const hyp = placePiece(board, piece, origin);
      const { rows, cols } = detectCompletedLines(hyp);
      const cleared = rows.length + cols.length;

      let score: number;
      if (cleared > 0) {
        score = 1000 * cleared;
      } else {
        score = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
          let filledAfter = 0;
          let contributed = 0;
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (hyp[row][col] !== null) filledAfter++;
            if (board[row][col] === null && hyp[row][col] !== null) contributed++;
          }
          if (contributed > 0) {
            const progress = filledAfter / BOARD_SIZE;
            score += contributed * progress * progress * progress * 50;
          }
        }
        for (let col = 0; col < BOARD_SIZE; col++) {
          let filledAfter = 0;
          let contributed = 0;
          for (let row = 0; row < BOARD_SIZE; row++) {
            if (hyp[row][col] !== null) filledAfter++;
            if (board[row][col] === null && hyp[row][col] !== null) contributed++;
          }
          if (contributed > 0) {
            const progress = filledAfter / BOARD_SIZE;
            score += contributed * progress * progress * progress * 50;
          }
        }
      }

      best = Math.max(best, score);
    }
  }

  if (best < 0) return 0;
  return best + 1;
}

function generateZenPieces(board: BoardGrid): [PieceShape, PieceShape, PieceShape] {
  const scored = PIECE_CATALOG
    .map((p) => ({ piece: p, score: scoreForZen(p, board) }))
    .filter((s) => s.score > 0);

  if (scored.length === 0) {
    return [randomPiece('easy'), randomPiece('easy'), randomPiece('easy')];
  }

  const weighted = scored.map((s) => ({ piece: s.piece, weight: s.score * s.score }));
  const total = weighted.reduce((sum, s) => sum + s.weight, 0);

  function pick(): PieceShape {
    let r = Math.random() * total;
    for (const { piece, weight } of weighted) {
      r -= weight;
      if (r <= 0) return { ...piece, color: randomColor() };
    }
    return { ...weighted[weighted.length - 1].piece, color: randomColor() };
  }

  return [pick(), pick(), pick()];
}

export function generatePieces(difficulty: Difficulty, board?: BoardGrid): [PieceShape, PieceShape, PieceShape] {
  if (difficulty === 'zen' && board) {
    return generateZenPieces(board);
  }
  return [randomPiece(difficulty), randomPiece(difficulty), randomPiece(difficulty)];
}
