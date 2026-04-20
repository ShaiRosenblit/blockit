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
 * Target occupancy for a riddle. `true` means the final board must have a
 * filled cell at that position; `false` means the cell must be empty.
 */
export type TargetPattern = boolean[][];

export type GameMode = 'classic' | 'riddle';

export type ClassicDifficulty = 'zen' | 'easy' | 'normal' | 'hard';

/** Numeric riddle levels — the real puzzles. */
export type RiddleLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Riddle difficulty selector value. `'tutorial'` is a guided step-by-step
 * intro sitting in front of the numeric levels; it behaves a lot like a
 * riddle (target pattern, predefined pieces) but its puzzles are authored
 * rather than generated, and progression is tracked via `tutorialStep`.
 */
export type RiddleDifficulty = RiddleLevel | 'tutorial';

export type ModeSelection =
  | { mode: 'classic'; difficulty: ClassicDifficulty }
  | { mode: 'riddle'; difficulty: RiddleDifficulty };

export const CLASSIC_DIFFICULTIES: readonly ClassicDifficulty[] = [
  'zen',
  'easy',
  'normal',
  'hard',
] as const;

export const RIDDLE_NUMERIC_DIFFICULTIES: readonly RiddleLevel[] = [1, 2, 3, 4, 5] as const;

export const RIDDLE_DIFFICULTIES: readonly RiddleDifficulty[] = [
  'tutorial',
  ...RIDDLE_NUMERIC_DIFFICULTIES,
] as const;

export function isRiddleLevel(d: RiddleDifficulty): d is RiddleLevel {
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
