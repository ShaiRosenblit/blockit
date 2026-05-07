export type Coord = { row: number; col: number };

export type PieceShape = {
  id: string;
  cells: Coord[];
  width: number;
  height: number;
  color: string;
  /**
   * Heading-mode metadata. Tracks the rotation count modulo 4 from the
   * piece's canonical orientation in `PIECE_CATALOG`: 0 = canonical,
   * 1 = rotated 90° CW, 2 = 180°, 3 = 270° CW. Set on tray pieces by the
   * Heading generator (and incremented by `ROTATE_TRAY_PIECE`); ignored
   * by every other mode. Optional so non-Heading code never has to mention
   * it. See `headingForPiece` in `headingPuzzleGenerator.ts` for how this
   * maps onto the 4 cardinal-or-FULL Heading directions.
   */
  heading?: 0 | 1 | 2 | 3;
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
  | 'scar'
  | 'monolith'
  | 'quarantine'
  | 'heading'
  | 'decay'
  | 'fuse'
  | 'erasures'
  | 'tether';

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
 * Monolith mode difficulty. Three rungs control |T|, |seed|, block count,
 * and tray length. Kept as its own literal union (not aliased to other
 * three-rung modes) so future Monolith-only tuning stays a typed
 * breaking change and persistence keys stay independent per-mode.
 */
export type MonolithDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Quarantine mode difficulty. Three rungs control region count, wall
 * complexity, tray length, and target tightness. Kept as its own literal
 * union (not aliased to other three-rung modes) so future Quarantine-only
 * tuning stays a typed breaking change and persistence keys stay
 * independent per-mode.
 */
export type QuarantineDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Heading mode difficulty. Three rungs control tray length, piece-cell
 * bands, target-cell bands, and the minimum number of half-clears that
 * must appear in the generator's reference solution. Kept as its own
 * literal union (not aliased to other three-rung modes) so future
 * Heading-only tuning stays a typed breaking change and persistence keys
 * stay independent per-mode.
 */
export type HeadingDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Heading-mode direction enum. UP / RIGHT / DOWN / LEFT correspond to
 * rotation indices 0 / 1 / 2 / 3 from the piece's canonical orientation,
 * mirroring the standard "north = up = 0, clockwise" compass. `FULL` is
 * the sentinel used for pieces with no meaningful orientation (the
 * monomino, the 2×2 and 3×3 squares, and the X-pentomino plus): for those
 * pieces both row and column clears revert to Classic (full-line) semantics.
 */
export type Heading = 'up' | 'right' | 'down' | 'left' | 'full';

/**
 * Decay mode difficulty. Three rungs control the per-cell **age threshold**
 * `T` that gates line clears (a row/column only clears once every filled
 * cell in that line has age ≥ `T`) and the **pre-fill seed count** of cells
 * planted at age = `T` so the player has immediate clearing agency on the
 * first few placements. Lower threshold = stricter (fewer turns to wait
 * before a placement-aged cell ripens). Kept as its own literal union (not
 * aliased to other three-rung modes) so future Decay-only tuning stays a
 * typed breaking change and persistence keys stay independent per-mode.
 */
export type DecayDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Fuse mode difficulty. Three rungs control the count `K` of fuse cells
 * pre-seeded onto the starting board. Each fuse carries an integer
 * countdown; every placement decrements every fuse, and any fuse that
 * reaches 0 explodes at the start of the next turn — its 4-neighbour
 * empty cells (and the fuse cell itself) become permanent
 * indestructible WALL cells. Win on tray-empty + target-match + zero
 * fuses remaining (every fuse must have been swept away by a
 * row/column clear, since walls torpedo the win check).
 *
 * Kept as its own literal union (not aliased to other three-rung modes)
 * so future Fuse-only tuning stays a typed breaking change and
 * persistence keys stay independent per-mode.
 */
export type FuseDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Erasures mode difficulty. Three rungs control the number of erase
 * tokens `K` granted per puzzle (Easy 3, Normal 5, Hard 7) and the
 * tightness of the heavily pre-filled starting board the generator
 * produces. Each token deletes one 4-connected component of *player-placed*
 * cells when spent — pre-fill blockers, walls, fuse sentinels and
 * monolith seeds are immune. Win on tray-empty + target-match; remaining
 * tokens at win time are fine.
 *
 * Kept as its own literal union (not aliased to other three-rung modes)
 * so future Erasures-only tuning stays a typed breaking change and
 * persistence keys stay independent per-mode.
 */
export type ErasuresDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Tether mode difficulty. Three rungs control the **piece pool** the tray
 * draws from and the **resampling strictness** for the paired slots. Easy
 * draws from a shape-restricted pool that fits the Chebyshev-2 window
 * comfortably; Normal uses the standard Classic mix; Hard adds a
 * `minTetherOptions ≥ 2` resample constraint on the next paired slot so
 * the player is more often forced into tight tether-window placements
 * (with a free-piece fallback when no paired sample qualifies). The
 * Chebyshev radius itself is fixed at 2 across every rung — difficulty
 * varies the *shape* of the constraint, not its geometry. Kept as its
 * own literal union (not aliased to other three-rung modes) so future
 * Tether-only tuning stays a typed breaking change and persistence keys
 * stay independent per-mode.
 */
export type TetherDifficulty = 'easy' | 'normal' | 'hard';

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
  | { mode: 'scar'; difficulty: ScarDifficulty }
  | { mode: 'monolith'; difficulty: MonolithDifficulty }
  | { mode: 'quarantine'; difficulty: QuarantineDifficulty }
  | { mode: 'heading'; difficulty: HeadingDifficulty }
  | { mode: 'decay'; difficulty: DecayDifficulty }
  | { mode: 'fuse'; difficulty: FuseDifficulty }
  | { mode: 'erasures'; difficulty: ErasuresDifficulty }
  | { mode: 'tether'; difficulty: TetherDifficulty };

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

export const MONOLITH_DIFFICULTIES: readonly MonolithDifficulty[] = [
  'easy',
  'normal',
  'hard',
] as const;

export const QUARANTINE_DIFFICULTIES: readonly QuarantineDifficulty[] = [
  'easy',
  'normal',
  'hard',
] as const;

export const HEADING_DIFFICULTIES: readonly HeadingDifficulty[] = [
  'easy',
  'normal',
  'hard',
] as const;

export const DECAY_DIFFICULTIES: readonly DecayDifficulty[] = [
  'easy',
  'normal',
  'hard',
] as const;

export const FUSE_DIFFICULTIES: readonly FuseDifficulty[] = [
  'easy',
  'normal',
  'hard',
] as const;

export const ERASURES_DIFFICULTIES: readonly ErasuresDifficulty[] = [
  'easy',
  'normal',
  'hard',
] as const;

export const TETHER_DIFFICULTIES: readonly TetherDifficulty[] = [
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
