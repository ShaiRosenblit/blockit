# C11 — Erasures: Stage 3 reducer simulation

**Recap of rule:** Puzzle mode. Player has K erase tokens (Normal: 5). Each token deletes one chosen 4-connected component of *player-placed* cells (NOT pre-fill, NOT target overlay). Win = match target after tray is exhausted.

**Legend**
- `.` empty
- `#` pre-fill (cannot be erased except by row/col clear)
- `T` target cell (overlay; must end filled)
- `t` target cell currently filled by player
- `a/b/c/...` distinct player-placed components (relabelled each turn for the trace)
- `X` cell that is BOTH target and pre-fill (sticky; helps anchor)

For brevity I will mark the target overlay with a left-side strip showing target-row coverage.

---

## Setup

Tray (in order, fixed): P1=L-tetromino, P2=I-tromino (3-bar), P3=square 2x2, P4=L-tetromino, P5=I-tetromino (4-bar), P6=Z-tromino, P7=monomino. K=5 tokens. 7 pieces, 5 tokens — token budget feels generous.

Initial board (row 0 top):

```
col   0 1 2 3 4 5 6 7
row 0 . . . . . . . .
row 1 . . # . . . . .
row 2 . . . . . . # .
row 3 . . . T T T . .
row 4 . . . T . T . .
row 5 . . . T T T . .
row 6 # . . . . . . .
row 7 . . . . . . . #
```

Target overlay = the ring at rows 3-5 cols 3-5 (a hollow 3x3 frame, 8 target cells, center (4,4) must end empty). Pre-fill at (1,2), (2,6), (6,0), (7,7) — four scattered blockers, none on a target cell. The forward-sim solution requires the player to construct the 8-cell ring exactly while leaving (4,4) empty AND clearing the four blockers via row/col completion.

The ring cannot be completed by simply placing pieces on it: every reasonable tray piece overhangs the ring, and the 8-cell ring with a 1-cell hole inside is geometrically nasty (no tetromino fits it without overhang). So overhang-then-erase is forced.

---

## Move 1 — P1 (L-tetromino, currently in 3-tall × 2-wide orientation)

L cells (relative): (0,0)(1,0)(2,0)(2,1).

**Decisions available**
1. Place at (3,3): fills target cells (3,3),(4,3),(5,3),(5,4). Three target cells covered + one target cell (5,4). All four go into the ring. NO overhang.
2. Place at (3,5) (rotated): cover right side of ring.
3. Place at (0,0): cheap corner placement, no target progress, builds toward clearing row 0 / col 0 to evict blocker (6,0).
4. Place at (1,3): three cells overhang above the ring (1,3)(2,3)(3,3) + (3,4). Sets up overhang to be erased later.

**Future states traded off**
- (1) covers 4/8 ring cells in one move. After this the ring has 4 covered, hole still empty, no overhang debt.
- (3) banks toward a later row-clear that evicts pre-fill cells. Ring untouched.
- (4) covers (3,3)(3,4) but pollutes (1,3)(2,3) which sit ON empty non-target cells — must be erased later.

**Information player is using:** target overlay (which cells are ring vs hole vs background), token reserve (5), pre-fill positions (which row-clears could evict them).

**New question vs Classic:** "Is this placement permanent (target-only) or scaffolding (creates overhang I will spend a token on later)?" Classic only asks "does it fit and does it clear?"

**Pick:** (1). It is the rare zero-debt placement: 4/8 ring cells filled, no token cost. Tokens are scarce; spend them only when forced.

After move 1:
```
. . . . . . . .
. . # . . . . .
. . . . . . # .
. . . a T T . .
. . . a . T . .
. . . a a T . .
# . . . . . . .
. . . . . . . #
```
Ring filled: (3,3),(4,3),(5,3),(5,4). Remaining ring cells: (3,4),(3,5),(4,5),(5,5).

---

## Move 2 — P2 (I-tromino, 1×3 horizontal)

**Decisions available**
1. Place at (3,3): blocked (overlaps `a`).
2. Place at (3,4): fills (3,4),(3,5),(3,6). (3,4) and (3,5) are ring; (3,6) is overhang (off-target). 1 token of overhang.
3. Place rotated to vertical at (3,5): fills (3,5),(4,5),(5,5). All THREE are ring cells. Zero debt.
4. Place at (5,5) horizontal: fills (5,5),(5,6),(5,7). 1 ring + 2 overhang.

**Future states traded off**
- (3) covers 3 more ring cells; ring is then 7/8 filled with only (3,4) missing. Hole (4,4) preserved. Zero token debt.
- (2) covers 2 ring + creates a stub `b` at (3,6) that must be erased.

**Information used:** rotation legality of P2 (player can rotate vertical), the geometry of remaining ring cells (a vertical 1×3 at col 5 fits exactly).

**New question vs Classic:** Same as move 1 — "permanent or scaffold?" The vertical 1×3 happens to be perfectly target-aligned. In Classic, "fits perfectly into nothing" doesn't matter; here it's the optimal move because it preserves token reserve.

**Pick:** (3). Vertical at col 5.

After move 2:
```
. . . . . . . .
. . # . . . . .
. . . . . . # .
. . . a T b . .
. . . a . b . .
. . . a a b . .
# . . . . . . .
. . . . . . . #
```
Ring: 7/8. Missing only (3,4).

---

## Move 3 — P3 (2×2 square)

**Decisions available**
1. Place at (2,3): fills (2,3),(2,4),(3,3-blocked). Blocked by `a`.
2. Place at (2,4): fills (2,4),(2,5),(3,4),(3,5-blocked by `b`). Blocked.
3. Place at (3,4): blocked by overlap with both `a` and `b`. The hole (4,4) is surrounded — only (3,4) is missing target and the 2x2 cannot fit a 1-cell gap.
4. Place at (0,0): away from ring. Builds a 2x2 `c` at top-left. Could later contribute to clearing row 0 or col 0.
5. Place at (6,5): builds toward bottom rows.
6. Place at (0,3): fills (0,3)(0,4)(1,3)(1,4). Builds toward clearing row 0 or 1 (but row 1 has a pre-fill at (1,2), helping it complete).

**Future states traded off**
- The square cannot be made to cover (3,4) without overhanging or colliding. So this is necessarily a scaffolding move OR a placement that contributes to a row clear.
- (6): bottom-right area, sets up later piece interaction.
- (4) starts a corner build that could be erased if it doesn't clear.

**Information used:** Hole geometry — (3,4) is now an isolated 1-cell gap; no piece in the remaining tray is a monomino except P7. So P7 is the only piece that can finally fill (3,4). All other pieces must avoid filling (3,4) or must overhang and be erased.

**New question vs Classic:** "Is there a future piece that fills the cell I'm leaving alone?" This is target-fit forecasting against the remaining tray — Classic doesn't have a defined remaining tray.

**Pick:** (4) at (0,0). Bank corner mass; both (0,0) and (0,1) and (1,0) and (1,1) are off-target so this is pure scaffold/clear-bait.

After move 3:
```
c c . . . . . .
c c # . . . . .
. . . . . . # .
. . . a T b . .
. . . a . b . .
. . . a a b . .
# . . . . . . .
. . . . . . . #
```

---

## Move 4 — P4 (L-tetromino again)

**Decisions available**
1. Place rotated at row 1 to chain with `c` and pre-fill (1,2): if I can fill (1,3)(1,4)(1,5)(1,6) with an L, row 1 then has cells (1,0)(1,1)(1,2)(1,3)(1,4)(1,5)(1,6) filled — needs (1,7) too for clear. Doesn't quite line up.
2. Place L vertically at (0,2): fills (0,2)(1,2-BLOCKED). Blocked.
3. Place L horizontally at (0,3) covering (0,3)(0,4)(0,5)(1,5): row 0 progresses; (1,5) is overhang.
4. Place at (6,0)-area to start eviction of pre-fill (6,0): L at (5,0) fills (5,0)(6,0-blocked). Need a different rotation.
5. Place at (4,6) or similar to start covering (5,6) etc — adjacent to ring.

**Future states traded off**
- Aim: complete row 1 or row 0 to evict pre-fill (1,2) or row 6 to evict (6,0). Each evicted pre-fill is one less obstruction.
- Or: place adjacent to ring `b`/`a` to create scaffold that, when erased, leaves the ring intact. CRITICAL: erase deletes a 4-connected COMPONENT of player cells. If I place L *touching* `a`, it merges into one component — and erasing then nukes the entire ring half I just built. This is the cardinal trap.

**Information used:** Component connectivity rules. The player must keep `a` and `b` ISLAND from any scaffold pieces. So scaffold placements must leave a 1-cell air gap from `a` and `b`.

**New question vs Classic:** "Is this placement safely disconnected from my permanent structure?" — the adjacency-counts-as-merger rule is unique. This is a strong, specific question Classic never asks.

**Pick:** (3) — horizontal L at (0,3), cells (0,3)(0,4)(0,5)(1,5). This is disconnected from `c` (c stops at col 1) and disconnected from `a`/`b` (which start row 3). The (1,5) cell is an overhang to be erased.

After move 4:
```
c c . d d d . .
c c # . . d . .
. . . . . . # .
. . . a T b . .
. . . a . b . .
. . . a a b . .
# . . . . . . .
. . . . . . . #
```

Wait — `d` placed at row 0 covers (0,3)(0,4)(0,5) and at (1,5). That's an L shape. The component `d` has 4 cells. Row 0 now has (0,0)(0,1)(0,3)(0,4)(0,5) — 5/8. Not a clear yet.

---

## Move 5 — P5 (I-tetromino, 1×4)

**Decisions available**
1. Horizontal at (0,4): blocked by `d`.
2. Horizontal at (1,4): blocked by `d` at (1,5).
3. Vertical at (0,7): fills (0,7)(1,7)(2,7)(3,7). Disconnected from everything. Helps fill col 7 (which has pre-fill at (7,7) — col-7 clear would evict (7,7)).
4. Horizontal at (6,1): fills (6,1)(6,2)(6,3)(6,4). Combined with pre-fill (6,0), row 6 is at 5/8.
5. Horizontal at (7,0): fills (7,0)(7,1)(7,2)(7,3). Builds row 7 (which already has (7,7) pre-fill).

**Future states traded off**
- (3) vertical col 7: with (7,7) pre-fill, col 7 now has rows 0,1,2,3,7 = 5/8. Need 3 more (rows 4,5,6). Achievable but expensive.
- (4) row 6: with (6,0) pre-fill, row 6 has cols 0,1,2,3,4 = 5/8. Need cols 5,6,7. Achievable.
- (5) row 7: with (7,7) pre-fill, row 7 has cols 0,1,2,3,7 = 5/8.

The forward-sim wanted to evict the four pre-fills via row/col clears. Each clear evicts pre-fills AND deletes any player cells in that row/col. Critically, a row/col clear that touches `a` or `b` also wipes those cells — fragmenting the ring. So clears must miss the ring.

Row 6 clear wipes (6,0..7), no ring cells. Safe.
Col 7 clear wipes (0..7, 7), no ring cells. Safe.
Row 1 clear wipes (1,0..7) — no ring cells, but `d`'s cell at (1,5) goes too. Fine.
Row 0 clear wipes (0,0..7) — `c` cells at (0,0)(0,1) and `d` cells at (0,3)(0,4)(0,5) go.

**Information used:** Which row/col clears would slice the ring (rows 3,4,5 and cols 3,4,5 are forbidden to clear).

**New question vs Classic:** "Which row/col clears are SAFE (don't bisect my permanent structure)?" In Classic every clear is good. Here, a clear through the ring is catastrophic.

**Pick:** (4) at row 6. Sets up row 6 clear cleanly, and the 4 cells (`e`) are disconnected from everything (they sit at row 6, ring is rows 3-5).

After move 5:
```
c c . d d d . .
c c # . . d . .
. . . . . . # .
. . . a T b . .
. . . a . b . .
. . . a a b . .
# e e e e . . .
. . . . . . . #
```

---

## Move 6 — Spend an erase token? Or place P6?

Now we hit the central decision of the mode.

**Decisions available**
1. Erase `d` (the overhang at (1,5) is now a stuck cell preventing future row-1 work; the L block at (0,3-5) is a scaffold that, if erased, opens row 0 for a different fill).
2. Erase `c` (free corner; could re-use cells for a different shape).
3. Place P6 (Z-tromino) somewhere.
4. Erase `e` (would undo the row-6 progress — bad).

If I look at the budget: 7 pieces, 5 tokens, 5 pieces placed. 2 pieces left (P6, P7) and 5 tokens. I am token-rich. So spending one now is cheap.

**Future states traded off**
- Erase `d`: row 0 drops from 5/8 to 2/8 (just `c`); but (1,5) is freed, allowing P6 to lay across row 1. Goal: build row 1 to clear, evicting pre-fill (1,2) AND any player cells (which are then few).
- Erase `c`: opens (0,0)(0,1)(1,0)(1,1) for a different fill. But there's no clear pressure on those cells.
- Place P6 first: P6 is a Z-tromino (3 cells in S/Z shape). Could fit somewhere productive.

**Information used:** Token count, remaining tray, which cells are obstructions vs. assets.

**New question vs Classic:** "Was the scaffold I placed two turns ago helping, or has it become an obstacle?" — temporal evaluation of past placements that doesn't exist in Classic.

**Pick:** Erase `d`. Reasoning: (1,5) is in a row that I want to clear (row 1, which has pre-fill (1,2) blocker). With `d` gone, P6 can plausibly slot into row 1.

After erase:
```
c c . . . . . .
c c # . . . . .
. . . . . . # .
. . . a T b . .
. . . a . b . .
. . . a a b . .
# e e e e . . .
. . . . . . . #
```
Tokens: 4 left.

---

## Move 7 — P6 (Z-tromino, 3 cells in offset)

Z cells (one orientation): (0,0)(0,1)(1,1)(1,2) — wait that's 4. Z-tromino as 3 cells: (0,0)(1,0)(1,1) (an "L-tromino" really). Let me use the standard Z-tromino as: (0,1)(0,2)(1,0)(1,1) — 4 cells = S-tetromino. To be safe, treat P6 as "L-tromino": cells (0,0)(1,0)(1,1).

**Decisions available**
1. Place at (0,5): fills (0,5)(1,5)(1,6). Now row 1 has (1,2 pre)(1,5)(1,6) = 3/8 — still far from clear.
2. Place at (1,3): fills (1,3)(2,3)(2,4). (2,4) is adjacent to `a` at (3,3)? Diagonally adjacent only — not 4-connected. Safe.
3. Place at (6,5): fills (6,5)(7,5)(7,6). Row 6 then has (6,0)(6,1)(6,2)(6,3)(6,4)(6,5) = 6/8; row 7 has (7,5)(7,6)(7,7) = 3/8.
4. Place rotated to fit (1,3)(1,4)(2,4): fills row 1 cells (1,3)(1,4) — row 1 now (1,2)(1,3)(1,4) = 3/8.

**Future states traded off**
- (3) is the most promising: it puts row 6 at 6/8 (need cols 6,7) AND col 7 starts to fill at (7,7 pre)(6,7? no, (6,7) is empty). After move 7 in option 3: P7 monomino at (6,7) → row 6 now needs only (6,6). But that's one cell with no piece. Hmm. P7 placed at (6,6) instead: row 6 = 7/8 still missing one. Stuck.
- (1) opens up the right-edge fill for next moves. But P7 is the last piece and it's a monomino.

The puzzle is a fixed tray; the forward-sim guaranteed this works. Let me reconsider — option 3 with monomino at (6,7) leaves (6,6) uncovered. Option 3 with monomino at (6,6) leaves (6,7) uncovered. So neither single monomino can complete row 6 alone.

This means the row-6 plan was wrong from move 5. Better path: use row 6's `e` plus P6+P7 spending tokens on `c` to place those cells in row 6.

**Information used:** Forward-counting: what fills can the remaining tray achieve, given erase tokens can "respawn" play cells (but not pieces themselves).

**New question vs Classic:** "Can I afford to spend a token-and-replace, recognizing that erase frees cells but does NOT restore the piece?" The erase-as-undo failure mode flagged in the candidate description manifests here.

**Pick:** Place P6 at (6,5)(7,5)(7,6) (option 3). This advances row 6 to 6/8 and gets monomino-friendly placements adjacent.

After move 7:
```
c c . . . . . .
c c # . . . . .
. . . . . . # .
. . . a T b . .
. . . a . b . .
. . . a a b . .
# e e e e f . .
. . . . . f f #
```

---

## Move 8 — P7 (monomino, last piece)

**Decisions available**
1. Place at (3,4): completes the ring's last cell. Now ring is 8/8, hole (4,4) preserved. Win check: target match! BUT row 6 still has (6,0..5) + (6,7? no, empty), so pre-fill at (6,0) NOT evicted. Wait — does target require (6,0) empty? Yes — the target overlay only marks the ring; (6,0) is NOT a target cell. The pre-fill at (6,0) is `#` (filled but not a target cell), so it must be empty in the final state. Pre-fill cells survive unless cleared. So (6,0) being filled means board does NOT match target. FAIL.
2. Place at (6,6): row 6 = 7/8 (cols 0-6 filled, col 7 empty). Col 7 = (7,7) pre, (6,6 wait no, (6,6) not in col 7). Col 7 still empty mostly. No clear.
3. Place at (6,7): row 6 = (6,0..5)(6,7) = 7/8 (missing col 6). Col 7 = (6,7)(7,7) = 2/8. No clear.

None of these clear row 6.

**This puzzle has gone unwinnable.** The forward-sim guarantees A solution exists, but the player chose a placement order that diverged from it. Specifically: Move 5 placed `e` at (6,1..4) instead of e.g. (6,4..7), leaving (6,5)(6,6)(6,7) needing 3 cells but only P6 (3 cells) and P7 (1 cell) = 4 cells total available — should fit if positioned right. But P6 at (6,5)(7,5)(7,6) used a vertical-L shape that committed (7,5)(7,6) instead of (6,6)(6,7).

Better Move 7 option: rotate P6 so it lays as (6,5)(6,6)(7,6) — then row 6 = (6,0..6) = 7/8 still missing (6,7). Then P7 monomino at (6,7) → row 6 = 8/8 → CLEAR. Row 6 clear evicts pre-fill (6,0) AND wipes player cells (6,1..7).

Let me redo Move 7 with the better rotation.

**Pick (revised):** P6 rotated to (6,5)(6,6)(7,6). After:
```
c c . . . . . .
c c # . . . . .
. . . . . . # .
. . . a T b . .
. . . a . b . .
. . . a a b . .
# e e e e f f .
. . . . . . f #
```

Then move 8 P7 at (6,7): row 6 fills completely. CLEAR row 6.

After clear:
```
c c . . . . . .
c c # . . . . .
. . . . . . # .
. . . a T b . .
. . . a . b . .
. . . a a b . .
. . . . . . . .
. . . . . . f #
```
Pre-fill (6,0) GONE. `e` and `f` partially destroyed. Remaining `f` at (7,6). All ring cells intact (rows 3-5 untouched).

But: ring missing (3,4) still. Tray exhausted. Win check: board has filled cells {ring cells, `c`, (1,2 pre), (2,6 pre), (7,6 player), (7,7 pre)}, target wants {ring cells only}. NOT a match.

The puzzle still fails. We have 4 erase tokens left. Use them:
- Erase `c` (component at (0,0)(0,1)(1,0)(1,1)): now those cells empty. 3 tokens left.
- Erase `f` at (7,6): empty. 2 tokens left.

Remaining filled non-target cells: pre-fills (1,2), (2,6), (7,7). These cannot be erased (tokens delete only player cells). They must be cleared via row/col, but no pieces left.

**The puzzle is unwinnable from move 5 onward.** This is the failure mode the candidate description warned about: pre-fill that wasn't lined up for a clear before tray exhaustion is unrecoverable.

---

## Verdict

**Question persists?** YES, but the question is BRUTAL. The dual nature ("permanent vs scaffold") plus the "is this clear safe for my ring?" plus the forward-counting plus the "should I erase or place?" all live across the trace. Every move asked at least one of those questions.

**Trade-off space alive?** YES. There are clearly multiple strategies: ring-first-then-scaffold (what I attempted), or all-scaffold-then-erase-then-monomino-fill. The trace above shows that getting ANY of the auxiliary-clear scheduling wrong is fatal. There are at least two strategy modes (clear-eviction-heavy vs erase-heavy) and they trade off.

**Difficulty curve plausible?** This trace shows the puzzle is HARD — perhaps too hard. The token-as-undo mitigation works (erasing a piece you placed wrong doesn't restore it, just frees cells), but the failure-to-evict-pre-fill mode means the puzzle has a planning horizon of basically the entire tray. A novice will lose constantly.

**Key concern:** the failure mode in this trace is NOT a degenerate dominant strategy — it's a cliff. Optimal play requires anticipating eviction-clears 5 turns ahead. Mediocre play hits unwinnable mid-puzzle. There is no graceful "got 60% of it" feedback.

Mitigation: generator could ensure pre-fills are placed such that any 1-2 of them can be skipped (left filled in final state but not in target). Or: offer "checkpoint" undo. But the core mechanic survives.

A subtler concern: in many puzzles the pre-fills will be evictable by a single obvious clear, in which case "spend tokens to scaffold" never gets exercised because the player just plays standard puzzle plus a token-as-undo at the end. The candidate's own warning about token-as-undo is real. Mitigation depends entirely on generator quality — the *generator* must guarantee scaffold-and-erase is forced by the geometry, not optional.

**Verdict: SURVIVE.** The new question is real and persistent. The mode has a genuine cliff and demands a sharp generator, but it does NOT collapse into Classic, Mirror, Pipeline, Breathe or Scar disease. The "component as atomic erase unit" forces a specific topological awareness (don't merge scaffolds with permanent structure) that is unique among the candidate fields.

**Risks flagged for Stage 4 prototype:**
1. Generator must force scaffold-and-erase or the mode degenerates to "Puzzle with undo".
2. Failure cliff: unwinnable states reachable with no warning. Need either visual hint of "you've blown the schedule" or a soft-loss UI.
3. Component-merge trap (placing scaffolds adjacent to permanent structure) needs strong onboarding — a single misclick can ruin a 7-piece run.
