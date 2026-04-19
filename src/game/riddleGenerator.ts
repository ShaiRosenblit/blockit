import type { BoardGrid, Coord, PieceShape } from './types';
import { BOARD_SIZE, COLORS } from './types';
import {
  createEmptyBoard,
  canPlacePiece,
  rotatePiece90Clockwise,
  boardIsEmpty,
  applyPlacementAndClear,
} from './board';
import { PIECE_CATALOG } from './pieces';

/** Filled cells that belong to the riddle grid (not going in the tray). */
export const RIDDLE_GRID_COLOR = '#5c6b7a';

/** Trominoes through pentominoes — used if we extend generation later. */
const RIDDLE_SHAPE_POOL = PIECE_CATALOG.filter((p) => {
  const n = p.cells.length;
  return n >= 3 && n <= 5;
});

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function orientations(piece: PieceShape): PieceShape[] {
  const seen = new Set<string>();
  const out: PieceShape[] = [];
  let p = piece;
  for (let i = 0; i < 4; i++) {
    const key = p.cells
      .map((c) => `${c.row},${c.col}`)
      .sort()
      .join('|');
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
    p = rotatePiece90Clockwise(p);
  }
  return out;
}

function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) => [...row]);
}

function occupancyKey(board: BoardGrid): string {
  let s = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      s += board[r][c] === null ? '0' : '1';
    }
  }
  return s;
}

function remainingKey(pieces: PieceShape[]): string {
  return [...pieces]
    .map((p) => p.id)
    .sort()
    .join(',');
}

/**
 * Whether some sequence of placing exactly these three pieces clears the board.
 * BFS over (occupancy mask × multiset of remaining shapes). Exported for tests / tooling.
 */
export function canClearBoard(board: BoardGrid, pieces: PieceShape[]): boolean {
  type Node = { b: BoardGrid; rem: PieceShape[] };
  const queue: Node[] = [{ b: board, rem: [...pieces] }];
  const seen = new Set<string>();
  let expansions = 0;
  const maxExpansions = 120_000;

  while (queue.length > 0) {
    if (++expansions > maxExpansions) return false;

    const { b, rem } = queue.shift()!;
    if (boardIsEmpty(b)) return true;
    if (rem.length === 0) continue;

    const stateKey = `${occupancyKey(b)}|${remainingKey(rem)}`;
    if (seen.has(stateKey)) continue;
    seen.add(stateKey);

    for (let i = 0; i < rem.length; i++) {
      const template = rem[i];
      const rest = rem.filter((_, j) => j !== i);

      for (const piece of orientations(template)) {
        for (let r = 0; r <= BOARD_SIZE - piece.height; r++) {
          for (let c = 0; c <= BOARD_SIZE - piece.width; c++) {
            const origin: Coord = { row: r, col: c };
            if (!canPlacePiece(b, piece, origin)) continue;
            const next = applyPlacementAndClear(b, piece, origin);
            queue.push({ b: next, rem: rest });
          }
        }
      }
    }
  }

  return false;
}

function colorizeTray(a: PieceShape, b: PieceShape, c: PieceShape): [PieceShape, PieceShape, PieceShape] {
  return [
    { ...a, color: COLORS[0] },
    { ...b, color: COLORS[1] },
    { ...c, color: COLORS[2] },
  ];
}

function catalogById(id: string): PieceShape {
  const p = RIDDLE_SHAPE_POOL.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown riddle piece id: ${id}`);
  return p;
}

/** Three horizontal Trominoes clear three rows: five blocks on one side, gap of three on the other. */
function createRowTrioRiddle(
  startRow: number,
  gap: 'left' | 'right'
): { board: BoardGrid; tray: [PieceShape, PieceShape, PieceShape] } {
  const board = createEmptyBoard();
  if (startRow < 0 || startRow + 2 >= BOARD_SIZE) {
    throw new Error('createRowTrioRiddle: startRow out of range');
  }

  if (gap === 'right') {
    for (let row = startRow; row < startRow + 3; row++) {
      for (let col = 3; col < BOARD_SIZE; col++) {
        board[row][col] = RIDDLE_GRID_COLOR;
      }
    }
  } else {
    for (let row = startRow; row < startRow + 3; row++) {
      for (let col = 0; col < 5; col++) {
        board[row][col] = RIDDLE_GRID_COLOR;
      }
    }
  }

  const h3 = catalogById('h3');
  const tray = colorizeTray({ ...h3 }, { ...h3 }, { ...h3 });
  return { board, tray };
}

/** Three vertical trominoes clear three columns: five blocks on the bottom, gap of three on top. */
function createColTrioRiddle(
  startCol: number,
  gap: 'top' | 'bottom'
): { board: BoardGrid; tray: [PieceShape, PieceShape, PieceShape] } {
  const board = createEmptyBoard();
  if (startCol < 0 || startCol + 2 >= BOARD_SIZE) {
    throw new Error('createColTrioRiddle: startCol out of range');
  }

  if (gap === 'top') {
    for (let col = startCol; col < startCol + 3; col++) {
      for (let row = 3; row < BOARD_SIZE; row++) {
        board[row][col] = RIDDLE_GRID_COLOR;
      }
    }
  } else {
    for (let col = startCol; col < startCol + 3; col++) {
      for (let row = 0; row < 5; row++) {
        board[row][col] = RIDDLE_GRID_COLOR;
      }
    }
  }

  const v3 = catalogById('v3');
  const tray = colorizeTray({ ...v3 }, { ...v3 }, { ...v3 });
  return { board, tray };
}

type Builder = () => { board: BoardGrid; tray: [PieceShape, PieceShape, PieceShape] };

const RIDDLE_VARIANTS: Builder[] = [
  () => createRowTrioRiddle(0, 'right'),
  () => createRowTrioRiddle(0, 'left'),
  () => createRowTrioRiddle(2, 'right'),
  () => createRowTrioRiddle(3, 'left'),
  () => createRowTrioRiddle(5, 'right'),
  () => createColTrioRiddle(0, 'top'),
  () => createColTrioRiddle(0, 'bottom'),
  () => createColTrioRiddle(2, 'top'),
  () => createColTrioRiddle(3, 'bottom'),
  () => createColTrioRiddle(5, 'top'),
];

function assertSolvable(
  board: BoardGrid,
  tray: [PieceShape, PieceShape, PieceShape]
): void {
  if (!canClearBoard(board, [...tray])) {
    throw new Error('Riddle variant failed solvability check.');
  }
}

for (let i = 0; i < RIDDLE_VARIANTS.length; i++) {
  const { board, tray } = RIDDLE_VARIANTS[i]();
  try {
    assertSolvable(board, tray);
  } catch {
    throw new Error(`Riddle variant index ${i} is not solvable.`);
  }
}

export function generateRiddle(seedHint?: number): {
  board: BoardGrid;
  tray: [PieceShape, PieceShape, PieceShape];
} {
  const rng = mulberry32((seedHint ?? (Date.now() ^ Math.floor(Math.random() * 0x100000000))) >>> 0);
  const idx = Math.floor(rng() * RIDDLE_VARIANTS.length);
  const { board, tray } = RIDDLE_VARIANTS[idx]();
  return {
    board: cloneBoard(board),
    tray: [{ ...tray[0] }, { ...tray[1] }, { ...tray[2] }],
  };
}
