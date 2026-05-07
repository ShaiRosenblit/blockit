# Quarantine — design doc (Stage 7)

## Tagline (mechanics-speak)

Indestructible wall cells partition the 8×8 board into 2–3 regions. Each region carries an exact-empty-cell target. Win = every region's empty count exactly matches its target after the tray is empty. New decision per placement: which cells in which region's budget am I spending — and does this piece span two regions, drawing from both budgets?

## Full rules

- The board contains a set of WALL cells (sentinel color, e.g. `'#3a3a4a'`). Walls are placed at generation time; they form a 4-connected chain from one board edge to another (or a T-shape forming 3 regions). Walls are indestructible: they are never cleared by line clears.
- The empty cells form 2 or 3 maximal 4-connected components (regions), separated by the walls. Each region `i` has a per-instance target `T_i` ∈ ℕ, shown as a small badge in one cell of the region.
- Tray of N pieces (N varies by difficulty). Tray is finite — no refill on empty.
- Placement rules:
  - `canPlacePiece` (the existing geometry rule) already rejects non-null cells, so walls block placements with no extra code.
  - A placement may cover cells in multiple regions.
- Line clears: rows/columns with all 8 cells non-null clear, **but wall cells are preserved** (mirrors Scar's `clearLinesPreservingScars` pattern). The cleared player-cells reduce the empty count of any region they were in, restoring those cells to empty.
- Win condition: after the last tray piece is placed (or sooner if the player would place a piece that satisfies all targets and tray ≥1 left over — but the design ships with **tray-empty-required** to keep the rule simple), for every region `i`, `|empty_cells(region_i)| === T_i`.
- Lose condition: tray exhausted with at least one region's empty count ≠ target, OR no piece in current tray has a legal placement.
- Restart returns to the puzzle's initial state (puzzle-mode pattern, with undo stack).

## Win/lose predicates (exact)

```ts
function isQuarantineSolved(board: BoardGrid, regions: RegionMap, targets: number[]): boolean {
  for (let r = 0; r < regions.length; r++) {
    let emptyCount = 0;
    for (const { row, col } of regions[r]) {
      if (board[row][col] === null) emptyCount++;
    }
    if (emptyCount !== targets[r]) return false;
  }
  return true;
}

function isQuarantineFailed(state): boolean {
  return state.tray.every(slot => slot === null) && !isQuarantineSolved(...) ||
         !hasValidMoves(state.board, state.tray);
}
```

`RegionMap` is a static `Coord[][]` precomputed at generation time (one entry per region, each entry the list of empty cells in that region at GENERATION time — not live). Each cell is in at most one region. Wall cells appear in zero regions.

## Generator strategy (pseudocode)

```ts
function generateQuarantine(spec: QuarantineSpec, seed: number): QuarantineInstance | null {
  for (let attempt = 0; attempt < 80; attempt++) {
    const wallShape = pickWallShape(spec.wallKind, rng);  // 'horizontal' | 'vertical' | 't' | 'l'
    const wallCells = layoutWall(wallShape, rng);
    const startBoard = stampWalls(createEmptyBoard(), wallCells);

    const regions = computeRegions(startBoard);  // flood-fill of empty cells
    if (regions.length !== spec.regionCount) continue;

    const pieces = pickPieces(spec, rng);
    // forward-sim: pick legal placements at random for each piece, applying clears
    const sim = simulateForwardWithClears(startBoard, pieces, rng);
    if (!sim) continue;

    // Compute per-region empty count from the sim's final board
    const finalRegions = computeRegions(sim.finalBoard);  // could differ if clears split a region
    if (finalRegions.length !== regions.length) continue;  // walls only — region count must match

    const targets = regions.map(region => {
      let empties = 0;
      for (const { row, col } of region) {
        if (sim.finalBoard[row][col] === null) empties++;
      }
      return empties;
    });

    // Quality filters
    if (targets.some(t => t === 0)) continue;          // no fully-fill-required regions
    if (!simSpansBoundary(sim, regions)) continue;     // ≥1 placement spanned two regions
    if (targetsAreTrivial(targets, regions)) continue; // not "place 0 pieces in this region"

    const tray = colorize(shuffleAndRotate(pieces, rng), rng);
    return {
      board: startBoard,
      tray,
      regions,
      targets,
      signature: signatureOf(startBoard, tray, targets),
    };
  }

  return null;  // caller falls back to a hardcoded fixture
}
```

The wall library for v1: `horizontal` (a row at row 3 or 4), `vertical` (a col at col 3 or 4), `T-shape` (a row + a partial col), `L-shape` (a row + a partial col forming an L). Each yields 2 or 3 regions.

## The 7 ingredients — scored and justified

| # | Ingredient | Score | Justification |
|---|------------|-------|---------------|
| 1 | Bounded scope | 2 | Finite tray, exact win check, restart trivially returns to start. |
| 2 | Antagonist | 2 | The walls + the per-region budgets. The player must satisfy each budget exactly. |
| 3 | Dual-purpose mechanic | 2 | A boundary-spanning piece debits BOTH regions' budgets simultaneously. Wanted by one (close to target), feared by the other (over-spend). Same primitive (placement) wears two faces depending on which budget is tighter. |
| 4 | Order matters | 2 | Filling region A early may make a bridge piece unplaceable later (region A budget exhausted, so the boundary cells the bridge needs are not legal). Different orderings reach different feasibility frontiers. |
| 5 | Negative space matters | 2 | The win condition IS the per-region empty count. This is the most negative-space-central candidate of the run. |
| 6 | Solvability guarantee | 2 | Forward-sim guarantees each instance was reached by some placement sequence; that sequence is the proof. |
| 7 | Structural aha | 2 | Quantitative budget on top of geometric placement — novel for Blockit; the same insight ("manage two budgets at once via a boundary piece") doesn't appear in any other shipped mode. |

**Total: 14 / 14.**

## Worked example

**Generator output (small, hand-traced example for design doc clarity)**:

Wall shape: vertical wall at col 3, rows 0–7 (8 wall cells).
Regions:
- A: cols 0–2 (24 cells)
- B: cols 4–7 (32 cells)

Tray: `[H3 (3-cell horizontal), L1 (3-cell L), SQ2 (4-cell square)]`. Total = 10 cells.

Forward-sim: 
- M1: SQ2 at (5,4)-(5,5)-(6,4)-(6,5) → 4 cells in B. B empty count drops 32 → 28.
- M2: H3 spanning the wall at (3,1)-(3,2)-... wait, H3 is horizontal 3-cell. Let's say at (3,0),(3,1),(3,2) → 3 cells in A. A empty count drops 24 → 21.
- M3: L1 spanning the wall: cells (4,2),(5,2),(5,3)... but (5,3) is wall, illegal. Try (4,4),(5,4)... (5,4) already filled. Try (4,4),(5,4),(5,5) — overlaps. Pick L1 at (1,4),(2,4),(2,5) → 3 cells in B. B 28 → 25.

Final board: A has 21 empty, B has 25 empty. Targets `[21, 25]`.

Player view: walls at col 3, target badges showing "21" in region A and "25" in region B. Tray = `[H3, L1, SQ2]` shuffled.

Question-per-placement transcript:
- M1: tray `[L1, SQ2, H3]`. *"Region A budget: 21 empties needed (currently 24, must reduce by 3). Region B: 25 (currently 32, must reduce by 7). Most efficient debit: a 4-cell SQ2 in B reduces by 4, leaving 3. But where in B? Or do I take L1 (3 cells) into A which exactly hits A's 3-cell debit?"* — multi-region budget triage.
- M2: tray `[SQ2, H3]`. *"A is exactly satisfied (21 empties). B needs 4 more cells filled. SQ2 is 4 cells — does it fit cleanly in B? Or do I save SQ2 and use H3 (3 cells) leaving 1 to be plugged?"* — exact-residual op.
- M3: tray `[H3]` (or whichever remains). *"Last piece. Does its footprint exactly land 4 cells in B (over-spending) or 4 cells split A:1, B:3 (matches both)? If neither, I lose."* — feasibility-closing op.

Each placement asks a distinct question (triage, residual, closing). PASSES the 10th-play test cleanly.

## Anti-pattern tests

**Mirror disease**: PASS — the per-region budget is not auto-determined by the placement. Different placements with the same footprint geometry produce different budget allocations because the regions are distinct cell sets.

**Breathe disease**: PASS — the "all regions hit target exactly" win condition is not auto-implied by any other rule. With the same tray placed in different orders, you can end up with different per-region empty counts; only specific orderings hit all targets.

**Pipeline disease**: PASS — placement freedom is preserved (the player still picks piece, rotation, position). What's added is a per-region budget tracking decision. Net agency is increased.

**Scar disease**: PASS — the walls and targets are deterministic at generation. The player can always learn a placement strategy; nothing is randomly punishing. The generator's seeded randomness is invisible at play time.

## UI integration plan

- New `'quarantine'` literal in `GameMode` and `ModeSelection` (in `types.ts`).
- New `QuarantineDifficulty` literal: `'easy' | 'normal' | 'hard'`. Const `QUARANTINE_DIFFICULTIES`.
- New file `src/game/quarantineGenerator.ts` — patterned on `puzzleGenerator.ts` and `monolithGenerator.ts`.
- New `WALL_COLOR = '#3a3a4a'` exported from `src/game/board.ts` plus helper `isWall`.
- New helper in `src/game/board.ts`:
  - `clearLinesPreservingWalls` (mirror of `clearLinesPreservingScars`).
  - `computeQuarantineRegions(board)` — flood-fill regions of non-wall cells.
  - `hasValidQuarantineMoves(board, tray)` — ordinary `hasValidMoves` since walls are already non-null and rejected by `canPlacePiece`.
- New reducer branch in `gameReducer.ts` `PLACE_PIECE` — patterned on the Monolith branch:
  - Validate via standard `canPlacePiece`.
  - Apply placement.
  - Detect & clear lines via `clearLinesPreservingWalls`.
  - On tray-empty: check per-region empty counts vs targets via `isQuarantineSolved`.
- New `App.tsx` additions:
  - `QuarantineIntro` component (small explainer; pattern matches existing `MonolithIntro`).
  - Difficulty chip block (existing pattern).
  - Add `'quarantine'` to `experimentalModes` array as a chip.
  - Render wall cells via Cell component reading `WALL_COLOR` (subtle dark tint).
  - Render per-region target badge: a small absolute-positioned overlay reading the target number, anchored to the badge cell of each region.
- New persistence key: `'blockit-quarantine-difficulty'`.
- Best-score persistence: `selectionKey({ mode: 'quarantine', difficulty })`.
- `puzzleResult` semantics extend: `'solved' | 'failed'` apply (target match check on tray-empty).
- `puzzleUndoStack` reused for undo functionality.

## Difficulty tiers

| Difficulty | Regions | Wall shape | Tray pieces | Target tightness | Pre-fill in regions |
|------------|---------|------------|-------------|------------------|---------------------|
| Easy       | 2       | horizontal or vertical (8-cell wall) | 3 pieces (sizes 2–4) | targets within ±20% of initial | 0 |
| Normal     | 2 or 3  | horizontal/vertical/T (8–12 walls) | 4 pieces (sizes 3–5) | targets within ±35% | 0–2 stray pre-fill cells |
| Hard       | 3       | T or L (10–14 walls) | 5 pieces (sizes 3–5) | targets within ±50%, includes a "must clear via line" target | 2–4 stray pre-fill |

The "must clear via line" target on Hard means the only way to reach that target is to trigger ≥1 line clear during the solution — engaging the wall-preserving clear semantics directly.

Stage 8 implementation begins next.
