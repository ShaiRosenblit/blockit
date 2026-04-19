import type { BoardGrid, Coord, PieceShape, TargetPattern } from './types';
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
 * Riddle mode: the player is shown a **target pattern** and must end the round
 * with the board's occupancy matching it exactly — every target cell filled,
 * every non-target cell empty. Row/column clears still trigger during play and
 * are a core planning tool for removing unwanted starting fill, so the puzzle
 * is about *which pieces go where and in what order*, not just jigsaw fitting.
 *
 * Generator strategy (v1): forward-simulation.
 *   - Start from an empty board.
 *   - Place K random pieces, one at a time, in random legal positions. Normal
 *     clear rules apply during the sim.
 *   - The resulting board occupancy is the target.
 *   - The tray given to the player is those same pieces, shuffled and randomly
 *     rotated so they don't see the solution pre-baked.
 * This guarantees solvability (the sim itself is a valid solution). Quality
 * filters reject generations that land on dull targets (too small, too linear).
 */

export const RIDDLE_TRAY_MIN = 3;
export const RIDDLE_TRAY_MAX = 5;

const RECENT_SIGNATURE_LIMIT = 16;
const recentSignatures: string[] = [];

type BuiltRiddle = {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  signature: string;
};

/**
 * Prefer mid-size pieces (3–5 cells). Pentominoes force thought; dominoes and
 * monominoes make riddles feel trivial.
 */
const RIDDLE_SHAPE_POOL = PIECE_CATALOG.filter((p) => {
  const n = p.cells.length;
  return n >= 3 && n <= 5;
});

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

/**
 * Pick K pieces favoring mid-size shapes; cap the total cell count so riddles
 * don't require covering the whole board.
 */
function pickPieces(k: number, rng: () => number): PieceShape[] {
  const MAX_TOTAL_CELLS = 22;
  for (let attempt = 0; attempt < 60; attempt++) {
    const pool = shuffleInPlace([...RIDDLE_SHAPE_POOL], rng);
    const picked: PieceShape[] = [];
    let totalCells = 0;
    for (const piece of pool) {
      if (picked.length === k) break;
      if (totalCells + piece.cells.length > MAX_TOTAL_CELLS) continue;
      picked.push(piece);
      totalCells += piece.cells.length;
    }
    if (picked.length === k && totalCells >= k * 3) return picked;
  }
  // Fallback: take first k shapes regardless of size budget.
  return shuffleInPlace([...RIDDLE_SHAPE_POOL], rng).slice(0, k);
}

type SimStep = { piece: PieceShape; origin: Coord };

/**
 * Try to place all pieces (in the given order) on the board, choosing a
 * random legal placement at each step. Returns the step log and final board,
 * or null if we got stuck.
 */
function simulateForward(
  startBoard: BoardGrid,
  pieces: PieceShape[],
  rng: () => number
): { board: BoardGrid; steps: SimStep[] } | null {
  let board: BoardGrid = startBoard.map((row) => [...row]);
  const steps: SimStep[] = [];

  for (const template of pieces) {
    const orientationsList = orientations(template);
    const placements: { piece: PieceShape; origin: Coord }[] = [];
    for (const piece of orientationsList) {
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
    steps.push({ piece: choice.piece, origin: choice.origin });
  }

  return { board, steps };
}

/**
 * Reject generations where the target is uninteresting:
 * - too few filled cells (trivial)
 * - too many (fills most of the board)
 * - confined to a single row or column (looks like a stripe, boring)
 * - not well-distributed across the board
 */
function isTargetInteresting(target: TargetPattern): boolean {
  let count = 0;
  const rowsTouched = new Set<number>();
  const colsTouched = new Set<number>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (target[r][c]) {
        count++;
        rowsTouched.add(r);
        colsTouched.add(c);
      }
    }
  }
  if (count < 5) return false;
  if (count > 26) return false;
  if (rowsTouched.size < 2) return false;
  if (colsTouched.size < 2) return false;
  return true;
}

/**
 * BFS over (occupancy, remaining multiset) checking whether the multiset of
 * pieces can be placed in some order to end with the given target pattern.
 * Exported for tests and dev-time level validation.
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

function buildCandidate(rng: () => number): BuiltRiddle | null {
  const k = RIDDLE_TRAY_MIN + Math.floor(rng() * (RIDDLE_TRAY_MAX - RIDDLE_TRAY_MIN + 1));
  const pieces = pickPieces(k, rng);
  const startBoard = createEmptyBoard();

  // A single forward simulation may get stuck or produce a boring target; try
  // a handful of placement orders / rolls before giving up on this piece set.
  for (let attempt = 0; attempt < 12; attempt++) {
    const order = shuffleInPlace([...pieces], rng);
    const sim = simulateForward(startBoard, order, rng);
    if (!sim) continue;

    const target = boardToTarget(sim.board);
    if (!isTargetInteresting(target)) continue;

    // Build the player's tray: same pieces, shuffled order, random rotations.
    const trayTemplates = shuffleInPlace([...pieces], rng);
    const randomlyRotated = trayTemplates.map((piece) => rotatePieceNTimes(piece, Math.floor(rng() * 4)));
    const tray = colorizeTray(randomlyRotated, rng);

    const signature = `${targetKey(target)}|${remainingKey(tray)}`;
    return { board: startBoard, tray, target, signature };
  }

  return null;
}

function recordSignature(signature: string): void {
  recentSignatures.push(signature);
  while (recentSignatures.length > RECENT_SIGNATURE_LIMIT) {
    recentSignatures.shift();
  }
}

/**
 * Fallback riddle used only when random generation repeatedly fails to meet
 * the quality bar. Hand-crafted so it is known to be solvable.
 */
function buildFallbackRiddle(): BuiltRiddle {
  const rng = mulberry32(0xfa11ba7);
  const pieces = [
    PIECE_CATALOG.find((p) => p.id === 'h4')!,
    PIECE_CATALOG.find((p) => p.id === 'sq2')!,
    PIECE_CATALOG.find((p) => p.id === 'l1')!,
    PIECE_CATALOG.find((p) => p.id === 'h3')!,
  ];
  const startBoard = createEmptyBoard();
  const sim = simulateForward(startBoard, pieces, rng);
  if (!sim) throw new Error('Fallback riddle simulation failed.');
  const target = boardToTarget(sim.board);
  const tray = colorizeTray(
    shuffleInPlace([...pieces], rng).map((piece) => rotatePieceNTimes(piece, Math.floor(rng() * 4))),
    rng
  );
  const signature = `${targetKey(target)}|${remainingKey(tray)}`;
  return { board: startBoard, tray, target, signature };
}

const fallbackRiddle = buildFallbackRiddle();

export function generateRiddle(seedHint?: number): {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
} {
  const seed = (seedHint ?? (Date.now() ^ Math.floor(Math.random() * 0x100000000))) >>> 0;
  const rng = mulberry32(seed);

  for (let attempt = 0; attempt < 60; attempt++) {
    const built = buildCandidate(rng);
    if (!built) continue;
    if (recentSignatures.includes(built.signature)) continue;
    recordSignature(built.signature);
    return {
      board: built.board.map((row) => [...row]),
      tray: built.tray.map((piece) => clonePiece(piece)),
      target: built.target.map((row) => [...row]),
    };
  }

  recordSignature(fallbackRiddle.signature);
  return {
    board: fallbackRiddle.board.map((row) => [...row]),
    tray: fallbackRiddle.tray.map((piece) => clonePiece(piece)),
    target: fallbackRiddle.target.map((row) => [...row]),
  };
}
