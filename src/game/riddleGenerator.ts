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

const RECENT_SIGNATURE_LIMIT = 8;
const recentSignatures: string[] = [];

/** Trominoes through pentominoes; small enough for exhaustive solve checks. */
const RIDDLE_SHAPE_POOL = PIECE_CATALOG.filter((p) => {
  const n = p.cells.length;
  return n >= 3 && n <= 5;
});

type RowBandOption = {
  piece: PieceShape;
  rowCount: 1 | 2;
  rowsTouched: number[];
};

type BuiltRiddle = {
  board: BoardGrid;
  tray: [PieceShape, PieceShape, PieceShape];
  signature: string;
};

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
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

function clonePiece(piece: PieceShape): PieceShape {
  return {
    ...piece,
    cells: piece.cells.map((cell) => ({ ...cell })),
  };
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

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sample<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function isStraightPiece(piece: PieceShape): boolean {
  const sameRow = piece.cells.every((cell) => cell.row === piece.cells[0].row);
  const sameCol = piece.cells.every((cell) => cell.col === piece.cells[0].col);
  return sameRow || sameCol;
}

function rotatePieceNTimes(piece: PieceShape, turns: number): PieceShape {
  let rotated = clonePiece(piece);
  for (let i = 0; i < turns; i++) {
    rotated = rotatePiece90Clockwise(rotated);
  }
  return rotated;
}

function rotateBoard90Clockwise(board: BoardGrid): BoardGrid {
  const next = createEmptyBoard();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      next[c][BOARD_SIZE - 1 - r] = board[r][c];
    }
  }
  return next;
}

function colorizeTray(pieces: PieceShape[], rng: () => number): [PieceShape, PieceShape, PieceShape] {
  const palette = shuffleInPlace([...COLORS], rng);
  return pieces.map((piece, index) => ({
    ...clonePiece(piece),
    color: palette[index % palette.length],
  })) as [PieceShape, PieceShape, PieceShape];
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

const ROW_BAND_OPTIONS: RowBandOption[] = RIDDLE_SHAPE_POOL.flatMap((piece) =>
  orientations(piece)
    .map((variant) => {
      const rowsTouched = uniqueSorted(variant.cells.map((cell) => cell.row));
      if (variant.height > 2) return null;
      if (rowsTouched.length !== variant.height) return null;
      return {
        piece: variant,
        rowCount: rowsTouched.length as 1 | 2,
        rowsTouched,
      };
    })
    .filter((option): option is RowBandOption => option !== null)
);

function assignBandStarts(rowCounts: Array<1 | 2>, rng: () => number): number[] | null {
  for (let attempt = 0; attempt < 80; attempt++) {
    const starts = new Array<number>(rowCounts.length).fill(-1);
    const used = Array.from({ length: BOARD_SIZE }, () => false);
    const order = shuffleInPlace(rowCounts.map((rowCount, index) => ({ rowCount, index })), rng);
    let ok = true;

    for (const { rowCount, index } of order) {
      const candidates: number[] = [];
      for (let start = 0; start <= BOARD_SIZE - rowCount; start++) {
        let fits = true;
        for (let offset = 0; offset < rowCount; offset++) {
          if (used[start + offset]) {
            fits = false;
            break;
          }
        }
        if (fits) candidates.push(start);
      }
      if (candidates.length === 0) {
        ok = false;
        break;
      }
      const start = sample(candidates, rng);
      starts[index] = start;
      for (let offset = 0; offset < rowCount; offset++) {
        used[start + offset] = true;
      }
    }

    if (ok) return starts;
  }

  return null;
}

function buildBoardFromBands(
  options: RowBandOption[],
  bandStarts: number[],
  colStarts: number[]
): { board: BoardGrid; tray: [PieceShape, PieceShape, PieceShape] } {
  const board = createEmptyBoard();
  const tray: PieceShape[] = [];

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const origin: Coord = { row: bandStarts[i], col: colStarts[i] };

    for (const rowOffset of option.rowsTouched) {
      const boardRow = origin.row + rowOffset;
      for (let c = 0; c < BOARD_SIZE; c++) {
        board[boardRow][c] = RIDDLE_GRID_COLOR;
      }
    }

    for (const cell of option.piece.cells) {
      board[origin.row + cell.row][origin.col + cell.col] = null;
    }

    tray.push(clonePiece(option.piece));
  }

  return { board, tray: tray as [PieceShape, PieceShape, PieceShape] };
}

function chooseBandOptions(rng: () => number): RowBandOption[] | null {
  for (let attempt = 0; attempt < 120; attempt++) {
    const pool = shuffleInPlace([...ROW_BAND_OPTIONS], rng);
    const picked = pool.slice(0, 3);
    if (picked.length < 3) return null;

    const totalRows = picked.reduce((sum, option) => sum + option.rowCount, 0);
    if (totalRows < 4 || totalRows > 6) continue;

    const distinctIds = new Set(picked.map((option) => option.piece.id));
    if (distinctIds.size < 2) continue;

    const nonStraightCount = picked.filter((option) => !isStraightPiece(option.piece)).length;
    if (nonStraightCount === 0) continue;

    return picked;
  }

  return null;
}

function rotateRiddle(
  board: BoardGrid,
  tray: [PieceShape, PieceShape, PieceShape],
  turns: number
): { board: BoardGrid; tray: [PieceShape, PieceShape, PieceShape] } {
  let nextBoard = cloneBoard(board);
  let nextTray = tray.map((piece) => clonePiece(piece)) as [PieceShape, PieceShape, PieceShape];

  for (let i = 0; i < turns; i++) {
    nextBoard = rotateBoard90Clockwise(nextBoard);
    nextTray = nextTray.map((piece) => rotatePiece90Clockwise(piece)) as [PieceShape, PieceShape, PieceShape];
  }

  return { board: nextBoard, tray: nextTray };
}

function buildRichRiddle(rng: () => number): BuiltRiddle | null {
  for (let attempt = 0; attempt < 160; attempt++) {
    const options = chooseBandOptions(rng);
    if (!options) continue;

    const bandStarts = assignBandStarts(options.map((option) => option.rowCount), rng);
    if (!bandStarts) continue;

    const colStarts = options.map((option) => Math.floor(rng() * (BOARD_SIZE - option.piece.width + 1)));
    const base = buildBoardFromBands(options, bandStarts, colStarts);

    const turns = Math.floor(rng() * 4);
    let { board, tray } = rotateRiddle(base.board, base.tray, turns);

    // Do not hand the player the exact solved orientation every time.
    tray = tray.map((piece) => rotatePieceNTimes(piece, Math.floor(rng() * 4))) as [PieceShape, PieceShape, PieceShape];
    tray = colorizeTray(shuffleInPlace([...tray], rng), rng);

    if (!canClearBoard(board, [...tray])) continue;

    const pieceKey = [...tray].map((piece) => piece.id).sort().join(',');
    const signature = `${occupancyKey(board)}|${pieceKey}`;
    return { board, tray, signature };
  }

  return null;
}

function recordSignature(signature: string): void {
  recentSignatures.push(signature);
  while (recentSignatures.length > RECENT_SIGNATURE_LIMIT) {
    recentSignatures.shift();
  }
}

function buildFallbackRiddle(): BuiltRiddle {
  const byId = (id: string) => {
    const option = ROW_BAND_OPTIONS.find((candidate) => candidate.piece.id === id);
    if (!option) throw new Error(`Missing fallback piece ${id}`);
    return option;
  };

  const options = [byId('h4'), byId('sq2'), byId('t1')];
  const built = buildBoardFromBands(options, [1, 3, 6], [1, 4, 2]);
  const tray = colorizeTray(built.tray, mulberry32(0x51ced));
  const signature = `${occupancyKey(built.board)}|${tray.map((piece) => piece.id).sort().join(',')}`;
  return { board: built.board, tray, signature };
}

const fallbackRiddle = buildFallbackRiddle();
if (!canClearBoard(fallbackRiddle.board, [...fallbackRiddle.tray])) {
  throw new Error('Fallback riddle is not solvable.');
}

export function generateRiddle(seedHint?: number): {
  board: BoardGrid;
  tray: [PieceShape, PieceShape, PieceShape];
} {
  const seed = (seedHint ?? (Date.now() ^ Math.floor(Math.random() * 0x100000000))) >>> 0;
  const rng = mulberry32(seed);

  for (let attempt = 0; attempt < 24; attempt++) {
    const built = buildRichRiddle(rng);
    if (!built) break;
    if (recentSignatures.includes(built.signature)) continue;
    recordSignature(built.signature);
    return {
      board: cloneBoard(built.board),
      tray: built.tray.map((piece) => clonePiece(piece)) as [PieceShape, PieceShape, PieceShape],
    };
  }

  recordSignature(fallbackRiddle.signature);
  return {
    board: cloneBoard(fallbackRiddle.board),
    tray: fallbackRiddle.tray.map((piece) => clonePiece(piece)) as [PieceShape, PieceShape, PieceShape],
  };
}
