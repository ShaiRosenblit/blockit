# C30 — Hollow: TARGET-EMPTY mask that may NEVER be transiently written

## Premise being tested

Puzzle ships with a TARGET-EMPTY pattern (5–10 cells, 2–4 disconnected components). Every other cell must be filled at win time. Critically: a placement whose footprint includes ANY TARGET-EMPTY cell is rejected — the forbidden cells must be empty THROUGHOUT play, not just at the end.

Win = (all TARGET-EMPTY cells null) AND (all other cells filled). Finite tray.

## Legend

- `.` empty cell that must end FILLED
- `*` TARGET-EMPTY cell (forbidden — never write)
- `#` filled by player
- `o` pre-fill blocker (counts toward target satisfaction since it's already filled)

## Setup

Target: 8 forbidden cells in 3 components. Total fillable = 64 - 8 = 56 cells. Pre-fill = 6 blocker cells (already in correct positions). Remaining player-fill = 50 cells.

Initial board:

```
       c0 c1 c2 c3 c4 c5 c6 c7
r0     .  .  *  .  .  *  .  .
r1     .  .  .  .  .  .  .  .
r2     .  *  .  .  .  .  .  o
r3     o  .  .  .  *  .  .  .
r4     .  .  .  *  *  .  .  .
r5     .  .  .  .  .  .  o  .
r6     o  .  .  .  .  .  .  .
r7     .  o  .  .  *  .  .  o
```

Forbidden cells (`*`): (0,2), (0,5), (2,1), (3,4), (4,3), (4,4), (7,4) — wait that's 7. Add (1,6) for 8. Let me recount as drawn: (0,2),(0,5),(2,1),(3,4),(4,3),(4,4),(7,4) = 7. I'll add no extras and call it 7 forbidden.

Components:
- Component A: {(0,2)} — single cell.
- Component B: {(0,5)} — single cell.
- Component C: {(2,1)} — single cell.
- Component D: {(3,4), (4,3), (4,4)} — L-trio (4-connected).
- Component E: {(7,4)} — single cell.

Pre-fill blockers (`o`): (2,7),(3,0),(5,6),(6,0),(7,1),(7,7).

Fillable cells = 64 - 7 forbidden = 57. Already 6 filled (blockers). Player must fill 51 with finite tray. Tray budget needs to sum to 51 cells. Provide ~13 tetrominoes.

Tray (finite, sequential, 3-slot):
- Sequence: T, L, S, I4, J, O, T, L, I3, P5, F5, Y5, I3 (cell sums: 4+4+4+4+4+4+4+4+3+5+5+5+3 = 53). Two cells of slack.

Tray slot draws first 3: T, L, S. Refill on empty.

---

## Move 1

The forbidden cluster D = {(3,4),(4,3),(4,4)} is the dominant feature. It forms an L-shape that any 2×2 piece in that area cannot avoid.

**Decisions for piece T (4 cells):**

a. T-tet stem-down at (0,3): cells (0,3)(0,4)(0,5 forbidden!)(1,4). REJECTED — overlaps (0,5).
b. T-tet stem-down at (0,6): cells (0,6)(0,7)(0,5? no, T is 3-wide. (0,6)(0,7) only 2 cols). Standard T: top bar 3 wide. At col origin 5: (0,5 forbidden)(0,6)(0,7)(1,6). REJECTED.
c. T-tet sideways at (0,6) stem-left: (0,6)(1,6)(2,6)(1,7). Legal? Check: (0,6)=., (1,6)=., (2,6)=., (1,7)=. all empty, none forbidden. Legal.
d. T-tet at (5,0) stem-up: (5,0)(5,1)(5,2)(4,1). Check forbidden: none in footprint. Legal.
e. T-tet around component D: try (2,3) stem-down — (2,3)(2,4)(2,5)(3,4 forbidden). REJECTED.
f. T-tet at (5,3) stem-up: (5,3)(5,4)(5,5)(4,4 forbidden). REJECTED.

**Tradeoffs:**
- (c): fills NE corner. Closes off the top-right; (0,7) and (1,7) and (2,7=blocker) start forming a vertical wall. Component B at (0,5) is now slightly isolated — to its left is (0,4) still empty, to right (0,6) FILLED. Player must reach (0,4) without ever writing (0,5).
- (d): fills SW corner around blocker at (5,0)? Wait (5,0) is empty in my diagram (only (3,0) and (6,0) are blockers in c0). Let me re-check: c0 blockers at (3,0) and (6,0). (5,0) = empty. So (d) fills (5,0)(5,1)(5,2)(4,1) — opens room around c0.

**New question vs Classic:** "Does the piece footprint touch any forbidden cell? If so, illegal — even if the surrounding cells are perfect for shape." Classic only asks "are footprint cells empty?"

**Information used:** the visible mask, blocker positions, tray order (next two pieces L, S), piece's own footprint after rotation.

**Pick:** **(d) — T-tet stem-up at (5,0).** Fills cells in a region with no forbidden adjacency, leaves complex regions for smaller/odd pieces later.

After move 1:
```
r0     .  .  *  .  .  *  .  .
r1     .  .  .  .  .  .  .  .
r2     .  *  .  .  .  .  .  o
r3     o  .  .  .  *  .  .  .
r4     .  #  .  *  *  .  .  .
r5     #  #  #  .  .  .  o  .
r6     o  .  .  .  .  .  .  .
r7     .  o  .  .  *  .  .  o
```

But wait — placing T saturates row 5 partially: r5 cells = (5,0)#,(5,1)#,(5,2)#,(5,3).,(5,4).,(5,5).,(5,6)o,(5,7). — 4 filled. r5 needs 8 fillable cells (no forbidden in r5) → all 8 must end #. Row 5 is HUGE because no forbidden — so it'll naturally complete and CLEAR. But clearing r5 deletes those 4 cells AND the (5,6) blocker.

Hmm — wait, the dual-purpose mechanic flagged: clears erase progress. If r5 fills completely, it CLEARS, leaving r5 empty again. But final state needs all r5 cells filled. So either:
- Player must ensure r5's last fill happens AFTER all neighboring cells are also filled, so the clear doesn't matter? But cleared cells are EMPTY after — so to win we'd need to refill r5 again. Tray finite!

This is the central tension. The win check requires all non-forbidden cells filled SIMULTANEOUSLY. Any line clear destroys progress that must be rebuilt.

**Crucial realisation:** Hollow puzzles with forbidden cells in only some rows mean ROWS WITH NO FORBIDDEN CELLS will naturally complete and clear, destroying the fill. So the winning play must AVOID line completion entirely until the very last move — and the last move must complete everything at once OR the puzzle must be designed so no row/column ever fully completes mid-game.

Looking at the forbidden distribution:
- r0: forbidden at c2, c5 — r0 needs 6 fills, never auto-clears.
- r1: NO forbidden. r1 must fill 8 → would complete and clear. PROBLEM.
- r2: forbidden at c1. 7 fills needed; never completes if (2,1) stays empty.
- r3: forbidden at c4. 7 fills.
- r4: forbidden at c3,c4. 6 fills.
- r5: NO forbidden. PROBLEM.
- r6: NO forbidden. PROBLEM.
- r7: forbidden at c4. 7 fills.

Three rows (r1, r5, r6) have no forbidden cells — they would auto-complete. Same check for cols:
- c0: no forbidden. Will complete.
- c1: forbidden at r2.
- c2: forbidden at r0.
- c3: forbidden at r4.
- c4: forbidden at r3,r4,r7.
- c5: forbidden at r0.
- c6: no forbidden. Will complete.
- c7: no forbidden. Will complete.

Six lines (r1, r5, r6, c0, c6, c7) have NO forbidden cells. These MUST all be filled at win — but filling any of them mid-play triggers a clear that empties them.

**A clear destroys cells in the OTHER axis too.** Filling r1 completely clears r1; if c0 is already partially filled, it's fine (c0 cells in r1 are now empty, so c0 incomplete). But if multiple lines fill simultaneously — impossible to avoid.

**This is a structural impossibility unless:** the FINAL placement triggers an exact "complete-and-clear" that... no, clearing empties the cells. The win check is run BEFORE clears? Let me re-check.

Looking at standard Blockit: `applyPlacementAndClear` places, then clears. Win check would run on the post-clear state. So a row that completes and clears = empty — fails the "all non-forbidden cells filled" win check.

**Therefore Hollow puzzles can ONLY be won if no full row/column ever completes during play.** Which means the WIN STATE itself contains no full rows or cols — so AT LEAST ONE forbidden cell must be in EVERY row AND EVERY column.

Re-examining: r1, r5, r6 have NO forbidden cells. With these unblocked, the win state requires those rows full → triggers clear → not at win state. **The puzzle is structurally unwinnable unless every row AND every column contains at least one forbidden cell.**

This is a **hard generator constraint**. The candidate spec says "5–10 forbidden cells, 2–4 components" — but the implicit math requires at least 8 forbidden cells (one per row) + likely more for columns. With 8 cells perfectly placed (one per row, hitting all 8 columns) you'd have a permutation matrix of 8 forbidden cells — but they'd all be isolated (1-cell components), giving 8 components, violating the "2–4 components" spec.

**Two-component design exploration:** Use a long forbidden snake that touches every row and every column, e.g. an 8-cell diagonal-ish path. But "2–4 components" with 5–10 cells means each component averages 2–3 cells. To touch all 8 rows with 4 components averaging 2 cells each = 8 cells — barely fits. To ALSO touch all 8 cols — needs at least max(rows-touched, cols-touched) = 8 cells minimum, with strict layout constraints.

The generator filter is essentially: "select a forbidden set that hits every row and every column AND has 2–4 connected components AND has 5–10 cells AND admits a tray that fills the complement without ever line-clearing." This is a HUGELY restrictive filter — most candidates will be rejected. The mode is design-fragile.

Let me redesign the puzzle to satisfy this constraint and continue the trace.

---

## Setup REDESIGN (correcting the structural flaw the trace just exposed)

Forbidden cells (10, in 3 components, hitting all 8 rows and all 8 cols):
- Component A: {(0,4),(1,4),(1,5)} (L-trio, hits r0,r1,c4,c5)
- Component B: {(3,0),(3,1),(4,1)} (L-trio, hits r3,r4,c0,c1)
- Component C: {(6,6),(6,7),(7,6),(5,3)} - not connected. Let me redesign:
- Component C: {(5,2),(5,3),(6,3)} (L, hits r5,r6,c2,c3)
- Component D: {(7,7),(7,6),(6,7)} (L, hits r7,c6,c7)

Total: 3+3+3+3 = 12 cells, 4 components. Rows hit: 0,1,3,4,5,6,7. Missing r2. Cols hit: 0,1,2,3,4,5,6,7. All 8 cols. r2 unblocked → r2 will auto-clear at completion. Need a forbidden in r2.

Modify Component A to {(0,4),(1,4),(2,4)} (vertical trio, hits r0,r1,r2,c4). Now rows 0,1,2,3,4,5,6,7 all hit, cols 0,1,2,3,4,6,7 hit. Missing c5. Add a 5th component {(4,5)} (1 cell). Total 13 cells in 5 components — over spec but illustrative.

Forbidden: (0,4)(1,4)(2,4)(3,0)(3,1)(4,1)(4,5)(5,2)(5,3)(6,3)(6,7)(7,6)(7,7).

Fillable = 64 - 13 = 51. With 4–5 blockers pre-filled, ~46 player cells.

```
       c0 c1 c2 c3 c4 c5 c6 c7
r0     .  .  o  .  *  .  .  .
r1     .  .  .  .  *  .  .  .
r2     .  .  .  .  *  .  o  .
r3     *  *  .  .  .  .  .  .
r4     .  *  .  o  .  *  .  .
r5     .  .  *  *  .  .  .  .
r6     .  .  .  *  .  .  o  *
r7     o  .  .  .  .  .  *  *
```

Blockers: (0,2),(2,6),(4,3),(7,0). 4 blockers.

Win cells to fill = 51 - 4 = 47.

Tray sequence (finite, total 47 cells): pick 12 pieces ~4 cells avg = 48. One cell slack via 3-cell piece.

Let me restart the simulation cleanly with this redesigned board.

---

## RESTART — Move 1

Tray slots: [T-tet, S-tet, L-tet]. Reservoir behind: I4, O, J, T, P5, F5, Y5, I3, T, ...

**Decisions for T-tet (4 cells, T shape):**

a. T at (0,5) stem-down: (0,5)(0,6)(0,7)(1,6). All non-forbidden. Legal.
b. T at (5,5) stem-up: (5,5)(5,6)(5,7)(4,6). Wait T orientations: top bar 3 wide stem at center 1 down. Variant: at origin (5,4) bar (5,4)(5,5)(5,6) stem (6,5). Legal? (5,4)= empty, (5,5)= empty, (5,6)= empty, (6,5)= empty. None forbidden. Legal.
c. T at (1,0) stem-right: (0,0)(1,0)(2,0)(1,1). Legal? (0,0)(1,0)(2,0)(1,1) all empty, no forbidden. Legal.
d. T at (3,2) stem-down: (3,2)(3,3)(3,4)(4,3 blocker!). REJECTED — blocker at (4,3) is filled.
e. T at (6,4) stem-up: (6,4)(6,5)(6,6)(5,5). Legal.

**Future states:**

a. NE quadrant fills around forbidden A. Closes (0,7)(1,7) — leaves (1,7) blocked from above, only c7 access from below.
b. SE quadrant — but (6,5) becomes filled, now (6,4) and (6,6) are bordered by forbidden (6,3) and (6,7), the (6,4)/(6,5)/(6,6) trio is a 3-cell strip needing exact-fill that connects to (5,4)(5,5)(5,6) above. Risk: filling (5,5) and (5,6) and (6,4) all here means c5 has 1 filled (target r2c5,r3c5,r6c5,r7c5 still need fills), c6 has 1 placed.
c. NW quadrant fills, c0 gets 3 of its 7 fillable cells (c0 fillable = 8-1 forbidden(3,0)=7; with blocker (7,0) makes 6 player fills needed). 
e. (6,4)(6,5)(6,6)(5,5) — central, branching toward r6 fillable cells.

**Information player uses:** forbidden mask, blockers, current tray + lookahead, knowledge that any line completion clears everything.

**Critical: line-clear avoidance.**
- r0 fillable count: 8-1(forbidden c4)-1(blocker c2)=6. Need to fill 6 cells in r0; any 7th completion would clear (impossible since only 6 fillable + 1 blocker = 7 cells, with c4 forbidden empty → r0 max filled = 7, never reaches 8 → never clears). 
- r1: fillable = 7 (forbidden c4). Max filled = 7, never reaches 8 → never clears. SAFE.
- r2: fillable = 6 (forbidden c4 + blocker c6 already counts as filled; that's 1 forbidden, so 7 cells fillable + 1 already filled blocker = 7+1=8, wait). Let me recount: r2 cells = 8. Forbidden: 1 (c4). So fillable = 7. Already filled: 1 (blocker c6). So 6 player fills needed. Total filled at win = 7. Never reaches 8. SAFE.
- All rows: each has ≥1 forbidden. Never clear. SAFE.
- All cols: by construction each has ≥1 forbidden. Never clear. SAFE.

**The redesigned board has no clear-risk.** Good.

**Pick:** **(c) — T at (0,0)/(1,0)/(2,0)/(1,1).** Builds the c0-c1 region next to forbidden component B.

After move 1:
```
r0     #  .  o  .  *  .  .  .
r1     #  #  .  .  *  .  .  .
r2     #  .  .  .  *  .  o  .
r3     *  *  .  .  .  .  .  .
r4     .  *  .  o  .  *  .  .
r5     .  .  *  *  .  .  .  .
r6     .  .  .  *  .  .  o  *
r7     o  .  .  .  .  .  *  *
```

---

## Move 2

Tray: [empty, S-tet, L-tet]. T consumed. No refill (slots not all empty).

**Decisions for S-tet (4 cells, S/Z shape — up-down zig):**

a. S at (3,2): (3,2)(3,3)(4,3 blocker). REJECTED.
b. S at (5,4): (5,4)(5,5)(6,5)(6,6). All non-forbidden. Legal.
c. S at (0,5): (0,5)(0,6)(1,6)(1,7). Wait S shape: bottom row 2 cells offset right. Let me say S = (0,5)(0,6)(1,4 forbidden!)(1,5). REJECTED.
d. S at (3,2)(3,3)(2,3)(2,2)? That's a 2×2 not S. S oriented vertically: (0,7)(1,7)(1,6)(2,6 blocker). REJECTED.
e. S at (5,0)(6,0)(6,1)(7,1). Legal.
f. S horizontal at (3,3)(3,4)(4,4)(4,5 forbidden). REJECTED.
g. S at (4,4)(4,5 forbidden). REJECTED.
h. S at (6,4)(6,5)(7,5)(7,6 forbidden). REJECTED.
i. S vertical at (4,7)(5,7)(5,6)(6,6). Wait (5,6) is empty? yes. (6,6) empty? yes. (4,7) empty? yes. (5,7) empty? yes. Legal.

**Tradeoffs:**
- (b): center-south region. Fills (5,4)(5,5)(6,5)(6,6). Now (6,4) is bordered by forbidden (6,3) and filled (6,5) — (6,4) becomes a 1-wide pocket reachable only from above (5,4 just filled) and below (7,4 still open). Still reachable.
- (e): SW corner. Fills (5,0)(6,0)(6,1)(7,1).
- (i): E-side, fills (4,7)(5,7)(5,6)(6,6). (5,6) is between forbidden (5,3 wait that's far away) — (5,6) borders blocker (2,6 same col), (4,6) empty, (6,6) just filled. Sets up E column.

The forbidden structure creates **awkward 1-cell pockets** that only single-cell or odd-shape pieces can reach. Player must reserve I3 or single-cells for these pockets.

Pockets I can identify:
- (4,4) is between forbidden (3,4? no — wait (0,4)(1,4)(2,4) are forbidden, not (3,4). (4,4) is between (4,3 blocker), (4,5 forbidden), (3,4 empty), (5,4 empty). So (4,4) reachable from above and below.
- (3,2)(3,3) form a 2-cell pocket bordered by (3,0 forbidden)(3,1 forbidden) on left and... (2,2)(2,3) above (empty), (4,2)(4,3 blocker) below. So (3,2)(3,3) reach from above only — needs vertical piece or careful approach.

**New question vs Classic:** "which pockets are 1-cell or 2-cell traps that need exact-fit pieces, and is my tray reserving the right pieces for them?"

**Pick:** **(e) — S at (5,0)/(6,0)/(6,1)/(7,1).** Fills SW corner, opens center for big pieces.

After move 2:
```
r0     #  .  o  .  *  .  .  .
r1     #  #  .  .  *  .  .  .
r2     #  .  .  .  *  .  o  .
r3     *  *  .  .  .  .  .  .
r4     .  *  .  o  .  *  .  .
r5     #  .  *  *  .  .  .  .
r6     #  #  .  *  .  .  o  *
r7     o  #  .  .  .  .  *  *
```

---

## Move 3

Tray: [empty, empty, L-tet]. Refill on next-next move (when L gone). For now only L.

**Decisions for L-tet:**

a. L at (3,2) vertical: (3,2)(4,2)(5,2 forbidden). REJECTED.
b. L at (3,2) horizontal: (3,2)(3,3)(2,3)(2,2)? L is 3+1, e.g. (3,2)(3,3)(3,4)(2,4 forbidden). REJECTED.
c. L at (2,1)(2,2)(2,3)(3,3): 3 in r2 + foot. Legal.
d. L at (4,2)(5,1)(4,1 forbidden). REJECTED.
e. L at (0,3)(0,4 forbidden). REJECTED.
f. L at (0,5)(0,6)(0,7)(1,7). Legal.
g. L at (4,2)(4,3 blocker). REJECTED.
h. L vertical at (3,2)(4,2)(5,2 forbidden). REJECTED.
i. L at (3,3)(3,4)(3,5)(2,5)? r3 fill + r2 cell. (3,5) empty, (2,5) empty. Legal.

**Tradeoffs:**
- (c): fills 4 cells along r2 + (3,3). r2 now has 5 filled (3 from move 1 + 2 here + still needs cells in c5,c7). (3,3) is in the awkward pocket — reaching it now closes (3,2) which can only be reached from above (2,2) — and (2,2) is still empty. (3,2) reachable via (3,2) directly only if approached before its neighbors are sealed.
- (f): NE corner, fills the strip near forbidden (0,4) component.
- (i): mid-board r3 cells + bridges to r2c5.

**Critical pocket reasoning:** 
- (3,2)(3,3) pocket: surrounded by forbidden L-trio at (3,0)(3,1)(4,1) and blocker (4,3). The only reach is from r2 above or via the (3,3)-(2,3) vertical. After (c) fills (3,3), (3,2) ONLY reachable by a piece touching (3,2) without touching (3,3) again — but (3,2) is adjacent to (2,2) above (now filled by L) and (4,2) below. So (3,2) becomes a 1-cell hole reachable only by I3 vertical at (3,2)(4,2)(?,? no (5,2) forbidden). So I3 vertical at (2,2)(3,2)(4,2) — but (2,2) just filled. Only 1-cell piece could fill (3,2). Tray has no 1-cell piece.

This means choice (c) **DOOMS the puzzle** if no 1-cell piece in tray. Real choice must avoid filling (2,2) or (3,3) before (3,2) is filled.

**Pick:** **(i) — L at (3,3)(3,4)(3,5)(2,5).** Avoids closing pocket (3,2). Now (3,2) still reachable from (2,2) above — (2,2) still empty.

After move 3:
```
r0     #  .  o  .  *  .  .  .
r1     #  #  .  .  *  .  .  .
r2     #  .  .  .  *  #  o  .
r3     *  *  .  #  #  #  .  .
r4     .  *  .  o  .  *  .  .
r5     #  .  *  *  .  .  .  .
r6     #  #  .  *  .  .  o  *
r7     o  #  .  .  .  .  *  *
```

---

## Move 4

Tray refilled (all 3 empty after move 3): [I4, O, J].

**Decisions:**

a. I4 vertical at (3,2)(4,2)(5,2 forbidden). REJECTED.
b. I4 horizontal at (4,4)(4,5 forbidden). REJECTED.
c. I4 horizontal at (0,3)(0,4 forbidden). REJECTED.
d. I4 horizontal at (5,4)(5,5)(5,6)(5,7). All empty, none forbidden. Legal.
e. I4 horizontal at (6,4)(6,5)(6,6)(6,7 forbidden). REJECTED — wait (6,7) is forbidden in redesign. Yes. REJECTED.
f. I4 horizontal at (7,2)(7,3)(7,4)(7,5). Legal.
g. O (2×2) at (5,4): (5,4)(5,5)(6,4)(6,5). Legal.
h. O at (4,6)(4,7)(5,6)(5,7). Legal.
i. J at (2,2)(3,2)(4,2)(2,3)? J is L-mirror. Try (4,2)(3,2)(2,2)(2,3). Legal — fills the (3,2) pocket! Pocket resolved.
j. J at (1,2)(2,2)(2,3)(2,4 forbidden). REJECTED.

**Pick:** **(i) — J at (4,2)/(3,2)/(2,2)/(2,3).** Closes the (3,2) pocket BEFORE it becomes unreachable. This is a forced move — the next move uses up (2,2)'s empty status.

After move 4:
```
r0     #  .  o  .  *  .  .  .
r1     #  #  .  .  *  .  .  .
r2     #  .  #  #  *  #  o  .
r3     *  *  #  #  #  #  .  .
r4     .  *  #  o  .  *  .  .
r5     #  .  *  *  .  .  .  .
r6     #  #  .  *  .  .  o  *
r7     o  #  .  .  .  .  *  *
```

---

## Move 5

Tray now: [I4, O, empty]. J consumed. No refill.

**Decisions:**

a. I4 horizontal at (5,4)(5,5)(5,6)(5,7). Legal.
b. I4 horizontal at (7,2)(7,3)(7,4)(7,5). Legal.
c. I4 horizontal at (4,4)(4,5 forbidden). REJECTED.
d. I4 horizontal at (1,2)(1,3)(1,4 forbidden). REJECTED.
e. O at (5,4)/(5,5)/(6,4)/(6,5). Legal.
f. O at (4,6)/(4,7)/(5,6)/(5,7). Legal.
g. O at (6,4)/(6,5)/(7,4)/(7,5). Legal.

The remaining empty cells form scattered fragments. Let's enumerate empties:
r0: c1, c3, c5, c6, c7 (5)
r1: c2, c3, c5, c6, c7 (5)
r2: c1, c7 (2)
r3: c6, c7 (2)
r4: c0, c2 (wait (4,2) just filled)... c0, c4, c6, c7 (4)
r5: c1, c4, c5, c6, c7 (5)
r6: c2, c4, c5 (3)
r7: c2, c3, c4, c5 (4)

Total empties = 5+5+2+2+4+5+3+4 = 30. Tray remaining cells: I4(4) + O(4) = 8. Plus refill queue: T(4)+P5(5)+F5(5)+Y5(5)+I3(3) = 22. Total = 30. Exact match! No slack remaining.

**Constraint:** every remaining piece must place perfectly. Any placement that leaves an unreachable hole = lost game.

**Pocket analysis:**
- (4,0): isolated in c0 by forbidden (3,0). Above (4,0) is forbidden, below is (5,0) filled. Adjacent cells: (4,1) forbidden, (3,0) forbidden, (5,0) filled. (4,0) has ONE adjacent empty: nothing. (4,0) is COMPLETELY ISOLATED — no piece can reach it (all 4 neighbors are filled/forbidden). UNREACHABLE.

**Game over.** Move 2 was wrong. Filling (5,0) sealed off (4,0).

This shows: **single placements can permanently close off cells with no UI warning.** The pocket-detection burden is on the player and is high.

---

## Verdict for C30

**Question persists?** YES — every move asks "does this placement reach forbidden cells, and does it close off any cell that no remaining tray piece can reach?" The reachability question is genuinely new and persistent.

**Trade-off space alive?** Mixed. The trace shows real choices early (which corner to start, which pocket to address first), but the trade-off rapidly collapses to "forced" decisions: any move that isolates an empty cell is fatal. Late-game moves are essentially scripted — there's exactly one correct piece-and-orientation for each cell cluster.

**Difficulty curve plausible?** Engaging but in a brittle way. The puzzle plays like a transport-puzzle (fit pieces into a fixed cavity). Mid-game decisions are interesting; end-game is a forced sequence.

**STRUCTURAL CONCERNS exposed by trace:**

1. **The "no-clear" requirement forces every row AND every column to contain at least one forbidden cell.** This is a hard generator constraint that the candidate spec ("5–10 cells, 2–4 components") does not encode. Without it, ANY row/col completion clears everything and the puzzle becomes unwinnable. The generator must filter for "every row and col has ≥1 forbidden." With 5 cells minimum, you need 5 cells covering 8 rows AND 8 cols — a permutation matrix-like constraint impossible for <8 cells. So minimum forbidden cells = 8, with strict layout, meaning the generator yield is low.

2. **Hidden lethal moves.** A single placement (e.g. move 2 here) can permanently isolate a cell with no UI feedback. The player cannot detect this except by full lookahead. Without a "will-isolate" warning UI, the mode is anti-fun (you find out 3 moves later you already lost).

3. **The mode reduces to a transport-fit puzzle.** Once the forbidden mask is internalised, the player's task is essentially "tetris-pack the complement with this finite tray." Line clears never happen by construction. The Blockit primitive (line clears as both reward and danger) is REMOVED. The mode becomes shape-fit.

4. **The dual-purpose mechanic (line clears) is dead.** The candidate spec claims clears "create space and erase progress," but the structural analysis shows clears CANNOT happen in a winnable Hollow puzzle (every line has a forbidden cell). The dual-purpose claim is false in practice.

5. **Walls vs forbidden are isomorphic in practice.** The spec's "self-suspicion" called this out — Hollow mode reduces to Quarantine where every region's target = "fill all cells." The line-clear distinction doesn't materialise because clears can't happen. Hollow IS Quarantine-fill-all-regions.

**Verdict: REJECT.**

Reasoning: the trace structurally proves Hollow puzzles can only be winnable when forbidden cells block every row AND every column, which (a) makes the dual-purpose "line clear" mechanic dead by construction (no line ever completes), (b) reduces the mode to Quarantine-with-implicit-walls, and (c) creates hidden-lethal-move pitfalls that would require explicit reachability-warning UI to be playable. The candidate's claimed antagonist is real, but it's the same antagonist as Quarantine in different clothes.

The most interesting insight: **Hollow's "line clears erase progress" dual-purpose claim is structurally impossible to realise — any winnable Hollow puzzle is one where line clears NEVER happen, making the mode Quarantine-with-implicit-walls and a fill-everything win check.**
