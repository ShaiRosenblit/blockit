import type {
  BoardGrid,
  Coord,
  ErasuresDifficulty,
  PieceShape,
  TargetPattern,
} from './types';
import { BOARD_SIZE, COLORS } from './types';
import {
  applyPlacementAndClear,
  canPlacePiece,
  createEmptyBoard,
  rotatePiece90Clockwise,
} from './board';
import { PIECE_CATALOG } from './pieces';
import { ERASURES_PREFILL_COLOR, erasureTokenCount } from './erasures';

/**
 * Erasures mode puzzle generation.
 *
 * Design compromise (documented up-front per the implementation spec): we
 * ship the simplest robust path — the **escape-valves fallback**.
 * Concretely:
 *
 *   1. Pre-stamp the board with a moderate number of pre-fill blockers
 *      (`ERASURES_PREFILL_COLOR`) — these are immune to erasure (only
 *      `isPlayerColor`-true cells can be erased).
 *   2. Forward-simulate a sequence of legal placements on top of that
 *      pre-fill, applying the standard place-and-clear pipeline. The
 *      simulation IS a canonical solution, so by construction the
 *      puzzle is solvable WITHOUT spending any tokens.
 *   3. Snapshot the post-simulation board as the target pattern (cells
 *      that survived the simulation become target=true; everything else
 *      including the pre-fill that survived is also target=true since
 *      pre-fill is filled in the final state too).
 *   4. Emit `K = erasureTokenCount(difficulty)` erase tokens. Tokens are
 *      escape valves: the player CAN reach the target without spending
 *      any, but a misplacement that puts a piece on a non-target cell
 *      can be undone by spending one token to erase that 4-connected
 *      component.
 *
 * Why the fallback rather than the mandatory-erase path? The spec
 * explicitly allows the fallback ("ship it") and flags the mandatory-
 * erase path as optional. Generating a puzzle whose canonical solution
 * involves alternating place / erase / place steps — and verifying it
 * REMAINS solvable via the reducer pipeline — is a substantially harder
 * engineering problem (the reducer's place/erase ordering, the
 * component-merge trap from the Stage-3 trace, and the failure-cliff
 * concerns all compound). The fallback keeps the mode shippable today
 * while keeping the door open for a future generator that produces
 * mandatory-erase puzzles using the same on-disk persistence shape (no
 * schema change needed — only the generator is swapped).
 *
 * The fallback's mode-distinctness vs. plain Puzzle is preserved because:
 *   - The starting board carries Erasures-specific pre-fill density
 *     (more blockers than a 4-difficulty Puzzle Easy round; comparable
 *     to a Puzzle Hard round).
 *   - The Erase UI button + token reserve + select-mode highlighting are
 *     part of the visible game loop EVERY round, so even on a no-token
 *     solve the player parses the round as "Erasures, tokens unspent"
 *     not "Puzzle".
 *   - On a mis-placement the player gets a recovery affordance no other
 *     mode offers (component-level erasure, not simple step undo).
 */

/**
 * Per-difficulty spec controlling the generator's output.
 */
export type ErasuresDifficultySpec = {
  difficulty: ErasuresDifficulty;
  /** Number of pieces in the tray (also the simulation length). */
  pieceCount: number;
  /** Inclusive lower / upper bound on each piece's cell count. */
  minPieceCells: number;
  maxPieceCells: number;
  /** Inclusive lower / upper bound on the post-simulation target-cell count. */
  minTargetCells: number;
  maxTargetCells: number;
  /** Number of pre-fill blockers stamped onto the starting board. */
  prefillCount: number;
  /**
   * Token grant `K`. Mirrors `erasureTokenCount(difficulty)` — the value
   * is duplicated here so callers reading the spec see all the relevant
   * knobs for a difficulty in one place, rather than having to cross
   * reference `erasures.ts`.
   */
  tokenCount: number;
};

const DIFFICULTY_SPECS: Record<ErasuresDifficulty, ErasuresDifficultySpec> = {
  easy: {
    difficulty: 'easy',
    pieceCount: 4,
    minPieceCells: 3,
    maxPieceCells: 4,
    minTargetCells: 8,
    maxTargetCells: 18,
    prefillCount: 6,
    tokenCount: erasureTokenCount('easy'),
  },
  normal: {
    difficulty: 'normal',
    pieceCount: 5,
    minPieceCells: 3,
    maxPieceCells: 4,
    minTargetCells: 12,
    maxTargetCells: 24,
    prefillCount: 8,
    tokenCount: erasureTokenCount('normal'),
  },
  hard: {
    difficulty: 'hard',
    pieceCount: 6,
    minPieceCells: 3,
    maxPieceCells: 5,
    minTargetCells: 16,
    maxTargetCells: 32,
    prefillCount: 10,
    tokenCount: erasureTokenCount('hard'),
  },
};

/**
 * Look up the difficulty specification for an Erasures rung. Exposed so
 * the reducer / UI can read piece-count / token-count bands without
 * duplicating the table.
 */
export function getErasuresDifficultySpec(d: ErasuresDifficulty): ErasuresDifficultySpec {
  return DIFFICULTY_SPECS[d];
}

/** Standard mulberry32 — same shape used by every other generator. */
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
  return { ...piece, cells: piece.cells.map((c) => ({ ...c })) };
}

function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) => [...row]);
}

/**
 * Enumerate the unique rotation orientations of a piece (keyed by the
 * sorted set of cells, deduped against trivial 180°/360° collisions for
 * symmetric shapes).
 */
function orientations(piece: PieceShape): PieceShape[] {
  const seen = new Set<string>();
  const out: PieceShape[] = [];
  let p = piece;
  for (let i = 0; i < 4; i++) {
    const key = p.cells.map((c) => `${c.row},${c.col}`).sort().join('|');
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
    p = rotatePiece90Clockwise(p);
  }
  return out;
}

function rotatePieceNTimes(piece: PieceShape, turns: number): PieceShape {
  let rot = clonePiece(piece);
  for (let i = 0; i < turns; i++) rot = rotatePiece90Clockwise(rot);
  return rot;
}

/**
 * Stamp colors onto the tray pieces so they read as varied. Mirrors the
 * Quarantine / Heading approach — uniform palette, distinct colors.
 */
function colorizeTray(pieces: PieceShape[], rng: () => number): PieceShape[] {
  const palette = shuffleInPlace([...COLORS], rng);
  return pieces.map((piece, index) => ({
    ...clonePiece(piece),
    color: palette[index % palette.length],
  }));
}

/** Build the target pattern by reading occupancy off a finished board. */
function boardToTarget(board: BoardGrid): TargetPattern {
  const t: TargetPattern = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) t[r][c] = true;
    }
  }
  return t;
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

/** Pieces eligible for the tray — filtered by cell-count band. */
function poolForSpec(spec: ErasuresDifficultySpec): PieceShape[] {
  return PIECE_CATALOG.filter((p) => {
    const n = p.cells.length;
    return n >= spec.minPieceCells && n <= spec.maxPieceCells;
  });
}

function pickPieces(
  spec: ErasuresDifficultySpec,
  rng: () => number
): PieceShape[] {
  const pool = poolForSpec(spec);
  const out: PieceShape[] = [];
  for (let i = 0; i < spec.pieceCount; i++) out.push(sample(pool, rng));
  return out;
}

/**
 * Stamp `count` pre-fill blockers onto an empty board at random
 * positions. Returns a fresh board. Pre-fill cells use
 * `ERASURES_PREFILL_COLOR` so `isPlayerColor` returns false for them
 * (i.e. the player cannot erase pre-fill via an erase token).
 */
function stampPrefill(count: number, rng: () => number): BoardGrid {
  const board = createEmptyBoard();
  const cells: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      cells.push({ row: r, col: c });
    }
  }
  shuffleInPlace(cells, rng);
  const k = Math.min(count, cells.length);
  for (let i = 0; i < k; i++) {
    const { row, col } = cells[i];
    board[row][col] = ERASURES_PREFILL_COLOR;
  }
  return board;
}

type SimResult = {
  finalBoard: BoardGrid;
};

/**
 * Forward-sim: place each piece in `pieces` at a random legal position
 * on `startBoard`, applying the standard place-and-clear pipeline.
 * Returns the final board if every piece could be placed; null
 * otherwise (signals the candidate is unwinnable as scheduled and
 * should be retried with fresh pre-fill / piece picks).
 */
function simulateForward(
  startBoard: BoardGrid,
  pieces: PieceShape[],
  rng: () => number
): SimResult | null {
  let board: BoardGrid = cloneBoard(startBoard);

  for (const template of pieces) {
    const placements: { piece: PieceShape; origin: Coord }[] = [];
    for (const piece of orientations(template)) {
      for (let r = 0; r <= BOARD_SIZE - piece.height; r++) {
        for (let c = 0; c <= BOARD_SIZE - piece.width; c++) {
          if (canPlacePiece(board, piece, { row: r, col: c })) {
            placements.push({ piece, origin: { row: r, col: c } });
          }
        }
      }
    }
    if (placements.length === 0) return null;
    const choice = sample(placements, rng);
    board = applyPlacementAndClear(board, choice.piece, choice.origin);
  }

  return { finalBoard: board };
}

/**
 * Concrete output shape returned by `generateErasuresPuzzle`. The
 * `tokenCount` field is the K value granted to the player at the start
 * of the round — see `erasureTokenCount` for the per-difficulty values.
 */
export type ErasuresInstance = {
  difficulty: ErasuresDifficulty;
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  tokenCount: number;
};

/** Recent-signature cache to discourage immediate replays. */
const RECENT_SIGNATURE_LIMIT = 6;
const recentSignaturesByDifficulty = new Map<ErasuresDifficulty, string[]>();

function recordSignature(d: ErasuresDifficulty, signature: string) {
  const list = recentSignaturesByDifficulty.get(d) ?? [];
  list.push(signature);
  while (list.length > RECENT_SIGNATURE_LIMIT) list.shift();
  recentSignaturesByDifficulty.set(d, list);
}

function isRecentlySeen(d: ErasuresDifficulty, signature: string): boolean {
  return recentSignaturesByDifficulty.get(d)?.includes(signature) ?? false;
}

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
  return [...tray].map((p) => p.id).sort().join(',');
}

function boardKey(board: BoardGrid): string {
  let s = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      s += board[r][c] === null ? '0' : board[r][c] === ERASURES_PREFILL_COLOR ? 'P' : 'F';
    }
  }
  return s;
}

function buildCandidate(
  spec: ErasuresDifficultySpec,
  rng: () => number
): ErasuresInstance | null {
  for (let attempt = 0; attempt < 40; attempt++) {
    const startBoard = stampPrefill(spec.prefillCount, rng);
    const pieces = pickPieces(spec, rng);

    // Total piece cells must fit inside the empty area, with some
    // slack to allow line clears to make room. We don't enforce a
    // strict upper bound (clears recycle space), but if the piece
    // budget is wildly oversized vs the empty area we skip the
    // candidate to avoid burning simulator time on hopeless deals.
    const totalCells = pieces.reduce((acc, p) => acc + p.cells.length, 0);
    const totalEmpty = BOARD_SIZE * BOARD_SIZE - spec.prefillCount;
    if (totalCells > totalEmpty + BOARD_SIZE * 2) continue;

    const sim = simulateForward(startBoard, pieces, rng);
    if (!sim) continue;

    const target = boardToTarget(sim.finalBoard);
    const tcells = countTargetCells(target);
    if (tcells < spec.minTargetCells || tcells > spec.maxTargetCells) continue;

    // Reject the trivial case where the target equals the starting
    // board's pre-fill exactly — that would mean the simulator placed
    // every piece into a row/column clear and the player has nothing
    // to do beyond... place every piece into a row/column clear, which
    // is a degenerate Erasures round (token redundancy is real but the
    // mode loses its dual nature).
    let differs = false;
    for (let r = 0; r < BOARD_SIZE && !differs; r++) {
      for (let c = 0; c < BOARD_SIZE && !differs; c++) {
        const startFilled = startBoard[r][c] !== null;
        if (startFilled !== target[r][c]) differs = true;
      }
    }
    if (!differs) continue;

    const trayTemplates = shuffleInPlace([...pieces], rng);
    const rotated = trayTemplates.map((p) =>
      rotatePieceNTimes(p, Math.floor(rng() * 4))
    );
    const tray = colorizeTray(rotated, rng);

    return {
      difficulty: spec.difficulty,
      board: startBoard,
      tray,
      target,
      tokenCount: spec.tokenCount,
    };
  }
  return null;
}

/**
 * Hard-coded fallback puzzle, returned when 80 candidate-build attempts
 * all fail (effectively never under normal RNG). Trivial three-piece
 * round with one pre-fill cell so the contract holds.
 */
function buildFallback(difficulty: ErasuresDifficulty): ErasuresInstance {
  const spec = DIFFICULTY_SPECS[difficulty];
  const board = createEmptyBoard();
  board[0][0] = ERASURES_PREFILL_COLOR;
  // Three monominoes — every legitimate piece pool contains larger
  // shapes but the fallback aims for "always solvable" not "fun".
  const mono = PIECE_CATALOG.find((p) => p.id === 'dot');
  const tri = PIECE_CATALOG.find((p) => p.cells.length === 3);
  const fallbackPieces: PieceShape[] = [];
  // Always have at least one 3-cell piece to keep the geometry
  // recognisable; if the catalog ever shrinks below that we still get
  // SOMETHING by using two monominoes.
  if (tri) fallbackPieces.push(tri);
  if (mono) fallbackPieces.push(mono);
  if (mono) fallbackPieces.push(mono);
  // Pad up to spec.pieceCount with monominoes (no-op if already at length).
  while (fallbackPieces.length < spec.pieceCount && mono) fallbackPieces.push(mono);

  const rng = mulberry32(0xe7a5e5e0);
  const sim = simulateForward(board, fallbackPieces, rng);
  const finalBoard = sim ? sim.finalBoard : board;
  const target = boardToTarget(finalBoard);
  const tray = colorizeTray(
    fallbackPieces.map((p) => rotatePieceNTimes(p, 0)),
    rng
  );
  return {
    difficulty,
    board,
    tray,
    target,
    tokenCount: spec.tokenCount,
  };
}

/**
 * Public entry point. Returns an Erasures instance at the requested
 * difficulty. Behaviour:
 *   - Up to 80 candidate builds are attempted; the first that satisfies
 *     the spec and isn't a recently-seen signature wins.
 *   - On exhaustion (RNG starvation), falls back to a hand-built
 *     guaranteed-solvable instance.
 *   - The returned `tokenCount` mirrors `erasureTokenCount(difficulty)`
 *     so callers can wire it directly into `state.erasureTokens`.
 */
export function generateErasuresPuzzle(options: {
  difficulty: ErasuresDifficulty;
  seed?: number;
}): ErasuresInstance {
  const spec = DIFFICULTY_SPECS[options.difficulty];
  const seed = (options.seed ?? (Date.now() ^ Math.floor(Math.random() * 0x100000000))) >>> 0;
  const rng = mulberry32(seed);

  for (let attempt = 0; attempt < 80; attempt++) {
    const built = buildCandidate(spec, rng);
    if (!built) continue;
    const sig = `${boardKey(built.board)}|${trayKey(built.tray)}|${targetKey(built.target)}`;
    if (isRecentlySeen(options.difficulty, sig)) continue;
    recordSignature(options.difficulty, sig);
    return built;
  }

  return buildFallback(options.difficulty);
}
