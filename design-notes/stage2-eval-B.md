# Stage 2 verdicts — slice B (C17..C32)

## C17 (Toll): KEEP
**Reason (1–2 sentences, mechanics-speak):** Per-column toll cost couples placement choice to a global credit budget that line-clears refund column-locally; on play 10 the question "which clear refunds enough credits to fund the placement I actually want next" is genuinely new, and the path-dependent budget makes order matter materially. Dual-purpose primitive (clears) is real — wanted for puzzle progress and refunds, feared because the wrong row refunds too little.
**Anti-pattern that bit (if rejected):** none

## C18 (Rotations): REJECT
**Reason (1–2 sentences, mechanics-speak):** The rotation budget removes free-rotates from Classic and replaces them with a single scalar to manage; on the 10th play the question reduces to "is this rotation worth one of K tokens" — a one-dimensional resource gate over a decision the player already faces. The mode does not introduce a new placement question so much as dampen an existing one, and the candidate's own screen flags it as borderline Pipeline; the "meta-resource decision" defense is thin given there is no antagonist on the board, only a depleting counter.
**Anti-pattern that bit (if rejected):** Pipeline

## C19 (Negative Piece): KEEP
**Reason (1–2 sentences, mechanics-speak):** Each placement atomically erases (footprint cells) and writes (bbox-minus-footprint), so on play 10 every piece poses a real coordinated subtract-and-add question that Classic never asks. Order matters because later placements partially undo earlier ones via overlap, and the dual-purpose primitive (the footprint) is simultaneously wanted as eraser and feared as bbox-writer.
**Anti-pattern that bit (if rejected):** none

## C20 (Tide-III): KEEP
**Reason (1–2 sentences, mechanics-speak):** Column e auto-restores after every clear, so on play 10 each placement asks "do I straddle column e, and is this the placement I sequence after my last clear so it survives?" — a sequencing question Classic doesn't have. Order materially matters (fill-then-clear wastes column-e cells; clear-then-fill keeps them), and clears are the dual-purpose primitive — wanted for the 7 normal columns, feared in column e.
**Anti-pattern that bit (if rejected):** none

## C21 (Tide-II): KEEP
**Reason (1–2 sentences, mechanics-speak):** A monotonic tide row converts unprotected empties into permanent walls, so each placement asks "which next-to-flood row cells am I claiming, and do I burn this piece on tide protection or on a clear?" The placement footprint is genuinely dual — protects against the tide but advances the tide counter — and order changes which row each piece can defend.
**Anti-pattern that bit (if rejected):** none

## C22 (Sonar): REJECT
**Reason (1–2 sentences, mechanics-speak):** Hidden-target with overlap-count feedback is in principle deducible, but the candidate itself acknowledges the mode is intractable without a deduction helper and collapses to "follow the helper" with one. With a strong helper, agency disappears (Pipeline-shaped); without it, early uninformed placements deal punishment the player cannot have foreseen from any rule (Scar-shaped, since the target is hidden RNG to the player). The 10th-play question is real but the mode does not survive its own usability constraint.
**Anti-pattern that bit (if rejected):** Scar (sliding to Pipeline once a helper is added)

## C23 (Cargo): KEEP
**Reason (1–2 sentences, mechanics-speak):** The cargo cell inside each piece must land on a target position while the rest of the footprint must be clearable, so on play 10 every cargo piece poses two coupled placement questions (cargo-position fit AND clearable body) that Classic doesn't ask. Order matters because delivered cargo cells become permanent obstacles for later piece geometry, and clears are dual — wanted to delete piece bodies, feared because they don't remove already-delivered cargo and can erode pre-fill near future targets.
**Anti-pattern that bit (if rejected):** none

## C24 (Pulses): REJECT
**Reason (1–2 sentences, mechanics-speak):** Pulse fires deterministically when heat crosses H and erases the bottom row — but the candidate's own risk note flags the dominant degenerate strategy (stuff the bottom row with garbage and exploit the pulse as a free clear), inverting the antagonist into a benefit. The "dual-purpose primitive" is placement size, but heat is a one-dimensional meter the player navigates by adjusting which size piece they pick — closer to a Tetris hold than to a new placement question. Vent tokens are a transactional button rather than a placement-coupled spend.
**Anti-pattern that bit (if rejected):** Pipeline (the antagonist is absorbable, not defeatable; pulse becomes a managed resource instead of an enemy)

## C25 (Echo-I): REJECT
**Reason (1–2 sentences, mechanics-speak):** The "shadow lands on next-empty cell of column-right-of-bbox with wraparound" rule is intricate and arbitrary in a way the candidate itself flags — the geometric reasoning for the player is opaque, so the new placement question collapses to "place and observe where the shadow shows up" rather than a deducible system. Even granting the order-mattering aspect, the rule is too contingent to teach by play; the shadow position is a black-box function of prior state and the player learns it only by trial and error, sliding into Scar territory in practice even though the rule is technically deterministic.
**Anti-pattern that bit (if rejected):** Scar (functionally — non-learnable in 10 plays despite formal determinism)

## C26 (Smother): KEEP
**Reason (1–2 sentences, mechanics-speak):** Embers spread one-per-placement along a deterministic, telegraphed direction (with the arrow-render mitigation), so on play 10 the question "does this placement smother before the spread, or trigger one I can't catch up to next turn" is genuinely new. The dual-purpose primitive (surrounding) is wanted to smother and feared because partial surrounds give the ember free spread sides; order changes the entire ember genealogy.
**Anti-pattern that bit (if rejected):** none

## C27 (Quartet): REJECT
**Reason (1–2 sentences, mechanics-speak):** Restricting clears to the bbox of the trio's placements is a coupling rule, but the bbox is order-independent geometry — only "which piece is third" affects which rows/cols clear, and that's a single decision dressed up as three. The "shape your bbox" question is largely a reframing of "where did my last placement land," and most of the trio's planning collapses to standard placement plus a constraint that auto-resolves once the third piece is committed.
**Anti-pattern that bit (if rejected):** Mirror (the bbox-clear rule is essentially a function of the third placement plus already-fixed first two; new constraint, same decision)

## C28 (Starve): KEEP
**Reason (1–2 sentences, mechanics-speak):** Each placement ticks a deterministic, visible feeder-shrink schedule, so on play 10 every placement asks "is the cell the feeder is about to lose this turn one I needed to place into, and should I place inside or outside the feeder this tick?" Order materially matters because the tray is finite and each tick irreversibly consumes a feeder cell whether the placement touched it or not; the spent tray piece is the dual-purpose primitive (wanted to fill, feared because it ticks the feeder away).
**Anti-pattern that bit (if rejected):** none

## C29 (Polarity-II): REJECT
**Reason (1–2 sentences, mechanics-speak):** Hidden polarity is binary information per piece, deducible by probe — but the candidate itself flags that the generator can rarely guarantee a "safe probe always exists without losing winnability," and the proposed escape hatch (preview one polarity per puzzle) admits the structural problem. Without that guarantee, late-discovered minus pieces strand the player in unrecoverable boards from information they could not have obtained, which is Scar in deduction-mode clothing. Echo/Sonar-class hidden-info modes need probes that demonstrably narrow the space, and this one cannot prove they do.
**Anti-pattern that bit (if rejected):** Scar (hidden polarity that can punish unrecoverably without a learnable probe)

## C30 (Hollow): KEEP
**Reason (1–2 sentences, mechanics-speak):** The no-transient-write constraint genuinely excludes solutions the bare positive target accepts, so on play 10 every piece near a TARGET-EMPTY cluster poses "did I order the large pieces before the small ones boxed me out" — an order question Classic and Puzzle don't ask. Line-clears are the dual-purpose primitive — wanted for fill, feared because they wipe non-wall cells the player needed near forbidden cells; the candidate's risk that it isomorphs to Quarantine-with-walls is mitigated because clears interact with TARGET-EMPTY differently from walls.
**Anti-pattern that bit (if rejected):** none

## C31 (Brail): REJECT
**Reason (1–2 sentences, mechanics-speak):** Coarse row/col bucket clues over a hidden target — like Sonar this is a deduction game where the candidate's own quality filter cannot enforce uniqueness ("relax to all consistent boards converge"), meaning the player can find the wrong right answer. Once you weaken the filter the mode either degenerates to Puzzle (clues over-determine the target) or punishes deduction with ambiguous targets the player cannot distinguish from rules — sliding into Scar.
**Anti-pattern that bit (if rejected):** Scar (non-unique targets demoralise without a learnable rule for picking among them)

## C32 (Skips): REJECT
**Reason (1–2 sentences, mechanics-speak):** Skip tokens are a transactional button that removes a tray slot — the candidate is correct that this is borderline Pipeline, and the defense ("adds a tray-curation decision") is exactly the kind of meter-management that doesn't constitute a new placement question. There is no antagonist on the board; the only adversary is RNG tray composition, and the answer to "should I skip" is a one-dimensional cost-benefit on token spend rather than a coupled placement decision.
**Anti-pattern that bit (if rejected):** Pipeline (and no antagonist present — fails the antagonist test outright)
