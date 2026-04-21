export type Coord = { row: number; col: number };

export type PieceShape = {
  id: string;
  cells: Coord[];
  width: number;
  height: number;
  color: string;
};

export type TraySlot = PieceShape | null;

export type BoardCell = string | null;
export type BoardGrid = BoardCell[][];

/**
 * Target occupancy for a puzzle. `true` means the final board must have a
 * filled cell at that position; `false` means the cell must be empty.
 */
export type TargetPattern = boolean[][];

export type GameMode = 'classic' | 'puzzle';

export type ClassicDifficulty = 'zen' | 'easy' | 'normal' | 'hard';

/**
 * Numeric puzzle levels — the real puzzles. Internally we keep a numeric
 * identifier (1..4) because share-link encoding, localStorage keys, and
 * persistence are all happier with a tiny stable integer; the player-facing
 * label lives in `PUZZLE_LEVEL_LABELS` and mirrors the classic-mode names.
 */
export type PuzzleLevel = 1 | 2 | 3 | 4;

/**
 * Puzzle difficulty selector value. `'tutorial'` is a guided step-by-step
 * intro sitting in front of the numeric levels; it behaves a lot like a
 * puzzle (target pattern, predefined pieces) but its puzzles are authored
 * rather than generated, and progression is tracked via `tutorialStep`.
 */
export type PuzzleDifficulty = PuzzleLevel | 'tutorial';

export type ModeSelection =
  | { mode: 'classic'; difficulty: ClassicDifficulty }
  | { mode: 'puzzle'; difficulty: PuzzleDifficulty };

export const CLASSIC_DIFFICULTIES: readonly ClassicDifficulty[] = [
  'zen',
  'easy',
  'normal',
  'hard',
] as const;

export const PUZZLE_NUMERIC_DIFFICULTIES: readonly PuzzleLevel[] = [1, 2, 3, 4] as const;

export const PUZZLE_DIFFICULTIES: readonly PuzzleDifficulty[] = [
  'tutorial',
  ...PUZZLE_NUMERIC_DIFFICULTIES,
] as const;

/**
 * Player-facing labels for puzzle levels. Kept parallel to classic-mode
 * difficulty names so the two modes read as a single ramp. Zen has no
 * puzzle analogue (puzzles are goal-oriented rather than endless) so the
 * puzzle ramp starts at Easy.
 */
export const PUZZLE_LEVEL_LABELS: Record<PuzzleLevel, string> = {
  1: 'Easy',
  2: 'Normal',
  3: 'Hard',
  4: 'Expert',
};

export function puzzleDifficultyLabel(d: PuzzleDifficulty): string {
  return d === 'tutorial' ? 'Tutorial' : PUZZLE_LEVEL_LABELS[d];
}

export function isPuzzleLevel(d: PuzzleDifficulty): d is PuzzleLevel {
  return d !== 'tutorial';
}

/** Stable key for bucketing per-selection persistence (best scores, stored puzzles). */
export function selectionKey(sel: ModeSelection): string {
  return `${sel.mode}:${sel.difficulty}`;
}

export const BOARD_SIZE = 8;

export const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#FF8C42',
];
