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

/**
 * Breathe mode helper: true iff some 2×2 subgrid of the board has all
 * four cells non-null. Walks each (r, c) with r ≤ BOARD_SIZE-2 and
 * c ≤ BOARD_SIZE-2, checking the four cells (r,c), (r+1,c), (r,c+1),
 * (r+1,c+1). The Breathe win check forbids any such fully-packed 2×2
 * on the WINNING board — intermediate boards may freely contain them.
 */
export function hasSolid2x2(board: BoardGrid): boolean {
  for (let r = 0; r < BOARD_SIZE - 1; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      if (
        board[r][c] !== null &&
        board[r + 1][c] !== null &&
        board[r][c + 1] !== null &&
        board[r + 1][c + 1] !== null
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Inverse of `hasSolid2x2` — every 2×2 has at least one hole. */
export function boardSatisfiesBreathe(board: BoardGrid): boolean {
  return !hasSolid2x2(board);
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

/**
 * Drop-mode landing resolver. Given a proposed `origin` (where the player
 * released the piece, representing its upper-left bounding corner in
 * board coordinates), simulate a rigid-body free-fall: shift the whole
 * piece downward by the maximum `dRow` such that every piece cell still
 * lands on an in-bounds empty cell. Horizontal overflow (any cell off the
 * left/right edge) and top-overflow (origin already above the board) are
 * treated as invalid — the piece must fit entirely within the board once
 * settled.
 *
 * Returns the landed `{ row, col }` or `null` if no valid landing exists
 * (piece too tall for the chosen columns, or horizontally off-board).
 */
export function computeLandingOrigin(
  board: BoardGrid,
  piece: PieceShape,
  origin: Coord
): Coord | null {
  // Horizontal bounds are fixed at release time — columns don't shift on
  // fall. Reject immediately if the piece would hang off the left/right.
  for (const cell of piece.cells) {
    const c = origin.col + cell.col;
    if (c < 0 || c >= BOARD_SIZE) return null;
  }

  // Find the maximum downward shift `dRow >= 0` such that every cell at
  // `(origin.row + cell.row + dRow, origin.col + cell.col)` is in-bounds
  // and empty. We walk dRow upward from 0 and stop at the last legal
  // shift. The first illegal shift defines the floor.
  let bestShift = -1;
  for (let dRow = 0; dRow < BOARD_SIZE; dRow++) {
    let ok = true;
    for (const cell of piece.cells) {
      const r = origin.row + cell.row + dRow;
      const c = origin.col + cell.col;
      if (r < 0 || r >= BOARD_SIZE) { ok = false; break; }
      if (board[r][c] !== null) { ok = false; break; }
    }
    if (!ok) break;
    bestShift = dRow;
  }

  if (bestShift < 0) return null;
  return { row: origin.row + bestShift, col: origin.col };
}

/**
 * Drop-mode slab collapse. Given a board (typically just-placed piece
 * included) and the indices of full rows to remove, return the post-clear
 * board where every surviving cell at original row `r` has shifted down by
 * the number of cleared rows with index strictly greater than `r` (i.e.
 * cleared rows BELOW it). Also returns `fallDistances[newR][c]` in the
 * output's coordinate system so the UI can animate each cell in from
 * `translateY(-fall * cellSize)` back to 0.
 *
 * Unlike `applyGravity` this preserves column structure — whole rows drop
 * as a slab, so inter-cell horizontal relationships are maintained. Also:
 * a single slab-collapse pass cannot create new completed rows (no row's
 * fill count increases), so Drop mode needs only one pass per placement —
 * no cascade loop.
 */
export function applySlabCollapse(
  board: BoardGrid,
  clearedRows: number[]
): {
  board: BoardGrid;
  fallDistances: (number | null)[][];
} {
  const next: BoardGrid = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
  const fallDistances: (number | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  const clearedSet = new Set(clearedRows);

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (clearedSet.has(r)) continue;
    // Count cleared rows strictly below row `r` — that's how far this row
    // falls in the slab collapse.
    let shift = 0;
    for (const cr of clearedRows) {
      if (cr > r) shift++;
    }
    const newR = r + shift;
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      next[newR][c] = cell;
      if (cell !== null) fallDistances[newR][c] = shift;
    }
  }

  return { board: next, fallDistances };
}

/**
 * Drop-mode game-over probe. True iff at least one tray piece has some
 * (rotation, horizontal column-origin) where its simulated rigid-body
 * fall settles entirely within the board. Mirrors `hasValidMoves` but
 * uses `computeLandingOrigin` instead of `canPlacePiece` because valid
 * placements in Drop are restricted to the subset of origins reachable
 * by falling.
 */
export function hasValidDrops(
  board: BoardGrid,
  tray: (PieceShape | null)[]
): boolean {
  for (const piece of tray) {
    if (!piece) continue;
    let variant = piece;
    for (let rot = 0; rot < 4; rot++) {
      for (let c = 0; c <= BOARD_SIZE - variant.width; c++) {
        // Start the drop from the top row — computeLandingOrigin walks
        // downward to the resting position. If the top row is itself
        // occupied by blocking cells the simulator returns null.
        const landed = computeLandingOrigin(board, variant, { row: 0, col: c });
        if (landed !== null) return true;
      }
      variant = rotatePiece90Clockwise(variant);
    }
  }
  return false;
}

/**
 * Mirror mode helpers — the board is reflected across a vertical axis
 * sitting between columns 3 and 4, and every placement also writes its
 * horizontal mirror in one atomic step. Rows are unchanged, columns are
 * flipped via `BOARD_SIZE - 1 - c`.
 *
 * Pieces near the centre column overlap with their own reflection, which
 * we treat as a feature: the union of placement + reflection becomes a
 * symmetric blob (e.g. a 1×3 piece centred over the axis turns into a
 * 1×6 bar). The dedupe inside `getMirroredPlacementCells` makes this
 * "place once, fill twice" behaviour transparent to the rest of the
 * pipeline.
 */
export function mirrorCol(col: number): number {
  return BOARD_SIZE - 1 - col;
}

/**
 * Compute the full set of board cells that placing `piece` at `origin`
 * would write in Mirror mode — both the literal cells and their
 * horizontal reflections, deduplicated. Cells that fall off the board
 * (rows < 0 / >= BOARD_SIZE, or cols < 0 / >= BOARD_SIZE on either the
 * piece itself OR its reflection) cause the result's `inBounds` flag to
 * flip false; collision checks live separately.
 */
export function getMirroredPlacementCells(
  piece: PieceShape,
  origin: Coord
): { cells: Coord[]; inBounds: boolean } {
  const seen = new Set<string>();
  const cells: Coord[] = [];
  let inBounds = true;

  for (const cell of piece.cells) {
    const r = origin.row + cell.row;
    const c = origin.col + cell.col;
    const mc = mirrorCol(c);

    for (const [rr, cc] of [
      [r, c],
      [r, mc],
    ] as const) {
      if (rr < 0 || rr >= BOARD_SIZE || cc < 0 || cc >= BOARD_SIZE) {
        inBounds = false;
        continue;
      }
      const key = `${rr},${cc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cells.push({ row: rr, col: cc });
    }
  }

  return { cells, inBounds };
}

export function canPlacePieceMirrored(
  board: BoardGrid,
  piece: PieceShape,
  origin: Coord
): boolean {
  const { cells, inBounds } = getMirroredPlacementCells(piece, origin);
  if (!inBounds) return false;
  for (const { row, col } of cells) {
    if (board[row][col] !== null) return false;
  }
  return true;
}

export function placePieceMirrored(
  board: BoardGrid,
  piece: PieceShape,
  origin: Coord
): BoardGrid {
  const newBoard = board.map((row) => [...row]);
  const { cells } = getMirroredPlacementCells(piece, origin);
  for (const { row, col } of cells) {
    newBoard[row][col] = piece.color;
  }
  return newBoard;
}

/**
 * Mirror-mode game-over probe. True iff at least one tray piece has
 * some (rotation, origin) where the mirrored placement fits — i.e. both
 * the piece and its reflection land on empty in-bounds cells.
 */
export function hasValidMirrorMoves(
  board: BoardGrid,
  tray: (PieceShape | null)[]
): boolean {
  for (const piece of tray) {
    if (!piece) continue;
    let variant = piece;
    for (let rot = 0; rot < 4; rot++) {
      for (let r = 0; r <= BOARD_SIZE - variant.height; r++) {
        for (let c = 0; c <= BOARD_SIZE - variant.width; c++) {
          if (canPlacePieceMirrored(board, variant, { row: r, col: c })) return true;
        }
      }
      variant = rotatePiece90Clockwise(variant);
    }
  }
  return false;
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
