import type { BoardCell, BoardGrid, Coord, ErasuresDifficulty } from './types';
import { BOARD_SIZE } from './types';
import { WALL_COLOR, MONOLITH_SEED_COLOR } from './board';
import { SCAR_COLOR } from './scar';
import { FUSE_COLOR } from './fuse';

/**
 * Erasures mode helpers.
 *
 * Erasures is a finite-tray puzzle on a heavily pre-filled board where the
 * player owns `K` erase tokens. Each token, when spent, deletes a single
 * 4-connected component of *player-placed* cells from the board — pre-fill
 * blockers, walls, fuse-style sentinels and monolith seeds are immune.
 * The win condition is the standard target match after the tray is
 * exhausted; remaining tokens at win time are fine.
 *
 * Two helpers live here:
 *   - `isPlayerColor(cell)` — true iff the cell is non-null and is NOT
 *     any of the known sentinel colors (pre-fill, wall, scar, fuse,
 *     monolith seed). Erase only ever touches cells for which this
 *     returns true.
 *   - `eraseComponent(board, row, col)` — return a fresh board with the
 *     4-connected component of *player-placed* cells reachable from
 *     `(row, col)` set to `null`. If `(row, col)` itself is not a
 *     player-placed cell, the input board is returned untouched (a
 *     fresh clone, so callers can rely on referential change to detect
 *     "did anything happen").
 *
 * Plus a difficulty knob:
 *   - `erasureTokenCount(difficulty)` — Easy 3, Normal 5, Hard 7. The
 *     numbers are deliberately generous so the player can use tokens as
 *     escape valves when an early scaffold doesn't pan out.
 */

/**
 * Pre-fill sentinel color used by Erasures (and shared with the standard
 * Puzzle generator). Neutral slate that never appears in `COLORS`.
 * Pre-fill cells must NOT be erased by an erase token — they are part of
 * the puzzle's terrain.
 */
export const ERASURES_PREFILL_COLOR = '#5c6b7a';

/**
 * True iff a board cell is **player-placed** (non-null, non-sentinel).
 * The set of sentinels recognised here covers every other mode that uses
 * a colored cell to mean something other than "the player put a piece
 * here":
 *   - `ERASURES_PREFILL_COLOR` (a.k.a. the standard puzzle pre-fill grey)
 *   - `WALL_COLOR` (Quarantine walls / Fuse-expiry walls)
 *   - `SCAR_COLOR` (Scar damage)
 *   - `FUSE_COLOR` (live Fuse cells)
 *   - `MONOLITH_SEED_COLOR` (Monolith seeds)
 *
 * Erasures mode never spawns scar / fuse / monolith / wall cells of its
 * own, but the full sentinel filter is centralised here so future modes
 * (or shared assets) can compose Erasures without leaking erases onto
 * structural terrain.
 */
export function isPlayerColor(cell: BoardCell): boolean {
  if (cell === null) return false;
  if (cell === ERASURES_PREFILL_COLOR) return false;
  if (cell === WALL_COLOR) return false;
  if (cell === SCAR_COLOR) return false;
  if (cell === FUSE_COLOR) return false;
  if (cell === MONOLITH_SEED_COLOR) return false;
  return true;
}

/**
 * Token count `K` per difficulty rung. Easy 3, Normal 5, Hard 7 —
 * generous bands so token-as-undo always remains a valid recovery
 * strategy (see Stage 3 trace's failure-cliff discussion). The
 * generator may mark a subset of these as *mandatory* (the simulation
 * trace requires them) but the player is free to spend extras as
 * escape valves.
 */
export function erasureTokenCount(difficulty: ErasuresDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 3;
    case 'normal':
      return 5;
    case 'hard':
      return 7;
  }
}

/**
 * Erase the 4-connected component of player-placed cells that contains
 * `(row, col)`. Returns a fresh `BoardGrid` (input never mutated). If
 * `(row, col)` is out-of-bounds or the cell there is not a
 * player-placed cell, the function returns a clone of the board
 * unchanged — callers should compare component size separately if they
 * need to know "did this erase actually do something".
 *
 * Implementation: standard iterative flood-fill keyed off `isPlayerColor`,
 * 4-connected neighbours, visited set keyed by `r,c` to keep the fill
 * O(N) in component size and O(1) per neighbour lookup.
 */
export function eraseComponent(
  board: BoardGrid,
  row: number,
  col: number
): { board: BoardGrid; erasedCells: Coord[] } {
  const next: BoardGrid = board.map((r) => [...r]);
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return { board: next, erasedCells: [] };
  }
  if (!isPlayerColor(board[row][col])) {
    return { board: next, erasedCells: [] };
  }

  const erasedCells: Coord[] = [];
  const visited = new Set<string>();
  const stack: Coord[] = [{ row, col }];
  visited.add(`${row},${col}`);

  while (stack.length > 0) {
    const cur = stack.pop()!;
    erasedCells.push(cur);
    next[cur.row][cur.col] = null;
    const neighbours: Coord[] = [
      { row: cur.row - 1, col: cur.col },
      { row: cur.row + 1, col: cur.col },
      { row: cur.row, col: cur.col - 1 },
      { row: cur.row, col: cur.col + 1 },
    ];
    for (const n of neighbours) {
      if (n.row < 0 || n.row >= BOARD_SIZE || n.col < 0 || n.col >= BOARD_SIZE) continue;
      const key = `${n.row},${n.col}`;
      if (visited.has(key)) continue;
      if (!isPlayerColor(board[n.row][n.col])) continue;
      visited.add(key);
      stack.push(n);
    }
  }

  return { board: next, erasedCells };
}

/**
 * True iff there is at least one player-placed cell anywhere on the
 * board — i.e. there exists a cell on which an erase token would have
 * a non-empty effect. Used by the UI to disable the Erase button when
 * no erase target exists (and by the reducer as an early-out).
 */
export function hasErasableComponent(board: BoardGrid): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isPlayerColor(board[r][c])) return true;
    }
  }
  return false;
}
