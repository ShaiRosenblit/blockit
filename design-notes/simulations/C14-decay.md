# C14 — Decay: Stage 3 reducer simulation

## Rules recap (mechanics-speak)

- Every placed cell carries an integer `age` set to 0 when written.
- After each subsequent placement (anywhere on the board), every existing cell's age increments by 1.
- A row/column clears only when (a) every cell in it is non-empty AND (b) every cell in it has `age >= 3`.
- A "ripe" but incomplete row stays. A "complete but young" row stays.
- Ages are visible via cell tint (legend: `0` = age 0, `1` = age 1, `2` = age 2, `3` = age 3+ "ripe").

## Legend

```
.   empty
0   filled, age 0 (just placed)
1   filled, age 1
2   filled, age 2
3   filled, age 3+ ("ripe", clears next time the line completes)
```

After each placement I'll show the board *after* the age increment that placement triggers — so the cells *of the just-placed piece* show as `0` and everything else has aged up.

## Starting state

Mid-run snapshot, ~10 placements in. Cell ages reflect their placement turn.
The bottom-right has older cells; row 5 is one cell short of complete.

```
col:  0 1 2 3 4 5 6 7
row 0 . . . . . . . .
row 1 . . . . . . . .
row 2 . . . . . . . .
row 3 . . . 3 3 . . .
row 4 . . 3 3 2 . . .
row 5 . 3 3 3 2 2 . 3   <- 7 of 8 filled, gap at col 6
row 6 . . . 2 2 1 1 1
row 7 . . . . . 1 1 1
```

Tray:
- A: 1×3 horizontal bar `[X][X][X]`
- B: L-tromino (2 tall, 2 wide, missing top-right)
  ```
  [X][.]
  [X][X]
  ```
- C: 2×2 square

---

## Move 1

**Decisions available:**
1. Place A (1×3) at row 5, cols 5–7 → would land on existing fill at (5,5),(5,7). Illegal — collision. (Rule out.)
2. Place A (1×3) horizontally at row 0, cols 0–2 — pure new fill, age 0.
3. Place A vertically (rotate) at col 6, rows 0–2 — fills the column 6 above the row-5 gap, building toward "drop into (5,6) later."
4. Place A horizontally at row 7, cols 0–2 — completes nothing yet, ages 1s in row 7 toward 2.
5. Place A horizontally at row 6, cols 0–2 — same idea, fills row 6's left gap.
6. Place B or C first instead — but A is the most "structural" piece. Lock A choice for now.

**Future states traded off:**
- Option 3 (vertical at col 6, rows 0–2) sets up so that *eventually* dropping a single cell into (5,6) completes row 5. Row 5's cells are ages `3,3,3,2,2,_,3` — already five ripe; with two more ageing turns, the 2s become 4s. Closing (5,6) with a fresh `0` would make row 5 complete-but-not-ripe (the new cell is age 0). The clear would NOT fire. The player must close (5,6) and then perform 3+ more placements before ageing makes that cell ripe.
- Option 5 (horizontal at row 6, cols 0–2) progresses row 6 (currently 4/8) toward later ripening but doesn't help row 5.

**Information player is using:**
- Per-cell ages (visible tint).
- Which rows are "near-complete + already mostly ripe" — row 5 jumps out.
- Tray geometry: 1×3 horizontal can sit in row 0, but only 1×3 *vertical* can drop a single cell into (5,6) later via the column.

**New question vs Classic:** Classic would say "fill (5,6) now to clear row 5." Decay says "fill (5,6) now and you commit row 5 to standing for 3+ more turns; do you have the runway?"

**Pick:** Option 3 — A vertical at col 6, rows 0–2. This deliberately *avoids* closing row 5 because the closer would be young; instead it stages a drop into (5,6) at a future turn after the column above ages. (Actually a simpler path: don't fill (5,6) yet at all — let row 5's existing cells continue to age. The column placement at col 6 above also threatens column 6: col 6 would have rows 0,1,2 filled by A, row 5 still empty, rows 6,7 filled = 5/8.)

```
col:  0 1 2 3 4 5 6 7
row 0 . . . . . . 0 .
row 1 . . . . . . 0 .
row 2 . . . . . . 0 .
row 3 . . . 3 3 . . .   (was 3, stays 3 — capped)
row 4 . . 3 3 3 . . .   (2→3)
row 5 . 3 3 3 3 3 . 3   (2→3 etc, all ripe now)
row 6 . . . 3 3 2 2 2   (1→2, 2→3)
row 7 . . . . . 2 2 2   (1→2)
```

Row 5 is now fully ripe (`3 3 3 3 _ 3` minus the gap at col 6). Filling (5,6) with anything age≥3 would clear it. But fresh fills land at age 0.

---

## Move 2

**Decisions available:**
1. Place B (L-tromino) at row 5–6, col 6–7 — would write to (5,6),(6,6),(6,7) — but (6,6),(6,7),(5,7) are filled. Need to study orientation.
2. Place B at row 0–1, cols 3–4 — clean new fill, ages 0.
3. Place C (2×2) at row 0–1, cols 0–1 — clean new fill.
4. Place C at row 6–7, cols 0–1 — fills lower-left empties; advances row 6 to 6/8 and row 7 to 4/8.
5. Place B vertically somewhere to threaten col 0 or col 1.

**Future states traded off:**
- Critical observation: I do NOT want to fill (5,6) with an age-0 cell, because row 5 would then become "complete, but cell (5,6) is age 0; clear blocked for 3 more turns" — and during those 3 turns, the rest of row 5 remains immobile real-estate.
- BETTER: Don't touch col 6 at all at row 5. Instead, fill (5,6) on a *later* turn so the OTHER rows get to clear first if possible.
- Option 4 (C at rows 6–7, cols 0–1): row 6 becomes `0 0 . 3 3 2 2 2` = 6/8; row 7 becomes `0 0 . . . 2 2 2` = 5/8. Builds toward two more ripe rows.

**Information player is using:** Same as before plus: realization that filling the closer cell of an already-ripe row is *anti-productive* until the closer can itself age 3 turns. Tray pieces' ability to land *outside* row 5 is now load-bearing.

**New question vs Classic:** "Which placements *avoid* completing the ripe row, since closing it now would freeze the board for 3 turns?" Classic would never ask this — Classic always wants to close.

**Pick:** Option 4 — C (2×2) at rows 6–7, cols 0–1. Adds clean fill that ages, and avoids closing row 5.

```
col:  0 1 2 3 4 5 6 7
row 0 . . . . . . 1 .
row 1 . . . . . . 1 .
row 2 . . . . . . 1 .
row 3 . . . 3 3 . . .
row 4 . . 3 3 3 . . .
row 5 . 3 3 3 3 3 . 3
row 6 0 0 . 3 3 3 3 3   (advanced; 2→3)
row 7 0 0 . . . 3 3 3
```

Now both row 5 and row 6 are mostly-ripe near-complete: row 5 needs col 6 only; row 6 needs col 2 only. Ripe-everywhere except their gap.

---

## Move 3

**Decisions available:**
1. Place B (L-tromino, the L-shape) at rows 5–6 col 2 region — could fill (5,6), (6,6) — already filled at (6,6). Try at rows 4–5 cols 5–6: B = `[X .][X X]`. Cells: (4,5),(5,5),(5,6). (5,5)=3 filled. Collision.
2. Place B with 1×3 column at column 2, rows 4–6 → fills (4,2),(5,2),(6,2). (4,2)=3, (5,2)=3 filled. Collision.
3. Wait — B is an L-tromino, only 3 cells. Need to find an orientation that drops a SINGLE cell into either (5,6) or (6,2) plus 2 cells elsewhere. None of B's orientations produce a "1 cell isolated + 2 cells far away" shape; all 3 cells are within Chebyshev-1 of each other.
4. Trick: place B such that it fills (6,2) with one cell while the other two cells go into row 7's cols 2,3 (empty). Orientation: `[X . ][X X]` = (0,0),(1,0),(1,1) at origin (6,2) → cells (6,2),(7,2),(7,3). All empty. Legal. After placement: row 6 becomes `0 0 0 3 3 3 3 3` = 8/8 complete. Cell (6,2) is age 0 — line will NOT clear. Damnable.
5. Hmm: can I place a B such that I fill (6,2) and the line completes ONLY when (6,2) is also age ≥ 3? I'd need (6,2) to already be old. But to make it old I have to place it first. So I NEED to place into (6,2) with an age-0 cell, and then wait 3 turns.
6. Alternative: skip closing rows 5/6 and fill totally elsewhere.

**Future states traded off:**
- If I close (6,2) now (option 4), row 6 is "complete but (6,2)=0." It clears at turn 6 (after 3 more ageing turns). During those 3 turns, row 6 sits as 8/8 filled, blocking placements in row 6. That is a HUGE space cost.
- If I close (5,6) now via a different placement, same problem — row 5 sits as 8/8 for 3 turns.
- If I close BOTH (5,6) and (6,2), both rows sit full for 3 turns, blocking placements in rows 5 and 6 — but they'll clear simultaneously after the wait. The "stack" is the strategy.
- Or: place purely elsewhere and let the existing ripe cells age further (they're capped at 3, so no further benefit), and search for a better closer in future trays.

**Information player is using:**
- Cell ages (capped at 3 — additional ageing is "wasted" on already-ripe cells, so there's no point in delaying for ripe-only-rows-with-old-gaps; the strategic value is in NEW gaps maturing).
- Empty real estate: rows 0–4 are nearly empty.
- Tray contents: B and C remaining.

**New question vs Classic:** "Do I commit to a 3-turn freeze of rows 5 and 6 to bank a 2-line clear, or keep them open and play freely above?" This is a multi-turn investment decision Classic does not pose.

**Pick:** Option 4 — B at origin (6,2), filling (6,2),(7,2),(7,3). Commits to the 3-turn freeze. We'll spend the next 3 turns above row 5.

```
col:  0 1 2 3 4 5 6 7
row 0 . . . . . . 2 .
row 1 . . . . . . 2 .
row 2 . . . . . . 2 .
row 3 . . . 3 3 . . .
row 4 . . 3 3 3 . . .
row 5 . 3 3 3 3 3 . 3
row 6 1 1 0 3 3 3 3 3   <- COMPLETE but (6,2)=0, no clear
row 7 1 1 0 0 . 3 3 3
```

Row 6 is now full but doesn't clear. UI must scream "ripening" — this is the teaching moment Decay's risk note flags.

---

## Move 4

Tray: refill. New tray: D = T-tetromino, E = 1×2 domino, F = single cell (`*` 1×1).

```
D = [X X X]    E = [X X]    F = [X]
    [. X .]
```

(Single-cell pieces aren't standard Blockit but assume the generator includes a 1×1 occasionally; if not, substitute with a 1×2.)

**Decisions available:**
1. Place F (1×1) at (5,6) → completes row 5 with age-0 cell. Now BOTH row 5 and row 6 are full-but-not-clearing. Two-line bank.
2. Place D somewhere in upper rows.
3. Place E somewhere in upper rows or column 6 (col 6 is currently 1 1 1 _ _ _ 0 0 — wait let me recompute col 6: rows 0,1,2 = 2 (from move 1, now aged), row 5 empty, rows 6,7 filled. Yes 5/8 with gap at rows 3,4,5.)
4. Place D in rows 3–4 to extend the diagonal cluster.

**Future states traded off:**
- Option 1 (close row 5 with F): commits to a 3-turn freeze of row 5 too. Combined freeze: rows 5+6 are 16 cells locked. But the payoff is huge — when (5,6) and (6,2) both ripen, BOTH rows clear in one move (the move that does the 3rd ageing tick), netting 2 rows + combo.
- Wait — does the clear happen on the placement that triggers the third increment (so the cells become age 3 *during* that turn's increment)? Per the rule: "incremented after each subsequent placement." So if (6,2) is age 0 after this current move, then move 5 (next placement) ages it to 1, move 6 ages it to 2, move 7 ages it to 3. The clear check would fire after that move — clearing both rows at once.
- Cost: 3 turns of cramped board.

**Information player is using:** Tray F is rare; (5,6) is a 1×1 hole — F is the perfect closer. If I don't use F here, I need to find another piece that drops a single cell into (5,6) without conflicting. Future trays may not provide one.

**New question vs Classic:** "When do I spend a precise-fit piece — now, locking in a future double-clear, or save it for later flexibility?"

**Pick:** Option 1 — F at (5,6).

```
col:  0 1 2 3 4 5 6 7
row 0 . . . . . . 3 .
row 1 . . . . . . 3 .
row 2 . . . . . . 3 .
row 3 . . . 3 3 . . .
row 4 . . 3 3 3 . . .
row 5 . 3 3 3 3 3 0 3   <- COMPLETE but (5,6)=0
row 6 2 2 1 3 3 3 3 3   <- still complete, (6,2) now age 1
row 7 2 2 1 1 . 3 3 3
```

---

## Move 5

Tray: D (T-tetromino), E (domino).

**Decisions available:**
1. Place D at rows 0–1 cols 0–2: T pointing down, fills (0,0)(0,1)(0,2)(1,1). Clean.
2. Place E vertically at col 6, rows 3–4: would close column 6's gap from (3,6) and (4,6), reaching (5,6) which is now filled. Col 6 becomes filled at rows 0,1,2,3,4,5,6,7 = complete. But the gap at (3,6),(4,6) needs E plus more. E is only 2 cells. Place E vertical at col 6 rows 3–4 fills (3,6),(4,6). After this, col 6 = `3 3 3 0 0 0 _ _` wait (3,6) and (4,6) are now age 0; col 6 is now ALL filled (rows 5,6,7 already filled). But col 6 has cells of mixed age. For col 6 to clear, EVERY cell must be age ≥ 3. (3,6) and (4,6) are age 0, (5,6) is 0, (0,6)(1,6)(2,6)=3, (6,6)(7,6)=3. Three young cells block the clear. Doesn't fire.
3. Place D rows 0–1 cols 3–5: another T. Builds upper structure.
4. Place E horizontally in row 0, cols 3–4 — clean.

**Future states traded off:**
- Putting filling cells onto column 6 NOW means I have to wait 3 more turns for *those* cells to ripen. The col 6 plan is multi-stage.
- Best to keep ageing existing cells. Row 6's (6,2) is now age 1; need 2 more turns. Row 5's (5,6) is age 0; need 3 more turns. The bottleneck is (5,6).
- Place D at rows 0–1 cols 0–2 (T pointing down). Adds 4 cells of new age-0 fill, all clean.

**Information player is using:** Capacity left in upper half of board. Number of turns until the bottleneck (5,6) ripens. Risk that future trays force me to cluster around row 5/6 anyway.

**New question vs Classic:** "How much new fill can I add without setting up *another* premature clear or running out of safe space?" Decay couples turn budget to space budget.

**Pick:** Option 1 — D at (0,0).

```
col:  0 1 2 3 4 5 6 7
row 0 0 0 0 . . . 3 .
row 1 . 0 . . . . 3 .
row 2 . . . . . . 3 .
row 3 . . . 3 3 . . .
row 4 . . 3 3 3 . . .
row 5 . 3 3 3 3 3 1 3   <- (5,6) now age 1
row 6 3 3 2 3 3 3 3 3   <- (6,2) now age 2; (6,0)(6,1) reached cap
row 7 3 3 2 2 . 3 3 3
```

---

## Move 6

Tray: E (domino) plus refill — say new G = 2×2 square, H = J-tetromino.

**Decisions available:**
1. Place E in row 7, cols 3–4 → fills (7,3),(7,4). Row 7 now `3 3 2 2 0 3 3 3` if both cells are 0. But (7,3) is already age 2! (placed turn 4? Actually I placed (7,3) in move 3 with B; that's now age 3? Let me recount — (7,3) was placed at move 3, ages: m4 → 1, m5 → 2, m6 (this) → ageing to 3 *after* this move's placement.) Wait, age increments after the *subsequent* placement; so after move 3 it's age 0, after move 4 it's 1, after move 5 it's 2, and after move 6 (this one) it'll be 3. (7,4) is fresh → age 0 after move 6. Row 7 now full but (7,4) is 0. Clear blocked.
2. Place G (2×2) at rows 1–2, cols 3–4. Clean fill above.
3. Place H (J-tetromino) somewhere upper.
4. Place E vertical in col 5, rows 3–4 — fills (3,5),(4,5). Both fresh.

**Future states traded off:**
- Critical: (5,6) ripens at age 3 after move 7 (currently age 1, +1 each future placement). That means the placement at move 7 will age (5,6) to 2 — STILL not 3. Move 8 will age to 3. So row 5 clears no earlier than after move 8.
- (6,2) currently age 2 → after move 7 it's 3. Row 6 clears as soon as it's all ≥ 3. After move 7's increment: (6,2)=3, all others ≥3 → row 6 should clear at the END of move 7 (the placement-induced check).
- Wait — row 5 at end-of-move-7: (5,6)=2, fail. Row 5 doesn't clear until end-of-move-8.
- So my "double-clear bank" actually splits into two single clears one turn apart. Still good but not a combo. To get them together I'd have needed to place (5,6) one turn LATER than (6,2) so they ripened in sync. I goofed move 4 vs move 3 spacing.
- Lesson: ageing cadence matters at the per-turn grain, and order really does change outcomes.
- Still, place E at row 0, cols 3–4 to keep upper rows progressing. No interference.

**Information player is using:** Off-by-one ripening calendar. Can mentally project 3 turns ahead.

**New question vs Classic:** "Did my placement order actually align the ripenings I intended, or am I 1 turn off?" Classic has no temporal alignment to manage.

**Pick:** Place E horizontally at row 0, cols 3–4.

```
col:  0 1 2 3 4 5 6 7
row 0 1 1 1 0 0 . 3 .
row 1 . 1 . . . . 3 .
row 2 . . . . . . 3 .
row 3 . . . 3 3 . . .
row 4 . . 3 3 3 . . .
row 5 . 3 3 3 3 3 2 3
row 6 3 3 3 3 3 3 3 3   <- (6,2) age 3 → ROW 6 CLEARS at end of move 7? Let's see: this is move 6's increment. (6,2) was age 2, +1 = 3. So after move 6 it IS 3. Row 6 clears NOW.
```

Wait — after move 6, (6,2) becomes age 3, all other row 6 cells are 3. Row 6 is full and ripe. Clear fires at end of move 6.

After clear:

```
col:  0 1 2 3 4 5 6 7
row 0 1 1 1 0 0 . 3 .
row 1 . 1 . . . . 3 .
row 2 . . . . . . 3 .
row 3 . . . 3 3 . . .
row 4 . . 3 3 3 . . .
row 5 . 3 3 3 3 3 2 3
row 6 . . . . . . . .   <- cleared!
row 7 3 3 2 2 . 3 3 3
```

Row 6 wiped. But row 5's (5,6) is age 2 still; row 5 doesn't clear yet. Score: +1 row.

---

## Move 7

Tray: G (2×2), H (J-tetromino), refill needed for E.

**Decisions available:**
1. Place G in row 6 — row 6 is now empty, lots of room. G at (5,6)? (5,6) is filled. G at (6,4)? (6,4)(6,5)(7,4)(7,5) — (7,5)=3 filled. Conflict. G at rows 6–7, cols 3–4: (6,3),(6,4),(7,3),(7,4) — (7,3) filled. Conflict. G at rows 5–6, cols... (5,*) all filled except (5,6) which now blocks anyway.
2. Place H (J-tetromino: cells (0,0),(1,0),(2,0),(2,1)) at col 0 rows 5–7? (5,0) empty, (6,0) empty (just cleared!), (7,0)=3. Conflict.
3. Place H rotated at rows 6–7 (it's tall — try rotated to 2 rows tall). J rotated 90 CW: cells become (0,0),(0,1),(0,2),(1,0)? Let me skip exact rotation and say there's a 2-tall variant fitting in rows 6–7, cols 2–4 say. Possible.
4. Place G in upper area — rows 1–2 cols 3–4 — clean.

**Future states traded off:**
- Critical priority: don't disturb (5,6)'s ripening clock. Current count: (5,6)=2, needs 1 more increment to be 3. Move 7's placement will age it to 3. Row 5 should clear at end of move 7.
- So this move should be ANYTHING legal that doesn't fill row 5 or column 6 redundantly. Pick a clean placement up top.

**Information player is using:** The clear-this-turn forecast for row 5; the freed real-estate from row 6's clear.

**New question vs Classic:** Classic would simply look for "best placement now." Decay forces "what else am I about to clear, and what placement preserves that?"

**Pick:** Place G (2×2) at rows 1–2, cols 3–4.

After move 7's age increment, (5,6) → 3. Row 5 ripe and full → clears.

```
col:  0 1 2 3 4 5 6 7
row 0 2 2 2 1 1 . 3 .
row 1 . 2 . 0 0 . 3 .
row 2 . . . 0 0 . 3 .
row 3 . . . 3 3 . . .
row 4 . . 3 3 3 . . .
row 5 . . . . . . . .   <- cleared
row 6 . . . . . . . .
row 7 3 3 3 3 . 3 3 3
```

Massive board breathing room recovered.

---

## Move 8

Tray: H, plus refills (call them I = 1×3 horizontal, J = L-tromino).

**Decisions available:**
1. Close row 7 with I at (7,4) — wait it's only 1 cell wide there; need a 1×1 to close row 7. None available. Can't close row 7 this turn.
2. Place H to extend col 6 (which now has rows 0–4 filled from earlier and rows 5–7 mixed).
3. Place I horizontally at row 4 to threaten col completions further.
4. Place J in lower-left to start a new ripening pocket.

**Pick:** Place I at row 0, cols 3–5 won't work — (0,3),(0,4) filled. I at row 4 cols 5–7: (4,5),(4,6),(4,7) all empty. After: row 4 = `. . 3 3 3 0 0 0`. Builds toward future column-7 closures.

(Stop here — 8 moves is the sample budget.)

---

## Verdict

**Question persists?** YES, but with caveats. The "should I close this line now or wait for it to ripen?" question recurs at every turn where a near-complete line exists. It also coexists with "where can I safely write fresh fill that won't crowd a maturing pocket?" Both are genuinely new versus Classic.

However: a strong dominant heuristic emerges around move 4 — "find the precision-fit piece for the gap and commit; everything else goes upstairs." Once a player learns the ripening calendar (place gap-closer at turn T, line clears at T+3), the question shrinks to a calendar-arithmetic exercise. This is interesting for a few hours, mechanical for longer sessions.

**Trade-off space alive?** YES, two distinct strategies appeared in the trace:
- **Bank-and-cascade** (what I played): close several near-complete lines deliberately, freeze a region for ~3 turns, then collect a multi-line clear. High variance, high payoff.
- **Steady ageing**: never close a line until you have a clear-aligned closer, keep the board distributed, accept slower clears. Lower variance.

The free-fill-elsewhere axis (where to put the cells that aren't doing closure work) is also a real second decision dimension. Plus: the "off-by-one" calendar slip in move 6 vs 7 shows that mis-sequencing can convert a planned double-clear into two singles — a real failure mode the player must learn.

**Difficulty curve plausible?** The trace stayed engaged through all 8 moves. Notably, the early game (moves 1–3) feels almost identical to Classic because no cells are ripe yet; the mode reveals itself at moves 4–8 as ripeness arrives. This suggests Decay is a *late-game* mode — early moves are filler. Could be a teaching problem: a player drops out before the mechanic activates. Mitigate with seeded starting age.

**Risks reconfirmed:**
- The "completed but not cleared" state IS extremely confusing — confirmed by the trace where row 6 sat at 8/8 for 3 turns. UI must scream this.
- Age-cap behavior: cells stop ageing past 3, so you cannot "over-ripen." That's correct mechanically (otherwise ripening is pointless once achieved) but means a single extra age tick is wasted; the calendar window is narrow.
- The double-bank failure mode (offset by 1) is interesting but punishing — small mis-orderings produce visible failure.

**Verdict: SURVIVE.**

The new question persists across the full trace, two strategies are visibly viable, and the mode does not collapse to a deterministic recipe. Caveats: weak early game, UI burden for "full but not clearing" state, and the calendar arithmetic can become formulaic at high skill. None of these are structural collapse — they are tuning concerns.
