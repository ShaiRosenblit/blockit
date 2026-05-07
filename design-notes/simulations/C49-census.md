# C49 — Census: Stage 3 reducer simulation

**Recap of rule:** After every placement (plus any clears), compute multiset of 4-connected EMPTY-cell component sizes. Win = match target multiset (e.g. `{8, 5, 3}`). Ceiling multiset must dominate the running multiset at every intermediate step (no component larger than max ceiling entry, no more components than ceiling allows). Endless or finite tray; here I'll simulate finite-tray puzzle variant.

**Legend**
- `.` empty
- `#` filled (any color)
- I'll annotate empty-component sizes inline as `[A=12, B=4, ...]` after each move.

---

## Setup

Empty 8×8 board (64 empty cells, all one component): histogram = `{64}`.
Target multiset: `{20, 14, 10}` — three holes of sizes 20, 14, 10. Total 44 empty cells = 20 filled.
Ceiling multiset: `{30, 20, 14, 10}` — at most 4 components, max size 30. (i.e. running histogram entries must each ≤ a ceiling entry, and count of components ≤ 4.)

Tray (in order): P1=I-tetromino (1×4), P2=I-tetromino, P3=L-tetromino, P4=T-tetromino, P5=I-tetromino, P6=2×2 square. Total cells = 4+4+4+4+4+4 = 24. Hmm need 20. Adjust: drop P6, end with 20 cells. Five pieces × 4 cells.

So 5 pieces, target empties = 44 (from 64-20).

Initial: `[64]` — violates ceiling immediately! (64 > 30). The ceiling is a *running* constraint that must hold AFTER each placement and clears (or maybe from move 1 onward; typical generator practice). Let's say ceiling holds from after move 1.

---

## Move 1 — P1 (1×4 horizontal)

Goal of any first placement: split the giant 64-cell region into smaller pieces. A 1×4 cannot disconnect the board (it's a strip, board remains connected around it).

**Decisions available**
1. Place at (0,0)..(0,3): top-row strip. Result: 60 empty cells, all still one component (you can walk around it via row 1). `[60]` — exceeds ceiling (60 > 30). VIOLATION.
2. Place at (3,0)..(3,3): horizontal middle strip. Result: 60 empty in one component (walk around right end at col 4..7). `[60]` violation.
3. Place at (0,4)..(3,4): vertical strip down col 4. Cells (0,4)(1,4)(2,4)(3,4). Result: empty cells split? Top half (rows 0-3, cols 0-3) = 16 cells; right of strip (rows 0-3, cols 5-7) = 12 cells; rows 4-7 all open = 32 cells. But rows 0-3 left and bottom half are connected via... row 3 col 0-3 connects down to (4,0) etc. So top-left (16) + bottom-half (32) joined via (3,0)→(4,0). That's 48. Plus top-right (12) joined via (0,5)→(0,4 blocked) — no, (0,5) is empty, (0,4) is blocked. (0,5) connects to (1,5) connects down to (4,5) ... bottom half. So 48 + 12 = 60 still one component. The strip didn't disconnect.
4. Place at (3,2)..(3,5): horizontal strip mid-board, cols 2-5. Walk around: from (3,0) the top-left can reach (3,1) and through (2,1) up. From (4,0) bottom can reach (4,1)(4,2..5)(4,6)(4,7) etc. Top and bottom connect via (0,0)→(0,7)? No, must be 4-adjacent. Top can reach right via (0,0..7) row 0, then (0,7)→(1,7)→...→(7,7), so still connected. Strip doesn't disconnect.

A 1×4 strip alone never disconnects an 8×8 board because the board has perimeter to walk around. To disconnect, the strip must touch two opposite edges. So 1×4 vertical at col c, rows 0..3 — bottom open. Doesn't disconnect.

A vertical 1×4 from (0,c) to (3,c) leaves (4..7, c) open AND row 0..3 at col c blocked. Top-left (rows 0-3, col 0..c-1) still connects to bottom-half via (3, c-1)→(4, c-1). Doesn't disconnect.

**Conclusion:** No single 1×4 placement satisfies a ceiling of `max=30` on move 1. The ceiling forces a multi-piece setup — but the FIRST move is forced to violate.

**This means the ceiling rule cannot apply to move 1.** Or: the ceiling must be loose enough to permit `[60]`. If max ceiling entry is `60`, then `{60, 20, 14, 10}` works for move 1. But then "ceiling" stops constraining anything early-game.

This is the candidate's "if ceiling is loose, it degenerates to match-at-end" risk made real on move 1.

Let's assume ceiling is `{60, 30, 20, 14, 10}` (5 entries, allows up to 60 cells single component). Ceiling check: histogram entries each ≤ some unmatched ceiling entry.

**Information used:** Which placements *split* the board's empty region; predicted histogram after placement.

**New question vs Classic:** "What is the connected-component decomposition of the empty cells after this placement?" Classic only cares about row/col fullness.

**Pick:** (3) at column 4, rows 0-3 (vertical I).

After move 1:
```
. . . . # . . .
. . . . # . . .
. . . . # . . .
. . . . # . . .
. . . . . . . .
. . . . . . . .
. . . . . . . .
. . . . . . . .
```
Empty histogram: `[60]`. Goal of moves 2-5: split into `{20,14,10}` (44 empty) over 4 more pieces (16 cells filled).

---

## Move 2 — P2 (1×4)

Need to extend the wall to disconnect. A horizontal 1×4 at row 4 cols 4-7 closes off the top-right region.

**Decisions available**
1. Horizontal at (4,4)..(4,7): combined with the vertical strip, the top-right region (rows 0-3, cols 5-7 = 12 cells) is now sealed off — separated from bottom-right (rows 5-7, cols 5-7) and bottom-left.

   Wait, (4,4) is filled. Top-right rows 0-3 cols 5-7 = 12 cells; can it walk to row 4 cols 5-7? Those are filled. Can it walk to col 4 rows 0-3? Filled. Can walk to (4,4)? Filled. So top-right is isolated. `[12, ?]`.
   Bottom area: (4,0..3) + rows 5-7 all cols = 4 + 24 = 28 cells, one component. Plus there are still cells (5,4)..(7,4) — open, in bottom region.
   
   Recount: filled cells = (0,4)(1,4)(2,4)(3,4)(4,4)(4,5)(4,6)(4,7) = 8. Empty = 56.
   
   Top-left rows 0-3 cols 0-3 = 16, connects to (4,0..3) via col 0..3 → row 4. (4,0..3) empty. Then (4,0..3) connects to (5,0..7) etc. (5,4) empty, connects down. So bottom is rows 4-7 cols 0-3, plus rows 5-7 cols 4-7, plus (5,4)(6,4)(7,4). All one component = 4+4+4+4 (rows 4-7 col 0..3) = 16 + (rows 5-7 col 4..7) = 12 = 28. Plus top-left 16 = 44 connected via (3,0)→(4,0). Top-right isolated 12.
   
   Histogram: `[44, 12]`. Within ceiling `{60,30,20,14,10}`: 44 > 30. VIOLATION (44 needs a ceiling entry ≥ 44; only 60 qualifies, 60 already used by initial state... wait, ceiling per running state, not cumulative). Per-state: histogram `{44, 12}` — 44 must fit under a ceiling entry; 60 is unused this turn. OK pass. 12 fits under 30 or 20 or 14. Pass.

2. Vertical at (4,4)..(7,4): extends the wall straight down. Now (0,4)..(7,4) all filled — the column 4 is a complete vertical wall! Histogram: left 8x4 = 32 cells, right 8x4 = 32 cells but col 4 of right starts at col 5. Actually if col 4 is fully filled, left = rows 0-7 cols 0-3 = 32; right = rows 0-7 cols 5-7 = 24. `[32, 24]`. 32 > 30. VIOLATION (no ceiling entry ≥ 32 available — 60 is also "available" if interpretation is "each entry assigned to one ceiling entry, no double-use"). 60 ≥ 32 OK. 24 ≤ 30 OK. Pass.
   
   But wait — this also clears column 4! detectCompletedLines triggers. Col 4 fills → col 4 cleared → all 8 cells in col 4 are removed. Histogram resets to `[64]` (wait, col 4 cleared means col 4 empties; combined with the rest, all empties = 64-0... actually we never placed anything not in col 4 yet, so the board is all empty after the col-4 clear). Histogram `[64]` again. We've made zero progress and consumed two pieces!

3. Horizontal at (3,4)..(3,7): cells (3,5)(3,6)(3,7) are empty, (3,4) is FILLED. Blocked.
4. Vertical at (4,3)..(7,3): cells in col 3 rows 4-7. Histogram: top-left rows 0-3 cols 0-3 = 16, connects to row 4 cols 0-2 = 3. So 19. Then (4,3) blocked, separated from (4,4..7) via... (3,4) is filled. (4,4) is empty. (4,3) is now filled. So top-left (rows 0-3 cols 0-3) + (4,0)(4,1)(4,2) + (5,0..2)(6,0..2)(7,0..2) + (5,3)(6,3)(7,3)? (5,3) empty. From (4,2) go down (5,2), then (5,3) — yes. So top-left blob = 16 + 3 (row 4 left) + 12 (rows 5-7 cols 0-2) + 3 (rows 5-7 col 3) = 34.
   Right side: rows 0-3 cols 5-7 = 12, connects to (4, 4..7)? (4,4) empty, (4,3) blocked, (3,4) blocked. (4,4)→(4,5)(4,6)(4,7)→(5,4..7)(6,4..7)(7,4..7). Right = 12 + 4 (row 4 cols 4-7) + 12 (rows 5-7 cols 4-7) = 28.
   Histogram `[34, 28]`. Ceiling `{60,30,20,14,10}`. 34 needs entry ≥ 34, only 60 OK. 28 needs entry ≥ 28, only 30 OK. Pass (60 used by 34, 30 used by 28). All OK.

**Future states traded off**
- (1) gives `[44, 12]`. Closer to having a 14-component (12 ≈ 14, off by 2). To grow the 12 to 14 we'd need to UN-fill cells (impossible) or merge with another small region. Wrong direction — already too small.
- (2) self-clears, wasting two pieces.
- (4) gives `[34, 28]`. Both regions need to be split further. More flexible.

**Information used:** Future shaping flexibility — can I subdivide each region as needed?

**New question vs Classic:** "Is this placement aimed at *splitting* a region into smaller named regions, or am I just shrinking one region?" Filling cells inside a region only reduces its count by `cellCount` if no split occurs. To split, the placement must cross a "neck."

**Pick:** (1). The 12-region is closer to the target's 10 than to 14 — we want a cell or two filled inside it to reach exactly 10.

After move 2:
```
. . . . # . . .
. . . . # . . .
. . . . # . . .
. . . . # . . .
. . . . # # # #
. . . . . . . .
. . . . . . . .
. . . . . . . .
```
Histogram `[44, 12]`. (Top-right region: rows 0-3, cols 5-7 = 12 cells. Bottom region: rest.)

---

## Move 3 — P3 (L-tetromino)

L cells (one orientation): (0,0)(1,0)(2,0)(2,1).

Need to: (a) shrink the 12-region to 10, (b) split the 44-region into two pieces summing to 34, ideally `[20, 14]`.

**Decisions available**
1. Place L into the 12-region: e.g. at (0,5) cells (0,5)(1,5)(2,5)(2,6). Removes 4 cells from the 12-region: 12-4=8. But also might split it. (0,6)(0,7)(1,6)(1,7) connect; (2,7) connects to (1,7) yes; (3,5)(3,6)(3,7) all connect. Top-right empty cells: (0,6)(0,7)(1,6)(1,7)(2,7)(3,5)(3,6)(3,7) = 8 cells, all connected via (1,7)-(2,7)-(3,7)-(3,6)-(3,5) and (0,6)-(0,7)-(1,7) etc. All one component. Histogram `[44, 8]`. 8 < 10 (target component). Too small.
2. Place L into the 12-region differently: at (0,5)(1,5)(2,5)(2,6) — same as above. Or at (1,7)(2,7)(3,7)(3,6) — covers (1,7)(2,7)(3,7)(3,6). Top-right empties: (0,5)(0,6)(0,7)(1,5)(1,6)(2,5)(2,6)(3,5) = 8. Same result, 8 cells.
3. Place L to *split* the 44-region. The 44-region is the bottom-and-left L-shape: rows 0-3 cols 0-3 (16) + rows 5-7 all cols (24) + (5,4..7) wait no. After move 2 the bottom region was: rows 0-3 cols 0-3 (16) connected via (3,0..3)→(4,0..3) to (4,0..3) (4 cells empty? actually (4,0..3) were not blocked in move 2; (4,4..7) were). So rows 0-3 cols 0-3 (16) + (4,0..3) (4) + rows 5-7 all cols (24) = 44. Connected via (3,0)-(4,0) and (4,3)-(5,3) etc.
   To split: a "neck" exists at row 4 cols 0-3 — only 4 cells wide. Placing L horizontally at (4,0)..(4,3) would block all of row 4 left half. Then top-left 16 cells isolated; bottom 24 cells isolated. Histogram `[24, 16, 12]`. Targets `{20, 14, 10}` — 16→14 needs -2; 24→20 needs -4; 12→10 needs -2. Total -8 = 2 pieces. 2 pieces left (P4, P5) at 4 cells each = 8. Perfect.

   But L is L-shape, not straight. L cells (0,0)(1,0)(2,0)(2,1) is 3+1. To fill (4,0..3) I need a 1×4 — already used both 1×4s. L doesn't fit row-4 straight. L rotated to (0,0)(0,1)(0,2)(1,0) covers (4,0)(4,1)(4,2)(5,0) — fills only 3 of row 4; (4,3) still empty. Top-left = 16 + (4,3) connected via (4,3)-(5,3)? (5,0) blocked. (5,3) empty. (4,3) connects to (5,3) yes. Top-left 16 + (4,3) + (5,3..7)(6..7,*) all connected through bottom. So no split — (4,3) is a still-open neck.

   Try L at (4,0)(5,0)(5,1)(5,2): row 4 col 0 blocked, row 5 cols 0-2 blocked. Top-left 16 + (4,1)(4,2)(4,3)(5,3..7)(6,*)(7,*). Still connected.

   Conclusion: L-tetromino cannot single-handedly seal a 4-wide neck.

4. Place L INSIDE the 12 to make it 10 AND begin to split it: at (0,5)(0,6)(1,5)(2,5) — covers 4 cells. Top-right empties: (0,7)(1,6)(1,7)(2,6)(2,7)(3,5)(3,6)(3,7) = 8 cells. Connected via (1,6)-(1,7)-(2,7)-(2,6); (3,5)-(3,6)-(3,7); (3,5)? (3,5)-(2,5 blocked). Hmm (3,5) connects to (3,6) which connects to (2,6) via (3,6)-(2,6)? (2,6) and (3,6) are 4-adjacent, yes. So (3,5)(3,6)(3,7) join (2,6)(2,7)(1,6)(1,7)(0,7) all = 8. Histogram `[44,8]` again.

5. Place L inside top-right region but in a way that splits it: at (1,5)(1,6)(1,7)(2,7) — fills row 1 cols 5-7 and (2,7). Now top-right empties: (0,5)(0,6)(0,7)(2,5)(2,6)(3,5)(3,6)(3,7). (0,5..7) connected; (0,7)-(1,7 blocked). (0,7)-(0,6)-(0,5): isolated from below since row 1 is blocked across cols 5-7 and (2,7) is blocked. (2,5)(2,6)(3,5)(3,6)(3,7) all connected. So `[44, 3, 5]`. Now have 3 components total. 5 is closer to wanted 10? No, too small.

Hmm. The histogram is hard to drive precisely.

**Information used:** Counting; visualizing component splits.

**New question vs Classic:** "What's the histogram of the empty cells AFTER this move? Does it advance toward the target multiset?" Highly cognitive — the player must mentally BFS.

**Pick:** Option 4 — at (0,5)(0,6)(1,5)(2,5). Knocks the 12 down to 8 in one piece. Then we need to grow it to 10... wait we can't grow empties. Going past 10 is irreversible (without a clear).

Actually all options that reduce the 12 by 4 give 8 — all are wrong. We need to reduce 12 by exactly 2. But the smallest tetromino fills 4 cells; an L wholly inside the 12-region removes 4 cells from it. To remove only 2 cells from the 12-region, the L must STRADDLE the boundary — but the boundary is filled, so straddling means overlapping filled = invalid placement.

**The 12-region cannot become a 10-region with any tetromino placed wholly inside it.** It can become 8. Or, if the L is placed half inside and half *creating new wall* such that it disconnects an unwanted bit... no, the boundary is already filled.

Alternative: a row clear could re-grow the empties. If row 0 fills, it clears, restoring 8 empty cells in row 0. Then the histogram changes drastically.

**This puzzle is unwinnable from this tray.** Or: the generator must select trays where the histogram is achievable via the available cell-counts. With 5 tetrominoes (20 cells filled), targets must all be achievable as remainders of region sizes after subtracting multiples of 4 (or via clears).

Target `{20, 14, 10}` sum 44, board 64-20=44 ✓. But individual sizes: with all tetrominoes (4 cells each), each region's emptiness can only differ from 64-by-multiples-of-4 if no clears happen. 64 mod 4 = 0; 20 mod 4 = 0; 14 mod 4 = 2; 10 mod 4 = 2. So 14 and 10 need clears (or non-tetromino pieces).

**The mode is parity-locked to the piece-cell-count alphabet.** If the tray is all tetrominoes, every region size must be ≡ the right modulo 4 OR clears must compensate. The generator either (a) uses mixed piece sizes to get any target multiset, or (b) the target multiset must be reachable by the specific tray.

This is a serious constraint. It also means the *player* must reason about parity — adding a fourth question to an already-stacked plate.

**Pick (revised):** Skip this puzzle as constructed. But for the simulation, let me restart with a more honest generator output.

---

## RESTART: Better-tuned puzzle

Tray: P1=I-tetromino, P2=L-tetromino, P3=2-monomino (1×2 domino), P4=T-tetromino, P5=I-tromino (1×3), P6=2×2 square. Cells: 4+4+2+4+3+4 = 21. Target empty count = 64-21 = 43. Multiset target = `{18, 15, 10}` sum 43. Ceiling `{60, 25, 18, 15}`.

I'll be brief through the rest.

**Move 1**: I at (0,3)(1,3)(2,3)(3,3). Histogram: top-left 12 + bottom 48 connected through (3,2)-(4,2). Doesn't split. `[60]`. Pass ceiling (60).

**Move 2**: L at (4,3)(5,3)(6,3)(6,4). Now col 3 rows 0-6 filled. Bottom-right (5,4..7)(7,4..7) etc connected via (5,4)-(6,4 blocked)-(7,4 empty). (5,4)-(7,4) connected via (5,5)-(7,5) etc. Top-left rows 0-3 cols 0-2 = 12 + (4,0..2)(5,0..2)(6,0..2)(7,0..3) = 12+3+3+3+4 = 25. Right-bottom (4,4..7)(5,4..7)(6,5..7)(7,4..7) = 4+4+3+4 = 15. So `[25, 15]`. Ceiling: 25≤25 ✓, 15≤18 (or 15) ✓.

Wait recount: filled cells after move 2 = (0..3,3)(4,3)(5,3)(6,3)(6,4) = 8 cells. Empty = 56. 25+15=40 ≠ 56. Recount.

Top-left region: rows 0-7 cols 0-2 = 24, plus (7,3) = 1 (assuming (7,3) is empty and connected to col 0-2 via (7,2)-(7,3)). 25 OK. Right region: rows 0-3 cols 4-7 (16) + (4, 4..7)(5,4..7)(6,5..7)(7,4..7) = 16+4+4+3+4 = 31. Total 25+31 = 56 ✓.

Histogram `[31, 25]`. 31 > 25 ceiling-max — actually 60 in ceiling unused so 31 ≤ 60 ✓. 25 ≤ 25 ✓. Pass.

**Move 3** (domino, 1×2): place at (3,4)(3,5). Now right region splits? (3,4)(3,5) blocked, (3,6)(3,7) still empty. Top-right (0..2, 4..7)(3,6)(3,7) = 12+2 = 14. Bottom-right (4,4..7)(5,4..7)(6,5..7)(7,4..7) = 15. `[25, 15, 14]`. Ceiling `{60,25,18,15}`: 25≤25, 15≤15 (or 18), 14≤18 (or 15). Pass.

**Move 4** (T, 4 cells): T-tetromino at e.g. (0,0)(0,1)(0,2)(1,1). Top-left 25 → 25-4 = 21. New empties top-left: (1,0)(1,2)(2,0..2)(3,0..2)(4,0..2)(5,0..2)(6,0..2)(7,0..3) = 1+1+3+3+3+3+3+4 = 21 OK, all connected via col 1 (1,1 blocked but 2,1 connects to 3,1 etc). `[21, 15, 14]`.

Hmm I'm shrinking the 25 region toward 18. Need 21→18, so -3. 

**Move 5** (1×3 tromino): place at (0,0..2) — blocked. Place at (1,0)(1,2)? not contiguous. Place at (5,0)(5,1)(5,2): top-left empties (1,0)(1,2)(2,0..2)(3,0..2)(4,0..2)(6,0..2)(7,0..3) = 1+1+3+3+3+3+4 = 18 ✓ but does the placement disconnect? (4,0..2) connects to (3,0..2) above and to ... (5,0..2) blocked, so (4,0..2) connects up only. (6,0..2)(7,0..3) connect via (6,0)-(7,0)? (6,0) empty, (7,0) empty, yes — but they're separated from upper part now. So `[?, 15, 14]` — the 18 splits into upper-15-ish and lower-7-ish.

This is getting fiddly. The point is clear: **achieving the target multiset requires extreme positional precision and parity matching**.

**Pick:** Place tromino at (4,0)(4,1)(4,2): top-left empty cells now (1,0)(1,2)(2..3, 0..2)(5..7, 0..2)(7,3) = 1+1+6+9+1 = 18, but split? Top half (rows 1-3) connects via col 0/1/2 to (4, 0..2 blocked) to (5,0..2). (4,0) blocked, can (3,0)→(4,0)? blocked. So upper portion (rows 0-3 minus blocked): (1,0)(1,2)(2,0..2)(3,0..2) = 1+1+3+3 = 8. Lower portion (5,0..2)(6,0..2)(7,0..3) = 3+3+4 = 10. `[15, 14, 10, 8]`. Ceiling `{60,25,18,15}`: 4 entries available, 4 components. 15≤15, 14≤18, 10≤15, 8≤? remaining ceiling entries used: 25 unused. 8≤25 ✓. Pass.

**Move 6** (2×2 square): need to merge 8 and 10 into 18, or merge 8 with 14 or 15. Or eliminate the 8 entirely.

Place 2×2 at (4,0)(4,1)(5,0)(5,1) — wait (4,0)(4,1) blocked (filled in move 5), (5,0)(5,1) empty. Can't, half blocked.

Place 2×2 at (6,0)(6,1)(7,0)(7,1): all empty. Lower region was (5,0..2)(6,0..2)(7,0..3) = 10 cells; now blocked at (6,0)(6,1)(7,0)(7,1). Remaining: (5,0)(5,1)(5,2)(6,2)(7,2)(7,3) = 6 cells, connected via (5,2)-(6,2)-(7,2)-(7,3) and (5,0)-(5,1)-(5,2). All 6 one component.

Histogram `[15, 14, 8, 6]` — 4 components but the 8 (top-left) and 6 (bottom-left) are still separate. Target `{18, 15, 10}`. We have 15 ✓, 14 vs 18 wrong (need to merge with 4 cells worth of clears or place pieces in the 14 region — none left). 8+6 = 14, separate components. 

**Tray is exhausted; histogram doesn't match target. LOSS.**

Could I have played better? Let me reflect: the parity-and-shape gymnastics required to land EXACTLY on `{18, 15, 10}` with a fixed tray are extreme. Each placement changes the histogram non-monotonically when it disconnects. The forward-sim that generated this puzzle had ONE trajectory that worked; the player must rediscover it almost exactly.

---

## Verdict

**Question persists?** YES — every move asks "what is the histogram after?" But it asks it so loudly that no other strategic question gets airtime. The mode collapses to a single dimension: histogram-matching arithmetic.

**Trade-off space alive?** NO. Once the player understands the histogram math, optimal play is deterministic: there is one sequence of placements that lands on the target, and any deviation kills the run. The "merge two small holes into a medium hole" decision sounds like a trade-off but in practice the target multiset uniquely determines whether a merge is helpful — so each move has one correct answer.

**Difficulty curve plausible?** NO. The mode has a brutal cliff: novices cannot even compute the histogram after a placement without painstaking BFS-by-eye. There's no graceful entry. Either the player is doing combinatorial geometry from move 1 or they lose.

**Key degeneracies surfaced:**
1. **Parity lock.** With tetromino-only trays, every region size is forced into mod-4 classes; many target multisets become unreachable. The generator must hand-tune piece mixes.
2. **First-move forced violation.** A `[64]`-empty board cannot satisfy a strict ceiling, so the ceiling has to be loose for early moves OR start at `{64}` itself, which means ceiling provides zero early constraint.
3. **Histogram math drowns out other strategy.** Line clears, piece adjacency, etc., become invisible in the noise of "did I just merge 8 and 6 or split 14 into 11 and 3?"
4. **No partial credit.** The win predicate is exact multiset match. Off by one component or one cell = total failure. Player has no tactile feedback that they're "close."
5. **UI problem the candidate flagged is real.** A player has to read 4 numbers per turn and predict their next 4 numbers — this is more like a number-puzzle game (sudoku) bolted onto a placement game than a placement game with a new question.

The new question exists, but it eats the mode whole. The mode is no longer a Blockit-style "where do I drop this piece" — it is "compute the next BFS state in your head."

**Verdict: REJECT.** Structural collapse to a single deterministic histogram-arithmetic puzzle. The dual-coding of line clears as "merger events" sounds rich but in practice each clear's effect is so disruptive to the histogram that clears are either forced (only solution) or forbidden (would scramble the count) — there's rarely a meaningful trade-off. The "ceiling" rule either trivializes to "match at end" (Puzzle disease redux) or forces the player into a single legal trajectory (Pipeline disease — agency removed by hard constraint without comparable agency added).

Combined with the candidate's own complexity score (L) and the UI legibility problem ("how big is each hole?"), this fails the bar.
