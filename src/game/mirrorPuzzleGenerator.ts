import type { BoardGrid, Coord, MirrorDifficulty, PieceShape, TargetPattern } from './types';
import { BOARD_SIZE, COLORS } from './types';
import {
  canPlacePieceMirrored,
  clearLines,
  createEmptyBoard,
  detectCompletedLines,
  placePieceMirrored,
  rotatePiece90Clockwise,
} from './board';
import { PIECE_CATALOG } from './pieces';

/**
 * Mirror mode puzzle generation.
 *
 * Mirror mode plays like Puzzle mode but every placement also writes its
 * horizontal reflection (about the vertical axis between cols 3 and 4)
 * to the board as part of the same atomic step.
 *
 * The mirror constraint is only interesting if the player has to consider
 * BOTH halves at once — without something breaking symmetry, picking a
 * placement on the left trivially auto-solves the right. So every mirror
 * puzzle starts with a sprinkling of asymmetric blocker cells, placed
 * with the strict invariant that NO blocker has a blocker at its mirror
 * partner. This means the left and right halves end up with two
 * different sets of "off-limits" cells, so a placement is only valid if
 * it dodges blockers on BOTH sides — neither half alone is enough to
 * solve.
 *
 * The target is built by forward simulation: starting from the
 * blocker-bearing board, we play a sequence of mirrored placements (with
 * row/column clears applied as they trigger) and snapshot the result.
 * Forward simulation guarantees solvability — the simulation IS a valid
 * solution. We additionally require the target to be visibly asymmetric
 * (otherwise the blockers cancelled out and we wasted them); generation
 * retries until that holds.
 */

const BLOCKER_COLOR = '#4a5168';

export type MirrorDifficultySpec = {
  difficulty: MirrorDifficulty;
  pieceCount: number;
  minPieceCells: number;
  maxPieceCells: number;
  /** Asymmetric blockers seeded onto the starting board. */
  blockerCount: number;
  minTargetCells: number;
  maxTargetCells: number;
};

const DIFFICULTY_SPECS: Record<MirrorDifficulty, MirrorDifficultySpec> = {
  easy: {
    difficulty: 'easy',
    pieceCount: 2,
    minPieceCells: 2,
    maxPieceCells: 3,
    blockerCount: 3,
    minTargetCells: 7,
    maxTargetCells: 16,
  },
  normal: {
    difficulty: 'normal',
    pieceCount: 3,
    minPieceCells: 3,
    maxPieceCells: 4,
    blockerCount: 5,
    minTargetCells: 14,
    maxTargetCells: 28,
  },
  hard: {
    difficulty: 'hard',
    pieceCount: 4,
    minPieceCells: 3,
    maxPieceCells: 4,
    blockerCount: 7,
    minTargetCells: 20,
    maxTargetCells: 38,
  },
};

export function getMirrorDifficultySpec(d: MirrorDifficulty): MirrorDifficultySpec {
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
 * The whole point of Mirror mode is that the player has to think about
 * both halves at once. If the target ends up perfectly symmetric (e.g.
 * all blockers got cancelled out by clears during simulation), the
 * puzzle collapses back into a trivial half-board exercise. Reject any
 * such target so we keep regenerating until asymmetry survives.
 */
function isTargetAsymmetric(target: TargetPattern): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE / 2; c++) {
      if (target[r][c] !== target[r][BOARD_SIZE - 1 - c]) return true;
    }
  }
  return false;
}

/**
 * Seed the starting board with `count` blocker cells, scattered such
 * that NO blocker shares its row with a blocker at its mirror column.
 * This is what makes left-half and right-half thinking BOTH necessary:
 * a placement at (r, c) is only valid when neither (r, c) nor its
 * mirror (r, 7-c) collides with a blocker, and the two sets of blockers
 * are disjoint by construction.
 */
function placeBlockers(count: number, rng: () => number): BoardGrid {
  const board = createEmptyBoard();
  const positions: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      positions.push({ row: r, col: c });
    }
  }
  shuffleInPlace(positions, rng);

  let placed = 0;
  for (const p of positions) {
    if (placed >= count) break;
    const mirror = BOARD_SIZE - 1 - p.col;
    // Skip if the mirror partner is already a blocker — pairs cancel
    // out and contribute zero asymmetry.
    if (board[p.row][mirror] !== null) continue;
    board[p.row][p.col] = BLOCKER_COLOR;
    placed++;
  }
  return board;
}

function poolForSpec(spec: MirrorDifficultySpec): PieceShape[] {
  return PIECE_CATALOG.filter((p) => {
    const n = p.cells.length;
    return n >= spec.minPieceCells && n <= spec.maxPieceCells;
  });
}

function pickPieces(spec: MirrorDifficultySpec, rng: () => number): PieceShape[] {
  const pool = poolForSpec(spec);
  if (pool.length === 0) return [];
  const picked: PieceShape[] = [];
  for (let i = 0; i < spec.pieceCount; i++) {
    picked.push(sample(pool, rng));
  }
  return picked;
}

/**
 * Apply a mirrored placement, then immediately clear any rows/columns
 * that became full. Mirrors `applyPlacementAndClear` for Mirror mode.
 * Note: with asymmetric blockers seeded on the starting board, a row
 * or column clear can absorb blockers asymmetrically (e.g. a column
 * clear on col 2 wipes a blocker there but leaves col 5 untouched if
 * col 5 wasn't full). That's exactly the kind of asymmetric target
 * we want, so we don't try to suppress it.
 */
function applyMirroredPlacementAndClear(
  board: BoardGrid,
  piece: PieceShape,
  origin: Coord
): BoardGrid {
  let next = placePieceMirrored(board, piece, origin);
  const { rows, cols } = detectCompletedLines(next);
  if (rows.length > 0 || cols.length > 0) {
    next = clearLines(next, rows, cols);
  }
  return next;
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

function simulateForwardMirrored(
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
          if (canPlacePieceMirrored(board, piece, origin)) {
            placements.push({ piece, origin });
          }
        }
      }
    }
    if (placements.length === 0) return null;
    const choice = sample(placements, rng);
    board = applyMirroredPlacementAndClear(board, choice.piece, choice.origin);
  }

  return board;
}

function buildCandidate(
  spec: MirrorDifficultySpec,
  rng: () => number
): BuiltPuzzle | null {
  for (let attempt = 0; attempt < 120; attempt++) {
    const pieces = pickPieces(spec, rng);
    if (pieces.length !== spec.pieceCount) continue;

    const startBoard = placeBlockers(spec.blockerCount, rng);
    const finalBoard = simulateForwardMirrored(startBoard, pieces, rng);
    if (!finalBoard) continue;

    const target = boardToTarget(finalBoard);
    const targetCells = countTargetCells(target);
    if (targetCells < spec.minTargetCells) continue;
    if (targetCells > spec.maxTargetCells) continue;
    if (!isTargetShapeOk(target)) continue;
    // Without this, blockers that all happened to land in a row/col
    // that got cleared during simulation would leave us with a
    // perfectly symmetric target — i.e. the trivial half-puzzle the
    // whole "asymmetric blockers" idea was meant to avoid.
    if (!isTargetAsymmetric(target)) continue;

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
const recentSignaturesByDifficulty = new Map<MirrorDifficulty, string[]>();

function recordSignature(d: MirrorDifficulty, signature: string) {
  const list = recentSignaturesByDifficulty.get(d) ?? [];
  list.push(signature);
  while (list.length > RECENT_SIGNATURE_LIMIT) list.shift();
  recentSignaturesByDifficulty.set(d, list);
}

function isRecentlySeen(d: MirrorDifficulty, signature: string): boolean {
  return recentSignaturesByDifficulty.get(d)?.includes(signature) ?? false;
}

/**
 * Hard-coded fallback used if generation repeatedly fails to meet a
 * spec. Two horizontal trominoes plus a couple of asymmetric blockers
 * give us a small but legitimately asymmetric Mirror puzzle, so the
 * player still gets the real mechanic even when the RNG let us down.
 */
function buildFallback(): BuiltPuzzle {
  const rng = mulberry32(0xab4ba5e);
  const pieces = [
    PIECE_CATALOG.find((p) => p.id === 'h2')!,
    PIECE_CATALOG.find((p) => p.id === 'h3')!,
  ];
  const startBoard = createEmptyBoard();
  startBoard[1][1] = BLOCKER_COLOR;
  startBoard[6][5] = BLOCKER_COLOR;
  const finalBoard = simulateForwardMirrored(startBoard, pieces, rng);
  if (!finalBoard) throw new Error('Mirror fallback simulation failed.');
  const target = boardToTarget(finalBoard);
  const tray = colorizeTray(
    shuffleInPlace([...pieces], rng).map((piece) =>
      rotatePieceNTimes(piece, Math.floor(rng() * 4))
    ),
    rng
  );
  return { board: startBoard, tray, target, signature: 'mirror-fallback' };
}

const fallback = buildFallback();

export function generateMirrorPuzzle(options: {
  difficulty?: MirrorDifficulty;
  seed?: number;
} = {}): {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  difficulty: MirrorDifficulty;
} {
  const difficulty = options.difficulty ?? 'easy';
  const spec = getMirrorDifficultySpec(difficulty);
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
