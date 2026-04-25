import type {
  BoardGrid,
  Coord,
  MonolithDifficulty,
  PieceShape,
  TargetPattern,
} from './types';
import { BOARD_SIZE, COLORS } from './types';
import {
  MONOLITH_SEED_COLOR,
  canPlaceMonolith,
  clearLines,
  createEmptyBoard,
  detectCompletedLines,
  isMonolithBlock,
  isMonolithFill,
  monolithComponentCount,
  placePiece,
  rotatePiece90Clockwise,
} from './board';
import { PIECE_CATALOG } from './pieces';

/**
 * Monolith mode: target pattern T plus a SEED component (sentinel-color
 * pre-fill cells) plus optional BLOCK pre-fill cells (regular pre-fill
 * color, NOT in T). Each placement must extend the monolith (touch
 * existing SEED or placed cells); each placement must NOT fragment the
 * monolith if it triggers a line clear. The generator forward-simulates
 * a solution, so every produced puzzle is by construction winnable.
 *
 * Difficulty ramps:
 *   - easy:   |T| 10–14, |seed| 3, blocks 0,   tray ≈ 4
 *   - normal: |T| 14–18, |seed| 3–4, blocks 1–2, tray ≈ 5
 *   - hard:   |T| 18–22, |seed| 3–4, blocks 2–3, tray ≈ 6
 *
 * Block cells are placed in cells NOT in T, on rows or columns that the
 * forward-sim's placements collectively complete — i.e. the solution
 * itself triggers the clear that evicts each block. After the clear,
 * any monolith cells in the cleared line are also gone; the forward-sim
 * verifies the monolith stays connected via `canPlaceMonolith`.
 */

type Spec = {
  difficulty: MonolithDifficulty;
  minTargetCells: number;
  maxTargetCells: number;
  minSeedCells: number;
  maxSeedCells: number;
  trayMin: number;
  trayMax: number;
  blockMin: number;
  blockMax: number;
  /** Inclusive cell-count range for sampled pieces. */
  minPieceCells: number;
  maxPieceCells: number;
};

const SPECS: Record<MonolithDifficulty, Spec> = {
  easy: {
    difficulty: 'easy',
    minTargetCells: 10,
    maxTargetCells: 14,
    minSeedCells: 3,
    maxSeedCells: 3,
    trayMin: 3,
    trayMax: 5,
    blockMin: 0,
    blockMax: 0,
    minPieceCells: 2,
    maxPieceCells: 4,
  },
  normal: {
    difficulty: 'normal',
    minTargetCells: 14,
    maxTargetCells: 18,
    minSeedCells: 3,
    maxSeedCells: 4,
    trayMin: 4,
    trayMax: 6,
    blockMin: 1,
    blockMax: 2,
    minPieceCells: 3,
    maxPieceCells: 5,
  },
  hard: {
    difficulty: 'hard',
    minTargetCells: 16,
    maxTargetCells: 24,
    minSeedCells: 3,
    maxSeedCells: 4,
    trayMin: 4,
    trayMax: 7,
    blockMin: 2,
    blockMax: 3,
    minPieceCells: 3,
    maxPieceCells: 5,
  },
};

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

function clonePiece(piece: PieceShape): PieceShape {
  return {
    ...piece,
    cells: piece.cells.map((c) => ({ ...c })),
  };
}

function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) => [...row]);
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

function rotatePieceNTimes(piece: PieceShape, turns: number): PieceShape {
  let rotated = clonePiece(piece);
  for (let i = 0; i < turns; i++) {
    rotated = rotatePiece90Clockwise(rotated);
  }
  return rotated;
}

function colorizeTray(pieces: PieceShape[], rng: () => number): PieceShape[] {
  const palette = shuffleInPlace([...COLORS], rng);
  return pieces.map((piece, index) => ({
    ...clonePiece(piece),
    color: palette[index % palette.length],
  }));
}

/**
 * Build a connected SEED region of `size` cells using a random walk on
 * the 8×8 grid. Returns a list of unique cells forming one 4-connected
 * component, or `null` if (very rarely) the walk got stuck against the
 * board edge before hitting `size` cells — caller retries.
 */
function pickSeed(size: number, rng: () => number): Coord[] | null {
  const start: Coord = {
    row: 1 + Math.floor(rng() * (BOARD_SIZE - 2)),
    col: 1 + Math.floor(rng() * (BOARD_SIZE - 2)),
  };
  const cells: Coord[] = [start];
  const seen = new Set<string>([`${start.row},${start.col}`]);
  let attempts = 0;
  while (cells.length < size && attempts < 200) {
    attempts++;
    const head = cells[Math.floor(rng() * cells.length)];
    const dirs: Coord[] = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ];
    shuffleInPlace(dirs, rng);
    let extended = false;
    for (const d of dirs) {
      const r = head.row + d.row;
      const c = head.col + d.col;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
      const key = `${r},${c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cells.push({ row: r, col: c });
      extended = true;
      break;
    }
    if (!extended) continue;
  }
  return cells.length === size ? cells : null;
}

function paintSeed(board: BoardGrid, seed: Coord[]): BoardGrid {
  const next = cloneBoard(board);
  for (const { row, col } of seed) {
    next[row][col] = MONOLITH_SEED_COLOR;
  }
  return next;
}

const BLOCK_COLOR = '#5c6b7a';

/**
 * Place `count` block cells on empty squares of the board. We only
 * accept block positions that are NOT 4-adjacent to the SEED, so the
 * SEED stays a clean single component without the blocks dangling off
 * it (which would let the player route around them).
 */
function placeBlocks(
  board: BoardGrid,
  seedKeys: Set<string>,
  count: number,
  rng: () => number
): BoardGrid {
  if (count <= 0) return board;
  const next = cloneBoard(board);
  // Prefer cells in the same row/column as a seed cell. The block has
  // to be evicted via a line-clear during the solution, and the easiest
  // way to engineer that is to place the block on a row/column that
  // already contains a monolith cell — the player only needs to fill
  // the rest of that line to clear it. Cells with no seed in their row
  // OR column are reachable too but harder; we sample them as a fallback.
  const aligned: Coord[] = [];
  const other: Coord[] = [];
  const seedRows = new Set<number>();
  const seedCols = new Set<number>();
  for (const k of seedKeys) {
    const [sr, sc] = k.split(',').map(Number);
    seedRows.add(sr);
    seedCols.add(sc);
  }
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (next[r][c] !== null) continue;
      if (seedKeys.has(`${r},${c}`)) continue;
      const cell: Coord = { row: r, col: c };
      if (seedRows.has(r) || seedCols.has(c)) aligned.push(cell);
      else other.push(cell);
    }
  }
  shuffleInPlace(aligned, rng);
  shuffleInPlace(other, rng);
  const candidates: Coord[] = [...aligned, ...other];
  if (candidates.length === 0) return next;
  for (let i = 0; i < Math.min(count, candidates.length); i++) {
    const { row, col } = candidates[i];
    next[row][col] = BLOCK_COLOR;
  }
  return next;
}

function poolForSpec(spec: Spec): PieceShape[] {
  return PIECE_CATALOG.filter((p) => {
    const n = p.cells.length;
    return n >= spec.minPieceCells && n <= spec.maxPieceCells;
  });
}

type SimResult = {
  /** Final board after all forward-sim placements + clears. */
  board: BoardGrid;
  /** The pieces that were placed, in placement order. */
  pieces: PieceShape[];
  /** Number of pre-fill block cells that got evicted by clears. */
  blocksCleared: number;
};

/**
 * Forward-simulate placements that grow the monolith from SEED cells
 * into the surrounding area, sometimes triggering line clears that
 * remove block pre-fill (and, occasionally, monolith cells — only when
 * the post-clear monolith is still connected, per `canPlaceMonolith`).
 *
 * Stops when the placement count hits `maxPieces` or no further legal
 * placement extends the monolith. Returns the trace; callers decide
 * whether the result meets the target/quality bar.
 */
function simulateForward(
  startBoard: BoardGrid,
  pool: PieceShape[],
  spec: Spec,
  rng: () => number
): SimResult {
  let board = cloneBoard(startBoard);
  const pieces: PieceShape[] = [];
  const initialBlockCount = countBlocks(board);

  for (let move = 0; move < spec.trayMax; move++) {
    const candidates: { piece: PieceShape; origin: Coord }[] = [];
    // Sample a handful of pieces per move to keep per-attempt cost
    // bounded — exhaustive enumeration of every piece × every origin
    // would be 100k+ checks per attempt and isn't necessary; the
    // outer caller retries with fresh seeds when a sim is too short.
    const sampledPieces = shuffleInPlace([...pool], rng).slice(0, 12);
    for (const template of sampledPieces) {
      for (const piece of orientations(template)) {
        for (let r = 0; r <= BOARD_SIZE - piece.height; r++) {
          for (let c = 0; c <= BOARD_SIZE - piece.width; c++) {
            const origin: Coord = { row: r, col: c };
            if (canPlaceMonolith(board, piece, origin)) {
              candidates.push({ piece, origin });
            }
          }
        }
      }
    }
    if (candidates.length === 0) break;
    // Bias toward placements that complete a row/column (so blocks get
    // cleared during the solution). When 1 in N candidates triggers a
    // clear, picking uniformly from "clearing" candidates first speeds
    // up reaching the block-clear quota.
    const blocksRemaining = countBlocks(board);
    const blockRows = new Set<number>();
    const blockCols = new Set<number>();
    if (blocksRemaining > 0) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (isMonolithBlock(board[r][c])) {
            blockRows.add(r);
            blockCols.add(c);
          }
        }
      }
    }
    const clearing: { piece: PieceShape; origin: Coord }[] = [];
    const blockClearing: { piece: PieceShape; origin: Coord }[] = [];
    for (const cand of candidates) {
      const placed = placePiece(board, cand.piece, cand.origin);
      const { rows, cols } = detectCompletedLines(placed);
      if (rows.length > 0 || cols.length > 0) {
        clearing.push(cand);
        if (
          rows.some((r) => blockRows.has(r)) ||
          cols.some((c) => blockCols.has(c))
        ) {
          blockClearing.push(cand);
        }
      }
    }
    let pickFrom: { piece: PieceShape; origin: Coord }[];
    if (blockClearing.length > 0) {
      pickFrom = blockClearing;
    } else if (clearing.length > 0 && rng() < 0.55) {
      pickFrom = clearing;
    } else {
      pickFrom = candidates;
    }
    const choice = sample(pickFrom, rng);
    pieces.push(choice.piece);
    let next = placePiece(board, choice.piece, choice.origin);
    const { rows, cols } = detectCompletedLines(next);
    if (rows.length > 0 || cols.length > 0) {
      next = clearLines(next, rows, cols);
    }
    board = next;
    if (pieces.length >= spec.trayMin) {
      // Allow early termination once we've produced a tray of at least
      // the minimum length AND we've hit a "rich" target — this is a
      // heuristic to stop generating pieces once the structure feels
      // saturated. We let the outer accept/reject loop validate.
      if (countMonolithFill(board) >= spec.minTargetCells) {
        if (rng() < 0.35) break;
      }
    }
  }

  const blocksLeft = countBlocks(board);
  return {
    board,
    pieces,
    blocksCleared: Math.max(0, initialBlockCount - blocksLeft),
  };
}

function countBlocks(board: BoardGrid): number {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isMonolithBlock(board[r][c])) n++;
    }
  }
  return n;
}

function countMonolithFill(board: BoardGrid): number {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isMonolithFill(board[r][c])) n++;
    }
  }
  return n;
}

function boardToTarget(board: BoardGrid): TargetPattern {
  const out: boolean[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      // Target counts only monolith cells (SEED + PLACED). Any block
      // cells left over indicate a failed sim — caller rejects.
      row.push(isMonolithFill(board[r][c]));
    }
    out.push(row);
  }
  return out;
}

function targetTouchesEnoughAxes(target: TargetPattern): boolean {
  const rows = new Set<number>();
  const cols = new Set<number>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (target[r][c]) {
        rows.add(r);
        cols.add(c);
      }
    }
  }
  return rows.size >= 2 && cols.size >= 2;
}

export type GeneratedMonolith = {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  difficulty: MonolithDifficulty;
};

const RECENT_LIMIT = 4;
const recentByDifficulty = new Map<MonolithDifficulty, string[]>();

function targetSignature(target: TargetPattern, board: BoardGrid): string {
  let s = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      s += target[r][c] ? '1' : '0';
    }
  }
  s += '|';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      s += board[r][c] === MONOLITH_SEED_COLOR ? 's' : '.';
    }
  }
  return s;
}

function rememberSignature(d: MonolithDifficulty, sig: string) {
  const list = recentByDifficulty.get(d) ?? [];
  list.push(sig);
  while (list.length > RECENT_LIMIT) list.shift();
  recentByDifficulty.set(d, list);
}
function isRecent(d: MonolithDifficulty, sig: string): boolean {
  return recentByDifficulty.get(d)?.includes(sig) ?? false;
}

/**
 * Hard-coded fallback. Tiny target with a 3-cell seed, no blocks. Used
 * only if generation repeatedly fails the spec — should be rare.
 */
function buildFallback(): GeneratedMonolith {
  const board = createEmptyBoard();
  const seed: Coord[] = [
    { row: 3, col: 3 },
    { row: 3, col: 4 },
    { row: 4, col: 3 },
  ];
  const seeded = paintSeed(board, seed);
  // Hand-picked solution: extend the seed into a 3×3 block, then a
  // 3×4 rectangle, by placing two simple pieces. Fully deterministic.
  const piece1Template = PIECE_CATALOG.find((p) => p.id === 'l1') ?? PIECE_CATALOG[0];
  const piece2Template = PIECE_CATALOG.find((p) => p.id === 'h2') ?? PIECE_CATALOG[0];
  const rng = mulberry32(0x600d_face);
  const tray = colorizeTray(
    [piece1Template, piece2Template].map((p) =>
      rotatePieceNTimes(p, Math.floor(rng() * 4))
    ),
    rng
  );
  // Build a sensible 6-cell target so the player has something
  // beyond the seed to fill: the 3×2 block touching the seed.
  const target: TargetPattern = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );
  for (const { row, col } of seed) target[row][col] = true;
  target[4][4] = true;
  target[5][3] = true;
  target[5][4] = true;
  return {
    board: seeded,
    tray,
    target,
    difficulty: 'easy',
  };
}

const fallback = buildFallback();

export function generateMonolithPuzzle(options: {
  difficulty?: MonolithDifficulty;
  seed?: number;
} = {}): GeneratedMonolith {
  const difficulty = options.difficulty ?? 'normal';
  const spec = SPECS[difficulty];
  const seed = (options.seed ?? (Date.now() ^ Math.floor(Math.random() * 0x100000000))) >>> 0;
  const rng = mulberry32(seed);
  const pool = poolForSpec(spec);

  for (let attempt = 0; attempt < 240; attempt++) {
    const seedSize =
      spec.minSeedCells +
      Math.floor(rng() * (spec.maxSeedCells - spec.minSeedCells + 1));
    const seedCells = pickSeed(seedSize, rng);
    if (!seedCells) continue;
    const seedKeys = new Set(seedCells.map((c) => `${c.row},${c.col}`));
    const empty = createEmptyBoard();
    const seeded = paintSeed(empty, seedCells);
    const blockCount =
      spec.blockMin +
      Math.floor(rng() * (spec.blockMax - spec.blockMin + 1));
    const start = placeBlocks(seeded, seedKeys, blockCount, rng);

    const sim = simulateForward(start, pool, spec, rng);
    if (sim.pieces.length < spec.trayMin) continue;
    if (sim.pieces.length > spec.trayMax) continue;
    if (countBlocks(sim.board) > 0) continue; // some block survived; reject
    if (blockCount > 0 && sim.blocksCleared < blockCount) continue;
    if (monolithComponentCount(sim.board) !== 1) continue; // safety net

    const target = boardToTarget(sim.board);
    let targetCells = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (target[r][c]) targetCells++;
      }
    }
    if (targetCells < spec.minTargetCells || targetCells > spec.maxTargetCells) continue;
    if (!targetTouchesEnoughAxes(target)) continue;

    const trayTemplates = shuffleInPlace([...sim.pieces], rng);
    const trayRotated = trayTemplates.map((p) =>
      rotatePieceNTimes(p, Math.floor(rng() * 4))
    );
    const tray = colorizeTray(trayRotated, rng);

    const sig = targetSignature(target, start);
    if (isRecent(difficulty, sig)) continue;
    rememberSignature(difficulty, sig);

    return { board: cloneBoard(start), tray, target, difficulty };
  }

  // Hard fallback — same shape regardless of requested difficulty,
  // with the requested difficulty stamped on the result so storage
  // keys stay consistent. Should be hit very rarely.
  return {
    board: cloneBoard(fallback.board),
    tray: fallback.tray.map((p) => clonePiece(p)),
    target: fallback.target.map((row) => [...row]),
    difficulty,
  };
}
