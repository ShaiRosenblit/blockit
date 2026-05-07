# C13 — Echo-III: hidden-target Picross / nonogram-style Blockit

## Premise being tested

The target board is hidden. The player sees only:
- per-row filled-cell counts of the target (8 integers, "R")
- per-column filled-cell counts of the target (8 integers, "C")
- a live delta between current row/col counts and target counts

Win = `boardMatchesTarget(board, hiddenTarget)`. Generator quality filter: marginals + tray uniquely determine the target.

## Legend

- `.` empty
- `#` filled by player
- `o` pre-fill blocker (counts toward filled-count)
- `R[r]=k` target row r has k filled cells
- `C[c]=k` target column c has k filled cells

## Setup

Generated puzzle: small starting pre-fill, target totals 28 filled cells (so 36 empty).

Initial board (row 0 top, col 0 left):

```
       C: 4 3 5 2 4 3 5 2
        c0 c1 c2 c3 c4 c5 c6 c7
r0  R=2  .  .  o  .  .  .  o  .
r1  R=4  .  .  .  .  .  .  .  .
r2  R=5  .  o  .  .  .  .  .  .
r3  R=3  .  .  .  .  .  .  .  .
r4  R=4  .  .  .  .  .  .  .  o
r5  R=5  o  .  .  .  .  .  .  .
r6  R=3  .  .  .  .  .  .  .  .
r7  R=2  .  .  .  .  .  .  .  .
        sum=28                  sum=28
```

Pre-fill blockers occupy (0,2), (0,6), (2,1), (4,7), (5,0). Already 5 cells "filled". Player must add 23 more.

Tray (3 slots, refilled when all empty):
- T-tetromino (4 cells)
- L-tetromino (4 cells)
- 1×3 bar (3 cells)

Forward-sim guarantees a legal sequence exists matching the unique target.

---

## Move 1

**Decisions available:**

a. T-tetromino (3-wide top, 1 stem) at row 0, cols 3–5 (stem down to r1c4). Adds (0,3)(0,4)(0,5)(1,4). r0 fills 3 cells (already has 2 blockers => post-place = 5; target=2; OVER by 3).
b. T-tetromino with stem up, footprint (1,3)(1,4)(1,5)(0,4). r0 gains 1 (=>3, over by 1); r1 gains 3 (target 4, fine).
c. T-tetromino sideways at r3 cols 0–1 stem at (4,1)? r3 gains 2, r4 gains 1, all under target — safe.
d. 1×3 bar at row 1 cols 5–7. r1 +3, c5 +1, c6 +1, c7 +1. r1=3 (target 4 — under, fine).
e. L-tetromino at r6c4..r7c5 (4 cells). r6 +2, r7 +2, both within targets.

**Future states for each:**

a. Over-fills row 0 immediately. Forces a row-0 clear later as the only escape — but row 0 has only 8 cells and target=2, so a clear that empties row 0 then needs the player to *re-fill* exactly 2 — and the blockers at (0,2) and (0,6) re-emerge nowhere (blockers are not re-spawned by clear). Wait — pre-fill blockers ARE just colored cells; clearing wipes them too. So a r0 clear removes blockers and target requires 2 cells in r0 — placeable. But it costs a piece.
b. Mild risk; r0 needs to lose 1 (currently 3 — must be reduced to 2). Only line clears can reduce. Sets up a c4 column situation: c4 target=4, currently 2.
c. Safe / no constraint violation; consumes a piece without producing information beyond "r3,r4,c0,c1 are partially constrained."
d. Probes r1 / c5,c6,c7 simultaneously — gives multi-row-multi-col deltas, high info per move.
e. Probes the bottom-right corner including r7. r7 target=2, gain 2 — saturates r7. After this any further r7 placement is illegal (over).

**Information player is using:** the marginals R/C; the blocker positions (visible); cumulative deltas; the tray composition; forward-deduction over which cells are *forced* by margins+pieces (e.g. r5 target=5, with blocker at (5,0), needs 4 more in r5 across 7 cells → 3 must remain empty — narrows quickly).

**New question vs Classic:** "which placements yield maximum disambiguation per cell while never over-counting any row/column?" Classic asks geometry only.

**Pick:** **(d) — 1×3 bar at r1 cols 5–7.** Information-rich, safe. Resolves the rightmost column band: c7 target=2 currently has 1 blocker (4,7) → after placement c7=2 (one more cell at (1,7)). c7 is now SATURATED at 2 — every other r in c7 must end empty.

After move 1:
```
       C: 4 3 5 2 4 3 5 2
        c0 c1 c2 c3 c4 c5 c6 c7
r0  R=2  .  .  o  .  .  .  o  .
r1  R=4  .  .  .  .  .  #  #  #
r2  R=5  .  o  .  .  .  .  .  .
r3  R=3  .  .  .  .  .  .  .  .
r4  R=4  .  .  .  .  .  .  .  o
r5  R=5  o  .  .  .  .  .  .  .
r6  R=3  .  .  .  .  .  .  .  .
r7  R=2  .  .  .  .  .  .  .  .
```
Deltas: r1 needs 1 more, c5 needs 2 more, c6 needs 4 more, c7 needs 0 more (locked).

---

## Move 2

Tray now: T, L, (1×3 consumed → empty slot, refills with: 2×2 square).

**Decisions:**

a. T-tet at (3,4) stem-up: cells (3,4)(3,5)(3,6)(2,5). c4+1,c5+2,c6+1; r2+1,r3+3 (r3 target=3, saturates).
b. L-tet at (5,1)..(7,2) standing-L: 4 cells in c1, c2. r5 target=5, has 1 blocker (5,0) → +1 in c1 = good. But c1 target=3 has 1 blocker (2,1), needs 2 more.
c. 2×2 at (6,3): (6,3)(6,4)(7,3)(7,4). r6+2, r7+2 (saturates r7 at 2).
d. T-tet at (5,2) stem at (5,3): cells (4,2)(5,2)(5,3)(6,2)? Or T sideways. Many T orientations. Pick (4,3)(5,3)(6,3)(5,4). r4+1,r5+2,r6+1; c3+3 (target 2 — OVER by 1).

**Future states:**

a. Saturates r3 quickly, locks 5 r3 cells empty — enormous deduction value.
b. Builds left column structure; c1 needs 2 cells in cols-c1 across rows where possible. After: c1 has 2 player + 1 blocker = 3 (saturates c1).
c. Saturates r7 in safe location; c3 +1 (=1, target=2), c4 +1 (=1, target=4).
d. Over-fills c3. Rejected.

**Player reasoning:** r3=3, r7=2 are tight. Saturating low-count rows early means the rest of the board has fewer degrees of freedom. Choice between (a) and (c) is the real one. (a) gives 4 cells of placement and saturates r3; (c) gives 4 cells, saturates r7, also adds to c3,c4.

**New question:** "which saturation maximally constrains remaining tray fits?"

**Pick:** **(a) — T-tet stem-up at r3 row.** Saturates r3; plus c5 progress (c5: 2 placed in r1 + 2 here = need 1 more; target 3, on track).

After move 2:
```
       C: 4 3 5 2 4 3 5 2
        c0 c1 c2 c3 c4 c5 c6 c7
r0  R=2  .  .  o  .  .  .  o  .
r1  R=4  .  .  .  .  .  #  #  #
r2  R=5  .  o  .  .  .  #  .  .
r3  R=3  .  .  .  .  #  #  #  .
r4  R=4  .  .  .  .  .  .  .  o
r5  R=5  o  .  .  .  .  .  .  .
r6  R=3  .  .  .  .  .  .  .  .
r7  R=2  .  .  .  .  .  .  .  .
```
r3 saturated. c5: 3/3 saturated. c6: 2/5. c7 saturated. r2: 4 needed (currently 2 with blocker+placed).

---

## Move 3

Tray: L (still), 2×2 (still), refill T → tray now has L, 2×2, T (one slot still T from new fill).

Wait — slots refill only when all empty. Currently L and 2×2 still in tray. So tray = [L, 2×2, empty/awaiting] — actually with 3-slot tray + standard rules, refill is when all empty. Since 2 are present, no refill. Tray = [L, 2×2].

**Decisions:**

a. L at (4,0): cells (4,0)(5,1)(6,1)(7,1)? L shape various. Place L vertical at c1: (4,1)(5,1)(6,1)(7,1) — 4 cells in c1. c1 target=3 has 1 blocker → +4 = 5, over by 2. Reject.
b. L horizontal at (5,1): (5,1)(5,2)(5,3)(6,3). r5+3 (=4 with blocker, need 5 total, +1 left); r6+1; c1+1, c2+1, c3+2 (target=2, saturates c3).
c. 2×2 at (6,1): (6,1)(6,2)(7,1)(7,2). r6+2 (need 1 more after), r7+2 (saturates), c1+2 (=3 saturates), c2+2.
d. L at (4,2): (4,2)(4,3)(4,4)(5,4) — fills row 4 partly, r4 target=4 +3=3, c4 target=4 currently 1 (from move 2 r3c4). Valid.

**Tradeoffs:** (b) saturates c3 but r5 still under; (c) saturates r7 + c1 simultaneously, big deduction; (d) builds the central middle.

**Pick:** **(c) — 2×2 at (6,1).** Multi-saturation.

After move 3:
```
       C: 4 3 5 2 4 3 5 2
        c0 c1 c2 c3 c4 c5 c6 c7
r0  R=2  .  .  o  .  .  .  o  .
r1  R=4  .  .  .  .  .  #  #  #
r2  R=5  .  o  .  .  .  #  .  .
r3  R=3  .  .  .  .  #  #  #  .
r4  R=4  .  .  .  .  .  .  .  o
r5  R=5  o  .  .  .  .  .  .  .
r6  R=3  .  #  #  .  .  .  .  .
r7  R=2  .  #  #  .  .  .  .  .
```
r7 saturated. c1 saturated. c2 has 2/5.

---

## Move 4

Tray: L, refill triggered? No — L still present; 2×2 consumed, 1 slot free but not all empty → no refill. Tray = [L].

Hmm — only 1 piece. Standard Blockit refills only when all 3 empty. So we live with 1.

**Decisions for L (4-cell):**
Many origins. The constraints push us:
- r5 needs 4 more cells (in r5: cols 1,2 are NOT allowed (c1 saturated, c2 has room), wait: c1 has 3/3 placed (blocker at 2,1 + (6,1)+(7,1)) = 3, saturated. So (5,1) ILLEGAL by target. But the placement legality is just geometry — over-count produces a delta but doesn't reject. Player can't be stopped from placing wrong, but can never WIN from it without a clear to undo.

This is the key gameplay loop: every placement is BOTH a piece-fit and a count-deduction.

a. L at (4,2): footprint touching r4,r5,c2,c3. r5 +1, r4 +2, c2 +1, c3 +1.
b. L at (2,2): vertical L in r2..r4 area: (2,2)(2,3)(3,2)... wait r3 saturated.
c. L at r4, horizontal: (4,2)(4,3)(4,4)(5,4). Hits c4 +2, r4 +3, r5 +1.
d. L at r5: (5,2)(5,3)(5,4)(6,4)? r5 +3, r6 +1, c4 +1, c2 +1, c3 +1.

c4 target=4, currently 1. c5 saturated. c6 target=5 currently 2. c0 target=4, currently 1 (just blocker). c2 target=5 currently 2.

**Pick:** **(d) — L vertical-bend at (5,2).** Adds r5 +3 (now 4/5, need 1 more), r6 +1 (3/3 saturates r6).

After move 4:
```
r0  .  .  o  .  .  .  o  .
r1  .  .  .  .  .  #  #  #
r2  .  o  .  .  .  #  .  .
r3  .  .  .  .  #  #  #  .
r4  .  .  .  .  .  .  .  o
r5  o  .  #  #  #  .  .  .
r6  .  #  #  .  #  .  .  .
r7  .  #  #  .  .  .  .  .
```
r6: blockerless count 3 (cells at c1,c2,c4) → need r6=3, saturated. c4 has 2/4. c3: 1/2.

---

## Move 5

Tray was [L] now [], refill: T, 1×3, S-tet.

**Decisions for tray [T, 1×3, S]:**

Constraints summary:
- r0 needs to gain 0 more (already 2 blockers); but blockers are (0,2)(0,6) → if target requires those EXACT cells empty/filled? Target row count is 2, we have 2 blockers (filled). So r0 must end with NO additional cells filled. But what about the EXACT pattern? Target says 2 cells in r0 — could be the 2 blockers, or could be 2 OTHER cells in r0 (with blockers cleared). Since the ONLY way to clear blockers is via row/col clear, and r0 mostly empty, easier path is to keep blockers. Player infers: leave r0 alone.
- r1 needs 1 more cell (in c0, c1, c2, c3, c4 — c5,c6,c7 already filled in r1, and c1 saturated) — so r1's extra goes in c0, c2, c3, or c4.
- r2 needs 3 more cells (currently has blocker at c1 + (2,5)=2). c1 sat, c5 sat, c7 sat. So extras in r2 from c0, c2, c3, c4, c6.
- r4 needs 3 more (currently 1 blocker only). c5 sat, c7 sat (blocker), c1 sat. So r4 extras in c0,c2,c3,c4,c6.
- r5 needs 1 more, in c5/c6/c7? c5 sat, c7 sat, c1 sat — so c0 (blocker present, can't), c6 only really → (5,6).
- c0 needs 3 more (target 4, has blocker at (5,0)). Available empty cells in c0: r0,r1,r2,r3,r4,r6,r7 (not r5).
- c2 needs 3 more (5-2=3). Empty c2 cells: r0 has blocker, r1, r2, r3 sat, r4. So 3 cells from {r1c2, r2c2, r4c2}. That's exactly 3 — DETERMINED. r1c2, r2c2, r4c2 all must fill.
- c3 needs 1 more (target 2, has 1). c3 empty: r0, r1, r2, r4, r6 sat=already filled? r6c3 is empty in current board. Let me recheck — yes r6c3 = '.'. So c3 needs 1 more from {r0, r1, r2, r4}.
- c4 needs 2 more (target 4). c4 cells filled: r3,r5,r6 = 3 wait that's already 3, target=4 means need 1 more. From {r0,r1,r2,r4}.
- c6 needs 3 more (target 5, currently 2 = blocker(0,6) + (3,6)). Empty c6: r1 sat, wait r1c6 is FILLED (#). r2c6 empty, r4c6 empty, r5c6 empty, r6c6 empty, r7c6 empty. Need 3.

A LOT of cells become determined by intersection. Player executes deduction.

This is the genuinely interesting move — pure deduction. Player computes:
- r1 extras: 1, in {c0,c2,c3,c4}. From c2-determination, r1c2 fills. So r1c2 IS the one. r1 extras done.
- r2 extras: 3, in {c0,c2,c3,c4,c6}. r2c2 (forced). 2 more from {c0,c3,c4,c6}.
- r4 extras: 3, in {c0,c2,c3,c4,c6}. r4c2 forced. 2 more from {c0,c3,c4,c6}.
- c3 needs 1 of {r0,r1,r2,r4}. r1's extra is c2 only. r0 stays empty. So c3's 1 cell is r2c3 OR r4c3.
- c4 needs 1 of {r0,r1,r2,r4}. r1=c2, r0 empty. So r2c4 OR r4c4.
- c6 needs 3 of {r2,r4,r5,r6,r7}. r5c6 must be the "1 more" for r5 (since r5 only has c6 available!). So r5c6 forced. c6 needs 2 more from {r2,r4,r6,r7}. r6 saturated (has 3 cells already), so NOT r6. So r6c6 NOT. → c6 needs 2 from {r2,r4,r7}. r7 needs 0 more (saturated at 2)? Yes r7 saturated. So NOT r7. → c6 needs 2 from {r2, r4} — both forced!
- Therefore r2c6 and r4c6 BOTH FORCED.
- r2 used c2 + c6 = 2; needs 3 — 1 more from {c0,c3,c4}.
- r4 used c2 + c6 = 2; needs 3 — 1 more from {c0,c3,c4}.
- c0 needs 3 from {r0,r1,r2,r3,r4,r6,r7}. r0 stays empty, r1 done, r3 sat, r6 sat, r7 sat. → from {r2, r4} only — but only 2 candidates, need 3. CONTRADICTION.

This means the player needs a clear to resolve. r0c0 or similar must fill — meaning r0 must gain cells, then row clear of r0, then re-emptied with new blocker pattern. Very deep deduction.

Actually re-examining: r6 is saturated at 3 (target 3 met by current 3 cells). If c0 needs r6c0, then r6 would go to 4 — must lose a cell elsewhere. Only way: clear a column passing through r6. e.g. clear c1 (but c1 saturated, but it's not full — c1 has 3 cells of 8). Lines clear when all 8 are filled, not when target is met. So c1 cannot clear without filling more cells in c1 (which over-counts).

There's a snarl. The player realizes target SHAPE must be reconsidered: maybe c0 target = 4 means 3 above r5's blocker, and the puzzle path requires a CLEAR. This is the deduction game.

**Pick:** **1×3 horizontal at (4,2)** — places r4c2, r4c3, r4c4. Resolves r4c2 (forced) + r4c3 OR r4c4 ambiguity (commits to filling both). Player suspects c3 = r4c3 and c4's last is r4c4.

After move 5:
```
r0  .  .  o  .  .  .  o  .
r1  .  .  .  .  .  #  #  #
r2  .  o  .  .  .  #  .  .
r3  .  .  .  .  #  #  #  .
r4  .  .  #  #  #  .  .  o
r5  o  .  #  #  #  .  .  .
r6  .  #  #  .  #  .  .  .
r7  .  #  #  .  .  .  .  .
```
Now r4=4 saturated. c3 has 2/2 saturated. c4 has 4/4 saturated.

But wait — player committed prematurely; what if target had c3 filled at r2c3 not r4c3? Now over-count in c3 if r2c3 also was needed. The deduction would have to revise.

Actually after this move c3 is saturated at 2 (r3c3? no — r3 has r3c4,c5,c6 from T placement in move 2. c3 cells filled now: r4c3, r5c3 — that's 2. Yes c3=2/2 saturated.) c4 cells filled: r3c4, r4c4, r5c4, r6c4 = 4/4 saturated. Good.

c0 still needs 3 cells with only r2, r4 (r4 saturated now → not r4) — only r2 available — IMPOSSIBLE. Player realises previous deduction was wrong: c0 target may not be 4, OR the player was filling cells inconsistent with target.

**This is the critical moment.** Either:
1. The player had complete information and computed correctly → puzzle is over-constrained → puzzle was bad.
2. The player misread/missed a path involving line clears.
3. The placement they just made was wrong — and there's no UNDO in standard Blockit puzzle — game over.

---

## Move 6 — diagnosis

Tray remaining: T, S-tet.

If c0 truly needs 3 cells and only r2 is available → puzzle unwinnable from this state. The player has lost.

But forward-sim guarantees at least ONE valid sequence existed. The player's move 5 must have been suboptimal.

The actual generated solution path was probably: keep r4 partially open, place a piece into c0 first.

---

## Verdict for C13

**Question persists?** YES — every move is a fresh deduction step over the marginals. The player is constantly computing forced cells, ambiguous cells, and disambiguation moves. Strong NEW question.

**Trade-off space alive?** Partially. The trace shows clear strategic choices early (saturate-rare-row vs probe-rare-column vs build-from-determined-cells). But by move 5–6, the deduction tree narrows to a handful of forced sequences — there is essentially one correct continuation. Multiple early STRATEGIES exist (greedy-saturate vs build-from-blockers vs probe-corners) but they converge.

**Difficulty curve plausible?** Engaging through move 5 — the deduction goes from "many options" to "FEW forced cells" to "narrow logical chains" — exactly like a nonogram. This is a known good puzzle shape.

**However — STRUCTURAL CONCERNS revealed by the trace:**

1. **No undo / one wrong placement = unwinnable.** Standard Blockit has no undo. With ~28 cells and finite tray, ONE bad placement that over-counts a row irrecoverably loses the puzzle. The deduction game requires perfect play. This is anti-fun unless paired with explicit "check this placement against target" feedback or undo. The mode plays like Picross but with PERMANENT INK.

2. **The "uniqueness" filter is the whole game.** Without it, two boards match the marginals → player guesses. With it (computationally expensive), the puzzle has a forced solution and feels like reading a recipe.

3. **The placement primitive is compromised.** Pieces are 3–5 contiguous cells; their geometry adds a hard constraint orthogonal to the deduction. Sometimes the ONLY logically-correct cell to fill cannot be reached by any tray piece without also filling a wrong cell. The mode pits geometry against deduction in a way where one always loses.

4. **Tray RNG kills determinism.** Forward-sim guarantees the sampled tray works. But the player sees a tray and must deduce the solution; if the player's deduction doesn't match the generator's RNG-chosen path, the player may identify the unique target correctly but be unable to FILL it with the tray they have. (The uniqueness filter handles target-uniqueness, not piece-routing-uniqueness.)

5. **Information overload.** 16 marginals + visible blockers + delta indicator + 3 tray pieces + 64 board cells. The cognitive load per move is closer to a 30-minute Picross than a 30-second Blockit move. Mode-fit risk.

**Verdict: REJECT.**

Reasoning: the trace exposes that the mode is essentially Picross-with-pieces. Picross is a great game, but this implementation has (a) no undo/checkpoint, making any over-fill irrecoverable; (b) a piece-geometry constraint that fights the deduction primitive rather than cooperating with it; (c) deduction collapses to forced-cell chains, eliminating real strategic branching mid-puzzle; and (d) requires an expensive uniqueness filter that the design itself flags as a build-loop bottleneck. The "new question" exists but is asked in a fundamentally different game's voice — it doesn't extend Blockit, it replaces it.

The most interesting insight: **the mode collapses Blockit's "any reasonable placement that fits" into a Picross "the unique correct cell" — and the piece geometry can outright forbid the unique correct cell, creating no-win states the player can detect but not escape.**
