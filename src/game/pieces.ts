import type { BoardGrid, ClassicDifficulty, Coord, PieceShape } from './types';
import { BOARD_SIZE, COLORS } from './types';
import { canPlacePiece, placePiece, detectCompletedLines, clearLines } from './board';

type PieceDef = { id: string; cells: Coord[] };
type FamilyDef = { family: string; variants: PieceDef[] };

function dims(cells: Coord[]): { width: number; height: number } {
  let maxR = 0, maxC = 0;
  for (const c of cells) {
    if (c.row > maxR) maxR = c.row;
    if (c.col > maxC) maxC = c.col;
  }
  return { width: maxC + 1, height: maxR + 1 };
}

// Pieces are grouped into families. Each family represents a distinct shape;
// variants within a family are its rotations and reflections. Random sampling
// picks a family with weight based on cell count, then picks a variant uniformly
// within that family — so each "kind of piece" has equal probability regardless
// of how many rotational orientations it has.
const PIECE_FAMILIES: FamilyDef[] = [
  // Monomino (1 cell)
  { family: 'monomino', variants: [
    { id: 'dot', cells: [{ row: 0, col: 0 }] },
  ]},

  // Domino (2 cells)
  { family: 'domino', variants: [
    { id: 'h2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
    { id: 'v2', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }] },
  ]},

  // I-tromino (3 cells, straight)
  { family: 'i-tromino', variants: [
    { id: 'h3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
    { id: 'v3', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }] },
  ]},

  // L-tromino (3 cells, bent corner)
  { family: 'l-tromino', variants: [
    { id: 'l1', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
    { id: 'l2', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
    { id: 'l3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }] },
    { id: 'l4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }] },
  ]},

  // I-tetromino (4 cells, straight)
  { family: 'i-tetromino', variants: [
    { id: 'h4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }] },
    { id: 'v4', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 3, col: 0 }] },
  ]},

  // O-tetromino (2x2 square)
  { family: 'o-tetromino', variants: [
    { id: 'sq2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  ]},

  // T-tetromino (4 cells)
  { family: 't-tetromino', variants: [
    { id: 't1', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }] },
    { id: 't2', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }] },
    { id: 't3', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
    { id: 't4', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }] },
  ]},

  // S-tetromino (4 cells, zig-zag)
  { family: 's-tetromino', variants: [
    { id: 's1', cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
    { id: 's3', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }] },
  ]},

  // Z-tetromino (4 cells, zig-zag, mirror of S)
  { family: 'z-tetromino', variants: [
    { id: 's2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
    { id: 's4', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }] },
  ]},

  // J-tetromino (4 cells)
  { family: 'j-tetromino', variants: [
    { id: 'j1', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
    { id: 'j2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 2, col: 0 }] },
    { id: 'j3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }] },
    { id: 'j4', cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
  ]},

  // L-tetromino (4 cells, mirror of J)
  { family: 'l-tetromino', variants: [
    { id: 'lt1', cells: [{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
    { id: 'lt2', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
    { id: 'lt3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }] },
    { id: 'lt4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }] },
  ]},

  // I-pentomino (5 cells, straight)
  { family: 'i-pentomino', variants: [
    { id: 'h5', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }] },
    { id: 'v5', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 3, col: 0 }, { row: 4, col: 0 }] },
  ]},

  // V-pentomino (5 cells, 3x3 equal legs — previously mislabeled as L1-L4)
  { family: 'v-pentomino', variants: [
    { id: 'V1', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }] },
    { id: 'V2', cells: [{ row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }] },
    { id: 'V3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 }] },
    { id: 'V4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 2, col: 0 }] },
  ]},

  // L-pentomino (5 cells, true 4x2 — 4 rotations x 2 reflections = 8 orientations)
  { family: 'l-pentomino', variants: [
    // 4x2
    { id: 'Lp1', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 3, col: 0 }, { row: 3, col: 1 }] },
    // 2x4
    { id: 'Lp2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 0 }] },
    // 4x2
    { id: 'Lp3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }] },
    // 2x4
    { id: 'Lp4', cells: [{ row: 0, col: 3 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }] },
    // mirror 4x2
    { id: 'Lp5', cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 0 }, { row: 3, col: 1 }] },
    // mirror 2x4
    { id: 'Lp6', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }] },
    // mirror 4x2
    { id: 'Lp7', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 3, col: 0 }] },
    // mirror 2x4
    { id: 'Lp8', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 3 }] },
  ]},

  // T-pentomino (5 cells)
  { family: 't-pentomino', variants: [
    { id: 'T1', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 1 }] },
    { id: 'T2', cells: [{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }] },
    { id: 'T3', cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }] },
    { id: 'T4', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 0 }] },
  ]},

  // U-pentomino (5 cells)
  { family: 'u-pentomino', variants: [
    { id: 'u1', cells: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
    { id: 'u2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 2 }] },
    { id: 'u3', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
    { id: 'u4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
  ]},

  // W-pentomino (5 cells, stairs)
  { family: 'w-pentomino', variants: [
    { id: 'w1', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 2 }] },
    { id: 'w2', cells: [{ row: 0, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
    { id: 'w3', cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }] },
    { id: 'w4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }] },
  ]},

  // P-pentomino (5 cells, thumb — 4 rotations x 2 reflections = 8 orientations)
  { family: 'p-pentomino', variants: [
    // X X / X X / X .
    { id: 'p1', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }] },
    // X X / X X / . X
    { id: 'p2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }] },
    // X . / X X / X X
    { id: 'p3', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
    // . X / X X / X X
    { id: 'p4', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
    // X X X / . X X
    { id: 'p5', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
    // X X . / X X X
    { id: 'p6', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
    // . X X / X X X
    { id: 'p7', cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
    // X X X / X X .
    { id: 'p8', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  ]},

  // X-pentomino (5 cells, plus/cross — fully symmetric, single orientation)
  { family: 'x-pentomino', variants: [
    { id: 'plus', cells: [
      { row: 0, col: 1 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
      { row: 2, col: 1 },
    ]},
  ]},

  // N-pentomino (5 cells, 4x2 — 4 rotations x 2 reflections = 8 orientations)
  { family: 'n-pentomino', variants: [
    // . X / . X / X X / X .
    { id: 'N1', cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 3, col: 0 }] },
    // X X . . / . X X X
    { id: 'N2', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }] },
    // . X / X X / X . / X .
    { id: 'N3', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 3, col: 0 }] },
    // X X X . / . . X X
    { id: 'N4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 1, col: 3 }] },
    // mirror: X . / X . / X X / . X
    { id: 'N5', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 3, col: 1 }] },
    // mirror: . X X X / X X . .
    { id: 'N6', cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
    // mirror: X . / X X / . X / . X
    { id: 'N7', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }] },
    // mirror: . . X X / X X X .
    { id: 'N8', cells: [{ row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
  ]},

  // Y-pentomino (5 cells, 4x2 — 4 rotations x 2 reflections = 8 orientations)
  { family: 'y-pentomino', variants: [
    // . X / X X / . X / . X
    { id: 'Y1', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }] },
    // . . X . / X X X X
    { id: 'Y2', cells: [{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }] },
    // X . / X . / X X / X .
    { id: 'Y3', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 3, col: 0 }] },
    // X X X X / . X . .
    { id: 'Y4', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 1 }] },
    // mirror: X . / X X / X . / X .
    { id: 'Y5', cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 3, col: 0 }] },
    // mirror: X X X X / . . X .
    { id: 'Y6', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 2 }] },
    // mirror: . X / . X / X X / . X
    { id: 'Y7', cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 3, col: 1 }] },
    // mirror: . X . . / X X X X
    { id: 'Y8', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }] },
  ]},

  // 2x3 rectangle (6 cells)
  { family: 'rect-2x3', variants: [
    { id: 'r2x3', cells: [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
    ]},
    { id: 'r3x2', cells: [
      { row: 0, col: 0 }, { row: 0, col: 1 },
      { row: 1, col: 0 }, { row: 1, col: 1 },
      { row: 2, col: 0 }, { row: 2, col: 1 },
    ]},
  ]},

  // 3x3 square (9 cells)
  { family: 'sq3', variants: [
    { id: 'sq3', cells: [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
    ]},
  ]},
];

const PIECE_DEFS: PieceDef[] = PIECE_FAMILIES.flatMap((f) => f.variants);

export const PIECE_CATALOG: PieceShape[] = PIECE_DEFS.map((def) => {
  const { width, height } = dims(def.cells);
  return { ...def, width, height, color: '' };
});

function pieceWeight(cellCount: number, difficulty: ClassicDifficulty): number {
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

type FamilyPool = { families: PieceShape[][]; cumWeights: number[] };

function buildFamilyPool(difficulty: ClassicDifficulty): FamilyPool {
  const families: PieceShape[][] = [];
  const cumWeights: number[] = [];
  let total = 0;
  let catalogIdx = 0;
  for (const fam of PIECE_FAMILIES) {
    const variantCount = fam.variants.length;
    const variants = PIECE_CATALOG.slice(catalogIdx, catalogIdx + variantCount);
    catalogIdx += variantCount;

    const cellCount = fam.variants[0].cells.length;
    const w = pieceWeight(cellCount, difficulty);
    if (w <= 0) continue;

    total += w;
    families.push(variants);
    cumWeights.push(total);
  }
  return { families, cumWeights };
}

const poolCache = new Map<ClassicDifficulty, FamilyPool>();
function getPool(difficulty: ClassicDifficulty) {
  let pool = poolCache.get(difficulty);
  if (!pool) {
    pool = buildFamilyPool(difficulty);
    poolCache.set(difficulty, pool);
  }
  return pool;
}

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomPiece(difficulty: ClassicDifficulty): PieceShape {
  const { families, cumWeights } = getPool(difficulty);
  const total = cumWeights[cumWeights.length - 1];
  const r = Math.random() * total;
  let famIdx = cumWeights.findIndex((w) => r < w);
  if (famIdx === -1) famIdx = families.length - 1;
  const variants = families[famIdx];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  return { ...variant, color: randomColor() };
}

function bestZenPlacement(
  piece: PieceShape,
  board: BoardGrid
): { score: number; origin: Coord | null } {
  let bestScore = -1;
  let bestOrigin: Coord | null = null;

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

      if (score > bestScore) {
        bestScore = score;
        bestOrigin = origin;
      }
    }
  }

  return { score: bestScore < 0 ? 0 : bestScore + 1, origin: bestOrigin };
}

function simulatePlay(board: BoardGrid, piece: PieceShape, origin: Coord): BoardGrid {
  let result = placePiece(board, piece, origin);
  const { rows, cols } = detectCompletedLines(result);
  if (rows.length > 0 || cols.length > 0) {
    result = clearLines(result, rows, cols);
  }
  return result;
}

function pickFromTop(
  candidates: { piece: PieceShape; score: number; origin: Coord | null }[]
): { piece: PieceShape; score: number; origin: Coord | null } {
  const top = candidates.slice(0, 5);
  const weights = top.map((c) => c.score * c.score);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < top.length; i++) {
    r -= weights[i];
    if (r <= 0) return top[i];
  }
  return top[top.length - 1];
}

function generateZenPieces(board: BoardGrid): PieceShape[] {
  const results: PieceShape[] = [];
  let simBoard = board;

  for (let i = 0; i < 3; i++) {
    const candidates = PIECE_CATALOG
      .map((p) => ({ piece: p, ...bestZenPlacement(p, simBoard) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      results.push(randomPiece('easy'));
      continue;
    }

    const pick = pickFromTop(candidates);
    results.push({ ...pick.piece, color: randomColor() });

    if (pick.origin) {
      simBoard = simulatePlay(simBoard, pick.piece, pick.origin);
    }
  }

  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }

  return results;
}

export function generateClassicTray(
  difficulty: ClassicDifficulty,
  board?: BoardGrid
): PieceShape[] {
  if (difficulty === 'zen' && board) {
    return generateZenPieces(board);
  }
  return [randomPiece(difficulty), randomPiece(difficulty), randomPiece(difficulty)];
}
