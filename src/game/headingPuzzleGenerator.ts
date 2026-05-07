import type {
  BoardGrid,
  Coord,
  Heading,
  HeadingDifficulty,
  PieceShape,
  TargetPattern,
} from './types';
import { BOARD_SIZE, COLORS } from './types';
import {
  canPlacePiece,
  clearLinesHeadingHalf,
  createEmptyBoard,
  detectCompletedLines,
  placePiece,
  rotatePiece90Clockwise,
} from './board';
import { PIECE_CATALOG } from './pieces';

/**
 * Heading mode puzzle generation.
 *
 * Heading plays like Puzzle mode but every placement records a "heading"
 * derived from its current rotation index (0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
 * relative to the canonical orientation in `PIECE_CATALOG`). When that
 * placement triggers a row or column clear, the heading restricts the
 * clear to only one half of the line — the other half stays filled even
 * though it was "complete". UP/DOWN bite column clears; LEFT/RIGHT bite
 * row clears; the perpendicular axis still erases the full line. Pieces
 * whose canonical orientation is rotation-invariant (the monomino, the
 * 2×2 and 3×3 squares, and the X-pentomino plus) carry a special FULL
 * heading and revert to Classic line-clear semantics.
 *
 * Strategy mirrors the Breathe / classic puzzle generator: forward-
 * simulate from an empty board with the chosen pieces (random legal
 * placement at a random rotation each step) and snapshot the result as
 * the target. Forward simulation guarantees solvability — the simulation
 * IS a valid solution. A `minHalfClears` quality filter rejects traces
 * that never exercised the half-clear mechanic on Normal/Hard, so the
 * mode doesn't degenerate into Classic-with-pretty-arrows.
 */

export type HeadingDifficultySpec = {
  difficulty: HeadingDifficulty;
  pieceCount: number;
  minPieceCells: number;
  maxPieceCells: number;
  minTargetCells: number;
  maxTargetCells: number;
  /**
   * Minimum number of half-clears (clears whose heading was a cardinal
   * direction, not FULL) the generator's reference solution must contain.
   * Easy stays at 0 — short trays may legitimately solve without ever
   * triggering a clear; Normal and Hard require at least one resp. two.
   */
  minHalfClears: number;
};

const DIFFICULTY_SPECS: Record<HeadingDifficulty, HeadingDifficultySpec> = {
  easy: {
    difficulty: 'easy',
    pieceCount: 2,
    minPieceCells: 2,
    maxPieceCells: 3,
    minTargetCells: 4,
    maxTargetCells: 8,
    minHalfClears: 0,
  },
  normal: {
    difficulty: 'normal',
    pieceCount: 3,
    minPieceCells: 3,
    maxPieceCells: 4,
    minTargetCells: 8,
    maxTargetCells: 14,
    minHalfClears: 1,
  },
  hard: {
    difficulty: 'hard',
    pieceCount: 4,
    minPieceCells: 3,
    maxPieceCells: 5,
    minTargetCells: 12,
    maxTargetCells: 22,
    minHalfClears: 2,
  },
};

export function getHeadingDifficultySpec(d: HeadingDifficulty): HeadingDifficultySpec {
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

/**
 * Piece ids whose canonical orientation is rotation-invariant: rotating
 * doesn't change cells, so heading is undefined. These pieces carry the
 * FULL heading sentinel and follow Classic clear semantics.
 *
 * Hard-coded as a tight set rather than computed from `orientations`
 * length so the membership test is constant-time and the rule is one
 * obvious place to read or edit.
 */
const SYMMETRIC_PIECE_IDS: ReadonlySet<string> = new Set([
  'dot',   // monomino
  'sq2',   // 2×2 square
  'sq3',   // 3×3 square
  'plus',  // X-pentomino (+)
]);

/**
 * Return the Heading for a piece given its rotation count modulo 4.
 * Symmetric pieces always return `'full'` regardless of rotation count
 * (rotating them yields the same shape, so per-rotation headings would
 * be a lie). All other pieces map rot 0/1/2/3 → UP/RIGHT/DOWN/LEFT.
 *
 * Pieces with only 2 distinct orientations (dominoes, I-trominoes,
 * I-tetromino, I-pentomino, S/Z) still get all 4 heading values via this
 * mapping — the player can rotate to a "180° equivalent" rotation that
 * looks identical but carries a different heading. This is a feature,
 * not a bug: it gives those pieces full heading flexibility, matching
 * the spec's "rotation count, not visual orientation" rule.
 */
export function headingForPiece(piece: PieceShape): Heading {
  if (SYMMETRIC_PIECE_IDS.has(piece.id)) return 'full';
  const rot = piece.heading ?? 0;
  switch (rot) {
    case 0: return 'up';
    case 1: return 'right';
    case 2: return 'down';
    case 3: return 'left';
  }
}

/**
 * Compass-arrow glyph for a Heading, used in tray-slot overlays and the
 * status text. FULL is rendered as a small bullet to communicate "no
 * direction" at a glance — distinct from any of the cardinal arrows.
 */
export function headingGlyph(h: Heading): string {
  switch (h) {
    case 'up': return '↑';     // ↑
    case 'right': return '→';  // →
    case 'down': return '↓';   // ↓
    case 'left': return '←';   // ←
    case 'full': return '•';   // •
  }
}

/**
 * Enumerate all distinct rotational orientations of a piece (1..4),
 * preserving the input as the rot-0 baseline. Two orientations count as
 * the same when their (sorted) cell-coordinate signatures match. Every
 * returned piece carries its rotation index in `heading` so callers can
 * later compute the half-clear direction without re-deriving the index.
 */
function orientationsWithHeading(piece: PieceShape): PieceShape[] {
  const seen = new Set<string>();
  const out: PieceShape[] = [];
  let p = clonePiece(piece);
  for (let rot = 0; rot < 4; rot++) {
    const key = p.cells
      .map((c) => `${c.row},${c.col}`)
      .sort()
      .join('|');
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ ...clonePiece(p), heading: (rot % 4) as 0 | 1 | 2 | 3 });
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

function poolForSpec(spec: HeadingDifficultySpec): PieceShape[] {
  return PIECE_CATALOG.filter((p) => {
    const n = p.cells.length;
    return n >= spec.minPieceCells && n <= spec.maxPieceCells;
  });
}

function pickPieces(spec: HeadingDifficultySpec, rng: () => number): PieceShape[] {
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
    .map((p) => `${p.id}@${p.heading ?? 0}`)
    .sort()
    .join(',');
}

/**
 * Forward simulation result: the final board after every piece has been
 * placed, plus the count of half-clears that fired during the trace.
 * Half-clears = clears whose heading was a cardinal direction (UP / DOWN
 * / LEFT / RIGHT), not the FULL sentinel — i.e. clears that left
 * residue. Used by the quality filter to guarantee the mechanic is
 * actually exercised on Normal / Hard.
 */
type SimResult = {
  board: BoardGrid;
  halfClears: number;
};

/**
 * Walk the piece list, placing each one at a random legal (orientation,
 * origin). After each placement, run the heading-aware clear: row/col
 * clears erase only the heading's half (or the full line for FULL).
 * Returns null if any piece had no legal placements (board too crowded
 * for the chosen orientation set) — caller retries with a fresh sample.
 */
function simulateForward(
  startBoard: BoardGrid,
  pieces: PieceShape[],
  rng: () => number
): SimResult | null {
  let board = cloneBoard(startBoard);
  let halfClears = 0;

  for (const template of pieces) {
    const placements: { piece: PieceShape; origin: Coord }[] = [];
    for (const piece of orientationsWithHeading(template)) {
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
    board = placePiece(board, choice.piece, choice.origin);
    const { rows, cols } = detectCompletedLines(board);
    if (rows.length > 0 || cols.length > 0) {
      const heading = headingForPiece(choice.piece);
      // A "half-clear" is any clear event whose heading was a cardinal
      // direction — those are the ones that leave residue, which is the
      // signature behaviour the quality filter wants to guarantee.
      if (heading !== 'full') halfClears++;
      board = clearLinesHeadingHalf(board, rows, cols, heading);
    }
  }

  return { board, halfClears };
}

function buildCandidate(
  spec: HeadingDifficultySpec,
  rng: () => number
): BuiltPuzzle | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const pieces = pickPieces(spec, rng);
    if (pieces.length !== spec.pieceCount) continue;

    const startBoard = createEmptyBoard();
    const result = simulateForward(startBoard, pieces, rng);
    if (!result) continue;
    if (result.halfClears < spec.minHalfClears) continue;

    const target = boardToTarget(result.board);
    const targetCells = countTargetCells(target);
    if (targetCells < spec.minTargetCells) continue;
    if (targetCells > spec.maxTargetCells) continue;
    if (!isTargetShapeOk(target)) continue;

    const trayTemplates = shuffleInPlace([...pieces], rng);
    // Random rotations for visual variety, exactly like Breathe / classic
    // puzzle. Rotation count seeds the piece's `heading` so the player
    // sees a non-zero starting direction in the tray instead of every
    // piece pointing UP.
    const randomlyRotated = trayTemplates.map((piece) => {
      const turns = Math.floor(rng() * 4);
      const rotated = rotatePieceNTimes(piece, turns);
      return { ...rotated, heading: (turns % 4) as 0 | 1 | 2 | 3 };
    });
    const tray = colorizeTray(randomlyRotated, rng);

    const signature = `${targetKey(target)}|${trayKey(tray)}`;
    return { board: startBoard, tray, target, signature };
  }
  return null;
}

const RECENT_SIGNATURE_LIMIT = 6;
const recentSignaturesByDifficulty = new Map<HeadingDifficulty, string[]>();

function recordSignature(d: HeadingDifficulty, signature: string) {
  const list = recentSignaturesByDifficulty.get(d) ?? [];
  list.push(signature);
  while (list.length > RECENT_SIGNATURE_LIMIT) list.shift();
  recentSignaturesByDifficulty.set(d, list);
}

function isRecentlySeen(d: HeadingDifficulty, signature: string): boolean {
  return recentSignaturesByDifficulty.get(d)?.includes(signature) ?? false;
}

/**
 * Hard-coded fallback used if generation repeatedly fails to meet a
 * spec. Two horizontal trominoes laid out on rows 1 and 5 — a target
 * that's reachable by simply placing each tromino in its slot with no
 * rotation, no clears, no half-clear bookkeeping required. Guarantees
 * the player ALWAYS gets a real Heading puzzle even when the RNG fights
 * us.
 */
function buildFallback(): BuiltPuzzle {
  const rng = mulberry32(0xc0ffee);
  const pieces = [
    PIECE_CATALOG.find((p) => p.id === 'h3')!,
    PIECE_CATALOG.find((p) => p.id === 'h3')!,
  ];
  const target: TargetPattern = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );
  for (let c = 1; c <= 3; c++) target[1][c] = true;
  for (let c = 4; c <= 6; c++) target[5][c] = true;

  const tray = colorizeTray(
    shuffleInPlace([...pieces], rng).map((piece) => ({
      ...clonePiece(piece),
      heading: 0 as 0 | 1 | 2 | 3,
    })),
    rng
  );
  return { board: createEmptyBoard(), tray, target, signature: 'heading-fallback' };
}

const fallback = buildFallback();

export function generateHeadingPuzzle(options: {
  difficulty?: HeadingDifficulty;
  seed?: number;
} = {}): {
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  difficulty: HeadingDifficulty;
} {
  const difficulty = options.difficulty ?? 'easy';
  const spec = getHeadingDifficultySpec(difficulty);
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
