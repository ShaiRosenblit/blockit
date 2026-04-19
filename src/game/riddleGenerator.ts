import type { BoardGrid, Coord, PieceShape } from './types';
import { BOARD_SIZE, COLORS } from './types';
import {
  createEmptyBoard,
  canPlacePiece,
  rotatePiece90Clockwise,
  boardIsEmpty,
  applyPlacementAndClear,
} from './board';
import { PIECE_CATALOG } from './pieces';

/** Filled cells that belong to the riddle grid (not going in the tray). */
export const RIDDLE_GRID_COLOR = '#5c6b7a';
export const RIDDLE_TRAY_SIZE = 5;

const RECENT_SIGNATURE_LIMIT = 12;
const recentSignatures: string[] = [];
const TARGET_WINNING_OPENINGS = 1;
const MAX_WINNING_OPENINGS = 2;
const MAX_WINNING_BRANCHES = 3;
const MIN_LEGAL_OPENINGS = 10;

type Axis = 'row' | 'col';

/**
 * Hard riddle pool: prefer 4- and 5-cell shapes so the puzzle has fewer
 * obvious placements and more rotation burden.
 */
const RIDDLE_SHAPE_POOL = PIECE_CATALOG.filter((p) => {
  const n = p.cells.length;
  return n >= 4 && n <= 5;
});

type BandOption = {
  piece: PieceShape;
  axis: Axis;
  lineCount: 1 | 2;
  lineOffsets: number[];
};

type PositionedBand = {
  option: BandOption;
  origin: Coord;
};

type DifficultyStats = {
  legalOpenings: number;
  winningOpenings: number;
  winningBranches: number;
};

type BuiltRiddle = {
  board: BoardGrid;
  tray: PieceShape[];
  signature: string;
  stats: DifficultyStats;
};

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
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

function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) => [...row]);
}

function clonePiece(piece: PieceShape): PieceShape {
  return {
    ...piece,
    cells: piece.cells.map((cell) => ({ ...cell })),
  };
}

function pieceGeometryKey(piece: PieceShape): string {
  return piece.cells
    .map((cell) => `${cell.row},${cell.col}`)
    .sort()
    .join('|');
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

function remainingKey(pieces: PieceShape[]): string {
  return [...pieces]
    .map((p) => `${p.id}:${pieceGeometryKey(p)}`)
    .sort()
    .join(',');
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

function isStraightPiece(piece: PieceShape): boolean {
  const sameRow = piece.cells.every((cell) => cell.row === piece.cells[0].row);
  const sameCol = piece.cells.every((cell) => cell.col === piece.cells[0].col);
  return sameRow || sameCol;
}

function rotatePieceNTimes(piece: PieceShape, turns: number): PieceShape {
  let rotated = clonePiece(piece);
  for (let i = 0; i < turns; i++) {
    rotated = rotatePiece90Clockwise(rotated);
  }
  return rotated;
}

function rotateBoard90Clockwise(board: BoardGrid): BoardGrid {
  const next = createEmptyBoard();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      next[c][BOARD_SIZE - 1 - r] = board[r][c];
    }
  }
  return next;
}

function colorizeTray(pieces: PieceShape[], rng: () => number): PieceShape[] {
  const palette = shuffleInPlace([...COLORS], rng);
  return pieces.map((piece, index) => ({
    ...clonePiece(piece),
    color: palette[index % palette.length],
  }));
}

/**
 * Count solution branches up to a cap. Exported boolean helper uses this under
 * the hood so riddle generation can reason about uniqueness, not just solvability.
 */
type EnumeratedMove = {
  pieceIndex: number;
  piece: PieceShape;
  origin: Coord;
  nextBoard: BoardGrid;
  moveKey: string;
};

function filledCellCount(board: BoardGrid): number {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) count++;
    }
  }
  return count;
}

function enumerateMoves(board: BoardGrid, pieces: PieceShape[]): EnumeratedMove[] {
  const moves: EnumeratedMove[] = [];
  const seen = new Set<string>();

  for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
    const template = pieces[pieceIndex];
    const variants = orientations(template);

    for (const piece of variants) {
      const geometryKey = pieceGeometryKey(piece);
      for (let r = 0; r <= BOARD_SIZE - piece.height; r++) {
        for (let c = 0; c <= BOARD_SIZE - piece.width; c++) {
          const origin: Coord = { row: r, col: c };
          if (!canPlacePiece(board, piece, origin)) continue;

          const moveKey = `${geometryKey}@${r},${c}`;
          if (seen.has(moveKey)) continue;
          seen.add(moveKey);

          const nextBoard = applyPlacementAndClear(board, piece, origin);
          moves.push({
            pieceIndex,
            piece,
            origin,
            nextBoard,
            moveKey,
          });
        }
      }
    }
  }

  const before = filledCellCount(board);
  moves.sort((a, b) => {
    const progressA = before - filledCellCount(a.nextBoard);
    const progressB = before - filledCellCount(b.nextBoard);
    return progressB - progressA;
  });

  return moves;
}

function countSolutionsCapped(
  board: BoardGrid,
  pieces: PieceShape[],
  cap: number,
  memo: Map<string, number>
): number {
  if (boardIsEmpty(board)) return 1;
  if (pieces.length === 0) return 0;

  const stateKey = `${occupancyKey(board)}|${remainingKey(pieces)}`;
  const cached = memo.get(stateKey);
  if (cached !== undefined) return Math.min(cached, cap);

  let total = 0;
  const moves = enumerateMoves(board, pieces);
  for (const move of moves) {
    const rest = pieces.filter((_, idx) => idx !== move.pieceIndex);
    total += countSolutionsCapped(move.nextBoard, rest, cap - total, memo);
    if (total >= cap) {
      memo.set(stateKey, cap);
      return cap;
    }
  }

  memo.set(stateKey, total);
  return total;
}

export function canClearBoard(board: BoardGrid, pieces: PieceShape[]): boolean {
  return countSolutionsCapped(board, pieces, 1, new Map()) > 0;
}

const ROW_BAND_OPTIONS: BandOption[] = RIDDLE_SHAPE_POOL.flatMap((piece) => {
  const options: BandOption[] = [];
  for (const variant of orientations(piece)) {
    const rowsTouched = uniqueSorted(variant.cells.map((cell) => cell.row));
    if (variant.height > 2) continue;
    if (rowsTouched.length !== variant.height) continue;
    options.push({
      piece: variant,
      axis: 'row',
      lineCount: rowsTouched.length as 1 | 2,
      lineOffsets: rowsTouched,
    });
  }
  return options;
});

function assignBandStarts(lineCounts: Array<1 | 2>, rng: () => number): number[] | null {
  for (let attempt = 0; attempt < 80; attempt++) {
    const starts = new Array<number>(lineCounts.length).fill(-1);
    const used = Array.from({ length: BOARD_SIZE }, () => false);
    const order = shuffleInPlace(lineCounts.map((lineCount, index) => ({ lineCount, index })), rng);
    let ok = true;

    for (const { lineCount, index } of order) {
      const candidates: number[] = [];
      for (let start = 0; start <= BOARD_SIZE - lineCount; start++) {
        let fits = true;
        for (let offset = 0; offset < lineCount; offset++) {
          if (used[start + offset]) {
            fits = false;
            break;
          }
        }
        if (fits) candidates.push(start);
      }
      if (candidates.length === 0) {
        ok = false;
        break;
      }
      const start = sample(candidates, rng);
      starts[index] = start;
      for (let offset = 0; offset < lineCount; offset++) {
        used[start + offset] = true;
      }
    }

    if (ok) return starts;
  }

  return null;
}

function buildBoardFromBands(positionedBands: PositionedBand[]): { board: BoardGrid; tray: PieceShape[] } {
  const board = createEmptyBoard();
  const tray: PieceShape[] = [];

  for (const { option, origin } of positionedBands) {
    for (const offset of option.lineOffsets) {
      if (option.axis === 'row') {
        const boardRow = origin.row + offset;
        for (let c = 0; c < BOARD_SIZE; c++) {
          board[boardRow][c] = RIDDLE_GRID_COLOR;
        }
      } else {
        const boardCol = origin.col + offset;
        for (let r = 0; r < BOARD_SIZE; r++) {
          board[r][boardCol] = RIDDLE_GRID_COLOR;
        }
      }
    }

    for (const cell of option.piece.cells) {
      board[origin.row + cell.row][origin.col + cell.col] = null;
    }

    tray.push(clonePiece(option.piece));
  }

  return { board, tray };
}

function verifyBandSolution(
  board: BoardGrid,
  positionedBands: PositionedBand[]
): boolean {
  let next = cloneBoard(board);

  for (const { option, origin } of positionedBands) {
    if (!canPlacePiece(next, option.piece, origin)) return false;
    next = applyPlacementAndClear(next, option.piece, origin);
  }

  return boardIsEmpty(next);
}

function chooseRowOnlyBandOptions(rng: () => number): BandOption[] | null {
  for (let attempt = 0; attempt < 320; attempt++) {
    const picked = shuffleInPlace([...ROW_BAND_OPTIONS], rng).slice(0, RIDDLE_TRAY_SIZE);
    if (picked.length !== RIDDLE_TRAY_SIZE) return null;

    const totalLines = picked.reduce((sum, option) => sum + option.lineCount, 0);
    if (totalLines < 6 || totalLines > 8) continue;

    const distinctIds = new Set(picked.map((option) => option.piece.id));
    if (distinctIds.size < 4) continue;

    const twoLineCount = picked.filter((option) => option.lineCount === 2).length;
    if (twoLineCount < 2) continue;

    const largeCount = picked.filter((option) => option.piece.cells.length === 5).length;
    if (largeCount < 2) continue;

    const nonStraightCount = picked.filter((option) => !isStraightPiece(option.piece)).length;
    if (nonStraightCount < 3) continue;

    return picked;
  }

  return null;
}

function rotateRiddle(
  board: BoardGrid,
  tray: PieceShape[],
  turns: number
): { board: BoardGrid; tray: PieceShape[] } {
  let nextBoard = cloneBoard(board);
  let nextTray = tray.map((piece) => clonePiece(piece));

  for (let i = 0; i < turns; i++) {
    nextBoard = rotateBoard90Clockwise(nextBoard);
    nextTray = nextTray.map((piece) => rotatePiece90Clockwise(piece));
  }

  return { board: nextBoard, tray: nextTray };
}

function analyzeDifficulty(board: BoardGrid, tray: PieceShape[]): DifficultyStats {
  const openings = enumerateMoves(board, tray);
  let winningOpenings = 0;
  let winningBranches = 0;
  const memo = new Map<string, number>();

  for (const move of openings) {
    const remaining = tray.filter((_, idx) => idx !== move.pieceIndex);
    const branches = countSolutionsCapped(
      move.nextBoard,
      remaining,
      MAX_WINNING_BRANCHES + 1 - winningBranches,
      memo
    );
    if (branches > 0) {
      winningOpenings++;
      winningBranches += branches;
      if (winningOpenings > MAX_WINNING_OPENINGS || winningBranches > MAX_WINNING_BRANCHES) {
        break;
      }
    }
  }

  return {
    legalOpenings: openings.length,
    winningOpenings,
    winningBranches: Math.min(winningBranches, MAX_WINNING_BRANCHES + 1),
  };
}

function difficultyScore(stats: DifficultyStats): number {
  const openingPenalty = stats.winningOpenings * 120;
  const branchPenalty = stats.winningBranches * 80;
  const rewardForOptions = Math.min(stats.legalOpenings, 24) * 4;
  const targetBonus = stats.winningOpenings === TARGET_WINNING_OPENINGS ? 90 : 0;
  return rewardForOptions + targetBonus - openingPenalty - branchPenalty;
}

function buildCandidate(rng: () => number): BuiltRiddle | null {
  const options = chooseRowOnlyBandOptions(rng);
  if (!options) return null;

  for (let positionAttempt = 0; positionAttempt < 12; positionAttempt++) {
    const bandStarts = assignBandStarts(options.map((option) => option.lineCount), rng);
    if (!bandStarts) continue;

    const positioned = options.map((option, index) => ({
      option,
      origin: {
        row: bandStarts[index],
        col: Math.floor(rng() * (BOARD_SIZE - option.piece.width + 1)),
      },
    }));

    const base = buildBoardFromBands(positioned);
    if (!verifyBandSolution(base.board, positioned)) continue;

    const turns = Math.floor(rng() * 4);
    let { board, tray } = rotateRiddle(base.board, base.tray, turns);

    tray = tray.map((piece) => rotatePieceNTimes(piece, Math.floor(rng() * 4)));
    tray = colorizeTray(shuffleInPlace([...tray], rng), rng);

    const stats = analyzeDifficulty(board, tray);
    const pieceKey = [...tray].map((piece) => piece.id).sort().join(',');
    const signature = `${occupancyKey(board)}|${pieceKey}`;
    return { board, tray, signature, stats };
  }

  return null;
}

function recordSignature(signature: string): void {
  recentSignatures.push(signature);
  while (recentSignatures.length > RECENT_SIGNATURE_LIMIT) {
    recentSignatures.shift();
  }
}

function buildFallbackRiddle(): BuiltRiddle {
  const pickRow = (id: string) => {
    const option = ROW_BAND_OPTIONS.find((candidate) => candidate.piece.id === id);
    if (!option) throw new Error(`Missing fallback piece ${id}`);
    return option;
  };

  const positioned: PositionedBand[] = [
    { option: pickRow('h4'), origin: { row: 0, col: 1 } },
    { option: pickRow('h5'), origin: { row: 1, col: 2 } },
    { option: pickRow('h4'), origin: { row: 2, col: 0 } },
    { option: pickRow('sq2'), origin: { row: 4, col: 4 } },
    { option: pickRow('p5'), origin: { row: 6, col: 1 } },
  ];

  const built = buildBoardFromBands(positioned);
  if (!verifyBandSolution(built.board, positioned)) {
    throw new Error('Fallback riddle construction failed.');
  }

  const tray = colorizeTray(built.tray, mulberry32(0x51ced));
  const signature = `${occupancyKey(built.board)}|${tray.map((piece) => piece.id).sort().join(',')}`;
  return {
    board: built.board,
    tray,
    signature,
    stats: analyzeDifficulty(built.board, tray),
  };
}

const fallbackRiddle = buildFallbackRiddle();

export function generateRiddle(seedHint?: number): {
  board: BoardGrid;
  tray: PieceShape[];
} {
  const seed = (seedHint ?? (Date.now() ^ Math.floor(Math.random() * 0x100000000))) >>> 0;
  const rng = mulberry32(seed);
  let best: BuiltRiddle | null = null;

  for (let attempt = 0; attempt < 48; attempt++) {
    const built = buildCandidate(rng);
    if (!built) continue;
    if (recentSignatures.includes(built.signature)) continue;

    const isElite =
      built.stats.legalOpenings >= MIN_LEGAL_OPENINGS &&
      built.stats.winningOpenings <= TARGET_WINNING_OPENINGS &&
      built.stats.winningBranches <= 2;

    if (isElite) {
      recordSignature(built.signature);
      return {
        board: cloneBoard(built.board),
        tray: built.tray.map((piece) => clonePiece(piece)),
      };
    }

    if (!best || difficultyScore(built.stats) > difficultyScore(best.stats)) {
      best = built;
    }
  }

  if (best && !recentSignatures.includes(best.signature)) {
    recordSignature(best.signature);
    return {
      board: cloneBoard(best.board),
      tray: best.tray.map((piece) => clonePiece(piece)),
    };
  }

  recordSignature(fallbackRiddle.signature);
  return {
    board: cloneBoard(fallbackRiddle.board),
    tray: fallbackRiddle.tray.map((piece) => clonePiece(piece)),
  };
}

export function debugRiddleSearch(seedHint: number): {
  usedFallback: boolean;
  bestStats: DifficultyStats | null;
  bestSignature: string | null;
} {
  const rng = mulberry32(seedHint >>> 0);
  let best: BuiltRiddle | null = null;

  for (let attempt = 0; attempt < 48; attempt++) {
    const built = buildCandidate(rng);
    if (!built) continue;
    if (!best || difficultyScore(built.stats) > difficultyScore(best.stats)) {
      best = built;
    }
  }

  return {
    usedFallback: best === null,
    bestStats: best?.stats ?? null,
    bestSignature: best?.signature ?? null,
  };
}
