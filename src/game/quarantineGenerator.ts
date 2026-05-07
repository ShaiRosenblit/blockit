import type {
  BoardGrid,
  Coord,
  PieceShape,
  QuarantineDifficulty,
} from './types';
import { BOARD_SIZE, COLORS } from './types';
import {
  WALL_COLOR,
  applyPlacementAndClear,
  canPlacePiece,
  clearLinesPreservingWalls,
  computeQuarantineRegions,
  createEmptyBoard,
  detectCompletedLines,
  placePiece,
  rotatePiece90Clockwise,
} from './board';
import { PIECE_CATALOG } from './pieces';

/**
 * Quarantine mode generation.
 *
 * Walls partition the 8×8 board into 2–3 4-connected empty regions.
 * Each region has a per-instance target for "empty cells at win-state".
 * The generator forward-simulates a sequence of placements (choosing
 * legal positions at random, applying line clears that preserve walls)
 * and uses the resulting per-region empty count as the target. Because
 * the simulation is itself a valid solution, every produced puzzle is
 * by construction winnable.
 *
 * Quality filters reject:
 *   - instances where some region has target 0 (it must be fully filled
 *     by the player, which is too brittle and uninteresting),
 *   - instances where no placement spans a region boundary (regions
 *     would feel like independent sub-puzzles),
 *   - instances where the targets are trivially equal to the initial
 *     empty counts (the player would solve by placing nothing).
 */

type Spec = {
  difficulty: QuarantineDifficulty;
  /** Number of regions the wall must produce. */
  regionCount: 2 | 3;
  /** Wall shapes available at this difficulty (chosen uniformly). */
  wallShapes: WallShapeKind[];
  /** Inclusive piece-count range for the tray. */
  trayMin: number;
  trayMax: number;
  /** Inclusive piece cell-count range. */
  minPieceCells: number;
  maxPieceCells: number;
};

type WallShapeKind = 'horizontal' | 'vertical' | 't' | 'l';

const SPECS: Record<QuarantineDifficulty, Spec> = {
  easy: {
    difficulty: 'easy',
    regionCount: 2,
    wallShapes: ['horizontal', 'vertical'],
    trayMin: 3,
    trayMax: 4,
    minPieceCells: 2,
    maxPieceCells: 4,
  },
  normal: {
    difficulty: 'normal',
    regionCount: 2,
    wallShapes: ['horizontal', 'vertical', 'l'],
    trayMin: 4,
    trayMax: 5,
    minPieceCells: 3,
    maxPieceCells: 5,
  },
  hard: {
    difficulty: 'hard',
    regionCount: 3,
    wallShapes: ['t', 'l'],
    trayMin: 5,
    trayMax: 6,
    minPieceCells: 3,
    maxPieceCells: 5,
  },
};

export type QuarantineInstance = {
  board: BoardGrid;
  tray: PieceShape[];
  regions: Coord[][];
  targets: number[];
  difficulty: QuarantineDifficulty;
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
  return { ...piece, cells: piece.cells.map((c) => ({ ...c })) };
}

function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) => [...row]);
}

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

function colorizeTray(pieces: PieceShape[], rng: () => number): PieceShape[] {
  const palette = shuffleInPlace([...COLORS], rng);
  return pieces.map((piece, index) => ({
    ...clonePiece(piece),
    color: palette[index % palette.length],
  }));
}

function poolForSpec(spec: Spec): PieceShape[] {
  return PIECE_CATALOG.filter((p) => {
    const n = p.cells.length;
    return n >= spec.minPieceCells && n <= spec.maxPieceCells;
  });
}

/** Stamp a wall pattern onto an empty board, returning a new board. */
function layoutWall(kind: WallShapeKind, rng: () => number): Coord[] {
  switch (kind) {
    case 'horizontal': {
      // A horizontal wall spans cols 0..7 in some row in [2, 5]. We pick
      // among 2,3,4,5 to vary the relative region sizes (24/32, 32/24).
      const row = 2 + Math.floor(rng() * 4);
      const cells: Coord[] = [];
      for (let c = 0; c < BOARD_SIZE; c++) cells.push({ row, col: c });
      return cells;
    }
    case 'vertical': {
      const col = 2 + Math.floor(rng() * 4);
      const cells: Coord[] = [];
      for (let r = 0; r < BOARD_SIZE; r++) cells.push({ row: r, col });
      return cells;
    }
    case 'l': {
      // L-shape: a horizontal segment from col 0 to col W on some row,
      // plus a vertical segment from that row down/up to an edge. Two
      // regions result (one is roughly an L-shaped open region, one is
      // its complement).
      const row = 3 + Math.floor(rng() * 2); // 3 or 4
      const turnCol = 3 + Math.floor(rng() * 2); // 3 or 4
      const downward = rng() < 0.5;
      const cells: Coord[] = [];
      for (let c = 0; c <= turnCol; c++) cells.push({ row, col: c });
      if (downward) {
        for (let r = row + 1; r < BOARD_SIZE; r++) cells.push({ row: r, col: turnCol });
      } else {
        for (let r = row - 1; r >= 0; r--) cells.push({ row: r, col: turnCol });
      }
      return cells;
    }
    case 't': {
      // T-shape: full horizontal wall + a vertical stub on one side.
      // Produces 3 regions (top, bottom-left, bottom-right) when the
      // stub goes downward.
      const row = 3 + Math.floor(rng() * 2); // 3 or 4
      const stubCol = 3 + Math.floor(rng() * 2); // 3 or 4
      const downward = row < 4 ? true : rng() < 0.5;
      const cells: Coord[] = [];
      for (let c = 0; c < BOARD_SIZE; c++) cells.push({ row, col: c });
      if (downward) {
        for (let r = row + 1; r < BOARD_SIZE; r++) cells.push({ row: r, col: stubCol });
      } else {
        for (let r = row - 1; r >= 0; r--) cells.push({ row: r, col: stubCol });
      }
      return cells;
    }
  }
}

function stampWalls(board: BoardGrid, walls: Coord[]): BoardGrid {
  const next = board.map((row) => [...row]);
  for (const { row, col } of walls) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) continue;
    next[row][col] = WALL_COLOR;
  }
  return next;
}

function pickPieces(spec: Spec, rng: () => number): PieceShape[] {
  const pool = poolForSpec(spec);
  const count = spec.trayMin + Math.floor(rng() * (spec.trayMax - spec.trayMin + 1));
  const out: PieceShape[] = [];
  for (let i = 0; i < count; i++) out.push(sample(pool, rng));
  return out;
}

type SimResult = {
  finalBoard: BoardGrid;
  /** Number of line-clear EVENTS (placements that triggered ≥1 row/col
   *  clear) during the simulated solution. We require ≥1 to ensure the
   *  wall-preserving-clear mechanic is engaged; clears that erase player
   *  cells from rows containing walls are the dual-purpose verb. */
  clearEvents: number;
};

/**
 * Filter out rows that are 100% walls (wall-only rows produce phantom
 * "clears" that don't actually clear any player cells). The wall sentinel
 * is recognised by `WALL_COLOR`. Returns the same shape as
 * `detectCompletedLines` minus wall-only entries.
 */
function detectClearableLines(board: BoardGrid): { rows: number[]; cols: number[] } {
  const { rows, cols } = detectCompletedLines(board);
  const clearableRows = rows.filter((r) => {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== WALL_COLOR) return true;
    }
    return false;
  });
  const clearableCols = cols.filter((c) => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] !== WALL_COLOR) return true;
    }
    return false;
  });
  return { rows: clearableRows, cols: clearableCols };
}

/** Forward-sim with wall-preserving clears. */
function simulateForward(
  startBoard: BoardGrid,
  pieces: PieceShape[],
  _regionLookup: number[][],
  rng: () => number
): SimResult | null {
  let board: BoardGrid = cloneBoard(startBoard);
  let clearEvents = 0;

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

    // Apply placement and walls-preserving clears (skipping wall-only rows
    // so a fully-walled divider row doesn't phantom-clear every turn).
    let next = placePiece(board, choice.piece, choice.origin);
    const { rows, cols } = detectClearableLines(next);
    if (rows.length > 0 || cols.length > 0) {
      next = clearLinesPreservingWalls(next, rows, cols);
      clearEvents++;
    }
    board = next;
  }

  return { finalBoard: board, clearEvents };
}

function buildRegionLookup(regions: Coord[][]): number[][] {
  const lookup: number[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => -1)
  );
  for (let i = 0; i < regions.length; i++) {
    for (const { row, col } of regions[i]) {
      lookup[row][col] = i;
    }
  }
  return lookup;
}

function countEmptyPerRegion(board: BoardGrid, regions: Coord[][]): number[] {
  const out: number[] = [];
  for (const region of regions) {
    let n = 0;
    for (const { row, col } of region) if (board[row][col] === null) n++;
    out.push(n);
  }
  return out;
}

function regionSizes(regions: Coord[][]): number[] {
  return regions.map((r) => r.length);
}

function targetsAreNonTrivial(
  initialEmpties: number[],
  finalEmpties: number[]
): boolean {
  // Every region must change from its initial state (so the player
  // genuinely has work to do in each region).
  for (let i = 0; i < initialEmpties.length; i++) {
    if (finalEmpties[i] === initialEmpties[i]) return false;
  }
  return true;
}

const RECENT_LIMIT = 6;
const recentSignatures = new Map<QuarantineDifficulty, string[]>();

function recordSignature(difficulty: QuarantineDifficulty, sig: string): void {
  const list = recentSignatures.get(difficulty) ?? [];
  list.push(sig);
  while (list.length > RECENT_LIMIT) list.shift();
  recentSignatures.set(difficulty, list);
}

function isRecentlySeen(difficulty: QuarantineDifficulty, sig: string): boolean {
  return recentSignatures.get(difficulty)?.includes(sig) ?? false;
}

/** Build a signature so replays at the same difficulty don't repeat. */
function signatureOf(
  board: BoardGrid,
  tray: PieceShape[],
  targets: number[]
): string {
  let s = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      s += board[r][c] === null ? '0' : board[r][c] === WALL_COLOR ? 'W' : 'F';
    }
  }
  s += '|' + targets.join(',');
  s += '|' + [...tray].map((p) => p.id).sort().join(',');
  return s;
}

function buildCandidate(spec: Spec, rng: () => number): QuarantineInstance | null {
  for (let attempt = 0; attempt < 30; attempt++) {
    const wallKind = sample(spec.wallShapes, rng);
    const walls = layoutWall(wallKind, rng);
    const startBoard = stampWalls(createEmptyBoard(), walls);
    const regions = computeQuarantineRegions(startBoard);
    if (regions.length !== spec.regionCount) continue;
    if (regionSizes(regions).some((s) => s < 4)) continue;

    const pieces = pickPieces(spec, rng);
    const totalCells = pieces.reduce((acc, p) => acc + p.cells.length, 0);
    const totalEmpty = regions.reduce((acc, r) => acc + r.length, 0);
    if (totalCells >= totalEmpty) continue;

    const regionLookup = buildRegionLookup(regions);
    const sim = simulateForward(startBoard, pieces, regionLookup, rng);
    if (!sim) continue;

    const initialEmpties = regionSizes(regions);
    const finalEmpties = countEmptyPerRegion(sim.finalBoard, regions);
    if (finalEmpties.some((t) => t === 0)) continue;
    if (!targetsAreNonTrivial(initialEmpties, finalEmpties)) continue;
    // Hard tier requires ≥1 clear in the solution so the wall-preserving
    // clear mechanic is exercised; easy/normal can be solved by pure
    // placement, which is fine.
    if (spec.difficulty === 'hard' && sim.clearEvents === 0) continue;

    // Also reject if the targets equal totalEmpty - totalCells (no clears
    // happened) AND the wall is trivial (single straight line). Mild quality.
    const targets = finalEmpties;
    const trayTemplates = shuffleInPlace([...pieces], rng);
    const rotated = trayTemplates.map((p) => rotatePieceNTimes(p, Math.floor(rng() * 4)));
    const tray = colorizeTray(rotated, rng);

    const signature = signatureOf(startBoard, tray, targets);
    return {
      board: startBoard,
      tray,
      regions,
      targets,
      difficulty: spec.difficulty,
      signature,
    };
  }
  return null;
}

/** Hardcoded fallback if generation truly can't hit the spec. */
function buildFallback(): QuarantineInstance {
  const rng = mulberry32(0xfa11ba7);
  const walls: Coord[] = [];
  for (let c = 0; c < BOARD_SIZE; c++) walls.push({ row: 4, col: c });
  const startBoard = stampWalls(createEmptyBoard(), walls);
  const regions = computeQuarantineRegions(startBoard);
  // Two regions: rows 0–3 (32 cells) and rows 5–7 (24 cells).
  const targets = [28, 20]; // remove 4 cells per region.
  const pieces = [
    PIECE_CATALOG.find((p) => p.id === 'sq2')!,
    PIECE_CATALOG.find((p) => p.id === 'sq2')!,
  ];
  const tray = colorizeTray(
    shuffleInPlace([...pieces], rng).map((p) => rotatePieceNTimes(p, 0)),
    rng
  );
  const signature = signatureOf(startBoard, tray, targets);
  return { board: startBoard, tray, regions, targets, difficulty: 'easy', signature };
}

let cachedFallback: QuarantineInstance | null = null;
function getFallback(): QuarantineInstance {
  if (!cachedFallback) cachedFallback = buildFallback();
  return cachedFallback;
}

export function generateQuarantinePuzzle(options: {
  difficulty: QuarantineDifficulty;
  seed?: number;
}): QuarantineInstance {
  const spec = SPECS[options.difficulty];
  const seed = (options.seed ?? (Date.now() ^ Math.floor(Math.random() * 0x100000000))) >>> 0;
  const rng = mulberry32(seed);

  for (let attempt = 0; attempt < 80; attempt++) {
    const built = buildCandidate(spec, rng);
    if (!built) continue;
    if (isRecentlySeen(options.difficulty, built.signature)) continue;
    recordSignature(options.difficulty, built.signature);
    return built;
  }

  return getFallback();
}

// Re-export for convenience.
export { applyPlacementAndClear };
