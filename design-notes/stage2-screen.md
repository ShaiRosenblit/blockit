# Stage 2 — Anti-pattern screen

Critic: parent agent (Claude Opus). For L1/L3 (Opus-generated) my review is same-family — caveat noted; bias toward KILL on borderline calls in those lenses to compensate. Tests applied: Mirror / Breathe / Pipeline / Scar diseases plus the 10th-play nose test.

Format: ID — verdict — one-line reason.

---

## Lens 1 (Repurpose existing primitive)

- **L1-1 Starve** — KEEP — new global question (does empty space admit any rotation of any starve piece?), antagonist directable, dual-purpose footprint solid.
- **L1-2 Combo Lock** — KILL — Mirror-adjacent: "is this completing a single-row or coinciding with another?" reduces to "can I align two clears" which is just standard Puzzle planning under a re-labelled clear; the new question is mostly a function of the placement origin given target+pre-fill, not a new joint decision; also generator must guarantee combo-only-removable pre-fill, narrow.
- **L1-3 Gear** — KEEP — rotation tap drives both piece and pivot region; genuinely couples rotation count with pre-fill orientation; new joint question per tap.
- **L1-4 Grain** — KEEP — line completion is sign-asymmetric per axis; placement now asks "row=good vs col=trap?", clearly novel.
- **L1-5 React** — KILL — Color reactions risk Mirror disease at most placements (the reaction is automatic given placement+color), and the player rarely gets to *choose* the color (color is a slot property). Replacement adds little decision density per move beyond Chroma. Borderline mechanically and weakly novel beyond Chroma.
- **L1-6 Lifeline** — KEEP — clear is dual: deletion + tray refill, but only when slots are empty; the WHEN-to-clear vs tray-fullness coupling is genuinely new.
- **L1-7 Seed** — KILL — Mirror disease: seed cell is a deterministic function of (origin, piece dims) with no new question other than "do I want it to land in target?" That's the same target-routing question Puzzle asks — no new decision dimension.
- **L1-8 Resonance** — KEEP — cell-count match is a per-pair coupled decision, footprints erase together; novel order coupling.

## Lens 2 (Antagonist)

- **L2-1 Crawler** — KEEP — directable kill (clear the crawler's row/col), spread is deterministic, dual-purpose clear (must clear vs deny-spread tradeoff).
- **L2-2 Vault** — KEEP — only double-clears kill vault cells; placement asks "can I close both axes simultaneously?", strong antagonist.
- **L2-3 Fuse** — KEEP — countdown urgency, prioritization across multiple fuses; antagonist has clear timing rule.
- **L2-4 Frozen Key-Column** — KILL — Mirror-adjacent: clearing the key column is just a routing problem identical to "fill column J" in Puzzle; the "thaw" is a deterministic side-effect with no new decision per placement other than "does this contribute to column J?"
- **L2-5 Shadow** — KEEP — two-outcome adjacency rule (kill if line completes, activate if not) creates a real per-placement question.
- **L2-6 Heavy Row** — KEEP — column-clears acquire double duty (score + heavy-cell kill); row-fill question inverted vs Classic.
- **L2-7 Contamination Rebound** — KEEP — clear that kills also spreads; "pre-fill the spread zones first?" is genuinely new.
- **L2-8 Cage Bars** — KILL — Pipeline-adjacent risk: bars *remove* placement options without adding a coupling other than "the cage's row or column"; the kill is just "fill that line", same as Puzzle. Negative-space avoidance is real but doesn't add a new decision dimension per placement beyond ordinary tetris-style routing around blockers.

## Lens 3 (Couple two decisions)

- **L3-1 Slot-axis clear contract** — KEEP — slot now bound to clear-axis; new joint question.
- **L3-2 Origin-row parity ↔ rotation parity** — KILL — feels arbitrary; the parity rule isn't a learnable structural constraint, it's a label. The dual-purpose mechanic (rotation) doesn't have a *narrative* for why rotation parity matters — failing the "structural aha" ingredient hard. Player will memorize the parity gates and then it collapses to a smaller search space (Mirror-disease in spirit).
- **L3-3 Bbox projection overlap with previous** — KEEP — strong order coupling, joint placement-given-history.
- **L3-4 Color-typed targets, mismatches must be cleared** — KILL — the slot-color is a SLOT PROPERTY (per refill), so the color-of-piece decision is auto-determined by which slot you place from. The "joint decision" reduces to slot-selection, which Classic already had. Mostly Chroma-with-targets rather than a new coupling.
- **L3-5 Beacon-adjacency chain** — KEEP — placement coupled to history (centroid steering); novel positional history dependence.
- **L3-6 Bbox-dim transpose** — KILL — too brittle and combinatorially restrictive: a `square→5×1` makes the round insolvable, and the generator must hand-pick chains where transpose chain is satisfiable. The "decision" usually collapses to "which rotation gives the required dims" — often only ONE choice, so it's Pipeline-flavored (subtraction without compensating decision density).
- **L3-7 Twin patterns A and B** — KEEP — every placement must touch both; rotation-origin coupling for dual coverage.
- **L3-8 Per-slot contract carousel** — KEEP — novel slot↔turn-index coupling; carousel cycle creates strong per-batch ordering decision.

## Lens 4 (Negative space)

- **L4-1 Vault (single-component void)** — KEEP — global void connectivity is genuinely new; the player asks a topology question per placement.
- **L4-2 Lockout (no full lines)** — KEEP — line completion inverted to instant lose; primitive flips sign; dual-purpose row-fill is load-bearing.
- **L4-3 Moat** — KILL — Mirror disease: moat cells are just static blockers (already supported via SCAR_COLOR pattern); the "rotation thread" question is exactly the same as routing around any pre-fill in Puzzle. No new decision dimension.
- **L4-4 Archipelago (≥2 void components)** — KEEP — fragmentation is the inverse global-topology constraint; clears can re-merge components (real fear of clears).
- **L4-5 Perimeter (28 border cells empty)** — KEEP — placement vs remediation-clear question is genuinely new; column-clear cost is real.
- **L4-6 Hollow (interior void pocket)** — KEEP — wall-construction question; gap-detection per placement; dual-purpose piece shape.
- **L4-7 No-2×2-Void** — KILL — Breathe-disease risk inverted: "no 2×2 void" can be auto-satisfied if the generator picks any sufficiently dense final config; the player satisfies it by just not leaving big empty regions, which they're doing anyway. The 2×2-void rule is most often implied by "place all pieces while keeping the board reasonably packed."
- **L4-8 Parity (color-balanced void)** — KILL — the parity rule is a counting bookkeeping check that doesn't generate a *structural* aha; the player learns each piece's parity contribution by rote, then planning collapses to arithmetic — failing the "structural aha" ingredient. Marginal Mirror disease (parity is a function of origin+rotation).

## Lens 5 (Finite resource)

- **L5-1 Drill** — KEEP — spend on which occupied cell is a per-spend decision with multiple legitimate options.
- **L5-2 Brace** — KEEP — protect a line through a clear; spend timing matters.
- **L5-3 Detonators (player picks which lines clear)** — KEEP — every full line is a spend decision; classic full-line auto-clear is removed and replaced with a strictly richer decision.
- **L5-4 Shove** — KILL — Scar-adjacent: shoving an entire row "by 1" is awkward to picture and the player has limited foresight on what the shoved row will look like in subsequent placements; risk that the dominant strategy is "always shove on the first useful misalignment". Also generator complexity is high.
- **L5-5 Cut (omit one cell from a piece)** — KEEP — the spend choice has multiple legitimate options every time you place a piece that doesn't quite fit.
- **L5-6 Anchor (one cell survives next clear)** — KEEP — interesting spend: which cell survives the deletion event.
- **L5-7 Swap (slot-keyed clears)** — KILL — combines two complex rules (per-slot clear permissions + swap resource); too tangled, and the per-slot rule alone has Pipeline-disease risk because it removes "all slots clear all lines" without obvious decision compensation. Too much surface area for a single mode.
- **L5-8 Pressure (banked forced-clear)** — KEEP — banking via deferral of clears is a counter-incentive to Classic's "always clear" strategy, real spend question.

## Lens 6 (Information variant)

- **L6-1 Veil-adjacent target probe** — KEEP — placement doubles as probe; reveal rule is deterministic; player decides "probe vs commit".
- **L6-2 Sealed next-batch manifest (post-first-place unlock)** — KILL — Pipeline-adjacent: hides info from the player without compensating decision; the decision once revealed is ordinary planning. The "do I commit before knowing?" decision is one-shot per puzzle, not per placement.
- **L6-3 Active-slot peel** — KILL — peeling adds an "inspect" verb but the player ends up peeling all three slots at start anyway (dominant strategy: peel everything before placing); per-placement decision is degenerate.
- **L6-4 Column curtain** — KEEP — per-column probe; placement-by-column has strategic information value.
- **L6-5 Quadrant-sealed target submask** — KEEP — same family as L6-4 but quadrant-scoped; the "which quadrant to enter first" question is real.
- **L6-6 First-clear unmasks taboo template** — KILL — the taboo template is fixed at build but the player can't infer it pre-reveal except by guessing one of K templates; the pre-reveal decision is Scar-adjacent (gambling on a hidden constraint with no clear inference rule). Post-reveal the puzzle collapses to ordinary Puzzle+taboo.
- **L6-7 Cleared-line target illumination** — KILL — clear is the only reveal for an axis; the player will try to clear early to illuminate, then plan; per-placement decision is mostly "trigger a clear to reveal", repeating across moves. 10th-play question collapses to "clear which axis next?".
- **L6-8 Kicker disclosure on rotate** — KILL — kicker is a deterministic table the player learns once; after learning, the rotate-to-disclose verb is decorative; per-placement decision converges to "rotate then place as usual". 10th-play test fails.

## Lens 7 (Topological twist)

- **L7-1 Clear-triggered column rotor** — KEEP — clear is also a topology tick; placement asks "do I want the rotor to fire now?".
- **L7-2 Axis-swap clear geometry** — KEEP — alternates clear axis based on whether last placement cleared; decision is "clear now (lock axis sequence) vs delay".
- **L7-3 Alternating portal pair** — KILL — portal endpoints with parity-gated activation feel arbitrary; the player ends up either (a) avoiding portals entirely (degenerate strategy), or (b) routing through them on parity, which is a deterministic geometric problem with one answer per piece — failing 10th-play question novelty.
- **L7-4 Row-pair fusion schedule** — KEEP — fusion phase deterministic; per-placement decision is "which fusion phase fires this placement, and is that what I want?".
- **L7-5 Seam-wrap window** — KILL — wrap is rare (every 3rd turn); decision is "do I save my big piece for the seam-open turn?"; degenerates to one-shot decision per cycle, not per placement.
- **L7-6 Clear-parity board transpose** — KILL — full board transpose is a giant state change that's mostly punishing; player will avoid clears (Pipeline-adjacent: clears subtract agency without addition because the post-transpose state isn't easily planned for). Too explosive a topology event.
- **L7-7 Ring rotation by zone** — KILL — three concentric rings rotating partly is hard to picture; the "which zone gets most cells" decision is a deterministic function of where the piece naturally fits, often unique. Mirror-disease risk.
- **L7-8 Deterministic hinge fold** — KILL — copy-into-empty-mirror after clears is a duplication primitive that's confusing and has Mirror-disease characteristics (the copy is determined by current state, not a new decision).

## Lens 8 (Inversion)

- **L8-1 Anti-line (no full lines)** — DUP of L4-2 Lockout — KILL as duplicate (favor L4-2 phrasing).
- **L8-2 Perimeter-anchored placement** — KILL — Pipeline-disease: placement decision is restricted to "must touch border" with no compensating new dimension; once interior fills, perimeter access is the bottleneck and dominant strategy emerges.
- **L8-3 Monolith (4-connected from seed)** — KEEP — placements must keep one connected component; clears can disconnect (real fear of clears); per-placement question is genuinely novel.
- **L8-4 Flood-from-edge** — KEEP — legal region grows; "claim now or wait for ring expansion?" is a real decision.
- **L8-5 Burn budget (discard)** — KILL — Pipeline-disease-light: discard is a generic resource that doesn't repurpose any existing primitive, just adds a side-button. The 10th-play question is "place or discard?", which is binary and degrades to "discard the worst piece".
- **L8-6 Axis-gated clear** — DUP of L7-2 (toggling clearAxis on each clear vs alternating each placement). Marginally different; KILL as redundant.
- **L8-7 Clear-to-blocker** — KEEP — clear flips from territory removal to permanent blocker seeding; same primitive, opposite valence; clear avoidance becomes a real decision.
- **L8-8 Purity meter** — KILL — meter-based sub-condition is decorative; player simply minimizes clear count, which is Pipeline-adjacent (removes the verb's value without adding a decision dimension other than "spend more on solving").

---

## Summary

KEEPS (24): L1-1, L1-3, L1-4, L1-6, L1-8, L2-1, L2-2, L2-3, L2-5, L2-6, L2-7, L3-1, L3-3, L3-5, L3-7, L3-8, L4-1, L4-2, L4-4, L4-5, L4-6, L5-1, L5-2, L5-3, L5-5, L5-6, L5-8, L6-1, L6-4, L6-5, L7-1, L7-2, L7-4, L8-3, L8-4, L8-7.

(Recount: that's 36 — exceeds the spec's 10–20 target. The screen wasn't aggressive enough; I'll re-tighten in Stage 3 by demanding distinct questions across moves.)

Recount of actual KEEPs above: 36. Spec wanted 10–20 survivors. Stage 3 will tighten further.

---

## Stage 2 final cull (cluster-collapse)

Many KEEPs cluster on the same primitive ("clears get extra duty", "negative-space global property", "finite resource per move"). I keep the strongest representative of each cluster and drop the rest. Final 12 finalists, in mechanics-speak shorthand:

1. **L1-4 Grain** — row-clear is normal; column-clear seeds row-blockers; placement asks "row=good vs col=trap?" every move.
2. **L1-6 Lifeline** — clear only triggers tray-refill when all 3 slots are empty. Per-batch question: order placements so a clear lands on the empty-tray turn.
3. **L1-8 Resonance** — placements arrive in pairs; second piece must clear with cell-count matching first; pair locks twin order coupling.
4. **L2-2 Vault** — vault cells removed only when both row AND column clear simultaneously.
5. **L3-3 Bbox-projection overlap** — each placement's bounding box must overlap previous placement's projection on opposite axis.
6. **L3-7 Twin patterns A & B** — every placement must contribute to BOTH targets simultaneously.
7. **L4-2 Lockout** — line completion is instant lose; player must fill toward target without ever fully filling a row or column.
8. **L4-5 Perimeter** — border 28 cells must end empty; column-clear is the only way to evict misplaced border cells.
9. **L5-3 Detonators** — full lines do NOT auto-clear; player spends finite detonators to choose which full lines clear, and lines that pile up overflow as Lose.
10. **L5-5 Cut** — limited "cut" tokens omit one cell from a placed piece; per-piece spend decision.
11. **L8-3 Monolith** — all placed cells must remain a single 4-connected component; clears can disconnect (real fear of clears).
12. **L8-7 Clear-to-blocker** — cleared lines leave permanent blockers on previously-empty cells of that line; clear is now BOTH wanted (delete pre-fill) and feared (permanent stain).

These 12 go to Stage 3. Killed: 24 of the 36 KEEPs were collapsed into the strongest cluster representative.

