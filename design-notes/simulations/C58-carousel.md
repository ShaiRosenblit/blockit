# C58 — Carousel: column cyclic shift after every placement

## Premise being tested

After every placement (whether or not it triggered a clear), all columns shift LEFT by one (column c moves to c-1; column 0 wraps to column 7). Row indices unchanged. Shift is deterministic, applied AFTER placement and clears, AFTER each piece (one shift per placement, regardless of how many pieces or clears).

Score-attack flavored (continuous tray refill, build score by clears).

## Legend

- `.` empty
- `#` filled by player (with letter denoting which piece for tracing: `A`,`B`,`C`...)
- `o` blocker pre-fill
- `→` indicates the upcoming shift direction (always left, but for clarity)

## Setup

Initial board with some pre-fill to give the shift teeth:

```
       c0 c1 c2 c3 c4 c5 c6 c7
r0     .  .  .  o  .  .  .  .
r1     .  .  .  .  .  .  o  .
r2     o  .  .  .  .  .  .  .
r3     .  .  .  .  .  .  .  o
r4     .  .  o  .  .  .  .  .
r5     .  .  .  .  o  .  .  .
r6     .  .  .  .  .  .  .  .
r7     .  o  .  .  .  .  .  .
```

8 blockers scattered. After each placement, columns shift left.

Tray (continuous): [I3, T-tet, L-tet]. Refill on all empty.

---

## Move 1

**Decisions:**

a. I3 horizontal at (3,0)(3,1)(3,2). Fills 3 cells in r3. After placement, columns shift left by 1. The 3 cells move from cols 0,1,2 → cols -1,0,1 — but col -1 wraps to col 7. So (3,0)→(3,7), (3,1)→(3,0), (3,2)→(3,1). Result: r3 has cells at c0, c1, c7. Plus blocker (3,7) shifts: (3,7)→(3,6). So r3 after shift: cols 0,1,6,7 filled? Let me recompute.

Wait — the shift moves EVERY cell in the column. Column 0 (entire column) → column 7 wrap. Column 1 → column 0. Column c → column c-1 mod 8.

So (3,0)#A → after shift, this cell IS in column 0 of the BOARD — but the column it's IN is now identified as col 7 (the column moved). Coordinates: cell at (r,c) before shift is at (r, (c-1+8)%8) after shift.

Actually clearer: after shift, the cell that WAS in column c is now in column c-1. So for cell (r,c) original, new position is (r, (c-1+8)%8).

Pre-shift placement: (3,0)#A, (3,1)#A, (3,2)#A. Plus existing blockers all shift.
- (3,0)→(3,7): #A at (3,7).
- (3,1)→(3,0): #A at (3,0).
- (3,2)→(3,1): #A at (3,1).
- Existing (3,7) blocker → (3,6).
- Other blockers shift one column left.

Board after I3 + shift:
- r0 blocker (0,3)→(0,2).
- r1 blocker (1,6)→(1,5).
- r2 blocker (2,0)→(2,7).
- r3: piece at (3,7),(3,0),(3,1); blocker (3,7) was → moved to (3,6). Wait, before shift (3,7) had blocker. After placement, (3,7) still has blocker (placement was at (3,0)(3,1)(3,2)). After shift, (3,7) blocker → (3,6). And (3,0)#A → (3,7). So r3: (3,0)=#A, (3,1)=#A, (3,6)=blocker, (3,7)=#A.
- r4 blocker (4,2)→(4,1).
- r5 blocker (5,4)→(5,3).
- r7 blocker (7,1)→(7,0).

```
       c0 c1 c2 c3 c4 c5 c6 c7
r0     .  .  o  .  .  .  .  .
r1     .  .  .  .  .  o  .  .
r2     .  .  .  .  .  .  .  o
r3     A  A  .  .  .  .  o  A
r4     .  o  .  .  .  .  .  .
r5     .  .  .  o  .  .  .  .
r6     .  .  .  .  .  .  .  .
r7     o  .  .  .  .  .  .  .
```

b. T-tet stem-down at (0,3): (0,3 blocker). REJECTED.
c. L-tet at (5,5)(5,6)(5,7)(6,7) — 4 cells SE corner. After shift, all move one left.
d. T-tet at (4,4)(4,5)(4,6)(5,5). After shift, the T's cells become (4,3)(4,4)(4,5)(5,4).
e. I3 vertical at (0,0)(1,0)(2,0=blocker). REJECTED.

**Future states:** Every placement is followed by a known shift. The shape of the placement IN THE NEXT FRAME is its shape shifted left. So pieces don't change shape but their column position changes deterministically.

**Information player uses:** current board, the shift schedule (1 col/turn left, deterministic), tray pieces, the relationship "where do my filled cells END UP after the shift?"

**New question vs Classic:** "Where do I want this piece to BE after the shift, and is there a placement now that lands it in the post-shift position I want?" Classic asks "where now."

**Pick:** **(d) — T-tet at (4,4)(4,5)(4,6)(5,5).** Trying to build toward future row clear.

After placement: (4,4)A,(4,5)A,(4,6)A,(5,5)A. Then shift:
- All blockers shift left by 1 (incl wrap).
- A's: (4,4)→(4,3), (4,5)→(4,4), (4,6)→(4,5), (5,5)→(5,4).

Pre-shift state was the initial board + my placement. After shift:
- Blockers: (0,3)→(0,2), (1,6)→(1,5), (2,0)→(2,7), (3,7)→(3,6), (4,2)→(4,1), (5,4)→(5,3), (7,1)→(7,0).
- A's: (4,3)(4,4)(4,5)(5,4).

```
       c0 c1 c2 c3 c4 c5 c6 c7
r0     .  .  o  .  .  .  .  .
r1     .  .  .  .  .  o  .  .
r2     .  .  .  .  .  .  .  o
r3     .  .  .  .  .  .  o  .
r4     .  o  .  A  A  A  .  .
r5     .  .  .  o  A  .  .  .
r6     .  .  .  .  .  .  .  .
r7     o  .  .  .  .  .  .  .
```

---

## Move 2

Tray: [I3, _, L-tet]. T consumed.

Important observation: each turn, EVERY existing cell shifts left. So the player's previously placed cells move too. Building horizontal structures means continuously chasing them.

**Decisions:**

a. I3 horizontal at (4,5)(4,6)(4,7). After shift: (4,4)(4,5)(4,6). Combined with existing A cells at (4,3)(4,4)(4,5) → after shift the A cells move to (4,2)(4,3)(4,4). And new I3 (B) ends at (4,4)(4,5)(4,6). So r4 has A at c2,c3,c4 + B at c4,c5,c6 → overlap at c4? Wait — placement happens BEFORE shift. So I place I3 at (4,5)(4,6)(4,7). Are those cells empty pre-shift? Pre-shift = current board: (4,5)=A, (4,6)=., (4,7)=. ILLEGAL — (4,5)=A is filled. REJECTED.
b. I3 horizontal at (4,6)(4,7)... only 2 cells from c6. REJECTED (3 cells need c6,c7,? oob).
c. I3 vertical at (5,5)(6,5)(7,5). All empty. Legal.
d. I3 vertical at (5,6)(6,6)(7,6). All empty. Legal.
e. L-tet at (5,5)(6,5)(7,5)(7,6). Legal.
f. L-tet at (3,0)(3,1)(3,2)(4,2). r3 c0,c1,c2 all empty after shift, (4,2) empty. Legal.
g. I3 horizontal at (3,3)(3,4)(3,5). Legal.

**Tradeoffs:**
- (c) building vertical column at c5 — vertical stacks are SHEARED by the shift. After shift, cells at c5 → c4. Vertical column persists but in c4. It's just translated, not deformed. So building vertical structures works (they stay vertical).
- (d) similar; ends up at c5 after shift.
- (f) builds in NW. After shift L cells (3,0)→(3,7), (3,1)→(3,0), (3,2)→(3,1), (4,2)→(4,1). The L's vertical-foot cell (4,2) ends at (4,1) — but there's an existing blocker at (4,1)? No — (4,1) HAS the blocker after move 1's shift. CONFLICT after shift? Or does shift simply collide?

**Critical mechanical question:** what happens when shifting causes a collision? Two cells trying to occupy the same post-shift coordinate.

Reading spec: "the entire board's columns shift cyclically left by one." Columns are independent atomic units — column 0 becomes column 7, column 1 becomes column 0, etc. WITHIN a column nothing changes. So each column moves as a UNIT to a new column index. There's no collision because each destination index receives exactly one source column.

So column 0 (containing whatever cells) → goes to position 7. Column 1 → 0. Etc.

Re-examine move 1 result. Pre-shift after placement, col 0 = blocker(2,0). Col 1 = blocker(7,1). Col 2 = blocker(4,2). Col 3 = blocker(0,3) + A(3,0)? Wait no. Let me redo. The A's were placed at (4,4)(4,5)(4,6)(5,5) — these are in cols 4,5,6,5.

Pre-shift columns:
- Col 0: blocker (2,0).
- Col 1: blocker (7,1).
- Col 2: blocker (4,2).
- Col 3: blocker (0,3).
- Col 4: A(4,4), blocker (5,4).
- Col 5: A(4,5), A(5,5).
- Col 6: A(4,6), blocker (1,6).
- Col 7: blocker (3,7).

After shift (col c → c-1 mod 8):
- New col 0 = old col 1 = blocker at row 7. So (7,0) blocker.
- New col 1 = old col 2 = blocker at row 4. So (4,1) blocker.
- New col 2 = old col 3 = blocker at row 0. So (0,2) blocker.
- New col 3 = old col 4 = A(4,3), blocker(5,3).
- New col 4 = old col 5 = A(4,4), A(5,4).
- New col 5 = old col 6 = A(4,5), blocker(1,5).
- New col 6 = old col 7 = blocker(3,6).
- New col 7 = old col 0 = blocker(2,7).

Result:
```
r0     .  .  o  .  .  .  .  .
r1     .  .  .  .  .  o  .  .
r2     .  .  .  .  .  .  .  o
r3     .  .  .  .  .  .  o  .
r4     .  o  .  A  A  A  .  .
r5     .  .  .  o  A  .  .  .
r6     .  .  .  .  .  .  .  .
r7     o  .  .  .  .  .  .  .
```

Confirms my earlier diagram. Good.

Now move 2 (f): place L at (3,0)(3,1)(3,2)(4,2). Legal (cells empty).

Pre-shift after placement:
- Cols: col 0 has L(3,0); col 1 has L(3,1); col 2 has L(3,2), L(4,2); col 3 has A(4,3), blocker(5,3); col 4 has A(4,4), A(5,4); col 5 has A(4,5), blocker(1,5); col 6 has blocker(3,6); col 7 has blocker(2,7).

Wait, col 1 also has blocker (4,1). Col 0 has blocker (7,0). Col 2 has blocker (0,2). Let me re-tally:

- Col 0: L(3,0), blocker(7,0).
- Col 1: L(3,1), blocker(4,1).
- Col 2: L(3,2), L(4,2), blocker(0,2).
- Col 3: A(4,3), blocker(5,3).
- Col 4: A(4,4), A(5,4).
- Col 5: A(4,5), blocker(1,5).
- Col 6: blocker(3,6).
- Col 7: blocker(2,7).

After shift, new col c = old col c+1:
- New col 0 = old col 1 = L(3,0), blocker(4,0).
- New col 1 = old col 2 = L(3,1), L(4,1), blocker(0,1).
- New col 2 = old col 3 = A(4,2), blocker(5,2).
- New col 3 = old col 4 = A(4,3), A(5,3).
- New col 4 = old col 5 = A(4,4), blocker(1,4).
- New col 5 = old col 6 = blocker(3,5).
- New col 6 = old col 7 = blocker(2,6).
- New col 7 = old col 0 = L(3,7), blocker(7,7).

Result:
```
r0     .  o  .  .  .  .  .  .
r1     .  .  .  .  o  .  .  .
r2     .  .  .  .  .  .  o  .
r3     L  L  .  .  .  o  .  L
r4     o  L  A  A  A  .  .  .
r5     .  .  o  A  .  .  .  .
r6     .  .  .  .  .  .  .  .
r7     .  .  .  .  .  .  .  o
```

---

## Move 2 (re-pick after computing)

Actually I realize the pick needs reconsideration. Let me restate.

**Pick:** **(f) — L at (3,0)/(3,1)/(3,2)/(4,2).** Builds left of the A cluster. After shift, L moves to (3,7),(3,0),(3,1),(4,1) and A moves to (4,2),(4,3),(4,4),(5,3). Together r3 has cells at c0,c1,c5(blocker),c7. r4 has c0(blocker),c1(L),c2(A),c3(A),c4(A). 5 cells in r4. Building toward r4 clear.

(Computation done above. Diagram correct.)

---

## Move 3

Tray: [I3, _, _]. L consumed. Refill: [I3, T, S]. Wait — only L was used in move 2. I3 still present. Tray = [I3]. No refill (not all empty).

Hmm but Classic refills when all 3 empty. After moves 1,2 used T and L. I3 still in tray. Tray = [I3].

**Decisions for I3:**

a. I3 horizontal at (4,5)(4,6)(4,7). Legal? (4,5)=., (4,6)=., (4,7)=. all empty. Legal. After shift, becomes (4,4)(4,5)(4,6). Combined with A row: r4 currently has (4,1)L, (4,2)A, (4,3)A, (4,4)A. After shift A's move to (4,1)(4,2)(4,3) — wait, but L is also at (4,1). Do A and L collide? They're in DIFFERENT columns pre-shift: A at col 2,3,4; L at col 1. After shift, A → col 1,2,3; L → col 0. So no collision. Plus new I3 placed at (4,5)(4,6)(4,7) → after shift at (4,4)(4,5)(4,6).

Wait — I'm conflating. Let me redo carefully.

PRE-shift state (current board):
- r4: (4,0) blocker, (4,1) L, (4,2) A, (4,3) A, (4,4) A.
- After placing I3 at (4,5)(4,6)(4,7): r4 = blocker, L, A, A, A, I, I, I → ALL 8 CELLS FILLED.
- DETECT LINES: r4 complete → CLEAR r4. r4 becomes all empty.
- Then SHIFT.

Wait — order of operations: the spec says "After every placement (whether or not it triggered a clear), the entire board's columns shift cyclically left by one." So: placement → clears → shift. r4 clears, then shift.

After clear, r4 entirely empty. Other rows unchanged.

Pre-shift (post-clear):
- Cols same as before but r4 row erased.
- Col 0: blocker (7,0). [Was L (3,0)? Wait L was at (3,0) NOT (4,0) — I had blocker at (4,0) from earlier shift. r4 col 0 = blocker. After r4 clear, (4,0) becomes empty.]

Let me restart with clean column states.

PRE-shift pre-clear after placing I3:

Looking at the board after move 2:
```
r0     .  o  .  .  .  .  .  .
r1     .  .  .  .  o  .  .  .
r2     .  .  .  .  .  .  o  .
r3     L  L  .  .  .  o  .  L
r4     o  L  A  A  A  .  .  .
r5     .  .  o  A  .  .  .  .
r6     .  .  .  .  .  .  .  .
r7     .  .  .  .  .  .  .  o
```

Place I3 at (4,5)(4,6)(4,7). After placement r4 = o L A A A I I I — 8 cells full. CLEAR r4 → r4 all empty.

Post-clear:
```
r0     .  o  .  .  .  .  .  .
r1     .  .  .  .  o  .  .  .
r2     .  .  .  .  .  .  o  .
r3     L  L  .  .  .  o  .  L
r4     .  .  .  .  .  .  .  .
r5     .  .  o  A  .  .  .  .
r6     .  .  .  .  .  .  .  .
r7     .  .  .  .  .  .  .  o
```

Now shift left by 1 (col c → c-1):
- New c0 = old c1: blocker (0,1)?? Wait old c1 = (3,1)L only. r0c1 was 'o'. So new c0: (0,0)=o, (3,0)=L. Hmm different from what I drew.

Let me re-extract columns from the post-clear board:
- Col 0: (3,0)=L only.
- Col 1: (0,1)=o, (3,1)=L.
- Col 2: (5,2)=o.
- Col 3: (5,3)=A.
- Col 4: (1,4)=o.
- Col 5: (3,5)=o.
- Col 6: (2,6)=o.
- Col 7: (3,7)=L, (7,7)=o.

After shift (new col c = old col c+1 mod 8):
- New c0 = old c1: (0,0)=o, (3,0)=L.
- New c1 = old c2: (5,1)=o.
- New c2 = old c3: (5,2)=A.
- New c3 = old c4: (1,3)=o.
- New c4 = old c5: (3,4)=o.
- New c5 = old c6: (2,5)=o.
- New c6 = old c7: (3,6)=L, (7,6)=o.
- New c7 = old c0: (3,7)=L.

Result:
```
r0     o  .  .  .  .  .  .  .
r1     .  .  .  o  .  .  .  .
r2     .  .  .  .  .  o  .  .
r3     L  .  .  .  .  .  L  L
r4     .  .  .  .  .  .  .  .
r5     .  o  A  .  .  .  .  .
r6     .  .  .  .  .  .  .  .
r7     .  .  .  .  .  .  o  .
```

**Pick justified:** (a) — I3 at (4,5)(4,6)(4,7). Triggered a clear of r4, removing 8 cells (4 player + 1 blocker + 3 just-placed I3 cells = 8). Score!

---

## Move 4

Tray after move 3: I3 used. Tray empty for all 3 → refill: [O, J, T].

**Decisions for O (2×2):**

a. O at (5,3)(5,4)(6,3)(6,4). Legal.
b. O at (3,1)(3,2)(4,1)(4,2). Legal.
c. O at (0,1)(0,2)(1,1)(1,2). Legal.
d. O at (6,5)(6,6)(7,5)(7,6=o). REJECTED — (7,6) blocker.
e. O at (3,2)(3,3)(4,2)(4,3). Legal.

Each placement followed by a shift. Building 2×2 blocks: after shift the 2×2 stays a 2×2 (just shifted to col-1, col-2 area).

The shift means the player can't easily "build a vertical bar" in a fixed column — but VERTICAL structures persist (they translate column-wise) and HORIZONTAL structures also persist (they translate but stay in same row).

**The interesting question:** the shift transforms COLUMNS (cyclic) but not ROWS. So row clears are achievable by filling a row (the row composition at-the-moment-of-clear is what matters; you don't need to track "which col will this end up in" — full row = clear).

So for ROW completion, the shift is irrelevant — you just need 8 cells in one row, in any cols. Easy.

For COLUMN completion, the shift moves the column away each turn. Building (0,3)(1,3)(2,3) → after shift these are at (0,2)(1,2)(2,2). Next placement adds cells, shift again, etc. The column "drifts" left at 1 col/turn.

Strategy A: row-clears only (ignore columns). Shift becomes irrelevant — it just moves blockers around but you don't care.
Strategy B: ride the column. Place vertically moving cells westward to keep adding to the SAME drifting column.

If Strategy A is viable AND ignores the shift, the mode is essentially Classic with cosmetic blocker rotation.

**Test Strategy A:** Just fill rows.

**Pick:** **(c) — O at (0,1)(0,2)(1,1)(1,2).** Builds toward r0 and r1 fills. After placement and shift.

Wait (0,1) is currently `.`? Looking at post-shift board: r0 = o . . . . . . . — (0,1) empty. (0,2) empty. (1,1) empty. (1,2) empty. Legal.

After placement (no clear, no full lines), then shift:
- All cells shift left by 1.

Pre-shift columns:
- Col 0: (0,0)=o, (3,0)=L.
- Col 1: O(0,1), O(1,1), (5,1)=o.
- Col 2: O(0,2), O(1,2), (5,2)=A.
- Col 3: (1,3)=o.
- Col 4: (3,4)=o.
- Col 5: (2,5)=o.
- Col 6: (3,6)=L, (7,6)=o.
- Col 7: (3,7)=L.

After shift:
- New c0 = old c1: O(0,0), O(1,0), (5,0)=o.
- New c1 = old c2: O(0,1), O(1,1), (5,1)=A.
- New c2 = old c3: (1,2)=o.
- New c3 = old c4: (3,3)=o.
- New c4 = old c5: (2,4)=o.
- New c5 = old c6: (3,5)=L, (7,5)=o.
- New c6 = old c7: (3,6)=L.
- New c7 = old c0: (0,7)=o, (3,7)=L.

```
r0     O  O  .  .  .  .  .  o
r1     O  O  o  .  .  .  .  .
r2     .  .  .  .  o  .  .  .
r3     .  .  .  o  .  L  L  L
r4     .  .  .  .  .  .  .  .
r5     o  A  .  .  .  .  .  .
r6     .  .  .  .  .  .  .  .
r7     .  .  .  .  .  o  .  .
```

---

## Move 5

Tray: [_, J, T]. O consumed.

**Decisions for J:**

a. J at (0,3)(0,4)(0,5)(1,3=o)? REJECTED.
b. J at (0,2)(0,3)(0,4)(1,2=o)? Wait (1,2) is now blocker. REJECTED.
c. J at (0,3)(0,4)(0,5)(0,6) — wait J is 4 cells, an L-mirror: e.g. (0,3)(0,4)(0,5)(1,5). Legal.
d. J vertical at (0,3)(1,3=o). REJECTED.
e. J at (4,0)(4,1)(4,2)(4,3). Legal — fills r4 partially.
f. J at (6,0)(7,0)(7,1)(7,2). Legal.
g. J at (0,2)(0,3)(0,4)(0,5)? J is L-shape not I. So not 4-in-a-row.

Let me pick a J shape: (0,3)(1,3)(2,3)(2,2). (1,3) is blocker. REJECTED.

J at (5,2 has A). REJECTED.

J at (3,0)(3,1)(3,2)(4,2)? all empty. Legal.

**Strategic thinking:** can I fill r0? r0 has O,O,.,.,.,.,.,o — 6 empty cells. Need to fill (0,2),(0,3),(0,4),(0,5),(0,6) = 5 cells (since (0,7) blocker fills it). So 5 cells to fill r0.

c. J at (0,3)(0,4)(0,5)(1,5). After placement r0 has O,O,.,J,J,J,.,o = 6 cells, missing (0,2),(0,6). Not yet clear.

**Pick:** **(c) — J at (0,3)(0,4)(0,5)(1,5).**

After placement:
```
r0     O  O  .  J  J  J  .  o
r1     O  O  o  .  .  J  .  .
r2     .  .  .  .  o  .  .  .
r3     .  .  .  o  .  L  L  L
r4     .  .  .  .  .  .  .  .
r5     o  A  .  .  .  .  .  .
r6     .  .  .  .  .  .  .  .
r7     .  .  .  .  .  o  .  .
```

Then shift left:
- Cols pre-shift:
  - c0: (0,0)O, (1,0)O.
  - c1: (0,1)O, (1,1)O.
  - c2: (1,2)o.
  - c3: (0,3)J, (3,3)o.
  - c4: (0,4)J, (2,4)o.
  - c5: (0,5)J, (1,5)J, (3,5)L, (7,5)o.
  - c6: (3,6)L.
  - c7: (0,7)o, (3,7)L.

After shift, new col c = old col c+1:
- new c0 = old c1: (0,0)O, (1,0)O.
- new c1 = old c2: (1,1)o.
- new c2 = old c3: (0,2)J, (3,2)o.
- new c3 = old c4: (0,3)J, (2,3)o.
- new c4 = old c5: (0,4)J, (1,4)J, (3,4)L, (7,4)o.
- new c5 = old c6: (3,5)L.
- new c6 = old c7: (0,6)o, (3,6)L.
- new c7 = old c0: (0,7)O, (1,7)O.

```
r0     O  .  J  J  J  .  o  O
r1     O  o  .  .  J  .  .  O
r2     .  .  .  o  .  .  .  .
r3     .  .  o  .  L  L  L  .
r4     .  .  .  .  .  .  .  .
r5     A  .  .  .  .  .  .  .
r6     .  .  .  .  .  .  .  .
r7     .  .  .  .  o  .  .  .
```

Now r0 = O . J J J . o O — 6 cells. Need (0,1) and (0,5) to fill. After 2 more turns r0 keeps shifting.

---

## Move 6

Tray: [_, _, T]. J consumed.

**Decisions for T:**

a. T stem-down at (0,1)(0,2 has J). REJECTED.
b. T at (0,5)(0,6 has o). REJECTED.
c. T stem-up at (1,2)(1,3)(1,4 has J). REJECTED.
d. T at (5,5)(5,6)(5,7)(6,6). Legal.
e. T at (6,0)(6,1)(6,2)(7,1). Legal.
f. T at (3,0)(3,1)(3,2 has o). REJECTED.
g. T stem-down at (1,5)(1,6)(1,7)(2,6). Legal? (1,5)=., (1,6)=., (1,7)=O — REJECTED, (1,7) is filled.

To fill r0 cells (0,1) and (0,5): T won't fit perfectly into single isolated cells.

Try: T at (0,5)(1,5)(1,4 J — REJECTED. Or T at (1,1 o) REJECTED.

**It's hard to fill r0 because it's broken up by piece artifacts.** The J cells at (0,2)(0,3)(0,4) can't be touched, and (0,1) is a single isolated empty cell. After shift these all move left again.

**Pick:** **(e) — T at (6,0)(6,1)(6,2)(7,1).** Build SW area instead.

After placement + shift (no clear; r0 not full):
- T cells: (6,0)T, (6,1)T, (6,2)T, (7,1)T.

Pre-shift cols:
- c0: O(0,0), O(1,0), A(5,0), T(6,0).
- c1: o(1,1), T(6,1), T(7,1).
- c2: J(0,2), o(3,2), T(6,2).
- c3: J(0,3), o(2,3).
- c4: J(0,4), J(1,4), L(3,4), o(7,4).
- c5: L(3,5).
- c6: o(0,6), L(3,6).
- c7: O(0,7), O(1,7).

After shift:
- new c0 = old c1: o(1,0), T(6,0), T(7,0).
- new c1 = old c2: J(0,1), o(3,1), T(6,1).
- new c2 = old c3: J(0,2), o(2,2).
- new c3 = old c4: J(0,3), J(1,3), L(3,3), o(7,3).
- new c4 = old c5: L(3,4).
- new c5 = old c6: o(0,5), L(3,5).
- new c6 = old c7: O(0,6), O(1,6).
- new c7 = old c0: O(0,7), O(1,7), A(5,7), T(6,7).

```
r0     .  J  J  J  .  o  O  O
r1     o  .  .  J  .  .  O  O
r2     .  .  o  .  .  .  .  .
r3     .  o  .  L  L  L  .  .
r4     .  .  .  .  .  .  .  .
r5     .  .  .  .  .  .  .  A
r6     T  T  .  .  .  .  .  T
r7     T  T  .  o  .  .  .  .
```

r0 now: . J J J . o O O — still 6 filled, 2 empty: (0,0) and (0,4).

---

## Move 7

Tray fully consumed → refill: [I4, S, L].

**Decisions for I4 horizontal at r0:**

a. I4 at (0,4)(0,5)(0,6)(0,7) — (0,5)=o, (0,6)=O, (0,7)=O. REJECTED.
b. I4 at (0,0)(0,1 has J). REJECTED.
c. I4 vertical at (4,0)(5,0)(6,0=T)(7,0=T). REJECTED.

L at (1,1)(1,2)(2,1)(2,2 o). Wait. L = vertical bar + foot.
d. L at (4,0)(5,0)(6,0=T). REJECTED.
e. L at (3,0)(4,0)(5,0)(5,1). Legal.
f. L at (1,1)(1,2)(1,3=J). REJECTED.

**Pick:** **(e) — L at (3,0)(4,0)(5,0)(5,1).** Build c0.

Skip detailed shift — pattern is clear.

---

## Verdict for C58

I'll stop tracing and assess.

**Question persists?** PARTIALLY. The "where will my cells be after shift?" question is asked once — when the player learns the rule. After that, the shift is a constant rotation that the player either rides (vertical-strategy) or ignores (horizontal-strategy).

**Trade-off space alive?** Mostly NO. Two trace observations expose degeneracy:

1. **Horizontal placements are immune to the shift.** A row's fullness is determined by the count of filled cells in that row IN THE CURRENT FRAME. Filling 8 cells in row r → row clear, regardless of cols. The shift doesn't affect row totals. So a player who only plays for ROW CLEARS treats the shift as a cosmetic blocker-reshuffler. This is exactly Classic with extra animation.

2. **Vertical column-builds are HARDER but not strategically necessary.** Building a tall column requires placing in adjacent column EACH TURN (track the leftward drift). Since row clears suffice, the player just doesn't.

The "new placement question" the spec promises ("Where is this footprint two placements from now?") is only answered by someone trying to do column work, which is dominated by row work.

**Difficulty curve plausible?** Trace shows the game plays like Classic-with-blocker-spin. Same line clears, same scoring, same death conditions. The blockers cycling left-and-around is mildly disorienting on first play but doesn't add strategic depth.

**STRUCTURAL CONCERNS:**

1. **The shift is a no-op for the dominant strategy.** Row clears don't care which columns the cells are in. The shift only affects cross-row structure (columns). With Classic-style scoring favoring row clears (1 line = 8 cells = same score whether row or col), there's no incentive to do columns.

2. **Wrap-around is rarely meaningful.** Column 0 wraps to column 7 — but cells at column 0 are usually rare (board mostly empty in that column), so wrap is a curiosity not a force.

3. **Blocker-shuffling is the only effect.** Blockers shift each turn, which feels like the board is moving under you, but it's a cosmetic/disorienting effect — not a new decision.

4. **The "two placements from now" projection** is only required IF the player commits to vertical building. If they only do rows, no such projection is needed. So the new-question requirement is OPT-IN, not enforced by the rules.

5. **Pipeline-disease-adjacent.** The shift removes the player's ability to build stable column structures (columns drift away). It doesn't ADD a new agency in compensation — yes, "wrap-around access" is a thing, but it's a mild positional benefit not a strategic dimension. The mode SUBTRACTS column-building agency without adding equivalent.

**Verdict: REJECT.**

Reasoning: the trace shows that the dominant winning strategy (row-clear focused play) is COMPLETELY IMMUNE to the shift mechanic. The shift only affects cross-row structures (columns), and column-building is strictly harder than row-building under the shift, so a rational player never builds columns. Result: the mode plays exactly like Classic with extra animation. The spec's promised "new placement question" only exists for players who voluntarily handicap themselves by doing column work. The shift is a no-op for optimal play.

The most interesting insight: **the shift mechanic acts on COLUMNS but the line-clear scoring treats rows and columns identically — so the player simply abandons columns and the shift becomes invisible. The mode would only have bite if column clears were scored higher, or if rows were somehow also affected by a different transformation (mode becomes a shape-rotating Bejeweled rather than a Blockit variant).**
