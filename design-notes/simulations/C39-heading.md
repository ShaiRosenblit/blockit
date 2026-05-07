# C39 — Heading: Stage 3 reducer simulation

**Recap of rule:** Each placement records a "heading" (orientation index 0–3, derived from rotation). Line clears triggered by that placement only erase cells in the half-board the heading points toward (top half = rows 0-3, bottom = rows 4-7, left = cols 0-3, right = cols 4-7). The other half remains filled even on a "full row clear."

So if I place a piece with heading=UP and that placement completes row 5, only the half of row 5 that's in the UP-half of the board is cleared. But row 5 is in the BOTTOM half (rows 4-7) — so the heading-UP doesn't intersect row 5's residence at all. Hmm, ambiguity in the rule.

**Re-read of rule:** "line clears triggered by a placement only erase cells in the half-board (top/bottom for orientations 0/2, left/right for orientations 1/3) that the heading points toward; cells in the other half remain even on a full-row clear."

Interpretation: when a row R is completed and the placement's heading is e.g. UP, only the cells of row R that are in the TOP half remain... no wait, "cells in the other half remain on a full-row clear." So heading=UP → top half cleared → rows 0-3 cleared cells of row R, rows 4-7 cells of row R remain.

But row R is one row — it has cells in cols 0-7. "Top half" wouldn't apply to a row clear. The "half-board" in row-clear context must mean "half of THAT row." So heading=LEFT clears cols 0-3 of the completed row; heading=RIGHT clears cols 4-7. For column clears, heading=UP clears rows 0-3 of the column; heading=DOWN clears rows 4-7.

So:
- Heading is one of {UP, DOWN, LEFT, RIGHT}.
- Heading axis is row or column. UP/DOWN are vertical headings (apply to col clears); LEFT/RIGHT are horizontal (apply to row clears). OR: UP/DOWN apply to row clears (clearing the upper/lower half of the row?). The rule text says "top/bottom for orientations 0/2" — orientations 0/2 being top/bottom. So orientation 0 = UP, applies to row clears? "top half cells of the row"? That doesn't match "top half" of a single row.

Cleanest reading: heading defines a half-board (top/bottom/left/right). When ANY row or col completes due to this placement, only the cells of that line that lie in the heading's half-board are cleared.

- Heading=TOP → only rows 0-3 cleared portion. A column clear → only rows 0-3 of that column clear; a row clear → only if the completed row is in rows 0-3, the whole row clears (entirely in top half); if completed row is in rows 4-7, NOTHING clears (no intersection).
- Heading=LEFT → only cols 0-3 cleared portion. A row clear → only cols 0-3 of that row clear; a col clear → only if the completed column is in cols 0-3, whole col clears.

I'll use this interpretation.

**Legend**
- `.` empty, `#` filled
- For heading state, I'll annotate each placement: `placement at (r,c) heading=UP`.

---

## Setup

Score-attack mode (Classic-like, endless tray refill). Empty 8x8 board.
Piece pool excludes rotation-symmetric pieces (square, monomino, +) per the candidate's own risk note.

Tray: P1=L-tetromino, P2=I-tetromino (1×4), P3=Z-tetromino.

The four orientations of L-tetromino each correspond to a different heading. By convention:
- L base orientation (leg on bottom-right): heading=UP.
- L rotated 90 CW: heading=RIGHT.
- L rotated 180: heading=DOWN.
- L rotated 270: heading=LEFT.

I-tetromino: 2 distinct orientations (horizontal/vertical), but rule needs 4 — assign horizontal=LEFT (or RIGHT), vertical=UP (or DOWN). Or treat I as having only 2 headings.

For simulation, assume the rule maps the 4 unique orientations of L/Z/S/J/T to the 4 headings, and I-tetromino has only 2 (UP and LEFT or so).

---

## Move 1 — P1 (L), open board

**Decisions available (4 orientations × ~many positions; pick representative):**
1. Place L heading=DOWN at (0,0). Cells e.g. (0,0)(0,1)(0,2)(1,2). Heading=DOWN.
2. Place L heading=UP at (4,4). Cells (4,4)(5,4)(5,5)(5,6) (some L shape).
3. Place L heading=LEFT at (3,7) — cells fitting near right edge.
4. Place L heading=RIGHT at (3,0) — cells near left edge.

**Future states traded off**
- Empty board, no clears imminent. Heading is irrelevant on move 1 — no placement triggers a clear.
- The choice is purely geometric, identical to Classic.

**Information used:** None heading-specific. Player picks based on Classic intuition (don't fragment the board).

**New question vs Classic:** ZERO on move 1. The heading rule has no effect on placements that don't trigger a clear.

**Pick:** (1) at (0,0). Conservative corner placement, heading=DOWN noted but inert.

After move 1:
```
# # # . . . . .
. . # . . . . .
```
(rows 2-7 all empty)

Heading log: P1 placed heading=DOWN.

---

## Move 2 — P2 (I-tetromino, 1×4)

**Decisions available**
1. I horizontal at (0,3)..(0,6). Cells fill row 0 cols 3-6. Row 0 now (0,0)(0,1)(0,2)(0,3)(0,4)(0,5)(0,6) = 7/8 — needs (0,7) for clear. Heading=horizontal (call it LEFT). Doesn't trigger clear yet.
2. I vertical at (1,7)(2,7)(3,7)(4,7). Heading=UP.
3. I horizontal at (0,3)..(0,6) but rotated to heading=RIGHT. (Same footprint, different heading metadata.)
4. I horizontal at (0,4)..(0,7). Row 0 = 7/8 if I had move 1's footprint; actually (0,3) is empty after move 1, so row 0 = (0,0)(0,1)(0,2)(0,4)(0,5)(0,6)(0,7) = 7/8. Heading=LEFT or RIGHT.

**Future states traded off**
- (1) row 0 reaches 7/8; one more cell clears it. With heading=LEFT, the row 0 clear (when it comes) clears cols 0-3 of row 0 (cells (0,0)(0,1)(0,2)(0,3)) and LEAVES cols 4-7 of row 0 filled. Strange residue.
- (1) with heading=RIGHT: clears cols 4-7 of row 0, leaves cols 0-3.
- (2) builds col 7. Doesn't immediately threaten clear.
- (4) row 0 reaches 7/8 missing (0,3). Heading=RIGHT clears cols 4-7 (cells 4-7) leaving (0,0..3) filled.

**Information used:** Heading prediction — when row 0 eventually clears, which half stays. The retained half becomes anchored debris.

**New question vs Classic:** "If this placement (or a near-future one) triggers a clear, which half-row/col will remain as residue, and is that residue useful (e.g., counts toward a future column clear) or obstructive?" Genuinely new.

**Pick:** (4) at (0,4..7). Heading=RIGHT. Plan: when (0,3) is later filled, row 0 clears cols 4-7, leaving (0,0..3) filled. (0,0..3) all filled is 4 cells of column 0, 1, 2, 3 — useful for col clears.

Wait — (0,0..3) won't all be filled after move 2. After move 1: (0,0)(0,1)(0,2) filled. After move 2 with footprint (0,4..7): row 0 has (0,0)(0,1)(0,2) + (0,4)(0,5)(0,6)(0,7) = 7 filled, (0,3) empty.

After move 2:
```
# # # . # # # #
. . # . . . . .
```

Heading log: P1=DOWN, P2=RIGHT.

---

## Move 3 — P3 (Z-tetromino) — fill (0,3) for the clear?

Z-tetromino cells (one orientation): (0,1)(0,2)(1,0)(1,1) — 4 cells. Heading by orientation: base=UP, rotated=RIGHT etc.

To complete row 0 we need (0,3). A Z piece placed at (0,2) cells (0,3)(0,4) blocked. Z at (-1,3)? out of bounds. Z vertical at (0,3)(1,3)(1,2 blocked)(2,2)? blocked.

Z cells (0,1)(0,2)(1,0)(1,1) means width 3 height 2. To put a cell at (0,3), origin = (0, 2) gives cells (0,3)(0,4 blocked). Origin = (-1, 2) out. Try Z rotated 90: vertical S/Z. Cells (0,0)(1,0)(1,1)(2,1). Origin (0,3) gives cells (0,3)(1,3)(1,4)(2,4). Now (0,3) filled, row 0 = 8/8 → CLEAR.

Heading of this Z orientation: rotated 90 CW = RIGHT. (Or define as DOWN.) Let me say heading=RIGHT.

Row 0 clear with heading=RIGHT: clears cols 4-7 of row 0. (0,4)(0,5)(0,6)(0,7) erased. (0,0)(0,1)(0,2)(0,3) REMAIN.

**Decisions available**
1. Z vertical at (0,3) heading=RIGHT: clears (0,4..7), leaves (0,0..3) — perfect setup for col 0/1/2/3 progress.
2. Z vertical at (0,3) but pre-rotated to heading=LEFT: clears (0,0..3), leaves (0,4..7) — symmetric residue.
3. Z somewhere else, no clear yet, defer the row-0 completion.
4. Z that covers (0,3) AND (1,3)(1,4)(2,4) — same as 1 — but heading varies by orientation.

**Future states traded off**
- (1): row-0 cleared cols 4-7. Residue: (0,0..3) filled, plus (1,2 from move 1), plus from move 3's Z piece: (1,3)(1,4)(2,4) filled. After clear (0,4..7) gone, (0,3) gone (it's in col 3 i.e., LEFT half? cols 0-3 are LEFT half; cols 4-7 are RIGHT half. Heading=RIGHT clears RIGHT half = cols 4-7. (0,3) is in LEFT half so REMAINS. So (0,0)(0,1)(0,2)(0,3) all remain. Plus (1,3)(1,4) remain (row 1 didn't clear), and (2,4) remains.
- (2): row-0 cleared cols 0-3. Residue: (0,4..7) gone... wait, heading=LEFT clears LEFT half = cols 0-3. So (0,0..3) erased; (0,4..7) remain. The Z piece itself: if it had heading=LEFT it must be in a different rotation that still occupies (0,3). Z with heading=LEFT would be the rotation that has cell at (0,3) but with heading-LEFT semantics. OK assume one such exists. (0,4..7) remain, (0,3) erased, plus z's tail cells (1,3)(1,4)(2,4) remain.

Both options yield similar amounts of residue but in different halves.

**Information used:** Heading metadata of the rotation, prediction of which half-clear is preferable, and the FUTURE: am I building toward column clears in cols 0-3 or in cols 4-7?

**New question vs Classic:** Yes, distinct: heading binds rotation choice to direction-of-clear. Classic doesn't ask this.

**Pick:** (1). Setting up column 0..3 progression. Heading=RIGHT.

After move 3 placement (before clear):
```
# # # # # # # #   <- row 0 full
. . # # # . . .
. . . . # . . .
```
After clear (heading=RIGHT clears cols 4-7 of row 0):
```
# # # # . . . .
. . # # # . . .
. . . . # . . .
```

---

## Move 4 — Refill tray (3 new pieces). Pick representative tray: P4=L (4 orientations), P5=T-tetromino, P6=I-tetromino.

State:
```
# # # # . . . .
. . # # # . . .
. . . . # . . .
. . . . . . . .
. . . . . . . .
. . . . . . . .
. . . . . . . .
. . . . . . . .
```

Filled cells: (0,0..3), (1,2)(1,3)(1,4), (2,4). 8 cells filled.

**Decisions available — focus on a representative move:**

Goal: progress toward another clear. Options:
1. Place L at (1,5)(1,6)(1,7)(0,5): would fill row 1 to (1,2..7) = 6, plus (1,0)(1,1) empty = 6/8. Doesn't clear yet. Plus (0,5) fills row 0 to (0,0..3)(0,5) = 5/8.
2. Place L vertically heading=UP at col 0: (0,? — blocked). At (1,0)(2,0)(3,0)(3,1)? (3,0..1) empty. After: col 0 fills to (0,0)(1,0)(2,0)(3,0) = 4/8. Heading=UP.
3. Place T heading=RIGHT at (3,0..2)+(2,1) — heading-RIGHT means future row clears erase right cols. But we're building left-side column clears.

**Future states traded off**
- (2) progresses col 0. Heading=UP — when col 0 eventually clears, heading=UP clears rows 0-3 of col 0; rows 4-7 of col 0 remain. So a future col-0 clear with this heading would erase the cells we just placed (rows 1,2,3) AND (0,0); rows 4-7 col 0 not touched (also empty).
- If instead heading=DOWN, the col-0 clear erases rows 4-7 of col 0 (which are empty — no effect) and rows 0-3 REMAIN filled. Useless clear.

So for col clears that should clear what's filled, heading=UP is correct (when filled cells are in upper half).

**Information used:** Mapping placement orientation → heading → which half of which line gets erased on subsequent clear.

**New question vs Classic:** Multi-step orientation chess: orientation of placement K determines the clear-direction of placement K+something.

**Pick:** Place L heading=UP at (1,0)(2,0)(3,0)(3,1) — but L base shape (0,0)(1,0)(2,0)(2,1) at origin (1,0) gives cells (1,0)(2,0)(3,0)(3,1). Heading depends on which orientation index this is. Let's say this orientation = UP.

After move 4:
```
# # # # . . . .
# . # # # . . .
# . . . # . . .
# # . . . . . .
. . . . . . . .
```
Col 0: rows 0,1,2,3 filled = 4/8.

---

## Move 5 — P5 (T-tetromino) — keep building col 0 and row 1?

T cells: (0,1)(1,0)(1,1)(1,2). 4 orientations:
- Base (stem down): heading=DOWN.
- 90 CW (stem left): heading=LEFT.
- 180 (stem up): heading=UP.
- 270 (stem right): heading=RIGHT.

To advance col 0, need to fill (4,0)(5,0)(6,0)(7,0). T placed vertically:

T 90-CW or 270 (vertical) at (4,0): cells (4,0)(5,0)(6,0)(5,1) or similar. Let's say T heading=LEFT at (4,0): cells (4,0)(5,0)(6,0)(5,1).

After:
```
# # # # . . . .
# . # # # . . .
# . . . # . . .
# # . . . . . .
# . . . . . . .
# # . . . . . .
# . . . . . . .
. . . . . . . .
```

Col 0: rows 0,1,2,3,4,5,6 filled = 7/8. Need (7,0).

Heading log: T placed heading=LEFT. If col 0 completes via a piece with heading=LEFT, then col 0 clear erases LEFT half = cols 0-3 of col 0... wait, col 0 IS in cols 0-3 (left half). So heading=LEFT means clear-LEFT-half-of-board, which intersects col 0 fully. So col 0 fully clears.

If instead final piece has heading=RIGHT, col-0 clear → clear right-half of board = cols 4-7. Col 0 is in left half, so NO part of col 0 clears. The "row/col completed but heading points away from it" makes the line stay completely filled.

**This is the key mechanic finally biting.** The next placement's heading determines whether the clear executes at all (for this line).

---

## Move 6 — P6 (I-tetromino) — finish col 0 with the right heading?

To clear col 0, we need a piece that (a) fills (7,0) and (b) has heading covering left-half (heading=LEFT) or covering top/bottom intersecting col 0... wait.

Recheck rule: heading defines a half-board. Heading=LEFT → cleared portion = cells in LEFT half (cols 0-3). For column 0 (which is in cols 0-3 = LEFT half), heading=LEFT clears all of col 0. Heading=RIGHT clears cols 4-7 of col 0 — none. Heading=UP clears rows 0-3 of col 0 — only top half. Heading=DOWN clears rows 4-7 of col 0 — only bottom half.

So heading=LEFT is the ONLY heading that cleanly clears col 0 entirely.

I-tetromino has 2 distinct orientations: horizontal and vertical. The rule "must support 4 headings" forces us to assign:
- Horizontal: heading=LEFT or RIGHT (1 of these 2).
- Vertical: heading=UP or DOWN (1 of these 2).

But which? If horizontal I always = LEFT and vertical = UP (no rotational ambiguity), the player has limited heading control with the I-piece.

**Decisions for move 6:**
1. I vertical at (4,0)..(7,0): blocked at (4,0)(5,0)(6,0). Invalid.
2. I horizontal at (7,0)..(7,3): fills (7,0). Col 0 = 8/8 → CLEAR. Heading=LEFT (assumption). Col 0 clears: heading=LEFT clears LEFT half (cols 0-3) of col 0 — entire col 0. Done. ALSO row 7 becomes (7,0)(7,1)(7,2)(7,3) = 4/8, no row clear.
3. I horizontal at (7,4)..(7,7): doesn't fill (7,0), no clear.
4. Place I differently to set up a future heading=LEFT placement.

**Pick:** (2). I at (7,0..3). Col 0 clears entirely, evicting (0..7, 0).

But wait — placing piece at (7,0..3) also adds cells. Once col 0 clears, what remains?

Pre-clear state row 7: (7,0)(7,1)(7,2)(7,3) filled by this placement. Col 0 fills due to (7,0). Col 0 clear with heading=LEFT clears (0..7, 0). So (7,0) erased. (7,1)(7,2)(7,3) remain.

After clear:
```
. # # # . . . .
. . # # # . . .
. . . . # . . .
. # . . . . . .
. . . . . . . .
. # . . . . . .
. . . . . . . .
. # # # . . . .
```

Col 0 fully empty. Col 1 row 7 has (7,1). Etc.

---

## Move 7 — Refill, new pieces. Take P7=L, P8=I, P9=T. (Just keep going.)

Board has lots of scattered debris. Total filled: 4+4+1+1+1+3 = ... let me recount. Row 0: (0,1)(0,2)(0,3)=3. Row 1: (1,2)(1,3)(1,4)=3. Row 2: (2,4)=1. Row 3: (3,1)=1. Row 5: (5,1)=1. Row 7: (7,1)(7,2)(7,3)=3. Total = 12 filled, 52 empty. Score from clear: 8 cells (col 0).

Now look at heading-residue effect: most of the residue cells (the cells left over after partial clears) ARE the cells that got placed. If I had used heading=DOWN on move 7's placement that completed col 0, only rows 4-7 of col 0 would have cleared, leaving rows 0-3 of col 0 as a vertical bar at (0..3, 0) — which is a column 0 anchor that's halfway full.

That's the "antagonist" the candidate cited: half-clear residue forming plateaus.

**Heading-aware play:** the player learns to use heading=full-coverage when intending a full clear, and heading=half-coverage when intending to KEEP half (e.g., to immediately set up a perpendicular clear).

Example future move: suppose row 4 has cols 0-7 filled, and I want to keep cols 0-3 of row 4 (because col 1 is also nearly full). I place a piece completing row 4 with heading=RIGHT — this clears cols 4-7 of row 4 only, leaving (4,0..3) as anchors that count toward col 0/1/2/3 fullness.

This is a real new move. There's a positive use of half-clears.

---

## Truncate at move 7 — let me jump to verdict analysis based on what we've seen.

## Verdict

**Question persists?** YES, but conditionally. The heading-as-clear-direction question arises only on placements that (a) trigger a clear or (b) set up a future trigger. In open-board moves (e.g., move 1), heading is inert. After ~3-4 placements when clears become threats, every placement's orientation is now dual-coded (fit AND heading), and the question is genuinely new.

**Trade-off space alive?** YES. Two distinct strategies emerge:
1. **Full-clear strategy**: always pick the heading that clears the full line (heading aligned with the line's half). Plays like Classic but with extra rotation discipline.
2. **Anchor-residue strategy**: deliberately use the "wrong" heading to leave half-row residue that anchors future perpendicular clears. The half-residue becomes a planning tool, not just an antagonist.

These are genuinely different playstyles and the player can mix them per situation.

**Difficulty curve plausible?** Mostly yes. Early moves (empty board) play like Classic, easing the player in. As debris builds, heading questions emerge naturally. The cliff is shallower than C49 because most placements still have a "Classic-correct" answer; heading just adds a secondary axis.

**Concerns:**
1. **Symmetric pieces are second-class citizens.** I-tetromino has 2 orientations but the rule wants 4 headings. Assigning horizontal=LEFT and vertical=UP (or RIGHT/DOWN) gives the I-piece reduced heading flexibility. The square and monomino must be excluded outright, shrinking the piece pool. The candidate flagged this; it's a real shrinkage.
2. **Heading mapping is arbitrary.** The mapping rotation→heading is a learned convention with no inherent mnemonic. UI must show a directional arrow on each tray slot; players will confuse the arrow with "this is which way the piece goes" (i.e., gravity/drop semantics).
3. **A heading that "doesn't intersect" the cleared line means NO clear.** This is the strangest case: a row that fills doesn't clear at all because the placement that filled it points the wrong way. Players will perceive this as a bug. Mitigation: always animate "would have cleared" feedback.
4. **Move 1 has zero new question.** The mode doesn't bite until clears are imminent. First-impression problem — feels like Classic until move 4.
5. **The "clear axis must match line axis" subtlety.** Heading=UP / DOWN cleanly affects column clears (clearing half of the column). Heading=LEFT / RIGHT cleanly affects row clears. But what about diagonal mismatches: row clear with heading=UP — does NOTHING clear (because heading-UP's half-board is rows 0-3, intersected with a row R: if R ≤ 3 the whole row is in the half so it clears entirely; if R ≥ 4 nothing intersects, no clear)? This mostly works but creates an asymmetry where heading=UP can clear rows 0-3 fully but never rows 4-7. Creates board halves that play very differently. (Could be considered a feature.)

**Compared to anti-patterns:**
- Mirror disease: NO. Heading is independent metadata — different orientations of the same piece geometry produce different headings, so the player has TWO decisions (fit AND heading) where Classic had one.
- Breathe disease: NO. The half-clear behavior is genuinely new; no Classic rule implies it.
- Pipeline disease: NO. Nothing is taken away; heading is a new dimension on existing rotation choice.
- Scar disease: NO. Heading is fully player-controlled.

**Verdict: SURVIVE.** The new question (orientation now binds clear-direction) is real and persistent past the first few moves. Two distinct strategies (full-clear vs anchor-residue) keep the trade-off space alive. Difficulty curve is benign because Classic intuition still gets you partway. The big risks (symmetric piece exclusion, heading mapping legibility, move-1-feels-like-Classic) are UI/onboarding problems — not structural collapse.

**Risks flagged for Stage 4 prototype:**
1. Heading-rotation mapping must be visually obvious on tray pieces and in the rotation animation.
2. The "clear was triggered but heading didn't intersect → no clear" case must be animated explicitly (red ghost-clear + heading arrow), or players will think the game is broken.
3. Generator (if puzzle variant) must guarantee the target requires at least one anchor-residue-style placement, otherwise full-clear strategy degenerates the mode to Classic-with-rotation-discipline.
4. Square and monomino exclusion shrinks the piece variety — confirm pool still plays well without them.
