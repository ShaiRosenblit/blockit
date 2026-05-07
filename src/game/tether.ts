import type { BoardGrid, Coord, PieceShape, TetherDifficulty } from './types';
import { BOARD_SIZE } from './types';
import { canPlacePiece } from './board';

/**
 * Tether mode mechanics.
 *
 * The tray has three slots. Slots 0 and 1 are the **tethered pair**;
 * slot 2 is a free piece with no tether constraint. When the player
 * places a piece from a paired slot, the next placement from its
 * **partner** (the other paired slot) must include at least one cell
 * within Chebyshev-distance ≤ 2 of any cell of the most recent
 * paired placement, otherwise the placement is rejected.
 *
 * The constraint is *origin-coupling*: it ties consecutive paired
 * placements to a small spatial neighbourhood, forcing the player to
 * weave the two paired pieces into a single growing region instead of
 * scattering them across the board. Slot 2 is the relief valve — it
 * never updates the tether window and is never constrained by it.
 *
 * Per-placement order (canonical — the reducer must apply these in this
 * exact sequence):
 *   1. Validate placement (`canPlacePiece` + tether constraint via
 *      `placementSatisfiesTether` if the piece is from the tethered
 *      pair AND its partner was the most recent paired-placer).
 *   2. Place piece, detect/clear lines via the standard Classic
 *      pipeline, score, combo.
 *   3. If the placement was from a paired slot, update
 *      `lastPairedPlacementCells` (record the placed cells) and
 *      `lastPairedSlot` (record `0` or `1`); otherwise leave both
 *      unchanged.
 *   4. Refill tray when all 3 slots empty (Classic-style — Hard
 *      difficulty rerolls the next paired-slot piece until a sample
 *      with `minTetherOptions ≥ 2` legal placements within the active
 *      tether window is found, or falls back to a free piece if no
 *      paired sample qualifies after a fixed retry budget).
 *   5. Game-over check: for each tray piece, check if there's any
 *      legal placement under current tether constraints
 *      (`hasValidTetherMoves`).
 *
 * The Chebyshev radius itself is fixed at 2 across every difficulty
 * rung — difficulty varies the *shape* of the constraint via the
 * piece pool and the Hard resample constraint, not the geometry.
 */

/**
 * Tray-slot indices that participate in the tethered pair. Slot 2 is
 * the free piece and does not appear here. Exported as a constant
 * tuple so consumers can `pairedSlots.includes(idx)` cleanly without
 * remembering which two indices are paired.
 */
export const pairedSlots = [0, 1] as const;

/**
 * Type narrowing for the paired-slot indices. Kept aligned with
 * `pairedSlots` so any future change (e.g. a 4-slot variant pairing
 * 0+1 and 2+3) is a single source-of-truth edit.
 */
export type PairedSlot = (typeof pairedSlots)[number];

/**
 * Fixed Chebyshev radius for the tether window. Spec calls for this
 * to be a constant (difficulty varies elsewhere) so it lives as a
 * named export rather than a per-difficulty knob — anything that
 * needs the radius reads this one symbol.
 */
export const TETHER_RADIUS = 2;

/**
 * Difficulty-keyed sampler tuning for the Tether tray. Easy narrows
 * the piece pool to small/compact families that always fit a
 * Chebyshev-2 window; Normal uses the full Classic pool; Hard adds
 * an `requireMinOptions` knob that drives `generateTetherTray` to
 * resample paired pieces until at least N legal placements within
 * the current tether window are available (with a fallback after a
 * fixed retry budget).
 */
export type TetherDifficultySpec = {
  /**
   * Allow-list of family ids to sample paired pieces from. `null`
   * means "use the full Classic pool". Easy lists only families
   * whose bounding box fits inside a 3×3 window (so any cell of
   * the previous placement guarantees a satisfying origin); Normal
   * is open; Hard is open but constrained at the resample stage.
   */
  pairedFamilyAllowList: readonly string[] | null;
  /**
   * Minimum number of legal placements within the tether window the
   * next paired-slot piece must have on the current board. `0`
   * disables the resample (Easy / Normal); `2` is the Hard rung's
   * "tight enough to sweat, loose enough to be solvable" target
   * pulled from the Stage 4 design.
   */
  requireMinOptions: number;
};

const DIFFICULTY_SPECS: Record<TetherDifficulty, TetherDifficultySpec> = {
  easy: {
    // Small / compact families — every placement of these always lands
    // entirely inside any Chebyshev-2 window the partner piece can
    // anchor to, so Easy is effectively a tutorial for the rule.
    pairedFamilyAllowList: [
      'monomino',
      'domino',
      'i-tromino',
      'l-tromino',
      'o-tetromino',
    ],
    requireMinOptions: 0,
  },
  normal: {
    pairedFamilyAllowList: null,
    requireMinOptions: 0,
  },
  hard: {
    pairedFamilyAllowList: null,
    requireMinOptions: 2,
  },
};

/**
 * Look up the per-difficulty Tether sampler spec. Pure read — the
 * record is module-private so callers can't accidentally mutate it.
 */
export function tetherDifficultySpec(d: TetherDifficulty): TetherDifficultySpec {
  return DIFFICULTY_SPECS[d];
}

/**
 * Build the set of board cells within Chebyshev-distance ≤ `radius` of
 * any cell in `lastCells`. Returns a Set keyed as `${row},${col}` so
 * membership tests are O(1) at render time and the reducer's
 * `placementSatisfiesTether` check is also O(piece-cells). Empty input
 * returns the empty set — callers should treat that as "no constraint
 * active" rather than "every placement rejected", which mirrors the
 * `lastPairedPlacementCells === null` branch in the reducer.
 *
 * The radius defaults to `TETHER_RADIUS` (2) for the spec'd geometry;
 * accepting a parameter keeps the helper testable at other radii
 * without forking the implementation.
 */
export function tetherWindowCells(
  lastCells: readonly Coord[],
  radius: number = TETHER_RADIUS
): Set<string> {
  const window = new Set<string>();
  for (const cell of lastCells) {
    const minR = Math.max(0, cell.row - radius);
    const maxR = Math.min(BOARD_SIZE - 1, cell.row + radius);
    const minC = Math.max(0, cell.col - radius);
    const maxC = Math.min(BOARD_SIZE - 1, cell.col + radius);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        window.add(`${r},${c}`);
      }
    }
  }
  return window;
}

/**
 * Predicate: does placing `piece` at `origin` put at least one of its
 * cells inside the precomputed `windowCells` set? This is the tether
 * constraint check — used by the reducer to validate paired-slot
 * placements after the standard `canPlacePiece` geometry check passes.
 *
 * Returns `true` trivially if `windowCells` is empty (interpreted as
 * "no constraint active" — matches the reducer branch where
 * `lastPairedPlacementCells === null`). Outside paired-slot
 * placements the reducer simply doesn't call this function; it's
 * never the right answer to satisfy the tether on a slot-2 placement.
 */
export function placementSatisfiesTether(
  piece: PieceShape,
  origin: Coord,
  windowCells: Set<string>
): boolean {
  if (windowCells.size === 0) return true;
  for (const cell of piece.cells) {
    const r = origin.row + cell.row;
    const c = origin.col + cell.col;
    if (windowCells.has(`${r},${c}`)) return true;
  }
  return false;
}

/**
 * Count the number of legal placements (origins) on `board` for
 * `piece` whose footprint intersects `windowCells`. Used by the Hard
 * tray sampler to enforce `minTetherOptions ≥ 2` — i.e. "the next
 * paired piece must have at least N legal placements inside the
 * tether window". Stops early once `cap` is reached so the common
 * case (many options) doesn't pay for a full board scan.
 *
 * Empty `windowCells` short-circuits to `0` — at the start of a
 * round (no prior paired placement) there's no active tether and
 * the resample doesn't fire anyway.
 */
export function countTetherLegalPlacements(
  board: BoardGrid,
  piece: PieceShape,
  windowCells: Set<string>,
  cap: number = 8
): number {
  if (windowCells.size === 0) return 0;
  let count = 0;
  for (let r = 0; r <= BOARD_SIZE - piece.height; r++) {
    for (let c = 0; c <= BOARD_SIZE - piece.width; c++) {
      const origin = { row: r, col: c };
      if (!canPlacePiece(board, piece, origin)) continue;
      if (!placementSatisfiesTether(piece, origin, windowCells)) continue;
      count++;
      if (count >= cap) return count;
    }
  }
  return count;
}

/**
 * Tether-aware variant of `hasValidMoves`. Walks every tray piece and
 * every rotation/origin combo — but for paired-slot pieces with an
 * active tether (`lastPairedPlacementCells !== null` and
 * `lastPairedSlot` is the OTHER paired slot), the placement must also
 * pass the tether window check.
 *
 * Returns `true` if at least one tray slot has at least one legal
 * placement; `false` if every remaining slot is dead-end. The reducer
 * uses this for the Tether-mode game-over check, replacing the
 * generic `hasValidMoves` so a paired piece that fits anywhere
 * geometrically but NOT within the tether window correctly registers
 * as no-valid-move.
 *
 * Slot 2 (free) is checked with the standard `canPlacePiece` geometry
 * only — it's never tether-constrained. Empty tray slots are skipped.
 */
export function hasValidTetherMoves(
  board: BoardGrid,
  tray: readonly (PieceShape | null)[],
  lastPairedPlacementCells: readonly Coord[] | null,
  lastPairedSlot: PairedSlot | null,
  rotatePiece90Clockwise: (piece: PieceShape) => PieceShape
): boolean {
  // Precompute the active window once — empty Set when no constraint.
  const window = lastPairedPlacementCells
    ? tetherWindowCells(lastPairedPlacementCells)
    : new Set<string>();

  for (let trayIndex = 0; trayIndex < tray.length; trayIndex++) {
    const piece = tray[trayIndex];
    if (!piece) continue;

    // Decide whether THIS slot's placements must satisfy the tether
    // window. Only paired slots whose partner was the last paired
    // placer are constrained; same-slot-as-last-paired and slot-2
    // placements are unconstrained.
    const isPaired = trayIndex === 0 || trayIndex === 1;
    const constrained =
      isPaired &&
      lastPairedPlacementCells !== null &&
      lastPairedSlot !== null &&
      lastPairedSlot !== trayIndex;

    let variant = piece;
    for (let rot = 0; rot < 4; rot++) {
      for (let r = 0; r <= BOARD_SIZE - variant.height; r++) {
        for (let c = 0; c <= BOARD_SIZE - variant.width; c++) {
          const origin = { row: r, col: c };
          if (!canPlacePiece(board, variant, origin)) continue;
          if (constrained && !placementSatisfiesTether(variant, origin, window)) {
            continue;
          }
          return true;
        }
      }
      variant = rotatePiece90Clockwise(variant);
    }
  }
  return false;
}
