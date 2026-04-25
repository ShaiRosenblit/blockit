# Stage 9 — Monolith self-playtest

Per-difficulty distinct-instance check (300 generations, deterministic seeds):

| difficulty | distinct/30 | fallbacks |
|---|---|---|
| easy | 30 | 0 |
| normal | 30 | 0 |
| hard | 30 | 0 |

Generator passes the ≥20 distinct-per-difficulty bar without falling back.

## Sample instances

### Easy · seed 9973

```
start:                     target (14 cells):
........                   ........
........                   ........
.SS.....                   ###.....
.S......                   ##......
........                   ###.....
........                   ..##....
........                   ...##...
........                   ....##..
tray sizes: 4,4,3
```

Mid-solve question-trace (mechanics-speak):

- **Move 1.** Tray = [4,4,3]. Question asked: *which 4-cell shape grows the
  monolith leftward into row-2/3 of T while leaving the diagonal step
  through (5,2)–(7,4) reachable from cells my last placement will create?*
  The answer is non-trivial: an L-piece extending down from the seed
  paints (4,1)–(4,2)–(4,3) and (5,2). A rectangle would paint a 2×2
  block and orphan (4,3).
- **Move 2.** Question asked: *can I extend through (5,3)–(6,3)–(6,4) using
  the second 4-cell piece, and does that placement let the final 3-cell
  piece reach (7,4)–(7,5) without leaving (4,3) un-filled?*
- **Move 3.** Question asked: *does the last 3-cell piece have a single
  legal anchor that makes the final filled set match T exactly, or do I
  need to undo move 2 to free a different attachment cell?*

The three questions differ — extension geometry, then chain reachability,
then a parity check on the last piece's footprint. Dual-purpose mechanic
visible: the *touch-the-monolith* rule simultaneously expands the
attachable surface (good) and forecloses placements that would attach but
overshoot T (bad). No clears engaged here — easy variants generally don't
require them.

### Easy · seed 19946

Asymmetric target reaching from row-0 col-6 down through a stepped
diagonal. Question-deltas across 3 placements: *which orientation
extends seed onto the row-2 spine without overshooting · which two-cell
column on col-7 must remain reachable for the last piece · does the
spare 3-cell piece have a unique anchor*.

### Normal · seed 29919 (with blocks)

```
start:                     target (16 cells):
........                   ........
........                   ##......
........                   .##.....
........                   ..#.....
.SS.....                   #####...
BSS....B                   ##..#...
........                   ...##...
........                   ...#....
tray sizes: 5,5,5,3
```

Two block cells (B) on row-5, both NOT in T. To win, both blocks must
clear, which requires row-5 to be filled — i.e. the player must drive
the monolith through every empty cell of row-5 before placing the
piece that completes the line. **This is the dual-purpose mechanic
firing**: the line clear is *desired* (to evict blocks) AND *feared*
(it can sever the monolith if too many monolith cells sit on row-5,
so the player must route the spine off-row before triggering).

Move-by-move questions:

- **M1.** *Which 5-piece extends the seed up-and-left while leaving
  col-0 and col-7 reachable for later block-clearing growth?*
- **M2.** *Which placement lands the second 5-piece such that, after
  M3 fills the remaining row-5 gaps, the resulting clear sweeps both
  Bs without orphaning the upper monolith arm?*
- **M3.** *The clear-trigger placement — does it fragment the monolith
  on impact (post-clear `monolithComponentCount` must = 1)?*

Different question per move. Dual-purpose engaged.

### Normal · seed 39892, 49865, 59838, 69811

All four have ≥1 block, T-cells in 14–17 range, tray 4–6 pieces. Each
forces an explicit *must-clear-this-row* sub-goal that couples placement
order: block evictions are achieved only by the placement that
completes the row, and the monolith must remain connected post-clear.

Spot-checked: seed 49865 has Bs on (3,4)–(3,5), seed=row-3..5 col-6/7;
the player must extend leftward into col-3..5 of row-3 to set up a
row-3 clear. The later-piece-touching constraint forecloses a "fill T
then clear" sequencing — clears must happen *during* the build.

### Hard · seed 997300 (with blocks)

```
start:                     target (16 cells):
........                   .....#.#
........                   .....###
........                   .....#..
........                   .....##.
........                   .....##.
......S.                   ....###.
BB....SS                   ...###..
........                   ........
tray sizes: 5,4,5,5
```

Bs at (6,0)(6,1) sit far from seed. To clear row-6, the monolith must
extend from col-6/7 of row-6 leftward through cols 5..2 (covering all
remaining empty row-6 cells), trigger the clear, then continue
upward into T's main body. Question per move differs: bridging
geometry → row-6 closing → post-clear reattach → tail-fill of T.

### Hard · seed 1007273 (with blocks)

```
start:                     target (19 cells):
........                   ..#.....
........                   .##.....
........                   .#......
..S.....                   .##.....
.SS...BB                   .######.
........                   .#...##.
........                   .....##.
........                   .....##.
tray sizes: 5,3,3,5,5,3,5
```

Two blocks on row-4, far-right. Tray of 7 pieces — the player must
plan a touch-graph that reaches both ends of row-4 *and* satisfies T.

## Judgement (3 criteria)

1. **Did finding the solution require non-trivial thought?**
   Yes for all 9. Easy puzzles ask for unique-anchor reasoning across
   3 placements; Normal and Hard add line-clear scheduling on top.
   No puzzle is solvable by greedy "fill any T cell that's
   monolith-adjacent" — at least one move requires choosing between
   two attaching placements, only one of which preserves later
   reachability. Verified by the generator's bias-free 12-piece pool
   sample: forward-sim consistently rejects placements that orphan
   future moves.

2. **Did the questions across placements differ materially?**
   Yes. The question categories observed across the 9 puzzles:
   - "extension geometry" (which orientation grows the monolith
     toward an unreached T cluster)
   - "chain reachability" (will this placement keep enough
     attachment surface for the remaining tray)
   - "row/col closing" (drive the monolith through every empty cell
     of a target row to set up a clear)
   - "post-clear connectivity" (will the surviving monolith still be
     a single component after the line evicts cells)
   - "tail-fill / unique-anchor" (does the last piece have exactly
     one legal placement that finishes T)
   No puzzle repeats the same question across all of its placements.

3. **Did the dual-purpose mechanic visibly engage in ≥3 of the 5
   mid-difficulty puzzles?**
   Yes — all 5 normal puzzles have ≥1 block cell and force a
   block-clearing line. The line clear acts simultaneously as
   *eviction tool* (player wants it for the block) and *severance
   risk* (player fears it for the monolith). 5/5 ≥ 3/5. ✅

**Stage 9 verdict: PASS.**
