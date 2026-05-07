# Stage 5 — Generator feasibility check

For each survivor, sketch:
- Forward-sim strategy
- Win-state oracle (deterministic predicate)
- Quality filters
- Estimated reject rate per accepted puzzle

If no sketch is possible, KILL.

---

## L1-6 Board Spin

- **Forward-sim**: Generate pre-fill outline (target empty cells). Pick N tray-pieces (orientation-locked at dealt orientation). Sim: at each tick, optionally apply 90° board rotation (decrements spin budget S), then pick a legal placement, apply line clears, advance.
- **Oracle**: marked pre-fill cells empty AT END.
- **Quality filters**: at least 1 spin used in solution; pre-fill not clearable via line clears alone (without rotation); spin budget exhausted by exactly 0–2 spins beyond minimum (creates real budgeting).
- **Reject rate**: ~50%. Many sims either trivially solve without spinning or dead-end after over-spinning.
- **Verdict**: feasible.

## L2-1 Plague

- **Forward-sim**: Empty board + K=2 initial infected cells. Pick N pieces. For each placement, after placing, deterministically simulate spread (every infected cell with ≥2 filled orthogonal neighbors spawns 1 new infected cell at a deterministic-seeded target). Apply clears, infected cells inside cleared rows/cols are removed.
- **Oracle**: zero infected cells AND tray empty.
- **Quality filters**: at least 1 spread event during solution (otherwise mode is decorative); spread total bounded by SPREAD_CAP (e.g., 3); generator forward-sims with spread baked in.
- **Reject rate**: ~70%. Many sims either fail to trigger spread or exceed cap.
- **Verdict**: feasible. Spread-cap is essential.

## L2-2 Siege

- **Forward-sim**: Wall of K sentinels in row 7 (gaps included). Simulate placements. After each placement that didn't clear the wall row, advance every sentinel from row R to R-1. Forward-sim until wall reaches row 0 (lose) or all pieces placed.
- **Oracle**: wall at row >0 (or fully cleared) after last placement.
- **Quality filters**: ≥1 wall clear during sim; wall advances ≥1 row at some point (otherwise solved trivially first move).
- **Reject rate**: ~40%. Wall regeneration is the trickier piece — need careful interleaving.
- **Verdict**: feasible.

## L3-2 Twin Bond

- **Forward-sim**: Tray of 3 pieces; mark 2 as bonded. Sim placements: a bonded placement arms the bond, requiring the partner's footprint to share ≥1 edge-adjacent cell. Forward-sim with the player's chosen ordering (random in sim).
- **Oracle**: score target reached / target pattern matched / no broken bonds beyond cap.
- **Quality filters**: ≥1 bond placement per generated puzzle (otherwise pure Classic); partner has 2–4 legal touch positions (forces decision, not trivial).
- **Reject rate**: ~50%. Many random orderings produce bond breaks.
- **Verdict**: feasible.

## L4-2 Quarantine

- **Forward-sim**: Generate wall partitions (2–3 regions of varying sizes via random connected-wall placement). Compute initial empty count per region. Pick N pieces. Sim placements (some spanning region boundaries). Final per-region empty count BECOMES the target.
- **Oracle**: per-region empty count exactly equals target.
- **Quality filters**: ≥1 piece spans a region boundary (otherwise regions are independent); targets are non-trivial (not exactly equal to initial counts); ≥2 regions.
- **Reject rate**: ~30%. By construction the target is the simulation result, so the only rejections are from cells-don't-fit overflow, etc.
- **Verdict**: most feasible of the 6.

## L8-3 Hoard

- **Forward-sim**: Pre-fill (target empty pattern). Tray starts with 3 random pieces. Pre-seed a deterministic piece-replenishment queue Q. Sim: each placement pops 0 or 1 pieces from Q (1 if the placement triggered a clear). Continue until tray empty or all pre-fill cleared.
- **Oracle**: all pre-fill empty AND tray reaches empty without dead-ends.
- **Quality filters**: ≥2 clears triggered during solution (otherwise queue not engaged); Q's replenishment includes ≥1 piece needed for endgame (otherwise Q is decorative).
- **Reject rate**: ~80%. The state space (board × tray × Q-cursor) explodes; many sims dead-end.
- **Verdict**: feasible but the highest-cost generator of the 6.

---

## Stage 5 summary

All 6 candidates pass feasibility. **0 of 6 killed.**

Reject-rate ranking (low = good):
1. Quarantine (~30%)
2. Siege (~40%)
3. Board Spin (~50%)
4. Twin Bond (~50%)
5. Plague (~70%)
6. Hoard (~80%)

All carry forward to Stage 6 (ranked selection).
