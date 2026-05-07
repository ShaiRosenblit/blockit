# Stage 2 verdicts — slice A (C01..C16)

## C01 (Cancer): KEEP
**Reason (1–2 sentences, mechanics-speak):** Threshold-neighbor infection growth is a deterministic public function of the board, so each placement asks the new question "does my footprint create or remove an empty cell with ≥2 infected 4-neighbors, and does any clear I trigger reshape the danger surface?" Antagonist (infection), dual-purpose mechanic (clears wholesale-erase infection but reshape the propagation surface), order strongly matters because propagation runs once per placement on the pre-pass snapshot.
**Anti-pattern that bit (if rejected):** none

## C02 (Cipher): REJECT
**Reason (1–2 sentences, mechanics-speak):** The "static-but-hidden orientation revealed at drag-start" reframe gives the player no signal between probes — each piece's assigned rotation is an independent draw they cannot deduce from prior placements, and the lock is a single one-shot. Spending a placement to discover a rotation isn't a learnable rule; it's a guess that's revealed too late to replan without burning the tray slot.
**Anti-pattern that bit (if rejected):** Scar

## C03 (Yoke): REJECT
**Reason (1–2 sentences, mechanics-speak):** Rotating slot 1 *is* rotating slot 2 — there is exactly one rotation decision and it writes two pieces' orientations as a function of itself. The "find shared k" search is a smaller orientation space, not a new question; origin choice for each piece is unchanged from Classic.
**Anti-pattern that bit (if rejected):** Mirror

## C04 (Tide-I): KEEP
**Reason (1–2 sentences, mechanics-speak):** Each tray piece carries a fixed shift arrow, so the placement decision compounds "where does this footprint fit" with "which whole-board translation am I committing to next" — a genuinely new placement question that order materially binds (← then → cancels only if no relevant cells were evicted in between). The shift is deterministic, visible on the piece, and the player chooses arrow-by-arrow which translation to spend now.
**Anti-pattern that bit (if rejected):** none

## C05 (Ledger): REJECT
**Reason (1–2 sentences, mechanics-speak):** The vent-gated column-debt counters layer a new scoring axis but the per-placement question collapses to "fill columns whose top cell is empty," which is a single-axis check that a Classic-good player would already do for line-completion reasons. The "clear destroys contributions" interaction adds friction but doesn't generate a new strategic question — the rule reads as scoring-with-extra-steps that an optimal Classic-style player solves incidentally.
**Anti-pattern that bit (if rejected):** Breathe

## C06 (Tide-V): REJECT
**Reason (1–2 sentences, mechanics-speak):** Slot-age evaporation pressures the player into "always place oldest," collapsing the slot-choice agency exactly the way Pipeline does, just with a deterministic timer instead of round-robin. If the timer is loosened enough that aging doesn't dominate, the rule is vestigial and unused on most turns; the safe band where age genuinely competes with fit is razor-thin.
**Anti-pattern that bit (if rejected):** Pipeline

## C07 (Ferris): REJECT
**Reason (1–2 sentences, mechanics-speak):** The row-slab compaction is geometrically equivalent to existing Gravity/Drop semantics and the column case adds a coordinate-transform tracking burden without a fresh placement question — the player still places to complete lines; clears just relocate the leftover geometry. The new "where will partials land after clear" is bookkeeping, not a new placement decision the player faces *before* committing.
**Anti-pattern that bit (if rejected):** Mirror

## C08 (Crust): KEEP
**Reason (1–2 sentences, mechanics-speak):** Crust cells with crack counters introduce a new placement question: "of the legal placements that include a live crust in a clear, which minimizes the empty 4-neighbors of the *other* live crusts that will regrow on the next clear?" Adjacency is the dual-purpose primitive (wanted for chipping, feared for regrowth surface), order materially matters (chip-now-vs-later changes regrowth interactions across consecutive clears), and regrowth is a deterministic function of the visible halo.
**Anti-pattern that bit (if rejected):** none

## C09 (Pre-clears): REJECT
**Reason (1–2 sentences, mechanics-speak):** The pre-clear token is a transactional "tap a row to clear it" verb decoupled from placement — the spend doesn't couple to where pieces went, only to which rows have pre-fill the player wants gone. The dual-purpose ("clears erase your scaffolding too") is real but thin: the optimal play is "clear lines you have no plans for," which is a separate planning task running parallel to placement, not a coupled placement question.
**Anti-pattern that bit (if rejected):** Pipeline

## C10 (Diagonal Lines): REJECT
**Reason (1–2 sentences, mechanics-speak):** This is an axis-relabeling inversion: the placement primitive (rectilinear footprint) is unchanged, the clear primitive (line) is unchanged, only which 8-cell lines count for clearing rotates. Either clears become so rare with rectilinear pieces that the mode plays as Classic-without-clears (board fills, you lose) or it plays as Classic on a rotated grid asking the same questions in different coordinates.
**Anti-pattern that bit (if rejected):** Mirror

## C11 (Erasures): KEEP
**Reason (1–2 sentences, mechanics-speak):** Erase tokens delete connected components, which makes component-shape an explicit placement decision: "do I bridge this piece into the existing blob (cheap to erase as one unit, but commits us to a single-token destiny) or place it as an island (independent erase target, but wastes the adjacency that would have completed a clear)?" Order materially matters because every erase reshuffles legal placements for every later piece, and the spend genuinely couples to placement geometry rather than being a free undo.
**Anti-pattern that bit (if rejected):** none

## C12 (Bloom): KEEP
**Reason (1–2 sentences, mechanics-speak):** Spore advancement on a fully visible deterministic schedule (lowest-index empty 4-neighbor) gives three distinct placement responses — overwrite the spore, cap its next-cell, or complete a line containing it — and the player must pick among them every turn against the board's evolving geometry. The dual-purpose primitive is the line clear (wanted to wipe spores, feared because spores count as filled and can complete lines you didn't plan to clear), and the scheduled growth target is readable off the screen so it's a real rule, not RNG.
**Anti-pattern that bit (if rejected):** none

## C13 (Echo-III): KEEP
**Reason (1–2 sentences, mechanics-speak):** Hidden target encoded as row/col marginals plus a per-placement delta indicator forms a well-posed deduction game (uniqueness filter ensures the marginals + tray determine the target), so each placement is both progress and a probe whose feedback (over-count by 2 in row 4) is consistent and learnable across the round. The dual-purpose primitive is the placement itself — wanted for information, feared because it spends a finite tray slot on a hypothesis.
**Anti-pattern that bit (if rejected):** none

## C14 (Decay): KEEP
**Reason (1–2 sentences, mechanics-speak):** The age ≥ 3 clear predicate creates a new placement question Classic never asks: "what is the minimum-age cell in the line I'm about to complete, and should I therefore place the *trigger* cells late and the *to-be-cleared* cells early?" Cell-age tint makes the rule fully readable, order materially matters (swap two placements and which cells are age-3 by turn T changes), and the dual-purpose primitive is the cell itself (you want it old to clear, but old cells eat board space for ≥3 turns).
**Anti-pattern that bit (if rejected):** none

## C15 (Stamps): REJECT
**Reason (1–2 sentences, mechanics-speak):** Stamped cells are mechanically identical to Quarantine walls — once stamped, they are permanent obstacles for placement and clear-immune, so the placement question collapses to "Quarantine but you partition the board mid-play." The "when to stamp" timing decision exists but it's narrow: stamp as soon as a target stamp position is filled, before any clear that touches it; the optimal heuristic is mechanical and doesn't generate fresh questions on the 10th attempt.
**Anti-pattern that bit (if rejected):** Mirror

## C16 (Hot Frame): KEEP
**Reason (1–2 sentences, mechanics-speak):** A 3×3 phantom-fill frame on a deterministic schedule asks the new placement question "which line completions am I queuing for the frame to trigger N turns from now, and which rows must I avoid bringing to 5/8 cells before the frame crosses them?" The dual-purpose primitive is the frame's phantom-fill (wanted to complete a row with only 5 placed cells, feared because it auto-completes any 5-cell row it slides over), and the schedule is fully visible so the player can plan multiple turns ahead.
**Anti-pattern that bit (if rejected):** none
