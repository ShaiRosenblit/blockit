# Stage 4 — Steelman + critique gate

For each survivor: strongest case for, strongest case against, defense. Cope-detector: "the player will get used to it" / "this won't happen often" / "we can tune it" → KILL.

---

## F1 — L1-4 Grain

**For**: Axis-asymmetric clears reframe the most fundamental Blockit primitive. Per move, the player asks "row vs col" with materially different costs (row-clear normal; col-clear seeds a row of blockers in a *random other row*). Strong dual-purpose: column completion is BOTH wanted (line-clear deletes pre-fill) and feared (seeds blockers).

**Against**: The "seed blockers in a random row" is **Scar-adjacent** — the seeding location is random, so the player can't fully direct the consequence. Even if the *axis* choice is the player's, the *blocker location* is random, which violates the "directable" criterion. Worse: the design might collapse into "always row-clear, never col-clear" once players learn col is strictly worse, killing the dual-purpose.

**Defense**: Could be deterministic (seeded by RNG with seed determined by puzzle), but that's still uncontrollable from the player's POV. Generator could *force* col-clears as the only path to the target (so player MUST sometimes pay the col-clear cost) — but that's railroading. The design needs the col-clear to be desirable in *some* situations, and the random seed makes that situational utility unstable. **KILL** — mild Scar-disease + collapse-to-row-only failure mode. Cope-flavored defense.

## F2 — L1-6 Lifeline

**For**: Refill-on-empty-tray turns the standard "tray refills after batch of 3" mechanic into a dual-purpose primitive: the player WANTS to clear (deletes pre-fill, advances target) AND must time the clear with the empty-tray boundary to get refilled (else stuck). The timing-coupling is novel and creates per-move subgoals: "is this the right move number to trigger?"

**Against**: This is just *Classic batches with a tightened win-condition*. In Classic, tray refills after 3 placements regardless of clears. Lifeline says "tray refills only when an empty-tray placement triggers a clear". Failure mode: if the third placement of the batch doesn't naturally complete a line, player is permanently stuck (no clears = no refill = no progress). Generator must guarantee the third placement always *can* complete a line — but that's a giant constraint and means the puzzle has a unique solution per batch, which is **Pipeline-disease** (subtraction without compensation: the third placement is forced, no decision).

**Defense**: Generator could provide multiple tray orderings or rotations so the third placement has freedom in *which* line to complete. But if there's always exactly one line completable per batch-end, the puzzle is just a sequence of forced moves with reorder-permutations — the decision is "permute the 3 pieces in this batch", which is bounded and shrinks each batch to "find the one valid permutation". 10th-play question converges to "find the perm". **KILL** — Pipeline-disease; cope-flavored defense ("we can tune the freedom").

## F4 — L2-2 Vault

**For**: Vault cells (4-cell square at center, e.g.) require BOTH row AND col clears in a single placement to remove. This rewards an extremely specific maneuver (the simultaneous row+col clear) that rarely arises in Classic. Antagonist is directable (player chooses how to set up the double-clear). Dual-purpose clears: every clear in vault rounds is now meaningful (if it doesn't kill vault, it was wasted). Order coupling is strong (you must build BOTH a near-row and near-col with one missing cell at the intersection).

**Against**: The "simultaneous row+col clear" is rare in normal play. To make it the *primary* mechanic, generator must heavily seed the board so that a vault-killing placement is achievable. Risk: the puzzle becomes "find the one piece+placement that double-clears" — a search problem with 1-2 valid answers. After the first time, the player learns "look for the L-shape pre-fill that needs ONE piece to complete row+col", which is then **Pipeline-flavored** (the puzzle reduces to a recognition pattern). Also, the player might never NEED to double-clear if vault cells aren't the win-condition — vault must be on the *target path* for the rule to bite, which constrains generator heavily.

**Defense**: Multiple vault tiers (tier-1 = 1 vault cell needs single double-clear; tier-2 = 4 vault cells need 2-3 double-clears) gives the player decisions about *which* vault to attack first and how to set up sequences. The rare-maneuver concern is mitigated by puzzle design: every puzzle is *built around* a vault, so the maneuver isn't rare in this mode — it's the central activity. Order coupling is real because you set up double-clears across multiple placements. **KEEP**, but watch generator complexity in Stage 5.

## F8 — L4-5 Perimeter

**For**: Border-must-end-empty + clears-evict-border creates a global negative-space constraint that genuinely couples placement (where to place pre-empt border violations) with clears (clears are the ONLY eviction tool). Dual-purpose clears: line completion deletes pre-fill AND evicts border. Order coupling: filling the border to set up an evicting clear, then re-clearing.

**Against**: Border = 28 cells, interior = 36 cells. If pre-fill is mostly interior, the player can usually solve by *not placing on border* and *clearing once or twice* to delete pre-fill — degenerate strategy. If pre-fill is on border, then the puzzle is "complete the row/col through the pre-fill cell to evict it", which is **Puzzle-mode-with-relabelled-cells** — the new constraint reduces to a target-cell-routing problem the base mode already has. The **structural aha** is "border = empty at end", which is one-shot insight.

**Defense**: The dual-axis coupling (filling border to set up eviction) is genuinely new — it forces the player to *temporarily violate* the border constraint, which means in mid-game the border has cells they MUST evict. This creates a real ordering decision: which border cell to violate first, and which line to complete to evict it. **KEEP**, but see if the temporary-violation forcing is robust. Generator must guarantee at least N forced border-violations per puzzle.

## F9 — L5-3 Detonators

**For**: Inverts Classic's "full lines auto-clear" into "full lines pile up, finite detonators spend to clear chosen lines, overflow = lose". This is a clean inversion where line completion is BOTH wanted (target progress, detonate-to-clear) AND feared (overflow risks). Per move: "complete or hold?", "detonate which?", "value comparison". Order coupling is strong (which lines to complete in what order to maximize detonator value). Antagonist is the overflow timer.

**Against**: The detonator-resource pattern is **Scar-adjacent** in the worst case: if the player hits 3 full lines and has 0 detonators, they lose with no recourse. The "no recourse" is the issue — Scar-disease is "random uncontrollable punishment", but here the punishment is from over-completing, which IS the player's choice. So actually it's controllable. BUT: in tight puzzles, the player might be forced into completing a line they didn't want (by piece constraints). Then detonator overflow becomes uncontrollable. Generator must guarantee the player has enough detonators+lines balance.

**Defense**: This is solvable: generator forward-simulates a solution that uses exactly K detonators on K lines, and the puzzle guarantees a path exists. Player who deviates from optimal can still recover by careful detonator timing. The "must complete lines" constraint is real (target progress requires completed lines), but the player picks WHICH lines, when. **KEEP**. Strong candidate.

## F11 — L8-3 Monolith

**For**: Single-component invariant on placed cells creates a topology constraint that EVERY placement must satisfy (touch existing monolith) AND every clear can break (so clears become feared). Dual-purpose clears: wanted (delete pre-fill, advance target) AND feared (fragment monolith). Order coupling: the path the monolith takes through the board determines which target cells are reachable. Negative space: cells outside the monolith must remain empty (target permitting). Strong structural aha.

**Against**: "Connected component" is a topological concept some players might not immediately read on the board. Risk of confusion. More serious: if pre-fill is *also* placed cells that count toward the monolith, then the monolith is seeded by pre-fill, and the player just extends. If pre-fill is *separate* from the player monolith (different sentinel color), the rule is clearer but pre-fill becomes inert — no longer something the player must DELETE, just something to route around. That collapses the antagonist.

**Defense**: Mixed model: pre-fill cells count toward the monolith (so player-placed cells must touch pre-fill or each other), and the target T defines which final cells must be filled. Pre-fill is a starting "seed" for the monolith; target is where it must extend to; clears can fragment the in-progress monolith if they delete the wrong pre-fill cell or wrong player cell. The "fragment fear" is real — the player must plan clears that don't cut the monolith. UI: clearly visualize the monolith with a single connected fill color or border. **KEEP**. Strong candidate.

---

## Stage 4 survivors

KEEPS: F4 Vault, F8 Perimeter, F9 Detonators, F11 Monolith. (4 survivors.)

KILLS: F1 Grain (Scar-disease + collapse risk), F2 Lifeline (Pipeline-disease, forced perms).
