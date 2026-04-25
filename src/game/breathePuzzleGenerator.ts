import type { BoardGrid, BreatheDifficulty, Coord, PieceShape, TargetPattern } from './types';
import { BOARD_SIZE, COLORS } from './types';
import {
  applyPlacementAndClear,
  canPlacePiece,
  createEmptyBoard,
  hasSolid2x2,
  rotatePiece90Clockwise,
} from './board';
import { PIECE_CATALOG } from './pieces';

/**
 * Breathe mode puzzle generation.
 *
 * Breathe plays like Puzzle mode but with an extra win condition: the
 * final board must keep at least one hole in every 2×2 sub-square (no
 * fully-packed 2×2 anywhere). Mid-game the player is free to create
 * solid 2×2s — they only need to clear their way out before placing
 * the last piece. The generator therefore must produce a target shape
 * that itself satisfies the Breathe rule; if it doesn't, the puzzle is
 * unwinnable by definition.
 *
 * Strategy mirrors the classic puzzle generator: forward-simulate from
 * an empty board with the chosen pieces (random legal placements +
 * standard line clears) and snapshot the result as the target. After
 * simulation we reject any target that contains a solid 2×2; we also
 * apply standard quality filters (target cell count within band,
 * touches enough rows/cols to look interesting). Forward simulation
 * guarantees solvability — the simulation IS a valid solution. The
 * `hasSolid2x2` filter then guarantees the win check itself is
 * achievable.
 */

export type BreatheDifficultySpec = {
  difficulty: BreatheDifficulty;
  pieceCount: number;
  minPieceCells: number;
  maxPieceCells: number;
  minTargetCells: number;
  maxTargetCells: number;
};

const DIFFICULTY_SPECS: Record<BreatheDifficulty, BreatheDifficultySpec> = {
  easy: {
    difficulty: 'easy',
    pieceCount: 2,
    minPieceCells: 2,
    maxPieceCells: 3,
    minTargetCells: 4,
    maxTargetCells: 8,
  },
  normal: {
    difficulty: 'normal',
    pieceCount: 3,
    minPieceCells: 3,
    maxPieceCells: 4,
    minTargetCells: 8,
    maxTargetCells: 14,
  },
  hard: {
    difficulty: 'hard',
    pieceCount: 4,
    minPieceCells: 3,
    maxPieceCells: 5,
    minTargetCells: 12,
    maxTargetCells: 22,
  },
};

export function getBreatheDifficultySpec(d: BreatheDifficulty): BreatheDifficultySpec {
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

/**
 * Treat the target pattern as an occupancy grid and reuse `hasSolid2x2`
 * to check the Breathe rule. We project the boolean target onto a
 * sentinel-coloured BoardGrid so the same helper drives both the
 * generator's filter and the reducer's win check — there is exactly
 * one definition of "Breathe-legal" in the codebase.
 */
function targetSatisfiesBreathe(target: TargetPattern): boolean {
  const proj: BoardGrid = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(target[r][c] ? 'x' : null);
    }
    proj.push(row);
  }
  return !hasSolid2x2(proj);
}

function poolForSpec(spec: BreatheDifficultySpec): PieceShape[] {
  return PIECE_CATALOG.filter((p) => {
    const n = p.cells.length;
    return n >= spec.minPieceCells && n <= spec.maxPieceCells;
  });
}

function pickPieces(spec: BreatheDifficultySpec, rng: () => number): PieceShape[] {
  const pool = poolForSpec(spec);
  if (pool.length === 0) return [];
  const picked: PieceShape[] = [];
  for (let i = 0; i < spec.pieceCount; i++) {
    picked.push(sample(pool, rng));
  }
  return picked;
}

type BuiltPuzzle = {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
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

function simulateForward(
  startBoard: BoardGrid,
  pieces: PieceShape[],
  rng: () => number
): BoardGrid | null {
  let board = cloneBoard(startBoard);

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

  return board;
}

function buildCandidate(
  spec: BreatheDifficultySpec,
  rng: () => number
): BuiltPuzzle | null {
  for (let attempt = 0; attempt < 160; attempt++) {
    const pieces = pickPieces(spec, rng);
    if (pieces.length !== spec.pieceCount) continue;

    const startBoard = createEmptyBoard();
    const finalBoard = simulateForward(startBoard, pieces, rng);
    if (!finalBoard) continue;

    const target = boardToTarget(finalBoard);
    const targetCells = countTargetCells(target);
    if (targetCells < spec.minTargetCells) continue;
    if (targetCells > spec.maxTargetCells) continue;
    if (!isTargetShapeOk(target)) continue;
    // The whole point of Breathe: the WINNING board (== target) must
    // have at least one hole in every 2×2. If the simulation produced
    // a target with a packed 2×2, the puzzle is unwinnable — drop it
    // and roll again.
    if (!targetSatisfiesBreathe(target)) continue;

    const trayTemplates = shuffleInPlace([...pieces], rng);
    // Random rotations for visual variety, just like classic puzzle.
    const randomlyRotated = trayTemplates.map((piece) =>
      rotatePieceNTimes(piece, Math.floor(rng() * 4))
    );
    const tray = colorizeTray(randomlyRotated, rng);

    const signature = `${targetKey(target)}|${trayKey(tray)}`;
    return { board: startBoard, tray, target, signature };
  }
  return null;
}

const RECENT_SIGNATURE_LIMIT = 6;
const recentSignaturesByDifficulty = new Map<BreatheDifficulty, string[]>();

function recordSignature(d: BreatheDifficulty, signature: string) {
  const list = recentSignaturesByDifficulty.get(d) ?? [];
  list.push(signature);
  while (list.length > RECENT_SIGNATURE_LIMIT) list.shift();
  recentSignaturesByDifficulty.set(d, list);
}

function isRecentlySeen(d: BreatheDifficulty, signature: string): boolean {
  return recentSignaturesByDifficulty.get(d)?.includes(signature) ?? false;
}

/**
 * Hard-coded fallback used if generation repeatedly fails to meet a
 * spec. Two horizontal trominoes sit on separate rows (rows 1 and 5),
 * which trivially satisfies Breathe — no 2×2 can be solid because each
 * piece occupies only one row and they share no rows. The player still
 * gets a real Breathe puzzle even when the RNG fights us.
 */
function buildFallback(): BuiltPuzzle {
  const rng = mulberry32(0xb1ea7);
  const pieces = [
    PIECE_CATALOG.find((p) => p.id === 'h3')!,
    PIECE_CATALOG.find((p) => p.id === 'h3')!,
  ];
  // Hand-place two horizontal trominoes on different rows to guarantee
  // the resulting target is Breathe-legal regardless of the RNG.
  const target: TargetPattern = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );
  for (let c = 1; c <= 3; c++) target[1][c] = true;
  for (let c = 4; c <= 6; c++) target[5][c] = true;

  const tray = colorizeTray(
    shuffleInPlace([...pieces], rng).map((piece) =>
      rotatePieceNTimes(piece, Math.floor(rng() * 4))
    ),
    rng
  );
  return { board: createEmptyBoard(), tray, target, signature: 'breathe-fallback' };
}

const fallback = buildFallback();

export function generateBreathePuzzle(options: {
  difficulty?: BreatheDifficulty;
  seed?: number;
} = {}): {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  difficulty: BreatheDifficulty;
} {
  const difficulty = options.difficulty ?? 'easy';
  const spec = getBreatheDifficultySpec(difficulty);
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
      difficulty,
    };
  }

  return {
    board: cloneBoard(fallback.board),
    tray: fallback.tray.map((piece) => clonePiece(piece)),
    target: fallback.target.map((row) => [...row]),
    difficulty,
  };
}
