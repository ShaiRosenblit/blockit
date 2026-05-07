# Prior-art summary — written before any candidate generation

## Forward-simulation generation (the puzzle-mode template)

`puzzleGenerator.ts::buildCandidate` is the pattern every generator in this run will follow:

1. Pick a difficulty spec (piece count, cell-count band, target-cell band, pre-fill range).
2. Seed a starting board (here: scattered pre-fill cells of a sentinel "blocker" color).
3. Sample a tray of pieces.
4. Forward-simulate: walk the tray in order, at each step enumerate every legal `(orientation, origin)` for the piece against the current board, pick one uniformly at random, then call `applyPlacementAndClear` (place + detect full rows/cols + clear them).
5. Snapshot the resulting board as the target. Because the simulation is itself a valid solution, every generated puzzle is **provably solvable**.
6. Apply quality filters: target cell count in band, target touches ≥ 2 rows AND ≥ 2 cols, ≥ N pre-fill cells must end up outside the target (so pre-fill is meaningful, not decoration), no recently-seen signature.
7. Shuffle tray order, randomly rotate each tray piece for visual variety, paint with random colors, return.

Key invariants preserved across modes: `mulberry32` PRNG (so `seed` round-trips deterministically), an `orientations()` helper that dedupes rotations of a piece, and a fallback puzzle hard-coded for the rare case the spec is unsatisfiable. The optional `canReachTarget` BFS exists for tests but is not used in generation hot paths.

## Reducer dispatch (gameReducer.ts)

The reducer is a single `switch (action.type)` with one branch per action. Mode-specific behavior lives **inside each case** as early `if (state.mode === 'X') { ... return ... }` branches. `PLACE_PIECE` is the canonical example — Pipeline guard first (gate on `pipelinePhase`), then early returns for Scar / Monolith / Quarantine / Mirror / Breathe / Drop / Gravity / Puzzle, each with its own placement validator, clear semantics, score add, tray refill (or no-refill for finite trays), undo-stack push, and win/lose check, falling through to Classic only at the end. `ROTATE_TRAY_PIECE` does the analogous fan-out for rotation legality. `SET_MODE` and `SET_*_DIFFICULTY` route through per-mode `freshXState(...)` factories that build initial `GameState` from generators + persisted best scores.

State is a flat record (no per-mode sub-objects) — fields that are inert outside their owner mode get sentinel defaults (e.g. `pipelinePhase = 0`, `quarantineRegions = null`, `scarRngSeed` unused but always set). This keeps the reducer's return shape stable across modes.

Persistence: every mode has its own `blockit-best-<mode>-<difficulty>` localStorage key; puzzle-style modes also persist the active puzzle JSON under `blockit-puzzle-<difficulty>` so refresh restores the same instance. Migration code lives in `migrateLegacyKeys`.

## UI primitives that already exist

- An 8×8 board grid (`Cell` component) which renders cells colored by their string value. Sentinel colors trigger special CSS classes (`cell--scar`, `cell--will-clear`, wall styling, monolith seed styling).
- A 3-slot tray showing piece previews; pieces drag from tray onto board.
- Per-piece rotate button (active subject to mode lock — Pipeline grays out non-active slots).
- A score bar with score, best, combo readout.
- A target overlay (puzzle/mirror/breathe/monolith): dim cells that should end empty, outlined cells that must end filled.
- A mode/difficulty picker row.
- A status indicator slot (Pipeline uses this for the round-robin "Slot 2 active" label; Quarantine uses it to show region empty-counts vs. targets).
- Game-over overlay with restart, level-up CTA, share, etc.
- A legend for sentinel-color cells.

This is the entire toolkit. New modes will be built strictly on top of these.

## Why the four shipped modes are bad — one paragraph each, mechanics-speak

**Mirror.** Every placement writes the chosen footprint plus its reflection across the vertical axis. The blocker pre-fill is asymmetric, which the design hopes makes "both halves matter," but in practice the placement decision is single: the player picks a left-half origin, and the right half is fully determined by it. There is no second decision being asked. The rule expands what gets written without expanding what the player chooses. This is **Mirror disease** in pure form: the new constraint is a function of an existing decision.

**Breathe.** Standard puzzle mode plus a win-time check that the final board contains no fully-filled 2×2. The forward-simulation generator already produces target patterns that satisfy this (it filters with `targetSatisfiesBreathe`), so when the player matches the target, the 2×2 rule is trivially satisfied. The extra rule is auto-satisfied by the existing rule. This is **Breathe disease** in pure form: a constraint implied by the others.

**Pipeline.** Classic with a tray-slot lock — the player can only place from the round-robin "active" slot. Pure subtraction: the player still places pieces and clears lines, but loses the agency to pick which slot to use. Nothing new is added — no resource to manage, no antagonist to defeat, no new placement question — the choice space is just smaller. This is **Pipeline disease**: agency removed without compensating agency added.

**Scar.** Score-attack like Classic, but every clear permanently scars a small random number of empty cells. The scars are picked by RNG (with a mild anti-clustering bias on Hard) and the player cannot direct, predict, or exploit them. The pressure they create is real but unlearnable — the rule "do not cause a clear in a position that scars a critical row" cannot be applied because the player does not know which empty cells will be hit. This is **Scar disease** in pure form: random uncontrollable punishment.

## What this run will do differently

Every candidate must:

- Pass the 10th-play test (a new question on the 10th attempt that Classic doesn't already ask).
- Have a named antagonist (something on the board the player must actively defeat).
- Use a single primitive that is simultaneously wanted and feared (line clears, rotation, color, the tray itself).
- Make order materially matter (placement decisions coupled across pieces).
- Make negative space matter (where you don't place is constrained).
- Be solvable by construction (forward-simulation or equivalent constructive proof).
- Survive being stress-tested against all four anti-patterns by name.

If a candidate description starts to drift into experiential phrasing ("makes the player think about…", "adds tension…"), it gets rewritten in mechanics-speak (state transitions, what changes on the board, what the player is choosing between) before being added to the registry.
