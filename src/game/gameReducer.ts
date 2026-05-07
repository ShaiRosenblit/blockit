import type {
  BoardGrid,
  BreatheDifficulty,
  CascadeStep,
  ChromaDifficulty,
  ClassicDifficulty,
  Coord,
  DecayDifficulty,
  DropDifficulty,
  ErasuresDifficulty,
  FuseDifficulty,
  GameMode,
  GravityDifficulty,
  HeadingDifficulty,
  MirrorDifficulty,
  MonolithDifficulty,
  PieceShape,
  PipelineDifficulty,
  PuzzleDifficulty,
  PuzzleLevel,
  QuarantineDifficulty,
  ScarDifficulty,
  TargetPattern,
  TetherDifficulty,
  TraySlot,
} from './types';
import {
  BOARD_SIZE,
  BREATHE_DIFFICULTIES,
  CLASSIC_DIFFICULTIES,
  DECAY_DIFFICULTIES,
  DROP_DIFFICULTIES,
  ERASURES_DIFFICULTIES,
  FUSE_DIFFICULTIES,
  GRAVITY_DIFFICULTIES,
  HEADING_DIFFICULTIES,
  MIRROR_DIFFICULTIES,
  MONOLITH_DIFFICULTIES,
  PIPELINE_DIFFICULTIES,
  QUARANTINE_DIFFICULTIES,
  SCAR_DIFFICULTIES,
  TETHER_DIFFICULTIES,
  isPuzzleLevel,
} from './types';
import {
  createEmptyBoard,
  canPlaceMonolith,
  canPlacePiece,
  canPlacePieceMirrored,
  placePiece,
  placePieceMirrored,
  detectCompletedLines,
  clearLines,
  clearLinesHeadingHalf,
  clearLinesPreservingWalls,
  detectClearableLinesQuarantine,
  hasValidMoves,
  hasValidDrops,
  hasValidMirrorMoves,
  hasValidMonolithMoves,
  hasValidPipelineMoves,
  isQuarantineSolved,
  rotatePiece90Clockwise,
  applySlabCollapse,
  boardMatchesTarget,
  boardSatisfiesBreathe,
  resolveCascades,
} from './board';
import {
  hasValidTetherMoves,
  placementSatisfiesTether,
  tetherWindowCells,
  type PairedSlot,
} from './tether';
import { generateTetherTray } from './tetherTray';
import { generateChromaTray, generateClassicTray } from './pieces';
import {
  generatePuzzle,
  clampPuzzleDifficulty,
  PUZZLE_MAX_DIFFICULTY,
} from './puzzleGenerator';
import { generateMirrorPuzzle } from './mirrorPuzzleGenerator';
import { generateBreathePuzzle } from './breathePuzzleGenerator';
import { generateMonolithPuzzle } from './monolithGenerator';
import { generateQuarantinePuzzle } from './quarantineGenerator';
import { generateHeadingPuzzle, headingForPiece } from './headingPuzzleGenerator';
import { generateFusePuzzle } from './fusePuzzleGenerator';
import {
  decrementFuses,
  dropClearedFuses,
  expireFuses,
  noFusesRemaining,
  type FuseCell,
} from './fuse';
import { generateErasuresPuzzle } from './erasuresPuzzleGenerator';
import { eraseComponent, erasureTokenCount, hasErasableComponent } from './erasures';
import {
  advanceAges,
  applyDecayClears,
  decayPrefillCount,
  decayThreshold,
  detectClearableLinesDecay,
  emptyDecayAges,
  freshDecayRngSeed,
  seedAgedPrefill,
  setNewCellAges,
  decayRng,
  type DecayAges,
} from './decay';
import {
  applyScars,
  clearLinesPreservingScars,
  mulberry32,
  pickScarCells,
  scarsPerEvent,
} from './scar';
import {
  calculatePlacementScore,
  calculateClearScore,
  chainMultiplier,
  PUZZLE_SOLVE_BONUS,
} from './scoring';
import { decodePuzzle, parseSharePayload } from './sharing';
import { TUTORIAL_STEP_COUNT, clampTutorialStep, getTutorialStep } from './tutorial';

export type GameState = {
  board: BoardGrid;
  tray: TraySlot[];
  score: number;
  bestScore: number;
  combo: number;
  isGameOver: boolean;
  mode: GameMode;
  /** Remembered selection within each mode, so switching modes resumes where
   *  you left off. */
  classicDifficulty: ClassicDifficulty;
  puzzleDifficulty: PuzzleDifficulty;
  /**
   * Chroma-mode difficulty. v1 only has `'normal'`, but we keep it in state
   * parallel to classic/puzzle so future rungs slot in without a schema
   * change and best-score keys stay per-rung-stable.
   */
  chromaDifficulty: ChromaDifficulty;
  /** Remembered Gravity-mode difficulty (mirrors classic rungs). */
  gravityDifficulty: GravityDifficulty;
  /** Remembered Drop-mode difficulty (mirrors classic rungs). */
  dropDifficulty: DropDifficulty;
  /** Remembered Mirror-mode difficulty. */
  mirrorDifficulty: MirrorDifficulty;
  /** Remembered Breathe-mode difficulty. */
  breatheDifficulty: BreatheDifficulty;
  /** Remembered Pipeline-mode difficulty (mirrors classic rungs). */
  pipelineDifficulty: PipelineDifficulty;
  /**
   * Pipeline-mode round-robin cursor: the only tray slot the player is
   * allowed to place from on the next move. Cycles 0 → 1 → 2 → 0 after
   * every successful placement, regardless of refill — i.e. starting a
   * fresh tray does NOT reset the phase, only RESTART / mode change /
   * fresh-state factories do. Always `0` outside of Pipeline mode.
   */
  pipelinePhase: 0 | 1 | 2;
  /** Remembered Scar-mode difficulty. */
  scarDifficulty: ScarDifficulty;
  /** Remembered Monolith-mode difficulty. */
  monolithDifficulty: MonolithDifficulty;
  /** Remembered Quarantine-mode difficulty. */
  quarantineDifficulty: QuarantineDifficulty;
  /** Remembered Heading-mode difficulty. */
  headingDifficulty: HeadingDifficulty;
  /** Remembered Decay-mode difficulty. */
  decayDifficulty: DecayDifficulty;
  /** Remembered Fuse-mode difficulty. */
  fuseDifficulty: FuseDifficulty;
  /** Remembered Erasures-mode difficulty. */
  erasuresDifficulty: ErasuresDifficulty;
  /** Remembered Tether-mode difficulty. */
  tetherDifficulty: TetherDifficulty;
  /**
   * Tether-mode last-paired-placement cells. After the player places a
   * piece from one of the paired slots (slot 0 or 1), this holds the
   * absolute board coords of every cell the placement landed on. The
   * NEXT paired-slot placement coming from the OTHER paired slot must
   * include at least one cell within Chebyshev-distance ≤ 2 of any of
   * these cells, otherwise the placement is rejected. `null` at round
   * start AND immediately after a refill where no paired placement has
   * happened yet — interpreted as "no constraint active". Slot 2
   * placements never update this field. Always `null` outside Tether
   * mode and nothing reads it.
   */
  lastPairedPlacementCells: Coord[] | null;
  /**
   * Tether-mode index of the slot that produced the most recent paired
   * placement (0 or 1). Drives the "is the partner slot constrained?"
   * decision: only when the next paired-slot placement comes from the
   * OTHER paired slot does the tether window apply. `null` when
   * `lastPairedPlacementCells === null` (no paired placement yet);
   * always `null` outside Tether mode.
   */
  lastPairedSlot: PairedSlot | null;
  /**
   * Erasures-mode token reserve — the integer count of erase tokens the
   * player has remaining for the active round. Decremented by exactly 1
   * each time `ERASE_COMPONENT` succeeds (i.e. erases at least one
   * cell). Outside Erasures mode this is always `null`; inside Erasures
   * it tracks 0..K where K = `erasureTokenCount(difficulty)` at round
   * start. The player may finish the round with leftover tokens — extras
   * don't fail the win check, they just go uncounted.
   */
  erasureTokens: number | null;
  /**
   * Erasures-mode UI mode flag. `true` while the player is choosing
   * which 4-connected component to erase: the next click on a
   * player-placed cell dispatches `ERASE_COMPONENT`. `false` outside
   * Erasures mode and during normal placement gameplay. Toggled by
   * `TOGGLE_ERASE_SELECT` (the "Erase (N)" button); cleared by every
   * action that consumes a token, by every successful placement (so a
   * placement followed by an erase requires re-engaging the toggle), and
   * by every mode/difficulty switch.
   */
  erasureSelectMode: boolean;
  /**
   * Fuse-mode active fuse list. Each entry is `{row, col, countdown}`
   * — the cell painted with the `FUSE_COLOR` sentinel and the integer
   * countdown remaining before expiry. Empty array outside Fuse mode
   * (and when every fuse has been cleared / expired). Held as an
   * array (not a Map) so the reducer's structural-clone-via-spread
   * persistence path keeps working without bespoke serialisation.
   */
  fuseCells: FuseCell[];
  /**
   * Snapshot of the Fuse puzzle's starting fuse list for RESTART.
   * Like `quarantineInitialRegions`, but for the Fuse `fuseCells`
   * array so RESTART returns to the exact starting fuse layout
   * (countdowns reset, walls retracted via the board snapshot).
   * Empty array outside Fuse mode.
   */
  fuseInitialCells: FuseCell[];
  /**
   * Decay-mode per-cell age grid. `boardAges[r][c]` is the integer count
   * of placements that have happened since the cell at (r, c) was placed
   * (set to 0 when placed, incremented by 1 after every subsequent
   * placement). `null` mirrors `board[r][c] === null` (empty cell). A
   * row/column only clears once every filled cell along it has age ≥
   * `decayThreshold(decayDifficulty)`. Always shaped as an 8×8 grid;
   * outside Decay mode every entry is `null` and nothing reads it.
   */
  boardAges: DecayAges;
  /**
   * Quarantine mode region cell-list (one entry per region; each entry is
   * the list of `(row, col)` coords belonging to that region). Null
   * outside Quarantine. Set on `freshQuarantineState`, preserved across
   * placements (regions are static — walls never move).
   */
  quarantineRegions: Coord[][] | null;
  /**
   * Quarantine mode per-region empty-cell targets. `quarantineTargets[i]`
   * is the target empty count for `quarantineRegions[i]`. Win condition:
   * every region's current empty count exactly equals its target.
   */
  quarantineTargets: number[] | null;
  /**
   * Snapshot of the Quarantine puzzle's starting state for RESTART. Like
   * `puzzleInitialBoard` / `puzzleInitialTray`, but for the Quarantine
   * region+target metadata so RESTART returns to the exact instance.
   */
  quarantineInitialRegions: Coord[][] | null;
  quarantineInitialTargets: number[] | null;
  /**
   * Per-run RNG seed for Scar mode's scar-burst placement. Initialised on
   * `freshScarState` (e.g. `Date.now() ^ Math.floor(Math.random() *
   * 0x100000000)`); incremented after each scar burst so subsequent
   * bursts are deterministic-given-seed but visibly vary turn to turn.
   * Not persisted across sessions — every `freshScarState` rerolls.
   * Outside Scar mode this field is set but unused; we keep a numeric
   * default rather than `null` so the type stays simple.
   */
  scarRngSeed: number;
  /** Only set when a puzzle round ends. */
  puzzleResult: null | 'solved' | 'failed';
  /**
   * Target occupancy the player must reproduce in puzzle mode. `null` in
   * non-puzzle modes.
   */
  puzzleTarget: TargetPattern | null;
  /**
   * Snapshot of the active puzzle's starting board/tray so RESTART can return
   * to this exact puzzle without generating a fresh one. `null` outside of
   * puzzle mode.
   */
  puzzleInitialBoard: BoardGrid | null;
  puzzleInitialTray: PieceShape[] | null;
  /**
   * Zero-based index into `TUTORIAL_STEPS`. Only meaningful when
   * `puzzleDifficulty === 'tutorial'`; otherwise retains the last tutorial
   * step the player was on (so returning to the tutorial resumes there).
   */
  tutorialStep: number;
  /**
   * Non-null only on the exact tick the player solves a numeric puzzle
   * difficulty for the very first time. Encodes which difficulty was just
   * cleared so `GameOverOverlay` can surface a one-shot "level up" prompt
   * inviting them to step up to the next difficulty (or celebrate mastery
   * when they clear Expert). Cleared on every subsequent action so the
   * promotion CTA never shows up twice for the same difficulty.
   */
  puzzleLevelUp: PuzzleLevel | null;
  /**
   * Set of numeric puzzle difficulties the player has ever solved at
   * least once. Seeded from localStorage at init and updated in-place by
   * the reducer on every first-time solve. Lives in state — not read
   * directly from localStorage inside the reducer — because React 19's
   * StrictMode double-invokes reducers in dev, and a localStorage write
   * on the first invocation would have the second invocation see the
   * flag as already-set and suppress the level-up prompt. Persistence is
   * handled by the App via a useEffect that watches this field.
   */
  puzzleEverSolved: PuzzleEverSolved;
  /**
   * Only set right after a Gravity-mode PLACE_PIECE that triggered at
   * least one clear. Carries the ordered resolution steps (clear → fall →
   * clear → fall …) so the UI can replay them as animation. Null on
   * every other action (including Gravity placements that didn't clear),
   * which is how the view knows to stop the animation sequence.
   */
  lastCascade: CascadeStep[] | null;
  /**
   * Full undo history for puzzle mode, oldest at index 0, most-recent
   * pre-placement snapshot at the end. Each puzzle-mode PLACE_PIECE
   * pushes its pre-placement state onto the stack; UNDO_PLACEMENT pops
   * the top entry and restores it. Empty array means "nothing to undo"
   * (fresh puzzle, just-restarted, fully-undone). Reset to `[]` on
   * RESTART, NEW_PUZZLE, mode/difficulty switches, tutorial navigation,
   * and shared-puzzle loads. Always `[]` outside puzzle mode. We don't
   * track rotations: each snapshot's `tray` also reverts rotations the
   * player performed after that placement, which is acceptable because
   * rotations are one tap to reapply. Memory is bounded by the puzzle's
   * piece count (≤ 7 for Expert) so no cap is necessary.
   */
  puzzleUndoStack: PuzzleUndoSnapshot[];
};

export type PuzzleUndoSnapshot = {
  board: BoardGrid;
  tray: TraySlot[];
  score: number;
  combo: number;
  /**
   * Fuse-mode fuse list snapshot. Stored alongside the board so undoing
   * a Fuse placement also reverts every fuse's countdown AND any walls
   * that the placement may have spawned via expiry — the board snapshot
   * already captures the wall retraction (walls created post-placement
   * weren't in the pre-placement board), and this field captures the
   * fuse countdown rollback. Empty array outside Fuse mode; the field
   * is always present so the snapshot shape stays uniform.
   */
  fuseCells: FuseCell[];
  /**
   * Erasures-mode token-reserve snapshot. Stored so undoing an erase
   * (or a placement) restores the token count to its pre-action value.
   * `null` outside Erasures mode (matches `state.erasureTokens` shape).
   */
  erasureTokens: number | null;
};

/**
 * Present-key-means-solved map. Using `true` (never `false`) means a
 * fresh spread merge (`{ ...state.puzzleEverSolved, [lvl]: true }`)
 * never accidentally un-marks anything.
 */
export type PuzzleEverSolved = {
  1?: true;
  2?: true;
  3?: true;
  4?: true;
};

export type GameAction =
  | { type: 'PLACE_PIECE'; trayIndex: number; origin: Coord }
  | { type: 'ROTATE_TRAY_PIECE'; trayIndex: number }
  | { type: 'RESTART' }
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'SET_CLASSIC_DIFFICULTY'; difficulty: ClassicDifficulty }
  | { type: 'SET_PUZZLE_DIFFICULTY'; difficulty: PuzzleDifficulty }
  | { type: 'SET_GRAVITY_DIFFICULTY'; difficulty: GravityDifficulty }
  | { type: 'SET_DROP_DIFFICULTY'; difficulty: DropDifficulty }
  | { type: 'SET_MIRROR_DIFFICULTY'; difficulty: MirrorDifficulty }
  | { type: 'SET_BREATHE_DIFFICULTY'; difficulty: BreatheDifficulty }
  | { type: 'SET_PIPELINE_DIFFICULTY'; difficulty: PipelineDifficulty }
  | { type: 'SET_SCAR_DIFFICULTY'; difficulty: ScarDifficulty }
  | { type: 'SET_MONOLITH_DIFFICULTY'; difficulty: MonolithDifficulty }
  | { type: 'SET_QUARANTINE_DIFFICULTY'; difficulty: QuarantineDifficulty }
  | { type: 'SET_HEADING_DIFFICULTY'; difficulty: HeadingDifficulty }
  | { type: 'SET_DECAY_DIFFICULTY'; difficulty: DecayDifficulty }
  | { type: 'SET_FUSE_DIFFICULTY'; difficulty: FuseDifficulty }
  | { type: 'SET_ERASURES_DIFFICULTY'; difficulty: ErasuresDifficulty }
  | { type: 'SET_TETHER_DIFFICULTY'; difficulty: TetherDifficulty }
  /**
   * Erasures-mode: spend one erase token to delete the 4-connected
   * component of player-placed cells containing `(row, col)`. No-op when
   * `state.mode !== 'erasures'`, when `state.erasureSelectMode` is
   * false, when the token reserve is `<= 0`, or when the targeted cell
   * is not a player-placed cell (sentinels and pre-fill are immune).
   */
  | { type: 'ERASE_COMPONENT'; row: number; col: number }
  /**
   * Erasures-mode: flip `state.erasureSelectMode`. Toggled by the
   * "Erase (N)" UI button. No-op outside Erasures or when the token
   * reserve is 0 (you can't enter select mode if there's nothing to
   * spend).
   */
  | { type: 'TOGGLE_ERASE_SELECT' }
  /** Discard the active mirror puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_MIRROR_PUZZLE' }
  /** Discard the active breathe puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_BREATHE_PUZZLE' }
  /** Discard the active monolith puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_MONOLITH_PUZZLE' }
  | { type: 'NEW_QUARANTINE_PUZZLE' }
  /** Discard the active heading puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_HEADING_PUZZLE' }
  /** Discard the active fuse puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_FUSE_PUZZLE' }
  /** Discard the active erasures puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_ERASURES_PUZZLE' }
  /** Discard the active puzzle and generate a fresh one at the current difficulty. */
  | { type: 'NEW_PUZZLE' }
  /**
   * Swap the currently-visible puzzle for a shared puzzle (e.g. when the URL
   * hash changes without a full page reload). Does not touch localStorage —
   * the shared puzzle is ephemeral.
   */
  | {
      type: 'LOAD_SHARED_PUZZLE';
      difficulty: PuzzleLevel;
      board: BoardGrid;
      tray: PieceShape[];
      target: TargetPattern;
    }
  /** Advance to the next tutorial step; graduate to the Easy puzzle after the last step. */
  | { type: 'TUTORIAL_NEXT' }
  /** Jump to a specific tutorial step (for dot-indicator navigation). */
  | { type: 'TUTORIAL_GOTO'; step: number }
  /**
   * Revert the most recent puzzle-mode placement, restoring the board,
   * tray, score, and combo to their pre-placement values. Repeatable
   * back to the puzzle's starting position. No-op when the undo stack
   * is empty or when not in puzzle mode.
   */
  | { type: 'UNDO_PLACEMENT' };

const MODE_KEY = 'blockit-mode';
const CLASSIC_DIFFICULTY_KEY = 'blockit-classic-difficulty';
const PUZZLE_DIFFICULTY_KEY = 'blockit-puzzle-difficulty';
const CHROMA_DIFFICULTY_KEY = 'blockit-chroma-difficulty';
const GRAVITY_DIFFICULTY_KEY = 'blockit-gravity-difficulty';
const DROP_DIFFICULTY_KEY = 'blockit-drop-difficulty';
const MIRROR_DIFFICULTY_KEY = 'blockit-mirror-difficulty';
const BREATHE_DIFFICULTY_KEY = 'blockit-breathe-difficulty';
const PIPELINE_DIFFICULTY_KEY = 'blockit-pipeline-difficulty';
const SCAR_DIFFICULTY_KEY = 'blockit-scar-difficulty';
const MONOLITH_DIFFICULTY_KEY = 'blockit-monolith-difficulty';
const QUARANTINE_DIFFICULTY_KEY = 'blockit-quarantine-difficulty';
const HEADING_DIFFICULTY_KEY = 'blockit-heading-difficulty';
const HEADING_PUZZLE_KEY_PREFIX = 'blockit-puzzle-heading-';
const DECAY_DIFFICULTY_KEY = 'blockit-decay-difficulty';
const FUSE_DIFFICULTY_KEY = 'blockit-fuse-difficulty';
const FUSE_PUZZLE_KEY_PREFIX = 'blockit-puzzle-fuse-';
const ERASURES_DIFFICULTY_KEY = 'blockit-erasures-difficulty';
const ERASURES_PUZZLE_KEY_PREFIX = 'blockit-puzzle-erasures-';
const TETHER_DIFFICULTY_KEY = 'blockit-tether-difficulty';
const TUTORIAL_STEP_KEY = 'blockit-tutorial-step';
const PUZZLE_FIRST_SOLVED_KEY_PREFIX = 'blockit-puzzle-first-solved-';

const LEGACY_DIFFICULTY_KEY = 'blockit-difficulty';
const LEGACY_RIDDLE_LEVEL_KEY = 'blockit-riddle-level';
const LEGACY_RIDDLE_MAX_LEVEL_KEY = 'blockit-riddle-max-level';
const LEGACY_RIDDLE_PUZZLE_KEY = 'blockit-riddle-puzzle';
const LEGACY_RIDDLE_DIFFICULTY_KEY = 'blockit-riddle-difficulty';
// Marker for the 1..5 → 1..4 rebalance (Easy/Normal/Hard/Expert). One-shot;
// its mere presence means the rename migration has already run.
const PUZZLE_RENUMBER_MARKER_KEY = 'blockit-puzzle-renumbered-v2';

function bestScoreKey(
  mode: GameMode,
  difficulty:
    | ClassicDifficulty
    | PuzzleLevel
    | ChromaDifficulty
    | GravityDifficulty
    | DropDifficulty
    | MirrorDifficulty
    | BreatheDifficulty
    | PipelineDifficulty
    | ScarDifficulty
    | MonolithDifficulty
    | QuarantineDifficulty
    | HeadingDifficulty
    | DecayDifficulty
    | FuseDifficulty
    | ErasuresDifficulty
    | TetherDifficulty
): string {
  return `blockit-best-${mode}-${difficulty}`;
}

function puzzleKey(difficulty: PuzzleLevel): string {
  return `blockit-puzzle-${difficulty}`;
}

function loadBestScore(
  mode: GameMode,
  difficulty:
    | ClassicDifficulty
    | PuzzleLevel
    | ChromaDifficulty
    | GravityDifficulty
    | DropDifficulty
    | MirrorDifficulty
    | BreatheDifficulty
    | PipelineDifficulty
    | ScarDifficulty
    | MonolithDifficulty
    | QuarantineDifficulty
    | HeadingDifficulty
    | DecayDifficulty
    | FuseDifficulty
    | ErasuresDifficulty
    | TetherDifficulty
): number {
  try {
    return Number(localStorage.getItem(bestScoreKey(mode, difficulty))) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(
  mode: GameMode,
  difficulty:
    | ClassicDifficulty
    | PuzzleLevel
    | ChromaDifficulty
    | GravityDifficulty
    | DropDifficulty
    | MirrorDifficulty
    | BreatheDifficulty
    | PipelineDifficulty
    | ScarDifficulty
    | MonolithDifficulty
    | QuarantineDifficulty
    | HeadingDifficulty
    | DecayDifficulty
    | FuseDifficulty
    | ErasuresDifficulty
    | TetherDifficulty,
  score: number
) {
  try {
    localStorage.setItem(bestScoreKey(mode, difficulty), String(score));
  } catch { /* noop */ }
}

/**
 * One-shot "has the player ever solved this difficulty?" flag, driving the
 * level-up promotion in `GameOverOverlay`. Stored as a boolean per level
 * so the prompt appears at most once per difficulty — even if the player
 * later clears it dozens more times. Failures are silent: a missing or
 * corrupt value just means we show the promotion one more time, which is
 * strictly better than suppressing a meant-to-be-seen milestone.
 */
function puzzleFirstSolvedKey(level: PuzzleLevel): string {
  return `${PUZZLE_FIRST_SOLVED_KEY_PREFIX}${level}`;
}

const ALL_PUZZLE_LEVELS: readonly PuzzleLevel[] = [1, 2, 3, 4];

export function loadPuzzleEverSolved(): PuzzleEverSolved {
  const result: PuzzleEverSolved = {};
  try {
    for (const level of ALL_PUZZLE_LEVELS) {
      if (localStorage.getItem(puzzleFirstSolvedKey(level)) === '1') {
        result[level] = true;
      }
    }
  } catch { /* noop */ }
  return result;
}

export function savePuzzleEverSolved(solved: PuzzleEverSolved) {
  try {
    for (const level of ALL_PUZZLE_LEVELS) {
      if (solved[level]) {
        localStorage.setItem(puzzleFirstSolvedKey(level), '1');
      }
    }
  } catch { /* noop */ }
}

/**
 * Resolve the next numeric puzzle difficulty above `level`, or null if the
 * player has just cleared the top. Callers use this to decide whether the
 * level-up prompt should propose a next rung or celebrate mastery instead.
 */
export function nextPuzzleLevel(level: PuzzleLevel): PuzzleLevel | null {
  if (level >= PUZZLE_MAX_DIFFICULTY) return null;
  return (level + 1) as PuzzleLevel;
}

function loadTutorialStep(): number {
  try {
    const raw = localStorage.getItem(TUTORIAL_STEP_KEY);
    if (raw === null) return 0;
    return clampTutorialStep(Number(raw));
  } catch {
    return 0;
  }
}

function saveTutorialStep(step: number) {
  try {
    localStorage.setItem(TUTORIAL_STEP_KEY, String(clampTutorialStep(step)));
  } catch { /* noop */ }
}

/**
 * One-shot migration of legacy persistence keys. Idempotent: once a key has
 * been migrated and removed, subsequent calls are no-ops. Covers two waves:
 *  1. Original flat-Difficulty scheme → mode + difficulty scheme.
 *  2. The "riddle" → "puzzle" rename: old keys & mode value `'riddle'` are
 *     rehomed under the new puzzle-prefixed keys and mode value `'puzzle'`.
 */
function migrateLegacyKeys() {
  try {
    const legacyDifficulty = localStorage.getItem(LEGACY_DIFFICULTY_KEY);
    if (legacyDifficulty) {
      if (legacyDifficulty === 'riddle') {
        if (!localStorage.getItem(MODE_KEY)) localStorage.setItem(MODE_KEY, 'puzzle');
      } else if (
        legacyDifficulty === 'zen' ||
        legacyDifficulty === 'easy' ||
        legacyDifficulty === 'normal' ||
        legacyDifficulty === 'hard'
      ) {
        if (!localStorage.getItem(MODE_KEY)) localStorage.setItem(MODE_KEY, 'classic');
        if (!localStorage.getItem(CLASSIC_DIFFICULTY_KEY)) {
          localStorage.setItem(CLASSIC_DIFFICULTY_KEY, legacyDifficulty);
        }
        // Migrate old per-classic best score into new key naming.
        const legacyBest = localStorage.getItem(`blockit-best-${legacyDifficulty}`);
        if (legacyBest !== null) {
          const newKey = bestScoreKey('classic', legacyDifficulty);
          if (!localStorage.getItem(newKey)) localStorage.setItem(newKey, legacyBest);
          localStorage.removeItem(`blockit-best-${legacyDifficulty}`);
        }
      }
      localStorage.removeItem(LEGACY_DIFFICULTY_KEY);
    }

    // Old mode value of 'riddle' gets rewritten to 'puzzle'.
    if (localStorage.getItem(MODE_KEY) === 'riddle') {
      localStorage.setItem(MODE_KEY, 'puzzle');
    }

    const legacyRiddleLevel = localStorage.getItem(LEGACY_RIDDLE_LEVEL_KEY);
    if (legacyRiddleLevel !== null && !localStorage.getItem(PUZZLE_DIFFICULTY_KEY)) {
      // Old 1..10 riddle levels compress into the old 1..5 scheme here; the
      // second-wave rebalance below then collapses those into the current
      // 1..4 (Easy/Normal/Hard/Expert) range.
      const n = Number(legacyRiddleLevel);
      if (Number.isFinite(n) && n > 0) {
        const mapped = Math.min(5, Math.max(1, Math.ceil(n / 2)));
        localStorage.setItem(PUZZLE_DIFFICULTY_KEY, String(mapped));
      }
    }
    localStorage.removeItem(LEGACY_RIDDLE_LEVEL_KEY);
    localStorage.removeItem(LEGACY_RIDDLE_MAX_LEVEL_KEY);

    // Legacy stored puzzle was for a single level under one key; it would
    // reference the old 1..10 numbering so simply drop it rather than trying
    // to re-home it to a specific new-difficulty slot.
    localStorage.removeItem(LEGACY_RIDDLE_PUZZLE_KEY);

    // Old flat 'blockit-best-riddle' spanned all puzzle levels; its value
    // isn't directly comparable to any single new difficulty so drop it.
    localStorage.removeItem('blockit-best-riddle');

    // Rename of 'riddle' → 'puzzle': rehome the saved difficulty selection.
    const legacyRiddleDifficulty = localStorage.getItem(LEGACY_RIDDLE_DIFFICULTY_KEY);
    if (legacyRiddleDifficulty !== null && !localStorage.getItem(PUZZLE_DIFFICULTY_KEY)) {
      localStorage.setItem(PUZZLE_DIFFICULTY_KEY, legacyRiddleDifficulty);
    }
    localStorage.removeItem(LEGACY_RIDDLE_DIFFICULTY_KEY);

    // Rehome stored per-difficulty puzzles and best scores under the new
    // 'puzzle' names. The old riddle scheme ran 1..5 — after this block
    // they're rehomed under the same numeric keys; the second migration
    // below then collapses the 1..5 range into the new 1..4 range.
    for (let d = 1; d <= 5; d++) {
      const key = `blockit-puzzle-${d}`;
      const legacyPuzzle = localStorage.getItem(`blockit-riddle-puzzle-${d}`);
      if (legacyPuzzle !== null) {
        if (!localStorage.getItem(key)) localStorage.setItem(key, legacyPuzzle);
        localStorage.removeItem(`blockit-riddle-puzzle-${d}`);
      }

      const legacyBest = localStorage.getItem(`blockit-best-riddle-${d}`);
      if (legacyBest !== null) {
        const newKey = `blockit-best-puzzle-${d}`;
        if (!localStorage.getItem(newKey)) localStorage.setItem(newKey, legacyBest);
        localStorage.removeItem(`blockit-best-riddle-${d}`);
      }
    }

    // Second wave: the 1..5 → 1..4 rebalance. Old level 1 was nearly trivial
    // and has been folded into the new Easy, then the rest renumbered.
    // Mapping: 1→1, 2→1, 3→2, 4→3, 5→4. Done once, guarded by a marker.
    if (!localStorage.getItem(PUZZLE_RENUMBER_MARKER_KEY)) {
      const remap = (n: number): number =>
        n <= 2 ? 1 : n === 3 ? 2 : n === 4 ? 3 : 4;

      const rawDiff = localStorage.getItem(PUZZLE_DIFFICULTY_KEY);
      if (rawDiff !== null && rawDiff !== 'tutorial') {
        const n = Number(rawDiff);
        if (Number.isFinite(n) && n >= 1 && n <= 5) {
          localStorage.setItem(PUZZLE_DIFFICULTY_KEY, String(remap(n)));
        }
      }

      // Stored puzzles encode their own `difficulty` field, so simply dropping
      // everything is the cleanest path — a fresh puzzle at the new difficulty
      // will be generated on first load. Best scores, on the other hand,
      // represent real player progress so we migrate the ones whose semantic
      // level survives (old 3/4/5) and drop the ones that were folded away.
      const oldBest3 = localStorage.getItem('blockit-best-puzzle-3');
      const oldBest4 = localStorage.getItem('blockit-best-puzzle-4');
      const oldBest5 = localStorage.getItem('blockit-best-puzzle-5');

      for (let d = 1; d <= 5; d++) {
        localStorage.removeItem(`blockit-puzzle-${d}`);
        localStorage.removeItem(`blockit-best-puzzle-${d}`);
      }

      if (oldBest3 !== null) localStorage.setItem('blockit-best-puzzle-2', oldBest3);
      if (oldBest4 !== null) localStorage.setItem('blockit-best-puzzle-3', oldBest4);
      if (oldBest5 !== null) localStorage.setItem('blockit-best-puzzle-4', oldBest5);

      localStorage.setItem(PUZZLE_RENUMBER_MARKER_KEY, '1');
    }
  } catch { /* noop */ }
}

function loadMode(): GameMode {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (
      stored === 'classic' ||
      stored === 'puzzle' ||
      stored === 'chroma' ||
      stored === 'gravity' ||
      stored === 'drop' ||
      stored === 'mirror' ||
      stored === 'breathe' ||
      stored === 'pipeline' ||
      stored === 'scar' ||
      stored === 'monolith' ||
      stored === 'quarantine' ||
      stored === 'heading' ||
      stored === 'decay' ||
      stored === 'fuse' ||
      stored === 'erasures' ||
      stored === 'tether'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  // First-time players land in Classic mode — Classic and Puzzle are the
  // game's two headline modes, and Classic is the simpler, drop-and-clear
  // entry point most players already know from similar block games.
  // Anyone who has played before has MODE_KEY saved and is unaffected.
  return 'classic';
}

function saveMode(mode: GameMode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch { /* noop */ }
}

function loadClassicDifficulty(): ClassicDifficulty {
  try {
    const stored = localStorage.getItem(CLASSIC_DIFFICULTY_KEY);
    if (
      stored === 'zen' ||
      stored === 'easy' ||
      stored === 'normal' ||
      stored === 'hard'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  return 'normal';
}

function saveClassicDifficulty(difficulty: ClassicDifficulty) {
  try {
    localStorage.setItem(CLASSIC_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadPuzzleDifficulty(): PuzzleDifficulty {
  if (import.meta.env.DEV) {
    return PUZZLE_MAX_DIFFICULTY;
  }
  try {
    const raw = localStorage.getItem(PUZZLE_DIFFICULTY_KEY);
    if (raw === 'tutorial') return 'tutorial';
    const stored = Number(raw);
    if (Number.isFinite(stored) && stored > 0) return clampPuzzleDifficulty(stored);
  } catch { /* noop */ }
  // First-time puzzle visitors land on the tutorial so the rules are obvious.
  return 'tutorial';
}

function savePuzzleDifficulty(difficulty: PuzzleDifficulty) {
  try {
    if (difficulty === 'tutorial') {
      localStorage.setItem(PUZZLE_DIFFICULTY_KEY, 'tutorial');
    } else {
      localStorage.setItem(PUZZLE_DIFFICULTY_KEY, String(clampPuzzleDifficulty(difficulty)));
    }
  } catch { /* noop */ }
}

function loadChromaDifficulty(): ChromaDifficulty {
  try {
    const stored = localStorage.getItem(CHROMA_DIFFICULTY_KEY);
    if (stored === 'normal') return stored;
  } catch { /* noop */ }
  return 'normal';
}

function loadGravityDifficulty(): GravityDifficulty {
  try {
    const stored = localStorage.getItem(GRAVITY_DIFFICULTY_KEY);
    if (
      stored === 'zen' ||
      stored === 'easy' ||
      stored === 'normal' ||
      stored === 'hard'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  return 'normal';
}

function saveGravityDifficulty(difficulty: GravityDifficulty) {
  try {
    localStorage.setItem(GRAVITY_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadDropDifficulty(): DropDifficulty {
  try {
    const stored = localStorage.getItem(DROP_DIFFICULTY_KEY);
    if (
      stored === 'zen' ||
      stored === 'easy' ||
      stored === 'normal' ||
      stored === 'hard'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  return 'normal';
}

function saveDropDifficulty(difficulty: DropDifficulty) {
  try {
    localStorage.setItem(DROP_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadMirrorDifficulty(): MirrorDifficulty {
  try {
    const stored = localStorage.getItem(MIRROR_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

function saveMirrorDifficulty(difficulty: MirrorDifficulty) {
  try {
    localStorage.setItem(MIRROR_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadBreatheDifficulty(): BreatheDifficulty {
  try {
    const stored = localStorage.getItem(BREATHE_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

function saveBreatheDifficulty(difficulty: BreatheDifficulty) {
  try {
    localStorage.setItem(BREATHE_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadPipelineDifficulty(): PipelineDifficulty {
  try {
    const stored = localStorage.getItem(PIPELINE_DIFFICULTY_KEY);
    if (
      stored === 'zen' ||
      stored === 'easy' ||
      stored === 'normal' ||
      stored === 'hard'
    ) {
      return stored;
    }
  } catch { /* noop */ }
  return 'normal';
}

function savePipelineDifficulty(difficulty: PipelineDifficulty) {
  try {
    localStorage.setItem(PIPELINE_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadScarDifficulty(): ScarDifficulty {
  try {
    const stored = localStorage.getItem(SCAR_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'normal';
}

function saveScarDifficulty(difficulty: ScarDifficulty) {
  try {
    localStorage.setItem(SCAR_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadMonolithDifficulty(): MonolithDifficulty {
  try {
    const stored = localStorage.getItem(MONOLITH_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

function saveMonolithDifficulty(difficulty: MonolithDifficulty) {
  try {
    localStorage.setItem(MONOLITH_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadQuarantineDifficulty(): QuarantineDifficulty {
  try {
    const stored = localStorage.getItem(QUARANTINE_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

function saveQuarantineDifficulty(difficulty: QuarantineDifficulty) {
  try {
    localStorage.setItem(QUARANTINE_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

function loadHeadingDifficulty(): HeadingDifficulty {
  try {
    const stored = localStorage.getItem(HEADING_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

function saveHeadingDifficulty(difficulty: HeadingDifficulty) {
  try {
    localStorage.setItem(HEADING_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

/**
 * Read the player's last-selected Decay difficulty from localStorage,
 * defaulting to `'easy'` if the key is missing or invalid. Mirrors every
 * other `load*Difficulty` helper — silent failure on storage errors so
 * the game still boots in private-mode browsers.
 */
function loadDecayDifficulty(): DecayDifficulty {
  try {
    const stored = localStorage.getItem(DECAY_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

/**
 * Persist the chosen Decay difficulty so subsequent app loads resume on
 * the same rung. Silent failure on storage errors (private-mode etc.).
 */
function saveDecayDifficulty(difficulty: DecayDifficulty) {
  try {
    localStorage.setItem(DECAY_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

/**
 * Shape of a stored Heading puzzle. Same skeleton as Breathe / Mirror —
 * starting board (always empty for Heading), tray (carries per-piece
 * `heading` rotation indices), and target. Persisted so a refresh
 * restores the same challenge and Restart returns to this exact start.
 */
type StoredHeadingPuzzle = {
  difficulty: HeadingDifficulty;
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
};

function headingPuzzleStorageKey(difficulty: HeadingDifficulty): string {
  return `${HEADING_PUZZLE_KEY_PREFIX}${difficulty}`;
}

function isValidStoredHeadingPuzzle(
  p: unknown,
  expected: HeadingDifficulty
): p is StoredHeadingPuzzle {
  if (!p || typeof p !== 'object') return false;
  const r = p as Partial<StoredHeadingPuzzle>;
  if (r.difficulty !== expected) return false;
  if (!Array.isArray(r.board) || r.board.length !== BOARD_SIZE) return false;
  for (const row of r.board) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
  }
  if (!Array.isArray(r.tray) || r.tray.length === 0) return false;
  if (!Array.isArray(r.target) || r.target.length !== BOARD_SIZE) return false;
  for (const row of r.target) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
  }
  return true;
}

function loadHeadingPuzzle(expected: HeadingDifficulty): StoredHeadingPuzzle | null {
  try {
    const raw = localStorage.getItem(headingPuzzleStorageKey(expected));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidStoredHeadingPuzzle(parsed, expected)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveHeadingPuzzle(p: StoredHeadingPuzzle) {
  try {
    localStorage.setItem(headingPuzzleStorageKey(p.difficulty), JSON.stringify(p));
  } catch { /* noop */ }
}

/**
 * Read the player's last-selected Fuse difficulty from localStorage,
 * defaulting to `'easy'` if the key is missing or invalid. Mirrors every
 * other `load*Difficulty` helper — silent failure on storage errors so
 * the game still boots in private-mode browsers.
 */
function loadFuseDifficulty(): FuseDifficulty {
  try {
    const stored = localStorage.getItem(FUSE_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

/**
 * Persist the chosen Fuse difficulty so subsequent app loads resume on
 * the same rung. Silent failure on storage errors (private-mode etc.).
 */
function saveFuseDifficulty(difficulty: FuseDifficulty) {
  try {
    localStorage.setItem(FUSE_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

/**
 * Shape of a stored Fuse puzzle. Mirrors the Heading skeleton — starting
 * board (carries `FUSE_COLOR` sentinels), tray (random rotation +
 * palette), target pattern, and the parallel fuse-cell list with each
 * fuse's countdown. Persisted so a refresh restores the same challenge
 * and Restart returns to this exact start.
 */
type StoredFusePuzzle = {
  difficulty: FuseDifficulty;
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
  fuseCells: FuseCell[];
};

function fusePuzzleStorageKey(difficulty: FuseDifficulty): string {
  return `${FUSE_PUZZLE_KEY_PREFIX}${difficulty}`;
}

function isValidStoredFusePuzzle(
  p: unknown,
  expected: FuseDifficulty
): p is StoredFusePuzzle {
  if (!p || typeof p !== 'object') return false;
  const r = p as Partial<StoredFusePuzzle>;
  if (r.difficulty !== expected) return false;
  if (!Array.isArray(r.board) || r.board.length !== BOARD_SIZE) return false;
  for (const row of r.board) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
  }
  if (!Array.isArray(r.tray) || r.tray.length === 0) return false;
  if (!Array.isArray(r.target) || r.target.length !== BOARD_SIZE) return false;
  for (const row of r.target) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
  }
  if (!Array.isArray(r.fuseCells)) return false;
  for (const f of r.fuseCells) {
    if (!f || typeof f !== 'object') return false;
    const fc = f as Partial<FuseCell>;
    if (
      typeof fc.row !== 'number' ||
      typeof fc.col !== 'number' ||
      typeof fc.countdown !== 'number'
    ) {
      return false;
    }
  }
  return true;
}

function loadFusePuzzle(expected: FuseDifficulty): StoredFusePuzzle | null {
  try {
    const raw = localStorage.getItem(fusePuzzleStorageKey(expected));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidStoredFusePuzzle(parsed, expected)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveFusePuzzle(p: StoredFusePuzzle) {
  try {
    localStorage.setItem(fusePuzzleStorageKey(p.difficulty), JSON.stringify(p));
  } catch { /* noop */ }
}

/**
 * Read the player's last-selected Erasures difficulty from localStorage,
 * defaulting to `'easy'` if the key is missing or invalid. Mirrors every
 * other `load*Difficulty` helper — silent failure on storage errors so
 * the game still boots in private-mode browsers.
 */
function loadErasuresDifficulty(): ErasuresDifficulty {
  try {
    const stored = localStorage.getItem(ERASURES_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

/**
 * Persist the chosen Erasures difficulty so subsequent app loads resume
 * on the same rung. Silent failure on storage errors (private-mode etc.).
 */
function saveErasuresDifficulty(difficulty: ErasuresDifficulty) {
  try {
    localStorage.setItem(ERASURES_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

/**
 * Read the player's last-selected Tether difficulty from localStorage,
 * defaulting to `'easy'` if the key is missing or invalid. Mirrors every
 * other `load*Difficulty` helper — silent failure on storage errors so
 * the game still boots in private-mode browsers.
 */
function loadTetherDifficulty(): TetherDifficulty {
  try {
    const stored = localStorage.getItem(TETHER_DIFFICULTY_KEY);
    if (stored === 'easy' || stored === 'normal' || stored === 'hard') {
      return stored;
    }
  } catch { /* noop */ }
  return 'easy';
}

/**
 * Persist the chosen Tether difficulty so subsequent app loads resume
 * on the same rung. Silent failure on storage errors (private-mode etc.).
 */
function saveTetherDifficulty(difficulty: TetherDifficulty) {
  try {
    localStorage.setItem(TETHER_DIFFICULTY_KEY, difficulty);
  } catch { /* noop */ }
}

/**
 * Shape of a stored Erasures puzzle. Mirrors the Heading skeleton —
 * starting board (carries pre-fill sentinel cells), tray (random
 * rotation + palette), and target pattern. Unlike Fuse there's no
 * per-cell countdown to persist; the token reserve is regenerated from
 * `erasureTokenCount(difficulty)` on every load so the player always
 * starts a fresh round with a full token grant. Persisted so a refresh
 * restores the same challenge and Restart returns to this exact start.
 */
type StoredErasuresPuzzle = {
  difficulty: ErasuresDifficulty;
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
};

function erasuresPuzzleStorageKey(difficulty: ErasuresDifficulty): string {
  return `${ERASURES_PUZZLE_KEY_PREFIX}${difficulty}`;
}

function isValidStoredErasuresPuzzle(
  p: unknown,
  expected: ErasuresDifficulty
): p is StoredErasuresPuzzle {
  if (!p || typeof p !== 'object') return false;
  const r = p as Partial<StoredErasuresPuzzle>;
  if (r.difficulty !== expected) return false;
  if (!Array.isArray(r.board) || r.board.length !== BOARD_SIZE) return false;
  for (const row of r.board) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
  }
  if (!Array.isArray(r.tray) || r.tray.length === 0) return false;
  if (!Array.isArray(r.target) || r.target.length !== BOARD_SIZE) return false;
  for (const row of r.target) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
  }
  return true;
}

function loadErasuresPuzzle(expected: ErasuresDifficulty): StoredErasuresPuzzle | null {
  try {
    const raw = localStorage.getItem(erasuresPuzzleStorageKey(expected));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidStoredErasuresPuzzle(parsed, expected)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveErasuresPuzzle(p: StoredErasuresPuzzle) {
  try {
    localStorage.setItem(erasuresPuzzleStorageKey(p.difficulty), JSON.stringify(p));
  } catch { /* noop */ }
}

/**
 * Fresh seed for a Scar run's RNG. XOR with a random 32-bit chunk on top
 * of `Date.now()` so two Scar runs started in the same millisecond still
 * diverge — important on auto-restart loops in tests / dev.
 */
function freshScarRngSeed(): number {
  return ((Date.now() & 0xffffffff) ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
}

/**
 * Shape of the active puzzle as persisted to localStorage. Storing the
 * puzzle's starting position (not mid-game state) means refresh restores the
 * same challenge, and Restart returns to this exact beginning.
 */
type StoredPuzzle = {
  difficulty: PuzzleLevel;
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
};

function isValidStoredPuzzle(p: unknown, expected: PuzzleLevel): p is StoredPuzzle {
  if (!p || typeof p !== 'object') return false;
  const r = p as Partial<StoredPuzzle>;
  if (r.difficulty !== expected) return false;
  if (!Array.isArray(r.board) || r.board.length !== BOARD_SIZE) return false;
  for (const row of r.board) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
  }
  if (!Array.isArray(r.tray) || r.tray.length === 0) return false;
  if (!Array.isArray(r.target) || r.target.length !== BOARD_SIZE) return false;
  for (const row of r.target) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
  }
  return true;
}

function loadPuzzle(expected: PuzzleLevel): StoredPuzzle | null {
  try {
    const raw = localStorage.getItem(puzzleKey(expected));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidStoredPuzzle(parsed, expected)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePuzzle(p: StoredPuzzle) {
  try {
    localStorage.setItem(puzzleKey(p.difficulty), JSON.stringify(p));
  } catch { /* noop */ }
}

function cloneBoard(b: BoardGrid): BoardGrid {
  return b.map((row) => [...row]);
}
function cloneTarget(t: TargetPattern): TargetPattern {
  return t.map((row) => [...row]);
}
function cloneTray(t: PieceShape[]): PieceShape[] {
  return t.map((p) => ({ ...p, cells: p.cells.map((c) => ({ ...c })) }));
}
function cloneFuseCells(fuses: readonly FuseCell[]): FuseCell[] {
  return fuses.map((f) => ({ row: f.row, col: f.col, countdown: f.countdown }));
}

/**
 * Build a fresh state for the given puzzle difficulty, reusing the passed-in
 * best score and classic-difficulty selection. If `forceNew` is false and a
 * puzzle for this difficulty is already stored in localStorage (from a
 * previous session or a switch), that puzzle is loaded so the player faces
 * the same challenge they were on. Otherwise a new puzzle is generated and
 * persisted.
 */
function freshPuzzleState(
  difficulty: PuzzleLevel,
  classicDifficulty: ClassicDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved,
  options: { forceNew?: boolean } = {}
): GameState {
  const clamped = clampPuzzleDifficulty(difficulty);

  let stored = options.forceNew ? null : loadPuzzle(clamped);
  if (!stored) {
    const { board, tray, target } = generatePuzzle({ difficulty: clamped });
    stored = { difficulty: clamped, board, tray, target };
    savePuzzle(stored);
  }

  return {
    board: cloneBoard(stored.board),
    tray: cloneTray(stored.tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'puzzle',
    classicDifficulty,
    puzzleDifficulty: clamped,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: cloneTarget(stored.target),
    puzzleInitialBoard: cloneBoard(stored.board),
    puzzleInitialTray: cloneTray(stored.tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a state for the given tutorial step. Unlike numeric puzzles we do
 * not persist the puzzle — step content is authored in `tutorial.ts` and
 * always reloaded fresh. Best-score tracking is skipped so tutorial plays
 * don't pollute the leaderboard.
 */
function freshTutorialState(
  step: number,
  classicDifficulty: ClassicDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const safeStep = clampTutorialStep(step);
  const data = getTutorialStep(safeStep);
  return {
    board: cloneBoard(data.board),
    tray: cloneTray(data.tray),
    score: 0,
    bestScore: 0,
    combo: 0,
    isGameOver: false,
    mode: 'puzzle',
    classicDifficulty,
    puzzleDifficulty: 'tutorial',
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: cloneTarget(data.target),
    puzzleInitialBoard: cloneBoard(data.board),
    puzzleInitialTray: cloneTray(data.tray),
    tutorialStep: safeStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a puzzle state from an inbound share link's decoded payload. Does
 * NOT touch localStorage — the shared puzzle is ephemeral, so it must not
 * clobber whatever puzzle the player already had at this difficulty. The
 * puzzle is still used for Restart via `puzzleInitialBoard/Tray`.
 */
function freshPuzzleStateFromShared(
  shared: { difficulty: PuzzleLevel; board: BoardGrid; tray: PieceShape[]; target: TargetPattern },
  classicDifficulty: ClassicDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  return {
    board: cloneBoard(shared.board),
    tray: cloneTray(shared.tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'puzzle',
    classicDifficulty,
    puzzleDifficulty: shared.difficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: cloneTarget(shared.target),
    puzzleInitialBoard: cloneBoard(shared.board),
    puzzleInitialTray: cloneTray(shared.tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

function freshClassicState(
  difficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'classic',
    classicDifficulty: difficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Chroma state. Classic-shaped (empty board, random tray,
 * score-tracked) but with the Chroma palette and the no-touching-colors
 * rule enforced on placement.
 */
function freshChromaState(
  difficulty: ChromaDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateChromaTray(),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'chroma',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty: difficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Gravity state. Structurally identical to Classic (empty
 * board, random tray, score-tracked, classic piece difficulty weights),
 * but `mode: 'gravity'` is what signals the reducer to run the cascade
 * pipeline on each placement.
 */
function freshGravityState(
  difficulty: GravityDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'gravity',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty: difficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Drop state. Same piece pool as Classic/Gravity (classic
 * difficulty weights), but `mode: 'drop'` is what signals the reducer to
 * run the Tetris-style rigid-body fall + row-only clear + slab-collapse
 * pipeline on each placement instead of Classic's clear-in-place logic.
 */
function freshDropState(
  difficulty: DropDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'drop',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty: difficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Mirror state. Reuses the puzzle-mode goal/undo/restart
 * scaffolding (`puzzleTarget`, `puzzleInitialBoard`, `puzzleInitialTray`,
 * `puzzleResult`, `puzzleUndoStack`) since Mirror is a puzzle-style mode
 * with a target pattern and a finite tray. The placement pipeline keys
 * off `mode === 'mirror'` to apply the reflective placement rules.
 *
 * Unlike Puzzle, Mirror puzzles are not persisted to localStorage —
 * mirror generation is fast and the puzzles aren't difficulty-tracked
 * with first-solved milestones, so a fresh puzzle on each entry keeps
 * the experience surprising and the storage footprint tiny.
 */
function freshMirrorState(
  difficulty: MirrorDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const { board, tray, target } = generateMirrorPuzzle({ difficulty });
  return {
    board: cloneBoard(board),
    tray: cloneTray(tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'mirror',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty: difficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: cloneTarget(target),
    puzzleInitialBoard: cloneBoard(board),
    puzzleInitialTray: cloneTray(tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Breathe state. Reuses the puzzle-mode goal/undo/restart
 * scaffolding (`puzzleTarget`, `puzzleInitialBoard`, `puzzleInitialTray`,
 * `puzzleResult`, `puzzleUndoStack`) since Breathe is a puzzle-style mode
 * with a target pattern and a finite tray. The placement pipeline keys
 * off `mode === 'breathe'` to apply the additional no-2×2 win check on
 * the final board.
 *
 * Like Mirror, Breathe puzzles aren't persisted to localStorage —
 * generation is fast and a fresh puzzle on each entry keeps the
 * experience surprising while keeping the storage footprint tiny.
 */
function freshBreatheState(
  difficulty: BreatheDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const { board, tray, target } = generateBreathePuzzle({ difficulty });
  return {
    board: cloneBoard(board),
    tray: cloneTray(tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'breathe',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty: difficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: cloneTarget(target),
    puzzleInitialBoard: cloneBoard(board),
    puzzleInitialTray: cloneTray(tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Pipeline state. Same skeleton as Classic (empty board,
 * random tray drawn from the classic-weighted pool, score-tracked) — the
 * twist is the round-robin tray-slot lock, not the piece vocabulary, so
 * we reuse `generateClassicTray` and let `mode: 'pipeline'` plus
 * `pipelinePhase` drive the placement-rule branching in the reducer.
 *
 * `pipelinePhase` is reset to 0 here (and on RESTART / mode change /
 * difficulty change), giving the player a predictable "always start at
 * slot 0" anchor even when they hop between modes.
 */
function freshPipelineState(
  difficulty: PipelineDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'pipeline',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty: difficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Scar state. Score-attack like Classic — empty board,
 * Classic piece weights, classic line-clear logic — except every cleared
 * line triggers a "scar burst" that permanently damages a few empty
 * cells (see `scar.ts` for the mechanics). Each entry into the mode
 * rerolls `scarRngSeed` so two consecutive runs play out differently
 * even when the player makes identical moves.
 */
function freshScarState(
  difficulty: ScarDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'scar',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty: difficulty,
    scarRngSeed: freshScarRngSeed(),
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Monolith state. Reuses the puzzle-mode goal/undo/restart
 * scaffolding (`puzzleTarget`, `puzzleInitialBoard`, `puzzleInitialTray`,
 * `puzzleResult`, `puzzleUndoStack`) since Monolith is a puzzle-style
 * mode with a target pattern and a finite tray. The placement pipeline
 * keys off `mode === 'monolith'` to enforce the "must touch monolith"
 * + "single 4-connected component after clears" invariants.
 *
 * Like Mirror/Breathe, Monolith puzzles aren't persisted to localStorage
 * — generation is fast and a fresh puzzle on each entry keeps the
 * experience surprising while keeping the storage footprint tiny.
 */
function freshMonolithState(
  difficulty: MonolithDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const { board, tray, target } = generateMonolithPuzzle({ difficulty });
  return {
    board: cloneBoard(board),
    tray: cloneTray(tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'monolith',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty: difficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: cloneTarget(target),
    puzzleInitialBoard: cloneBoard(board),
    puzzleInitialTray: cloneTray(tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Quarantine state. Reuses the puzzle-mode goal/undo/restart
 * scaffolding (`puzzleResult`, `puzzleUndoStack`, `puzzleInitialBoard`,
 * `puzzleInitialTray`) since Quarantine is a puzzle-style mode with a
 * finite tray and a deterministic win check. The win check is region-
 * specific (per-region empty count vs target) rather than target-pattern
 * matching, so `puzzleTarget` stays null and `quarantineRegions` /
 * `quarantineTargets` carry the win-state metadata.
 */
function freshQuarantineState(
  difficulty: QuarantineDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const { board, tray, regions, targets } = generateQuarantinePuzzle({ difficulty });
  return {
    board: cloneBoard(board),
    tray: cloneTray(tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'quarantine',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty: difficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: regions.map((r) => r.map((c) => ({ ...c }))),
    quarantineTargets: [...targets],
    quarantineInitialRegions: regions.map((r) => r.map((c) => ({ ...c }))),
    quarantineInitialTargets: [...targets],
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: cloneBoard(board),
    puzzleInitialTray: cloneTray(tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Heading state. Reuses the puzzle-mode goal/undo/restart
 * scaffolding (`puzzleTarget`, `puzzleInitialBoard`, `puzzleInitialTray`,
 * `puzzleResult`, `puzzleUndoStack`) since Heading is a puzzle-style mode
 * with a target pattern and a finite tray. The placement pipeline keys
 * off `mode === 'heading'` to apply the heading-aware half-clear rule
 * (clears only erase the half of the row/column the placement's heading
 * points toward; FULL-heading pieces revert to Classic full-line clears).
 *
 * Unlike Mirror/Breathe, Heading puzzles ARE persisted to localStorage —
 * the per-piece rotation/heading state means a refresh-and-resume needs
 * the original tray (and target) to keep the same instance, and the
 * `forceNew` knob lets NEW_HEADING_PUZZLE / SET_HEADING_DIFFICULTY blow
 * the cache when the player explicitly asks for a fresh challenge.
 */
function freshHeadingState(
  difficulty: HeadingDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved,
  options: { forceNew?: boolean } = {}
): GameState {
  let stored = options.forceNew ? null : loadHeadingPuzzle(difficulty);
  if (!stored) {
    const { board, tray, target } = generateHeadingPuzzle({ difficulty });
    stored = { difficulty, board, tray, target };
    saveHeadingPuzzle(stored);
  }

  return {
    board: cloneBoard(stored.board),
    tray: cloneTray(stored.tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'heading',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty: difficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: cloneTarget(stored.target),
    puzzleInitialBoard: cloneBoard(stored.board),
    puzzleInitialTray: cloneTray(stored.tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Decay state. Score-attack like Classic / Scar — empty
 * board topped up with a small pre-filled "already ripe" seed so the
 * player has immediate clearing agency, Classic piece weights, refilling
 * tray. The twist is that line clears gate on per-cell **age**: a row /
 * column only clears once every filled cell along it has aged ≥
 * `decayThreshold(decayDifficulty)`. The PLACE_PIECE branch keys off
 * `mode === 'decay'` to drive `boardAges` through the canonical
 * place → tick → detect → clear pipeline.
 *
 * Each entry into the mode rerolls the pre-fill RNG seed via
 * `freshDecayRngSeed()` so two consecutive runs start from visibly
 * different boards even at the same difficulty. The seed itself isn't
 * persisted — only the chosen difficulty is remembered across sessions.
 */
function freshDecayState(
  difficulty: DecayDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const rng = decayRng(freshDecayRngSeed());
  const T = decayThreshold(difficulty);
  const prefillCount = decayPrefillCount(difficulty);
  const { board, ages } = seedAgedPrefill(prefillCount, T, rng);

  return {
    board,
    tray: generateClassicTray(difficulty, board),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'decay',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty: difficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: ages,
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Fuse state. Reuses the puzzle-mode goal/undo/restart
 * scaffolding (`puzzleTarget`, `puzzleInitialBoard`, `puzzleInitialTray`,
 * `puzzleResult`, `puzzleUndoStack`) since Fuse is a puzzle-style mode
 * with a target pattern and a finite tray. The starting board carries
 * `K = fuseCount(difficulty)` fuse-coloured cells, each with a positive
 * countdown stored in `state.fuseCells`. The PLACE_PIECE branch keys
 * off `mode === 'fuse'` to apply the canonical
 * place → clear → drop-cleared-fuses → decrement → expire → win-check
 * pipeline.
 *
 * Like Heading puzzles, Fuse puzzles ARE persisted to localStorage —
 * the per-fuse countdown state means a refresh-and-resume needs the
 * original tray, target, and fuse list to keep the same instance, and
 * the `forceNew` knob lets NEW_FUSE_PUZZLE / SET_FUSE_DIFFICULTY blow
 * the cache when the player explicitly asks for a fresh challenge.
 */
function freshFuseState(
  difficulty: FuseDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved,
  options: { forceNew?: boolean } = {}
): GameState {
  let stored = options.forceNew ? null : loadFusePuzzle(difficulty);
  if (!stored) {
    const { board, tray, target, fuseCells } = generateFusePuzzle({ difficulty });
    stored = { difficulty, board, tray, target, fuseCells };
    saveFusePuzzle(stored);
  }

  return {
    board: cloneBoard(stored.board),
    tray: cloneTray(stored.tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'fuse',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty: difficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: cloneTarget(stored.target),
    puzzleInitialBoard: cloneBoard(stored.board),
    puzzleInitialTray: cloneTray(stored.tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: cloneFuseCells(stored.fuseCells),
    fuseInitialCells: cloneFuseCells(stored.fuseCells),
    erasuresDifficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Erasures state. Reuses the puzzle-mode goal/undo/restart
 * scaffolding (`puzzleTarget`, `puzzleInitialBoard`, `puzzleInitialTray`,
 * `puzzleResult`, `puzzleUndoStack`) since Erasures is a puzzle-style mode
 * with a target pattern and a finite tray. The starting board carries
 * pre-fill blockers; the player owns `K = erasureTokenCount(difficulty)`
 * erase tokens, each of which deletes one 4-connected component of
 * player-placed cells when spent (sentinels and pre-fill are immune).
 *
 * Like Heading / Fuse puzzles, Erasures puzzles ARE persisted to
 * localStorage — the per-instance pre-fill layout means a refresh-and-
 * resume needs the original board / tray / target to keep the same
 * challenge, and the `forceNew` knob lets NEW_ERASURES_PUZZLE /
 * SET_ERASURES_DIFFICULTY blow the cache when the player explicitly
 * asks for a fresh challenge. The token reserve is regenerated from
 * the difficulty on every load so a refresh resets the budget alongside
 * the board, matching the player's mental model of "I started a fresh
 * Erasures round at this difficulty".
 */
function freshErasuresState(
  difficulty: ErasuresDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  tetherDifficulty: TetherDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved,
  options: { forceNew?: boolean } = {}
): GameState {
  let stored = options.forceNew ? null : loadErasuresPuzzle(difficulty);
  if (!stored) {
    const { board, tray, target } = generateErasuresPuzzle({ difficulty });
    stored = { difficulty, board, tray, target };
    saveErasuresPuzzle(stored);
  }

  return {
    board: cloneBoard(stored.board),
    tray: cloneTray(stored.tray),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'erasures',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: cloneTarget(stored.target),
    puzzleInitialBoard: cloneBoard(stored.board),
    puzzleInitialTray: cloneTray(stored.tray),
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty: difficulty,
    tetherDifficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: erasureTokenCount(difficulty),
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

/**
 * Build a fresh Tether state. Endless score-attack like Classic / Decay
 * — empty board, three-slot refilling tray, Classic piece weights — but
 * with the **paired-slot Chebyshev-2 origin coupling** rule applied at
 * placement time. Slots 0 and 1 form the tethered pair; slot 2 is the
 * free piece. After the player places a piece from a paired slot, the
 * partner-slot's next placement must include at least one cell within
 * Chebyshev-distance ≤ 2 of any cell of the prior placement; otherwise
 * the placement is rejected. Slot 2 placements never set the window
 * and are never constrained by it.
 *
 * The state's `lastPairedPlacementCells` and `lastPairedSlot` start
 * `null` (no constraint active on the first placement of a fresh
 * round); the PLACE_PIECE branch keying off `mode === 'tether'` drives
 * them through the per-placement pipeline.
 *
 * Difficulty doesn't change the Chebyshev radius (always 2). It varies
 * the *shape* of the constraint via the tray sampler — see
 * `tetherDifficultySpec` and `generateTetherTray`.
 */
function freshTetherState(
  difficulty: TetherDifficulty,
  classicDifficulty: ClassicDifficulty,
  puzzleDifficulty: PuzzleDifficulty,
  chromaDifficulty: ChromaDifficulty,
  gravityDifficulty: GravityDifficulty,
  dropDifficulty: DropDifficulty,
  mirrorDifficulty: MirrorDifficulty,
  breatheDifficulty: BreatheDifficulty,
  pipelineDifficulty: PipelineDifficulty,
  scarDifficulty: ScarDifficulty,
  monolithDifficulty: MonolithDifficulty,
  quarantineDifficulty: QuarantineDifficulty,
  headingDifficulty: HeadingDifficulty,
  decayDifficulty: DecayDifficulty,
  fuseDifficulty: FuseDifficulty,
  erasuresDifficulty: ErasuresDifficulty,
  bestScore: number,
  tutorialStep: number,
  puzzleEverSolved: PuzzleEverSolved
): GameState {
  const board = createEmptyBoard();
  return {
    board,
    // Round start has no active tether window, so the Hard sampler
    // skips the resample and we get a vanilla three-piece sample —
    // matching the player's mental model of "a fresh round can't
    // already require a partner-piece placement to land in a
    // window I haven't established yet".
    tray: generateTetherTray(difficulty, board, null),
    score: 0,
    bestScore,
    combo: 0,
    isGameOver: false,
    mode: 'tether',
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    pipelinePhase: 0,
    scarDifficulty,
    scarRngSeed: 0,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    quarantineRegions: null,
    quarantineTargets: null,
    quarantineInitialRegions: null,
    quarantineInitialTargets: null,
    puzzleResult: null,
    puzzleTarget: null,
    puzzleInitialBoard: null,
    puzzleInitialTray: null,
    tutorialStep,
    puzzleLevelUp: null,
    puzzleEverSolved,
    lastCascade: null,
    boardAges: emptyDecayAges(),
    fuseCells: [],
    fuseInitialCells: [],
    erasuresDifficulty,
    tetherDifficulty: difficulty,
    lastPairedPlacementCells: null,
    lastPairedSlot: null,
    erasureTokens: null,
    erasureSelectMode: false,
    puzzleUndoStack: [],
  };
}

export function createInitialState(): GameState {
  migrateLegacyKeys();
  const classicDifficulty = loadClassicDifficulty();
  const puzzleDifficulty = loadPuzzleDifficulty();
  const chromaDifficulty = loadChromaDifficulty();
  const gravityDifficulty = loadGravityDifficulty();
  const dropDifficulty = loadDropDifficulty();
  const mirrorDifficulty = loadMirrorDifficulty();
  const breatheDifficulty = loadBreatheDifficulty();
  const pipelineDifficulty = loadPipelineDifficulty();
  const scarDifficulty = loadScarDifficulty();
  const monolithDifficulty = loadMonolithDifficulty();
  const quarantineDifficulty = loadQuarantineDifficulty();
  const headingDifficulty = loadHeadingDifficulty();
  const decayDifficulty = loadDecayDifficulty();
  const fuseDifficulty = loadFuseDifficulty();
  const erasuresDifficulty = loadErasuresDifficulty();
  const tetherDifficulty = loadTetherDifficulty();
  const tutorialStep = loadTutorialStep();
  // Load the "ever solved" set exactly once at init — from here on the
  // reducer only reads/writes `state.puzzleEverSolved`. Keeping
  // localStorage reads out of the reducer is what lets it stay idempotent
  // under React 19 StrictMode's double-invocation-in-dev guard.
  const puzzleEverSolved = loadPuzzleEverSolved();

  // A share link in the URL hash takes precedence over saved state so the
  // recipient lands directly on the shared puzzle. We intentionally do NOT
  // call saveMode / savePuzzleDifficulty / savePuzzle here — the
  // shared puzzle is ephemeral and must not overwrite whatever the user
  // had going on at that difficulty.
  const sharedPayload = parseSharePayload();
  if (sharedPayload) {
    const decoded = decodePuzzle(sharedPayload);
    if (decoded) {
      return freshPuzzleStateFromShared(
        decoded,
        classicDifficulty,
        chromaDifficulty,
        gravityDifficulty,
        dropDifficulty,
        mirrorDifficulty,
        breatheDifficulty,
        pipelineDifficulty,
        scarDifficulty,
        monolithDifficulty,
        quarantineDifficulty,
        headingDifficulty,
        decayDifficulty,
        fuseDifficulty,
        erasuresDifficulty,
        tetherDifficulty,
        loadBestScore('puzzle', decoded.difficulty),
        tutorialStep,
        puzzleEverSolved
      );
    }
  }

  const mode = loadMode();
  if (mode === 'puzzle') {
    if (puzzleDifficulty === 'tutorial') {
      // Always (re)start the tutorial from step 1 on entry, regardless of
      // any previously-persisted progress. The tutorial is short and
      // players returning to it generally want to replay the full thing.
      return freshTutorialState(
        0,
        classicDifficulty,
        chromaDifficulty,
        gravityDifficulty,
        dropDifficulty,
        mirrorDifficulty,
        breatheDifficulty,
        pipelineDifficulty,
        scarDifficulty,
        monolithDifficulty,
        quarantineDifficulty,
        headingDifficulty,
        decayDifficulty,
        fuseDifficulty,
        erasuresDifficulty,
        tetherDifficulty,
        puzzleEverSolved
      );
    }
    return freshPuzzleState(
      puzzleDifficulty,
      classicDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('puzzle', puzzleDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'chroma') {
    return freshChromaState(
      chromaDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('chroma', chromaDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'gravity') {
    return freshGravityState(
      gravityDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('gravity', gravityDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'drop') {
    return freshDropState(
      dropDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('drop', dropDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'mirror') {
    return freshMirrorState(
      mirrorDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('mirror', mirrorDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'breathe') {
    return freshBreatheState(
      breatheDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('breathe', breatheDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'pipeline') {
    return freshPipelineState(
      pipelineDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('pipeline', pipelineDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'scar') {
    return freshScarState(
      scarDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('scar', scarDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'monolith') {
    return freshMonolithState(
      monolithDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('monolith', monolithDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'quarantine') {
    return freshQuarantineState(
      quarantineDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('quarantine', quarantineDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'heading') {
    return freshHeadingState(
      headingDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('heading', headingDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'decay') {
    return freshDecayState(
      decayDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('decay', decayDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'fuse') {
    return freshFuseState(
      fuseDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      erasuresDifficulty,
      tetherDifficulty,
      loadBestScore('fuse', fuseDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'erasures') {
    return freshErasuresState(
      erasuresDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      tetherDifficulty,
      loadBestScore('erasures', erasuresDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  if (mode === 'tether') {
    return freshTetherState(
      tetherDifficulty,
      classicDifficulty,
      puzzleDifficulty,
      chromaDifficulty,
      gravityDifficulty,
      dropDifficulty,
      mirrorDifficulty,
      breatheDifficulty,
      pipelineDifficulty,
      scarDifficulty,
      monolithDifficulty,
      quarantineDifficulty,
      headingDifficulty,
      decayDifficulty,
      fuseDifficulty,
      erasuresDifficulty,
      loadBestScore('tether', tetherDifficulty),
      tutorialStep,
      puzzleEverSolved
    );
  }

  return freshClassicState(
    classicDifficulty,
    puzzleDifficulty,
    chromaDifficulty,
    gravityDifficulty,
    dropDifficulty,
    mirrorDifficulty,
    breatheDifficulty,
    pipelineDifficulty,
    scarDifficulty,
    monolithDifficulty,
    quarantineDifficulty,
    headingDifficulty,
    decayDifficulty,
    fuseDifficulty,
    erasuresDifficulty,
    tetherDifficulty,
    loadBestScore('classic', classicDifficulty),
    tutorialStep,
    puzzleEverSolved
  );
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ROTATE_TRAY_PIECE': {
      const { trayIndex } = action;
      if (trayIndex < 0 || trayIndex >= state.tray.length) return state;
      // Pipeline mode locks rotation to the active slot. The chosen design
      // is "only the active piece can be rotated" (vs. "all rotate but
      // only active is placeable") — easier to read at a glance: if you
      // can't rotate it, you can't place it either, so it's clearly inert
      // until its turn. Non-active rotation requests are silent no-ops.
      if (state.mode === 'pipeline' && trayIndex !== state.pipelinePhase) {
        return state;
      }
      const piece = state.tray[trayIndex];
      if (!piece) return state;
      const newTray = [...state.tray];
      const rotated = rotatePiece90Clockwise(piece);
      // Heading mode: advance the piece's rotation index modulo 4 alongside
      // the visual rotation. The clear pipeline reads this `heading` field
      // (via `headingForPiece`) at placement time to decide which half of
      // the row/column to actually erase. Other modes ignore the field and
      // never read it.
      if (state.mode === 'heading') {
        const prev = piece.heading ?? 0;
        rotated.heading = ((prev + 1) % 4) as 0 | 1 | 2 | 3;
      }
      newTray[trayIndex] = rotated;
      const enforceColorAdjacency = state.mode === 'chroma';
      const isGameOver =
        state.mode === 'mirror'
          ? !hasValidMirrorMoves(state.board, newTray)
          : state.mode === 'monolith'
            ? !hasValidMonolithMoves(state.board, newTray)
            : state.mode === 'pipeline'
              ? !hasValidPipelineMoves(state.board, newTray, state.pipelinePhase)
              : state.mode === 'tether'
                // Tether mode: rotation may shrink/grow the piece's
                // footprint (e.g. an L-tromino rotated to a different
                // orientation has different cells), which can in turn
                // change whether ANY tether-window placement exists for
                // a paired-slot piece. Re-run the tether-aware predicate
                // (passing the rotation function so the helper can walk
                // every orientation) so the post-rotate game-over check
                // honours the constraint that paired pieces must land
                // inside the active window.
                ? !hasValidTetherMoves(
                    state.board,
                    newTray,
                    state.lastPairedPlacementCells,
                    state.lastPairedSlot,
                    rotatePiece90Clockwise
                  )
                : !hasValidMoves(state.board, newTray, { enforceColorAdjacency });
      const puzzleResult =
        (state.mode === 'puzzle' ||
          state.mode === 'mirror' ||
          state.mode === 'breathe' ||
          state.mode === 'monolith' ||
          state.mode === 'quarantine' ||
          state.mode === 'heading' ||
          state.mode === 'fuse' ||
          state.mode === 'erasures') &&
        isGameOver
          ? 'failed'
          : state.puzzleResult;
      return {
        ...state,
        tray: newTray,
        isGameOver,
        puzzleResult,
        puzzleLevelUp: null,
        lastCascade: null,
      };
    }

    case 'PLACE_PIECE': {
      const piece = state.tray[action.trayIndex];
      if (!piece) return state;

      // Pipeline mode: the tray is a strict round-robin queue, so only the
      // currently-active slot is legal to place from. Any other index gets
      // bounced just like an off-board placement — UI dispatchers treat the
      // returned-unchanged state as "drop rejected" so the player gets their
      // piece back. This guard runs BEFORE we fall into the shared
      // classic-style placement flow below; the rest of the branch (score,
      // clears, refill) is unchanged from Classic, with the post-placement
      // phase advance + game-over check applied at the tail.
      if (state.mode === 'pipeline' && action.trayIndex !== state.pipelinePhase) {
        return state;
      }

      // Scar mode: classic-style score-attack with one twist — every
      // placement that triggers a line clear "scars" a few empty cells,
      // turning them into permanent blockers. Branched out early so the
      // shared mid-section below stays Classic / Chroma / Gravity / Drop
      // / Puzzle exactly as it was. We deliberately route the cleared-
      // cells through `clearLinesPreservingScars` (NOT the shared
      // `clearLines`) — that's option 1 from the design spec, kept local
      // so other modes' clear semantics stay untouched.
      if (state.mode === 'scar') {
        // canPlacePiece already rejects any non-null cell, and SCAR_COLOR
        // cells are non-null — so scar overlap is rejected here without
        // any extra logic. (The sentinel-color trick is what makes this
        // mode so cheap to bolt on.)
        if (!canPlacePiece(state.board, piece, action.origin)) return state;

        let board = placePiece(state.board, piece, action.origin);
        let score = state.score + calculatePlacementScore(piece);
        let combo = state.combo;
        let scarRngSeed = state.scarRngSeed;

        // Scar cells count as filled by `detectCompletedLines` (they're
        // non-null), which is exactly what we want — a row containing a
        // scar can still be cleared, just like in Classic. The
        // preserve-scars clearer below leaves the scar in place when the
        // row is wiped, so the damaged terrain stays damaged.
        const { rows, cols } = detectCompletedLines(board);
        const linesCleared = rows.length + cols.length;

        if (linesCleared > 0) {
          board = clearLinesPreservingScars(board, rows, cols);
          score += calculateClearScore(linesCleared, combo);
          combo += 1;

          // One scar burst per clear EVENT, not per cleared line —
          // predictable damage cost regardless of how many lines you
          // collapse in a single placement. Difficulty controls only the
          // burst size.
          const k = scarsPerEvent(state.scarDifficulty);
          const avoidClusters = state.scarDifficulty === 'hard';
          const rng = mulberry32(scarRngSeed);
          const scarCells = pickScarCells(board, k, rng, { avoidClusters });
          board = applyScars(board, scarCells);
          // Bump the seed so the next burst (deterministic given the
          // seed) varies turn-to-turn rather than landing in identical
          // patterns when the post-clear board happens to look the same.
          scarRngSeed = (scarRngSeed + 1) >>> 0;
        } else {
          combo = 0;
        }

        const newTray = [...state.tray];
        newTray[action.trayIndex] = null;
        const allPlaced = newTray.every((s) => s === null);
        // Classic piece weights across all difficulties — Scar's challenge
        // is environmental (the scars), not the piece mix.
        const finalTray = allPlaced
          ? generateClassicTray(state.scarDifficulty, board)
          : newTray;

        const bestScore = Math.max(score, state.bestScore);
        // Game-over is the standard Classic-style check. `canPlacePiece`
        // (used inside `hasValidMoves`) already rejects scar cells via the
        // non-null sentinel, so no scar-aware variant is needed here.
        const isGameOver = !hasValidMoves(board, finalTray);

        if (bestScore > state.bestScore) {
          saveBestScore('scar', state.scarDifficulty, bestScore);
        }

        return {
          ...state,
          board,
          tray: finalTray,
          score,
          bestScore,
          combo,
          isGameOver,
          scarRngSeed,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: [],
        };
      }

      // Monolith mode: every placement must touch the existing monolith
      // (SEED + previously-placed cells), and after any line clears the
      // remaining monolith-fill cells must form a single 4-connected
      // component. `canPlaceMonolith` enforces both invariants. Like
      // Mirror/Breathe this is a target-pattern + finite-tray puzzle, so
      // we reuse the puzzle-mode undo/restart scaffolding and check
      // `boardMatchesTarget` on tray-empty.
      if (state.mode === 'monolith') {
        if (!canPlaceMonolith(state.board, piece, action.origin)) return state;

        const monolithUndoStack: PuzzleUndoSnapshot[] = [
          ...state.puzzleUndoStack,
          { board: state.board, tray: state.tray, score: state.score, combo: state.combo, fuseCells: state.fuseCells, erasureTokens: state.erasureTokens },
        ];

        let mboard = placePiece(state.board, piece, action.origin);
        let mscore = state.score + calculatePlacementScore(piece);
        let mcombo = state.combo;
        const { rows: mrows, cols: mcols } = detectCompletedLines(mboard);
        const mlinesCleared = mrows.length + mcols.length;
        if (mlinesCleared > 0) {
          mboard = clearLines(mboard, mrows, mcols);
          mscore += calculateClearScore(mlinesCleared, mcombo);
          mcombo += 1;
        } else {
          mcombo = 0;
        }

        const mNewTray = [...state.tray];
        mNewTray[action.trayIndex] = null;
        const mAllPlaced = mNewTray.every((s) => s === null);
        const mTarget = state.puzzleTarget;
        const mDifficulty = state.monolithDifficulty;

        if (mAllPlaced) {
          const solved = mTarget !== null && boardMatchesTarget(mboard, mTarget);
          if (solved) mscore += PUZZLE_SOLVE_BONUS;
          const bestScore = Math.max(mscore, state.bestScore);
          if (bestScore > state.bestScore) {
            saveBestScore('monolith', mDifficulty, bestScore);
          }
          return {
            ...state,
            board: mboard,
            tray: mNewTray,
            score: mscore,
            bestScore,
            combo: solved ? mcombo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp: null,
            lastCascade: null,
            puzzleUndoStack: monolithUndoStack,
          };
        }

        const isGameOver = !hasValidMonolithMoves(mboard, mNewTray);
        const bestScore = Math.max(mscore, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('monolith', mDifficulty, bestScore);
        }
        return {
          ...state,
          board: mboard,
          tray: mNewTray,
          score: mscore,
          bestScore,
          combo: mcombo,
          isGameOver,
          puzzleResult: isGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: monolithUndoStack,
        };
      }

      // Quarantine mode: walls partition the board into regions; each
      // region has an exact-empty-cell target. Placement uses the
      // standard `canPlacePiece` (walls already block as non-null
      // cells). Line clears use `clearLinesPreservingWalls` so wall
      // sentinels survive a row/column wipe. Win check on tray-empty:
      // every region's empty count must equal its target.
      if (state.mode === 'quarantine') {
        if (!canPlacePiece(state.board, piece, action.origin)) return state;

        const qUndoStack: PuzzleUndoSnapshot[] = [
          ...state.puzzleUndoStack,
          { board: state.board, tray: state.tray, score: state.score, combo: state.combo, fuseCells: state.fuseCells, erasureTokens: state.erasureTokens },
        ];

        let qboard = placePiece(state.board, piece, action.origin);
        let qscore = state.score + calculatePlacementScore(piece);
        let qcombo = state.combo;
        const { rows: qrows, cols: qcols } = detectClearableLinesQuarantine(qboard);
        const qlinesCleared = qrows.length + qcols.length;
        if (qlinesCleared > 0) {
          qboard = clearLinesPreservingWalls(qboard, qrows, qcols);
          qscore += calculateClearScore(qlinesCleared, qcombo);
          qcombo += 1;
        } else {
          qcombo = 0;
        }

        const qNewTray = [...state.tray];
        qNewTray[action.trayIndex] = null;
        const qAllPlaced = qNewTray.every((s) => s === null);
        const qRegions = state.quarantineRegions;
        const qTargets = state.quarantineTargets;
        const qDifficulty = state.quarantineDifficulty;

        if (qAllPlaced) {
          const solved =
            qRegions !== null &&
            qTargets !== null &&
            isQuarantineSolved(qboard, qRegions, qTargets);
          if (solved) qscore += PUZZLE_SOLVE_BONUS;
          const bestScore = Math.max(qscore, state.bestScore);
          if (bestScore > state.bestScore) {
            saveBestScore('quarantine', qDifficulty, bestScore);
          }
          return {
            ...state,
            board: qboard,
            tray: qNewTray,
            score: qscore,
            bestScore,
            combo: solved ? qcombo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp: null,
            lastCascade: null,
            puzzleUndoStack: qUndoStack,
          };
        }

        const isGameOver = !hasValidMoves(qboard, qNewTray);
        const bestScore = Math.max(qscore, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('quarantine', qDifficulty, bestScore);
        }
        return {
          ...state,
          board: qboard,
          tray: qNewTray,
          score: qscore,
          bestScore,
          combo: qcombo,
          isGameOver,
          puzzleResult: isGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: qUndoStack,
        };
      }

      // Erasures mode: structurally a puzzle (target pattern, finite
      // tray, undo-able placements). The twist is the K-token erase
      // budget — the placement step itself is a vanilla
      // canPlacePiece + placePiece + standard line clear sequence,
      // NEVER touches the token reserve. Tokens are spent only via
      // `ERASE_COMPONENT`. Per-placement pipeline (canonical):
      //   1. Validate placement (`canPlacePiece`).
      //   2. Place the piece on the board.
      //   3. Detect line clears (standard rules — pre-fill counts as
      //      filled exactly the same way Quarantine treats walls).
      //   4. Apply clears via `clearLines` (pre-fill is destructible
      //      via line clear — only sentinels protected by
      //      `clearLinesPreservingWalls` survive, and Erasures never
      //      stamps walls).
      //   5. Win check on tray-empty: target match. Remaining token
      //      count is irrelevant — extras don't fail the win check.
      // Standard puzzle game-over check; supports undo (snapshot
      // captures `erasureTokens` so undoing an erase restores the
      // budget).
      // The placement also clears `erasureSelectMode` so a stale
      // toggle from before the placement doesn't carry over (the
      // player has to re-engage the toggle to erase next turn).
      if (state.mode === 'erasures') {
        if (!canPlacePiece(state.board, piece, action.origin)) return state;

        const eUndoStack: PuzzleUndoSnapshot[] = [
          ...state.puzzleUndoStack,
          {
            board: state.board,
            tray: state.tray,
            score: state.score,
            combo: state.combo,
            fuseCells: state.fuseCells,
            erasureTokens: state.erasureTokens,
          },
        ];

        let eboard = placePiece(state.board, piece, action.origin);
        let escore = state.score + calculatePlacementScore(piece);
        let ecombo = state.combo;
        const { rows: erows, cols: ecols } = detectCompletedLines(eboard);
        const elinesCleared = erows.length + ecols.length;
        if (elinesCleared > 0) {
          eboard = clearLines(eboard, erows, ecols);
          escore += calculateClearScore(elinesCleared, ecombo);
          ecombo += 1;
        } else {
          ecombo = 0;
        }

        const eNewTray = [...state.tray];
        eNewTray[action.trayIndex] = null;
        const eAllPlaced = eNewTray.every((s) => s === null);
        const eTarget = state.puzzleTarget;
        const eDifficulty = state.erasuresDifficulty;

        if (eAllPlaced) {
          const solved = eTarget !== null && boardMatchesTarget(eboard, eTarget);
          if (solved) escore += PUZZLE_SOLVE_BONUS;
          const bestScore = Math.max(escore, state.bestScore);
          if (bestScore > state.bestScore) {
            saveBestScore('erasures', eDifficulty, bestScore);
          }
          return {
            ...state,
            board: eboard,
            tray: eNewTray,
            score: escore,
            bestScore,
            combo: solved ? ecombo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp: null,
            lastCascade: null,
            erasureSelectMode: false,
            puzzleUndoStack: eUndoStack,
          };
        }

        const eIsGameOver = !hasValidMoves(eboard, eNewTray);
        const bestScore = Math.max(escore, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('erasures', eDifficulty, bestScore);
        }
        return {
          ...state,
          board: eboard,
          tray: eNewTray,
          score: escore,
          bestScore,
          combo: ecombo,
          isGameOver: eIsGameOver,
          puzzleResult: eIsGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          erasureSelectMode: false,
          puzzleUndoStack: eUndoStack,
        };
      }

      // Heading mode: structurally a puzzle (target pattern, finite tray,
      // undo-able placements). The twist is that line clears use
      // `clearLinesHeadingHalf`, which only erases the half of the row /
      // column the placed piece's heading points toward; pieces with the
      // FULL heading sentinel revert to Classic full-line clears. Win
      // check on tray-empty: `boardMatchesTarget`.
      if (state.mode === 'heading') {
        if (!canPlacePiece(state.board, piece, action.origin)) return state;

        const hUndoStack: PuzzleUndoSnapshot[] = [
          ...state.puzzleUndoStack,
          { board: state.board, tray: state.tray, score: state.score, combo: state.combo, fuseCells: state.fuseCells, erasureTokens: state.erasureTokens },
        ];

        let hboard = placePiece(state.board, piece, action.origin);
        let hscore = state.score + calculatePlacementScore(piece);
        let hcombo = state.combo;
        const { rows: hrows, cols: hcols } = detectCompletedLines(hboard);
        const hlinesCleared = hrows.length + hcols.length;
        if (hlinesCleared > 0) {
          const heading = headingForPiece(piece);
          hboard = clearLinesHeadingHalf(hboard, hrows, hcols, heading);
          hscore += calculateClearScore(hlinesCleared, hcombo);
          hcombo += 1;
        } else {
          hcombo = 0;
        }

        const hNewTray = [...state.tray];
        hNewTray[action.trayIndex] = null;
        const hAllPlaced = hNewTray.every((s) => s === null);
        const hTarget = state.puzzleTarget;
        const hDifficulty = state.headingDifficulty;

        if (hAllPlaced) {
          const solved = hTarget !== null && boardMatchesTarget(hboard, hTarget);
          if (solved) hscore += PUZZLE_SOLVE_BONUS;
          const bestScore = Math.max(hscore, state.bestScore);
          if (bestScore > state.bestScore) {
            saveBestScore('heading', hDifficulty, bestScore);
          }
          return {
            ...state,
            board: hboard,
            tray: hNewTray,
            score: hscore,
            bestScore,
            combo: solved ? hcombo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp: null,
            lastCascade: null,
            puzzleUndoStack: hUndoStack,
          };
        }

        const isGameOver = !hasValidMoves(hboard, hNewTray);
        const bestScore = Math.max(hscore, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('heading', hDifficulty, bestScore);
        }
        return {
          ...state,
          board: hboard,
          tray: hNewTray,
          score: hscore,
          bestScore,
          combo: hcombo,
          isGameOver,
          puzzleResult: isGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: hUndoStack,
        };
      }

      // Decay mode: classic-style score-attack — empty board (with a small
      // pre-fill seed handled at freshDecayState time), Classic piece
      // weights, refilling tray. The twist is per-cell **age**: a row /
      // column only clears once every filled cell along it has age ≥ T,
      // where T is `decayThreshold(state.decayDifficulty)`. Per-placement
      // pipeline (canonical order — see `decay.ts` doc):
      //   1. place piece on board
      //   2. set the new cells' ages to 0
      //   3. tick every OTHER non-null cell's age by +1
      //   4. detect clearable lines via `detectClearableLinesDecay`
      //   5. apply clears to BOTH board and ages
      //   6. score / combo / refill on empty tray
      // Game-over is the standard Classic-style check; no target, no undo.
      if (state.mode === 'decay') {
        if (!canPlacePiece(state.board, piece, action.origin)) return state;

        // Step 1 — place the piece on the board.
        let dboard = placePiece(state.board, piece, action.origin);
        // Steps 2 + 3 collapsed: the spec asks for "set new cells to age 0,
        // then increment every OTHER non-null cell by +1". We achieve that
        // in two equivalent passes:
        //   (a) `advanceAges` ticks every existing non-null cell from
        //       k → k+1 (the just-placed cells aren't in the ages array
        //       yet — `state.boardAges` reflects pre-placement state — so
        //       they're untouched by this step).
        //   (b) `setNewCellAges` stamps the just-placed cells with age 0.
        // Net result equals the spec's per-cell rule without needing an
        // explicit "exclude the new cells" mask.
        let dages = advanceAges(state.boardAges);
        dages = setNewCellAges(dages, piece, action.origin);

        let dscore = state.score + calculatePlacementScore(piece);
        let dcombo = state.combo;
        const T = decayThreshold(state.decayDifficulty);

        // Step 4 — detect clearable lines under the age gate.
        const { rows: drows, cols: dcols } = detectClearableLinesDecay(dboard, dages, T);
        const dlinesCleared = drows.length + dcols.length;
        if (dlinesCleared > 0) {
          // Step 5 — apply clears to board AND ages in lockstep.
          const cleared = applyDecayClears(dboard, dages, drows, dcols);
          dboard = cleared.board;
          dages = cleared.ages;
          dscore += calculateClearScore(dlinesCleared, dcombo);
          dcombo += 1;
        } else {
          dcombo = 0;
        }

        // Step 6 — tray refill on empty tray (Classic piece pool — Decay's
        // challenge is the age gate, not the piece mix).
        const dNewTray = [...state.tray];
        dNewTray[action.trayIndex] = null;
        const dAllPlaced = dNewTray.every((s) => s === null);
        const dFinalTray = dAllPlaced
          ? generateClassicTray(state.decayDifficulty, dboard)
          : dNewTray;

        const dBestScore = Math.max(dscore, state.bestScore);
        // Standard Classic-style game-over check.
        const dIsGameOver = !hasValidMoves(dboard, dFinalTray);

        if (dBestScore > state.bestScore) {
          saveBestScore('decay', state.decayDifficulty, dBestScore);
        }

        return {
          ...state,
          board: dboard,
          boardAges: dages,
          tray: dFinalTray,
          score: dscore,
          bestScore: dBestScore,
          combo: dcombo,
          isGameOver: dIsGameOver,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: [],
        };
      }

      // Tether mode: classic-style score-attack — empty board, three-slot
      // refilling tray, Classic line-clear pipeline. The twist is the
      // **paired-slot Chebyshev-2 origin coupling**: slots 0 and 1 are the
      // tethered pair; slot 2 is the free piece. A placement from a paired
      // slot whose partner most-recently placed must include at least one
      // cell within Chebyshev-distance ≤ 2 of any cell of the prior
      // placement (`placementSatisfiesTether` against
      // `tetherWindowCells(state.lastPairedPlacementCells)`); otherwise
      // the placement is rejected. Per-placement pipeline:
      //   1. Validate `canPlacePiece` + tether constraint (paired slot,
      //      partner-slot was last paired-placer, window non-empty).
      //   2. Place piece, detect/clear lines via standard `clearLines`,
      //      score, combo.
      //   3. If from a paired slot, update `lastPairedPlacementCells` /
      //      `lastPairedSlot`; slot-2 placements leave both unchanged.
      //   4. Refill tray when empty (Hard difficulty drives a resample
      //      of the next paired-slot piece via `generateTetherTray` so
      //      the upcoming partner placement has ≥ 2 legal options
      //      within the active tether window).
      //   5. Game-over check via `hasValidTetherMoves` so a paired piece
      //      that fits geometrically but NOT inside the current tether
      //      window correctly registers as no-valid-move.
      if (state.mode === 'tether') {
        // Step 1a — standard geometry check.
        if (!canPlacePiece(state.board, piece, action.origin)) return state;

        const isPairedSlot = action.trayIndex === 0 || action.trayIndex === 1;
        const partnerWasLastPlacer =
          state.lastPairedPlacementCells !== null &&
          state.lastPairedSlot !== null &&
          state.lastPairedSlot !== action.trayIndex;

        // Step 1b — tether constraint. Only paired-slot placements
        // whose partner was the last paired-placer are gated by the
        // window. Slot 2 (free) is never gated; same-slot-as-last-
        // paired (e.g. paired slot replays itself before partner
        // does) is also unconstrained — the spec ties the rule to
        // the OTHER paired slot specifically.
        if (isPairedSlot && partnerWasLastPlacer) {
          const window = tetherWindowCells(state.lastPairedPlacementCells!);
          if (!placementSatisfiesTether(piece, action.origin, window)) {
            return state;
          }
        }

        // Step 2 — place the piece and run the standard Classic
        // clear pipeline. Tether doesn't change line-clear semantics;
        // it's purely an origin-coupling constraint at validation
        // time.
        let tboard = placePiece(state.board, piece, action.origin);
        let tscore = state.score + calculatePlacementScore(piece);
        let tcombo = state.combo;
        const { rows: trows, cols: tcols } = detectCompletedLines(tboard);
        const tlinesCleared = trows.length + tcols.length;
        if (tlinesCleared > 0) {
          tboard = clearLines(tboard, trows, tcols);
          tscore += calculateClearScore(tlinesCleared, tcombo);
          tcombo += 1;
        } else {
          tcombo = 0;
        }

        // Step 3 — update tether bookkeeping. Paired-slot placements
        // record their absolute board cells (so the next partner
        // placement can be validated against a Chebyshev-2 window
        // around them) AND which slot produced the placement (so the
        // "is partner the next placer?" check has the right answer).
        // Slot-2 placements leave both fields untouched — the free
        // piece is invisible to the tether system.
        let nextLastCells: Coord[] | null = state.lastPairedPlacementCells;
        let nextLastSlot: PairedSlot | null = state.lastPairedSlot;
        if (isPairedSlot) {
          // Build absolute coords from the piece's local cells +
          // the placement origin. We snapshot them up-front so a
          // future tray refill can't accidentally mutate the
          // record-of-the-last-placement.
          const placedCells: Coord[] = piece.cells.map((cell) => ({
            row: action.origin.row + cell.row,
            col: action.origin.col + cell.col,
          }));
          nextLastCells = placedCells;
          nextLastSlot = action.trayIndex as PairedSlot;
        }

        // Step 4 — tray refill when all slots empty. Pass the
        // post-placement board AND the just-recorded
        // `nextLastCells` to the sampler so Hard's
        // `minTetherOptions ≥ 2` resample sees the right window.
        // Easy / Normal short-circuit the resample; Hard with no
        // active window (i.e. nextLastCells is null somehow —
        // shouldn't happen mid-round, but defensive) also short-
        // circuits.
        const tNewTray = [...state.tray];
        tNewTray[action.trayIndex] = null;
        const tAllPlaced = tNewTray.every((s) => s === null);
        const tFinalTray = tAllPlaced
          ? generateTetherTray(state.tetherDifficulty, tboard, nextLastCells)
          : tNewTray;

        // Step 5 — tether-aware game-over check. Mirrors `hasValidMoves`
        // semantics but rejects paired-slot placements that geometry-
        // permit but fall OUTSIDE the active tether window. Without
        // this branch a player could end up with a tray full of
        // paired-only pieces with no legal partner placement and the
        // engine wouldn't detect the dead-end.
        const tBestScore = Math.max(tscore, state.bestScore);
        const tIsGameOver = !hasValidTetherMoves(
          tboard,
          tFinalTray,
          nextLastCells,
          nextLastSlot,
          rotatePiece90Clockwise
        );

        if (tBestScore > state.bestScore) {
          saveBestScore('tether', state.tetherDifficulty, tBestScore);
        }

        return {
          ...state,
          board: tboard,
          tray: tFinalTray,
          score: tscore,
          bestScore: tBestScore,
          combo: tcombo,
          isGameOver: tIsGameOver,
          lastPairedPlacementCells: nextLastCells,
          lastPairedSlot: nextLastSlot,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: [],
        };
      }

      // Fuse mode: structurally a puzzle (target pattern, finite tray,
      // undo-able placements). The starting board carries K fuse cells
      // painted with the FUSE_COLOR sentinel and tracked separately in
      // `state.fuseCells` with each fuse's countdown. Per-placement
      // pipeline (canonical order — see `fuse.ts` doc):
      //   1. Validate placement (`canPlacePiece`).
      //   2. Place the piece on the board.
      //   3. Detect line clears (standard rules — fuses + walls count
      //      as filled).
      //   4. Apply clears via `clearLinesPreservingWalls` (walls
      //      survive; fuses get destroyed by the clear).
      //   5. Filter the fuse list down to fuses still present on the
      //      post-clear board, then decrement every survivor by 1.
      //   6. Expire any fuses whose countdown ≤ 0: the fuse cell and
      //      each of its 4-neighbour empty cells become permanent
      //      indestructible WALL_COLOR cells.
      //   7. Win check on tray-empty: target match AND no fuses left.
      // Standard puzzle game-over check; supports undo.
      if (state.mode === 'fuse') {
        if (!canPlacePiece(state.board, piece, action.origin)) return state;

        const fUndoStack: PuzzleUndoSnapshot[] = [
          ...state.puzzleUndoStack,
          { board: state.board, tray: state.tray, score: state.score, combo: state.combo, fuseCells: state.fuseCells, erasureTokens: state.erasureTokens },
        ];

        // Step 2 — place the piece.
        let fboard = placePiece(state.board, piece, action.origin);
        let fscore = state.score + calculatePlacementScore(piece);
        let fcombo = state.combo;

        // Step 3 — detect line clears. Fuse cells are non-null
        // (FUSE_COLOR), so they count as filled by `detectCompletedLines`
        // exactly the same way wall cells do. A row containing fuses
        // can therefore complete and clear; the fuse goes with it.
        const { rows: frows, cols: fcols } = detectCompletedLines(fboard);
        const flinesCleared = frows.length + fcols.length;
        if (flinesCleared > 0) {
          // Step 4 — apply clears, preserving walls. (No walls exist
          // yet on the very first placement of a fresh Fuse round —
          // they only get created by fuse expiry — but the helper is
          // forward-compatible with mid-round walls created by earlier
          // expiries.)
          fboard = clearLinesPreservingWalls(fboard, frows, fcols);
          fscore += calculateClearScore(flinesCleared, fcombo);
          fcombo += 1;
        } else {
          fcombo = 0;
        }

        // Step 5a — drop fuses whose cell got swept by a clear. Their
        // countdowns must NOT be decremented in the next step (those
        // fuses no longer exist).
        let ffuses = dropClearedFuses(state.fuseCells, fboard);
        // Step 5b — decrement every surviving fuse by exactly 1.
        ffuses = decrementFuses(ffuses);

        // Step 6 — expire any fuse whose countdown is now ≤ 0. Each
        // expiring fuse turns its own cell + every 4-neighbour
        // originally-empty cell into a permanent WALL_COLOR. The
        // expiry helper takes a snapshot of the empties on the input
        // board so iteration order can't bias the result.
        const expiry = expireFuses(fboard, ffuses);
        fboard = expiry.board;
        ffuses = expiry.fuses;

        const fNewTray = [...state.tray];
        fNewTray[action.trayIndex] = null;
        const fAllPlaced = fNewTray.every((s) => s === null);
        const fTarget = state.puzzleTarget;
        const fDifficulty = state.fuseDifficulty;

        if (fAllPlaced) {
          // Step 7 — win check. Tray empty + board matches target +
          // every fuse cleared. Fuses still alive at tray-empty are an
          // automatic loss (they'll never be cleared now), and so is
          // any wall left over from an earlier expiry that bumps the
          // board off the target pattern.
          const solved =
            fTarget !== null &&
            boardMatchesTarget(fboard, fTarget) &&
            noFusesRemaining(ffuses);
          if (solved) fscore += PUZZLE_SOLVE_BONUS;
          const bestScore = Math.max(fscore, state.bestScore);
          if (bestScore > state.bestScore) {
            saveBestScore('fuse', fDifficulty, bestScore);
          }
          return {
            ...state,
            board: fboard,
            tray: fNewTray,
            score: fscore,
            bestScore,
            combo: solved ? fcombo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp: null,
            lastCascade: null,
            fuseCells: ffuses,
            puzzleUndoStack: fUndoStack,
          };
        }

        // Mid-round game-over: no remaining tray piece has any
        // (rotation, origin) that fits. Fuses still ticking are fine
        // mid-round — they only fail the win check at tray-empty.
        const fIsGameOver = !hasValidMoves(fboard, fNewTray);
        const bestScore = Math.max(fscore, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('fuse', fDifficulty, bestScore);
        }
        return {
          ...state,
          board: fboard,
          tray: fNewTray,
          score: fscore,
          bestScore,
          combo: fcombo,
          isGameOver: fIsGameOver,
          puzzleResult: fIsGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          fuseCells: ffuses,
          puzzleUndoStack: fUndoStack,
        };
      }

      // Mirror mode: every placement also writes its horizontal reflection.
      // Validation, board mutation, line clearing, and win/lose detection
      // all use the *_Mirrored variants. We branch out early so the rest of
      // PLACE_PIECE doesn't have to special-case it.
      if (state.mode === 'mirror') {
        if (!canPlacePieceMirrored(state.board, piece, action.origin)) return state;

        const undoStack: PuzzleUndoSnapshot[] = [
          ...state.puzzleUndoStack,
          { board: state.board, tray: state.tray, score: state.score, combo: state.combo, fuseCells: state.fuseCells, erasureTokens: state.erasureTokens },
        ];

        let mboard = placePieceMirrored(state.board, piece, action.origin);
        let mscore = state.score + calculatePlacementScore(piece) * 2;
        let mcombo = state.combo;
        const { rows: mrows, cols: mcols } = detectCompletedLines(mboard);
        const mlinesCleared = mrows.length + mcols.length;
        if (mlinesCleared > 0) {
          mboard = clearLines(mboard, mrows, mcols);
          mscore += calculateClearScore(mlinesCleared, mcombo) * 2;
          mcombo += 1;
        } else {
          mcombo = 0;
        }

        const mNewTray = [...state.tray];
        mNewTray[action.trayIndex] = null;
        const mAllPlaced = mNewTray.every((s) => s === null);
        const mTarget = state.puzzleTarget;
        const mDifficulty = state.mirrorDifficulty;

        if (mAllPlaced) {
          const solved = mTarget !== null && boardMatchesTarget(mboard, mTarget);
          if (solved) mscore += PUZZLE_SOLVE_BONUS;
          const bestScore = Math.max(mscore, state.bestScore);
          if (bestScore > state.bestScore) {
            saveBestScore('mirror', mDifficulty, bestScore);
          }
          return {
            ...state,
            board: mboard,
            tray: mNewTray,
            score: mscore,
            bestScore,
            combo: solved ? mcombo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp: null,
            lastCascade: null,
            puzzleUndoStack: undoStack,
          };
        }

        const isGameOver = !hasValidMirrorMoves(mboard, mNewTray);
        const bestScore = Math.max(mscore, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('mirror', mDifficulty, bestScore);
        }
        return {
          ...state,
          board: mboard,
          tray: mNewTray,
          score: mscore,
          bestScore,
          combo: mcombo,
          isGameOver,
          puzzleResult: isGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: undoStack,
        };
      }

      const enforceColorAdjacency = state.mode === 'chroma';
      if (!canPlacePiece(state.board, piece, action.origin, { enforceColorAdjacency })) return state;

      // Snapshot pre-placement state so Puzzle mode can surface a
      // multi-step Undo. Captured here (before any board mutation) so
      // each restore is an exact revert. The reducer already treats
      // prior state as immutable, so holding references — no clone — is
      // safe. Outside puzzle mode the stack stays empty (we don't track
      // history for Classic / Chroma / Gravity / Drop).
      const puzzleUndoStack: PuzzleUndoSnapshot[] =
        state.mode === 'puzzle' || state.mode === 'breathe'
          ? [
              ...state.puzzleUndoStack,
              { board: state.board, tray: state.tray, score: state.score, combo: state.combo, fuseCells: state.fuseCells, erasureTokens: state.erasureTokens },
            ]
          : [];

      let board = placePiece(state.board, piece, action.origin);
      let score = state.score + calculatePlacementScore(piece);
      let combo = state.combo;
      let cascadeSteps: CascadeStep[] | null = null;

      if (state.mode === 'gravity') {
        // Gravity mode: run the full clear → fall → clear loop and score
        // each step. Step 1 is the player-triggered clear (no chain
        // multiplier); every subsequent step is a gravity-driven cascade
        // and gets a rising multiplier on top of combo. Combo still
        // advances by exactly one per placement (i.e. a single turn
        // triggers one combo step regardless of cascade depth) so the
        // turn-over-turn combo mechanic keeps working the same way.
        const resolved = resolveCascades(board);
        if (resolved.steps.length > 0) {
          for (let i = 0; i < resolved.steps.length; i++) {
            const step = resolved.steps[i];
            const linesThisStep = step.clearedRows.length + step.clearedCols.length;
            const stepMul = chainMultiplier(i + 1);
            score += Math.floor(calculateClearScore(linesThisStep, combo) * stepMul);
          }
          combo += 1;
          cascadeSteps = resolved.steps;
        } else {
          combo = 0;
        }
        board = resolved.board;
      } else if (state.mode === 'drop') {
        // Drop mode: Tetris-style row-only clears + slab collapse. The
        // caller (App.tsx) has already simulated the rigid-body fall and
        // passes us the landed origin, so by the time we get here `board`
        // holds the piece in its final resting position. All we do is
        // detect full ROWS (column clears are disabled in this mode by
        // design), remove them, and shift everything above down by the
        // count of cleared rows strictly below it. Slab collapse cannot
        // create new full rows in one pass, so a single CascadeStep is
        // enough for animation — no loop needed.
        const { rows } = detectCompletedLines(board);
        if (rows.length > 0) {
          const boardBefore = board;
          const { board: collapsed, fallDistances } = applySlabCollapse(board, rows);
          const clearedCells: string[] = [];
          for (const r of rows) {
            for (let c = 0; c < BOARD_SIZE; c++) {
              if (boardBefore[r][c] !== null) {
                clearedCells.push(`${r},${c}`);
              }
            }
          }
          cascadeSteps = [{
            boardBefore,
            clearedRows: rows,
            clearedCols: [],
            clearedCells,
            boardAfter: collapsed,
            fallDistances,
          }];
          score += calculateClearScore(rows.length, combo);
          combo += 1;
          board = collapsed;
        } else {
          combo = 0;
        }
      } else {
        const { rows, cols } = detectCompletedLines(board);
        const linesCleared = rows.length + cols.length;

        if (linesCleared > 0) {
          board = clearLines(board, rows, cols);
          score += calculateClearScore(linesCleared, combo);
          combo += 1;
        } else {
          combo = 0;
        }
      }

      const newTray = [...state.tray];
      newTray[action.trayIndex] = null;

      const allPlaced = newTray.every((s) => s === null);

      if (state.mode === 'puzzle') {
        const target = state.puzzleTarget;
        const puzzleDifficulty = state.puzzleDifficulty;
        const isTutorial = puzzleDifficulty === 'tutorial';
        // Tutorial plays don't count toward best-score tracking: the steps
        // are authored and the "score" number isn't meaningful here.
        const trackableDifficulty: PuzzleLevel | null =
          isPuzzleLevel(puzzleDifficulty) ? puzzleDifficulty : null;

        if (allPlaced) {
          const solved = target !== null && boardMatchesTarget(board, target);
          if (solved && !isTutorial) score += PUZZLE_SOLVE_BONUS;

          const bestScore = Math.max(score, state.bestScore);
          if (trackableDifficulty !== null && bestScore > state.bestScore) {
            saveBestScore('puzzle', trackableDifficulty, bestScore);
          }

          // First-time solve of a numeric difficulty flips a persistent flag
          // so the level-up promotion in the overlay only fires once per
          // difficulty. Tutorial solves never trigger promotion (there's no
          // "next difficulty" story there — the tutorial has its own
          // Graduation flow via TUTORIAL_NEXT). Shared/ephemeral puzzles
          // still count: beating any Hard puzzle for the first time is the
          // milestone worth celebrating, shared or not.
          //
          // Detection reads `state.puzzleEverSolved` (not localStorage), so
          // the decision is a pure function of the incoming state — which
          // is what keeps us correct under React 19 StrictMode's
          // double-invocation of the reducer in dev. The corresponding
          // persistence is handled by the App via a useEffect that
          // observes this same field.
          const alreadySolvedBefore =
            trackableDifficulty !== null &&
            state.puzzleEverSolved[trackableDifficulty] === true;
          const puzzleLevelUp: PuzzleLevel | null =
            solved && trackableDifficulty !== null && !alreadySolvedBefore
              ? trackableDifficulty
              : null;
          const puzzleEverSolved: PuzzleEverSolved =
            puzzleLevelUp !== null
              ? { ...state.puzzleEverSolved, [puzzleLevelUp]: true }
              : state.puzzleEverSolved;

          return {
            ...state,
            board,
            tray: newTray,
            score,
            bestScore,
            combo: solved ? combo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp,
            puzzleEverSolved,
            lastCascade: null,
            puzzleUndoStack,
          };
        }
        const isGameOver = !hasValidMoves(board, newTray);
        const bestScore = Math.max(score, state.bestScore);
        if (trackableDifficulty !== null && bestScore > state.bestScore) {
          saveBestScore('puzzle', trackableDifficulty, bestScore);
        }
        return {
          ...state,
          board,
          tray: newTray,
          score,
          bestScore,
          combo,
          isGameOver,
          puzzleResult: isGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack,
        };
      }

      // Breathe mode: structurally identical to puzzle (target pattern,
      // finite tray, undo-able placements) but the win condition adds an
      // explicit "no solid 2×2 anywhere on the board" check on top of
      // boardMatchesTarget. Failing the Breathe rule with the tray empty
      // counts as a loss — the player has matched the target outline but
      // suffocated it.
      if (state.mode === 'breathe') {
        const target = state.puzzleTarget;
        const breatheDifficulty = state.breatheDifficulty;

        if (allPlaced) {
          const solved =
            target !== null &&
            boardMatchesTarget(board, target) &&
            boardSatisfiesBreathe(board);
          if (solved) score += PUZZLE_SOLVE_BONUS;
          const bestScore = Math.max(score, state.bestScore);
          if (bestScore > state.bestScore) {
            saveBestScore('breathe', breatheDifficulty, bestScore);
          }
          return {
            ...state,
            board,
            tray: newTray,
            score,
            bestScore,
            combo: solved ? combo : 0,
            isGameOver: true,
            puzzleResult: solved ? 'solved' : 'failed',
            puzzleLevelUp: null,
            lastCascade: null,
            puzzleUndoStack,
          };
        }

        const isGameOver = !hasValidMoves(board, newTray);
        const bestScore = Math.max(score, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('breathe', breatheDifficulty, bestScore);
        }
        return {
          ...state,
          board,
          tray: newTray,
          score,
          bestScore,
          combo,
          isGameOver,
          puzzleResult: isGameOver ? 'failed' : null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack,
        };
      }

      if (state.mode === 'chroma') {
        const finalTray = allPlaced ? generateChromaTray() : newTray;

        const bestScore = Math.max(score, state.bestScore);
        // Chroma game-over uses the adjacency-aware validator so "no move
        // fits" correctly accounts for the color-touching rule.
        const isGameOver = !hasValidMoves(board, finalTray, { enforceColorAdjacency: true });

        if (bestScore > state.bestScore) {
          saveBestScore('chroma', state.chromaDifficulty, bestScore);
        }

        return {
          ...state,
          board,
          tray: finalTray,
          score,
          bestScore,
          combo,
          isGameOver,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: [],
        };
      }

      if (state.mode === 'gravity') {
        const finalTray = allPlaced
          ? generateClassicTray(state.gravityDifficulty, board)
          : newTray;

        const bestScore = Math.max(score, state.bestScore);
        const isGameOver = !hasValidMoves(board, finalTray);

        if (bestScore > state.bestScore) {
          saveBestScore('gravity', state.gravityDifficulty, bestScore);
        }

        return {
          ...state,
          board,
          tray: finalTray,
          score,
          bestScore,
          combo,
          isGameOver,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: cascadeSteps,
          puzzleUndoStack: [],
        };
      }

      if (state.mode === 'drop') {
        const finalTray = allPlaced
          ? generateClassicTray(state.dropDifficulty, board)
          : newTray;

        const bestScore = Math.max(score, state.bestScore);
        // Drop game-over: no tray piece has any (rotation, horizontal
        // column-origin) where its simulated fall fits inside the board.
        // Uses `hasValidDrops` rather than `hasValidMoves` because valid
        // placements here are restricted to the subset reachable by the
        // rigid-body fall simulator.
        const isGameOver = !hasValidDrops(board, finalTray);

        if (bestScore > state.bestScore) {
          saveBestScore('drop', state.dropDifficulty, bestScore);
        }

        return {
          ...state,
          board,
          tray: finalTray,
          score,
          bestScore,
          combo,
          isGameOver,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: cascadeSteps,
          puzzleUndoStack: [],
        };
      }

      if (state.mode === 'pipeline') {
        // Pipeline tray refill mirrors Classic: only refill once ALL three
        // slots are empty, so the round-robin phase has actually completed
        // a full cycle (0 → 1 → 2 → refill → 0). Refilling earlier would
        // shrink the cycle and break the "no cherry-picking" promise.
        const finalTray = allPlaced
          ? generateClassicTray(state.pipelineDifficulty, board)
          : newTray;

        // Advance the cursor regardless of refill: the player just placed
        // from `pipelinePhase`, so the next legal slot is the next index
        // mod 3. If we just placed at slot 2 and refilled, the new active
        // slot is 0 (which is now filled with a fresh piece) — that's the
        // intended start-of-cycle, not a reset.
        const nextPhase = (((state.pipelinePhase + 1) % 3) as 0 | 1 | 2);

        const bestScore = Math.max(score, state.bestScore);
        // Game over: ONLY checks the next active piece, not the whole tray.
        // This is the key UX promise — "No move for your next piece." —
        // and is what makes Pipeline meaningfully different from Classic.
        const isGameOver = !hasValidPipelineMoves(board, finalTray, nextPhase);

        if (bestScore > state.bestScore) {
          saveBestScore('pipeline', state.pipelineDifficulty, bestScore);
        }

        return {
          ...state,
          board,
          tray: finalTray,
          score,
          bestScore,
          combo,
          isGameOver,
          pipelinePhase: nextPhase,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: [],
        };
      }

      const finalTray = allPlaced ? generateClassicTray(state.classicDifficulty, board) : newTray;

      const bestScore = Math.max(score, state.bestScore);
      const isGameOver = !hasValidMoves(board, finalTray);

      if (bestScore > state.bestScore) {
        saveBestScore('classic', state.classicDifficulty, bestScore);
      }

      return {
        ...state,
        board,
        tray: finalTray,
        score,
        bestScore,
        combo,
        isGameOver,
        puzzleResult: null,
        puzzleLevelUp: null,
        lastCascade: null,
        puzzleUndoStack: [],
      };
    }

    case 'SET_MODE': {
      if (action.mode === state.mode) return state;
      saveMode(action.mode);
      if (action.mode === 'puzzle') {
        // Entering puzzle mode: resume the stored puzzle at the current
        // difficulty if there is one, otherwise generate and persist a new one.
        if (state.puzzleDifficulty === 'tutorial') {
          // Always (re)start the tutorial from step 1 on entry — see the
          // equivalent note in createInitialState.
          return freshTutorialState(
            0,
            state.classicDifficulty,
            state.chromaDifficulty,
            state.gravityDifficulty,
            state.dropDifficulty,
            state.mirrorDifficulty,
            state.breatheDifficulty,
            state.pipelineDifficulty,
            state.scarDifficulty,
            state.monolithDifficulty,
            state.quarantineDifficulty,
            state.headingDifficulty,
            state.decayDifficulty,
            state.fuseDifficulty,
            state.erasuresDifficulty,
            state.tetherDifficulty,
            state.puzzleEverSolved
          );
        }
        return freshPuzzleState(
          state.puzzleDifficulty,
          state.classicDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('puzzle', state.puzzleDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'chroma') {
        return freshChromaState(
          state.chromaDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('chroma', state.chromaDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'gravity') {
        return freshGravityState(
          state.gravityDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('gravity', state.gravityDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'drop') {
        return freshDropState(
          state.dropDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('drop', state.dropDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'mirror') {
        return freshMirrorState(
          state.mirrorDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('mirror', state.mirrorDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'breathe') {
        return freshBreatheState(
          state.breatheDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('breathe', state.breatheDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'pipeline') {
        return freshPipelineState(
          state.pipelineDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('pipeline', state.pipelineDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'scar') {
        return freshScarState(
          state.scarDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('scar', state.scarDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'monolith') {
        return freshMonolithState(
          state.monolithDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('monolith', state.monolithDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'quarantine') {
        return freshQuarantineState(
          state.quarantineDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('quarantine', state.quarantineDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'heading') {
        return freshHeadingState(
          state.headingDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('heading', state.headingDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'decay') {
        return freshDecayState(
          state.decayDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('decay', state.decayDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'fuse') {
        return freshFuseState(
          state.fuseDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('fuse', state.fuseDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'erasures') {
        return freshErasuresState(
          state.erasuresDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.tetherDifficulty,
          loadBestScore('erasures', state.erasuresDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      if (action.mode === 'tether') {
        return freshTetherState(
          state.tetherDifficulty,
          state.classicDifficulty,
          state.puzzleDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          loadBestScore('tether', state.tetherDifficulty),
          state.tutorialStep,
          state.puzzleEverSolved
        );
      }
      return freshClassicState(
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('classic', state.classicDifficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_CLASSIC_DIFFICULTY': {
      if (!CLASSIC_DIFFICULTIES.includes(action.difficulty)) return state;
      saveClassicDifficulty(action.difficulty);
      saveMode('classic');
      return freshClassicState(
        action.difficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('classic', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_PUZZLE_DIFFICULTY': {
      if (action.difficulty === 'tutorial') {
        savePuzzleDifficulty('tutorial');
        saveMode('puzzle');
        // Always (re)start the tutorial from step 1 on entry, even if the
        // player had previously advanced past it or completed it.
        return freshTutorialState(
          0,
          state.classicDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          state.puzzleEverSolved
        );
      }
      const target = clampPuzzleDifficulty(action.difficulty);
      savePuzzleDifficulty(target);
      saveMode('puzzle');
      // Switching difficulties always starts fresh for the destination: if a
      // stored puzzle exists for it, resume; otherwise generate one.
      return freshPuzzleState(
        target,
        state.classicDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('puzzle', target),
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
      );
    }

    case 'SET_GRAVITY_DIFFICULTY': {
      if (!GRAVITY_DIFFICULTIES.includes(action.difficulty)) return state;
      saveGravityDifficulty(action.difficulty);
      saveMode('gravity');
      return freshGravityState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('gravity', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_DROP_DIFFICULTY': {
      if (!DROP_DIFFICULTIES.includes(action.difficulty)) return state;
      saveDropDifficulty(action.difficulty);
      saveMode('drop');
      return freshDropState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('drop', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_MIRROR_DIFFICULTY': {
      if (!MIRROR_DIFFICULTIES.includes(action.difficulty)) return state;
      saveMirrorDifficulty(action.difficulty);
      saveMode('mirror');
      return freshMirrorState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('mirror', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_BREATHE_DIFFICULTY': {
      if (!BREATHE_DIFFICULTIES.includes(action.difficulty)) return state;
      saveBreatheDifficulty(action.difficulty);
      saveMode('breathe');
      return freshBreatheState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('breathe', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_PIPELINE_DIFFICULTY': {
      if (!PIPELINE_DIFFICULTIES.includes(action.difficulty)) return state;
      savePipelineDifficulty(action.difficulty);
      saveMode('pipeline');
      return freshPipelineState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('pipeline', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_SCAR_DIFFICULTY': {
      if (!SCAR_DIFFICULTIES.includes(action.difficulty)) return state;
      saveScarDifficulty(action.difficulty);
      saveMode('scar');
      return freshScarState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('scar', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_MONOLITH_DIFFICULTY': {
      if (!MONOLITH_DIFFICULTIES.includes(action.difficulty)) return state;
      saveMonolithDifficulty(action.difficulty);
      saveMode('monolith');
      return freshMonolithState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('monolith', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_QUARANTINE_DIFFICULTY': {
      if (!QUARANTINE_DIFFICULTIES.includes(action.difficulty)) return state;
      saveQuarantineDifficulty(action.difficulty);
      saveMode('quarantine');
      return freshQuarantineState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('quarantine', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_HEADING_DIFFICULTY': {
      if (!HEADING_DIFFICULTIES.includes(action.difficulty)) return state;
      saveHeadingDifficulty(action.difficulty);
      saveMode('heading');
      return freshHeadingState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('heading', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
      );
    }

    case 'SET_DECAY_DIFFICULTY': {
      if (!DECAY_DIFFICULTIES.includes(action.difficulty)) return state;
      saveDecayDifficulty(action.difficulty);
      saveMode('decay');
      return freshDecayState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('decay', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'SET_FUSE_DIFFICULTY': {
      if (!FUSE_DIFFICULTIES.includes(action.difficulty)) return state;
      saveFuseDifficulty(action.difficulty);
      saveMode('fuse');
      return freshFuseState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('fuse', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
      );
    }

    case 'SET_ERASURES_DIFFICULTY': {
      if (!ERASURES_DIFFICULTIES.includes(action.difficulty)) return state;
      saveErasuresDifficulty(action.difficulty);
      saveMode('erasures');
      return freshErasuresState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.tetherDifficulty,
        loadBestScore('erasures', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
      );
    }

    case 'SET_TETHER_DIFFICULTY': {
      if (!TETHER_DIFFICULTIES.includes(action.difficulty)) return state;
      saveTetherDifficulty(action.difficulty);
      saveMode('tether');
      return freshTetherState(
        action.difficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        loadBestScore('tether', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'NEW_PUZZLE': {
      if (state.mode !== 'puzzle') return state;
      // Tutorial steps are authored — "new puzzle" would be meaningless, so
      // this action is a no-op for the tutorial. (The UI also hides the button.)
      if (state.puzzleDifficulty === 'tutorial') return state;
      return freshPuzzleState(
        state.puzzleDifficulty,
        state.classicDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
      );
    }

    case 'NEW_MIRROR_PUZZLE': {
      if (state.mode !== 'mirror') return state;
      return freshMirrorState(
        state.mirrorDifficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'NEW_BREATHE_PUZZLE': {
      if (state.mode !== 'breathe') return state;
      return freshBreatheState(
        state.breatheDifficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'NEW_MONOLITH_PUZZLE': {
      if (state.mode !== 'monolith') return state;
      return freshMonolithState(
        state.monolithDifficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'NEW_QUARANTINE_PUZZLE': {
      if (state.mode !== 'quarantine') return state;
      return freshQuarantineState(
        state.quarantineDifficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'NEW_HEADING_PUZZLE': {
      if (state.mode !== 'heading') return state;
      return freshHeadingState(
        state.headingDifficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
      );
    }

    case 'NEW_FUSE_PUZZLE': {
      if (state.mode !== 'fuse') return state;
      return freshFuseState(
        state.fuseDifficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
      );
    }

    case 'NEW_ERASURES_PUZZLE': {
      if (state.mode !== 'erasures') return state;
      return freshErasuresState(
        state.erasuresDifficulty,
        state.classicDifficulty,
        state.puzzleDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.tetherDifficulty,
        state.bestScore,
        state.tutorialStep,
        state.puzzleEverSolved,
        { forceNew: true }
      );
    }

    case 'LOAD_SHARED_PUZZLE': {
      // Preserve the per-difficulty best score for the incoming difficulty so
      // the display stays meaningful. Do NOT persist anything about the
      // shared puzzle itself.
      return freshPuzzleStateFromShared(
        {
          difficulty: action.difficulty,
          board: action.board,
          tray: action.tray,
          target: action.target,
        },
        state.classicDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        loadBestScore('puzzle', action.difficulty),
        state.tutorialStep,
        state.puzzleEverSolved
      );
    }

    case 'TUTORIAL_NEXT': {
      const next = state.tutorialStep + 1;
      if (next >= TUTORIAL_STEP_COUNT) {
        // Graduation: mark the tutorial completed and drop the player into
        // the Easy puzzle — the natural next challenge.
        saveTutorialStep(TUTORIAL_STEP_COUNT - 1);
        savePuzzleDifficulty(1);
        saveMode('puzzle');
        return freshPuzzleState(
          1,
          state.classicDifficulty,
          state.chromaDifficulty,
          state.gravityDifficulty,
          state.dropDifficulty,
          state.mirrorDifficulty,
          state.breatheDifficulty,
          state.pipelineDifficulty,
          state.scarDifficulty,
          state.monolithDifficulty,
          state.quarantineDifficulty,
          state.headingDifficulty,
          state.decayDifficulty,
          state.fuseDifficulty,
          state.erasuresDifficulty,
          state.tetherDifficulty,
          loadBestScore('puzzle', 1),
          TUTORIAL_STEP_COUNT - 1,
          state.puzzleEverSolved,
          { forceNew: true }
        );
      }
      saveTutorialStep(next);
      return freshTutorialState(
        next,
        state.classicDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        state.puzzleEverSolved
      );
    }

    case 'TUTORIAL_GOTO': {
      const step = clampTutorialStep(action.step);
      saveTutorialStep(step);
      savePuzzleDifficulty('tutorial');
      saveMode('puzzle');
      return freshTutorialState(
        step,
        state.classicDifficulty,
        state.chromaDifficulty,
        state.gravityDifficulty,
        state.dropDifficulty,
        state.mirrorDifficulty,
        state.breatheDifficulty,
        state.pipelineDifficulty,
        state.scarDifficulty,
        state.monolithDifficulty,
        state.quarantineDifficulty,
        state.headingDifficulty,
        state.decayDifficulty,
        state.fuseDifficulty,
        state.erasuresDifficulty,
        state.tetherDifficulty,
        state.puzzleEverSolved
      );
    }

    case 'UNDO_PLACEMENT': {
      if (
        state.mode !== 'puzzle' &&
        state.mode !== 'mirror' &&
        state.mode !== 'breathe' &&
        state.mode !== 'monolith' &&
        state.mode !== 'quarantine' &&
        state.mode !== 'heading' &&
        state.mode !== 'fuse' &&
        state.mode !== 'erasures'
      )
        return state;
      const stack = state.puzzleUndoStack;
      if (stack.length === 0) return state;
      // Pop the most recent snapshot; leave the rest of the history
      // intact so the player can keep undoing back to the puzzle's
      // start. Wipe the terminal flags so a just-failed / just-solved
      // puzzle becomes playable again from the restored position.
      // Fuse mode also restores the per-fuse countdown list captured
      // in the snapshot — undoing a Fuse placement reverts countdowns
      // and any walls the placement spawned (the board snapshot
      // already captures wall retraction since walls created
      // post-placement weren't in the pre-placement board).
      // Erasures mode also restores `erasureTokens` from the snapshot —
      // undoing an erase refunds the token AND brings back the erased
      // cells (the board snapshot captures the pre-erase fill).
      // `erasureSelectMode` is wiped to false so the player isn't
      // mid-erase after a rewind.
      const snap = stack[stack.length - 1];
      const remaining = stack.slice(0, -1);
      return {
        ...state,
        board: snap.board,
        tray: snap.tray,
        score: snap.score,
        combo: snap.combo,
        isGameOver: false,
        puzzleResult: null,
        puzzleLevelUp: null,
        lastCascade: null,
        fuseCells: cloneFuseCells(snap.fuseCells),
        erasureTokens: snap.erasureTokens,
        erasureSelectMode: false,
        puzzleUndoStack: remaining,
      };
    }

    case 'ERASE_COMPONENT': {
      // Erasures-mode core action: spend one erase token to delete the
      // 4-connected component of player-placed cells containing the
      // clicked cell. No-op outside Erasures mode, when the player
      // hasn't toggled select mode, when the token reserve is at 0, or
      // when the targeted cell is not a player-placed cell. Otherwise:
      //   1. Push an undo snapshot (so the erase is reversible).
      //   2. Erase the component via `eraseComponent`.
      //   3. Decrement the token reserve.
      //   4. Exit select mode (each erase consumes a token AND ends the
      //      transient mode — re-engaging is a deliberate second tap).
      //   5. Re-evaluate win/lose: if the tray is already empty AND the
      //      board now matches the target, the round is solved (the
      //      erase was the final move). Otherwise the round continues.
      if (state.mode !== 'erasures') return state;
      if (!state.erasureSelectMode) return state;
      if (state.erasureTokens === null || state.erasureTokens <= 0) return state;
      const { row, col } = action;
      const { board: nextBoard, erasedCells } = eraseComponent(state.board, row, col);
      if (erasedCells.length === 0) return state;

      const eraseUndoStack: PuzzleUndoSnapshot[] = [
        ...state.puzzleUndoStack,
        {
          board: state.board,
          tray: state.tray,
          score: state.score,
          combo: state.combo,
          fuseCells: state.fuseCells,
          erasureTokens: state.erasureTokens,
        },
      ];

      const nextTokens = state.erasureTokens - 1;
      const trayEmpty = state.tray.every((s) => s === null);
      const target = state.puzzleTarget;
      const eDifficulty = state.erasuresDifficulty;

      if (trayEmpty) {
        // Edge case — the tray was already empty when the player
        // engaged select-mode (e.g. a final erase to recover from a
        // failed-but-recoverable end-state). If the board now matches
        // the target the round flips to solved; otherwise it stays
        // failed (the placement that drained the tray already set
        // puzzleResult). We re-run the win check here to honour the
        // erase as a real move.
        const solved = target !== null && boardMatchesTarget(nextBoard, target);
        const score = solved ? state.score + PUZZLE_SOLVE_BONUS : state.score;
        const bestScore = Math.max(score, state.bestScore);
        if (bestScore > state.bestScore) {
          saveBestScore('erasures', eDifficulty, bestScore);
        }
        return {
          ...state,
          board: nextBoard,
          score,
          bestScore,
          isGameOver: true,
          puzzleResult: solved ? 'solved' : 'failed',
          puzzleLevelUp: null,
          lastCascade: null,
          erasureTokens: nextTokens,
          erasureSelectMode: false,
          puzzleUndoStack: eraseUndoStack,
        };
      }

      // Mid-round erase. Re-check standard placement game-over against
      // the post-erase board (an erase can only OPEN cells, never close
      // them, so this is generally just a "no-op for game-over" but we
      // run the check anyway so a player who erased their last
      // placement option still gets the failure flagged correctly via
      // the standard `hasValidMoves` predicate).
      const isGameOver = !hasValidMoves(nextBoard, state.tray);
      return {
        ...state,
        board: nextBoard,
        isGameOver,
        puzzleResult: isGameOver ? 'failed' : null,
        puzzleLevelUp: null,
        lastCascade: null,
        erasureTokens: nextTokens,
        erasureSelectMode: false,
        puzzleUndoStack: eraseUndoStack,
      };
    }

    case 'TOGGLE_ERASE_SELECT': {
      // Flip the transient select-mode flag. Guards:
      //   - Only meaningful in Erasures mode.
      //   - Only enterable when the player still has a token to spend
      //     AND there's at least one player-placed cell to erase. If
      //     either guard fails we explicitly clear the flag (so a stale
      //     `true` from a previous turn doesn't linger).
      if (state.mode !== 'erasures') return state;
      if (state.erasureSelectMode) {
        return { ...state, erasureSelectMode: false };
      }
      if (state.erasureTokens === null || state.erasureTokens <= 0) {
        return state;
      }
      if (!hasErasableComponent(state.board)) {
        return state;
      }
      return { ...state, erasureSelectMode: true };
    }

    case 'RESTART': {
      // Puzzle / Mirror / Breathe modes: reset to the CURRENT puzzle's
      // initial position without generating a new one. The same board,
      // tray, and target are restored; only score / combo / result
      // flags are wiped.
      if (
        (state.mode === 'puzzle' ||
          state.mode === 'mirror' ||
          state.mode === 'breathe' ||
          state.mode === 'monolith' ||
          state.mode === 'quarantine' ||
          state.mode === 'heading' ||
          state.mode === 'decay' ||
          state.mode === 'fuse' ||
          state.mode === 'erasures') &&
        state.puzzleInitialBoard &&
        state.puzzleInitialTray
      ) {
        return {
          ...state,
          board: cloneBoard(state.puzzleInitialBoard),
          tray: cloneTray(state.puzzleInitialTray),
          score: 0,
          combo: 0,
          isGameOver: false,
          puzzleResult: null,
          puzzleLevelUp: null,
          lastCascade: null,
          puzzleUndoStack: [],
          quarantineRegions: state.quarantineInitialRegions
            ? state.quarantineInitialRegions.map((r) => r.map((c) => ({ ...c })))
            : state.quarantineRegions,
          quarantineTargets: state.quarantineInitialTargets
            ? [...state.quarantineInitialTargets]
            : state.quarantineTargets,
          // Fuse mode: revert the active fuse list to the puzzle's
          // starting state so countdowns reset alongside the board
          // (which has its FUSE_COLOR sentinels back in place via
          // `puzzleInitialBoard`). For other modes `fuseInitialCells`
          // is `[]`, so this is a harmless no-op.
          fuseCells: cloneFuseCells(state.fuseInitialCells),
          // Erasures mode: refresh the token reserve to the difficulty's
          // starting value alongside the board reset, and exit any
          // half-engaged select mode. For other modes
          // `state.erasuresDifficulty` is still set (we always remember
          // the rung) but `erasureTokens` stays `null` because the
          // active mode isn't Erasures.
          erasureTokens:
            state.mode === 'erasures' ? erasureTokenCount(state.erasuresDifficulty) : state.erasureTokens,
          erasureSelectMode: false,
        };
      }
      return { ...createInitialState(), bestScore: state.bestScore };
    }

    default:
      return state;
  }
}
