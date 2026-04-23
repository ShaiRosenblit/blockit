import type { BoardGrid, Coord, PieceShape, TargetPattern } from './types';
import { BOARD_SIZE } from './types';

export function createEmptyBoard(): BoardGrid {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

/**
 * Options for `canPlacePiece` / `hasValidMoves`.
 *
 * `enforceColorAdjacency` powers Chroma mode: beyond the usual geometry
 * check, each target cell's four orthogonal neighbors must either be
 * empty, part of this same placement, or have the exact same color as
 * the piece being placed. A single different-color neighbor rejects the
 * placement. Defaults to off so Classic and Puzzle modes stay unchanged.
 */
type PlacementOpts = { enforceColorAdjacency?: boolean };

export function canPlacePiece(
  board: BoardGrid,
  piece: PieceShape,
  origin: Coord,
  opts?: PlacementOpts
): boolean {
  for (const cell of piece.cells) {
    const r = origin.row + cell.row;
    const c = origin.col + cell.col;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (board[r][c] !== null) return false;
  }

  if (opts?.enforceColorAdjacency) {
    // Build an O(k) lookup of cells this placement occupies so neighbor
    // checks can skip "same placement" cells without false-positive clashes
    // when a piece has internal adjacency between its own cells.
    const placing = new Set<string>();
    for (const cell of piece.cells) {
      placing.add(`${origin.row + cell.row},${origin.col + cell.col}`);
    }
    for (const cell of piece.cells) {
      const r = origin.row + cell.row;
      const c = origin.col + cell.col;
      const neighbors: Coord[] = [
        { row: r - 1, col: c },
        { row: r + 1, col: c },
        { row: r, col: c - 1 },
        { row: r, col: c + 1 },
      ];
      for (const n of neighbors) {
        if (n.row < 0 || n.row >= BOARD_SIZE || n.col < 0 || n.col >= BOARD_SIZE) continue;
        if (placing.has(`${n.row},${n.col}`)) continue;
        const neighborColor = board[n.row][n.col];
        if (neighborColor !== null && neighborColor !== piece.color) return false;
      }
    }
  }

  return true;
}

export function placePiece(
  board: BoardGrid,
  piece: PieceShape,
  origin: Coord
): BoardGrid {
  const newBoard = board.map((row) => [...row]);
  for (const cell of piece.cells) {
    newBoard[origin.row + cell.row][origin.col + cell.col] = piece.color;
  }
  return newBoard;
}

export function detectCompletedLines(board: BoardGrid): {
  rows: number[];
  cols: number[];
} {
  const rows: number[] = [];
  const cols: number[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every((cell) => cell !== null)) rows.push(r);
  }

  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }

  return { rows, cols };
}

export function clearLines(
  board: BoardGrid,
  rows: number[],
  cols: number[]
): BoardGrid {
  const newBoard = board.map((row) => [...row]);
  for (const r of rows) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      newBoard[r][c] = null;
    }
  }
  for (const c of cols) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      newBoard[r][c] = null;
    }
  }
  return newBoard;
}

/**
 * True when the board's occupancy exactly matches the target pattern:
 * every target cell is filled and every non-target cell is empty.
 */
export function boardMatchesTarget(board: BoardGrid, target: TargetPattern): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const filled = board[r][c] !== null;
      if (filled !== target[r][c]) return false;
    }
  }
  return true;
}

/** True when every cell is empty. */
export function boardIsEmpty(board: BoardGrid): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) return false;
    }
  }
  return true;
}

/** Place piece, then clear any completed full rows/columns (same rules as gameplay). */
export function applyPlacementAndClear(
  board: BoardGrid,
  piece: PieceShape,
  origin: Coord
): BoardGrid {
  let next = placePiece(board, piece, origin);
  const { rows, cols } = detectCompletedLines(next);
  if (rows.length > 0 || cols.length > 0) {
    next = clearLines(next, rows, cols);
  }
  return next;
}

export function rotatePiece90Clockwise(piece: PieceShape): PieceShape {
  const rotated = piece.cells.map(({ row, col }) => ({
    row: col,
    col: -row,
  }));
  const minR = Math.min(...rotated.map((c) => c.row));
  const minC = Math.min(...rotated.map((c) => c.col));
  const cells = rotated.map(({ row, col }) => ({
    row: row - minR,
    col: col - minC,
  }));
  let maxR = 0;
  let maxC = 0;
  for (const c of cells) {
    maxR = Math.max(maxR, c.row);
    maxC = Math.max(maxC, c.col);
  }
  return {
    ...piece,
    cells,
    width: maxC + 1,
    height: maxR + 1,
  };
}

export function hasValidMoves(
  board: BoardGrid,
  tray: (PieceShape | null)[],
  opts?: PlacementOpts
): boolean {
  for (const piece of tray) {
    if (!piece) continue;
    let variant = piece;
    for (let rot = 0; rot < 4; rot++) {
      for (let r = 0; r <= BOARD_SIZE - variant.height; r++) {
        for (let c = 0; c <= BOARD_SIZE - variant.width; c++) {
          if (canPlacePiece(board, variant, { row: r, col: c }, opts)) return true;
        }
      }
      variant = rotatePiece90Clockwise(variant);
    }
  }
  return false;
}
