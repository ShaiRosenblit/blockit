# Stage 5 — Generator feasibility check

For each survivor: forward-simulation strategy, win oracle, quality filters, rough rejection ratio.

---

## F4 — Vault

**Forward-sim**: pick K vault cells (K ∈ {1, 2, 4} for easy/normal/hard; cells co-located such that double-clears are non-trivial). Place vault cells. Then forward-simulate a SOLUTION of K double-clears: for each vault cell, choose a piece+placement that simultaneously completes its row and col. Record the placements. Build pre-fill = (the line-complete pre-states required for those placements) MINUS (the cells that the solution-pieces will fill). Issue: pre-fill seeding is hairy because we need (row, col) to each be 1-cell-from-full where the missing cells are exactly the solution-piece's footprint at that row+col intersection. Tray = the solution pieces in solve-order, plus 1-2 distractors.

**Win oracle**: vault cells all empty AND target T (if any) all filled.

**Quality filters**: ≥1 double-clear forced (so player can't avoid the central mechanic); pre-fill ≥ X cells (else trivial); not solvable with single-row clears alone.

**Rejection ratio estimate**: high — 5-20× per accepted because the simultaneous-clear setup is brittle. Probably acceptable for normal/easy; hard might need fallback.

**Risk**: pre-fill construction inverse-step (compute pre-fill that ALLOWS the vault double-clear placements) is nontrivial. The puzzleGenerator.ts pattern doesn't have direct precedent for this — it forward-simulates *placements* and lets pre-fill emerge. Vault breaks that because pre-fill must be *exactly* "1 cell from full on both row+col at vault location".

## F8 — Perimeter

**Forward-sim**: target T = some interior pattern. Pre-fill seeds in interior (deletable via row/col clears) plus a few BORDER pre-fill cells (which MUST be evicted by row/col clears that include them). Forward-simulate: pick a sequence of placements that (a) completes target T, (b) involves K row/col clears that delete pre-fill AND evict border. Build pre-fill from the simulation traces.

**Win oracle**: target T filled exactly AND all 28 border cells empty.

**Quality filters**: ≥1 forced border-eviction clear (hard mode = ≥2); border must end fully empty (else trivial).

**Rejection ratio**: medium — 3-10× per accepted. Forward sim of placements with clears already works in puzzleGenerator.ts; just add a post-clear border-empty check.

**Risk**: low. Clean extension of existing generator.

## F9 — Detonators

**Forward-sim**: target T. Choose detonator budget K. Forward-simulate: pick K placements that complete a line, and arrange so that AT MOST 2 full lines exist at any time (else lose). Track detonators used. Tray and pre-fill emerge from simulation.

Actually the clean approach: target T is a pattern, and the puzzle requires K specific lines to be detonated to clear pre-fill that obstructs target. Forward-sim: pick K lines, pick which pre-fill blocks each, pick a tray that lets the player complete each line. Tracker: detonator count = K. Player must spend exactly K detonators (fewer = pre-fill blocks target; more = exceeds budget).

**Win oracle**: target T filled exactly AND no full row/col currently exists AND detonators ≥ 0. Lose: 3+ full rows+cols exist with 0 detonators.

**Quality filters**: K ≥ 2 (else trivial); pre-fill must require clears to evict (else player just routes around); ≥2 valid orderings exist (else Pipeline-disease).

**Rejection ratio**: medium — 5-15×. Generator pattern matches puzzleGenerator with added detonator budget tracking.

**Risk**: low–medium. Need to design pre-fill that *forces* line completions (not just allows them).

## F11 — Monolith

**Forward-sim**: target T = pattern. Pre-fill = a small "seed" 4-connected component (the starting monolith). Forward-simulate placements that extend the monolith to cover T, with at least one placement that triggers a line clear (delete some pre-fill or stale player cells) without fragmenting. Sim records placements; pre-fill = seed; tray = forward-sim pieces.

Actually re-reading my own description of Monolith: pre-fill counts as part of the monolith, target T = where final cells must be. Generator: pick T, pick a seed (small connected pre-fill at one end of T), forward-sim placements that extend the monolith from seed toward T, possibly with clears. Build tray + extended pre-fill from sim.

**Win oracle**: target T filled exactly AND placed-cells-union is one 4-connected component.

**Quality filters**: ≥1 clear in solution (else clears are inert); component-fragmentation is *possible* with a wrong placement (so player has real fear); seed and target are far enough apart that path matters.

**Rejection ratio**: medium-low — 3-10×. The connectivity check is O(64) per placement, cheap. Forward sim is straightforward.

**Risk**: low. Cleanest generator of the four.

---

## Stage 5 verdict

All 4 survivors are feasible. Monolith and Perimeter are the cleanest generators. Vault is hardest. Detonators is medium.
