# Stage 2 verdicts — slice C (C33..C48)

## C33 (Echo-II): KEEP
**Reason (1–2 sentences, mechanics-speak):** Two independent target sets (positive must-fill, negative must-empty) with don't-care cells routed through both create real eviction-via-clear ordering decisions; an "oops, I dropped into NEGATIVE" cell can be evicted only by completing a row/col through it, which costs tray budget that must also fund POSITIVE — a true ordering puzzle distinct from Puzzle's exact-match. Borderline on Breathe (their own screen flags it), but the don't-care band keeps the negative target separable.
**Anti-pattern that bit (if rejected):** none

## C34 (Tide-IV): REJECT
**Reason (1–2 sentences, mechanics-speak):** Three target variants on a 4-placement clock collapses to "pick the variant whose distance from start is smallest given the tray length, plan once, place to it" — the clock is a counter not a true antagonist, and the variant choice is a one-time optimization made at turn zero rather than a recurring placement question. Risk note in own screen ("always pick whichever is closest to the start board") signals Pipeline-shaped: choice is decorative once dominant strategy emerges.
**Anti-pattern that bit (if rejected):** Pipeline

## C35 (Migrate): KEEP
**Reason (1–2 sentences, mechanics-speak):** Per-cell stake countdown means every existing cell's future position is part of every placement decision, and the player chooses the migration receiver pattern by leaving (or not leaving) the cell directly below filled-and-aging cells empty. Order materially matters (placement-turn determines stake age), and migration is genuinely defeatable by completing a row before drift carries it out of position.
**Anti-pattern that bit (if rejected):** none

## C36 (Compass): KEEP
**Reason (1–2 sentences, mechanics-speak):** A scalar Chebyshev-distance oracle from a single anchor turns each placement into a deduction tool — silence (no readout drop) confirms emptiness, drops localize the frontier; the hidden info is recoverable via consistent feedback so it's not Scar disease. The dual-purpose primitive (filling a cell as both progress and probe) is genuine. Borderline information-density (their own risk note: scalar may be too thin for tray ≥ 5).
**Anti-pattern that bit (if rejected):** none

## C37 (Lookahead): REJECT
**Reason (1–2 sentences, mechanics-speak):** Strict addition: shows the next tray and gives one swap per cycle. No antagonist on the board to defeat; the "buffer swap" is a tap-to-use verb that doesn't couple to placement geometry, and the mode is Classic-with-extra-info. The 10th-play question is "the same Classic question with more lookahead context" — refines existing decisions, doesn't introduce a new one.
**Anti-pattern that bit (if rejected):** Pipeline (in inverse — pure additive feature creep with no on-board antagonist)

## C38 (Echo-IV): KEEP
**Reason (1–2 sentences, mechanics-speak):** Each placement generates the next piece via inverted bounding-rect, so the placement decision is dual-coded (board impact now + piece quality next), with order trivially material since each move *creates* the next move's tool. Genuine antagonist (your past placement) and dual-purpose primitive (the bounding box) — internal piece holes become future solid cells, making negative-space-within-piece the central decision. Echo-to-empty fallback is a real concern but addressable.
**Anti-pattern that bit (if rejected):** none

## C39 (Heading): KEEP
**Reason (1–2 sentences, mechanics-speak):** Coupling clear-direction to orientation creates a fit-vs-clear-direction tradeoff that orientation alone never had in Classic; the half-clear residue is a defeatable on-board antagonist (a plateau anchored to the wrong edge) and the player chooses orientation knowing it binds both footprint and erasure direction. Symmetric pieces are a real edge case but the catalog has plenty of asymmetric shapes.
**Anti-pattern that bit (if rejected):** none

## C40 (Toroidal Pieces): REJECT
**Reason (1–2 sentences, mechanics-speak):** Wrap-around is a permanent topology change, not an antagonist — there is nothing on the board the player must actively defeat, the wrap is just an expanded placement set. The 10th-play question ("can this piece wrap usefully?") is a richer placement scan but the same *kind* of question Classic asks; no new dual-purpose primitive (wrap is wanted when convenient, no symmetric "feared" face beyond ordinary placement risk).
**Anti-pattern that bit (if rejected):** none (fails antagonist + dual-purpose tests rather than collapsing to a named anti-pattern)

## C41 (Aperture): KEEP
**Reason (1–2 sentences, mechanics-speak):** A region the player must keep partially-but-not-fully open at every intermediate step is a genuine on-board antagonist (the aperture closes as you fill around it), and order materially changes legality (same piece legal at empty=5, illegal at empty=4). Dual-purpose: filling APERTURE cells advances win and risks crossing the cap. Cap K calibration is a real risk per their own screen but the rule has structural integrity.
**Anti-pattern that bit (if rejected):** none

## C42 (Pulse): REJECT
**Reason (1–2 sentences, mechanics-speak):** Alternating row-only/column-only clears is a deterministic schedule that subtracts a Classic option (either-axis clear) and adds only "choose which turn to complete a line on" — but the player can't choose turn parity independently of placement (placement IS the turn-advancer), so the only lever is "complete now or stall a turn", which feels thin and reads as a flavor-of-Classic. Their own screen flags it as borderline Pipeline; I'd call it a confirmed lite-Pipeline.
**Anti-pattern that bit (if rejected):** Pipeline

## C43 (Carve): KEEP
**Reason (1–2 sentences, mechanics-speak):** Inverting placement to subtraction with tide-refill on full-line creates a genuinely new placement question ("which filled cells do I keep?") and the tide is a defeatable antagonist (predictable, triggered by player action). Dual-purpose footprint coverage (more cells carved per move = more risk of triggering tide) is real. The risk that tide rarely fires on 8×8 is generator-tunable, not a structural flaw.
**Anti-pattern that bit (if rejected):** none

## C44 (Vault-I): REJECT
**Reason (1–2 sentences, mechanics-speak):** Win condition is "vaults filled, all other cells empty" with vaults skipping clears — but this is structurally Quarantine-with-positive-targets, and the placement question ("cover a vault, bury rest in a clear lane") is identical in shape to existing puzzle modes plus a small twist. The "double duty" framing is real but the new question collapses to "find a piece-orientation that puts one cell on the vault and the other cells in a row/col you'll complete" — Mirror-shaped: the constraint is a function of the existing placement decision (every footprint already had to choose its non-target cells carefully).
**Anti-pattern that bit (if rejected):** Mirror

## C45 (Vermin): KEEP
**Reason (1–2 sentences, mechanics-speak):** Moving entities with deterministic public movement priority make empty-cell shape into the antagonist's playing field, with placement order genuinely changing vermin trajectories (same final fill set, different vermin states). The dual-purpose primitive (empty cells around a vermin = both useful workspace and pursuit lane) is sharp, and "boxing in" / "clearing through" are two distinct defeat strategies. High implementation cost but mechanically clean.
**Anti-pattern that bit (if rejected):** none

## C46 (Shadow Cast): KEEP
**Reason (1–2 sentences, mechanics-speak):** Writing the bounding-box-minus-piece inverts the relationship between piece geometry and board geometry — high-hole pieces (L, T, U) become powerful writers, compact pieces (square, bar) become inert. The mental inversion is a genuinely new placement question Classic never asks, the bounding-box-fit-vs-coverage is a real dual-purpose primitive, and order matters because shadow writes constrain later piece origins. Risk: tight-piece exclusion needed; brain-teaser flavor noted.
**Anti-pattern that bit (if rejected):** none

## C47 (Fuse): KEEP
**Reason (1–2 sentences, mechanics-speak):** Pre-fill cells with countdowns turn each placement into dual-coded scheduling (target progress + defusal-before-detonation), with order strictly material because every placement ticks every fuse. The fuse is a defeatable on-board antagonist (clear its row/col before its counter hits 0), and the explosion-into-walls outcome is a learnable consequence the player can plan around. The dual-purpose mechanic — placement itself is required and feared — is the cleanest framing in this slice.
**Anti-pattern that bit (if rejected):** none

## C48 (Charges): REJECT
**Reason (1–2 sentences, mechanics-speak):** Combines an endless-mode creep walker (deterministic, fine) with a charge-and-discharge resource where 3 charges nuke a 3×3 region — the discharge is a tap-to-use verb decoupled from placement geometry, and a 3×3 panic-button (14% of board) reduces creep to an absorbable hazard rather than a defeatable one. The 10th-play question collapses to "spend charges when stuck," which is a meta-resource decision, not a placement decision. Their own risk note flags this exact concern.
**Anti-pattern that bit (if rejected):** Pipeline (charge-spend is agency-shaped resource management bolted alongside, not coupled into, placement)
