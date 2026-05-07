import type { BoardGrid, Coord, PieceShape, TetherDifficulty } from './types';
import { COLORS } from './types';
import { PIECE_CATALOG, PIECE_FAMILY_INFO, generateClassicTray } from './pieces';
import {
  countTetherLegalPlacements,
  tetherDifficultySpec,
  tetherWindowCells,
} from './tether';

/**
 * Tether-mode tray generator.
 *
 * Mirrors `generateClassicTray` shape (3 slots, refilled as one batch)
 * but layers Tether-specific sampling rules:
 *
 *   - Easy / Normal: identical to the Classic tray — Easy's
 *     restrictiveness is felt elsewhere (the difficulty's
 *     `pairedFamilyAllowList` could still narrow the per-slot pool
 *     but in v1 we keep the surface simple by reusing
 *     `generateClassicTray('easy')`, which already favours small
 *     pieces).
 *   - Hard: when an active tether window exists
 *     (`lastPairedPlacementCells !== null`), the next paired-slot
 *     piece is resampled until at least
 *     `requireMinOptions(difficulty)` legal placements exist within
 *     that window. After a fixed retry budget the sampler falls back
 *     to a random "free" piece — prevents pathological infinite
 *     loops on dense boards while keeping the rule meaningful at
 *     the difficulty rung that asks for it.
 *
 * Returns three pieces in tray-index order ([slot0, slot1, slot2]).
 * The reducer assigns these to a fresh tray; tether bookkeeping
 * (`lastPairedPlacementCells`, `lastPairedSlot`) is reset by the
 * reducer when the tray refills, so a fresh tray always starts the
 * round with no active constraint.
 *
 * Note that the generator never modifies the board — it's a pure
 * sampler that READS the post-placement board to evaluate
 * resample candidates.
 */

/**
 * Maximum resample attempts per paired slot at Hard. Bounded so a
 * pathological board (very few empties remaining) can't lock the
 * sampler into a tight loop; on exhaustion we fall back to a free
 * piece sampled from the standard pool. 12 is empirically high
 * enough that the constraint rarely fails on mid-game boards but
 * low enough that endgame boards don't pay a noticeable cost.
 */
const HARD_RESAMPLE_BUDGET = 12;

/**
 * Sample a single random piece from the full Classic catalog.
 * Coloured at sample time from the standard palette so the tray
 * doesn't read as monochromatic. Used as the Tether sampler's
 * fallback when the resample budget is exhausted (Hard) or for
 * Easy / Normal where the resample is disabled. Kept private to
 * this module so the Tether sampler stays the only consumer.
 */
function randomTetherPiece(): PieceShape {
  const variant = PIECE_CATALOG[Math.floor(Math.random() * PIECE_CATALOG.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { ...variant, color };
}

/**
 * Sample a single piece restricted to a family allow-list. Used by
 * Easy difficulty to keep the paired-slot pieces small enough that
 * any Chebyshev-2 window has at least one legal origin. Falls back
 * to the full catalog if the allow-list filters down to zero
 * candidates (defensive — the allow-list is module-private and
 * audited, but the fallback keeps the sampler total).
 */
function randomPieceFromFamilies(allowList: readonly string[]): PieceShape {
  const allowedIds = new Set<string>();
  for (const fam of PIECE_FAMILY_INFO) {
    if (allowList.includes(fam.id)) {
      for (const id of fam.pieceIds) allowedIds.add(id);
    }
  }
  const candidates = PIECE_CATALOG.filter((p) => allowedIds.has(p.id));
  if (candidates.length === 0) return randomTetherPiece();
  const variant = candidates[Math.floor(Math.random() * candidates.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { ...variant, color };
}

/**
 * Build a fresh Tether tray. The `board` is the **post-placement**
 * board that will face the new tray on the next move (the reducer
 * passes `state.board` after applying the placement that emptied
 * the tray); `lastPairedPlacementCells` is whatever paired
 * placement most recently happened — `null` if the round has just
 * started OR if no paired placement preceded the refill.
 *
 * The Hard resample only fires when an active tether window
 * exists. With no window (round start), even Hard falls through
 * to a vanilla random sample — the constraint has nothing to
 * apply against. Slot 2 is always sampled vanilla; the tether
 * never gates the free piece.
 */
export function generateTetherTray(
  difficulty: TetherDifficulty,
  board: BoardGrid,
  lastPairedPlacementCells: readonly Coord[] | null
): PieceShape[] {
  const spec = tetherDifficultySpec(difficulty);

  // No resample required (Easy / Normal, OR no active window) —
  // delegate to the Classic sampler so piece weighting stays
  // consistent with Classic-rung intuition, but apply the Easy
  // family allow-list to the paired slots only (slot 2 still uses
  // the broader Classic pool so the free piece can break a
  // bad tether-window draw).
  if (spec.requireMinOptions <= 0 || lastPairedPlacementCells === null) {
    if (spec.pairedFamilyAllowList) {
      const slot0 = randomPieceFromFamilies(spec.pairedFamilyAllowList);
      const slot1 = randomPieceFromFamilies(spec.pairedFamilyAllowList);
      // Reuse the Classic 'easy' weighting for slot 2 — keeps the
      // free piece small enough not to overshadow the paired pair
      // but still varied enough to feel useful.
      const [, , slot2] = generateClassicTray('easy', board);
      return [slot0, slot1, slot2];
    }
    // Normal: vanilla Classic tray (3 random pieces from the
    // weighted pool). Reusing the Classic generator keeps the
    // piece distribution familiar to anyone arriving from
    // Classic / Decay / Scar.
    return generateClassicTray('normal', board);
  }

  // Hard, active window — resample slot 0 (the next paired-piece
  // the player will reach for) until the tether-window legal-
  // placement count clears the threshold; fall back to a free
  // piece on exhaustion. We resample only slot 0 (the slot that
  // refills back to "first paired") to keep the sampler total —
  // the partner slot won't activate until slot 0 has placed,
  // by which time `lastPairedPlacementCells` will reflect THAT
  // placement and the resample logic re-runs naturally on the
  // next refill.
  const window = tetherWindowCells(lastPairedPlacementCells);
  let slot0: PieceShape | null = null;
  for (let i = 0; i < HARD_RESAMPLE_BUDGET; i++) {
    const candidate = randomTetherPiece();
    const options = countTetherLegalPlacements(board, candidate, window);
    if (options >= spec.requireMinOptions) {
      slot0 = candidate;
      break;
    }
  }
  if (slot0 === null) {
    // Resample exhausted — accept whatever the sampler last
    // produced (a "free" piece by construction; no guarantee on
    // tether placements). The reducer will still validate the
    // first paired placement against the window, and if none
    // exists the game-over check flags it; this is the
    // intended Hard-rung pressure.
    slot0 = randomTetherPiece();
  }

  // slot1 / slot2 sampled vanilla — slot1 will face whatever
  // window slot0's placement establishes (a fresh resample on
  // the next refill if needed); slot2 is the free piece.
  const slot1 = randomTetherPiece();
  const slot2 = randomTetherPiece();
  return [slot0, slot1, slot2];
}
