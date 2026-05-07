import type {
  BoardGrid,
  Coord,
  FuseDifficulty,
  PieceShape,
  TargetPattern,
} from './types';
import { BOARD_SIZE, COLORS } from './types';
import {
  canPlacePiece,
  clearLines,
  createEmptyBoard,
  detectCompletedLines,
  placePiece,
  rotatePiece90Clockwise,
} from './board';
import { PIECE_CATALOG } from './pieces';
import { FUSE_COLOR, fuseCount, type FuseCell } from './fuse';

/**
 * Fuse mode puzzle generation.
 *
 * Strategy: forward-simulate from an empty board with a randomly chosen
 * tray (mirroring the Breathe / Heading approach). The simulation IS a
 * canonical solution, so any reachable target is solvable; the
 * forward-sim's per-turn line-clear log gives us the exact moves at
 * which each row/column got cleared.
 *
 * After the trace finishes we drop K fuse cells onto cells that the
 * simulation passed through and which were part of a row/column clear,
 * with each fuse's countdown set to (move-index-of-its-clear) + slack
 * (slack = 1 or 2 chosen at random per fuse). That guarantees the
 * canonical move order clears each fuse's line BEFORE its countdown
 * hits 0; the slack of 1–2 makes the puzzle moderately
 * order-tolerant.
 *
 * If we can't find K eligible cells the candidate is rejected and the
 * generator retries with a fresh sample. A small fallback is included
 * for the worst-case where 200 retries fail to meet the spec — it
 * hand-builds a trivial Fuse instance that the player can solve.
 */

export type FuseDifficultySpec = {
  difficulty: FuseDifficulty;
  pieceCount: number;
  minPieceCells: number;
  maxPieceCells: number;
  minTargetCells: number;
  maxTargetCells: number;
  /** K — number of fuse cells to seed onto the starting board. */
  fuseCount: number;
};

const DIFFICULTY_SPECS: Record<FuseDifficulty, FuseDifficultySpec> = {
  easy: {
    difficulty: 'easy',
    pieceCount: 4,
    minPieceCells: 3,
    maxPieceCells: 4,
    minTargetCells: 4,
    maxTargetCells: 12,
    fuseCount: fuseCount('easy'),
  },
  normal: {
    difficulty: 'normal',
    pieceCount: 5,
    minPieceCells: 3,
    maxPieceCells: 4,
    minTargetCells: 8,
    maxTargetCells: 18,
    fuseCount: fuseCount('normal'),
  },
  hard: {
    difficulty: 'hard',
    pieceCount: 6,
    minPieceCells: 3,
    maxPieceCells: 5,
    minTargetCells: 12,
    maxTargetCells: 28,
    fuseCount: fuseCount('hard'),
  },
};

/**
 * Look up the difficulty specification for a Fuse rung. Exposed so the
 * reducer / UI can read piece-count and target-cell bands without
 * re-deriving them; mirrors `getBreatheDifficultySpec` and friends.
 */
export function getFuseDifficultySpec(d: FuseDifficulty): FuseDifficultySpec {
  return DIFFICULTY_SPECS[d];
}

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

function boardToTarget(board: BoardGrid): TargetPattern {
  const out: boolean[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(board[r][c] !== null);
    }
    out.push(row);
  }
  return out;
}

function countTargetCells(target: TargetPattern): number {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (target[r][c]) n++;
    }
  }
  return n;
}

function isTargetShapeOk(target: TargetPattern): boolean {
  const rowsTouched = new Set<number>();
  const colsTouched = new Set<number>();
  let cells = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (target[r][c]) {
        rowsTouched.add(r);
        colsTouched.add(c);
        cells++;
      }
    }
  }
  if (cells === 0) return false;
  return rowsTouched.size >= 2 && colsTouched.size >= 2;
}

function poolForSpec(spec: FuseDifficultySpec): PieceShape[] {
  return PIECE_CATALOG.filter((p) => {
    const n = p.cells.length;
    return n >= spec.minPieceCells && n <= spec.maxPieceCells;
  });
}

function pickPieces(spec: FuseDifficultySpec, rng: () => number): PieceShape[] {
  const pool = poolForSpec(spec);
  if (pool.length === 0) return [];
  const picked: PieceShape[] = [];
  for (let i = 0; i < spec.pieceCount; i++) {
    picked.push(sample(pool, rng));
  }
  return picked;
}

/**
 * Trace of a single forward-simulation step: where the placed piece
 * landed (so we know which cells it occupied right after placement)
 * and the indices of any rows/cols that cleared on this exact move.
 * The fuse-seeding pass scans these to find candidates: cells that
 * appeared as part of a clear in the canonical solution.
 */
type SimStep = {
  /** 1-indexed move number — i.e. the i-th piece placed (i ≥ 1). */
  moveIndex: number;
  /** Cells the placement painted on the board (post-placement, pre-clear). */
  placedCells: Coord[];
  /** Cells already on the board at the START of this move (before placement). */
  preCells: Coord[];
  /** Rows cleared on this move (indices into the board, post-placement). */
  clearedRows: number[];
  /** Cols cleared on this move. */
  clearedCols: number[];
};

type SimResult = {
  finalBoard: BoardGrid;
  steps: SimStep[];
};

/**
 * Walk the piece list, placing each piece at a random legal
 * (orientation, origin) and applying standard line clears. Returns the
 * final board (becomes the target pattern) and a per-move trace used
 * to seed fuses. Returns null if any piece had no legal placement.
 */
function simulateForward(
  startBoard: BoardGrid,
  pieces: PieceShape[],
  rng: () => number
): SimResult | null {
  let board = cloneBoard(startBoard);
  const steps: SimStep[] = [];

  for (let i = 0; i < pieces.length; i++) {
    const template = pieces[i];
    const placements: { piece: PieceShape; origin: Coord }[] = [];
    for (const piece of orientations(template)) {
      for (let r = 0; r <= BOARD_SIZE - piece.height; r++) {
        for (let c = 0; c <= BOARD_SIZE - piece.width; c++) {
          const origin: Coord = { row: r, col: c };
          if (canPlacePiece(board, piece, origin)) {
            placements.push({ piece, origin });
          }
        }
      }
    }
    if (placements.length === 0) return null;
    const choice = sample(placements, rng);

    // Snapshot the cells that were already on the board BEFORE this
    // placement — those are valid fuse-seed candidates too (a fuse
    // placed on a pre-existing cell will get cleared whenever that
    // cell's line clears, just like a fuse on a freshly-placed cell).
    const preCells: Coord[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== null) preCells.push({ row: r, col: c });
      }
    }

    const placedBoard = placePiece(board, choice.piece, choice.origin);
    const placedCells: Coord[] = choice.piece.cells.map((cell) => ({
      row: choice.origin.row + cell.row,
      col: choice.origin.col + cell.col,
    }));

    const { rows, cols } = detectCompletedLines(placedBoard);
    let nextBoard = placedBoard;
    if (rows.length > 0 || cols.length > 0) {
      nextBoard = clearLines(placedBoard, rows, cols);
    }

    steps.push({
      moveIndex: i + 1,
      placedCells,
      preCells,
      clearedRows: rows,
      clearedCols: cols,
    });

    board = nextBoard;
  }

  return { finalBoard: board, steps };
}

/**
 * Pick K fuse cells with countdowns chosen so the canonical move order
 * clears every fuse's row/column BEFORE its countdown hits 0. We walk
 * the simulation log and, for each (move, cleared-row | cleared-col)
 * event, collect the cells along that line that existed at clear time.
 * Each such cell is a valid fuse seed: putting a fuse there with
 * countdown = `moveIndex + slack` (slack ∈ {1, 2}) ensures the line
 * clears at move `moveIndex` (countdown = slack ≥ 1 right before the
 * clear, fuse vanishes when the line clears). After the canonical
 * solution finishes, every seeded fuse has been swept by its line.
 *
 * Returns the chosen fuse list, or null if fewer than K eligible cells
 * are available across the trace.
 */
function pickFuseSeeds(
  result: SimResult,
  K: number,
  rng: () => number
): FuseCell[] | null {
  // Build the candidate pool: each (cell, moveIndex) pair where the
  // cell is on a row/column that cleared at `moveIndex` AND was on the
  // board at the moment of that clear (i.e. either pre-existing or
  // freshly placed by the same move). Dedupe so the same cell appears
  // at most once — we'll pick which cells to fuse, and each cell can
  // host only one fuse.
  type Candidate = { row: number; col: number; clearMove: number };
  const byCell = new Map<string, Candidate>();

  for (const step of result.steps) {
    if (step.clearedRows.length === 0 && step.clearedCols.length === 0) continue;
    // The line composition right before the clear = preCells ∪ placedCells.
    // We dedupe via a Set<string> so the same cell isn't double-counted.
    const onBoardAtClear = new Set<string>();
    for (const { row, col } of step.preCells) onBoardAtClear.add(`${row},${col}`);
    for (const { row, col } of step.placedCells) onBoardAtClear.add(`${row},${col}`);

    for (const r of step.clearedRows) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const key = `${r},${c}`;
        if (!onBoardAtClear.has(key)) continue;
        // Prefer the EARLIEST clear-move for this cell: it gives the
        // tightest countdown bound and keeps the puzzle from being
        // trivially solvable in any order.
        const existing = byCell.get(key);
        if (!existing || step.moveIndex < existing.clearMove) {
          byCell.set(key, { row: r, col: c, clearMove: step.moveIndex });
        }
      }
    }
    for (const c of step.clearedCols) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        const key = `${r},${c}`;
        if (!onBoardAtClear.has(key)) continue;
        const existing = byCell.get(key);
        if (!existing || step.moveIndex < existing.clearMove) {
          byCell.set(key, { row: r, col: c, clearMove: step.moveIndex });
        }
      }
    }
  }

  const candidates = [...byCell.values()];
  if (candidates.length < K) return null;

  shuffleInPlace(candidates, rng);
  const chosen = candidates.slice(0, K);

  return chosen.map((cand) => {
    // Slack 1 or 2 — the fuse hits 0 either exactly the turn its line
    // clears (slack 1, but the line clears BEFORE the post-clear
    // decrement, so the fuse is destroyed by the clear and never hits
    // 0) or one turn after (slack 2, gives the player a one-move
    // safety margin).
    const slack = 1 + Math.floor(rng() * 2);
    return {
      row: cand.row,
      col: cand.col,
      countdown: cand.clearMove + slack,
    };
  });
}

type BuiltPuzzle = {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  fuseCells: FuseCell[];
  signature: string;
};

function targetKey(target: TargetPattern): string {
  let s = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      s += target[r][c] ? '1' : '0';
    }
  }
  return s;
}

function trayKey(tray: PieceShape[]): string {
  return [...tray]
    .map((p) => p.id)
    .sort()
    .join(',');
}

function fuseKey(fuses: FuseCell[]): string {
  return [...fuses]
    .map((f) => `${f.row},${f.col}:${f.countdown}`)
    .sort()
    .join('|');
}

/**
 * Stamp the chosen fuse seeds onto the starting board. The starting
 * board is a clone of the simulation's initial empty board, plus a
 * `FUSE_COLOR` sentinel painted on each fuse cell. The countdown lives
 * in the returned fuse list (kept separate from the board grid so the
 * board stays a plain string-or-null grid like every other mode).
 */
function stampFuses(startBoard: BoardGrid, fuses: FuseCell[]): BoardGrid {
  const next = cloneBoard(startBoard);
  for (const f of fuses) {
    next[f.row][f.col] = FUSE_COLOR;
  }
  return next;
}

function buildCandidate(
  spec: FuseDifficultySpec,
  rng: () => number
): BuiltPuzzle | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const pieces = pickPieces(spec, rng);
    if (pieces.length !== spec.pieceCount) continue;

    const startBoard = createEmptyBoard();
    const sim = simulateForward(startBoard, pieces, rng);
    if (!sim) continue;

    // Guard the standard target-quality filters first: target must have
    // a sensible footprint, span ≥ 2 rows + 2 cols, and fall in the
    // difficulty's cell band. (These also filter out the degenerate
    // "tray cleared everything → empty target" case.)
    const target = boardToTarget(sim.finalBoard);
    const targetCells = countTargetCells(target);
    if (targetCells < spec.minTargetCells) continue;
    if (targetCells > spec.maxTargetCells) continue;
    if (!isTargetShapeOk(target)) continue;

    const fuseSeeds = pickFuseSeeds(sim, spec.fuseCount, rng);
    if (!fuseSeeds) continue;

    const trayTemplates = shuffleInPlace([...pieces], rng);
    const randomlyRotated = trayTemplates.map((piece) =>
      rotatePieceNTimes(piece, Math.floor(rng() * 4))
    );
    const tray = colorizeTray(randomlyRotated, rng);

    const board = stampFuses(startBoard, fuseSeeds);

    const signature = `${targetKey(target)}|${trayKey(tray)}|${fuseKey(fuseSeeds)}`;
    return { board, tray, target, fuseCells: fuseSeeds, signature };
  }
  return null;
}

const RECENT_SIGNATURE_LIMIT = 6;
const recentSignaturesByDifficulty = new Map<FuseDifficulty, string[]>();

function recordSignature(d: FuseDifficulty, signature: string) {
  const list = recentSignaturesByDifficulty.get(d) ?? [];
  list.push(signature);
  while (list.length > RECENT_SIGNATURE_LIMIT) list.shift();
  recentSignaturesByDifficulty.set(d, list);
}

function isRecentlySeen(d: FuseDifficulty, signature: string): boolean {
  return recentSignaturesByDifficulty.get(d)?.includes(signature) ?? false;
}

/**
 * Hard-coded fallback used if generation repeatedly fails to meet a
 * spec. Two horizontal trominoes on rows 1 and 5 — same skeleton as the
 * Breathe / Heading fallbacks — and a single fuse seeded on row 1 with
 * a generous countdown so the player has plenty of slack to clear that
 * row first. Guarantees the player ALWAYS gets a real Fuse instance
 * even when the RNG fights us.
 */
function buildFallback(): BuiltPuzzle {
  const rng = mulberry32(0xf05e0001);
  const pieces = [
    PIECE_CATALOG.find((p) => p.id === 'h3')!,
    PIECE_CATALOG.find((p) => p.id === 'h3')!,
  ];
  const target: TargetPattern = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );
  // Final state after the canonical solution: row-5 tromino in cols 4-6.
  // (The row-1 tromino completes a row that immediately clears with the
  // single fuse on it.) That makes the target reachable AND the single
  // fuse swept by its line — exactly what the Fuse rule demands.
  for (let c = 4; c <= 6; c++) target[5][c] = true;

  // Seed seven of the eight cells on row 1 so the player's row-1
  // tromino completes the row and clears it (and the fuse with it).
  const startBoard = createEmptyBoard();
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (c >= 1 && c <= 3) continue; // leave the tromino's slot empty
    startBoard[1][c] = c === 0 ? FUSE_COLOR : '#5c6b7a';
  }
  const fuseCells: FuseCell[] = [{ row: 1, col: 0, countdown: 2 }];

  const tray = colorizeTray(
    shuffleInPlace([...pieces], rng).map((piece) =>
      rotatePieceNTimes(piece, Math.floor(rng() * 4))
    ),
    rng
  );

  return {
    board: startBoard,
    tray,
    target,
    fuseCells,
    signature: 'fuse-fallback',
  };
}

const fallback = buildFallback();

/**
 * Generate a Fuse mode puzzle at the requested difficulty. Returns the
 * starting board (with `FUSE_COLOR` sentinels painted), the tray of
 * pieces (random rotation + palette), the target pattern the player
 * must reproduce, and the list of fuse cells (with countdowns) the
 * reducer threads through state.
 *
 * Solvability is guaranteed by construction: forward simulation IS the
 * canonical solution, and the fuse seeds are placed on cells that get
 * cleared along the way with countdown = clear-move + slack so each
 * fuse vanishes BEFORE its countdown hits 0. After the canonical
 * solution finishes, the board matches the target exactly and no
 * fuses remain — both Fuse-win predicates pass.
 */
export function generateFusePuzzle(options: {
  difficulty?: FuseDifficulty;
  seed?: number;
} = {}): {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  fuseCells: FuseCell[];
  difficulty: FuseDifficulty;
} {
  const difficulty = options.difficulty ?? 'easy';
  const spec = getFuseDifficultySpec(difficulty);
  const seed =
    (options.seed ?? (Date.now() ^ Math.floor(Math.random() * 0x100000000))) >>> 0;
  const rng = mulberry32(seed);

  for (let attempt = 0; attempt < 80; attempt++) {
    const built = buildCandidate(spec, rng);
    if (!built) continue;
    if (isRecentlySeen(difficulty, built.signature)) continue;
    recordSignature(difficulty, built.signature);
    return {
      board: cloneBoard(built.board),
      tray: built.tray.map((piece) => clonePiece(piece)),
      target: built.target.map((row) => [...row]),
      fuseCells: built.fuseCells.map((f) => ({ ...f })),
      difficulty,
    };
  }

  return {
    board: cloneBoard(fallback.board),
    tray: fallback.tray.map((piece) => clonePiece(piece)),
    target: fallback.target.map((row) => [...row]),
    fuseCells: fallback.fuseCells.map((f) => ({ ...f })),
    difficulty,
  };
}
