import type { BoardCell, BoardGrid, Coord, ScarDifficulty } from './types';
import { BOARD_SIZE } from './types';

/**
 * Scar mode helpers.
 *
 * Scar mode is score-attack like Classic — endless tray refill, no target —
 * but every successful line-clear leaves the board permanently damaged:
 * a small number of empty cells "scar" and become impassable for the rest
 * of the run. Big clears tempt the player with score AND with destroying
 * the columns/rows they'll need next; the scoring engine and the survival
 * engine pull in opposite directions, which is the entire point.
 *
 * Implementation trick (mirrors how Mirror mode flags blockers): scarred
 * cells are stored on the board as a sentinel COLOR string that no real
 * piece ever uses. Three load-bearing consequences fall out for free:
 *   - `canPlacePiece` already rejects any non-null cell, so scars block
 *     placements with no extra code.
 *   - `detectCompletedLines` treats them as filled for the purpose of
 *     completing rows/columns, so a row containing a scar can still
 *     clear (which is critical — otherwise scars near the edges would
 *     just lock down whole rows forever).
 *   - The line-clear pipeline is the ONLY place that needs special
 *     handling: scar cells must NOT be cleared along with the regular
 *     placed cells. `clearLinesPreservingScars` enforces that — see its
 *     own doc comment for the contract.
 */

/**
 * Sentinel color marking a scarred cell. Desaturated rust — visually
 * distinct from every entry in `COLORS` and from Mirror's `BLOCKER_COLOR`
 * so the player never confuses the two. The `Cell` component matches on
 * this exact string to apply `cell--scar` styling.
 */
export const SCAR_COLOR = '#5a3030';

export function isScar(cell: BoardCell): boolean {
  return cell === SCAR_COLOR;
}

/**
 * Mulberry32 PRNG identical to the one in `mirrorPuzzleGenerator.ts`.
 * Re-exported here so `gameReducer.ts` can derive a deterministic stream
 * from `state.scarRngSeed` without pulling in the puzzle generator.
 */
export function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Number of scars dropped per clear event for each difficulty rung. */
export function scarsPerEvent(difficulty: ScarDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'normal':
      return 2;
    case 'hard':
      return 3;
  }
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Count orthogonal scar neighbours of `(row, col)`. Used by Hard's
 * anti-clustering pass: a candidate cell with 3+ scarred neighbours is
 * already deep inside damaged terrain, so dropping yet another scar there
 * concentrates damage where the player can't really use it. Spreading
 * scars out makes Hard's terrain attrition feel like the field is being
 * eaten away in many directions rather than just one corner rotting.
 */
function countScarNeighbours(board: BoardGrid, row: number, col: number): number {
  let n = 0;
  if (row > 0 && isScar(board[row - 1][col])) n++;
  if (row < BOARD_SIZE - 1 && isScar(board[row + 1][col])) n++;
  if (col > 0 && isScar(board[row][col - 1])) n++;
  if (col < BOARD_SIZE - 1 && isScar(board[row][col + 1])) n++;
  return n;
}

/**
 * Pick up to `k` distinct empty (and not-already-scarred) cells on the
 * board, using the supplied seeded RNG. Returns whatever we could find,
 * which may be fewer than `k` near end-of-game when the board is mostly
 * full — callers should treat the burst as best-effort rather than a hard
 * count. Callers handle the empty case naturally (applyScars on `[]` is a
 * no-op).
 *
 * `opts.avoidClusters` (Hard difficulty): prefer candidates with fewer
 * than 3 scarred orthogonal neighbours. If no candidate passes the
 * preference filter we fall back to ANY remaining empty cell so the burst
 * still happens — never silently skips, since a missed scar would visibly
 * break the difficulty contract ("3 scars per clear on Hard").
 */
export function pickScarCells(
  board: BoardGrid,
  k: number,
  rng: () => number,
  opts?: { avoidClusters?: boolean }
): Coord[] {
  if (k <= 0) return [];

  const empties: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) empties.push({ row: r, col: c });
    }
  }
  if (empties.length === 0) return [];

  shuffleInPlace(empties, rng);

  const picked: Coord[] = [];

  if (opts?.avoidClusters) {
    // First pass: only cells with <3 already-scarred orthogonal neighbours.
    // Recompute neighbour counts as we pick so a single burst never piles
    // its own scars on top of one another.
    const working = board.map((row) => [...row]);
    for (const cand of empties) {
      if (picked.length >= k) break;
      if (countScarNeighbours(working, cand.row, cand.col) < 3) {
        picked.push(cand);
        working[cand.row][cand.col] = SCAR_COLOR;
      }
    }
    if (picked.length >= k) return picked;
    // Fallback: fill remaining slots from any unpicked empty cell so the
    // burst still hits its difficulty count even on a board where every
    // empty cell is already cluster-deep.
    const pickedKeys = new Set(picked.map((c) => `${c.row},${c.col}`));
    for (const cand of empties) {
      if (picked.length >= k) break;
      const key = `${cand.row},${cand.col}`;
      if (pickedKeys.has(key)) continue;
      picked.push(cand);
      pickedKeys.add(key);
    }
    return picked;
  }

  for (const cand of empties) {
    if (picked.length >= k) break;
    picked.push(cand);
  }
  return picked;
}

/**
 * Return a new board with each of `cells` set to `SCAR_COLOR`. Out-of-range
 * coordinates are silently ignored (defensive — `pickScarCells` only ever
 * returns in-range cells, but the safety lets external callers compose).
 * Cells that already hold any value (including SCAR_COLOR) are overwritten
 * to SCAR_COLOR; callers responsible for choosing only empty targets.
 */
export function applyScars(board: BoardGrid, cells: Coord[]): BoardGrid {
  if (cells.length === 0) return board;
  const next = board.map((row) => [...row]);
  for (const { row, col } of cells) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) continue;
    next[row][col] = SCAR_COLOR;
  }
  return next;
}

/**
 * Scar-aware variant of `clearLines`: for every cell in any cleared row
 * or column, replace the cell with `null` UNLESS it is a scar — in which
 * case leave it alone. This is the only piece of the line-clear pipeline
 * that has to understand scars; everywhere else (placement validity,
 * line-completion detection, game-over probe) the sentinel-color trick
 * makes scars Just Work.
 *
 * IMPORTANT: this is the only "option 1" in the spec. We deliberately do
 * NOT modify the existing `clearLines` (which would be option 2) because
 * other modes — Classic, Puzzle, Chroma, Gravity, Drop, Mirror — depend
 * on its behaviour of unconditionally zeroing every cleared cell. Scar
 * mode is the sole caller of THIS function, so any divergence stays
 * isolated to the Scar reducer branch.
 */
export function clearLinesPreservingScars(
  board: BoardGrid,
  rows: number[],
  cols: number[]
): BoardGrid {
  const next = board.map((row) => [...row]);
  for (const r of rows) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!isScar(next[r][c])) next[r][c] = null;
    }
  }
  for (const c of cols) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (!isScar(next[r][c])) next[r][c] = null;
    }
  }
  return next;
}
