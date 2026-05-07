import type { BoardCell, BoardGrid, Coord, FuseDifficulty } from './types';
import { BOARD_SIZE } from './types';
import { WALL_COLOR } from './board';

/**
 * Fuse mode mechanics.
 *
 * The starting board carries `K` pre-fill **fuse cells** painted with the
 * `FUSE_COLOR` sentinel. Each fuse is tagged with a positive integer
 * **countdown** stored separately from the board (see `FuseCell` and
 * `state.fuseCells` in the reducer). Every placement decrements every
 * remaining fuse's countdown by 1; any fuse that reaches 0 *explodes* —
 * the fuse cell and each of its 4-neighbour empty cells become permanent
 * indestructible `WALL_COLOR` cells.
 *
 * Per-placement order (canonical — the reducer must apply these in
 * exactly this sequence, mirroring the design spec):
 *   1. Validate placement (`canPlacePiece`).
 *   2. Place the piece onto the board.
 *   3. Detect line clears (standard rules — fuse + wall cells count as
 *      filled).
 *   4. Apply clears via `clearLinesPreservingWalls` (walls survive,
 *      everything else — including fuses — is wiped).
 *   5. Decrement every *surviving* fuse's countdown by 1.
 *   6. For every fuse whose countdown is now ≤ 0, expire it: the fuse
 *      cell and each of its 4-neighbour empty cells become walls. Process
 *      every expiring fuse from a single snapshot of pre-expiry empties
 *      so the result is independent of iteration order.
 *   7. Score / combo / win / lose check (tray empty + target match + no
 *      fuses remaining = solved).
 *
 * The fuse-cell sentinel reuses the existing pre-fill colour space — see
 * `FUSE_COLOR` below — and is recognised by `isFuse`. Walls created by
 * expiry use the existing `WALL_COLOR` (the same indestructible-partition
 * sentinel Quarantine uses), so the standard `clearLinesPreservingWalls`
 * helper already does the right thing without any Fuse-specific clear
 * code.
 */

/**
 * Fuse cell sentinel colour — a deep clay-red that does not appear in
 * `COLORS`, in `CHROMA_COLORS`, in pre-fill `'#5c6b7a'`, in `SCAR_COLOR`
 * (`'#5a3030'`), in `WALL_COLOR` (`'#3a3a4a'`), or in
 * `MONOLITH_SEED_COLOR` (`'#2d7a7a'`). Cell components key off this exact
 * string to apply the fuse styling and overlay the countdown number.
 */
export const FUSE_COLOR = '#a04030';

/**
 * Stored shape of a single fuse: the cell it occupies plus the integer
 * countdown remaining (always ≥ 1 while the fuse is alive). Held in
 * `state.fuseCells` as an array (rather than a Map) so the reducer's
 * standard structural-clone-via-spread persistence path keeps working
 * unchanged. The board itself only carries the `FUSE_COLOR` sentinel —
 * the countdown lives here so the fuse list is the single source of truth.
 */
export type FuseCell = { row: number; col: number; countdown: number };

/**
 * True when a board cell is a live fuse — i.e. painted with the
 * `FUSE_COLOR` sentinel. Used by render + win-check code to filter fuse
 * cells from generic filled cells. Walls (`WALL_COLOR`) and ordinary
 * placed pieces both return false.
 */
export function isFuse(cell: BoardCell): boolean {
  return cell === FUSE_COLOR;
}

/**
 * Difficulty knobs for Fuse. K is the number of fuse cells pre-seeded
 * onto the starting board. More fuses = more countdowns to track and
 * more potential walls if the player misorders their clears.
 */
type FuseDifficultySpec = {
  /** Number of fuse cells pre-seeded on a fresh Fuse board. */
  fuseCount: number;
};

const DIFFICULTY_SPECS: Record<FuseDifficulty, FuseDifficultySpec> = {
  easy: { fuseCount: 2 },
  normal: { fuseCount: 3 },
  hard: { fuseCount: 4 },
};

/**
 * Per-difficulty fuse count `K`. Easy starts with 2 fuses, Normal with 3,
 * Hard with 4. The number is small by design — each fuse is a discrete
 * timing puzzle so K=4 already means juggling four independent
 * countdowns against the line-clear schedule.
 */
export function fuseCount(difficulty: FuseDifficulty): number {
  return DIFFICULTY_SPECS[difficulty].fuseCount;
}

/**
 * Decrement every fuse's countdown by exactly 1, returning a fresh
 * array. Input is NOT mutated. Fuses whose countdown hits 0 here are
 * left in place — `expireFuses` is responsible for the actual expiry
 * pass (it needs to look at the board AND the fuse list together to
 * compute the wall set).
 *
 * The reducer calls this AFTER applying line clears, so any fuse that
 * was destroyed by a row/column clear in the same turn has already been
 * filtered out (callers pre-filter the fuse list against the post-clear
 * board) and therefore never has its countdown decremented spuriously.
 */
export function decrementFuses(fuses: readonly FuseCell[]): FuseCell[] {
  return fuses.map((f) => ({ row: f.row, col: f.col, countdown: f.countdown - 1 }));
}

/**
 * Expire every fuse whose countdown is ≤ 0, returning the post-expiry
 * board, the surviving fuse list, and the set of newly-created walls
 * (handy for animation / sfx callers, not used in win-check).
 *
 * Algorithm — single-pass, snapshot-driven so iteration order does not
 * affect the result:
 *   1. Partition the input fuses into `expiring` (countdown ≤ 0) and
 *      `surviving` (countdown ≥ 1).
 *   2. Snapshot the set of empty cells on the input board. The expiry
 *      walls grow from this snapshot — a fuse whose neighbour cell
 *      becomes a wall earlier in the same pass does NOT prevent another
 *      fuse from also wallifying that same cell (idempotent), and a
 *      cell that was empty at the start of the pass becomes a wall
 *      regardless of whether some sibling fuse landed there too.
 *   3. The fuse cell itself becomes a wall in the output board (even
 *      though it was non-null at the snapshot — the fuse sentinel is
 *      conceptually "filled but expiring", and the spec says expired
 *      fuse cells turn into walls in addition to their empty
 *      neighbours).
 *   4. Each 4-neighbour cell of an expiring fuse that was empty in the
 *      snapshot becomes a wall too. Out-of-bounds neighbours are
 *      skipped silently.
 *
 * Returns a fresh board (input not mutated), the surviving fuse list
 * (new array — every entry has countdown ≥ 1), and the cells that just
 * became walls.
 */
export function expireFuses(
  board: BoardGrid,
  fuses: readonly FuseCell[]
): { board: BoardGrid; fuses: FuseCell[]; newWalls: Coord[] } {
  const expiring: FuseCell[] = [];
  const surviving: FuseCell[] = [];
  for (const f of fuses) {
    if (f.countdown <= 0) expiring.push(f);
    else surviving.push({ row: f.row, col: f.col, countdown: f.countdown });
  }

  if (expiring.length === 0) {
    return { board: board.map((row) => [...row]), fuses: surviving, newWalls: [] };
  }

  // Snapshot the empty-cell set so neighbour wallification is order-
  // independent: we ask "was this cell empty BEFORE the expiry pass
  // started?", not "is it empty right now in the partially-walled
  // output". Encoded as a Set<string> keyed by `r,c` for O(1) lookup.
  const emptyAtSnapshot = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) emptyAtSnapshot.add(`${r},${c}`);
    }
  }

  const next: BoardGrid = board.map((row) => [...row]);
  // Track the new-wall set so we can return it to the caller AND avoid
  // emitting duplicates if two expiring fuses share an empty neighbour.
  const newWallSet = new Set<string>();
  const newWalls: Coord[] = [];
  const addWall = (row: number, col: number) => {
    const key = `${row},${col}`;
    if (newWallSet.has(key)) return;
    newWallSet.add(key);
    newWalls.push({ row, col });
    next[row][col] = WALL_COLOR;
  };

  for (const fuse of expiring) {
    // The fuse cell itself wallifies — even though it isn't in the
    // empty snapshot, the spec calls for the fuse's footprint to
    // become a wall when it expires.
    addWall(fuse.row, fuse.col);
    const neighbours: Coord[] = [
      { row: fuse.row - 1, col: fuse.col },
      { row: fuse.row + 1, col: fuse.col },
      { row: fuse.row, col: fuse.col - 1 },
      { row: fuse.row, col: fuse.col + 1 },
    ];
    for (const n of neighbours) {
      if (n.row < 0 || n.row >= BOARD_SIZE || n.col < 0 || n.col >= BOARD_SIZE) continue;
      // Only originally-empty neighbours wallify. A neighbour that was
      // already filled (placed piece, wall, another fuse) is left alone
      // — we don't promote a placed piece to a wall.
      if (!emptyAtSnapshot.has(`${n.row},${n.col}`)) continue;
      addWall(n.row, n.col);
    }
  }

  return { board: next, fuses: surviving, newWalls };
}

/**
 * Filter a fuse list down to entries whose `(row, col)` cell is still
 * `FUSE_COLOR` on the post-clear board. Used after line-clear
 * application to discard fuses that just got swept away by a clear —
 * those fuses ARE destroyed (only `WALL_COLOR` cells survive
 * `clearLinesPreservingWalls`), so their countdowns must not be
 * decremented in the next step of the per-placement pipeline.
 */
export function dropClearedFuses(
  fuses: readonly FuseCell[],
  board: BoardGrid
): FuseCell[] {
  return fuses
    .filter((f) => board[f.row][f.col] === FUSE_COLOR)
    .map((f) => ({ row: f.row, col: f.col, countdown: f.countdown }));
}

/**
 * True iff the fuse list is empty — i.e. every fuse has been cleared
 * (or expired). Used in the Fuse win check: tray empty AND board
 * matches target AND no fuses remaining.
 */
export function noFusesRemaining(fuses: readonly FuseCell[]): boolean {
  return fuses.length === 0;
}
