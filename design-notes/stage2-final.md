# Stage 2 final survivors (after cross-mix tightening)

## Survivors

### C47 (Fuse)
**Cluster:** spreading-antagonist
**Rationale:** Each pre-fill cell carries a public countdown that ticks every placement; the player must engineer a row/column clear that includes the cell before its counter hits zero or the cell detonates into permanent walls on its 4-neighbors. The placement question is *defusal scheduling against a global clock* — pick the order in which fuses are cleared, given only N placements left and K independent deadlines. This is structurally distinct from every other candidate in the spreading-antagonist cluster: C12 Bloom and C26 Smother ask "where do I cap/surround the spreader" (graph-local), C01 Cancer asks a threshold-neighborhood question, and C28 Starve / C21 Tide-II ask "race against a single monotonic clock." Fuse is the only one where each antagonist cell has its OWN deadline, forcing scheduling across cells, not just across turns.

### C45 (Vermin)
**Cluster:** spreading-antagonist
**Rationale:** Vermin tokens walk one step per placement on a deterministic priority (down > right > up > left), pursuing nest cells; the player wins by destroying them via line-clear or by boxing them in. The placement question is *pursuit-graph denial* — "which specific empty 4-neighbor of this vermin must I deny so that its next step doesn't reach a nest?" Unlike Bloom/Smother/Cancer (which spread on neighborhood predicates), Vermin is a moving entity with intent, so the placement decision is "block this exact cell, not just any neighbor." Different from Fuse because there is no per-cell timer — the vermin is at a *position* that the player must outmaneuver, not a deadline they must meet.

### C13 (Echo-III)
**Cluster:** deduction
**Rationale:** Hidden target revealed only via row-counts and column-counts (two 8-vectors of 0..8). The placement question is nomogram reconstruction — "given the marginals plus the pieces I have left, which cells of the target are forced and where do I place THIS piece to constrain the still-ambiguous cells?" Strongest of the three deduction candidates: C36 Compass leaks only a single scalar per turn (information-poor for trays of 5+), and C33 Echo-II is really a positive-plus-negative-target candidate, not deduction. Echo-III is the cleanest "battleship-style hypothesis pruning on an 8×8" candidate and inherits the puzzleGenerator skeleton.

### C30 (Hollow)
**Cluster:** negative-space
**Rationale:** A TARGET-EMPTY mask declares cells that must be empty AND can never be transiently written to. The placement question augments `canPlace` with a forbidden-mask check, forcing the player to route pieces *around* small disconnected forbidden regions — and the no-transient-write rule excludes solutions a positive-target check would accept (e.g. "place across the hole then clear to evict"). Distinct from Aperture (C41), which adds a magnitude band on a single region; Hollow's many small components carve placement corridors, asking a connectivity-of-empties question that Aperture's threshold-meter does not.

### C49 (Census)
**Cluster:** negative-space
**Rationale:** Win condition is matching a target multiset of 4-connected empty-component sizes (e.g. `{8, 5, 3}`), with a per-step ceiling enforced. The placement question is *empty-region histogram management* — every placement either merges or fragments the empty topology, and the player must steer the histogram. This is genuinely orthogonal to every other negative-space candidate (Hollow asks "which cells stay empty," Vault asks "where does the immortal fill go"); Census asks about *the shape and size distribution of the holes*, which no other candidate touches. Risky to display, but the placement question is unique.

### C43 (Carve)
**Cluster:** inversion
**Rationale:** Board starts (near-)fully filled; pieces erase rather than write; line completion triggers a tide-refill that rebuilds the row. The placement question is *coverage subtraction with refill avoidance* — pick footprints that uncover the right cells without emptying any row enough to trigger refill. Picked over C19 Negative Piece and C46 Shadow Cast (both write bbox-minus-piece — visually similar to each other and risky for tight pieces) and over C38 Echo-IV (next-piece-from-last-placement, which has degenerate-piece risk). Carve's reverse-puzzleGenerator construction is the cleanest constructive proof, and the tide-refill rule is the most defensible dual-purpose mechanic in the inversion cluster.

### C11 (Erasures)
**Cluster:** resource
**Rationale:** A finite-tray puzzle with K erase tokens, each deleting one 4-connected component of player-placed cells. The placement question is *scaffolding vs. permanent* — "do I place this piece adjacent to my existing component (cheap to erase together later, but locks them into one token's destiny) or as an island?" Pure-form resource-management on top of Puzzle. No other survivor is built around a *spend-token* primitive; all the global-meter candidates (C17 Toll, C50 Charge, C57 Reservoir) couple their currency to placement geometry rather than offering a discrete reset action.

### C14 (Decay)
**Cluster:** topology
**Rationale:** Cells carry an integer age; a row clears only when *every* cell in it has age ≥ 3. The placement question is *clear-time scheduling* — complete the line three turns ahead and protect the older cells while stacking the younger ones. Genuinely different from every other topology candidate: C58 Carousel and C04 Tide-I move the *board*, C16 Hot Frame moves a free-fill region, C35 Migrate moves cells, C20 Tide-III makes one column asymmetric. Decay is the only candidate where filled cells *stay put but become more valuable over time*, asking a temporal-not-spatial question.

### C58 (Carousel)
**Cluster:** topology
**Rationale:** After every placement the entire board shifts one column left, with column 0 wrapping to column 7. The placement question is *spatial planning under a moving frame* — "where will this footprint be in 2 placements?" Distinct from the Tide candidates (C04, C20, C21), which are uni-directional and either piece-coupled or one-shot; Carousel is wholly periodic, so the player plans across the wrap-frame rather than racing a deadline. Picked over C16 Hot Frame (which is closer to a free-fill aid than a topology shift) and over C04 Tide-I (whose per-piece arrow risks Pipeline-disease feel from the candidate's own analysis).

### C39 (Heading)
**Cluster:** coupling
**Rationale:** Each placement's orientation index encodes a "heading"; line clears triggered by that placement only erase the half-board the heading points toward. The placement question is *rotation as direction* — orientation now binds both fit AND which half of any cleared row survives. This re-purposes an existing primitive (rotation) into a new decision dimension without introducing a numeric meter. Unique among the coupling candidates: C56 Polarity-I and C17 Toll add numerical ledgers; C50 Charge adds a meter; C23 Cargo couples piece-cell to target-cell. None of those repurpose rotation, the most overloaded primitive available.

### C62 (Tether)
**Cluster:** coupling
**Rationale:** Tray slots are paired; the partner placement must include a cell within Chebyshev distance ≤ 2 of the previous placement's footprint. The placement question is *origin-binds-origin* — "where do I place piece A so that piece B's only legal landing zone covers the row I want to clear?" This is structurally distinct from Heading (which couples orientation→clear-direction) — Tether couples *position→position* across pieces. None of the other coupling candidates ask "the next placement's legal origin space is determined by where I just placed."

## Rejected from Stage 2 first-pass keeps

### C20 (Tide-III): rejected
- Column-e auto-restores-after-clears creates a weaker version of the asymmetric-axis question than C04 / C58 already cover; eaten by C58 Carousel which makes the entire board behave asymmetrically.

### C16 (Hot Frame): rejected
- A 3×3 phantom-fill rectangle that translates each turn is a clever line-completion shortcut, but it shares the "moving free-cells region" structural question with C58 Carousel without the cleaner whole-board drift; eaten by C58.

### C56 (Polarity-I): rejected
- Polarity-weighted row/col sums in [−3, +3] is a numerical ledger that shares the "global accounting per row" structure with C17 Toll and C50 Charge; the polarity sign abstraction is harder to read than tolls or charge, and the new placement question (manage row sums) is weaker than Heading's rotation→clear-direction repurposing; eaten by C39.

### C04 (Tide-I): rejected
- Per-piece directional arrow that shifts the whole board is a near-relative of C58 Carousel but with the candidate's own admission of Pipeline-disease risk (the arrow forces a side-effect the player may not want); C58 ate it.

### C26 (Smother): rejected
- Surround-to-kill spread is a near-twin of C12 Bloom (the candidate's own analysis flags this); the per-ember arrow doesn't introduce a new placement question that Fuse and Vermin don't already cover more cleanly.

### C12 (Bloom): rejected
- Spore-advance-to-next-empty-neighbor is the cluster archetype but asks the same neighbor-priority capping question Smother does; eaten by Fuse (which adds the per-cell deadline) and Vermin (which adds the moving-entity question).

### C01 (Cancer): rejected
- ≥2-infected-neighbor threshold conversion is bursty and tuning-fragile (the candidate's own analysis flags collapsing into "memorize the safe placements"); eaten by Fuse, which keeps the spreading-antagonist feel under a public per-cell schedule.

### C08 (Crust): rejected
- Crust-with-crack-counter introduces cell-with-state plumbing tax (BoardCell becomes a typed object) for a placement question (chip the right crust without re-contaminating neighbors) that overlaps with both Fuse (timed defusal) and Vermin (positional denial); eaten by Fuse.

### C55 (Solvent): rejected
- Per-cell moisture-to-wall ossification is the per-cell analogue of C28 Starve's deterministic shrink and adds heavy plumbing for a question (cover threatened cells before ossification) that overlaps with Fuse's defusal scheduling; eaten by Fuse.

### C64 (Hourglass): rejected
- Countdown-with-flood-fill-on-expiry is a more catastrophic version of Fuse where one mistake walls off half the board permanently; the candidate's own analysis flags "borderline catastrophic"; eaten by Fuse.

### C21 (Tide-II): rejected
- Monotone tide line that floods empty cells in its wake collapses (per the candidate's own risk note) toward Breathe-disease auto-satisfaction when K is small ("you HAVE to fill row R to keep playing"); structurally weaker than Fuse's per-cell deadlines.

### C28 (Starve): rejected
- Deterministic feeder-shrink with arbitrary "lowest-row, lowest-col adjacent" rule asks the same defusal-scheduling question as Fuse but with a single global clock instead of per-cell timers; weaker variant; eaten by Fuse.

### C36 (Compass): rejected
- Single-scalar Chebyshev-to-nearest-target readout per turn is information-poor for tray sizes ≥ 5 (candidate's own analysis); the deduction game is thinner than Echo-III's nomogram; eaten by C13.

### C33 (Echo-II): rejected
- Positive-plus-negative-target with don't-care band is conceptually doubled negative-space, but the visual language ("outline = must fill, hatched = must empty") is dense and the candidate's own analysis flags don't-care-cells becoming vestigial; eaten by C30 Hollow, which has the cleaner load-bearing must-empty rule, and by C49 Census, which has the more distinctive negative-space question.

### C41 (Aperture): rejected
- Aperture region with empty-count cap is a magnitude variant of Hollow's must-empty mask; the cap K is a numeric knob the candidate's own analysis says feels bolted on; eaten by C30.

### C54 (Vault-II): rejected
- Treasure-must-be-cleared + shell-must-be-filled pairs an awkward Chebyshev-radius rule with a clear-then-rebuild dual structure that overlaps with Hollow's negative target and the resource-spend feel of Erasures; eaten by C30 + C11.

### C19 (Negative Piece): rejected
- Bbox-minus-piece writer + piece-cells-erase is a doubled-effect inversion that the candidate's own analysis flags as confusing (fill disappears from earlier-placed pieces) and degenerate for solid pieces; the dual-write structure pushes past the 10th-play teachability bar; eaten by C43 Carve, which has the cleaner subtraction primitive.

### C46 (Shadow Cast): rejected
- Bbox-minus-piece shadow writer collapses for compact pieces (squares, bars are inert) and asks the player to mentally invert every piece on every turn — likely fails the 10th-play test (the candidate flags "brain-teaser puzzle, not casual mode"); eaten by C43.

### C38 (Echo-IV): rejected
- Next piece is the bbox-inversion of the last placement; degenerate echoes (1×4 → empty piece, 2×2 → empty piece) require a fallback that waters down the lens; eaten by C43, which has cleaner inversion semantics.

### C50 (Charge): rejected
- Charge meter gates row clears by piece size (≥4 to clear) introduces a global meter whose dual-purpose (large pieces fill faster but enable clears) is similar to C17 Toll's column credits; both meter mechanics get eaten by C11's discrete spend-token mechanic, which is structurally distinct rather than yet another running-counter.

### C17 (Toll): rejected
- Per-column credit cost with line-clear refunds is the "global resource meter on top of placement" candidate that the candidate's own analysis admits is sibling to Reservoir; eaten by C11 (cleaner discrete-token resource) and C39 (cleaner repurpose of an existing primitive).

### C23 (Cargo): rejected
- Piece-embedded immortal cell that survives clears couples piece-to-target geometrically, but the placement question (origin-aligns-cargo-with-target-cell) overlaps with the vault candidates and is a single-decision-with-extra-constraint rather than a coupling between placements; eaten by C39 + C62, which both ask coupled questions about *placements*, not single-piece geometry.

### C35 (Migrate): rejected
- Per-cell stake-then-drift-down requires a per-cell counter matrix and a collision-resolution rule the candidate flags as nondeterministic-prone; "what does this cell turn into N placements from now" is busy plumbing for a question C14 Decay handles cleaner with just a clear-time predicate; eaten by C14.

## Diversity audit

The 11 survivors ask 11 structurally distinct placement questions:

1. **C47 Fuse** — "Among my N remaining placements, which fuse-defusal schedule clears every fuse before its individual deadline?" (per-cell timer scheduling)
2. **C45 Vermin** — "Which specific empty cell denies the next walk-step of which vermin?" (pursuit-graph denial)
3. **C13 Echo-III** — "Given row/col marginals and remaining pieces, which target cells are forced and where does this piece resolve the most ambiguity?" (nomogram deduction)
4. **C30 Hollow** — "Which footprint cells fall on the must-empty mask, AND which placement order keeps me from boxing in a forbidden cell?" (forbidden-mask routing)
5. **C49 Census** — "Does this placement merge or fragment empty regions toward the target multiset, without crossing the ceiling?" (empty-region histogram management)
6. **C43 Carve** — "Which filled cells should I leave intact, and does this carve risk emptying a row enough to trigger refill?" (subtraction with reverse-tide hazard)
7. **C11 Erasures** — "Should this piece extend my existing component (cheap collective erase) or be an island (independent erase target)?" (token-spend topology)
8. **C14 Decay** — "What is the minimum-age cell in the line I'm about to complete, and can I keep this row standing for the maturation window?" (clear-time temporal scheduling)
9. **C58 Carousel** — "Where will this footprint be in 2 placements after the column-shift schedule?" (planning under cyclic spatial drift)
10. **C39 Heading** — "Of the orientations that geometrically fit, which heading erases the half I want?" (rotation as clear-direction)
11. **C62 Tether** — "Where do I place piece A so that piece B's tether-window covers the row I want to clear?" (origin-binds-origin coupling)

No two questions collide: timer-scheduling (Fuse) ≠ pursuit-denial (Vermin); nomogram (Echo-III) is the only deduction candidate; must-empty-mask (Hollow) ≠ histogram (Census) ≠ subtraction (Carve); token-spend (Erasures) ≠ all running-meter alternatives; temporal-aging (Decay) ≠ spatial-drift (Carousel); rotation-coupling (Heading) ≠ position-coupling (Tether). Coverage spans antagonist-defeat (Fuse, Vermin), deduction (Echo-III), negative-space targets (Hollow, Census), inversion (Carve), resource (Erasures), topology (Decay, Carousel), and coupling (Heading, Tether) — eight distinct lenses among 11 candidates, no two within the same lens asking substantively the same question.
