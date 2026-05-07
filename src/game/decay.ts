import type {
  BoardGrid,
  Coord,
  DecayDifficulty,
  PieceShape,
} from './types';
import { BOARD_SIZE, COLORS } from './types';

/**
 * Decay mode mechanics.
 *
 * Every filled board cell carries an integer **age** (the number of
 * placements that have happened since it was put down). A line — row or
 * column — only clears when every filled cell in that line has aged at
 * least `T` placements, where `T` is the per-difficulty threshold. Younger
 * filled cells "block" the clear; the player has to keep placing pieces
 * until the youngest cell on the line ripens.
 *
 * Per-placement order (canonical — the reducer must apply these in this
 * exact sequence):
 *   1. Place the piece (cells become `piece.color`).
 *   2. Set the new cells' ages to 0.
 *   3. Increment every OTHER non-null cell's age by 1.
 *   4. Detect clearable lines via `detectClearableLinesDecay` (every filled
 *      cell in the line has age ≥ `T`).
 *   5. Apply clears (the cleared cells become `null` in BOTH `board` and
 *      `boardAges`).
 *   6. Score, combo, refill on empty tray.
 *
 * The ages array is the same shape as `state.board` (8x8) — `null` for
 * empty cells and a non-negative integer for filled cells. Outside Decay
 * mode the reducer parks the field as a fresh empty 8x8 of nulls; nothing
 * else reads it.
 */

/** Per-cell age. `null` mirrors `board === null` (empty cell). */
export type DecayAges = (number | null)[][];

/**
 * Difficulty knobs for Decay. Lower threshold = stricter (a freshly placed
 * cell ripens after fewer subsequent placements); higher pre-fill seeds
 * give the player more "already ripe" terrain to clear from move 1.
 */
type DecayDifficultySpec = {
  /** Age threshold `T` — a line clears once all its filled cells have age ≥ `T`. */
  threshold: number;
  /** Number of pre-fill seed cells planted at age = `threshold` on a fresh board. */
  prefillCount: number;
};

const DIFFICULTY_SPECS: Record<DecayDifficulty, DecayDifficultySpec> = {
  easy: { threshold: 4, prefillCount: 4 },
  normal: { threshold: 3, prefillCount: 6 },
  hard: { threshold: 2, prefillCount: 8 },
};

/**
 * Per-difficulty age threshold `T`. A line clears only once every filled
 * cell along it has age ≥ `T`. Lower `T` = stricter (fewer waits before
 * a placement-aged cell ripens); the difficulty ramp inverts the usual
 * "higher number = harder" intuition because the rule is a wait gate.
 */
export function decayThreshold(difficulty: DecayDifficulty): number {
  return DIFFICULTY_SPECS[difficulty].threshold;
}

/**
 * Per-difficulty count of pre-fill cells planted on a fresh Decay board.
 * Each pre-fill cell starts at age = `decayThreshold(difficulty)` so it's
 * already ripe — i.e. the player can clear lines that include those cells
 * without first having to age every cell from scratch.
 */
export function decayPrefillCount(difficulty: DecayDifficulty): number {
  return DIFFICULTY_SPECS[difficulty].prefillCount;
}

/**
 * Mulberry32 PRNG — same algorithm used in `scar.ts`. Inlined here so the
 * Decay module stays dependency-free of the Scar damage logic; the two
 * modes only happen to share an RNG and we don't want a future Scar
 * tweak to perturb Decay's pre-fill placements.
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a fresh Decay board with `count` pre-fill cells already aged at
 * `ageT`. The seed cells are scattered uniformly at random across the
 * board (no clustering rules — the only constraint is "don't double-place
 * on the same cell"). Each picks a random color from the standard palette
 * so the board doesn't read as a single monochromatic blob.
 *
 * Returns a tuple of cloned, independently-mutable arrays. Caller owns
 * both — the function itself does not retain references.
 */
export function seedAgedPrefill(
  count: number,
  ageT: number,
  rng: () => number
): { board: BoardGrid; ages: DecayAges } {
  const board: BoardGrid = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null as string | null)
  );
  const ages: DecayAges = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null as number | null)
  );

  const totalCells = BOARD_SIZE * BOARD_SIZE;
  const safeCount = Math.max(0, Math.min(count, totalCells));

  // Reservoir of empty coords. Cheaper than rejection-sampling at small
  // densities (count ≤ 8 in v1), and the up-front cost is bounded by
  // the constant 64.
  const empties: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      empties.push({ row: r, col: c });
    }
  }

  for (let i = 0; i < safeCount; i++) {
    const idx = Math.floor(rng() * empties.length);
    const { row, col } = empties[idx];
    // Swap-pop so each coord can only be picked once.
    empties[idx] = empties[empties.length - 1];
    empties.pop();
    const color = COLORS[Math.floor(rng() * COLORS.length)];
    board[row][col] = color;
    ages[row][col] = ageT;
  }

  return { board, ages };
}

/**
 * Step every non-null cell's age forward by one placement. Cells that
 * are `null` (empty) stay `null`. Returns a fresh array — the input is
 * NOT mutated, mirroring the reducer's immutable-state convention.
 *
 * Apply this AFTER setting the just-placed cells' ages to 0 (step 2 in
 * the canonical order above) so the new cells don't immediately tick to
 * 1; conceptually "everything else is one placement older now."
 */
export function advanceAges(ages: DecayAges): DecayAges {
  const next: DecayAges = ages.map((row) => row.slice());
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = next[r][c];
      if (v !== null) next[r][c] = v + 1;
    }
  }
  return next;
}

/**
 * Stamp the just-placed piece's cells with age = 0 in the ages array,
 * leaving every other entry untouched. The reducer calls this BEFORE
 * `advanceAges` so the placed cells' ages stay 0 after the global tick
 * (other cells go from k → k+1; placed cells go from "freshly null" →
 * 0, then the global increment is interpreted as "placement count since
 * placed = 0 immediately after this turn").
 *
 * Returns a fresh array — input is NOT mutated.
 */
export function setNewCellAges(
  ages: DecayAges,
  piece: PieceShape,
  origin: Coord
): DecayAges {
  const next: DecayAges = ages.map((row) => row.slice());
  for (const cell of piece.cells) {
    next[origin.row + cell.row][origin.col + cell.col] = 0;
  }
  return next;
}

/**
 * Decay-mode line detector. A row/column is clearable iff:
 *   1. Every cell in the line is filled (the standard line-completion
 *      predicate), AND
 *   2. Every filled cell has age ≥ `threshold`.
 *
 * Returns the indices of clearable rows and columns. Lines that are
 * complete-but-young (some cell still ripening) are deliberately omitted
 * from the result — the reducer leaves those rows in place, the player
 * keeps placing, and on a future turn the same line will become eligible
 * once the youngest cell ages past `T`.
 */
export function detectClearableLinesDecay(
  board: BoardGrid,
  ages: DecayAges,
  threshold: number
): { rows: number[]; cols: number[] } {
  const rows: number[] = [];
  const cols: number[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    let ok = true;
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      const age = ages[r][c];
      if (cell === null || age === null || age < threshold) {
        ok = false;
        break;
      }
    }
    if (ok) rows.push(r);
  }

  for (let c = 0; c < BOARD_SIZE; c++) {
    let ok = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      const cell = board[r][c];
      const age = ages[r][c];
      if (cell === null || age === null || age < threshold) {
        ok = false;
        break;
      }
    }
    if (ok) cols.push(c);
  }

  return { rows, cols };
}

/**
 * Apply Decay clears to BOTH the board and ages arrays at once, returning
 * the post-clear pair. Cleared cells become `null` in both. We return
 * them together (rather than letting the reducer call `clearLines`
 * separately) so the two arrays can never diverge — every Decay clear
 * mutates them in lockstep.
 */
export function applyDecayClears(
  board: BoardGrid,
  ages: DecayAges,
  rows: number[],
  cols: number[]
): { board: BoardGrid; ages: DecayAges } {
  const nextBoard: BoardGrid = board.map((row) => [...row]);
  const nextAges: DecayAges = ages.map((row) => row.slice());
  for (const r of rows) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      nextBoard[r][c] = null;
      nextAges[r][c] = null;
    }
  }
  for (const c of cols) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      nextBoard[r][c] = null;
      nextAges[r][c] = null;
    }
  }
  return { board: nextBoard, ages: nextAges };
}

/**
 * Empty-board ages array (all `null`). Used in non-Decay modes as a
 * type-clean default — `state.boardAges` is always present so the
 * shape stays uniform; outside Decay nothing reads it.
 */
export function emptyDecayAges(): DecayAges {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null as number | null)
  );
}

/**
 * Fresh seed for a Decay run's pre-fill RNG. XOR with a random 32-bit
 * chunk on top of `Date.now()` so two Decay runs started in the same
 * millisecond still produce different boards. Mirrors `freshScarRngSeed`
 * for the same reasons.
 */
export function freshDecayRngSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
}

/**
 * Internal — exposed for unit tests / generator reuse if ever needed.
 * The seeded PRNG is the same implementation as `scar.ts`'s but inlined
 * so the two modes don't share a symbol.
 */
export const decayRng = mulberry32;
