# Stage 2 — Anti-pattern screen of 64 candidates

**Reviewer**: Claude Opus (the orchestrator).
**Cross-family note**: Opus is cross-family for L2 (Sonnet), L4 (Sonnet), L5 (Haiku), L6 (Haiku), L7 (Haiku), L8 (Haiku). For L1 and L3 (Opus-generated) the screening is same-family — extra skepticism applied to compensate for shared blind spots.

Anti-patterns:
- **Mirror disease** — extra constraint is a function of an existing decision.
- **Breathe disease** — extra rule is auto-satisfied by the conjunction of others.
- **Pipeline disease** — agency removed without comparable agency added.
- **Scar disease** — random uncontrollable punishment the player can't direct.

Target kill rate: 70–80%. Aim: 13–20 survivors.

---

## Lens 1 (8 candidates, Opus-generated, same-family)

### L1-1 Magnet — KILL
- Mirror: PASS (color-frontier choice is a real second decision).
- Breathe: PASS.
- Pipeline: PASS.
- Scar: PASS.
- **Extra kill reason**: Line clears DISABLED removes the central dual-purpose mechanic that defines great Blockit modes. Without clears the mode is pure tiling-with-color-adjacency — a different game shape. Loses Puzzle mode's exemplar property. KILL on novelty/best-fit grounds.

### L1-2 Pivot Budget — KILL
- All four anti-patterns PASS individually.
- **Extra kill reason**: Mechanical near-duplicate of L5-1 Rotation Budget (resource = rotations). The cell-cost wrinkle is interesting but minor; in a head-to-head against L5-1 + Ink (L5-8) this candidate is dominated. Cull to keep the strongest representative of "rotation as resource."

### L1-3 Chord — KEEP
- Mirror: PASS — "thread chord through orphan row" is a new question.
- Breathe: PASS.
- Pipeline: PASS.
- Scar: PASS.
- Strong dual-purpose: a row-completing placement WITHOUT a paired column = strictly bad (orphan stripe). Same primitive (line completion) wanted+feared.

### L1-4 Slot Modes — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Three distinct verbs (stamp/erase/carve) is *cognitively very heavy* and asks the player to learn three sub-mechanics at once. Triple-novelty in one mode is a distinct failure mode. Cull.

### L1-5 Color Chord Clear — KEEP
- Mirror: PASS — "extend a same-color run-of-3 to 4" is a new color-adjacency question.
- Breathe: PASS.
- Pipeline: PASS.
- Scar: PASS (generator must guarantee tray supplies enough of each color).

### L1-6 Board Spin — KEEP
- Mirror: PASS — "spin now or after the next placement?" is a fresh question; rotation now mutates the workspace, not the tool.
- Breathe: PASS.
- Pipeline: PASS — pieces orientation-locked, but a completely different rotation verb is added. Net agency: re-coupled, not removed.
- Scar: PASS.
- Strong inversion of an existing primitive.

### L1-7 Tetromino Tax — KEEP
- Mirror: PASS — "trigger clear and lose a piece, or delay" is a new question.
- Breathe: PASS.
- Pipeline: PASS.
- Scar: PASS — sacrifice is player-chosen.
- Pure dual-purpose: clears are now both verb and cost.

### L1-8 Color Key — KILL
- All anti-patterns PASS individually.
- **Extra kill reason**: Mechanical sibling of L1-5 (both repurpose color into a clear-trigger predicate). L1-5's "run of 4" is a softer, more attainable target than L1-8's "all 8 cells one color" — easier for the generator to prove solvability and cleaner dual-purpose. Keep one, kill the other; L1-5 wins.

**Lens 1 survivors: L1-3, L1-5, L1-6, L1-7 (4 of 8)**

---

## Lens 2 (8 candidates, Sonnet-generated, cross-family)

### L2-1 Plague — KEEP
- Mirror: PASS — "fill toward clear vs trigger spread" is a new question that genuinely couples geometry to consequence.
- Breathe: PASS.
- Pipeline: PASS.
- Scar: PASS — spread is conditional on density, not random; deterministically seeded RNG only resolves ties.
- Strong dual-purpose: every cell next to infection is a setup AND a trigger.

### L2-2 Siege — KEEP
- All anti-patterns PASS.
- Distinct mechanic: linear advancing wall under a deadline.
- Strong dual-purpose: the same placement either contributes to wall-clear or cedes a row.

### L2-3 Fuse — KEEP
- All anti-patterns PASS.
- Per-bomb timers create a unique pacing constraint. The "1 turn before detonation" generator guarantee is a clean solvability proof.

### L2-4 Anchor — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Strict overlap with shipped Monolith mode (single-component connectivity invariant). Anchor's "orphan → permanent debris" is harsher, but the underlying decision the player makes per placement is essentially the same: "does this preserve connectivity?" Monolith already occupies that design slot. KILL.

### L2-5 Flood — KILL
- All anti-patterns PASS individually.
- **Extra kill reason**: Antagonist family redundant with L2-1 Plague (both are spreading-region antagonists). Plague's density-conditional spread is a sharper dual-purpose than Flood's pure-BFS expansion. Plague wins. KILL.

### L2-6 Rival — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Same family as Plague/Flood. Pressure-directed growth (highest-pressure empty cell) is interesting but redundant with two stronger candidates. KILL.

### L2-7 Chain — KILL
- **Breathe disease: FAIL.** Chain links are a subset of pre-fill, and "all chain links cleared by line clears" is exactly the standard Puzzle win condition (all non-target pre-fill must end empty). The "chain" structure is decorative pre-fill; the rule it adds is auto-satisfied by Puzzle's existing target check. KILL.

### L2-8 Tide — KILL
- All anti-patterns PASS individually.
- **Extra kill reason**: Antagonist family redundant with Siege (both are advancing-fill from one edge under deterministic RNG). Siege's wall has a sharper failure mode (top-row touchdown) than Tide's "drown a row." KILL.

**Lens 2 survivors: L2-1, L2-2, L2-3 (3 of 8)**

---

## Lens 3 (8 candidates, Opus-generated, same-family)

### L3-1 Tally — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Cognitive load is severe. Players summing a tag-field per candidate placement (mod 4, every cell) is a math task, not a spatial-planning task. Cognitive overload is a known failure mode for puzzle modes. The mechanic is mathematically beautiful but UX-hostile. KILL.

### L3-2 Twin Bond — KEEP
- Mirror: PASS — "place A so B has a touch site" is a new question.
- Breathe: PASS.
- Pipeline: PASS.
- Scar: PASS — bond breaking is player-controllable.
- Cross-piece coupling is genuinely novel.

### L3-3 Slot Lens — KILL
- **Pipeline disease: FAIL** (author flagged). Slot-driven rotation phase is cosmetic if rotation is free in the UI. The "decision" reduces to tap-budget heuristics. KILL.

### L3-4 Axis Vow — KEEP
- Mirror: PASS — "what axis to declare?" couples rotation parity (axis-kind) and position (axis-index).
- Breathe: PASS.
- Pipeline: PASS — adds axis-commitment, removes free-region placement.
- Scar: PASS.
- Strong dual-purpose: rotation parity goes from cosmetic to corridor-defining.

### L3-5 Footprint Echo — KEEP
- All anti-patterns PASS.
- The bbox-chain creates a self-tightening constraint that is meaningful at every placement; clears reset the chain. Dual-purpose: bbox is anchor (good upstream) and constraint (bad downstream).

### L3-6 Quartet Cap — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Per-row rotation budget is a refined version of L1-2 Pivot Budget. Both "rotation is a budget" candidates competing — keeping a third resource-rotation candidate alongside L5-1 dilutes the strongest representative. The spec's "variety across the 8" goal is also better served by killing this. KILL.

### L3-7 Color Pact — KILL
- **Mirror-adjacent / Chroma-overlap.** Author flagged duplication with shipped Chroma. KILL.

### L3-8 Pivot — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Chebyshev-ring rotation rule is cognitively similar to L3-1 Tally — players must precompute distance-to-pivot per candidate position. Cognitive overload. The dynamic pivot (last-cleared cell) is interesting but the per-placement rule is too compute-heavy. KILL.

**Lens 3 survivors: L3-2, L3-4, L3-5 (3 of 8)**

---

## Lens 4 (8 candidates, Sonnet-generated, cross-family)

### L4-1 Lacuna — KEEP
- All anti-patterns PASS.
- The connected-empty invariant gives a clean topological constraint that's checked per placement. Mechanically distinct from anything shipped.

### L4-2 Quarantine — KEEP
- All anti-patterns PASS.
- Per-region exact-size targets is a number-theoretic puzzle on top of geometric placement — a fresh second axis.

### L4-3 Airlock — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Connectivity-corridor is a special case of L4-1 Lacuna's connected-empty rule (corridor is a 1D path; lacuna is a 2D connectivity blob). Lacuna subsumes the design intent. KILL.

### L4-4 Fault — KILL
- Author flagged the diagonal rule as flavor-driven. Mirror disease: arguably the diagonal-empty constraint correlates strongly with target choice (a target that exists implies certain diagonals exist). Win-state-only check weakens "order matters." KILL.

### L4-5 Vault — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Vault detection (exact-size enclosed-empty regions) is generator-painful — generator must produce instances where the player can build the enclosure-ring at exact sizes, but players' line-clears can destroy partial vaults non-deterministically. Solvability proof under clears is hard. Risk of generator falling back to hardcoded fixtures. KILL on feasibility.

### L4-6 Vault — already covered above.

### L4-6 Moat — KILL
- **Breathe disease: FAIL.** No-fully-surrounded-filled-cell is a global property of the target itself; if the target satisfies it (generator forced to), the constraint is auto-satisfied. Author flagged this. KILL.

### L4-7 Rift — KEEP
- Mirror: PASS — clear trigger inverts (low-fill, not full).
- Breathe: PASS.
- Pipeline: PASS — adds "manage rows toward emptiness threshold."
- Scar: PASS.
- Excellent dual-purpose: each piece both fuels and threatens rift potential. **Standout candidate.**

### L4-8 Seam — KILL
- Chroma overlap (author flagged). KILL.

**Lens 4 survivors: L4-1, L4-2, L4-7 (3 of 8)**

---

## Lens 5 (8 candidates, Haiku-generated, cross-family)

### L5-1 Rotation Budget — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Mechanical near-duplicate of L1-2 Pivot Budget. Both rotation-as-resource. Already culled L1-2; keep one representative. L5-8 Ink is the strongest "resource" candidate. KILL L5-1.

### L5-2 Wildcard Cells — KILL
- All anti-patterns PASS.
- **Extra kill reason**: "Convert N cells of a piece to a 1-cell stub" is mechanically odd — it asks players to understand piece-mutation mid-placement. Higher cognitive cost than the strategic value warrants. KILL.

### L5-3 Anchor Placement Budget — KILL
- All anti-patterns PASS.
- **Extra kill reason**: "Pieces must be adjacent to an anchor or another piece" overlaps Monolith. The player-placed anchor variant is a thin variation. KILL.

### L5-4 Swap Budget — KILL
- All anti-patterns PASS individually.
- **Extra kill reason**: Post-placement swap weakens commitment, which is a load-bearing property of "order matters." Swap is essentially undo-with-extra-steps. KILL.

### L5-5 Preview Budget — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Information resource that doesn't couple tightly to placement geometry. The decision "preview now or save" is meta to the gameplay rather than driving placement choices. KILL.

### L5-6 Delete Budget — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Delete is a built-in degenerate version of L8-1 Erase (which makes deletion the entire mechanic). As a side-resource it's redundant with swap and weakens commitment. KILL.

### L5-7 Turn Budget — KILL
- All anti-patterns PASS individually.
- **Extra kill reason**: "Forfeit pieces past K=5 placements" is a pacing constraint that doesn't change the per-placement question. The decision "place piece N or skip it" is already covered by current game-over logic. Pipeline-disease-adjacent. KILL.

### L5-8 Ink — KEEP
- Mirror: PASS — "trigger clear for ink refund vs save ink for placement" is a new question.
- Breathe: PASS.
- Pipeline: PASS.
- Scar: PASS.
- Strong dual-purpose: **clears as an ink-regenerator** is the cleanest "primitive does double duty" of the resource lens.

**Lens 5 survivors: L5-8 (1 of 8)**

---

## Lens 6 (8 candidates, Haiku-generated, cross-family)

### L6-1 Revealed Frontier — KILL
- Author auto-rejected (memorization on replay). Confirmed: 10th-play test fails — same seed becomes Classic with known target. KILL.

### L6-2 Partial Board Vision — KILL
- Memorization-on-replay collapses the reveal mechanic. Per-session seeds is a possible escape, but the spec asks for a mode that holds up to 10 plays of the same instance. KILL.

### L6-3 Queued Tray — KILL
- The timing decision ("commit blind to see piece 2") is real, but the underlying piece-2 distribution becomes memorized per seed within 2-3 plays, collapsing the decision to a known-answer optimization. KILL.

### L6-4 Target Partial Reveal — KILL
- Memorization. KILL.

### L6-5 Piece-Color Hidden — KILL
- Memorization + lottery feel; placement becomes gambling on first play, rote on replay. KILL.

### L6-6 Tray Reveal Chain — KILL
- Author auto-rejected (single-play-per-seed by design). KILL.

### L6-7 Board Region Fogged — KILL
- Memorization. KILL.

### L6-8 Color-Gated Zones — KILL
- Author auto-rejected (not actually an information variant). KILL.

**Lens 6 survivors: 0 of 8** — the entire lens fails the 10th-play test. The information-variant family is fundamentally hostile to replayable Blockit modes.

---

## Lens 7 (8 candidates, Haiku-generated, cross-family)

### L7-1 Cylinder — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Wraparound-columns is a topological flavoring with limited new decision per placement. After the first few placements, the "exploit wrap" question collapses to "treat board as 8-wide loop." Subsumed by L7-2 Torus on novelty. KILL.

### L7-2 Torus — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Stronger version of L7-1, but the same fundamental decision shape. Corner-equivalence is genuinely interesting on paper but produces ambiguous "which seam should I bridge" intuition that hasn't been clearly mapped to a per-placement question. Cognitive load + minor mechanical shift. KILL.

### L7-3 Partitioned Board — KEEP
- All anti-patterns PASS.
- Region-local clears (4-cell row inside a 4×4 block) is a genuinely fresh clear-mechanic. **Order matters across regions** in a clean way: clearing one region doesn't compact another.

### L7-4 Diagonal Lines — KILL
- All anti-patterns PASS individually.
- **Extra kill reason**: Polyomino pieces are designed for axis-aligned coverage. Producing 8-cell diagonals via row-aligned pieces is mechanically painful and the generator would either need oversize pieces (violating constraints) or hand-crafted alignment. Solvability rate likely too low. KILL on feasibility.

### L7-5 Slope — KEEP
- All anti-patterns PASS.
- Mandatory tilt-after-placement creates a strong "predict the post-tilt board" question per placement. Dual-purpose: tilt compacts (good) and reorganizes (destroys setups). Distinct from shipped Gravity (which only tilts after clears).

### L7-6 Rotating Board — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Mechanically interesting but every-4-placements rotation creates a discontinuity in player planning that's hard to reason about cleanly without a visualization aid. The "rotation cycle" framing gives every cycle a different feel and is closer to a meta-rule than a per-placement primitive. KILL.

### L7-7 Hexagonal Grid — KILL
- Author auto-rejected (UI feasibility). KILL.

### L7-8 Gravity Wells — KILL
- All anti-patterns PASS.
- **Extra kill reason**: Four directions of gravity in distinct quadrants is a visual/UX mess; pieces near boundaries have ambiguous behavior. L7-5 Slope is the cleaner representative of "tilt antagonist." KILL.

**Lens 7 survivors: L7-3, L7-5 (2 of 8)**

---

## Lens 8 (8 candidates, Haiku-generated, cross-family)

### L8-1 Erase — KEEP
- All anti-patterns PASS.
- Inversion of placement (subtract not add) is a clean primitive flip. Pre-fill is a sculpting medium; the player carves a target. Strong order-coupling.

### L8-2 Void King — KILL
- Author auto-rejected (game-over inversion isn't an inversion of a primitive). KILL.

### L8-3 Hoard — KEEP
- All anti-patterns PASS.
- Tray refills only on clears flips the meaning of clears: from reward to fuel. Strong dual-purpose. Generator must seed deterministic piece-replenishment for solvability.

### L8-4 Unstack — KILL
- Author auto-rejected (cosmetic inversion + Mirror-disease smell). KILL.

### L8-5 Inward Spiral — KILL
- Author auto-rejected (not actually an inversion). KILL.

### L8-6 Stamp — KILL
- All anti-patterns PASS.
- **Extra kill reason**: "Pieces ARE the empty cells" is a perspective inversion that requires a totally different UI metaphor (the player is reserving holes, not filling). High UI risk and the "10th play" question becomes "which empty region matches this piece?" — close enough to standard tiling that the inversion mostly impacts presentation, not gameplay decisions. KILL.

### L8-7 Invert Score — KILL
- Author auto-rejected (score is not a primitive). KILL.

### L8-8 Asymmetric Mirror — KILL
- Author auto-rejected (not actually an inversion; rule-addition disguised). KILL.

**Lens 8 survivors: L8-1, L8-3 (2 of 8)**

---

## Stage 2 summary

**Total survivors: 18 of 64** (kill rate 72%, in target band 70–80%).

| Lens | Survivors | Kept candidates |
|------|-----------|-----------------|
| L1   | 4         | L1-3 Chord, L1-5 Color Chord Clear, L1-6 Board Spin, L1-7 Tetromino Tax |
| L2   | 3         | L2-1 Plague, L2-2 Siege, L2-3 Fuse |
| L3   | 3         | L3-2 Twin Bond, L3-4 Axis Vow, L3-5 Footprint Echo |
| L4   | 3         | L4-1 Lacuna, L4-2 Quarantine, L4-7 Rift |
| L5   | 1         | L5-8 Ink |
| L6   | 0         | (entire lens failed 10th-play test) |
| L7   | 2         | L7-3 Partitioned Board, L7-5 Slope |
| L8   | 2         | L8-1 Erase, L8-3 Hoard |

Notes:
- Lens 6's complete elimination is a load-bearing finding: information-variant modes generally fail the 10th-play test for replayable Blockit.
- "Resource" candidates (L5) are dominated by L5-8 Ink because clears-as-ink-regenerator is the cleanest dual-purpose; other resources are side-buttons that don't tightly couple to placement geometry.
- Antagonist candidates (L2) cluster as "growing region" types; only the three most mechanically distinct survived.

Survivors carry forward into Stage 3 (forced playthrough simulation), where another 50–70% will fall.
