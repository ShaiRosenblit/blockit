import type { BoardGrid, CascadeStep, Coord, PieceShape, TargetPattern } from './types';
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

/**
 * Gravity-mode column compaction. Every non-empty cell falls straight down
 * in its column until it hits another cell or the floor. Columns are
 * independent — row ordering of filled cells within a column is preserved
 * (top-to-bottom becomes top-to-bottom after falling, just lower).
 *
 * Returns the settled board alongside `fallDistances[r][c]` — how many rows
 * the cell now at (r, c) moved during the fall. `null` at empty cells.
 * Callers use this to animate cells in from `translateY(-fall * cellSize)`
 * back to 0.
 */
export function applyGravity(board: BoardGrid): {
  board: BoardGrid;
  fallDistances: (number | null)[][];
} {
  const next: BoardGrid = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
  const fallDistances: (number | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  for (let c = 0; c < BOARD_SIZE; c++) {
    // Walk the column bottom-up on both source and destination. Place each
    // filled source cell into the lowest open destination slot, recording
    // how far it dropped. Bottom-up keeps the relative order stable.
    let writeRow = BOARD_SIZE - 1;
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      const cell = board[r][c];
      if (cell === null) continue;
      next[writeRow][c] = cell;
      fallDistances[writeRow][c] = writeRow - r;
      writeRow--;
    }
  }

  return { board: next, fallDistances };
}

/**
 * Gravity-mode resolution loop: clear full rows/columns, let surviving
 * cells fall, re-detect clears, repeat until the board is stable. Each
 * iteration is one `CascadeStep` of animation + scoring data.
 *
 * `step[0]` is the initial clear triggered by the placement (no chain
 * multiplier); `step[k]` for k >= 1 is a cascade (chain multiplier applies).
 * Returns an empty `steps` array when nothing cleared — the reducer uses
 * that to distinguish "no clear at all" (combo resets) from "at least one
 * clear" (combo advances).
 */
export function resolveCascades(initial: BoardGrid): {
  board: BoardGrid;
  steps: CascadeStep[];
  totalLinesCleared: number;
} {
  const steps: CascadeStep[] = [];
  let board = initial;
  let totalLinesCleared = 0;

  // Hard cap to defeat pathological loops (shouldn't occur since each
  // iteration strictly reduces filled-cell count, but cheap insurance).
  for (let iter = 0; iter < BOARD_SIZE * 2; iter++) {
    const { rows, cols } = detectCompletedLines(board);
    if (rows.length === 0 && cols.length === 0) break;

    const clearedCells: string[] = [];
    const clearedSet = new Set<string>();
    for (const r of rows) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const key = `${r},${c}`;
        if (!clearedSet.has(key) && board[r][c] !== null) {
          clearedSet.add(key);
          clearedCells.push(key);
        }
      }
    }
    for (const c of cols) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        const key = `${r},${c}`;
        if (!clearedSet.has(key) && board[r][c] !== null) {
          clearedSet.add(key);
          clearedCells.push(key);
        }
      }
    }

    const cleared = clearLines(board, rows, cols);
    const { board: settled, fallDistances } = applyGravity(cleared);

    steps.push({
      boardBefore: board,
      clearedRows: rows,
      clearedCols: cols,
      clearedCells,
      boardAfter: settled,
      fallDistances,
    });

    totalLinesCleared += rows.length + cols.length;
    board = settled;
  }

  return { board, steps, totalLinesCleared };
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
