# 00 — Prior art summary

Read before generating any candidates. All four bad modes are diagnosed in mechanics-speak below.

## Forward-simulation generation (`puzzleGenerator.ts`)

The puzzle generator builds a solvable instance by *playing the puzzle into existence*:

1. Pick a tray of `pieceCount` pieces from a cell-count-bounded pool (with replacement).
2. Seed `prefillCount` pre-fill cells onto an empty board (with a clumpiness knob).
3. `simulateForward(startBoard, pieces, rng)` walks the tray in order; for each piece it enumerates every (rotation, origin) where `canPlacePiece` returns true, picks one uniformly, and applies `applyPlacementAndClear` (place + standard row/column clear). If any piece has zero legal placements, abort and retry.
4. The resulting board is snapshotted as the `target: TargetPattern`.
5. Quality filters reject the candidate unless: target cell count is in `[minTargetCells, maxTargetCells]`; target touches ≥ 2 rows and ≥ 2 cols; pre-fill that the target *requires the player to clear* meets `minPrefillCleared` (this is what makes pre-fill matter — pre-fill cells that survive into the target are decoration).
6. Tray pieces are then shuffled, randomly rotated, and recolored so the player's view of the tray is independent of the generator's solution order.

Because the simulation IS a valid solve, every accepted instance has at least one solution. `canReachTarget` is exposed (BFS over `(occupancy, remaining-multiset)`) for tests but isn't called per-puzzle — forward-sim is the cheaper guarantee.

The fallback hard-coded puzzle is rarely hit in practice; using it is a real failure to diagnose, not a healthy escape valve.

## Reducer mode-dispatch pattern (`gameReducer.ts`)

Every mode is a branch keyed on `state.mode === '<modename>'`. The shape is rigid:

- A `freshXxxState(difficulty, …, bestScore, tutorialStep, puzzleEverSolved)` factory returns a complete `GameState` with `mode: '<modename>'`. Puzzle-style modes set `puzzleTarget`, `puzzleInitialBoard`, `puzzleInitialTray` so RESTART returns to the same instance and the UNDO stack works. Score-attack modes leave those fields null and run `generateClassicTray` for refills.
- `freshGameState` checks `mode` and dispatches to the appropriate factory.
- `gameReducer`'s `PLACE_PIECE` case has early-out branches per mode for placement validation and board mutation: Pipeline checks `trayIndex === pipelinePhase` first; Scar uses `clearLinesPreservingScars`; Mirror uses `*_Mirrored` variants; Gravity uses `resolveCascades`; Drop uses `applySlabCollapse`; the rest fall through into the shared classic placement flow that ends with mode-specific tray-refill / win-check tail blocks.
- `ROTATE_TRAY_PIECE` re-runs the mode-aware "any-move-fits?" probe so post-rotation game-over detection stays correct (Mirror → `hasValidMirrorMoves`, Pipeline → `hasValidPipelineMoves`, others → `hasValidMoves`).
- `SET_<MODE>_DIFFICULTY` and `SET_MODE` re-call the matching `freshXxxState`; mode-specific extras like `pipelinePhase` and `scarRngSeed` reset there.

Each mode also persists its best score under `('<mode>', difficulty)` via `loadBestScore`/`saveBestScore`.

## UI primitives available in `App.tsx`

- `Board` (board grid with previewCells/clearPreviewCells/placedCells overlays, optional `overrideBoard` for cascade playback).
- `PieceTray` (3-slot tray with `activeIndex` highlight — used by Pipeline; tap-to-rotate; drag-to-place).
- `ScoreBar` for score-attack modes only (Puzzle/Mirror/Breathe hide it).
- Target pattern overlay on the Board (used by Puzzle/Mirror/Breathe — the ringed-cells / X-cells affordance with the `CoachMark` is wired to `puzzleTarget`).
- Mode-specific `<XxxIntro>` info chip rendered above the tray (Mirror, Breathe, Pipeline, Scar all use this — small banner with text only, no interactive widgets).
- `<PuzzleLegend>` for puzzle-shaped modes.
- `board-restart-btn` for "New puzzle" on puzzle-shaped modes.
- Undo button for puzzle-shaped modes (drives `puzzleUndoStack`).
- Bottom hint line (one-line tagline per mode).
- `Cell` styling already supports custom sentinel colors (`SCAR_COLOR`, `BLOCKER_COLOR`) without new components — i.e. a new mode can introduce a new colored cell type by adding a sentinel color and a CSS class, without new React components.

What does NOT exist: no per-cell numeric overlay, no animated piece previews next to the board (only inline tray), no second board, no piece queue beyond the 3-slot tray.

## Why each of the four shipped modes is bad (mechanics-speak)

### Mirror — Mirror disease

Every placement at `(r, c)` with rotation `R` also writes the same shape with `c → BOARD_SIZE - 1 - c`. Asymmetric blockers exist on the starting board so the player must dodge blockers on both halves simultaneously. **The new rule is a deterministic function of the placement decision the player already makes.** Once the player picks (piece, rotation, origin), the entire mirrored half is computed automatically — there is no second decision. The "blockers on both halves" framing makes the placement check stricter, but it doesn't ask a new question per placement: the question is still "where on the board does this piece + its forced reflection fit and serve the target?" That's the same question Puzzle asks, with the search space shrunk. The "10th play test" answer: the player just learns to mentally pre-mirror and the mode collapses to a smaller-search-space Puzzle. Mirror disease textbook example.

### Breathe — Breathe disease

Win = match target AND no 2×2 of the board is fully filled at the end. **The generator only produces targets that themselves satisfy the no-2×2 rule** (`targetSatisfiesBreathe(target)` is a hard filter). When the player matches the target exactly — which is already required by the first sub-condition — the second sub-condition is automatically satisfied. The two win conditions are not independent: matching the target ⇒ board satisfies Breathe. The 2×2 rule is an inert decoration on top of Puzzle. Breathe disease textbook example: the new rule is auto-satisfied by the conjunction of the others.

### Pipeline — Pipeline disease

Tray slots become a round-robin queue: only `tray[pipelinePhase]` is placeable; rotating a non-active slot is a no-op; refill happens only when all three slots are empty. **Decisions removed**: choosing which tray piece to place this turn, choosing the order in which the three pieces of a refill batch get placed, lookahead-driven swapping of placement order. **Decisions added**: none. The placement question is still "where does this single specific piece go?" — strictly easier than Classic ("where does the most-useful of three pieces go?"). The mode subtracts agency without compensating. Pipeline disease textbook example.

### Scar — Scar disease

Every clear event scars `k` random empty cells (1/2/3 by difficulty), turning them into permanent blockers. Anti-clustering on Hard is a tiny preference filter, not a rule. **The player has no rule that lets them direct or exploit scarring**: the cells are uniform-random over empty cells. There is nothing to learn — the optimal policy is "play Classic, accept random handicap." Scarring is uncontrollable punishment. Scar disease textbook example.

## Implications for new candidates

Every new candidate must avoid *all four diseases*. In particular:

- A new constraint that's a deterministic function of the existing placement decision is Mirror disease, period. The candidate must add an *independent* decision per placement.
- A new win condition that's implied by the conjunction of the other win conditions is Breathe disease. The candidate must add a sub-condition the player can fail *while still matching everything else*, with a real risk of failure that the player can detect mid-game.
- A new mode that subtracts agency must add at least equal agency back. Candidates should be checked by listing decisions added vs. removed.
- A new randomized antagonist must be controllable: there must be a player rule that *redirects, redirects-to-advantage, or pre-empts* the random event. Pure-noise randomness is Scar disease.
- The dual-purpose mechanic test is the strongest filter. Puzzle's clears do double duty (reward in Classic, deletion tool in Puzzle). The candidate must identify a primitive that does double duty in a similarly load-bearing way.
