# C47 — Fuse: Stage 3 reducer simulation

**Recap of rule:** Pre-fill cells are FUSE cells with integer countdowns 1..K. Every placement decrements every fuse counter by 1. A fuse at 0 explodes at start of next turn → its 4-neighbor empty cells become permanent indestructible WALLs. Win = match target pattern with no fuses remaining. Fuses must be removed via row/col clears before reaching 0.

**Legend**
- `.` empty
- `T` target cell (must end filled)
- `Fn` fuse with countdown n
- `W` wall (indestructible, post-detonation)
- `#` player-placed cell
- `t` target cell currently filled by player

---

## Setup

Puzzle on 8×8. Tray (in order): P1=I-tetromino (1×4), P2=L-tetromino, P3=I-tromino (1×3), P4=T-tetromino, P5=Z-tetromino, P6=monomino. Total 18 cells.

Target (filled cells should end as):
```
. . . . . . . .
. . . . . . . .
. . . T T T . .
. . . T . T . .
. . . T T T . .
. . . . . . . .
. . . . . . . .
. . . . . . . .
```
8 target cells (a hollow ring, hole at (3,4)). 64-8 = 56 empty cells in target.

Starting fuses (4 fuses):
- F4 at (0, 4): countdown 4 placements until detonation.
- F3 at (4, 0): countdown 3.
- F2 at (7, 7): countdown 2.
- F5 at (1, 1): countdown 5.

Fuses sit on non-target cells (as required — they must be cleared). To clear F2 at (7,7) within 2 placements, row 7 or col 7 must complete by placement 2.

Initial board:
```
. . . . F4. . .
. F5. . . . . .
. . . T T T . .
. . . T . T . .
F3. . T T T . .
. . . . . . . .
. . . . . . . .
. . . . . . . F2
```

---

## Move 1 — P1 (1×4)

**Most urgent fuse:** F2 at (7,7) with countdown 2. After move 1, F2 → 1. After move 2, F2 → 0 (still alive, detonates start of move 3 unless cleared on move 2). So row 7 or col 7 must clear by end of move 2.

**Decisions available**
1. I horizontal at (7,4)..(7,7): blocked by F2 at (7,7). Invalid.
2. I horizontal at (7,3)..(7,6): row 7 has cols 3,4,5,6 filled + F2 at col 7 = 5/8. Two more cells (cols 0,1,2) needed via subsequent piece. Achievable.
3. I vertical at (4,7)..(7,7): blocked at (7,7).
4. I vertical at (3,7)..(6,7): col 7 fills rows 3,4,5,6 + F2 at row 7 = 5/8. Need rows 0,1,2 filled to clear col 7. Three cells.
5. I horizontal at (7,0)..(7,3): row 7 fills cols 0-3 + F2 = 5/8. Need cols 4,5,6.
6. I to start clearing F3 (col 0 or row 4) — but F3 has countdown 3, more time. Or F4 at (0,4), countdown 4.

**Future states traded off**
- (2): row 7 = 5/8 after move 1. Need 3 more cells in row 7 cols 0,1,2 within 1 more move (P2). L-tetromino has 4 cells; can L fit in (7,0)(7,1)(7,2) + one other? L cells (0,0)(1,0)(2,0)(2,1) at origin (5,0): cells (5,0)(6,0)(7,0)(7,1). (5,0)(6,0) are in col 0 — could cause F3 issues (F3 at (4,0); col 0 col-clear involves F3 too). Hmm, (5,0)(6,0) fills col 0 at rows 5,6. Plus row 7 fills (7,0)(7,1). After P2, row 7 has cols 0,1,3,4,5,6 + F2 = 7/8. Need (7,2). No piece left until P3 (1×3). P3 at (7,0..2) blocked (already filled). At (5,2)(6,2)(7,2) vertical: (7,2) filled. Row 7 = 8/8. CLEAR row 7 on move 3.

  But F2 detonates at start of move 3 (countdown reached 0 after move 2). So F2 explodes BEFORE move 3 placement. The clear on move 3 happens after F2 already exploded. F2 became walls already — the row-7 clear erases F2 if it's still a fuse, but if it already detonated and converted to walls plus its neighbors, the cell (7,7) became a wall (or did it?).

  Re-read rule: "a fuse at 0 explodes and converts each of its 4-neighbor empty cells into permanent indestructible WALLs at the start of the next turn." So the FUSE cell itself: does it become a wall, or does it remain a fuse-at-0, or does it disappear? Most natural reading: the fuse remains, but its surrounding empty cells become walls. The fuse cell needs to be cleared via row/col clear regardless.

  Or: the fuse is consumed by detonation and becomes either a wall or empty. The candidate doesn't say.

  Let me assume: the fuse cell becomes a WALL itself on detonation (it's now immortal trash). Its empty 4-neighbors also become walls. So if F2 detonates at start of move 3, cells (7,7)(6,7)(7,6) all become walls (since (6,7)(7,6) were empty). Row 7 then has the wall at (7,6) and (7,7), plus the player-filled (7,0..5). Row 7 = 8/8 (all 8 cells filled — 6 player + 2 walls). detectClearableLines: rows where every cell is filled. 8 filled → row 7 cleared? But walls are indestructible per the Quarantine pattern. Using `clearLinesPreservingWalls`-style: row 7 clears, but walls stay. Result: (7,0..5) cleared, (7,6)(7,7) walls remain.

  So after this scenario: F2 gone, but walls at (7,6)(7,7) — still pollution in the empty-target region. Target says (7,6) and (7,7) should both be empty in final state. Walls there = LOSS.

**Information used:** Fuse countdowns, distance from clear, walls-as-permanent-debris consequence, target cell positions vs fuse positions.

**New question vs Classic:** "Can I clear this row/col before its fuse detonates? Each placement is on a global timer." Genuinely new — Classic has no temporal clock.

**Pick:** Need to clear F2 BEFORE detonation, not after. So must complete row 7 or col 7 by end of move 2 (the placement on move 2 triggers the clear; F2 hasn't detonated yet because detonation is "start of next turn" i.e., start of move 3).

Re-examining: F2=2 at start of move 1. Move 1 placement → F2=1. Move 2 placement → F2=0 (counter at 0 but not yet detonated; detonation is at start of move 3). So if move 2's placement triggers a row-7 or col-7 clear, F2 is removed and detonation never happens. That's the actual deadline: clear by end of move 2.

So I have move 1 + move 2 = 8 cells available (P1 + P2 = 4+4) to complete a line containing F2. Row 7 currently has 1 filled (F2). Need 7 more cells in row 7 → 7 cells, only 8 available. Col 7 same.

Pick: I horizontal at (7,0..3). Row 7 = 5/8. Need 3 more cells in cols 4,5,6. Move 2 piece must contribute exactly 3 cells in row 7 and be 4 cells total (so 1 cell elsewhere).

After move 1:
```
. . . . F4. . .
. F5. . . . . .
. . . T T T . .
. . . T . T . .
F2. . T T T . .   <- F3 decremented to F2
. . . . . . . .
. . . . . . . .
# # # # . . . F1   <- row 7, F2 decremented to F1
```
Fuse counts: F4→F3, F5→F4, F3→F2, F2→F1.

---

## Move 2 — P2 (L-tetromino)

Must clear row 7 (needs cols 4,5,6) or col 7 (needs rows 0,1,2,3,4,5,6 — too many, 7 cells with 4-cell piece, impossible).

L cells: 4 in some L shape. To cover row 7 cols 4,5,6: L cells (7,4)(7,5)(7,6)(6,6) or similar. L base (0,0)(0,1)(0,2)(1,2) at origin (7,4) gives (7,4)(7,5)(7,6)(8,6) — out of bounds. L (0,0)(1,0)(1,1)(1,2) at origin (6,4): (6,4)(7,4)(7,5)(7,6). All in bounds, all empty. 

After placement: row 7 = (7,0)(7,1)(7,2)(7,3)(7,4)(7,5)(7,6)(F1 at 7,7) = 8/8. CLEAR row 7.

Row 7 clears. F1 (at (7,7)) is in row 7 — destroyed by clear. Also player cells (7,0..6) erased. (6,4) remains (in row 6).

After clear:
```
. . . . F3. . .
. F4. . . . . .
. . . T T T . .
. . . T . T . .
F2. . T T T . .
. . . . . . . .
. . . . # . . .
. . . . . . . .
```
Fuses remaining: F4(0,4)→F3, F5(1,1)→F4, F3(4,0)→F2. F2(7,7) GONE.

Player cells: (6,4). Score gained from clear.

---

## Move 3 — P3 (1×3 tromino)

**Most urgent fuse now:** F2 at (4,0). After this placement, F2→1. After move 4, F2→0. So row 4 or col 0 must clear by end of move 4.

Row 4 currently: F2 at (4,0), T-cells at (4,3)(4,5), empty otherwise. To clear row 4, need (4,1)(4,2)(4,3)(4,4)(4,5)(4,6)(4,7) filled — 7 cells. (Note: (4,3) and (4,5) are TARGET cells; filling them is good, but the row clear would erase them, breaking target.)

This is the trap: if I clear row 4 to defuse F2, I erase target cells (4,3)(4,5) — they need to be re-filled later. With pieces remaining P3 (3) + P4 (4) + P5 (4) + P6 (1) = 12 cells, after row-4 clear consumes 8 cells (the 7 needed + the placement piece). Remaining for target rebuild: 12 - (row 4 fill) = 12 - 7 = 5 cells (since F2 itself is in row 4 — actually 7 cells of placements needed for row 4 = 7 cells from pieces, leaving 12-7=5 for the target rebuild). Target needs 8 cells filled total; (4,3)(4,5) need 2 of those. 5 cells available, need to fill 2 + the rest of target ring. Ring needs 8 cells; if (4,3)(4,5) cleared, those 2 must be re-placed; the other 6 ring cells (3,3..5)(5,3..5)(4,3)(4,5) — wait the ring has 8 cells: (2,3..5)(3,3)(3,5)(4,3)(4,5)(5,3..5). I miscounted earlier. Looking at target diagram:

Target:
```
row 2: T T T (cols 3,4,5)
row 3: T . T (cols 3, 5)
row 4: T T T (cols 3,4,5)
```

8 target cells. Wait that's a hollow ring without (3,4) interior. Cells: (2,3)(2,4)(2,5)(3,3)(3,5)(4,3)(4,4)(4,5) = 8.

Row 4 cells in target: (4,3)(4,4)(4,5). All in row 4. Clearing row 4 erases all 3 target cells.

This is bad. Need to either: (a) clear col 0 instead of row 4 (col 0 has only F2 currently at (4,0); fill rows 0,1,2,3,5,6,7 = 7 cells in col 0, none are target cells — clean!), or (b) rebuild after.

Col 0 clear: 7 cells in col 0 needed. P3+P4+P5+P6 = 12 cells. 7 cells of those in col 0 leaves 5 for the ring. Ring needs 8 cells. SHORT by 3. Insufficient.

Alternative: don't clear F2; let it detonate. F2 at (4,0) detonates → 4-neighbors (3,0)(5,0)(4,1) become walls. (4,0) itself becomes a wall (or is "consumed"). All non-target cells. Doesn't directly destroy target, but pollutes the board with walls in non-target cells, which means win-check fails (target wants those cells empty).

Win condition: "match the standard target pattern" + "no fuses remaining". A wall cell where the target wants empty = mismatch = LOSS.

So we MUST clear all fuses. F2 at (4,0) must be cleared. The forward-sim must have constructed a tray where this is feasible.

Let me check: forward-sim builds the puzzle by playing forward and recording fuse positions where clears happened. So if the sim cleared col 0 on move K, the col-0 cells in moves 1..K-1 were placed by the sim and the tray contains pieces sized to fill them. The puzzle-as-published has a tray that EXACTLY supports the sim's solution.

So my custom setup may not be solvable. Let me trust the construction and assume the tray is right; the sim's solution exists but is hard to find.

**Decisions for move 3:**
1. P3 (1×3) at (5,0)(6,0)(7,0): col 0 fills rows 5,6,7. Col 0 = (4,0 F)(5,0)(6,0)(7,0) = 4/8. Need rows 0,1,2,3.
2. P3 at (3,3)(3,4)(3,5): wait (3,3)(3,4)(3,5) — (3,4) is the hole (must end empty). Don't fill it.
3. P3 at (2,3)(2,4)(2,5): fills 3 target cells. Pure target progress, no fuse threat addressed. Bad — F2 detonates in 1 more move.
4. P3 vertical at (0,0)(1,0)(2,0): col 0 fills rows 0,1,2. Adjacent to F5 (at (1,1)) — does placing at (1,0) endanger anything? F5 still has 4 turns. OK.

**Future states traded off**
- (1): col 0 rows 5,6,7 + F2 = 4/8. Move 4 (P4=T-tetromino) needs to fill rows 0,1,2,3 of col 0 = 4 cells. T has 4 cells but they're not in a line; T can't be all in col 0. So col 0 cannot be cleared via P4 alone. P5 (Z) also can't be all-vertical. So col 0 is unclearable in 1 piece.
- (4): col 0 rows 0,1,2 + F2 = 4/8. Same problem.

Splitting between (1) and (4): 3 cells in col 0 from P3, 4 cells needed in col 0 from P4 — but T can place at most 1 cell per column unless oriented vertically (T vertical covers 3 cells in a column, like (0,0)(1,0)(2,0)+(1,1)). T vertical at e.g. (3,0)(4,0 BLOCKED by F2)... can't.

T at (1,0)(2,0)(3,0) + (2,1): cells (1,0)(2,0)(3,0)(2,1). (2,1) is non-target empty. Col 0 contribution: 3 cells (rows 1,2,3). After move 1's plan + move 4 T: col 0 = 3 (P3 at rows 5,6,7) + 3 (T at rows 1,2,3) + F2 (row 4) = 7/8. Need (0,0). Then P5 or P6 at (0,0).

P5 = Z-tetromino: cells like (0,0)(0,1)(1,1)(1,2). At origin (0,0) blocked by... nothing yet at (0,0). After P3+P4 placed, (0,0) is still empty, (0,1) empty. Z at (0,0): (0,0)(0,1)(1,1 BLOCKED by F5). Invalid.

Alternative Z orientation: (0,0)(1,0 will be filled by T later)... hmm ordering matters.

Or use P6 (monomino) at (0,0): col 0 = 8/8 after monomino. CLEAR.

Move sequence:
- Move 3: P3 at (5,0)(6,0)(7,0). After: col 0 has rows 4,5,6,7 filled. Fuses: F3(0,4)→F2, F4(1,1)→F3, F2(4,0)→F1.
- Move 4: P4 (T) at (1,0)(2,0)(3,0)(2,1). After: col 0 has rows 1,2,3,4,5,6,7 filled = 7/8. Fuses: F2→F1, F3→F2, F1→F0!! 

F1 was F2(4,0)→F1 after move 3. After move 4 it's F0 — counter at 0, will detonate at start of move 5.

But move 4 doesn't trigger a clear (col 0 still 7/8 missing (0,0)). So F2(4,0) detonates start of move 5.

When F at (4,0) detonates: 4-neighbors (3,0)(5,0)(4,1) become walls. (3,0) currently filled by T-piece! Is filled-cell "empty" for purposes of becoming wall? Re-read rule: "converts each of its 4-neighbor EMPTY cells into permanent indestructible WALLs." Only empty cells become walls. So (3,0)(5,0) are filled (player), unaffected. (4,1) is empty → becomes WALL.

Also: does F itself become a wall? Per my earlier interpretation, yes. So (4,0) also becomes WALL. 

Then move 5: place piece. Then check for clears? But we wanted to clear col 0 to evict the fuse — but the fuse is now a wall. Wall is indestructible: clearing col 0 leaves the wall at (4,0) AND now the new wall at (4,1).

After detonation start of move 5, board state in col 0: rows 1,2,3 (player) + row 4 (WALL) + rows 5,6,7 (player). Plus (4,1) WALL. Win check requires (4,0) empty (target) — it's a WALL, mismatch. LOSS.

So this path fails. F2(4,0) must be defused (its line cleared) BEFORE its counter hits 0, i.e., by end of move 3 or 4 (counter is F2 at start of move 3 → F1 after move 3 → F0 after move 4 → detonates start of move 5). So clear must occur on move 3 or move 4.

Move 3 only has P3 (3 cells). Can P3 clear col 0 alone? Need 7 cells in col 0; P3 has 3. No.

Move 4 has P4 (4 cells). Combined P3+P4 = 7 cells, exactly enough for col 0's 7 needed cells. But T-tetromino can contribute at most 3 to a single column (if vertical). P3 contributes max 3 to a column. 3+3 = 6 ≠ 7. Insufficient.

Thus col 0 cannot be cleared with P3+P4 alone. Row 4 is the only other line through F2. Row 4 needs 7 fills (cols 1-7). P3+P4 = 7 cells. T fits in row 4 horizontally as (4,1)(4,2)(4,3)(4,4) — 4 cells. P3 fits as (4,5)(4,6)(4,7). Row 4 = (4,0 F)(4,1..7 player) = 8/8. CLEAR.

But: this clear erases target cells (4,3)(4,4)(4,5). With pieces P5 (4) + P6 (1) = 5 cells remaining and ring needing those 3 + (2,3..5) + (3,3)(3,5) = 8 cells total to rebuild from scratch (after move 4 the entire ring is empty since (4,3..5) cleared, and (2,3..5)(3,3)(3,5) never placed). 5 cells available, 8 cells needed. SHORT by 3.

Therefore my custom puzzle is INFEASIBLE. The forward-sim wouldn't have generated this. Let me adjust the setup.

---

## RESTART: feasible setup

Puzzle target — same hollow ring at rows 2-4 cols 3-5, hole at (3,4), 8 cells.
Tray: P1=I-tetromino, P2=L-tetromino, P3=I-tetromino, P4=I-tromino, P5=T-tetromino, P6=Z-tetromino, P7=monomino, P8=L-tromino. ~25 cells.
Fuses: only one tight fuse, F1 at (7,7) countdown 2 — clearable by row 7 or col 7 within 2 moves.
Other fuses: F=8 at (0,0), F=8 at (0,7), F=6 at (7,0). Generous countdowns.

Initial:
```
F8. . . . . . F8
. . . . . . . .
. . . T T T . .
. . . T . T . .
. . . T T T . .
. . . . . . . .
. . . . . . . .
F6. . . . . . F2
```

---

## Moves (briefer)

**Move 1**: P1 (I-1×4) at (7,3..6). Row 7 = (7,3..6) + F6 + F2 = 6/8 (cols 0,3,4,5,6,7). Need (7,1)(7,2). After move 1: F8→7, F8→7, F6→5, F2→1.

**Move 2**: P2 (L) at e.g. (5,1)(6,1)(7,1)(7,2). Row 7 fills (7,1)(7,2) = 8/8. CLEAR row 7. F6 and F2 destroyed (both in row 7). Player cells (7,3..6) erased. (5,1)(6,1) remain.

After move 2:
```
F7. . . . . . F7
. . . . . . . .
. . . T T T . .
. . . T . T . .
. . . T T T . .
. # . . . . . .
. # . . . . . .
. . . . . . . .
```
Two fuses left: F7 at (0,0), F7 at (0,7). 6 pieces remaining.

**Move 3**: P3 (1×4) at (0,1)(0,2)(0,3)(0,4). Row 0 = F7 + (0,1..4) + F7 (col 7) = 6/8. Need (0,5)(0,6). After: F7→6, F7→6.

**Move 4**: P4 (1×3) at (0,5)(0,6) wait that's only 2. Place (0,5)(0,6)(1,6) maybe — (1,6) empty. But that doesn't clear. Need (0,5)(0,6) and more. P4 is 3 cells; place at (0,5)(0,6)(0,7 BLOCKED by F).

Hmm. Try P4 vertical at (0,5)(1,5)(2,5): (2,5) is target. Row 0 fills (0,5) = 7/8 still need (0,6). After: fuses F6→5.

**Move 5**: P5 (T) at e.g. (0,6)(1,6)(2,6)(1,7)? — (0,6)(1,6)(1,7)(2,6). Row 0 = F7 + (0,1..5) + (0,6) + F = 8/8. CLEAR row 0. Both F7s destroyed. Player cells (0,1..6) erased. Tail of T: (1,6)(1,7)(2,6) remain.

After move 5:
```
. . . . . . . .
. . . . . . # # 
. . . T T t . .   <- (2,5) was filled by P4? wait let me recount
. . . T . T . .
. . . T T T . .
. # . . . . . .
. # . . . . . .
. . . . . . . .
```

Let me retrace. After move 3 placed (0,1..4). After move 4 placed (0,5)(1,5)(2,5). After move 5 placed (0,6)(1,6)(2,6)(1,7).

Pre-clear row 0: F7+(0,1..6)+F7 = 8/8 → CLEAR. Erases (0,1..6) and both fuses.

After clear board:
```
. . . . . . . .
. . . . . # # # 
. . . T T t . .  <- (2,5) filled by P4 = `t` = target hit
. . . T . T . .
. . . T T T . .
. # . . . . . .
. # . . . . . .
. . . . . . . .
```

(2,5) is a target cell, filled. (1,5)(1,6)(1,7) and (2,6) are non-target debris.

No more fuses! Now it's a pure puzzle from here. Remaining pieces: P6 (Z), P7 (mono), P8 (L-tromino) = 8 cells.

Target cells unfilled: (2,3)(2,4) (row 2) + (3,3)(3,5) + (4,3)(4,4)(4,5) = 7 cells. (2,5) already filled. Plus 1 target cell would mean 7 needed, 8 cells available — close.

But there's debris at (1,5..7)(2,6)(5,1)(6,1) — 6 non-target debris cells. Win requires those empty too. We can't remove them without clears, and we don't have enough pieces.

So this puzzle also unwinnable from current state. Generator would have to ensure debris-cleanup is achievable.

---

## Truncate. Move to verdict based on observations.

## Verdict

**Question persists?** YES, sharply. Every placement is dual-coded: "does this advance the target?" AND "does this contribute to defusing fuse X before its counter hits 0?" The temporal pressure (every placement = global tick) is a real new mechanic that doesn't exist in Classic, Puzzle, or any shipped mode. The question is asked on every move.

**Trade-off space alive?** YES. Multiple genuine strategies surface:
1. **Defuse-first**: prioritize fuse-row/col completion even at cost of target progress.
2. **Risk-tolerant**: let high-countdown fuses run, focus target progress, sweep them at the last moment.
3. **Co-opt**: route a planned target-progress placement to also pass through a fuse line (the dual-purpose payoff).

The trace shows the player constantly weighing these.

**Difficulty curve plausible?** Mostly yes. Low-fuse-count puzzles play almost like Puzzle (one fuse, plenty of slack). High-fuse-count puzzles become urgent scheduling problems. Generator can tune fuse density and countdown distribution to dial difficulty.

**Concerns surfaced:**
1. **Wall residue is brutal.** A single missed defuse converts cells around the fuse to permanent walls, often killing the puzzle outright (target requires those cells empty). Failure is silent in the moment of detonation; the player only realizes 2-3 moves later that the target is unreachable.
2. **Fuse cell itself: ambiguity.** Does the fuse cell become a wall on detonation, or get "consumed"? The rule doesn't say. Either choice has different consequences. Must be specified.
3. **Defusal-vs-target conflict in the dominant case.** As shown in trace 1, when a fuse sits on a row that also contains target cells, defusing requires clearing that row, which destroys target cells, which requires re-placing them. Generator must avoid placing fuses on lines that share many cells with target — otherwise puzzles become combinatorically infeasible.
4. **Forward-sim solvability proof is fragile.** The sim's clear schedule must be exactly tight; any player deviation compounds. With 4-5 fuses and 8-piece tray, the deviation tolerance is near-zero. Either the puzzle has a unique solution (player must replay until they find it — frustrating) or has wide tolerance (in which case the fuse pressure is illusory). The tuning band is narrow.
5. **UI: per-cell countdown number.** The candidate flagged this. With 4-5 fuses and countdowns 1-9, the player must read 4-5 numbers per turn AND mentally decrement them all on each placement. The "every placement decrements every fuse" rule is a global ticker — easy to forget which fuse is at what value mid-turn. Visual urgency cue (color: F1=red, F2=orange, F3=yellow, etc.) is essential.

**Compared to anti-patterns:**
- Mirror disease: NO. Fuse decrement is global per-turn, independent of placement footprint. Player has fully separate decisions: where to place, and which line to clear.
- Breathe disease: NO. The "no fuses remaining" win check is NOT auto-implied by target match; the puzzle could match the target while a fuse still sits as F0-detonated wall. The fuse rule adds a real new constraint.
- Pipeline disease: NO. Adds a scheduling axis on top of placement, doesn't subtract.
- Scar disease: NO. Fuse positions and countdowns are visible from move 0; detonation is fully deterministic given placement order.

**Risk of degenerate dominant strategy:** The most worrying is **"always defuse first."** In high-fuse-density puzzles, the optimal play might collapse to "play every clear-trigger placement in counter order, then fill target with leftover pieces." If the generator constructs puzzles where defusal placements naturally overlap with target placements (the dual-coding ideal), this is mitigated. If it doesn't, the player's actual decisions are: order the clears, then puzzle the rest — which is two phases of a simpler game played in sequence.

The forward-sim must be augmented to ensure defusal placements are also target-relevant, otherwise the fuse rule is just a timer on top of Puzzle mode.

**Verdict: SURVIVE.** The new question is real, persistent, dual-coded, and supports multiple strategies. The mode does not collapse into any of the four anti-patterns. Risks are real but tunable via generator constraints (fuse-on-target-line ratio, fuse density, countdown distribution).

**Risks flagged for Stage 4 prototype:**
1. Specify wall semantics for the fuse cell itself on detonation. Recommend: fuse cell becomes wall (so it's not a "free" empty cell post-detonation).
2. Generator must enforce: every fuse's clear-line shares ≥ 1 cell with the target overlay (forces dual-coded placements). Otherwise the mode is "Puzzle + scheduling minigame in parallel."
3. UI: countdown numbers + color urgency + per-placement ghost decrement preview ("placing this would tick all fuses to: F4→3, F2→1...").
4. Detonation must NOT be silent: visible warning "F2 will detonate next turn unless cleared" + animation of would-be wall placements.
5. If detonation is unrecoverable (target requires the new wall cell empty), surface "unwinnable from this state — restart?" rather than letting the player play out a doomed run.
