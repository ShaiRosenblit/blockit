# Stage 3 — Forced playthrough simulation

For each of the 12 finalists, I sketch a 3-move transcript and judge whether the questions asked across the three moves are MATERIALLY DIFFERENT, or the same question repeated.

Notation: `(r,c)` = origin (0-indexed). Pieces abbreviated. Boards described by occupied/target cells.

---

### F1 — L1-4 Grain

State: 8×8, target = top row {(0,0..3)} empty (must be empty at end? — actually target is a placed pattern). Reformulating: target is to PLACE cells exactly at pattern T. Pre-fill at row 5. Tray = [I3-horiz, L3, dot].

- M1 board has row 5 filled except col 7. Tray has I3-horiz. Question: "Do I clear row 5 to delete pre-fill, but accept the row-blocker seeding penalty in row 5 again? Or clear row 5 via column-clear, paying *interior* penalty — wait, by rule column-clear seeds blockers in the just-cleared row." Decision: place I3-horiz at (5,5..7) → row 5 clears → blockers seed in random row. Question = "is the deletion worth the blocker seeding cost?"
- M2 with new row of blockers at row 3, target overlaps. Question: "Now do I avoid completing column-clears to avoid double-cost, or do I prefer column to dodge another row-seed?" Decision differs because the asymmetry already played once.
- M3 with two seeded blocker-rows. Question: "Which axis is least toxic now given how many seeded rows are stacked?"

Verdict: Questions M1,M2,M3 differ in *which axis-cost is minimum given current seed-row state*. KEEP. Note: "axis-asymmetric clear" feels closely related to L8-7 Clear-to-blocker — both make clears partly punitive. Distinguishing: Grain is per-axis; Clear-to-blocker is universal. Keep both for now; Stage 4 may collapse.

### F2 — L1-6 Lifeline

State: target needs col 0 filled. Pre-fill blocks col 0 with extras. Tray = [a, b, c]. Rule: clears refill ONLY when all three slots are empty.

- M1: place a, no clear. Question: "Do I plan placements b,c so that the clear that deletes pre-fill happens AFTER all three slots are emptied (so I get the refill)?" Decision: choose a position for a that doesn't trigger a clear yet.
- M2: place b. Question: "Will placing c trigger the clear with empty tray, or did I miscount and the clear happens with b still in tray (no refill)?"
- M3: place c, triggers clear. Question: "Did the refill arrive? If not, am I blocked? What's the recovery?"

Verdict: Questions are about *timing the clear at the empty-tray boundary*. M1,M2,M3 differ: pre-empty planning, on-empty execution, post-empty recovery. KEEP. Rich.

### F3 — L1-8 Resonance

State: pieces arrive in PAIRS. First piece of pair must be placed, then second piece must clear with cell-count matching first piece. Tray = [p1=4-cells, p2=3-cells].

- M1: Place p1 (4 cells). Question: "Where can I place p1 such that placing some piece-of-mass-4 next will complete a line?" That requires: the row/col after p1 must have exactly 4 empty cells in some line. Decision: place p1 at location that leaves exactly 4 in a line. But p2=3-cells, NOT 4! So second placement can't clear. Player must place p2 NOT clearing.
- M2: Place p2 (3 cells). Question: "If I can't clear with p2 (size mismatch), then this pair fails — does that lose me, or just deny the pair-bonus?" Hmm, the rule needs sharpening: "second of pair must clear with cell-count matching first" means if first=4, second must be 4. Player must REJECT mismatched second pieces? Or rule is: "second piece's cell-count must equal first piece's cell-count if both placed". This forces ZERO degrees of freedom — generator must guarantee pairs are same-mass.
- M3: New pair, both size 3.

Verdict: Rule is brittle — only works if generator hands matched pairs, in which case the player has no decision to "match", just to place. "Where to clear with the matching piece" reduces to standard Puzzle-style line-completion planning. KILL. Question per move converges to "complete a line" exactly like Puzzle.

### F4 — L2-2 Vault

State: vault cells at (3,3)(3,4)(4,3)(4,4) — these are removed only when row 3 AND row 4 both clear in a single placement, OR col 3 AND col 4 both clear. Pre-fill makes rows 3 and 4 mostly full. Tray = [I4, L, dot].

- M1: Question: "Can any single placement complete BOTH row 3 and row 4 simultaneously?" Decision: place I4 at (3,4..7) — only fills row 3, not row 4. Bad.
- M2: Question: "Now I need a 2-tall piece at the right place to double-clear." Decision: place a 2x2 or similar.
- M3: Question: "How do I avoid blocking my future double-clear option while filling intermediate cells?"

Verdict: M1 = "is double-clear available now?", M2 = "set up double-clear", M3 = "preserve double-clear". Materially different facets of same goal. KEEP.

### F5 — L3-3 Bbox-projection overlap

Rule: piece N's bounding box must overlap piece (N-1)'s bounding box projected on the perpendicular axis.

- M1: First placement. No prior placement, so no constraint. Question: "Where to start?"
- M2: Question: "Given prior bbox cols [c1..c2], my piece's rows must overlap [c1..c2]" — wait, this doesn't quite make sense dimensionally. The projection of bbox on the perpendicular axis returns a row-range or col-range. Constraint: piece N's bbox must overlap piece (N-1)'s ROW-range projected into COL-range? The rule is fuzzy.
- M3: ...

Verdict: Rule is geometrically muddled when stated precisely; player ends up with a routing problem that is constraint-subtraction (Pipeline-disease) without clear new-decision compensation. KILL.

### F6 — L3-7 Twin patterns A & B

Rule: two target patterns A and B (subsets of cells); every placement must contribute ≥1 cell to A AND ≥1 cell to B. Win = both patterns fully placed.

- M1: Question: "Which placement covers ≥1 A-cell AND ≥1 B-cell simultaneously? Of those, which leaves best future coverage?"
- M2: Question similar but A and B partially placed; remaining open cells of A and B are different.
- M3: Question similar.

Verdict: All three moves ask "find placement intersecting both A and B remaining cells, ideally efficiently." This is the SAME question repeated. KILL. (10th-play test fails: "find an A∩B-touching placement" repeats indefinitely.)

### F7 — L4-2 Lockout

Rule: target T must be filled exactly; any full row/column at any point = LOSE. Pre-fill ensures rows are *almost* full and player must avoid completing.

- M1: Question: "Place piece without completing any row or column. Of legal placements, which leaves max future flexibility (i.e., doesn't push any row/column to "1 cell from full" if I can avoid it)?"
- M2: Question: similar — but now constraints are tighter, and some rows are at 7/8.
- M3: Question: similar — forced into corners.

Verdict: "Don't complete a line, place piece" is the SAME question every move with diminishing slack. The structural aha is "you can never use line clears", which is a one-shot insight. After move 1, every move asks the same thing. KILL.

### F8 — L4-5 Perimeter

Rule: border 28 cells must end empty. Pre-fill on interior. Tray = pieces. Column-clear and row-clear can evict border cells via line-completion.

- M1: Question: "Can I avoid placing on border? Or, if I must place on border, can I use a clear later to evict it?"
- M2: Question: "Pre-fill in interior — to delete it, I need to complete an interior row, but completing a row requires filling cells in cols 0 and 7 (border), which means I'm placing border cells that need clear-eviction. Net? Compute interior-deletion-via-clear cost."
- M3: Question: "Do I prefer row-clears (evict 2 border cells per clear) vs avoiding clears entirely?"

Verdict: M1 is local placement, M2 is meta cost-benefit, M3 is policy. Materially different. KEEP.

### F9 — L5-3 Detonators

Rule: full lines do NOT auto-clear; they pile up. Player has K detonators (e.g., 3 for normal). Each detonator triggers ONE chosen full line to clear. If at any time 3+ full lines exist simultaneously and player has 0 detonators, LOSE.

- M1: Question: "Should I complete a full line now? Each completion is 'free' until I want to clear, but I have only K detonators."
- M2: Question: "I now have 2 full lines. Detonate one (which?), or push to 3 and detonate the highest-value one? Detonating wastes the cell count I deposited into a 'redundant' full line if I had alignment."
- M3: Question: "Detonator limit pressing. Which line do I value most?"

Verdict: M1 = "should I complete?" M2 = "detonate which?" M3 = "value comparison." Different facets. KEEP. Strong dual-purpose: line-completion is BOTH a goal (target alignment) and a liability (overflow loss).

### F10 — L5-5 Cut

Rule: K cut tokens. When placing, you may "cut" one cell from the piece (skip placing it). Pre-fill puzzle.

- M1: Question: "Can this placement only succeed with a cut? If so, do I spend? Or rotate / wait?"
- M2: Question: similar — cut count diminished.
- M3: Question: similar.

Verdict: Same question "is this cut worth a token?" repeated. The cut decision per move is just "yes/no spend on this piece", a binary on the same axis. 10th-play test FAILS — same question. KILL. (Note: "limited rotations" was in spec's lens 5 examples and would have similar Pipeline-flavor; cut is similar.)

### F11 — L8-3 Monolith

Rule: at all times after move 1, the union of placed cells (excluding pre-fill) must be a single 4-connected component. Clears can fragment. Tray as usual.

- M1: First placement seeds the monolith. Question: "Where to seed the monolith so future placements can extend it into the target shape?"
- M2: Question: "Must touch the existing monolith. Of legal piece+rotation+origin combos that touch, which advances the target?"
- M3: Question: "If I clear this row, will the monolith fragment? If yes, do I want to skip the clear or restructure first?"

Verdict: M1=seed, M2=extend-touching constraint, M3=clear-vs-fragment tradeoff. Materially different. KEEP. Strong dual-purpose: clears are BOTH wanted (delete pre-fill) and feared (fragment monolith).

### F12 — L8-7 Clear-to-blocker

Rule: clearing a row or column leaves PERMANENT blockers on the cells that were empty BEFORE the clear (the cells that the player just filled to complete the line) — wait, that doesn't make sense. Let me restate: clearing a line leaves blockers on a fixed subset, e.g., the cells that WERE pre-fill cells in that line. Hmm, that means clears no longer fully delete pre-fill — they only delete the player's placed cells, leaving the pre-fill as blockers.

Reformulated rule: "Clearing a row removes the player-placed cells in the row; pre-fill cells in that row become BLOCKER (sentinel) cells; blockers cannot be cleared again (they survive line clears)."

- M1: Question: "If I complete row 4 now, the 3 pre-fill cells in row 4 become blockers; the row's 5 player-placed cells go away. Net: 3 blockers added, 5 empty cells freed. Is the freed space worth the new blockers?"
- M2: Question: similar but with new blockers in the picture.
- M3: Question: similar.

Verdict: All three moves ask "is this clear's net-blocker cost worth the freed-cell benefit?" This is the same question repeated. KILL. The rule is *clear-as-stain*, but the player's decision per move converges to a single cost-benefit calculation. (Alternatively, if blockers seed in PLAYER-placed cells, the rule becomes too punitive — Scar-disease.)

---

## Stage 3 survivors (target was 3–6)

KEEPS:
- **F1 L1-4 Grain** — axis-asymmetric clear seeding
- **F2 L1-6 Lifeline** — clear-refills-only-when-empty timing
- **F4 L2-2 Vault** — only-double-clears-kill antagonist
- **F8 L4-5 Perimeter** — border-must-end-empty + clears-evict
- **F9 L5-3 Detonators** — full-lines-don't-auto-clear, finite detonators, overflow-lose
- **F11 L8-3 Monolith** — single-connected-component invariant

KILLS at Stage 3: F3, F5, F6, F7, F10, F12 (same-question repetition).

6 survivors → just within the target band. Proceed to Stage 4.
