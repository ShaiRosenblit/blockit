import type { BoardGrid, Coord, PieceShape, PuzzleLevel, TargetPattern } from './types';
import { BOARD_SIZE, COLORS } from './types';
import {
  createEmptyBoard,
  canPlacePiece,
  rotatePiece90Clockwise,
  applyPlacementAndClear,
  boardMatchesTarget,
} from './board';
import { PIECE_CATALOG } from './pieces';

/**
 * Puzzle mode: the player is shown a **target pattern** and must end the round
 * with the board's occupancy matching it exactly — every target cell filled,
 * every non-target cell empty. Row/column clears still trigger during play and
 * are a core planning tool: clearing a row removes unwanted starting fill, so
 * the puzzle is about *which pieces go where and in what order*.
 *
 * Difficulties 1–4 (Easy / Normal / Hard / Expert) progressively dial up the
 * challenge by growing piece count, piece size, target size, and the amount
 * of pre-fill that must be cleared away. Expert is at least as hard as the
 * old Level 10; Easy is tuned to feel meaningful from the first move (the
 * previous Level 1 was nearly trivial so it's been folded into Normal).
 *
 * Generator strategy: forward-simulation on a (possibly pre-filled) board.
 * Because the simulation itself is a valid solution, every generated puzzle
 * is guaranteed solvable. Quality filters reject degenerate targets.
 */

export const PUZZLE_MAX_DIFFICULTY: PuzzleLevel = 4;
export const PUZZLE_MIN_DIFFICULTY: PuzzleLevel = 1;

export type DifficultySpec = {
  difficulty: PuzzleLevel;
  pieceCount: number;
  minPieceCells: number;
  maxPieceCells: number;
  minTargetCells: number;
  maxTargetCells: number;
  prefillMin: number;
  prefillMax: number;
  /** Require at least this many pre-fill cells to NOT end up in the target
   *  (i.e. they must actually be cleared during play). Ensures pre-fill is
   *  meaningful, not just decoration. */
  minPrefillCleared: number;
};

// Easy is a blend of the retired levels 1 and 2: small pieces like old Level 1
// but a 3-piece tray and slightly bigger target like old Level 2, so the very
// first puzzle still asks the player to think rather than just drop & done.
const DIFFICULTY_SPECS: Record<PuzzleLevel, DifficultySpec> = {
  1: { difficulty: 1, pieceCount: 3, minPieceCells: 2, maxPieceCells: 3, minTargetCells: 5,  maxTargetCells: 10, prefillMin: 0, prefillMax: 0, minPrefillCleared: 0 },
  2: { difficulty: 2, pieceCount: 4, minPieceCells: 3, maxPieceCells: 5, minTargetCells: 10, maxTargetCells: 16, prefillMin: 1, prefillMax: 2, minPrefillCleared: 1 },
  3: { difficulty: 3, pieceCount: 5, minPieceCells: 4, maxPieceCells: 5, minTargetCells: 14, maxTargetCells: 22, prefillMin: 2, prefillMax: 4, minPrefillCleared: 2 },
  4: { difficulty: 4, pieceCount: 7, minPieceCells: 4, maxPieceCells: 5, minTargetCells: 22, maxTargetCells: 34, prefillMin: 7, prefillMax: 10, minPrefillCleared: 5 },
};

export function clampPuzzleDifficulty(difficulty: number): PuzzleLevel {
  if (!Number.isFinite(difficulty)) return PUZZLE_MIN_DIFFICULTY;
  const n = Math.round(difficulty);
  if (n < PUZZLE_MIN_DIFFICULTY) return PUZZLE_MIN_DIFFICULTY;
  if (n > PUZZLE_MAX_DIFFICULTY) return PUZZLE_MAX_DIFFICULTY;
  return n as PuzzleLevel;
}

export function getDifficultySpec(difficulty: number): DifficultySpec {
  return DIFFICULTY_SPECS[clampPuzzleDifficulty(difficulty)];
}

const RECENT_SIGNATURE_LIMIT = 8;
/** Per-difficulty history of recent signatures so replaying at the same difficulty doesn't repeat. */
const recentSignaturesByDifficulty = new Map<PuzzleLevel, string[]>();

type BuiltPuzzle = {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  signature: string;
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

function occupancyKey(board: BoardGrid): string {
  let s = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      s += board[r][c] === null ? '0' : '1';
    }
  }
  return s;
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

function remainingKey(pieces: PieceShape[]): string {
  return [...pieces]
    .map((p) => p.id)
    .sort()
    .join(',');
}

/** All pieces in the catalog whose cell count falls within the spec's range. */
function poolForSpec(spec: DifficultySpec): PieceShape[] {
  return PIECE_CATALOG.filter((p) => {
    const n = p.cells.length;
    return n >= spec.minPieceCells && n <= spec.maxPieceCells;
  });
}

function pickPieces(spec: DifficultySpec, rng: () => number): PieceShape[] {
  const pool = poolForSpec(spec);
  if (pool.length === 0) return [];
  // Sample with replacement: duplicate piece shapes are fair game and make
  // tighter puzzles, especially at higher levels.
  const picked: PieceShape[] = [];
  for (let i = 0; i < spec.pieceCount; i++) {
    picked.push(sample(pool, rng));
  }
  return picked;
}

/** Randomly place N pre-fill cells on an empty board. Cells are spread-out:
 *  we bias toward cells that aren't adjacent to another pre-fill so pre-fill
 *  doesn't clump into a single blob. */
function seedPrefill(count: number, rng: () => number): BoardGrid {
  const board = createEmptyBoard();
  if (count <= 0) return board;

  const PREFILL_COLOR = '#5c6b7a';
  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < 400) {
    attempts++;
    const r = Math.floor(rng() * BOARD_SIZE);
    const c = Math.floor(rng() * BOARD_SIZE);
    if (board[r][c] !== null) continue;

    // Soft spread: reject with increasing probability if there's an adjacent
    // pre-fill already, but don't loop forever.
    let adjacent = 0;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
      if (board[nr][nc] !== null) adjacent++;
    }
    if (adjacent > 0 && rng() < 0.65 && attempts < 200) continue;

    board[r][c] = PREFILL_COLOR;
    placed++;
  }

  return board;
}

type SimResult = { board: BoardGrid };

/** Place each piece at a random legal position, applying clear rules. */
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
          const origin: Coord = { row: r, col: c };
          if (canPlacePiece(board, piece, origin)) {
            placements.push({ piece, origin });
          }
        }
      }
    }
    if (placements.length === 0) return null;
    const choice = sample(placements, rng);
    board = applyPlacementAndClear(board, choice.piece, choice.origin);
  }

  return { board };
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

/** Count starting pre-fill cells that are NOT in the target — these are the
 *  cells the player must remove via row/column clears. */
function countClearedPrefill(startBoard: BoardGrid, target: TargetPattern): number {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (startBoard[r][c] !== null && !target[r][c]) n++;
    }
  }
  return n;
}

function isTargetShapeOk(target: TargetPattern): boolean {
  const rowsTouched = new Set<number>();
  const colsTouched = new Set<number>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (target[r][c]) {
        rowsTouched.add(r);
        colsTouched.add(c);
      }
    }
  }
  return rowsTouched.size >= 2 && colsTouched.size >= 2;
}

/**
 * BFS over (occupancy, remaining multiset) — checks whether the pieces can
 * be placed in some order to match the given target. Exported for tests and
 * future hand-authored level validation.
 */
export function canReachTarget(
  startBoard: BoardGrid,
  pieces: PieceShape[],
  target: TargetPattern
): boolean {
  type Node = { b: BoardGrid; rem: PieceShape[] };
  const queue: Node[] = [{ b: startBoard, rem: [...pieces] }];
  const seen = new Set<string>();
  let expansions = 0;
  const maxExpansions = 120_000;

  while (queue.length > 0) {
    if (++expansions > maxExpansions) return false;

    const { b, rem } = queue.shift()!;

    if (rem.length === 0) {
      if (boardMatchesTarget(b, target)) return true;
      continue;
    }

    const stateKey = `${occupancyKey(b)}|${remainingKey(rem)}`;
    if (seen.has(stateKey)) continue;
    seen.add(stateKey);

    for (let i = 0; i < rem.length; i++) {
      const template = rem[i];
      const rest = rem.filter((_, j) => j !== i);

      for (const piece of orientations(template)) {
        for (let r = 0; r <= BOARD_SIZE - piece.height; r++) {
          for (let c = 0; c <= BOARD_SIZE - piece.width; c++) {
            const origin: Coord = { row: r, col: c };
            if (!canPlacePiece(b, piece, origin)) continue;
            const next = applyPlacementAndClear(b, piece, origin);
            queue.push({ b: next, rem: rest });
          }
        }
      }
    }
  }

  return false;
}

function buildCandidate(spec: DifficultySpec, rng: () => number): BuiltPuzzle | null {
  for (let attempt = 0; attempt < 60; attempt++) {
    const prefillCount = spec.prefillMin +
      Math.floor(rng() * (spec.prefillMax - spec.prefillMin + 1));
    const startBoard = seedPrefill(prefillCount, rng);
    const pieces = pickPieces(spec, rng);
    if (pieces.length !== spec.pieceCount) continue;

    const sim = simulateForward(startBoard, pieces, rng);
    if (!sim) continue;

    const target = boardToTarget(sim.board);
    const targetCells = countTargetCells(target);
    if (targetCells < spec.minTargetCells) continue;
    if (targetCells > spec.maxTargetCells) continue;
    if (!isTargetShapeOk(target)) continue;

    // Ensure pre-fill actually contributes to the puzzle: enough of the pre-fill
    // must have been cleared during the sim (i.e. not carried into the target).
    if (spec.minPrefillCleared > 0) {
      const cleared = countClearedPrefill(startBoard, target);
      if (cleared < spec.minPrefillCleared) continue;
    }

    // Identity check: the player must not instantly solve by doing nothing.
    // That only happens when there are no pieces AND startBoard === target,
    // but sim implies pieces were placed, so this is just defensive.
    if (boardMatchesTarget(startBoard, target) && spec.pieceCount > 0) continue;

    const trayTemplates = shuffleInPlace([...pieces], rng);
    const randomlyRotated = trayTemplates.map((piece) => rotatePieceNTimes(piece, Math.floor(rng() * 4)));
    const tray = colorizeTray(randomlyRotated, rng);

    const signature = `${occupancyKey(startBoard)}|${targetKey(target)}|${remainingKey(tray)}`;
    return { board: startBoard, tray, target, signature };
  }

  return null;
}

function recordSignature(difficulty: PuzzleLevel, signature: string): void {
  const list = recentSignaturesByDifficulty.get(difficulty) ?? [];
  list.push(signature);
  while (list.length > RECENT_SIGNATURE_LIMIT) list.shift();
  recentSignaturesByDifficulty.set(difficulty, list);
}

function isRecentlySeen(difficulty: PuzzleLevel, signature: string): boolean {
  return recentSignaturesByDifficulty.get(difficulty)?.includes(signature) ?? false;
}

/** Hard-coded fallback used if generation repeatedly fails to meet a spec. */
function buildFallback(): BuiltPuzzle {
  const rng = mulberry32(0xfa11ba7);
  const pieces = [
    PIECE_CATALOG.find((p) => p.id === 'h4')!,
    PIECE_CATALOG.find((p) => p.id === 'sq2')!,
    PIECE_CATALOG.find((p) => p.id === 'l1')!,
  ];
  const startBoard = createEmptyBoard();
  const sim = simulateForward(startBoard, pieces, rng);
  if (!sim) throw new Error('Fallback puzzle simulation failed.');
  const target = boardToTarget(sim.board);
  const tray = colorizeTray(
    shuffleInPlace([...pieces], rng).map((piece) => rotatePieceNTimes(piece, Math.floor(rng() * 4))),
    rng
  );
  const signature = `fallback|${targetKey(target)}|${remainingKey(tray)}`;
  return { board: startBoard, tray, target, signature };
}

const fallback = buildFallback();

export function generatePuzzle(options: { difficulty?: number; seed?: number } = {}): {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  difficulty: PuzzleLevel;
} {
  const difficulty = clampPuzzleDifficulty(options.difficulty ?? PUZZLE_MIN_DIFFICULTY);
  const spec = getDifficultySpec(difficulty);
  const seed = (options.seed ?? (Date.now() ^ Math.floor(Math.random() * 0x100000000))) >>> 0;
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
      difficulty,
    };
  }

  // Fall back if we really can't hit the spec — rare in practice.
  return {
    board: cloneBoard(fallback.board),
    tray: fallback.tray.map((piece) => clonePiece(piece)),
    target: fallback.target.map((row) => [...row]),
    difficulty,
  };
}
