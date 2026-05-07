# Stage 2 verdicts — slice D (C49..C64)

## C49 (Census): KEEP
**Reason (1–2 sentences, mechanics-speak):** Per-placement empty-component histogram with both target and ceiling multisets is a genuinely new dimension — placements are evaluated on how they merge/split empty regions, which Classic, Puzzle, and Quarantine never ask. Line clears act as a high-energy reshape of the histogram (merging previously-isolated empty regions), making the central primitive simultaneously wanted (toward target) and feared (may overshoot ceiling).
**Anti-pattern that bit (if rejected):** none

## C50 (Charge): KEEP
**Reason (1–2 sentences, mechanics-speak):** Cumulative charge meter couples piece-size choice to clear availability across placements — a real banking/spending decision that depends on history, not on any single placement's geometry. Large pieces are dual-purpose (raise meter to enable clears but shrink working space), and the order question (dump pentomino early to bank charge vs. late to clear immediately) is materially different from Classic.
**Anti-pattern that bit (if rejected):** none

## C51 (Magnet): REJECT
**Reason (1–2 sentences, mechanics-speak):** Polarity rule filters legal (origin, rotation) pairs as a function of the existing origin/rotation decision; it constrains but adds no new dimension to the placement question beyond "of the geometrically-legal placements, which are also polarity-legal." The candidate even concedes "polarity restrictions don't depend on board state," so order coupling is incidental (only via pre-fill clearing) — the rule lives entirely on top of the existing decision without forcing a new one.
**Anti-pattern that bit (if rejected):** Mirror

## C52 (Diagonal Cull): REJECT
**Reason (1–2 sentences, mechanics-speak):** Replaces the clear axis but pieces remain axis-aligned, so the candidate's own risk note flags that diagonal completions may be structurally so rare the clear-predicate effectively never fires — collapsing the mode to "fill the board until lose" with a relabeled win condition that does no work during play. The dual-purpose claim is weak (a cell on multiple diagonals is just inefficient, not wanted-and-feared), and the new placement question repeats identically each turn without escalation.
**Anti-pattern that bit (if rejected):** Breathe

## C53 (Companion): REJECT
**Reason (1–2 sentences, mechanics-speak):** The companion-adjacency rule duplicates Monolith's "must touch existing component" structure with the only novelty being the tray-refill rhythm; the new placement question (where to plant the anchor) is the same question Monolith already asks. Order matters only through tray reordering, which is a difficulty toggle rather than a core decision, and the constraint on slots 2/3 is a function of slot 1's origin without adding a second independent decision dimension.
**Anti-pattern that bit (if rejected):** Mirror

## C54 (Vault-II): KEEP
**Reason (1–2 sentences, mechanics-speak):** Treasure-must-end-empty plus shell-must-end-filled plus no-go zone forces a real sequencing decision — clear treasure early (clean slate but exhausts shell-build budget) vs. build shell early (then clear damages it). Line clears are dual-purpose in the strongest sense (mandatory to remove treasure, hostile to the shell the player just built), and the dual positive/negative win predicate is genuinely new.
**Anti-pattern that bit (if rejected):** none

## C55 (Solvent): KEEP
**Reason (1–2 sentences, mechanics-speak):** Per-cell moisture counter creates a deterministic time-pressure dimension absent from every other mode — empty cells are not interchangeable because each carries a countdown, and the placement question becomes "which threatened cell can I cover, given which piece fits where." Order is materially coupled across pieces (the piece that fits cluster A may not fit B, and only one ossifies this turn).
**Anti-pattern that bit (if rejected):** none

## C56 (Polarity-I): KEEP
**Reason (1–2 sentences, mechanics-speak):** Per-row/col running signed sum with [-3, +3] caps creates a genuine ledger that placements consume across turns — placing the +piece first frees the -piece to balance the row, while the reverse order locks the row out. Sign accumulation is dual-purpose (necessary to fill rows toward clears but forecloses future same-sign placements), and the rule actively rejects geometrically-legal placements during play rather than auto-satisfying.
**Anti-pattern that bit (if rejected):** none

## C57 (Reservoir): REJECT
**Reason (1–2 sentences, mechanics-speak):** Rotation-as-currency grafts a budget tax onto Puzzle without changing the per-placement geometry question — the candidate's own risk note admits the budget may never bite if pieces spawn in good orientations, in which case the rule auto-satisfies. The "spend rotation, refund on clear" loop is a tap-to-use verb attached to existing puzzle decisions rather than a new placement question that materially couples piece choice and origin.
**Anti-pattern that bit (if rejected):** Breathe

## C58 (Carousel): KEEP
**Reason (1–2 sentences, mechanics-speak):** Mandatory cyclic column shift after every placement forces the player to plan in a future-shifted frame — origin choice now binds where the footprint will sit two placements from now, and the interlock between piece A and piece B depends on exactly the count of placements between them. Negative space matters differently at wrap edges vs. interior, and order materially changes which laterally-offset configurations are reachable.
**Anti-pattern that bit (if rejected):** none

## C59 (Flood): REJECT
**Reason (1–2 sentences, mechanics-speak):** Target specifies cells that must end EMPTY (not flooded), which means flooding is uniformly bad and the player's best strategy collapses to "avoid completing lines" — structurally identical to Anti-Clear plus Quarantine walls, and the candidate's own risk note flags the Quarantine isomorphism. The dual-purpose framing of "want to flood" only works if the target requires flooded rows, which the spec does not.
**Anti-pattern that bit (if rejected):** Breathe

## C60 (Anti-Clear): REJECT
**Reason (1–2 sentences, mechanics-speak):** "No row/col may complete" is structurally the same shape as Breathe's "no full 2×2" — the candidate explicitly flags this and the generator filtering on reachable thresholds re-introduces the Breathe trap (the rule auto-satisfies via tray sizing). Risk of dominant-strategy collapse to "fill diagonally outward, never approach 7-in-a-row" is concrete; the rule does not differentiate placement decisions enough to survive the 10th-play test.
**Anti-pattern that bit (if rejected):** Breathe

## C61 (Bash): REJECT
**Reason (1–2 sentences, mechanics-speak):** Bash is a tap-to-use verb between placements — the player spends a token to remove a wall, decoupled from the per-placement question of where the next piece lands. Outside the narrow case of cross-seam pieces, bashes are "I want this region merged, tap" with no coupling to the in-tray placement decision; resource budget grafted onto Quarantine without forcing the spend to interlock with placement geometry.
**Anti-pattern that bit (if rejected):** Pipeline

## C62 (Tether): KEEP
**Reason (1–2 sentences, mechanics-speak):** Paired-slot Chebyshev binding makes the origin of slot 1 determine the legal-origin set for slot 2, which forces a real planning decision — "where do I plant A so B can reach the row I want to clear" — and the free slot 3 acts as a planned bailout, so the question of WHEN to spend the free slot is itself ordered agency. New constraint genuinely couples cross-piece origins without writing extra cells.
**Anti-pattern that bit (if rejected):** none

## C63 (Slipstream): REJECT
**Reason (1–2 sentences, mechanics-speak):** The induced row-shifts above and below are a deterministic function of placement origin and footprint extent — the side-effect cells written by the shift are fully determined by the placement decision, which is the textbook shape of Mirror disease (extra writes as a function of an existing decision, no second independent choice). Cognitive burden is also extreme (mentally simulate two shifts plus a wrap-collision check per placement) and overlaps with Gravity/Drop's physics-mode feel.
**Anti-pattern that bit (if rejected):** Mirror

## C64 (Hourglass): KEEP
**Reason (1–2 sentences, mechanics-speak):** Countdown cells with flood-fill on expiry create two distinct strategic modes per hourglass (kill via line-clear vs. shrink the empty component containing it), and connected-empty-region planning is a primitive no other mode tracks. Order matters because every placement decrements every timer simultaneously, so the player must always be working the soonest-expiring hourglass, while the dual-purpose tension on empty regions (wanted for placement freedom, feared near hourglasses) is genuine.
**Anti-pattern that bit (if rejected):** none
