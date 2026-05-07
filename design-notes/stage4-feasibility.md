# Stage 4 — Generator feasibility analysis

For each of the five Stage 3 survivors (C11, C14, C39, C47, C62), this note designs a constructive generator, lists the per-placement validity checks the runtime needs, sketches difficulty knobs in the same format as `mirrorPuzzleGenerator.DIFFICULTY_SPECS`, calls out failure modes, and gives a FEASIBLE / NOT FEASIBLE verdict.

Notation: B = number of board cells (=64). T = tray length. K = number of erase tokens / fuse cells / piece orientations (always ≤ 4). Forward-sim references `simulateForward` in `puzzleGenerator.ts` as the design exemplar.

---

## C11 (Erasures)

**Mode classification**: (a) finite-tray puzzle (target match). The candidate explicitly specifies "match a target pattern after the tray is exhausted" and "K erase tokens." The generator must produce both a target overlay and a tray, exactly like Mirror/Breathe.

**Generator strategy** — forward-simulation with interleaved erase ops.

```
state = (board: BoardGrid, components: Map<componentId, Set<Coord>>, tokensSpent: int)
```

The simulator walks an extended tray of size N (final tray) but augments each placement with a `(piece, origin, opt: 'place' | 'place-then-erase' | 'erase-prev-then-place')` annotation. At generation time:

1. Pre-fill is sprinkled with the same `seedPrefill` helper.
2. We randomly choose K erase-event indices in the placement schedule (well-spaced — no two within 1 of each other, and never the very first placement).
3. The forward sim places each piece via `applyPlacementAndClear`, but on the tagged turns it also picks a recently-placed component (the just-finished placement, or any other player-placed component) and DELETES that component from the board (write its cells to `null`). This component-deletion is the mechanic's `eraseComponent(board, root)`.
4. After the full sequence, snapshot occupancy as the target.
5. Quality filters: at least minPrefillCleared pre-fill cells must end NOT in the target (so clears are forced); EVERY erase event must delete ≥ 2 cells (otherwise the token is a no-op and decoration); the target must NOT be reachable by simply skipping all erases (so the tokens are LOAD-BEARING — see "Solvability proof" backup below).

**Hidden state at generation time**: the player sees the target AND the K token count. The schedule of WHICH placements should be erased is hidden — the player rediscovers it. Pre-fill positions are visible.

**Per-placement validity checks** (`canPlaceErasures`):
- Standard `canPlacePiece` (in-bounds + empty).
- Token count ≥ 0 if the action is "erase" (token-spend is a separate UI action; placement validity unchanged).
- Erase action validity: chosen root cell must be a player-placed cell (NOT pre-fill, NOT in the target overlay alone — overlays are not on the board grid). This is a standard component-of-non-pre-fill check.

**Difficulty knobs** (3 rungs):
```
easy:   { pieceCount: 4, minPieceCells: 3, maxPieceCells: 4, eraseTokens: 2, prefillCount: 2,  minPrefillCleared: 1, minTargetCells: 8,  maxTargetCells: 14, minMandatoryErases: 1 }
normal: { pieceCount: 6, minPieceCells: 3, maxPieceCells: 5, eraseTokens: 3, prefillCount: 4,  minPrefillCleared: 2, minTargetCells: 12, maxTargetCells: 22, minMandatoryErases: 2 }
hard:   { pieceCount: 8, minPieceCells: 4, maxPieceCells: 5, eraseTokens: 5, prefillCount: 6,  minPrefillCleared: 3, minTargetCells: 18, maxTargetCells: 30, minMandatoryErases: 3 }
```

`minMandatoryErases` is a quality filter: the generator counts the actual erase events used in its trace and rejects if fewer than this number deleted scaffold cells (cells not present in the final target).

**Computational complexity**:
- Generation per attempt: simulator walks N placements, each enumerating O(B · K) origins → O(N·B·K). Erase operation is O(B) flood-fill. Per attempt O(N·B·K + N·B). Negligible.
- Per-move legality (placement): O(piece-cells) ≤ O(5). Erase action: O(B) component finder.
- Win check: identical to Puzzle's `boardMatchesTarget` — O(B).

All polynomial. Within budget.

**Failure modes & mitigations**:
1. *Tokens never required* (mode collapses to Puzzle + free undo). Mitigation: the `minMandatoryErases` filter; reject any candidate whose final target is reachable by the same tray with NO erases (lightweight check: re-run a no-erase forward-sim attempting to reach the target — if it succeeds within R retries, reject the puzzle).
2. *Component-merge trap is undetectable to the player.* Generator must NEVER schedule an erase whose target component is adjacent to another component that should be retained — otherwise during play, a player who places identically to the sim's footprint geometry but with a piece that touches a permanent component will merge them, making the intended erase delete too much. Mitigation: at simulator time, when we tag an erase, require that the to-be-erased component has NO 4-neighbor cell that's part of a permanent component (any component still present in the final target). If violated, retry placement choice for that turn.
3. *Erase-token waste — generator picks erase events that delete a single cell.* Mitigation: filter `actualErasedCells ≥ 2 per erase`.
4. *Pre-fill cliff* (Stage 3 trace flagged unwinnable mid-puzzle if a row-clear plan misfires). Mitigation: generator records a "safety margin" — for each pre-fill cell that ends up cleared by row/col completion in the trace, require that the line carrying it has ≥ 2 placements in the trace before its clear. This gives the player some leeway.

**Solvability proof?** The simulation IS a valid solution — the (place, erase, place, …) sequence the generator built is a play that ends matching the target. Forward-sim is the proof. The fragility is that the proof assumes the player rediscovers the SAME schedule of erases; if filters #1 and #2 hold, the schedule's necessity is structural (without it the target is unreachable), so the player has signal. Backup: include the trace itself as a hint-mode breadcrumb (debug-only initially) so we can manually audit.

**Implementation complexity**: M — ~250 LOC. Simulator extends `simulateForward` with erase events; component-finder reuses Quarantine/Monolith's flood-fill primitive; everything else is the standard Puzzle pipeline.

**VERDICT: FEASIBLE.**

---

## C14 (Decay)

**Mode classification**: (c) hybrid, leaning toward (a). The candidate description allows either, and the Stage 3 trace was a "mid-run snapshot" suggesting endless. But ageing is structurally cleaner as a finite-tray puzzle: a target pattern + age constraints means the generator can guarantee solvability via forward-sim and the player gets a concrete win condition. Endless score-attack would work too but adds nothing to the mode (the ageing rule already provides the new question; an antagonist would over-load it).

Choice: **finite-tray puzzle.**

**Generator strategy** — forward-sim with age tracking.

```
state = (board: BoardGrid, ageGrid: int[8][8])  // age = -1 for empty, 0..3+ for filled
```

The generator's simulator is identical to `puzzleGenerator.simulateForward` except:
1. Age 0 is written for every cell of a freshly placed piece.
2. Before checking line clears, every existing cell's age is incremented (capped at 3).
3. Line clear predicate: row/col is full AND every cell in it has age ≥ 3.
4. Snapshot final occupancy as the target.

A piece tray is rejected unless the trace triggered ≥ 1 ageing-gated clear (i.e. a clear that would NOT have fired under Classic rules at the same step — meaning the trace genuinely exercised the mechanic).

**Hidden state at generation time**: NONE. The player sees the target, the tray, and live ages. The puzzle is fully visible. The "hidden" part is which sequence of placements satisfies the calendar — but that's the puzzle, not generator-hidden state.

**Per-placement validity checks** (`canPlaceDecay`):
- Standard `canPlacePiece` (in-bounds + empty). NO new placement constraints.
- The mechanic difference is only in the *clear predicate*, which runs after placement. So `canPlaceX` is identical to classic; the difference is in `applyPlacementAndClearWithDecay`.

**Difficulty knobs**:
```
easy:   { pieceCount: 4, minPieceCells: 2, maxPieceCells: 3, ageThreshold: 2, ageCap: 3, minTargetCells: 6,  maxTargetCells: 14, minAgeGatedClears: 1 }
normal: { pieceCount: 6, minPieceCells: 3, maxPieceCells: 4, ageThreshold: 3, ageCap: 3, minTargetCells: 12, maxTargetCells: 22, minAgeGatedClears: 2 }
hard:   { pieceCount: 8, minPieceCells: 3, maxPieceCells: 5, ageThreshold: 3, ageCap: 4, minTargetCells: 16, maxTargetCells: 28, minAgeGatedClears: 3 }
```

`ageThreshold` is the minimum age for a cell to be "ripe"; lowering it on Easy means rows can clear after only 2 placements of patience instead of 3. `minAgeGatedClears` is the count of clears in the trace that would NOT have fired under classic rules.

**Computational complexity**:
- Generation per attempt: O(N·B·K) for the forward sim. Age increment is O(B) per turn → O(N·B). Total O(N·B·K).
- Per-move legality: O(piece-cells). Identical to classic.
- Win check: O(B). Identical to Puzzle.

All polynomial.

**Failure modes & mitigations**:
1. *Trace never exercises the ageing rule* — the simulator clears every line before any cell ages out. Mitigation: `minAgeGatedClears` filter; reject if zero clears were gated by age.
2. *"Filled but not cleared" UX cliff* (Stage 3 trace flagged this). Generator can't fix UX, but it CAN avoid puzzles where ≥ 3 lines are simultaneously full-but-young (overwhelming). Filter: at no step in the trace did more than 1 line stand full-but-young.
3. *Early-game feels like classic* (Stage 3 noted this). Mitigation: seed pre-fill with non-zero ages (pre-aged pre-fill) so the mechanic activates from move 1. Add `prefillStartAge` to the spec (e.g. age 2 on Hard).
4. *Stale rows blocking placements with no out* — the trace showed mid-puzzle congestion. Filter: at no step in the trace did `hasValidMoves(board, remainingTray)` return false (this is already implicit if forward-sim succeeds, but worth asserting).

**Solvability proof?** Forward-sim with age tracking IS a valid play — the same placement sequence the generator used is a winning solution. Identical proof structure to Mirror/Breathe.

**Implementation complexity**: S–M, ~180 LOC. Tiny extension of the puzzle generator; the only new thing is the ageGrid plus the modified clear predicate.

**VERDICT: FEASIBLE.**

---

## C39 (Heading)

**Mode classification**: (a) finite-tray puzzle. The Stage 3 trace ran score-attack but explicitly noted: "Generator (if puzzle variant) must guarantee the target requires at least one anchor-residue-style placement, otherwise full-clear strategy degenerates the mode to Classic-with-rotation-discipline." Puzzle is the structurally cleaner choice for the same reason as Decay: the new question is local (per-clear), and a target-match win condition lets the generator force half-clears.

**Generator strategy** — forward-sim with heading-tagged placements.

```
state = (board: BoardGrid, headingsByCell: Heading[8][8] | null)
```

For each placement, the simulator:
1. Records the orientation index (0..3) → heading {UP, DOWN, LEFT, RIGHT} on the placement.
2. Detects completed rows/cols.
3. For each completed line, intersects the line with the heading's half-board; only the intersection is cleared. The other half of the line stays filled.
4. Snapshot final occupancy as target.

**Symmetry handling**: the candidate flagged that square / monomino / + / 2x2 pieces have all-rotation-identical orientations and thus no meaningful heading. The generator must filter the piece pool to shapes with ≥ 2 distinct orientations. PIECE_FAMILY_INFO has rotation counts; we exclude families where rotation count = 1. For the I-tetromino (2 distinct orientations), we map horizontal→LEFT and vertical→UP by convention (a published rule the player can read once and remember).

**Hidden state at generation time**: NONE. Heading metadata is visible per tray slot via an arrow icon.

**Per-placement validity checks** (`canPlaceHeading`):
- Standard `canPlacePiece` (in-bounds + empty).
- The piece's CURRENT rotation must have a distinct heading (i.e. the piece is in the canonical-orientation table and rotation count ≥ 2). Rotating a square piece rejects with "no defined heading."
- Clear-direction mechanics live in the clear step, not placement; placement itself only adds the heading constraint.

**Difficulty knobs**:
```
easy:   { pieceCount: 3, minPieceCells: 3, maxPieceCells: 4, minTargetCells: 6,  maxTargetCells: 14, minHalfClears: 0, prefillMin: 0, prefillMax: 1 }
normal: { pieceCount: 5, minPieceCells: 3, maxPieceCells: 4, minTargetCells: 12, maxTargetCells: 22, minHalfClears: 1, prefillMin: 1, prefillMax: 3 }
hard:   { pieceCount: 7, minPieceCells: 4, maxPieceCells: 5, minTargetCells: 18, maxTargetCells: 30, minHalfClears: 2, prefillMin: 2, prefillMax: 5 }
```

`minHalfClears` is a quality filter: the trace must include ≥ N clears that left residue (otherwise the puzzle could be solved by full-clear-only and degenerates to Classic-with-pretty-arrows).

**Computational complexity**:
- Generation per attempt: forward-sim O(N·B·K) where K ≤ 4 orientations. Half-clear logic is O(B) per clear.
- Per-move legality: O(piece-cells).
- Win check: O(B).

Polynomial.

**Failure modes & mitigations**:
1. *Heading rule dormant in the trace* — no clears triggered, or all clears were full-half (heading aligned with full line). Mitigation: `minHalfClears` filter; resample piece orientations until a half-clear is forced.
2. *Symmetric pieces sneak in* — the spec already excludes them, but custom puzzles could let them through. Mitigation: hard whitelist in `poolForSpec`; throw at generation if pool size < pieceCount required diversity.
3. *Heading distribution degenerate* (Stage 3 flagged ≥ 80% same heading). Mitigation: filter — count headings used in trace; require ≥ 2 distinct headings.
4. *Heading-vs-line-axis mismatch creates "completed but no clear"* — already flagged in Stage 3. Generator must NOT produce traces where a row clear is supposedly fired by a heading=UP placement (where heading-UP only intersects rows 0–3, so a heading-UP placement that completes row 5 triggers no clear). Mitigation: the simulator computes intersection correctly already; if the result is "would have cleared but heading misses" then that's a wasted line. Quality filter: zero "wasted" cleared lines in the trace (the player can do this on purpose, but the generator's reference solution shouldn't).

**Solvability proof?** Forward-sim is the proof, exactly as Mirror/Breathe. The simulator's trajectory is a winning play.

**Implementation complexity**: M, ~220 LOC. Heading metadata + half-clear helper + symmetric-piece filter; not large but multiple small surfaces.

**VERDICT: FEASIBLE.**

---

## C47 (Fuse)

**Mode classification**: (a) finite-tray puzzle. The candidate description specifies a target pattern and "no fuses remaining" — a pure puzzle.

**Generator strategy** — *hybrid forward-then-decorate.* This is the most delicate of the five.

The Stage 3 trace surfaced a fundamental risk: forward-sim alone produces puzzles where defusing a fuse requires clearing a line that contains target cells, making the puzzle infeasible. The candidate's own strategy hint says "build forward to make a target, then walk backwards to insert fuses along lines the sim cleared." That's the right approach. Concretely:

1. Run a vanilla `simulateForward` with N+F pieces (where F = fuse count) on an empty board to produce a final target. Record EVERY clear event in the trace as a tuple `(placementIndex, axis, lineIndex, cellsCleared)`.
2. For each of F fuse positions, randomly select F of the recorded clear events. For each selected event:
   - Pick a cell that was cleared by that event AND was NOT part of any later trace placement (i.e. a cell that ended up empty in the final target). This is the future fuse position.
   - Set fuse countdown = `placementIndex` (the event fires AFTER that many placements, so countdown that many will tick to 0 and the clear that erases it happens on that step).
   - Stage 3 flagged that "every fuse's clearing-line should share ≥ 1 target overlay cell" so the player has a dual-coded incentive. Add this filter: the line that defuses each fuse must contain ≥ 1 target cell.
3. Replace the cells that were filled by trace pieces at the chosen fuse positions with FUSE pre-fill (carrying their countdowns). The pre-fill is the puzzle's start state.
4. Specify wall semantics on detonation: the fuse cell becomes a WALL on detonation (Stage 3 noted this needs specification). 4-neighbor empties become walls.
5. The published puzzle: starting board (fuse pre-fill), tray (the trace's piece order minus the F pieces that "spawned" the fuse cells), target pattern.

**Hidden state at generation time**: NONE. Fuses, countdowns, and target are all visible.

**Per-placement validity checks** (`canPlaceFuse`):
- Standard `canPlacePiece` (in-bounds + empty; fuse cells are NOT empty so they auto-block).
- Fuse cells cannot be placed on (treated as filled by `canPlacePiece`).
- Walls (post-detonation) cannot be placed on.

**Difficulty knobs**:
```
easy:   { pieceCount: 4, minPieceCells: 3, maxPieceCells: 4, fuseCount: 1, minCountdown: 3, maxCountdown: 5, minTargetCells: 6,  maxTargetCells: 14 }
normal: { pieceCount: 6, minPieceCells: 3, maxPieceCells: 5, fuseCount: 2, minCountdown: 2, maxCountdown: 5, minTargetCells: 12, maxTargetCells: 22 }
hard:   { pieceCount: 8, minPieceCells: 4, maxPieceCells: 5, fuseCount: 3, minCountdown: 2, maxCountdown: 6, minTargetCells: 16, maxTargetCells: 28 }
```

Fuse countdowns are clamped by the generator into the spec's range; if a chosen clear-event's `placementIndex` exceeds `maxCountdown`, the fuse is dropped and re-sampled.

**Computational complexity**:
- Generation per attempt: forward sim O(N·B·K), then F clear events to pick from (at most O(N) of them), per-fuse cell-from-event scan O(B). Total O(N·B·K + F·B).
- Per-move legality: O(piece-cells).
- Win check: O(B) for `boardMatchesTarget` + O(B) for "no fuses remaining" = O(B).

All polynomial.

**Failure modes & mitigations**:
1. *No clears in the forward sim → no candidate fuse events.* Mitigation: retry; require trace to contain ≥ fuseCount clear events.
2. *Fuse-on-target conflict* — the fuse's defusal line passes through target cells, forcing those cells to be re-filled after defusal but no piece remains to do so (Stage 3 trace 1's failure). Mitigation: the generator already builds backwards from a successful trace, so the trace's piece order GUARANTEES the rebuild; published tray = trace's piece order. The player must follow the schedule, but a valid one provably exists.
3. *Detonation cliff is silent.* Generator can't fix UX, but the architecture should support a "would-detonate-next-turn" warning — out of generator scope.
4. *Walls block the rest of the puzzle.* Mitigation: backwards-construction NEVER produces walls in the proof solution (the proof clears each fuse before it detonates), so walls only appear if the player deviates. That's the player's failure, not the generator's.
5. *Fuse cells spawn on cells that get filled in the final target.* Filter: only consider clear-event cells whose final target value is empty.

**Solvability proof?** The forward-sim trace is the proof. By construction, the trace's piece order clears each fuse-bearing line before its countdown hits zero (because the countdown is set to the placement-index of the clear event in the trace). The published puzzle has solution = the trace's piece order. **Caveat**: this proof depends on the player following an order; the puzzle may have OTHER orders that also work, or NO others (unique solution = potentially frustrating, see C13's risk note). Stage 3 noted "tuning band is narrow." Backup: relax `maxCountdown` to give slack — at generation time, increase each fuse's countdown by 1–2 placements so the player has a small order-tolerance window; reject candidates where ANY fuse's countdown is exactly tight (no slack).

**Implementation complexity**: M–L, ~320 LOC. Forward-sim variant + clear-event recorder + fuse decoration step + per-turn fuse decrement in the reducer + detonation handler + `canPlaceFuse` validator + win check extension.

**VERDICT: FEASIBLE.** With the slack-padding mitigation. Without it, the proof fragility (unique-solution puzzles) risks player frustration but doesn't make the generator unable to produce solvable instances.

---

## C62 (Tether)

**Mode classification**: (b) endless score-attack with tether antagonist. The candidate's own description ("Tray refills as in Classic") and Stage 3 trace ran endlessly. The new question (joint placement of paired slots) doesn't naturally reach a "target" — it's a continuous board-management challenge. Score-attack is structurally cleaner.

**However**, score-attack still needs a *generator* — for the starting board (which the candidate explicitly describes as having "organic clutter") and for tray refills. So the "generator" here is two pieces: (a) initial pre-fill, (b) ongoing tray sampler.

**Generator strategy** — forward-sim survival probe + tether-aware tray sampler.

For initial pre-fill:
1. `seedPrefill` with a difficulty-tuned cell count.
2. Forward-simulate K placements with a tether-aware sampler (pair refresh → require ≥ minTetherOptions legal partner placements at every step).
3. If the survival probe survives K placements without soft-locking, accept the initial board.

For ongoing tray (during play):
- Tray slot 1 and slot 2 are paired; slot 3 is free.
- Sampler picks pieces uniformly from a difficulty-appropriate pool.
- Rejection sample: after sampling, verify on the CURRENT live board that ≥ minTetherOptions tether-legal placements exist for the (slot-1, slot-2) pair; if not, resample pieces until they fit. This is the soft-lock guard.

**Hidden state at generation time**: NONE. Tether window is visible via overlay (5×5 box around prior partner cells).

**Per-placement validity checks** (`canPlaceTether`):
- Standard `canPlacePiece` (in-bounds + empty).
- If the piece is from a paired slot AND there is an active anchor (the partner placed last and the partner constraint is live), the placement footprint must include ≥ 1 cell within Chebyshev-2 of any anchor cell. This is a per-cell distance check, O(piece-cells × anchor-cells) ≤ O(25).

**Difficulty knobs** (tracking the candidate description):
```
easy:   { piecePool: 'classic-easy',  minTetherOptions: 8, prefillMin: 0, prefillMax: 0,  initialSimSteps: 4 }
normal: { piecePool: 'classic',       minTetherOptions: 4, prefillMin: 2, prefillMax: 4,  initialSimSteps: 6 }
hard:   { piecePool: 'classic-hard',  minTetherOptions: 2, prefillMin: 4, prefillMax: 8,  initialSimSteps: 8 }
```

`minTetherOptions` is the minimum number of (orientation × origin) tuples that must satisfy the tether constraint at every step the survival probe checks, giving the player meaningful choice.

**Computational complexity**:
- Initial board generation per attempt: forward-sim K steps, each enumerating O(B·R) origins (R = 4 orientations) → O(K·B·R). Tether check per origin: O(piece-cells × anchor-cells) ≤ O(25). Total O(K·B·R) ≈ O(K·B).
- Per-move legality: O(piece-cells × anchor-cells) ≤ O(25), constant for all practical purposes.
- Win check: N/A (endless mode); game-over check is `hasValidTetherMoves`, O(B·R·anchor-cells) ≈ O(B).

Polynomial.

**Failure modes & mitigations**:
1. *Soft-lock from clutter shrinking the tether window* (Stage 3 trace flagged this loud). Mitigation: tray sampler enforces `minTetherOptions` at every refill; if no piece-pair satisfies, it fails over to a "free piece" alternative (slot 3 is always free; on refill, if a paired sample can't satisfy the constraint, give the player a free piece instead and reset the tether anchor).
2. *Tether window collapses to one legal placement (force-move).* Stage 3 noted this happens in mid-game clutter. Mitigation: `minTetherOptions ≥ 2` required by the sampler. If the live board's clutter prevents this even with resampling, the game ends (graceful loss, not a crash).
3. *Slot-3 burned early → no bailout*: this is a player decision, not a generator issue, but the sampler can favor refilling slot 3 with versatile pieces (small or 1×3) so the bailout is more likely to fit when needed.
4. *Initial pre-fill renders a tether-inactive board* — the first paired placement has too much room, making the tether trivial. Mitigation: spec's initialSimSteps probes that the first few moves are non-trivially constrained.

**Solvability proof?** Score-attack has no win condition, so "solvability" reduces to "does the game continue?" The tray sampler's `minTetherOptions ≥ 2` invariant is the proof: at every point, the player has ≥ 2 legal continuations. This is a survivability guarantee, not a solvability guarantee — and it's lossy (the player can still lose by playing badly or by clutter eventually denying placements). That's normal for score-attack.

**Implementation complexity**: M, ~250 LOC. Tether anchor state in `GameState`, `canPlaceTether` validator, tray sampler with rejection, tether overlay UI is out of generator scope but trivial.

**VERDICT: FEASIBLE.**

---

## Summary

| ID  | Name      | Verdict   |
|-----|-----------|-----------|
| C11 | Erasures  | FEASIBLE  |
| C14 | Decay     | FEASIBLE  |
| C39 | Heading   | FEASIBLE  |
| C47 | Fuse      | FEASIBLE  |
| C62 | Tether    | FEASIBLE  |

All five candidates have constructive generators that produce provably-solvable instances. C47 is the most fragile due to potential unique-solution puzzles (mitigated by countdown slack-padding). C11 has a real risk of mechanic dormancy (mitigated by `minMandatoryErases` filter). C14 and C39 are the cleanest extensions of the existing puzzle generator pipeline. C62 is the only score-attack of the five and uses a different shape (survival probe + live tray sampler) but stays well within polynomial complexity.
