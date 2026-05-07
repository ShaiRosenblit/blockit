# C45 — Vermin: moving entities with deterministic priority pursuit

## Premise being tested

N "vermin" tokens occupy single cells (sentinel color, count as filled). After every placement:
- each vermin attempts to walk one cell
- priority: DOWN > RIGHT > UP > LEFT, picking the first direction whose target is empty
- vermin and target cell swap (vermin moves, leaves an empty behind)
- vermin reaches a "nest" cell → loss
- vermin destroyed by a line clear or by being boxed in (no legal walk) → removed

Win = all vermin removed AND tray empty (or tray remains and round continues).

## Legend

- `.` empty
- `#` filled by player
- `o` blocker pre-fill
- `V` vermin (e.g. `V1`, `V2`)
- `N` nest cell (target — vermin reaching here = loss)

## Setup

3 vermin, 2 nests, score-attack-flavored (continuous tray refill). Vermin walking priority: D > R > U > L.

Initial board (representative, mid-difficulty):

```
       c0 c1 c2 c3 c4 c5 c6 c7
r0     .  .  .  .  .  .  .  .
r1     .  V1 .  .  .  V2 .  .
r2     .  .  .  o  .  .  .  .
r3     .  .  .  .  .  .  .  .
r4     o  .  .  .  V3 .  .  o
r5     .  .  .  .  .  .  .  .
r6     N  .  .  .  .  .  .  N
r7     .  .  .  .  .  .  .  .
```

Vermin V1 at (1,1), V2 at (1,5), V3 at (4,4). Nests at (6,0) and (6,7). Blockers at (2,3), (4,0), (4,7).

Tray: continuous refill (Classic-style). Initial tray: [I3, T-tet, L-tet].

---

## Move 1

**Vermin walk preview** (showing what happens if player makes NO placement — but player must place):

Without any placement, V1 at (1,1) walks: D→(2,1) empty → V1 moves to (2,1). V2 at (1,5) walks: D→(2,5) empty → V2 to (2,5). V3 at (4,4) walks: D→(5,4) empty → V3 to (5,4). All three step DOWN — toward the nests at row 6.

**Decisions:**

a. I3 vertical at (2,1)(3,1)(4,1) — blocks V1's D direction. After V1 walks: D=(2,1) now filled → R=(1,2) empty → V1 moves to (1,2). V2 D=(2,5) empty → V2 to (2,5). V3 D=(5,4) empty → V3 to (5,4). V1 now moves RIGHT, away from nests.

b. I3 horizontal at (2,4)(2,5)(2,6) — blocks V2's D. After: V1 D=(2,1) empty → V1 to (2,1). V2 D=(2,5) filled → R=(1,6) empty → V2 to (1,6). V3 D=(5,4) empty → V3 to (5,4). V2 deflected right, V1 walks down.

c. T-tet at (5,4)(5,3)(5,5)(6,4) — blocks V3's D. After: V3 D=(5,4) filled → R=(4,5) empty → V3 to (4,5). V1, V2 walk D as normal.

d. L-tet at (5,0)(6,0)(6,1)(7,0)? Cell (6,0) is NEST. Placing on a nest cell — is that legal? Nest cells are board cells, distinct from forbidden. Spec doesn't say nests reject placement. Assume legal. Placing on (6,0) FILLS the nest, making it un-reachable for V1's potential later arrival. V1 can never reach a filled cell; if all nests are filled, vermin can't lose for the player. Strong defensive play!

e. T-tet at (5,4) stem-down: (5,4)(5,5)(5,3)(6,4) — same as (c).

f. L-tet at (6,0)(6,1)(6,2)(7,2) — fills nest (6,0). V1's path to (6,0) blocked permanently.

**Future states:**

a. V1 deflected R to (1,2). Next turn V1 walks D=(2,2) empty → V1 to (2,2). Eventually reaches r6 anywhere except col 0.
b. V2 deflected R to (1,6). Next turn V2 D=(2,6) blocked by my placement → R=(1,7) → V2 to (1,7). Then D=(2,7) empty → V2 to (2,7). V2 heading toward NE corner — no nest there. Safe direction.
c. V3 deflected R to (4,5). Then D=(5,5) just-placed filled → R=(4,6) → V3 to (4,6). V3 walking RIGHT across row 4 toward NE.
d. NEST ELIMINATION. (6,0) filled. V1 can never reach (6,0). Game-state: nest count drops to 1.
f. Same as (d) but bigger footprint.

**Information player uses:** vermin positions, nest positions, walk priority (D>R>U>L), each vermin's preferred direction, and the consequence chain of "deflect" vs "absorb" vs "nest-fill."

**New question vs Classic:** "After my placement, does the vermin walk lead it toward the nest, away from it, or get it boxed in for removal?" Classic doesn't have moving threats.

**Pick:** **(f) — L-tet to fill nest (6,0).** Permanently removes one nest. This is the dominant strategy — every nest-fill is one less loss-condition.

After move 1 (L placed, vermin walk):
```
r0     .  .  .  .  .  .  .  .
r1     .  .  .  .  .  .  .  .
r2     .  V1 .  o  .  V2 .  .
r3     .  .  .  .  .  .  .  .
r4     o  .  .  .  .  .  .  o
r5     .  .  .  .  V3 .  .  .
r6     #  #  #  .  .  .  .  N
r7     .  .  #  .  .  .  .  .
```

V1 (2,1), V2 (2,5), V3 (5,4). Nest (6,0) destroyed. Only nest (6,7) remains.

---

## Move 2

Tray: [I3 (still), T-tet (still), refill-slot (L consumed → empty)] — actually only L was used. Tray: [I3, T-tet, empty]. Refill triggers when ALL empty? Score-attack mode: standard refill. If only one empty, no refill. Tray = [I3, T-tet].

**Strategic question:** can I fill nest (6,7) too? It's at the SE corner.

**Decisions:**

a. T-tet stem-up at (6,5): (6,5)(6,6)(6,7)(5,6). Fills nest (6,7)! Eliminates BOTH nests. But (6,7) replacement happens after vermin walk this turn? Order: place, then vermin walk. So placement fills (6,7), then vermin walk — V3 at (5,4) walks D=(6,4) empty → V3 to (6,4). V1 D=(3,1) empty → V1 to (3,1). V2 D=(3,5) empty → V2 to (3,5).

Wait — but if both nests destroyed, the loss condition "vermin reaches a nest" can never trigger. The win condition is "all vermin removed AND tray empty." With no nests, vermin walk indefinitely. Player must still REMOVE them, via line clears or box-in.

So nest-elimination is partial defense, not complete win. Still must clear vermin.

b. I3 horizontal at (3,1)(3,2)(3,3): walls below V1. V1 D=(3,1) filled → R=(2,2) empty → V1 to (2,2). V2 D=(3,5) empty → V2 to (3,5). V3 D=(6,4) empty → V3 to (6,4). One step closer to row 6.
c. I3 vertical at (5,5)(6,5)(7,5): blocks V3's R after deflection. V3 D=(6,4) empty → V3 to (6,4). Hmm same.
d. T-tet stem-down at (3,4): (3,4)(3,5)(3,3)(4,4). Blocks V2's D and V3's U. V2 D=(3,5) filled → R=(2,6) empty → V2 to (2,6). V3 D=(6,4) empty → V3 to (6,4). V2 deflected R toward NE corner.
e. I3 horizontal at (6,5)(6,6)(6,7) — fills nest + 2 cells. Nest gone. Cleaner than (a), saves T-tet.

**Pick:** **(e) — I3 horizontal at (6,5)/(6,6)/(6,7).** Both nests now destroyed. Now the game becomes "remove all vermin via line clears or box-in." This is a PURE pursuit / containment game.

After move 2 (vermin then walk):
- V1 D=(3,1) empty → V1 to (3,1).
- V2 D=(3,5) empty → V2 to (3,5).
- V3 D=(6,4) empty → V3 to (6,4).

```
r0     .  .  .  .  .  .  .  .
r1     .  .  .  .  .  .  .  .
r2     .  .  .  o  .  .  .  .
r3     .  V1 .  .  .  V2 .  .
r4     o  .  .  .  .  .  .  o
r5     .  .  .  .  .  .  .  .
r6     #  #  #  .  V3 #  #  #
r7     .  .  #  .  .  .  .  .
```

---

## Move 3

Tray: [empty (L used), empty (I3 used now), T-tet]. Wait re-tally: started [I3, T, L]. M1 used L. M2 used I3. So tray = [empty, T, empty]. T present, two empties. Refill on all empty — not yet. Tray = [T-tet].

But wait — score attack standard tray IS 3-slot refill-on-all-empty. Some modes refill per-piece. Spec doesn't specify. Assume standard.

**Decisions for T:**

a. T stem-up at (5,3): (5,3)(5,4)(5,5)(4,4). V3 at (6,4) walks: D=(7,4) empty → V3 to (7,4). V3 now in r7. Bottom edge.
b. T stem-down at (4,3): (4,3)(4,4)(4,5)(5,4). V3 D=(7,4) → V3 to (7,4). Same.
c. T stem-up at (7,3): (7,3)(7,4)(7,5)(6,4 filled by V3? no, V3 IS the cell, counts as filled). REJECTED — (6,4) has vermin which counts as filled. Actually cells with vermin count as filled, so placing onto (6,4) illegal. So this T at (7,3) checking (6,4) — that's the stem of T pointing UP from (7,4): (7,3)(7,4)(7,5)(6,4). Yes (6,4) filled by V3 → REJECTED.
d. T stem-up at (7,5)(7,6)(7,7)(6,6 filled). REJECTED.
e. T stem-down at (5,2)(5,3)(5,4)(6,3). V3 walk: D=(7,4) empty → V3 to (7,4). Now what about V1? V1 at (3,1). D=(4,1) empty → V1 to (4,1). V2 at (3,5) D=(4,5) empty → V2 to (4,5).
f. T at (3,2)(3,3)(3,4)(2,3 blocker). REJECTED.
g. T stem-down at (3,3) stem at (4,3): (3,3)(3,4)(3,5)(4,4)? Wait (3,5) has V2 — REJECTED.

The vermin themselves block placements. Important interaction.

h. T at (4,2)(4,3)(4,1)(5,2). Wait check shape — T = 3-bar + 1 stem. (4,1)(4,2)(4,3)(5,2) is valid T stem-down. After placement V1 at (3,1) D=(4,1 just filled) → R=(3,2) empty → V1 to (3,2). V1 deflected RIGHT.

**Tradeoffs:**
- (a)(b)(e): V3 walks to r7, edge. V3 has (7,4) — D out of bounds → R=(7,5) empty next turn → walks E. V3 now wandering bottom row.
- (h): V1 deflected, blocks 4 cells in r4.

**The discovery:** with no nests, vermin just wander. Player needs to CLEAR LINES with vermin in them.

How to clear a line containing V3? Fill r7 entirely. r7 currently has (7,2)# from move 1. 7 more cells to fill. Big project.

Or fill c4 (V3 col): currently (4,4)? No (4,4) empty. c4 has V3 at (6,4) only. Fill (0,4)(1,4)(2,4)(3,4)(4,4)(5,4)(6,4 will be V3)(7,4) — vermin + 7 player cells. Fill all 7 → c4 completes (vermin counts as filled) → c4 clears → V3 destroyed.

That's a 7-piece-cell project for one vermin. Long-term plan.

**Pick:** **(e) — T stem-down at (5,2)/(5,3)/(5,4)/(6,3).** Begins building the c3-c4 wall to eventually clear column. Also moves V3 toward bottom edge where it has fewer escape routes.

After move 3 + vermin walk:
- V1 (3,1) D=(4,1) empty → V1 to (4,1).
- V2 (3,5) D=(4,5) empty → V2 to (4,5).
- V3 (6,4) D=(7,4) empty → V3 to (7,4).

```
r0     .  .  .  .  .  .  .  .
r1     .  .  .  .  .  .  .  .
r2     .  .  .  o  .  .  .  .
r3     .  .  .  .  .  .  .  .
r4     o  V1 .  .  .  V2 .  o
r5     .  .  #  #  #  .  .  .
r6     #  #  #  #  .  #  #  #
r7     .  .  #  .  V3 .  .  .
```

---

## Move 4

Tray: [empty, empty, empty] — all consumed. Refill: [O, J-tet, I4].

**Critical observation:** V3 at (7,4) is on the BOTTOM EDGE. Walk priority D > R > U > L. D out of bounds (row 8 doesn't exist) — counts as illegal. So V3 tries R=(7,5) empty → V3 to (7,5). Then D=oob, R=(7,6) empty → (7,6). Then R=(7,7) → (7,7). Then R=oob, U=(6,7 filled) → BLOCKED. L=(7,6 just walked from, now empty) → L! V3 walks LEFT.

So V3 will SHUTTLE between (7,7) and (7,3) area, bouncing on bottom edge. The deterministic priority creates a deterministic CYCLE.

**This means:** an isolated vermin on a free edge cycles forever, never destroyed. Player MUST line-clear or box-in.

To box in V3 at (7,7): fill (7,6) and (6,7) — (6,7) already filled. Need (7,6) filled. Then V3 at (7,7): D=oob, R=oob, U=(6,7) filled, L=(7,6) filled → no legal walk → V3 BOXED IN → REMOVED.

But V3 needs to BE at (7,7) when (7,6) gets filled. After move 3 V3 at (7,4). V3 walks (7,5) → (7,6) → (7,7) over 3 turns.

**Decisions:**

a. O (2×2) at (6,6)? Already filled. Try (5,6)(5,7)(6,6 filled). REJECTED.
b. O at (4,6)(4,7 blocker). REJECTED.
c. O at (3,6)(3,7)(4,6)(4,7 blocker). REJECTED.
d. O at (5,5)(5,6)(6,5 filled). REJECTED.
e. J-tet at (7,4 has V3) — REJECTED, vermin blocks.
f. I4 horizontal at (5,4 filled). Various — many illegal due to V3 at (7,4).
g. O at (3,6)(3,7)(2,6)(2,7). Legal. NE corner build.
h. J at (0,7)(1,7)(2,7)(2,6) — vertical J. Legal.
i. I4 vertical at c2: (1,2)(2,2)(3,2)(4,2). Legal.

But what about V1 and V2?
- V1 at (4,1). D=(5,1) empty → V1 to (5,1). Then D=(6,1) FILLED → R=(5,2) FILLED → U=(4,1) — was V1's prev spot, now empty after V1 moved → BUT walk happens once per turn. So next turn V1 D=(6,1) filled, R=(5,2) filled, U=(4,1) empty → V1 to (4,1). Cycle 2-step between (4,1) and (5,1).
- V2 at (4,5). D=(5,5) empty → V2 to (5,5). Next turn D=(6,5) filled, R=(5,6) empty → V2 to (5,6). Then D=(6,6) filled, R=(5,7) empty → (5,7). Then D=(6,7) filled, R=oob, U=(4,7) blocker — filled. L=(5,6) empty → V2 walks LEFT. Cycle.

**All three vermin enter cycles.** Player has time to plan.

**Pick:** **(i) — I4 vertical at c2: (1,2)(2,2)(3,2)(4,2).** Builds c2 toward eventual column completion. c2 currently has (5,2),(6,2),(7,2) filled → 3. Adding 4 more = 7 of 8. One more cell at (0,2) to complete c2 → c2 clear → no vermin in c2 to destroy. Hmm not useful for vermin removal directly. But sets up the board for clears.

Better: **build toward boxing V3 at (7,7).** But need V3 there first. Use this turn to set up rather.

Reconsider: **(h) J at (0,7)(1,7)(2,7)(2,6).** Sets up E side. Then later fill (7,6) when V3 at (7,7).

**Pick:** **(h) — J vertical at (0,7)/(1,7)/(2,7) + (2,6).**

After move 4 + vermin walks:
- V1 (4,1) D=(5,1) empty → V1 to (5,1).
- V2 (4,5) D=(5,5) empty → V2 to (5,5).
- V3 (7,4) D=oob → R=(7,5) empty → V3 to (7,5).

```
r0     .  .  .  .  .  .  .  #
r1     .  .  .  .  .  .  .  #
r2     .  .  .  o  .  .  #  #
r3     .  .  .  .  .  .  .  .
r4     o  .  .  .  .  .  .  o
r5     .  V1 #  #  #  V2 .  .
r6     #  #  #  #  .  #  #  #
r7     .  .  #  .  .  V3 .  .
```

---

## Move 5

Tray: [O, I4, empty]. Refill triggers when all empty — not yet. Tray = [O, I4].

V3 next turn will walk to (7,6). I want (7,6) and (7,7) eventually filled while V3 there.

**Decisions:**

a. I4 horizontal at (7,4)(7,5 has V3 — illegal). REJECTED.
b. I4 horizontal at (0,2)(0,3)(0,4)(0,5). Legal. Builds r0.
c. O at (3,3)(3,4)(4,3)(4,4). Legal. Closes mid-board.
d. O at (0,5)(0,6)(1,5)(1,6). Legal.
e. O at (4,4)(4,5)(5,4 filled). REJECTED. (5,4) is # from move 3.
f. I4 vertical at c0: (0,0)(1,0)(2,0)(3,0). Legal.
g. I4 vertical at c1: (0,1)(1,1)(2,1)(3,1). Legal.

**Box-V1 plan:** V1 at (5,1) cycling between (5,1) and (4,1). To box V1 at (5,1): need (4,1)(5,0)(5,2 filled)(6,1 filled) all filled. Need to fill (4,1) and (5,0). If V1 is at (5,1) with all 4 neighbors filled → boxed in → removed.

Actually V1 cycles: at (4,1), walks D to (5,1); at (5,1), walks U to (4,1). So V1 alternates EVERY turn. Hmm — but priority is D>R>U>L. At (5,1): D=(6,1) filled, R=(5,2) filled, U=(4,1) empty → walk U. At (4,1): D=(5,1) — was V1's prev spot now empty → walk D. Yes 2-cycle.

To box V1: fill (4,1) when V1 at (5,1), and (5,0) all the time. After this turn V1 at (4,1) — to box, need V1's all neighbors filled. (3,1) empty, (4,0) blocker, (4,2) empty, (5,1) empty. Three neighbors empty. Need to fill (3,1)(4,2)(5,1). Many cells.

**Pick:** **(g) — I4 vertical at (0,1)/(1,1)/(2,1)/(3,1).** Adds (3,1) (one of V1's needed neighbors when at (4,1)).

After move 5:
- V1 (5,1) D=(6,1) filled, R=(5,2) filled, U=(4,1) empty → V1 to (4,1). But after my placement, (3,1) is now filled. So at NEXT turn, V1 at (4,1): D=(5,1) empty → V1 to (5,1). Cycle continues.
- V2 (5,5) D=(6,5) filled, R=(5,6) empty → V2 to (5,6).
- V3 (7,5) D=oob, R=(7,6) empty → V3 to (7,6).

```
r0     .  #  .  .  .  .  .  #
r1     .  #  .  .  .  .  .  #
r2     .  #  .  o  .  .  #  #
r3     .  #  .  .  .  .  .  .
r4     o  V1 .  .  .  .  .  o
r5     .  .  #  #  #  .  V2 .
r6     #  #  #  #  .  #  #  #
r7     .  .  #  .  .  .  V3 .
```

---

## Move 6

Tray: [O, empty, empty]. Refill on all empty. Currently O present. No refill. Tray = [O].

V3 will walk: D=oob, R=(7,7) empty → V3 to (7,7). Once V3 at (7,7): D=oob, R=oob, U=(6,7) filled, L=(7,6) — was V3's prev spot, now EMPTY → V3 walks L. V3 cycles (7,6)↔(7,7) and (7,7)↔(7,6).

To box V3 at (7,7): need (7,6) AND (6,7) filled when V3 at (7,7). (6,7) already filled. Need (7,6) filled while V3 at (7,7).

Sequence:
- This turn (move 6): V3 walks to (7,7). I should place to fill (7,6) so when V3 next walks from (7,7), L=(7,6) filled, U=(6,7) filled, R=oob, D=oob → BOXED.

**Decisions:**

a. O at (6,6)(6,7 filled). REJECTED.
b. O at (5,6 has V2). REJECTED.
c. O at (5,7)(6,7 filled). REJECTED.
d. O at (4,6)(4,7 blocker). REJECTED.

O can't reach (7,6) without overlapping vermin/blocker. Need a different piece.

But tray is only [O]. Forced to play O elsewhere or lose progress.

e. O at (3,3)(3,4)(4,3)(4,4). Legal. Mid-board.
f. O at (0,5)(0,6)(1,5)(1,6). Legal.
g. O at (3,6)(3,7)(4,6)(4,7 blocker). REJECTED.
h. O at (2,4)(2,5)(3,4)(3,5). Legal.

**Pick:** **(e) — O at center** (3,3)(3,4)(4,3)(4,4). Fills central holes. Doesn't help vermin directly, but no choice.

After move 6 + vermin walks:
- V1 (4,1) D=(5,1) empty → (5,1).
- V2 (5,6) D=(6,6) filled, R=(5,7) empty → (5,7).
- V3 (7,6) D=oob, R=(7,7) empty → (7,7).

```
r0     .  #  .  .  .  .  .  #
r1     .  #  .  .  .  .  .  #
r2     .  #  .  o  .  .  #  #
r3     .  #  .  #  #  .  .  .
r4     o  .  .  #  #  .  .  o
r5     .  V1 #  #  #  .  .  V2
r6     #  #  #  #  .  #  #  #
r7     .  .  #  .  .  .  .  V3
```

---

## Move 7

Tray: refill (all empty after O used). New tray: [I3, S-tet, J-tet].

V3 at (7,7) corner. Need (7,6) filled NOW to box V3.

**Decisions:**

a. I3 horizontal at (7,3)(7,4)(7,5). Wait — does this fill (7,6)? No, ends at (7,5). Would need (7,4)(7,5)(7,6).
b. I3 horizontal at (7,4)(7,5)(7,6). Legal? All empty (V3 at (7,7) now, not (7,6)). YES! Fills (7,6).
c. S-tet various; can it fill (7,6)? S vertical at (6,6 filled). No.
d. J at (5,5)(6,5 filled). REJECTED.

After (b), V3 at (7,7) walk: D=oob, R=oob, U=(6,7) filled, L=(7,6) FILLED → no legal walk → V3 BOXED IN → REMOVED.

**Pick:** **(b) — I3 horizontal at (7,4)/(7,5)/(7,6). Boxes V3.**

Also check: does this trigger a line clear? r7 cells: (7,0)., (7,1)., (7,2)#, (7,3)., (7,4)#, (7,5)#, (7,6)#, (7,7)V3. (7,7) counts as filled (vermin). r7 = .,.,#,.,#,#,#,V → 4 fills + 1 vermin = 5 of 8. Not full. No clear.

After move 7 + vermin walks (V3 first removed by box-in BEFORE its walk):
- V3 BOXED → removed (no longer a vermin). (7,7) becomes empty.
- V1 (5,1) D=(6,1) filled, R=(5,2) filled, U=(4,1) empty → V1 to (4,1).
- V2 (5,7) D=(6,7) filled, R=oob, U=(4,7) blocker filled, L=(5,6) empty → V2 to (5,6).

Wait — when V3 is boxed in, what happens to its cell (7,7)? Spec says "vermin destroyed by being boxed in is removed." Does the cell become empty? Reasonable to say YES (vermin sentinel cleared). Let's assume.

```
r0     .  #  .  .  .  .  .  #
r1     .  #  .  .  .  .  .  #
r2     .  #  .  o  .  .  #  #
r3     .  #  .  #  #  .  .  .
r4     o  V1 .  #  #  .  .  o
r5     .  .  #  #  #  .  V2 .
r6     #  #  #  #  .  #  #  #
r7     .  .  #  .  #  #  #  .
```

V3 destroyed. V1, V2 remaining. Score increment for vermin destruction.

---

## Move 8

Tray: [I3 used, S-tet, J-tet]. Two left.

V2 at (5,6) cycling: D=(6,6) filled, R=(5,7) empty → (5,7). At (5,7): D=(6,7) filled, R=oob, U=(4,7) filled, L=(5,6) empty → (5,6). 2-cycle (5,6)↔(5,7).

To box V2 at (5,7): need (5,6) and (4,7=blocker filled) filled. (6,7) filled. (5,6) needs filling while V2 at (5,7).

**Decisions:**

a. S-tet vertical at (4,6)(5,6)(5,7 has V2). REJECTED.
b. S vertical at (4,5)(5,5)(5,6)(6,6 filled). REJECTED.
c. S horizontal at (4,5)(4,6)(5,4 filled). REJECTED.
d. J at (5,6)(6,6 filled). REJECTED.
e. J vertical at (3,6)(4,6)(5,6)(5,5). Legal? (3,6),(4,6),(5,6),(5,5) all empty — but (5,6) has V2! REJECTED if V2 currently there.

Wait, V2 currently at (5,6) per move 7 result. So any placement on (5,6) illegal.

f. S at (3,6)(3,7)(4,5)(4,6)? S = (3,6)(3,7)(4,5)(4,6). Check: all empty. Legal.

After (f), V2 at (5,6) walks: D=(6,6) filled, R=(5,7) empty → V2 to (5,7). Then NEXT turn at (5,7): D=(6,7) filled, R=oob, U=(4,7) filled, L=(5,6) — empty (V2 just left) → V2 to (5,6). Walks back.

To prevent V2 walking back from (5,7), need (5,6) filled. Let's see what tray gives next.

**Pick:** **(f) — S at (3,6)/(3,7)/(4,5)/(4,6).** Encloses NE region. Sets up (4,6) filled which doesn't directly box V2 but constrains.

After move 8 + vermin walks:
- V1 (4,1) D=(5,1) empty → (5,1). Cycle 2 step continues.
- V2 (5,6) D=(6,6) filled, R=(5,7) empty → (5,7).

```
r0     .  #  .  .  .  .  .  #
r1     .  #  .  .  .  .  .  #
r2     .  #  .  o  .  .  #  #
r3     .  #  .  #  #  .  #  #
r4     o  .  .  #  #  #  #  o
r5     .  V1 #  #  #  .  .  V2
r6     #  #  #  #  .  #  #  #
r7     .  .  #  .  #  #  #  .
```

---

## Verdict for C45

Stop trace at move 8 — pattern is clear.

**Question persists?** YES, partially. The "where will vermin walk next?" question is asked every turn, and "can I box this vermin in a corner?" is a recurring strategic problem. But the strategy that emerged is a STRONG dominant play pattern.

**Trade-off space alive?** Mostly NO. The trace exposed a dominant strategy:

1. **Phase 1: nest elimination.** Fill nest cells immediately (moves 1, 2). Trivial — nests don't move and have no defense. Once both nests are filled, the vermin can NEVER cause loss. The "antagonist's win condition" is trivially defeated in 2 moves.

2. **Phase 2: corner-box.** Vermin on edges enter deterministic 2-cycles. Player picks a corner (e.g. (7,7)), waits for vermin to walk into it (2–4 turns), fills the one open neighbor with any tray piece that fits → vermin destroyed.

3. **Phase 3: repeat.** Walk each vermin to a corner via deflective placements, box.

The "deterministic priority D>R>U>L" makes vermin trajectories FULLY PREDICTABLE. Players don't need to manage uncertainty — they precompute walk paths and execute. This is a SOLVED-PUZZLE feel, not strategic depth.

**Difficulty curve plausible?** No — it solves itself. Once player learns "fill nests, herd to corners, box," every puzzle reduces to executing this recipe.

**STRUCTURAL CONCERNS:**

1. **Nest elimination is dominant.** The nest cells are static, visible, and small in number (~2). Filling them is trivial in 1–2 moves. After nest removal, the LOSS condition is fully defended; the player only needs to win by removing vermin. This makes the antagonist a 2-move trivia.

2. **Deterministic walk priority is exploitable.** D>R>U>L means edges are sinks (vermin cannot walk past board boundaries; once on an edge they cycle deterministically along that edge). The corner cells are TRAPS — vermin walk into them and bounce back, predictably. Player just needs to fill 1 cell at the right moment.

3. **Scar-disease-adjacent (but inverted).** Spec correctly noted that if the priority is "too simple, players solve it once and find the optimal 'always corner the vermin in the SE quadrant' move." The trace VERIFIES this concern. A more complex priority (RNG-based, history-based, current-board-feature-based) might fix the determinism but risks scar disease.

4. **Pieces vs vermin: low coupling.** Tray composition rarely matters — almost any piece can be played defensively or used to fill a corner. The mode is more about TIMING than piece-fit, and timing is solved by precomputation.

5. **"Vermin destroyed by line clear" is rarely used.** In the trace, line clears didn't happen because building a 7-cell column to clear one vermin is more expensive than corner-boxing. Box-in dominates clear-removal.

**Verdict: REJECT.**

Reasoning: the trace exposed a fully dominant 3-phase strategy (fill nests → herd to corner → box) that reduces every Vermin puzzle to executing the same recipe. The deterministic walk priority makes vermin trajectories precomputable, removing all uncertainty. The nest-fill phase trivially defends the loss condition in 1–2 moves. The mode COULD be saved with non-deterministic walk (sacrificing scar-disease compliance) or by making nests un-fillable (forcing pure pursuit) — but as specified, it solves itself.

The most interesting insight: **the deterministic walk priority guarantees vermin enter 2-cycles on board edges, which makes corners into perfect traps; combined with trivially-filled static nests, the antagonist has TWO simultaneous degenerate weaknesses, either of which alone would collapse the design.**
