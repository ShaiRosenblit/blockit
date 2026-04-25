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

export type GameMode =
  | 'classic'
  | 'puzzle'
  | 'chroma'
  | 'gravity'
  | 'drop'
  | 'mirror'
  | 'breathe'
  | 'pipeline'
  | 'scar';

export type ClassicDifficulty = 'zen' | 'easy' | 'normal' | 'hard';

/**
 * Mirror mode difficulty. Three rungs (no Zen, no Expert) keeps the
 * menu compact for a puzzle-style mode where every piece does double
 * work via reflection — Hard already feels like Expert at standard piece
 * counts. Kept as its own literal union (not `ClassicDifficulty`) so
 * future Mirror-only tuning stays a typed, breaking change and
 * persistence keys stay independent per mode.
 */
export type MirrorDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Breathe mode difficulty. Three rungs to keep the picker compact for a
 * puzzle-like mode where the trick (every 2×2 must keep at least one hole
 * on the WINNING board) already produces meaningful tension at standard
 * piece counts. Kept as its own literal union — not aliased to
 * `MirrorDifficulty` — so future Breathe-only tuning stays a typed
 * breaking change and persistence keys stay independent per-mode.
 */
export type BreatheDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Scar mode difficulty. Three rungs control how many scar cells (permanent
 * blockers) are seeded on the board after each clear event. Same string
 * values as Mirror — the levels mean different things per mode but the
 * compact ramp keeps the difficulty button row consistent across modes.
 * Kept as its own literal union (not an alias) so future Scar-only tuning
 * (e.g. an Expert rung that scars 5 cells, or a clusters-allowed rung)
 * stays a typed, breaking change.
 */
export type ScarDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Gravity mode shares the classic difficulty rungs (same piece families, same
 * weights) because the twist is in what happens after a line clears, not in
 * what pieces you get. Kept as its own alias so best-score storage keys stay
 * independent per-mode and future Gravity-only tuning (e.g. a harder rung
 * that spawns extra garbage) stays a typed, breaking change.
 */
export type GravityDifficulty = ClassicDifficulty;

/**
 * Drop mode shares the classic difficulty rungs — same piece pool, same
 * weights. The twist is the Tetris-style "release drops piece from the top"
 * placement, not the piece vocabulary. Kept as its own alias so best-score
 * storage keys stay independent per-mode and any future Drop-only tuning
 * (e.g. a rung that spawns garbage rows) stays a typed, breaking change.
 */
export type DropDifficulty = ClassicDifficulty;

/**
 * Pipeline mode shares the classic difficulty rungs — same piece pool, same
 * weights — because the twist is the round-robin tray-slot lock, not the
 * piece vocabulary. Kept as its own alias so best-score storage keys stay
 * independent per-mode and any future Pipeline-only tuning (e.g. a rung
 * that varies cycle length) stays a typed, breaking change the compiler
 * can hunt down.
 */
export type PipelineDifficulty = ClassicDifficulty;

/**
 * Chroma mode v1 ships with a single difficulty. The type is kept as a
 * literal union (not just the string) so adding more rungs later — e.g.
 * `'easy' | 'normal' | 'hard'` — stays a typed, breaking change the
 * compiler can hunt down rather than a silent string widening.
 */
export type ChromaDifficulty = 'normal';

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
  | { mode: 'puzzle'; difficulty: PuzzleDifficulty }
  | { mode: 'chroma'; difficulty: ChromaDifficulty }
  | { mode: 'gravity'; difficulty: GravityDifficulty }
  | { mode: 'drop'; difficulty: DropDifficulty }
  | { mode: 'mirror'; difficulty: MirrorDifficulty }
  | { mode: 'breathe'; difficulty: BreatheDifficulty }
  | { mode: 'pipeline'; difficulty: PipelineDifficulty }
  | { mode: 'scar'; difficulty: ScarDifficulty };

export const CLASSIC_DIFFICULTIES: readonly ClassicDifficulty[] = [
  'zen',
  'easy',
  'normal',
  'hard',
] as const;

export const GRAVITY_DIFFICULTIES: readonly GravityDifficulty[] = [
  'zen',
  'easy',
  'normal',
  'hard',
] as const;

export const DROP_DIFFICULTIES: readonly DropDifficulty[] = [
  'zen',
  'easy',
  'normal',
  'hard',
] as const;

export const MIRROR_DIFFICULTIES: readonly MirrorDifficulty[] = [
  'easy',
  'normal',
  'hard',
] as const;

export const BREATHE_DIFFICULTIES: readonly BreatheDifficulty[] = [
  'easy',
  'normal',
  'hard',
] as const;

export const PIPELINE_DIFFICULTIES: readonly PipelineDifficulty[] = [
  'zen',
  'easy',
  'normal',
  'hard',
] as const;

export const SCAR_DIFFICULTIES: readonly ScarDifficulty[] = [
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

/**
 * Chroma-mode palette: three well-separated hues pulled from `COLORS`
 * so the look stays consistent across modes. The no-adjacent-different-
 * colors rule is only playable with a small palette (see plan); 3 is
 * the sweet spot between "tray forces you to lose" and "trivially
 * mono-color".
 */
export const CHROMA_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFEAA7',
] as const;

/**
 * One resolution pass in Gravity mode: the rows/columns that cleared this
 * step, and — after the subsequent gravity compaction — how far each
 * surviving cell fell (measured in the NEW board's coordinates so the UI
 * can render the final position and transition from an offset back to 0).
 *
 * `fallDistances[newR][newC]` = rows the cell at that post-compaction
 * position moved down. 0 for cells that didn't move. Present for every
 * filled cell in the resulting board; absent (undefined) for empty cells.
 *
 * The UI replays steps in order: paint `clearedCells` with the will-clear
 * flash, wait for the clear animation, then swap to the post-fall board
 * with each filled cell offset up by `fallDistances[r][c]` pixels and
 * transitioning back to 0. Repeat for each step.
 */
export type CascadeStep = {
  /**
   * Board state at the start of this step — i.e. right before the clear
   * runs. For step 0 this is the post-placement board (piece visible,
   * no clears yet); for step k >= 1 this equals step[k-1].boardAfter.
   * The UI paints this while flashing `clearedCells` with will-clear.
   */
  boardBefore: BoardGrid;
  /** Rows cleared this step (as indices into the board BEFORE this step's clear). */
  clearedRows: number[];
  /** Columns cleared this step (as indices into the board BEFORE this step's clear). */
  clearedCols: number[];
  /**
   * `${row},${col}` coordinates of every cell that cleared this step,
   * encoded on `boardBefore`. Used to light up `cell--will-clear` during
   * the step's pre-clear flash.
   */
  clearedCells: string[];
  /**
   * Post-compaction board for this step. Cells that cleared are `null`;
   * surviving cells are in their settled position.
   */
  boardAfter: BoardGrid;
  /**
   * `fallDistances[r][c]` = how far the cell now sitting at (r, c) in
   * `boardAfter` fell during this step's gravity compaction. `null` when
   * the cell is empty. Used to drive the per-cell translateY animation.
   */
  fallDistances: (number | null)[][];
};
