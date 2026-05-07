# Stage 3 — Forced playthrough simulation of 18 survivors

For each candidate, set up a small instance and walk 3 placements. The strict test:

> Across the three placements, is the **mental operation** the player performs each time materially different — or is it the same question with different inputs?

If the same op repeats across all 3 moves, the mode fails the 10th-play test and is killed.

Target Stage 3 kill rate: 50–70%, leaving 5–9 survivors.

---

## L1-3 Chord — KEEP

**Setup**: pre-fill row 3 at cols 0,1,5,6,7 + col 4 at rows 1,2,5,6,7. Tray [sq2, l1, h4].

- M1 (board fresh): question = *"Place a piece that completes both row 3 AND col 4 in this single placement?"* — none does. Place sq2 at (3,2) → row 3 to 7/8.
- M2 (row 3 nearly chordless): question = *"Row 3 needs only (3,4). If I fill it without simultaneously completing col 4, I create a permanent orphan stripe. Commit or wait?"* — qualitatively different mental op (orphan-risk vs setup).
- M3 (chord opportunity may have evaporated): question = *"Has my chord plan been ruined? Recovery options?"* — recovery framing.

Setup → orphan-or-wait → recovery. Three distinct mental modes. **PASS.**

## L1-5 Color Chord Clear — KEEP

**Setup**: row 3 has red pre-fill at cols 0,1,2 (run-of-3). Row 5 has mixed reds+blues. Tray [red h2, blue h4, red dot].

- M1 (extend run): *"Place red h2 to push row 3's red run from 3 to 5 (clears cells 0–4)."* — extend-run op.
- M2 (long-piece self-erase trap): *"Blue h4 placed flat creates an instant 4-run that erases itself. Useful only if it bridges existing blue pre-fill into a line of 4+ blues. Where does that geometry exist?"* — bridge-or-waste op.
- M3 (1-cell plug): *"Red dot is the only 1-cell piece. Use it to extend a 3-run to 4, or save?"* — surgical-plug op.

Three different mental modes (extend, bridge, plug). **PASS.**

## L1-6 Board Spin — KEEP

**Setup**: pre-fill in upper-left rectangle. Spin budget = 4. Tray orientation-locked: [I-horiz, L-r0, sq2].

- M1 (current orientation): *"Place I-horiz now without spin, or spin first to align my pre-fill?"* — pre-or-post-spin op.
- M2 (spin-state-1): *"Board has rotated 90°. My partial fills are now in different rows. Does my next L-piece fit the rotated topology, or do I spend another spin?"* — track-spin-state op.
- M3 (last spin available): *"Spend my last spin (rearranging existing fills) to complete a clear, or save it for emergencies?"* — endgame-spin op.

Three different framings. **PASS.**

## L1-7 Tetromino Tax — KILL

**Setup**: pre-fill row 3 cols 0–6. Tray of 5 to allow 3 placements + 2 sacrifices.

- M1: *"Trigger row-3 clear; sacrifice which piece?"*
- M2: row 3 cleared, new pre-fill region; *"Trigger another clear; sacrifice which piece?"*
- M3: similar.

The question across all three placements is structurally identical: "should this placement trigger a clear, and if so, which piece is the cheapest sacrifice?" The remaining-tray composition shrinks, but the mental algorithm is the same each turn. **Same op repeated. KILL.**

## L2-1 Plague — KEEP

**Setup**: 2 infected at (3,3),(3,4). Pre-fill at (4,3),(4,4). Tray [I-horiz, sq2, dot].

- M1 (avoid trigger): *"If I place adjacent to an infected cell, will I push it to ≥2 filled neighbors and trigger spread? Place far away?"* — avoidance op.
- M2 (deliberately set up clear): *"Need to clear row 3 to defeat infection. Placing sq2 at (3,5)(3,6)(4,5)(4,6) triggers spread of (3,4) → but pre-fills 2 of the 3 cells row 3 still needs."* — set-up-trigger op.
- M3 (adapt to new infection): *"A new infected cell appeared at (3,2) (deterministic spread target). Plan changes — row 3 now has more infected cells. Refactor."* — adapt op.

Different mental modes (avoid → trigger → adapt). **PASS.**

## L2-2 Siege — KEEP

**Setup**: partial wall in row 7 cols 0,1,2,5,6,7 (6 sentinels, 2 gaps). Tray [I-horiz, T, sq2].

- M1 (pre-fill destination): *"Wall advances to row 6 after my move. Do I pre-fill row 6 cells now (so when wall lands there it's already nearly complete) or place far away?"* — preempt op.
- M2 (trigger clear): *"Wall is in row 6; I have a piece that completes row 6 → clears wall. Trigger now or save?"* — execute op.
- M3 (use the regen lull): *"Wall cleared; new wall regenerates in 2 turns. Use this lull to score elsewhere or rebuild a setup?"* — economy op.

Different mental modes. **PASS.**

## L2-3 Fuse — KILL

**Setup**: bombs at (3,3) ctr=3, (5,5) ctr=2. Pre-fill scattered. Tray of 5.

- M1: *"Bomb (5,5) is at ctr=2 → 2 turns. Which placement defuses it (clear its row or column)?"*
- M2: *"Bomb (3,3) now at ctr=2. Which placement defuses it?"*
- M3: same shape.

Each placement asks "which bomb's timer is most urgent and can I clear its row/col with my current piece?" The bomb identity changes but the mental op is identical: fuse triage. **Same op. KILL.**

## L3-2 Twin Bond — KEEP

**Setup**: tray = [bonded A=L-tromino, bonded B=I-horiz, free C=sq2].

- M1 (which-first): *"Place A or B first? A's footprint is small, leaving more options for B's adjacency. B's footprint is wide, locking A into a narrow set of adjacent slots."* — order op.
- M2 (constrained partner): *"B must be adjacent to A's footprint. Of the 3 legal positions, which serves my clear plan and leaves room for free C?"* — partner-fit op.
- M3 (reset, free): *"C is unconstrained. Where to place to seed next round's bonded pair geometry?"* — seed-future op.

Three different ops. **PASS.**

## L3-4 Axis Vow — KILL

**Setup**: round of 5 placements. Tray [I-horiz, T, sq2, ...].

- M1 (declare axis): *"Even rotation → row-axis at piece's anchor row. Where to anchor?"* — declaration op.
- M2 (fit near axis): *"T must have centroid within Manhattan ≤2 of declared axis. Which legal slot?"* — corridor-fit op.
- M3 (fit near axis again): *"sq2 must also fit near axis. Which slot?"* — same corridor-fit op.

After M1, every subsequent placement is the same corridor-fit operation with different pieces. Only M1 is unique. **Two-of-three same. KILL.**

## L3-5 Footprint Echo — KILL

**Setup**: prevFootprint empty. Tray [L, T, I].

- M1 (free): *"L placed where? It defines the bbox for next."*
- M2 (chain advance): *"T must overlap or border L's bbox. Which T position?"*
- M3 (chain advance): *"I must overlap or border T's bbox. Which I position?"*

M2 and M3 are the same chain-advance op. Only M1 is structurally different (free start). **Same op repeated post-M1. KILL.**

## L4-1 Lacuna — KILL

**Setup**: pre-fill scattered such that empty region is one large connected blob. Tray [sq2, T, L].

- M1: *"Does sq2 placed here fragment the empty region into two pockets?"*
- M2: *"Does T placed here fragment empty?"*
- M3: *"Does L placed here fragment empty?"*

Identical mental operation: a flood-fill connectivity check. The constraint is global; the question doesn't change shape across placements. **Same op. KILL.**

## L4-2 Quarantine — KEEP

**Setup**: 3 walled regions A/B/C with empty-targets [4, 6, 8]; current empties [6, 10, 14]. Tray [I-horiz (4 cells), T (4), L (3)].

- M1 (region-A budget): *"Region A has 6 empty, target 4. I need to reduce by exactly 2. T-piece has 4 cells; placement that puts 2 cells in A and 2 in B reduces A by 2 (good for A's target) AND B by 2 (B needs to reduce by 4, partial good)."* — multi-region budget op.
- M2 (region-C bridge): *"Region C target is 8, currently 14, need to reduce by 6. I-horiz is 4 cells: place inside C → reduces by 4, still 4 short. Or save I for C and use L to balance B?"* — sub-budget routing.
- M3 (boundary-piece balance): *"Last piece L (3 cells). Currently A,B,C are at +1, -1, -2 vs targets. Find a placement spanning two regions that lands exactly the right cells in each."* — exact-budget closing op.

Three different mental ops (multi-region setup, region routing, boundary balance). The cell-counting calculus differs each turn because budget states differ. **PASS.**

## L4-7 Rift — KILL

**Setup**: rows 0–7 all at 4 filled. Threshold E_clear=2 (row clears at ≥6 filled). R_target=5. Tray [sq2, T, L].

- M1: *"Push row K toward threshold without going past?"*
- M2: same.
- M3: same.

Each placement asks "is this row close to threshold and does my piece push it past?" Same op repeated. **KILL.**

## L5-8 Ink — KILL

**Setup**: ink=12. Pre-fill set up so multiple line-clears are possible. Tray [I-horiz, T, sq2].

- M1: *"Will this placement trigger a clear that refunds 4 ink, netting 0?"*
- M2: same — *"net-zero or net-cost placement?"*
- M3: same.

Cost-benefit ledger op repeated. **KILL.**

## L7-3 Partitioned Board — KEEP

**Setup**: 4 regions (TL/TR/BL/BR each 4×4). TL row 2 at 3/4 cells; BR col 5 at 2/4. Tray [I-horiz, T, sq2].

- M1 (within-region clear): *"I-horiz at TL row 2 cols 0–3 = completes TL's region-row. 4-cell clear fires."* — within-region op.
- M2 (cross-boundary split): *"T-piece centered at boundary row 3/4 cols 3/4 — 2 cells in TL, 2 in TR. Contributes to two region-rows simultaneously, but slowly. Or place wholly within one region?"* — boundary-split decision.
- M3 (compaction strategy): *"Region clear earlier didn't compact other regions (regions are independent). Now BR is dense; do I aim for a BR clear or transfer to a less-dense region for setup?"* — independent-compaction op.

Three different ops (within, boundary, cross-region economy). **PASS.**

## L7-5 Slope — KILL

**Setup**: pre-fill near (0,0). Tilt toward (0,0) after each placement. Tray [I-horiz, T, sq2].

- M1: *"Predict where I-horiz settles after tilt."*
- M2: *"Predict where T settles."*
- M3: *"Predict where sq2 settles."*

Same prediction op repeated. The board state differs but the mental algorithm (simulate gravity) is identical each turn. **KILL.**

## L8-1 Erase — KILL

**Setup**: board fully pre-filled with target shape (specific empty pattern at win-state). Tray [I-horiz, T, sq2].

- M1: *"Which 4-cell region of pre-fill should I erase with I-horiz to match target-empty zones?"*
- M2: same shape — *"Which footprint matches target-empty for T?"*
- M3: same.

Pure piece-to-target-empty matching. Same op. **KILL.** (Note: this is essentially "tile a region with N pieces" — a classic NP-hard tiling puzzle. The mental op is identical every move.)

## L8-3 Hoard — KEEP

**Setup**: tray = [L, T, I]. Pre-fill with 2 clearable lines available. No tray refill on empty.

- M1 (open-ended choice): *"Trigger a clear in one piece (gain +1 piece, deplete 1 → net 0) or use multiple pieces toward a 2-line clear (gain +2 pieces, deplete 3 → net -1)?"* — pacing op.
- M2 (piece-quality bet): *"The clear refilled my tray with a random shape. Is the new piece useful? If junk, my pacing model just lost value."* — adapt-to-quality op.
- M3 (endgame): *"Pre-fill almost gone, only useless shapes left. Run out of pieces before completing target?"* — economy-endgame op.

Three different ops (pacing, adapt, endgame). **PASS.**

---

## Stage 3 summary

**Survivors: 9 of 18** (kill rate 50%, in target band).

| ID | Name | Stage 3 verdict |
|----|------|-----------------|
| L1-3 | Chord | KEEP |
| L1-5 | Color Chord Clear | KEEP |
| L1-6 | Board Spin | KEEP |
| L1-7 | Tetromino Tax | KILL (sacrifice question repeats) |
| L2-1 | Plague | KEEP |
| L2-2 | Siege | KEEP |
| L2-3 | Fuse | KILL (fuse-triage question repeats) |
| L3-2 | Twin Bond | KEEP |
| L3-4 | Axis Vow | KILL (corridor-fit repeats after declaration) |
| L3-5 | Footprint Echo | KILL (chain-advance op repeats) |
| L4-1 | Lacuna | KILL (connectivity check repeats) |
| L4-2 | Quarantine | KEEP |
| L4-7 | Rift | KILL (push-toward-threshold repeats) |
| L5-8 | Ink | KILL (cost-benefit ledger repeats) |
| L7-3 | Partitioned Board | KEEP |
| L7-5 | Slope | KILL (tilt-prediction repeats) |
| L8-1 | Erase | KILL (piece-to-empty matching repeats) |
| L8-3 | Hoard | KEEP |

The killed candidates fail because each placement asks the same question with different inputs — that's exactly the failure pattern from the four bad shipped modes. Survivors all show genuinely different mental operations across at least three different game-states.

Pattern observed: candidates that introduce a *single global invariant* (Lacuna, Rift, Ink, Slope, Erase) tend to repeat the same per-placement op. Candidates that introduce *stateful sub-mechanics with phase transitions* (Chord's setup → orphan-risk → recovery; Plague's avoid → trigger → adapt; Twin Bond's first-vs-second-vs-free) generate genuinely different per-placement questions.

**9 survivors carry forward to Stage 4 (steelman + self-critique).**
