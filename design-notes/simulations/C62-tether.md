# C62 — Tether: Stage 3 reducer simulation

## Rules recap (mechanics-speak)

- Tray slots 1 and 2 are paired; slot 3 is free.
- When the player places a piece from slot 1, the next placement from slot 2 must include at least one cell within Chebyshev-distance ≤ 2 of any cell of the slot-1 placement (and vice versa). I.e. the pair-partner placement must intersect the 5×5 window centered on any cell of the prior partner placement.
- The "partner constraint" persists until the partner slot is used: place slot 1 → next slot-2 placement is tethered. Once slot 2 is placed, the constraint clears (or resets?). I'll assume the constraint resets per round: each time slot 1 is placed, the next slot-2 use is tethered to it; same the other way. Slot 3 is unconstrained.
- Tray refills as in Classic (Score-attack, infinite); each new slot-1 piece resets the tether anchor.

## Legend

```
.   empty
#   filled (any color — Classic-style fill)
A   cell of the slot-1 partner's last placement (the tether anchor)
T   cell within tether window (Chebyshev ≤ 2 of any A cell) — i.e. legal slot-2 landing zone
```

For each move I'll show post-placement board, marking the active anchor when relevant.

## Starting state

Mid-game Score-attack, board has organic clutter. Eight cells filled.

```
col:  0 1 2 3 4 5 6 7
row 0 . . . . . . . .
row 1 . . . . # . . .
row 2 . . . # # # . .
row 3 . . . . # . . .
row 4 . . . . . . . .
row 5 . . . . . . . #
row 6 # # . . . . # #
row 7 # # . . . . # #
```

Tray:
- Slot 1 (paired): L-tetromino `[X .][X .][X X]` (3 tall, 2 wide)
- Slot 2 (paired): 1×3 horizontal bar
- Slot 3 (free): 2×2 square

No active tether (this is the start of a fresh tray triplet).

---

## Move 1

**Decisions available:**
1. Place slot 1 (L-tet) at top-left, origin (0,0): cells (0,0)(1,0)(2,0)(2,1). Anchor footprint.
2. Place slot 1 at upper-right, origin (0,5): cells (0,5)(1,5)(2,5)(2,6). But (2,5) is filled. Illegal.
3. Place slot 1 at row 4 area, origin (4,2): cells (4,2)(5,2)(6,2)(6,3). All empty. Legal.
4. Place slot 1 rotated to be wide, origin (4,4): orientation `[X X][. X][. X]` cells... let's say (4,4)(4,5)(5,5)(6,5). All empty. Legal.
5. Place slot 2 (1×3 bar) first instead — anchors slot 1 next. Bar at row 0 cols 0–2 → anchor cells (0,0)(0,1)(0,2). Tether window for slot 1 will be Chebyshev ≤ 2 of any of those = rows 0–2, cols 0–4. Plenty of room there for L-tet.
6. Place slot 3 (free, 2×2) first — costs no tether budget. E.g. at (0,0) → fills 4 cells with no constraint.

**Future states traded off:**
- Option 1 (slot 1 at top-left): anchors at corner. Slot 2 (1×3 bar) tether window = Chebyshev ≤ 2 of (0,0)(1,0)(2,0)(2,1). Union of 5×5 windows — basically rows 0–4, cols 0–3. Lots of options for the bar (need 3 contiguous empty cells in a row within that box — row 0 cols 0–2 is filled by L? No, only (0,0). Row 0 cols 1–3 empty, in box. Row 3 cols 0–2 empty, in box. Many options.)
- Option 3 (slot 1 mid-board at (4,2)): anchor footprint at (4,2)(5,2)(6,2)(6,3). Tether window = rows 2–8 (clamped 2–7), cols 0–5. Huge window, almost half the board. Slot 2 bar can land almost anywhere.
- Option 5 (slot 2 first): bar at row 0 anchors slot 1 to upper region. Useful if slot 1 (L-tet) wants to land top.
- Option 6 (slot 3 first): no tether spent yet, but pieces in tray waiting. Could let me see how the slot-3 placement affects empty-space topology before committing to a tether.

**Information player is using:**
- Pair membership (which slots are tethered).
- Existing fill topology — clusters in mid-board (around row 2) and corners (rows 6–7).
- Where I want to clear a line — currently no line is close to complete; row 6 is 4/8, row 7 is 4/8. Hard to threaten without 4 more pieces in those rows.
- Tether window projection.

**New question vs Classic:** "Where do I land slot 1 to maximise slot 2's flexibility — i.e. choose an anchor that sits in a high-empty-density area so slot 2 has many legal origins?" Classic asks "where does slot 1 fit best on its own"; Tether asks "where does the *pair* fit best collectively."

**Pick:** Option 3 — slot 1 (L-tet) at (4,2). Mid-board anchor maximises tether window's empty-cell density.

```
col:  0 1 2 3 4 5 6 7
row 0 . . . . . . . .
row 1 . . . . # . . .
row 2 . . . # # # . .
row 3 . . . . # . . .
row 4 . . A . . . . .
row 5 . . A . . . . .
row 6 # # A A . . # #
row 7 # # . . . . # #
```

Tether anchor cells: (4,2)(5,2)(6,2)(6,3). Slot 2 must place within Chebyshev ≤ 2 of one of those.

---

## Move 2

**Decisions available:**
1. Place slot 2 (1×3 bar) horizontal at row 4, cols 3–5: (4,3)(4,4)(4,5). All within Chebyshev 2 of (4,2). Legal placement, legal tether.
2. Place slot 2 horizontal at row 7, cols 2–4: (7,2)(7,3)(7,4). (7,2) is Chebyshev 1 from (6,2) and (6,3). Tether OK. Builds toward row 7 completion (row 7 = `# # . . . . # # ` → with bar at 2–4 becomes `# # B B B . # #` = 7/8).
3. Place slot 2 horizontal at row 0, cols 0–2: anchor cells are at rows 4–6. Chebyshev from (0,*) to (4,2) = 4. NOT in tether window. ILLEGAL by tether.
4. Place slot 2 vertically (rotate) at col 4, rows 3–5: (3,4)(4,4)(5,4). (3,4) filled. Illegal placement.
5. Place slot 2 vertically at col 1, rows 4–6: (4,1)(5,1)(6,1). (6,1) filled. Illegal.
6. Place slot 2 vertically at col 5, rows 4–6: (4,5)(5,5)(6,5). All empty. (4,5) Chebyshev from (4,2) = 3, NOT ≤ 2. (5,5) from (6,3) = max(1,2) = 2, OK. Tether legal.
7. Place slot 3 (free, 2×2) first to defer tether decision: e.g. at (0,0) fills upper-left corner.

**Future states traded off:**
- Option 2 (bar at row 7, cols 2–4): row 7 → 7/8. Sets up "row 7 needs 1 cell at col 4 or 5 to clear" — wait no, after placement row 7 = `# # B B B . # #`, gap at col 5. Need a piece dropping a cell into (7,5). With slot 3 (2×2) I could drop at (6,4)(6,5)(7,4)(7,5). But (7,4) is now filled. Conflict. Or with future tray. The setup is valuable.
- Option 6 (bar vertical at col 5 rows 4–6): builds col 5 toward completion. Col 5 already has (2,5). After: (2,5)(4,5)(5,5)(6,5) = 4/8. Less tight than option 2.
- Option 7 (slot 3 first): doesn't spend tether but doesn't progress anything specific. Tether persists into next turn.

**Information player is using:**
- Tether window highlight (UI shows which cells are tether-legal — assumed).
- Row 7 / col 5 progression status.
- Slot 3 as bailout option.

**New question vs Classic:** "Slot 2 has multiple legal origins; which one creates the strongest follow-up — and does playing slot 3 first instead let me see one more piece before committing the tether?" Classic doesn't pose the tether-deferral question.

**Pick:** Option 2 — slot 2 bar at row 7 cols 2–4. Sets up row 7 near-completion.

```
col:  0 1 2 3 4 5 6 7
row 0 . . . . . . . .
row 1 . . . . # . . .
row 2 . . . # # # . .
row 3 . . . . # . . .
row 4 . . # . . . . .
row 5 . . # . . . . .
row 6 # # # # . . # #
row 7 # # # # # . # #   <- 7/8
```

Tether is now consumed (slot 2 placed). Anchor reset.

---

## Move 3

Tray: slot 3 (2×2 square) plus refills for slots 1 and 2.

Refills (sample):
- New slot 1: T-tetromino `[X X X][. X .]`
- New slot 2: J-tetromino

**Decisions available:**
1. Place slot 3 (2×2) at (6,4): cells (6,4)(6,5)(7,4)(7,5). (7,4) filled. Illegal.
2. Place slot 3 at (6,4) shifted to (5,4): cells (5,4)(5,5)(6,4)(6,5). All empty. Legal. After: row 6 → `# # # # # # # #` = 8/8 → COMPLETES row 6 → CLEAR. Also col 4 progress.
3. Place slot 3 at (0,0): clean fill upper-left.
4. Place slot 1 (T-tet) somewhere — would set up new tether anchor.

**Future states traded off:**
- Option 2 (2×2 at (5,4)): triggers row 6 clear AND completes (5,5)(6,5)(7,5) — col 5 progression: was (2,5), now (5,5)(6,5)(7,5) added but (5,5)(6,5) get cleared with row 6. So post-clear col 5 has (2,5) and (7,5) (from move 2 bar — wait no, the bar was at (7,2)(7,3)(7,4) — (7,5) was NOT placed. Re-examine. After this 2×2 places (5,5)(6,5)(7,5)?? No — 2×2 at origin (5,4) covers (5,4)(5,5)(6,4)(6,5). NOT (7,*). So row 6 becomes 8/8 and clears. Row 7 stays at `# # # # # . # #` 7/8.
- After clear of row 6:
```
col:  0 1 2 3 4 5 6 7
row 0 . . . . . . . .
row 1 . . . . # . . .
row 2 . . . # # # . .
row 3 . . . . # . . .
row 4 . . # . . . . .
row 5 . . # . X X . .   (X = the 2×2 cells in row 5 surviving)
row 6 . . . . . . . .
row 7 # # # # # . # #
```
Row 6 wiped, slot 3 cells in row 5 survived. Score +1 row.
- Option 4 (slot 1 first): commits tether direction. T-tet at (0,0) anchors top-left. Then slot 2 (J-tet) tethered to top-left.

**Information player is using:**
- Row 6 is one-step-clearable with a piece that fits exactly.
- Slot 3 is the only free piece — best used opportunistically when no tether constraint matters.

**New question vs Classic:** Same as Classic on this turn (slot 3 is unconstrained), but the *meta* question is "should I burn slot 3 on the obvious clear, or save it as bailout in case slot 1+2 plans soft-lock?" That's the new question.

**Pick:** Option 2 — slot 3 at (5,4). Clears row 6.

After clear:
```
col:  0 1 2 3 4 5 6 7
row 0 . . . . . . . .
row 1 . . . . # . . .
row 2 . . . # # # . .
row 3 . . . . # . . .
row 4 . . # . . . . .
row 5 . . # . # # . .
row 6 . . . . . . . .
row 7 # # # # # . # #
```

Slot 3 used. Tray now has slot 1 (T-tet) and slot 2 (J-tet) only. NO BAILOUT remaining for tether soft-lock.

---

## Move 4

**Decisions available:**
1. Place slot 1 (T-tet) somewhere. Whatever the anchor, slot 2 (J-tet, 4 cells) must fit in tether window.
2. Place slot 2 first — same logic inverted.

T-tet has 4 orientations. J-tet has 4 orientations (8 cells worth in tray).

Critical: slot 3 is empty, so tray refill rule says the tray refills when ALL THREE slots are empty (Classic behavior — verify? The candidate spec doesn't override. Assume Classic refill: 3 slots → refill when all empty). So slot 3 won't refill until slots 1+2 also play.

**Options for slot 1 (T-tet) origin:**
- (0,0): cells (0,0)(0,1)(0,2)(1,1). All empty. Tether window for slot 2 = rows 0–3, cols 0–4 (clamped). J-tet has cells like (0,0)(1,0)(2,0)(2,1) — 4 cells. Fits in window? Origins inside the 5×5 box around any anchor cell. Many fits, e.g. (0,3)–(2,4) area.
- (3,5): cells (3,5)(3,6)(3,7)(4,6). (3,5) empty? Yes. All empty. Tether window rows 1–6, cols 3–7. J-tet fits at e.g. (5,5) origin: (5,5) filled. Illegal. (5,6): (5,6)(6,6)(7,6)(7,7) — (7,6)(7,7) filled. Illegal. (4,3): J-tet at (4,3) cells (4,3)(5,3)(6,3)(6,4) — (4,3)(5,3)(6,3)(6,4) — all empty. (6,3) Chebyshev from (3,5)? max(3,2)=3 → not ≤ 2. (6,4) from (4,6)? max(2,2)=2 → OK. Tether legal.
- (5,5): already filled. Skip.
- (4,2): cells (4,2)(4,3)(4,4)(5,3). (4,2) filled. Illegal.

**SOFT-LOCK check:** After placing slot 1, I MUST be able to legally place slot 2 inside the tether. Need to verify each slot-1 candidate. With J-tet (4 cells) the search space is non-trivial.

If I pick T-tet at (3,5), and the only tethered J-tet origin is (4,3), I have ONE placement. If after I place the J-tet I haven't completed any line, I'm OK. If the J-tet placement clutters the board badly, future tethers may fail.

If I pick T-tet at (0,0), J-tet has many tether-legal origins. SAFER.

**Future states traded off:**
- T-tet at (0,0) + J-tet at (0,3) origin: cells (0,3)(1,3)(2,3)(2,4). (2,3)(2,4) filled. Illegal. Try (0,4): (0,4)(1,4)(2,4)(2,5). (1,4)(2,4)(2,5) filled. Illegal. Try (3,0): (3,0)(4,0)(5,0)(5,1). All empty. (3,0) Chebyshev from (1,1)? max(2,1)=2 OK. Tether legal. Good.
- After T-tet at (0,0) + J-tet at (3,0): col 0 has fill at rows 3,4,5,7 + corner of row 6 (wait row 6 was cleared and slot 3 didn't fill (6,0)). Col 0 = rows 3,4,5,7 = 4/8. Col 1 = (5,1)(7,1) = 2/8.

**Information player is using:**
- Tether window mental projection for each slot-1 origin.
- Counting J-tet legal origins inside the projected window — this is real cognitive work.
- Bailout (slot 3) is GONE, so soft-lock would end the run.

**New question vs Classic:** "Which slot-1 origin maximises slot-2's legal-origin COUNT inside the tether window?" The player is optimizing a count of follow-up options, not the immediate placement quality. Classic doesn't measure this.

**Pick:** T-tet at (0,0). Maximises slot-2 flexibility.

```
col:  0 1 2 3 4 5 6 7
row 0 A A A . . . . .
row 1 . A . . # . . .
row 2 . . . # # # . .
row 3 . . . . # . . .
row 4 . . # . . . . .
row 5 . . # . # # . .
row 6 . . . . . . . .
row 7 # # # # # . # #
```

Tether anchor: (0,0)(0,1)(0,2)(1,1). Slot 2 (J-tet) must place within Chebyshev 2.

---

## Move 5

**Decisions available (all J-tet placements in tether window):**
1. J-tet at (3,0): (3,0)(4,0)(5,0)(5,1). All empty, tether OK. Builds col 0.
2. J-tet at (1,3): (1,3)(2,3)(3,3)(3,4). (2,3)(3,4) filled. Illegal.
3. J-tet at (2,3) flipped/rotated: many orientations. Let's pick rotated 90: cells (0,0)(0,1)(0,2)(1,2). Wait that's a different J-tet form; let me just pick from standard orientations. A horizontal J: `[X . .][X X X]` = (0,0)(1,0)(1,1)(1,2). At origin (3,0): (3,0)(4,0)(4,1)(4,2). (4,2) filled. Illegal.
4. J at origin (0,3): standard `[X .][X .][X X]` = (0,0)(1,0)(2,0)(2,1) → cells (0,3)(1,3)(2,3)(2,4). (2,3)(2,4) filled. Illegal.
5. J at (3,1): cells (3,1)(4,1)(5,1)(5,2). (5,2) filled. Illegal.
6. J at (3,0) (option 1 again — confirming legality).

After scanning: option 1 (and a couple of variants) are the only legal tether placements. The board's mid-clutter (cells at (1,4)(2,3)(2,4)(2,5)(3,4)(4,2)(5,2)(5,4)(5,5)) restricts J-tet's options sharply.

**Future states traded off:**
- J-tet at (3,0): col 0 → 4/8, plus advances col 1. Row 5 gets (5,1) → row 5 = `. # # . # # . .` = 4/8.
- (Almost no other choice.)

**Information player is using:**
- Realisation that despite picking the "flexible" anchor, J-tet's footprint shape combined with mid-board clutter leaves only ~1–2 legal placements. Tether window is a NECESSARY but not SUFFICIENT condition; piece geometry vs board clutter is the binding constraint.

**New question vs Classic:** "Did my anchor choice actually give slot 2 multiple options, or did board clutter collapse the window to a single forced placement?" The genuine planning depth is here — anchor selection requires modelling the post-placement board's interaction with the partner's footprint shape, not just the raw tether geometry.

**Pick:** J-tet at (3,0).

```
col:  0 1 2 3 4 5 6 7
row 0 # # # . . . . .
row 1 . # . . # . . .
row 2 . . . # # # . .
row 3 J . . . # . . .
row 4 J . # . . . . .
row 5 J J # . # # . .
row 6 . . . . . . . .
row 7 # # # # # . # #
```

Tether consumed.

---

## Move 6

Tray: now empty (all three slots used). Refill triggers: 3 new pieces.

Refills (sample):
- New slot 1: 1×4 horizontal bar
- New slot 2: 2×2 square
- New slot 3: I-tromino (1×3)

**Decisions available:**
1. Place slot 1 (1×4 bar) horizontal at row 6, cols 2–5: (6,2)(6,3)(6,4)(6,5). All empty. Anchor footprint.
2. Place slot 1 at row 0, cols 3–6: (0,3)(0,4)(0,5)(0,6). All empty. Anchor for slot 2 in upper area.
3. Place slot 1 vertical (rotated) at col 6, rows 0–3: (0,6)(1,6)(2,6)(3,6). All empty. Anchor on right side.
4. Place slot 3 (free) first to recon: 1×3 at row 7, cols 5–7: (7,5)(7,6)(7,7). (7,6)(7,7) filled. Illegal. Try (7,3)–(7,5): (7,3)(7,4) filled. Illegal. (6,5)–(6,7): (6,5)(6,6)(6,7) all empty. Legal. After: row 6 = `. . . . . # # #` = 3/8.

**Future states traded off:**
- Option 1 (1×4 bar at row 6 cols 2–5): row 6 → 4/8. Anchor cells span. Tether window for slot 2 (2×2) = rows 4–8 (clamped 4–7), cols 0–7. Huge window — lots of 2×2 origins.
- Option 2 (bar at row 0 cols 3–6): completes row 0 toward 7/8 (with (0,0)(0,1)(0,2) already filled from move 4 T-tet). Wait T-tet at (0,0) filled (0,0)(0,1)(0,2)(1,1). So row 0 = `# # # . . . . .`. After bar: `# # # # # # # .` = 7/8. One cell from clear.
- Slot 2 (2×2) tethered to row 0 anchor. 2×2 fits at (0,0)? Already filled. (1,3)? cells (1,3)(1,4)(2,3)(2,4) — (1,4)(2,3)(2,4) filled. Illegal. (1,5)? (1,5)(1,6)(2,5)(2,6) — (2,5) filled. Illegal. (1,6)? (1,6)(1,7)(2,6)(2,7) — all empty. Legal. Tether? Chebyshev from (0,5)(0,6) → (1,6) is dist 1. OK.
- After: row 1 cols 6,7 filled, row 2 cols 6,7 filled. Combined with prior bar: row 0 7/8, row 1 = `. # . . # . # #` = 4/8.

**Information player is using:**
- Row 0 near-completion math.
- Tether window projection vs slot 2 piece shape.
- Slot 3 as sequencer / recon.

**New question vs Classic:** "Order — slot 3 first to gather info then commit tether? Or commit tether immediately to set up a clear?" Plus the recurring "where does slot 1 anchor for max slot-2 flexibility?"

**Pick:** Option 2 — slot 1 (bar) at row 0, cols 3–6, setting up row 0 near-clear. Then slot 2 fits at (1,6).

```
col:  0 1 2 3 4 5 6 7
row 0 # # # A A A A .
row 1 . # . . # . . .
row 2 . . . # # # . .
row 3 # . . . # . . .
row 4 # . # . . . . .
row 5 # # # . # # . .
row 6 . . . . . . . .
row 7 # # # # # . # #
```

Anchor: (0,3)(0,4)(0,5)(0,6).

---

## Move 7

**Decisions available (slot 2, 2×2, in tether):**
1. 2×2 at (1,6): (1,6)(1,7)(2,6)(2,7). All empty. Tether OK.
2. 2×2 at (1,3): partial fills, blocked by (1,4)(2,3)(2,4).
3. 2×2 at (1,5): blocked by (2,5).
4. 2×2 at (0,3): blocked (just placed bar).

Only option 1 is legal.

**Future states traded off:**
- After 2×2 at (1,6): row 0 needs (0,7) for clear. Col 6 = (0,6)(1,6)(2,6)(6,6 from earlier slot 3 if I'd played it)... wait I didn't play slot 3 in move 6. So col 6 = (0,6)(1,6)(2,6) = 3/8. Col 7 = (1,7)(2,7)(6,7)(7,7) = 4/8.
- Slot 3 (1×3 free) still available next turn. Could slot 3 close (0,7)? It's 1 cell, slot 3 is 3 cells. 1×3 at (0,5)–(0,7): (0,5)(0,6) filled. Illegal. 1×3 at row 0 alone won't fit. Vertical 1×3 at col 7 rows 0–2: (0,7)(1,7)(2,7) — (1,7)(2,7) just filled. Illegal. 

So I'm SET UP for row 0 near-clear but no piece in tray (after slot 2 plays) can close it. Need future tray.

**Information player is using:**
- Slot 3 piece shape vs the row 0 single-gap closer requirement.
- Realization that the immediate "set up for clear" will not pay off this turn — need to wait one more refill cycle.

**New question vs Classic:** Classic would also note "row 0 needs 1 cell" — same observation. Tether's contribution is that the slot-2 placement HAD to fit in the window, which it did (only one option). The "where does slot 1 land" question was real on the prior turn.

**Pick:** 2×2 at (1,6).

```
col:  0 1 2 3 4 5 6 7
row 0 # # # # # # # .
row 1 . # . . # . J J
row 2 . . . # # # J J
row 3 # . . . # . . .
row 4 # . # . . . . .
row 5 # # # . # # . .
row 6 . . . . . . . .
row 7 # # # # # . # #
```

Tether reset.

---

## Move 8

Tray: slot 3 (1×3 free) plus next refill cycle when slots 1+2 play.

Wait — slots 1 and 2 both played, slot 3 still has the 1×3. Tray is not all-empty, so no refill yet.

**Decisions available:**
1. Place slot 3 (1×3 horizontal) at row 6, cols 0–2: (6,0)(6,1)(6,2). All empty. Row 6 → 3/8. No clear.
2. Place slot 3 vertical at col 0, rows 6–7? (7,0) filled. Illegal.
3. Place slot 3 horizontal at row 4, cols 3–5: (4,3)(4,4)(4,5). All empty. Row 4 → 4/8.
4. Place slot 3 at row 6, cols 3–5: (6,3)(6,4)(6,5). All empty. Row 6 → 3/8.

No tether constraint (slot 3 free). Pick wherever. But: this is the ONLY piece in tray. After playing it, ALL slots empty → refill. The next refill is what enables the row 0 closer.

**Future states traded off:** Pick a placement that progresses *another* near-complete line. Row 7 has gap at (7,5) only — a 1×3 cannot drop one cell into (7,5) without overflowing. Bar vertical at col 5, rows 5–7: (5,5) filled. Illegal. Bar vertical at col 5, rows 4–6: (4,5)(5,5)(6,5) — (5,5) filled. Illegal. No way to close row 7 with this piece either.

So slot 3 is just clutter management. Pick option 4 (row 6 cols 3–5) to build mid-board.

**Information player is using:** Refill timing. Tray emptying triggers refill, which may finally provide a row 0 / row 7 closer.

**New question vs Classic:** None unique — slot 3 is unconstrained, behaves Classic-like.

**Pick:** Option 4.

```
col:  0 1 2 3 4 5 6 7
row 0 # # # # # # # .
row 1 . # . . # . # #
row 2 . . . # # # # #
row 3 # . . . # . . .
row 4 # . # . . . . .
row 5 # # # . # # . .
row 6 . . . F F F . .
row 7 # # # # # . # #
```

Tray empty → refill.

---

## Verdict

**Question persists?** YES. The "where do I land slot 1 to maximise slot 2's legal-origin count inside the tether window?" question recurred at moves 1 and 4 and 6. It also evolved into "is there enough room in the tether window for slot 2's footprint, given board clutter?" — confirmed at move 5 where the supposedly-flexible anchor at (0,0) gave only one J-tet legal placement.

The question is sharper than it first appears: it is NOT just "anchor in a wide-empty area" — it is "anchor such that the partner piece's specific footprint shape fits *somewhere* in the window." Since you don't always know the partner piece's shape until you commit (no — you do: both are visible in tray), the question reduces to a 2-piece joint placement search: enumerate (anchor origin) × (partner origin in window) pairs and pick the pair you like.

**Trade-off space alive?** YES, multiple distinct strategies surfaced:
- **Tight anchor for clear setup**: place slot 1 to immediately set up a near-clear, accepting reduced slot-2 flexibility (move 6 — bar at row 0).
- **Wide anchor for safety**: place slot 1 in a low-clutter region, no immediate clear payoff but max slot-2 options (move 1 — L-tet at (4,2)).
- **Slot-3 deferred**: hold slot 3 as soft-lock bailout (we burned it move 3 — possibly mistake; the candidate spec flags this exact concern).

The "burn slot 3 early vs save for tether bailout" axis is a real recurring decision.

**Difficulty curve plausible?** The trace stayed engaging through 8 moves. The mode rewards mental simulation of partner placement before committing the anchor — that's genuine cognitive depth, not arithmetic. Mid-game clutter naturally tightens tether windows, increasing difficulty as the board fills (similar to Classic's natural difficulty escalation).

**Risks confirmed in trace:**
- Soft-lock is real: at move 5, the J-tet had essentially one legal tether placement. Had it been zero, the run would have ended without slot 3 to bail. The candidate spec's "need a generator constraint that guarantees ≥k legal partner placements at every step" is necessary.
- Slot 3 burn timing matters and is genuinely tricky: spending slot 3 on the obvious clear (move 3) felt right but reduced future bailout capacity.
- Tether constraint sometimes degenerates into "only one legal placement" — then the tether stops being a planning question and becomes a forced move. This happened at move 7. If this is too frequent, the mode collapses to "anchor cleverly, then accept the forced partner placement."

**Distinctness from Classic:** Genuinely new joint-placement question. The 2-piece coupled decision is novel — no existing mode (Mirror, Pipeline, Quarantine, etc.) requires modelling pair geometry across two pieces. Mirror couples one piece to itself; Tether couples two pieces.

**Distinctness from Mirror disease:** The slot-2 placement is NOT a function of slot-1's placement — the player still chooses among multiple legal tethered origins. Confirmed at moves 4–5 where the search space was non-trivial.

**Distinctness from Pipeline disease:** Adds tether decision rather than removing slot agency — slot 3 free, slot order chosen, partner origin chosen.

**Verdict: SURVIVE.**

The new question persists and remains non-trivial across moves. Two strategies (tight-anchor-for-clear-setup vs wide-anchor-for-safety) coexist visibly. The soft-lock risk is real but mitigatable by generator constraints. Slot 3 timing is a genuine recurring meta-decision. Watch out for: tether window degeneracy (force-moves) and soft-lock without bailout.
