# Pooled candidate registry (anonymous, shuffled)

Provenance has been stripped from every block: there are no references to source files, generator lenses, or registration order. The 64 candidates have been shuffled deterministically (by SHA-1 of the candidate name) and assigned anonymous IDs C01..C64 in the new shuffled order. Names that originally collided across sources have been disambiguated with roman-numeral suffixes (e.g. Tide-I, Echo-II) so each block has a unique identifier.

### Candidate: Cancer
> ID: C01


**Core rule (one sentence, mechanics-speak):** Some starting board cells are designated "infected" (sentinel color, counts as filled); after every placement, any empty cell that has ≥2 infected 4-neighbors becomes infected (single deterministic propagation pass per placement, computed all-at-once on the pre-pass snapshot to avoid order dependence); a row/column clear that includes infected cells erases them like normal cells; placing a piece cell directly onto an infected cell is illegal (infected cells are filled); round ends in win when no infected cells remain AND tray is empty, in loss when tray empties with infection alive or infection covers more than M cells.

**Antagonist:** Infected cells with a neighborhood-threshold growth rule (≥2 infected neighbors → infected).

**Dual-purpose mechanic:** Filling cells around infection. The player WANTS to fill the empty cells near infected cells (because every empty cell near 2+ infected neighbors is doomed to become infected on the next placement, and filling it pre-empts that conversion) but FEARS doing so (because their player-color cell can in turn raise the infected-neighbor count of OTHER empty cells, accelerating spread). A piece played wrong can convert a 1-neighbor empty cell into a 2-neighbor empty cell that's now doomed.

Wait — that's not right; the rule is ≥2 *infected* neighbors, not ≥2 filled. Let me restate the dual-purpose. The player WANTS row/column clears containing infection (they erase infection wholesale) but FEARS clears (because they re-empty cells, lowering neighborhood pressure that was about to limit further spread, or because the post-clear topology re-enables expansion fronts).

**New placement question introduced (versus Classic):** "Does the post-placement board have any empty cell with ≥2 infected neighbors that I just enabled, and does any clear my placement triggers create new such cells?" Classic doesn't ask threshold-neighborhood questions.

**Why order matters:** The propagation runs once per placement on the pre-pass snapshot. Two placements in different orders see the infection at different stages and trigger different conversions; chaining a clear-piece-then-block-piece is different from block-then-clear.

**Why negative space matters:** Empty cells adjacent to infection are the conversion surface. The player's negative-space distribution literally is the infection's growth surface; minimizing the count of empty cells with ≥2 infected neighbors is a direct objective.

**Solvability strategy (constructive proof — usually forward-simulation):** Seed infection with a controlled topology (a single connected blob of size 3–5, no cell with ≥2 already-infected neighbors that's also empty — i.e., the initial board has no "doomed" cells, the player creates the danger surface with their first move), forward-sim with infection propagation each turn, accept runs that end infection-free.

**Anti-pattern screen:**
- Mirror disease: pass — infection state evolves independently of placement choice (rule applies after).
- Breathe disease: pass — "no infection" is not implied by Classic rules; perfect Classic play loses.
- Pipeline disease: pass — nothing removed.
- Scar disease: pass — propagation is a public deterministic function of the current board (the player can compute "next-turn infected cells" by inspection).

**Estimated implementation complexity (S/M/L):** M. Sentinel INFECTED color, post-placement propagation pass, augmented forward-sim, UI hint highlighting "doomed next turn" cells (recommended).

**Immediate suspicion / risk:** With ≥2 threshold, infection is bursty — a single blob plus one bad piece creates a runaway. Tuning is delicate. Also if the propagation is too predictable (always blow up), it collapses to "memorize the safe placements", which is a puzzle, not a mode. The rule may need a tighter threshold (≥3 of 4) to make safe placements numerous enough.

---

### Candidate: Cipher
> ID: C02


**Core rule (one sentence, mechanics-speak):** Puzzle mode where the tray pieces' shapes are visible but their *rotations* are scrambled — each tray slot shows the piece's footprint cells in canonical orientation, but the actual placement-time orientation is randomly chosen at placement; the player's only control is a "lock rotation" toggle they can fire once total across the puzzle to fix an upcoming piece's orientation to their chosen rotation.

**Antagonist:** the rotation oracle — pieces whose shapes you know but whose orientations the system picks; the lock toggle is a single scarce override.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** the "place" action — wanted because it makes progress; feared because every place-without-lock surrenders rotation choice for that piece. Players who hoard the lock for the last piece may find earlier placements have foreclosed the only winning orientations.

**New placement question introduced (versus Classic):** "given a piece whose orientation will be randomised at place time but whose shape I know, which board origins admit ALL four rotations (orientation-robust placements) and which require a specific rotation (forcing me to spend the lock)?" Classic never asks "is this placement orientation-robust".

**Why order matters:** the lock is single-use; spending it on piece 2 vs. piece 5 is a planning decision tied to which piece's orientation is most likely to be the bottleneck given the board's evolving negative space.

**Why negative space matters:** orientation-robust placements require larger empty regions (a 1×4 piece needs both a 1×4 horizontal AND a 4×1 vertical hole at the same origin to be robust); the player therefore preserves cross-shaped empty pockets as "robust placement reserves".

**Solvability strategy (constructive proof — usually forward-simulation):** generator forward-sims with a fixed orientation per piece (the witness solution); records, for each tray slot, which orientation the witness used. The puzzle ships with the lock-target hint hidden. The puzzle is solvable because the player can use the lock on the piece whose witness orientation has the *fewest* orientation-robust alternatives, and then play the witness placements for the rest. Quality filter: at least one tray slot must have NO orientation-robust origin in the witness sequence (otherwise the lock is unnecessary and the mode collapses).

Wait — this fails Scar disease. The orientation is rolled at runtime. Reframe: the orientation sequence is statically determined at puzzle generation (a fixed orientation_for_piece_i array), revealed at place time but pre-computed. The player who plays optimally can deduce the orientation from a "rotation hint band" — e.g. each piece's orientation is encoded by the colour of its tray border (red = 0°, blue = 90°, etc.), and the player learns this mapping from the first placement; OR a single integer per piece is shown only when the piece is dragged. The hidden information must be statically determined and learnable.

Final rule (corrected): each piece has a statically-pre-assigned orientation revealed only when the player begins dragging the piece (not before); the lock toggle, if fired before the drag begins, lets the player pick the orientation instead of accepting the assigned one. Player who plays optimally schedules placements so that the assigned orientations all happen to fit.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — assigned orientations are independent generator data.
- Breathe disease (rule auto-implied by other rules): pass — orientation rule is independent of fit/clear rules.
- Pipeline disease (agency removed without comparable agency added): pass — loses free rotation, gains the scarce-lock budgeting game and the orientation-robustness placement consideration.
- Scar disease (random uncontrollable punishment): pass after the corrective reframe — orientations are static and revealed deterministically; an optimal player can plan around them.

**Estimated implementation complexity (S/M/L):** M — generator records orientations per slot; UI hides rotation until drag-start (existing `orientations()` enumerator usable for legality previews); single-use lock state in reducer.

**Immediate suspicion / risk:** "revealed at drag-start" means the player can drag, see the rotation, drop without committing, then re-plan — which destroys the information game. Need a commit rule (drag-start spends an attempt, or revealing once is a per-turn one-shot). The commit rule itself adds friction that may feel punitive.

---

### Candidate: Yoke
> ID: C03


**Core rule (one sentence, mechanics-speak):**
Two of the three tray slots are yoked: rotating piece in slot 1 also rotates piece in slot 2 by the same number of quarter-turns (orientation lockstep); slot 3 rotates independently.

**Antagonist:**
Inherited misalignment — the orientation that fits piece 1 into its pocket may rotate piece 2 into a shape that no longer fits anywhere on the current board.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):**
Rotation — needed to fit piece 1, feared because it warps piece 2.

**New placement question introduced (versus Classic):**
"Can I find a shared rotation count k such that piece 1 fits at some origin AND piece 2 also fits at some origin?" — orientation is no longer a per-piece free decision.

**Why order matters:**
Placing the yoked piece first locks the partner's orientation history; placing the free slot first to clear space for the partner changes which shared orientation is feasible.

**Why negative space matters:**
The empty space must accommodate both yoked pieces in *some* common rotation; pockets that would fit either piece individually but not in the same rotation are effectively dead.

**Solvability strategy (constructive proof — usually forward-simulation):**
For each tray sample, forward-simulate by picking shared rotations k ∈ {0,1,2,3} and origins jointly so both yoked pieces have ≥ 1 legal placement; reject seeds that admit no common rotation.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — rotating slot 1 forces slot 2's rotation, but the player still chooses origin for both independently and chooses which of slots 1/2 to place first; the rule restricts the orientation space without collapsing other decisions.
- Breathe disease (rule auto-implied by other rules): pass — Classic allows free per-piece rotation, so yoking is a genuine new constraint.
- Pipeline disease (agency removed without comparable agency added): pass — rotation agency is reduced (yoked) but a new compound decision is added (find a shared rotation that satisfies both).
- Scar disease (random uncontrollable punishment): pass — the yoke is fully visible (rotating one slot animates both) and deterministic.

**Estimated implementation complexity (S/M/L):**
S — reducer's `ROTATE_TRAY_PIECE` already fans out by mode; adding "if mode === 'yoke' and slot ∈ {0,1}, rotate both" is a small change.

**Immediate suspicion / risk:**
Yoking pieces of very different cell counts (monomino + pentomino) makes the yoke nearly free for the small piece, which dilutes the constraint; need pool tuning so yoked slots draw similar-cell-count pieces.

---

### Candidate: Tide-I
> ID: C04


**Core rule (one sentence, mechanics-speak):** After every placement, the entire board is shifted one cell in a direction announced on the tray piece just placed (each piece carries an arrow: ↑ ↓ ← →); cells shifted off the board are deleted, the new edge row/column is filled with empty, and a placement is legal iff the piece fits AND the post-placement-then-shift board has at least one valid move for the next tray piece.

**Antagonist:** The shift direction encoded on each piece — the player cannot place a piece without committing to its shift, which moves all existing fill (including pre-fill the player needs to preserve).

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The placement act itself, considered as "place + shift" — wanted because each placement also reshapes the board for free (you can shift a near-completed row into completion), feared because each placement evicts cells off the opposite edge.

**New placement question introduced (versus Classic):** "Which piece in the tray do I place next so that its arrow shifts the board in a way that completes a line OR aligns pre-fill with the next-piece target — and which placement origin makes that shift legal?" Direction is part of piece identity.

**Why order matters:** Each piece's arrow is fixed; the order of placement is the order of board shifts. A → followed by ← cancels, but only if no fill was lost off the right edge between them.

**Why negative space matters:** The leading edge in the shift direction must be empty enough to absorb the shift without losing target-relevant cells off the trailing edge. Empty cells on the trailing edge become the new buffer after shift.

**Solvability strategy (constructive proof — usually forward-simulation):** Generator picks tray with assigned arrows. Forward-sim: at each step, enumerate legal placements; for each, simulate place→shift, accept if next piece has at least one legal placement on the shifted board. Pick uniformly at random among such acceptable placements. Resulting board = target.

**Anti-pattern screen:**
- Mirror disease: pass — shift direction is a property of the piece, not derived from the placement; shift is a separate side-effect, not an auto-mirror.
- Breathe disease: pass — win = target match; shift rule is the antagonist, not an auto-satisfied auxiliary.
- Pipeline disease: pass — adds the shift-direction agency dimension on top of placement.
- Scar disease: pass — every shift outcome is deterministic; arrows visible on tray.

**Estimated implementation complexity (S/M/L):** M-L — shift function is straightforward, but tray pieces gain a per-piece arrow attribute and matching UI, generator's "next piece must remain placeable" filter may explode the search space.

**Immediate suspicion / risk:** Shift can break the target halfway through a partial solution if the player commits to the wrong arrow piece — recovering may require placing pieces purely to use up unwanted arrows, which can feel like Pipeline disease in practice (the piece's arrow forces a specific side-effect). Watch carefully.

---

### Candidate: Ledger
> ID: C05


**Core rule (one sentence, mechanics-speak):** A row at the top of the board is the "debt ledger": it has 8 small integer slots (visible above the play area) initialized to specific positive values; after every placement, each non-empty cell on the BOARD column c contributes +1 toward paying down debt slot c, but only if that cell is in the bottom 7 rows AND the cell at (top-row, c) is empty (i.e., the column has a "vent" at the top); when a debt slot reaches 0 it is "paid"; the round ends in win when ALL 8 debt slots are paid AND tray is empty, in loss when tray empties with debt alive OR a debt slot's value is exceeded by some explicit overflow rule (configurable; the simplest: no loss-by-overflow, just no progress).

**Antagonist:** The debt ledger. Eight independent counters that must be driven to zero, each gated by both column fill (positive) and column-top occupancy (negative — a top-occupied column contributes nothing, even if it has fill below).

**Dual-purpose mechanic:** Filling the top row. The player WANTS the top row empty (so columns can pay down debt) but FEARS leaving it empty (because the top row is needed for line clears, and clears destroy the column fill that was paying debt). A clear that removes a row including paying cells RESETS that column's contribution.

**New placement question introduced (versus Classic):** "Does this placement increase column-c contribution toward debt-slot-c, or does it cover the top-row vent and stop contribution?" Classic asks about lines, not column-by-column debt.

**Why order matters:** Each placement counts column contributions for that turn. A placement that fills column 3 from row 7 up to row 4 contributes 4 toward debt-3 immediately; a clear next turn that wipes those cells resets contribution. Order of placements determines whether contributions accumulate or are wiped.

**Why negative space matters:** The top-row vent column-by-column is exactly negative space. Where you leave row 0 empty controls which columns can pay. The player must keep the right columns vented while filling them.

**Solvability strategy (constructive proof — usually forward-simulation):** Pick debt vector summing to S; sample tray with total cells ≥ S + buffer; forward-sim picking placements that increase any unpaid column's contribution while keeping that column's row-0 cell empty; accept runs whose final debt vector is 0.

**Anti-pattern screen:**
- Mirror disease: pass — debt is separate state.
- Breathe disease: pass — debt-to-zero is not implied by other rules.
- Pipeline disease: pass — nothing removed.
- Scar disease: pass — fully deterministic; player can compute next-turn debt from board.

**Estimated implementation complexity (S/M/L):** M. New UI strip above the board with 8 numeric slots, per-placement contribution count, augmented win check. No new sentinel color needed.

**Immediate suspicion / risk:** This is borderline — it might smell like a layered scoring rule (counters above the board) instead of a true antagonist. The defense is that the ledger's "stop-paying-when-vent-covered" rule means the antagonist actively undoes the player's progress when they cover a vent (i.e., it's not just additive scoring). Still: the parent reviewer may flag this as scoring-with-extra-steps rather than a real antagonist. Include for honesty about the borderline.

---

### Candidate: Tide-V
> ID: C06


**Core rule (one sentence, mechanics-speak):** The 3-slot tray refills only when *all three slots are full* (rather than all empty); after refilling, none of the new pieces can be placed until the player consumes one — which requires the tray to be empty in that slot, but the only way to free a slot is to place from it... so refill triggers a one-shot "tide" event that swaps all three slot pieces with three new pieces, with the constraint that the player must place from one of the OLD slots before the swap, otherwise the swap is forced (and a player-skipped swap costs score / locks out a slot).

Reformulated for clarity: tray slots regenerate one-at-a-time after a placement (so consuming a slot frees that slot for a new piece on the *next* placement); but the tray must ALSO contain at least one piece that has been "in tray" for ≥ 3 placements — pieces that linger too long *evaporate* and the slot they occupied becomes WALL for the rest of the round.

**Antagonist:** Slot-age. Every piece in the tray has an age counter; pieces that aren't placed within 3 turns evaporate, and their tray slot turns into a permanently empty (zero-piece) slot — the tray shrinks.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Slot occupancy. A full tray is good (more options) but every piece in it is aging and will evaporate if held too long; an empty slot avoids aging but reduces options. Player wants pieces (more choices) and fears them (forced evaporation pressure).

**New placement question introduced (versus Classic):** "Which piece is about to evaporate, and is its placement still useful?" — the player must rank tray pieces by both age and board-fit, sometimes placing a sub-optimal piece purely to prevent evaporation.

**Why order matters:** Each placement advances all unconsumed-slot ages by 1. Order determines which pieces get placed before evaporation, which means later pieces face a different tray landscape than they would have under a different early ordering.

**Why negative space matters:** Evaporated slots leave permanent holes (in the tray, not the board) — and those gone-pieces never contribute to clears, so the board fills faster relative to a never-evaporating run. Indirectly, on-board negative space (room to place future pieces) becomes precious because tray attrition reduces piece supply.

**Solvability strategy (constructive proof — usually forward-simulation):** For the score-attack variant, no win condition needs a constructive proof — playability is by induction (initial tray has at least one placeable piece on an empty board, evaporation can't occur on turn 1). For a puzzle variant, forward-sim places pieces with attention to the age clock: at each step prefer placements from oldest slots (or place any slot, advance ages, evaporate at zero). End-state is target pattern; proof is the recorded simulation.

**Anti-pattern screen:**
- Mirror disease: pass — placement decision is unmodified; the new constraint (age) is on a separate axis.
- Breathe disease: pass — age tracking and evaporation isn't implied by anything else; remove it, you have Classic.
- Pipeline disease: this is the borderline test. Pipeline removes slot agency by forcing round-robin order. Tide *adds* a new piece-priority axis (age) but the player still freely picks which slot to play from each turn. The choice space isn't shrunk; it's enriched with a new variable. Pass — but watch implementation carefully: if "evaporation" is too punishing, the player effectively must always place from the oldest slot, which is Pipeline.
- Scar disease: pass — evaporation is fully deterministic (age counter, threshold) and visible to the player from turn 0 of each piece's life.

**Estimated implementation complexity (S/M/L):** M — needs per-slot age counters in `GameState`, an age-tick on placement, an evaporation effect (slot becomes None permanently or for K turns), a UI affordance showing piece ages (a small number badge or a fading color).

**Immediate suspicion / risk:** Pipeline-disease borderline. If evaporation pressure dominates, players default to "always play oldest" and the new agency collapses. Mitigation: tune the threshold so the player has 2-piece choices most turns (e.g. only the oldest is critical, the other two have time). Also: piece evaporation is a punishment for non-action, which reads as anti-fun unless the *evaporated slot* gets repurposed (e.g. that slot becomes a future bonus). Without that reframe, this risks feeling like a stress mechanic.

---

### Candidate: Ferris
> ID: C07


**Core rule (one sentence, mechanics-speak):** When a row clears, every row strictly above it shifts DOWN by one (filling the cleared row's cells with whatever was above), AND the topmost row becomes empty; symmetrically, when a column clears, columns to its left shift right by one and the leftmost column becomes empty. This replaces the standard "cleared row becomes empty in place" rule.

**Antagonist:** Slab compaction. The board state after a clear depends on what was above the cleared row; a clear that moves a half-formed row from y=3 down to y=4 changes which other partial lines you've been tracking.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The post-clear shift. Wanted: clears compact your work toward the bottom-right where you can build dense stacks. Feared: clears destroy your geometry — a partial line at row 2 is now at row 3 and the empty cells you'd planned to use as a piece-landing zone are now elsewhere.

**New placement question introduced (versus Classic):** "After this clear, where will my other partial lines be?" — every clear is a coordinate transform on every other unfinished structure.

**Why order matters:** Clearing row 5 then row 2 is not the same as clearing row 2 then row 5 — the second clear's geometry depends on what the first clear shifted into row positions in the meantime.

**Why negative space matters:** Empty cells in upper rows become the cells that fill in below after a clear; choosing to leave a strategic hole in row 1 means after a row-3 clear, that hole is now in row 2 and is playable.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim: place piece, detect clears, apply shift-down (rows above cleared row drop, top becomes empty) instead of clear-in-place. Snapshot after final placement. Provably solvable.

**Anti-pattern screen:**
- Mirror disease: pass — the shift is a function of which row cleared, which is a derived board property, not a copy of the player's last placement choice.
- Breathe disease: pass — Drop mode already does row-slab collapse but for a *different* trigger (Tetris-style fall-from-top); here the trigger is line-clear plus rule applies to columns too. New predicate, new geometry.
- Pipeline disease: pass — agency unchanged.
- Scar disease: pass — the shift is mechanically deterministic given the clear; player picks the clear.

**Estimated implementation complexity (S/M/L):** M — needs a slab-shift function for both row and column clears; the column case is the new bit (Drop only handles rows).

**Immediate suspicion / risk:** Borderline — overlaps conceptually with Drop and Gravity. Distinguishing it: Drop only shifts on placement, Gravity only on clear-of-rows-with-cell-fall, Ferris shifts on clear with whole-row/column slab translate. Risk: "feels like Gravity with extra steps" if not visually distinct.

---

### Candidate: Crust
> ID: C08


**Core rule (one sentence, mechanics-speak):** A subset of starting board cells are designated "crusted" (sentinel color, counts as filled, can be cleared by lines but immediately re-crusts on every other adjacent empty cell of its 4-neighborhood the *next* time a line clear happens elsewhere on the board); each crust cell is annotated with a "crack count" (visible integer 1..3); a row or column clear that includes a crust cell decrements its crack count by 1 and re-crusts only if the count is still > 0 after the decrement; when a crust cell's count reaches 0 it is permanently removed; round ends in win when crack counts on all crust cells are 0 AND tray is empty.

**Antagonist:** Crust cells with crack counters. They re-grow on adjacent empty cells unless they've been chipped to 0.

**Dual-purpose mechanic:** Adjacency. The player WANTS to place pieces adjacent to crust (because including a crust cell in a clear chips it) but FEARS adjacency too (because an alive crust will re-crust onto its empty 4-neighbors after the next OTHER clear, contaminating the area you just cleared).

**New placement question introduced (versus Classic):** "Of the legal placements that complete a line containing a crust cell, which one minimizes the empty 4-neighbors of all OTHER live crust cells (so the regrowth pass after this clear contaminates as few cells as possible)?" Classic asks neither about cell-bound counters nor about regrowth surface area.

**Why order matters:** A crust at count 1 chipped early disappears; the same crust chipped after another crust regrows means the board has an extra live cell. The order in which you chip determines the regrowth interactions across consecutive clears.

**Why negative space matters:** Empty cells adjacent to a live crust ARE the regrowth surface. The shape of the empty halo around live crust dictates the cost of triggering any clear; a player's negative-space layout is literally how much garbage the next clear creates.

**Solvability strategy (constructive proof — usually forward-simulation):** Pick a crust pattern with counts in {1,2,3}, sample tray, forward-sim selecting placements that include at least one crust cell in a clear when possible, apply chip-and-regrow rule, accept runs where final crust-count-sum is 0.

**Anti-pattern screen:**
- Mirror disease: pass — crust state evolves independently from the player's placement choice.
- Breathe disease: pass — the chip-to-zero win condition is independent of any other rule; you can play Classic-legal and never chip a crust.
- Pipeline disease: pass — nothing removed; new agency (which crust to chip in what order, where to leave empty cells around live crust) added.
- Scar disease: pass — regrowth is a deterministic function of the chipped-crust's 4-neighborhood at clear time. The player sees who will regrow and where, before committing.

**Estimated implementation complexity (S/M/L):** M. Sentinel CRUST color with a per-cell counter (so cell value goes from string to maybe a typed object — small refactor, or encode counter in CSS/data attribute), regrowth pass on every clear, generator augments forward-sim with crust accounting.

**Immediate suspicion / risk:** Cell-with-state breaks the "BoardCell = string | null" assumption and is a real plumbing tax. Also the regrowth-only-on-OTHER-clears wording is finicky — if regrowth fires immediately on the same clear that chipped, it loops. Needs careful semantics.

---

### Candidate: Pre-clears
> ID: C09


**Core rule (one sentence, mechanics-speak):** Puzzle-style finite-tray round on a heavily pre-filled board where the player owns K (3/4/5) "pre-clear" tokens, each of which manually clears one chosen full-or-not row or column (overrides the standard "must be full" rule), and the win condition is matching the target pattern after the tray is exhausted.

**Antagonist:** A pre-fill density too high for the tray to actually complete any row/column for clearing via standard rules — without pre-clear tokens, pieces would have nowhere to go after the first 2 placements.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Row/col clearing — the player wants to clear pre-fill, but every pre-clear erases pre-fill cells AND any player cells in that line, including pieces just placed for scoring or scaffolding.

**New placement question introduced (versus Classic):** "Do I place this piece to occupy a row I plan to pre-clear (the placement will be erased — wasted footprint, but maybe it scores or completes a setup along another axis) or in a row I plan to keep (placement is permanent)?"

**Why order matters:** Pre-clear before placement vs. after changes whether the placement survives. Pre-clears across the tray order create dependency chains: clearing row 3 first opens space for piece 4, which when placed bridges row 5, enabling pre-clear of row 5 to land cleanly.

**Why negative space matters:** A pre-clear cleans an entire row/column — the empty cells *outside* that line are unaffected, so deciding which line to pre-clear is identical to deciding which empty cells to keep as future placement landing zones.

**Solvability strategy (constructive proof — usually forward-simulation):** Generator runs forward-sim with K pre-clears interleaved into the placement sequence; at each step it either places (random legal) or pre-clears (random row/col with at least 1 pre-fill cell). The trace is the proof. Quality filter: at least floor(K/2) pre-clears must land on lines containing at least 1 pre-fill cell (so they're meaningful, not no-ops).

**Anti-pattern screen:**
- Mirror disease: pass — pre-clear target (a row or column index) is a separate decision from placement origin.
- Breathe disease: pass — without pre-clears the puzzles are unsolvable, so the new rule is load-bearing.
- Pipeline disease: pass — adds a discrete action category, not removes one.
- Scar disease: pass — token count and target line are player-chosen; no RNG.

**Estimated implementation complexity (S/M/L):** M — token counter in GameState, "pre-clear mode" UI gesture (tap a row gutter / column gutter), a generator variant that interleaves pre-clear ops, and a `clearLines` call already exists in `board.ts`. Win-check is `boardMatchesTarget`.

**Immediate suspicion / risk:** Pre-clearing an empty row is a no-op the UI must disable, otherwise players waste tokens unintentionally. Also: pre-clear is so powerful that puzzles risk having too many viable solutions, undermining the "specific target" pressure. May need target tightness filter (≥ 18 cells on Normal).

---

### Candidate: Diagonal Lines
> ID: C10


**Core rule (one sentence, mechanics-speak):** Line-clears trigger on completed *diagonals* (both 8-cell main and anti-diagonals of the 8×8 board) instead of rows and columns; placement adjacency for piece geometry remains orthogonal.

**Antagonist:** The diagonal axis. Pieces are rectilinear polyominoes (horizontal/vertical adjacency); the cleared lines are diagonal (no piece is itself diagonal). Filling a diagonal requires committing across multiple unrelated rows.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Diagonal coverage. A piece that lays cells in many distinct diagonals (e.g. a 1×4 bar covers 4 distinct diagonals) is good for *partially* progressing many lines but bad for completing any (each contributes only 1 cell to 4 lines, none completed). A piece that lays cells along a single diagonal (e.g. a Z-piece) might complete one line but contributes nothing to others. Player wants spread (progress) and concentration (clears) at the same time.

**New placement question introduced (versus Classic):** "Which diagonals does this footprint hit, and which do I want to advance?" — the player tracks diagonal-coverage counts (16 diagonals total: 8 main + 8 anti, where the 4-cell-and-below corner diagonals are excluded as too short) instead of row/col fill counts.

**Why order matters:** The coupling between cells in a diagonal is non-local — cell (0, 7) and cell (7, 0) share an anti-diagonal but no piece can cover both directly. Completing a diagonal requires committing cells across many turns; each placement permanently advances or fails to advance specific diagonals.

**Why negative space matters:** Empty cells along a target diagonal block its completion. Negative space patterning *along diagonals* (not along rows/cols) is the relevant geometric question. Placements that leave anti-diagonal gaps prevent later anti-diagonal clears even if rows look fine.

**Solvability strategy (constructive proof — usually forward-simulation):** Same `simulateForward` template, but `detectCompletedLines` returns diagonals instead of rows/cols. Forward-sim is identical otherwise; the proof is the simulation. For score-attack variant, just play indefinitely with diagonal clears refilling the board space.

**Anti-pattern screen:**
- Mirror disease: pass — placement decision is single (footprint origin); the clear axis is rotated, not doubled.
- Breathe disease: pass — diagonal clearing isn't implied by orthogonal placement; the rule replaces a primitive.
- Pipeline disease: pass — adds the diagonal-tracking placement question; doesn't remove the slot agency.
- Scar disease: pass — clears are deterministic results of player placements.

**Estimated implementation complexity (S/M/L):** S — replace `detectCompletedLines` with a diagonal scanner; replace `clearLines` with a diagonal-eraser. Two new geometry functions, no new state, no new sentinel colors. The shorter corner diagonals (1, 2, 3 cells long) can either be excluded entirely or counted (an excluded set lets only the 8 long diagonals matter).

**Immediate suspicion / risk:** Risk that diagonals are *too hard* to complete with rectilinear pieces, so clearing essentially never happens and the mode plays like Classic-without-clears (board fills, you lose). Tuning may require allowing both main- and anti- 7- and 8-cell diagonals to count, or seeding pre-fill along diagonals to make them reachable. Also: visually communicating "diagonal will-clear" needs a new flash style, can't reuse the row/col stripe.

---

### Candidate: Erasures
> ID: C11


**Core rule (one sentence, mechanics-speak):** A puzzle-style finite-tray round on a pre-filled board where the player owns K (3 on Easy, 5 on Normal, 7 on Hard) "erase" tokens, each of which deletes a single contiguous 4-connected component of player-placed cells (NOT pre-fill, NOT the target overlay) from the board on demand, and the win condition is matching the standard target pattern after the tray is exhausted.

**Antagonist:** A pre-fill scatter that is positioned so the *only* forward-sim solutions require placing pieces that overhang the target, then erasing the overhang before final win-check; the player must locate which placements are "scaffolding" vs. "permanent."

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The placed component itself — the player wants big connected components to chain into row clears, but each connected component is also an atomic erase unit, so an oversized blob erases too much when the token is finally spent.

**New placement question introduced (versus Classic):** "Should this piece be placed adjacent to my existing component (cheap to erase together later, but locks them into a single-token destiny) or as an island (independent erase target, but wastes adjacency for clears)?"

**Why order matters:** Erasing must happen between placements to free cells for subsequent pieces. The choice of *when* to spend an erase token reshuffles the legal placements for every later piece in the tray, so swapping any two placements (or swapping the erase-spend point) changes the reachable end states.

**Why negative space matters:** The erase only deletes player cells, so any hole the player leaves now is a hole that survives the round; pre-fill that wasn't covered must be cleared via row/col completion (no token shortcut). Negative space dictates which row clears are still reachable mid-game.

**Solvability strategy (constructive proof — usually forward-simulation):** Generator runs forward-sim on a pre-filled board with a tray of size N + 2K (each token "consumes" 2 placements in expectation: one to scaffold, one to fill the gap). After each kth placement, with some probability it inserts a synthetic erase op that deletes the most-recently-placed component before continuing. Snapshot final board as target. The trace proves a (placement-sequence, erase-schedule) pair exists.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — the erase is a separate action with its own (which component, when) decision; not implied by where you placed.
- Breathe disease (rule auto-implied by other rules): pass — the K cap is the constraint; without it the puzzle would be near-trivially solvable by spamming placement-and-undo, so the cap creates the pressure rather than the target shape doing it.
- Pipeline disease (agency removed without comparable agency added): pass — adds an action category (erase) instead of removing one.
- Scar disease (random uncontrollable punishment): pass — token count and erase target are 100% player-controlled; no RNG between rounds.

**Estimated implementation complexity (S/M/L):** M — needs a token counter in `GameState`, an "erase mode" UI affordance (tap component to erase), a connected-component finder (already have `monolithComponentCount` shape), and a generator variant of `puzzleGenerator` that interleaves erase ops in the forward-sim. Win-check is unchanged.

**Immediate suspicion / risk:** Players might solve every puzzle by using all K tokens at the end as a "free undo" rather than as planning currency. Mitigation: the tray is finite, so spending a token to undo a piece doesn't restore the piece — you've lost both the piece AND the token, which only helps if the placement was actively wrong (i.e. blocked something). Need to verify generation reliably produces puzzles where pre-erase placements are forced.

---

### Candidate: Bloom
> ID: C12


**Core rule (one sentence, mechanics-speak):** Designated "spore" cells (sentinel color) advance one step per placement by converting one orthogonally-adjacent empty cell to a new spore on a deterministic schedule (lowest-index unfilled neighbor in reading order); placing a piece cell into a spore overwrites it (spore destroyed); a row/column clear that includes spore cells erases them; round ends in loss when an attempted spore step has no empty neighbor available AND the spore count exceeds a threshold, or in win when all spores have been destroyed and the tray is empty.

**Antagonist:** Spore cells. They occupy board cells, count as filled for line-clear detection, and they expand by one cell per placement turn on a fully predictable schedule (the player can read the next conversion).

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The line clear. The player wants clears because clears delete spores wholesale; the player fears clears because spores count toward "filled" and so spores can be steered into completing a line you didn't intend to clear (eating a piece footprint you needed) or, conversely, prevent a line from completing because the spore is somewhere else.

**New placement question introduced (versus Classic):** "Does this placement either (a) physically overwrite the next spore cell that's about to bloom, or (b) plug the cell that the spore would have advanced into, or (c) complete a line containing one or more spores?" None of those questions exist in Classic.

**Why order matters:** The spore advances on every placement, so the order of pieces determines which empty cell is "next" and therefore which placements still capture vs. miss. Placing a small piece first to overwrite a spore root vs. placing a big piece first to cap the spore's growth direction yields different boards two turns later.

**Why negative space matters:** The spore growth schedule reads empty cells in a fixed neighbor order, so leaving cells empty around a spore literally feeds it. Pre-emptively filling the cell the spore would advance into (without overwriting the spore itself) is a legitimate and distinct strategy from killing the spore — the player's empty-cell layout choices directly steer growth direction.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim variant: seed N spore cells, sample a tray, walk the tray; at each step run the spore advancement first, then enumerate legal placements that either (a) overwrite some spore, (b) cap a spore's next neighbor, or (c) complete a line containing ≥1 spore — pick uniformly at random among the union; iterate. A run is "valid" iff after walking the entire tray, total spore cells == 0. Reject runs that don't terminate spore-free; the surviving run IS the solution.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — the spore-advancement schedule is a *new* state element on the board, not a function of the player's placement decision. The player chooses where to place; the spore then advances on a rule the player did not pick.
- Breathe disease (rule auto-implied by other rules): pass — the win condition (zero spores) is not implied by Classic's "place pieces / clear lines" rules; you can play perfectly Classic-legal placements and still leave spores alive at tray-end.
- Pipeline disease (agency removed without comparable agency added): pass — nothing is taken away (full tray, free placement choice). The new agency added is *which* spore to attack and *how* (overwrite vs. cap vs. clear).
- Scar disease (random uncontrollable punishment): pass — spore advancement is fully deterministic from board state. The player can read and plan around the next conversion.

**Estimated implementation complexity (S/M/L):** M. Needs a sentinel SPORE color, a per-placement advancement step in the reducer (after placement, before next-piece), a generator that seeds spores and runs the augmented forward-sim, and a status indicator for "next spore growth target" (could just be an outline on the doomed empty cell).

**Immediate suspicion / risk:** The "lowest-index unfilled neighbor in reading order" rule is mechanical but feels arbitrary; players may not internalize the schedule and treat it as random — collapsing into Scar in practice. Mitigation: visibly outline the cell that the next spore advancement will hit on the current board, so the rule is read off the screen, not computed in the head.

---

### Candidate: Echo-III
> ID: C13


**Core rule (one sentence, mechanics-speak):** Puzzle mode with a hidden target — the player is shown only the per-row and per-column filled-cell counts of the target (two 8-vectors of integers 0..8 displayed beside the board), and must end with the board's row/column counts AND occupancy matching the unique target consistent with those projections.

**Antagonist:** the unseen target pattern — a fixed boolean[8][8] generated by forward-simulation, whose shape the player must reconstruct from 16 marginal numbers plus piece-fit feedback.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** placing a piece — every placement is both progress (cells fill toward target counts) and a probe (after placement, the per-row/per-column delta from target is shown, so a wrong placement reveals "you are now over count in row 4 by 2"). Wanted because it generates information; feared because it spends a finite tray slot on a hypothesis that may be wrong.

**New placement question introduced (versus Classic):** "given the row counts (3,1,5,0,...) and column counts, which target cells are forced, which are ambiguous, and where should I place this T-pentomino so that the remaining ambiguity is resolvable by the pieces I have left?" Classic never asks the player to reconstruct a hidden bitmap from 1-D projections.

**Why order matters:** revealing information early (placing a piece into a high-count column first to confirm/deny which rows in that column are filled) constrains later placements; placing the same piece last gives no information for replanning. The marginals also interact with line clears: clearing a row mid-puzzle changes the achievable count in adjacent columns by the cleared cells, so when you choose to clear matters.

**Why negative space matters:** the row/col counts directly encode negative space — a row with count 2 means 6 cells must end empty; the player must reason about which 6 to leave alone. Pieces placed in must-be-empty cells over-count and require a clear to undo.

**Solvability strategy (constructive proof — usually forward-simulation):** generator runs the standard puzzleGenerator forward sim to produce a target board, then publishes only `rowCounts[8]` and `colCounts[8]` as the visible target. Win check is `boardMatchesTarget(board, hiddenTarget)`. Solvability is inherited from forward-sim. Quality filter: reject any (target, tray) where a second board with the same row/col counts is also reachable by some permutation of the tray — guarantees the marginals plus piece set uniquely identify the target (deduction is well-posed, not a guess).

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — the hidden target is independent data, not derived from the player's placements.
- Breathe disease (rule auto-implied by other rules): pass — `boardMatchesTarget` is strictly stronger than matching the marginals; many boards match the marginals without matching the target, so the marginal display doesn't make the target check redundant.
- Pipeline disease (agency removed without comparable agency added): pass — Puzzle mode loses the visible target picture but gains a deduction game (which cells are forced by the marginals + piece set) plus an information-revealing placement choice.
- Scar disease (random uncontrollable punishment): pass — the target is fixed at generation time; an optimal player has full signal (marginals + piece geometry uniquely determine the target by the quality filter).

**Estimated implementation complexity (S/M/L):** M — reuses puzzleGenerator + boardMatchesTarget; new UI for two count strips and a delta indicator; new uniqueness filter in the generator (could be expensive — needs a bounded BFS over tray permutations).

**Immediate suspicion / risk:** the uniqueness filter may reject most generator candidates, making the build loop slow; if relaxed, players can hit "two solutions both consistent with marginals" cases and feel cheated.

---

### Candidate: Decay
> ID: C14


**Core rule (one sentence, mechanics-speak):** Every placed cell carries an integer "age" set to 0 when placed and incremented after each subsequent placement; a row or column clears only when all of its filled cells have age ≥ 3 (rows of all-fresh cells stay full but don't clear). Aged cells render with progressively darker tint.

**Antagonist:** Time-to-ripen. A bar completed in one shot doesn't clear — its cells are all age 0 — so the player must complete a line three turns ahead and then leave it standing while doing other work.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Cell ageing. Wanted: cells you want to clear must be old. Feared: a row you fill quickly stays on the board for at least 3 placements, eating valuable space and forcing other placements onto a cluttered board.

**New placement question introduced (versus Classic):** "What is the minimum-age cell in the line I'm about to complete?" — completing a line is necessary but not sufficient; completing it with all-old cells is the actual win condition.

**Why order matters:** A piece placed early ages while later placements happen, so the optimal sequence places "future clear-trigger" cells late and "future cleared" cells early. Reversing two placements changes which cells are age-3 by turn T.

**Why negative space matters:** Empty cells you leave inside an aged-but-incomplete row are "ripe slots waiting" — they become high-value real estate because the next piece dropped into them completes a clear immediately. Where you leave gaps inside maturing rows is the core optimization.

**Solvability strategy (constructive proof — usually forward-simulation):** Generator forward-sims: place piece, increment all existing-cell ages, then check & clear lines under the age ≥ 3 predicate. Snapshot final board as target. Solvability is preserved because the sim itself is a valid play.

**Anti-pattern screen:**
- Mirror disease: pass — age is a function of turn number, not last move.
- Breathe disease: pass — line-clear-with-age is a strictly different predicate than line-clear; not implied.
- Pipeline disease: pass — placement choice unchanged.
- Scar disease: pass — ages are visible (tint), schedule is +1 per turn, fully predictable.

**Estimated implementation complexity (S/M/L):** M — store age per cell (an int matrix), bump on every placement, clear predicate becomes "row full AND every cell age ≥ 3."

**Immediate suspicion / risk:** "Filled rows that don't clear" is a teaching problem — the player will fill a row, see no clear, and assume bug. Needs strong UI signal (cell-age tint, plus a "ripening" badge on rows that are full-but-young).

---

### Candidate: Stamps
> ID: C15


**Core rule (one sentence, mechanics-speak):** Puzzle-style finite-tray round where the player owns K (2/3/4) "stamp" tokens, each of which converts a single chosen player-placed cell on the board into a permanent INDESTRUCTIBLE marker (immune to row/col clears thereafter, like a wall), and the win condition is matching a target pattern that *includes* exactly K stamp positions marked in a special color overlay.

**Antagonist:** The target overlay's stamp positions — they are not placed by pieces alone (line clears would erase them), so the player must place a piece on each stamp position, then stamp it before any clear erases it.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Row/col clears — wanted to remove pre-fill scaffolding, feared because they erase any unstamped player cell on a target stamp position, forcing re-placement and re-stamping.

**New placement question introduced (versus Classic):** "Do I stamp this cell now (cheap, but commits the token to a position I'm not sure is final) or wait for the right placement and stamp later (risk: I might not have a piece that lands on the stamp position again)?"

**Why order matters:** Stamps must occur after the cell is filled and before any clear that would empty it. The sequence (place, place, clear, place, stamp) gives a different result than (place, place, stamp, clear, place) because in the latter the stamp survives the clear and the cell stays filled into the next placement, blocking a footprint.

**Why negative space matters:** Stamped cells are permanent obstacles for subsequent placements (just like walls). Choosing where to stamp is choosing where the board's negative-space topology becomes static.

**Solvability strategy (constructive proof — usually forward-simulation):** Generator runs forward-sim with stamp ops scheduled at K specific points in the placement sequence (chosen so each stamp lands on a cell that the subsequent simulation never wants to clear). Target = final occupancy + flagged stamp positions. Trace is the proof.

**Anti-pattern screen:**
- Mirror disease: pass — stamp-target is a free choice independent of placement origin.
- Breathe disease: pass — without stamps, the K stamp positions in the target couldn't survive the clears the puzzle requires; the rule is load-bearing.
- Pipeline disease: pass — adds an action.
- Scar disease: pass — stamps are 100% player-chosen.

**Estimated implementation complexity (S/M/L):** M — token counter, "stamp mode" UI (tap a player-placed cell), new sentinel color for stamps (reuse wall color logic from Quarantine for the indestructibility), generator variant interleaving stamp ops, win-check extends `boardMatchesTarget` with a stamp-position match.

**Immediate suspicion / risk:** Stamps as indestructible cells are mechanically identical to walls; the mode risks feeling like "Quarantine where you place the walls." Differentiator: walls in Quarantine pre-partition the board topology before play; stamps in this mode emerge mid-play, so the planning question is *when* to stamp, not *where* the partition is. Need to ensure UI makes that distinction crisp.

---

### Candidate: Hot Frame
> ID: C16


**Core rule (one sentence, mechanics-speak):** A 3×3 "hot frame" rectangle is overlaid on the board; cells inside the frame count as filled when checking row/column completion (i.e. they always satisfy the line-clear predicate as if they held a phantom block), and the frame translates one cell to the right each placement, wrapping at column boundaries and stepping down one row when wrapping.

**Antagonist:** The frame's path. The frame guarantees three "free" cells per row it overlaps, which means a row already filled in the other 5 cells will clear the moment the frame lands on it — the player must time placements so a desired row's gap aligns with the frame on the right turn, while preventing rows the player doesn't want cleared from getting completed at frame-arrival time.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The phantom-fill of frame cells. Wanted: it lets you "complete" a row by filling only 5 cells. Feared: it auto-completes any row already at 5 cells when the frame slides over it, possibly clearing a row you were saving for a multi-clear stack.

**New placement question introduced (versus Classic):** "Which line completions am I queuing for the frame to trigger N turns from now?"

**Why order matters:** Frame position at turn T is a function of T; the same physical board state at T=2 vs T=5 has the frame in different places, so placement evaluation depends on placement index.

**Why negative space matters:** Cells inside the frame are "negative space that counts as positive" — the player must choose where to leave gaps in rows the frame will cross, because those gaps are auto-filled by the frame and become clear-triggers.

**Solvability strategy (constructive proof — usually forward-simulation):** Generator: at each tray step, enumerate placements legal under the standard rule (frame cells are visually-occupied but legally empty for placement — pieces can drop into frame cells fine), apply the placement, then run line-detection treating the *current* frame cells as filled, clear the resulting rows/cols, then advance the frame one cell. Snapshot the final post-clear board as target.

**Anti-pattern screen:**
- Mirror disease: pass — frame movement is independent of which placement was chosen.
- Breathe disease: pass — the frame mechanic introduces a new line-completion path, not an extra constraint on top of existing ones.
- Pipeline disease: pass — placement choice space is unchanged; new planning dimension is added.
- Scar disease: pass — frame's schedule is fully visible and deterministic.

**Estimated implementation complexity (S/M/L):** M — frame state is an (r, c) pair, line-detection forks on whether (r, c) is inside the frame, frame advance after each placement.

**Immediate suspicion / risk:** Cells inside the frame "look full but accept pieces" is visually confusing. May need a stripe/hatch overlay that makes "frame cell" obviously different from "real filled cell."

---

### Candidate: Toll
> ID: C17


**Core rule (one sentence, mechanics-speak):** The board's 8 columns each show a numeric TOLL above them (0..3); placing a piece whose footprint touches column c spends `toll[c]` "credits" from a global CREDIT counter (initial value tuned to ~1.5× minimum needed); credits go negative is illegal; clearing any row REFUNDS the sum of tolls along that row's columns, clearing any column REFUNDS that column's toll, and the round is a target-match puzzle.

**Antagonist:** The toll values painted on columns. They make some columns expensive to enter and others cheap, biasing legal placements toward cheap columns even when the target requires expensive ones.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Line clears — wanted because they delete non-target pre-fill (Puzzle role) AND refund credits, feared because the wrong row to clear refunds too few credits to fund the next placement.

**New placement question introduced (versus Classic):** "Can I afford to place this piece across these columns? If not, which placement-then-clear sequence refunds enough credits to fund the placement I actually want? Order of placement matters because credit balance is path-dependent."

**Why order matters:** A placement might be affordable now but not after a future placement spends down the reserve; vice-versa, a clear-first placement might unlock an otherwise unaffordable placement next turn.

**Why negative space matters:** Empty cells in a column reduce the chance of completing that column for a refund; the target must keep some columns clear-completable.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim with credit accounting; sim picks placements whose toll cost fits the running balance, refunds on clears. Initial credit set to sim's peak debit + slack. Sim's order proves solvability.

**Anti-pattern screen:**
- Mirror disease: pass — toll cost is determined by which columns the placement spans (a function of the placement) but the cost is ANTAGONIST against the placement, not an auto-write of additional cells. The decision space is "which placement and how to budget credits" — two coupled dimensions.
- Breathe disease: pass — credit constraint enforced live; target-match is independent.
- Pipeline disease: pass — adds resource-management agency.
- Scar disease: pass — tolls visible.

**Estimated implementation complexity (S/M/L):** S-M — column-strip UI for tolls, credit counter UI, debit/refund hook on placement and clear, generator extension.

**Immediate suspicion / risk:** Sibling of the Reservoir candidate (both add a global resource counter). If both ship, the genre risks "Blockit, but with a meter at the top." Toll has the column-spatial dimension that Reservoir lacks, but they could be perceived as samey.

---

### Candidate: Rotations
> ID: C18


**Core rule (one sentence, mechanics-speak):** Endless Classic-style mode where each tray refill includes a counter "rotations remaining" that is set to K (e.g. 6 on Normal) and decrements by 1 every time the player rotates any tray piece, with the rotation button disabled across all slots when the counter hits zero — refilling the tray (when all 3 slots empty) does NOT reset the counter; instead, the counter regenerates +2 per row/col cleared (capped at K).

**Antagonist:** The orientation distribution of the random-tray pool — most pieces have non-symmetric orientations that fit only specific gaps, so each refill places combinatorial pressure on the rotation budget.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Rotation — the player wants to fix bad piece orientations to fit the board, but every rotation depletes the budget that would let them fix the *next* refill's bad orientations.

**New placement question introduced (versus Classic):** "Do I accept this piece's current orientation in a suboptimal slot now (keep my rotation budget), or rotate to fit an ideal slot (and gamble the next 3 pieces will arrive in better default orientations)?"

**Why order matters:** Rotations carry forward across placements (resource is global, not per-piece). Spending a rotation early changes whether you can fix a worse problem later. Line-clear regeneration creates a planning loop: fit 3 pieces awkwardly to clear a line, regenerating budget for the next refill.

**Why negative space matters:** Some shaped negative-space holes are only fillable by specific piece orientations. Choosing to leave a hole of one shape vs. another commits future rotation spends.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim with a budget of K rotations/refill cycle proves expected survival: at each step, the simulator picks a placement that requires ≤ remaining-rotations and prefers orientations that produce a clear (which regenerates budget). If the sim survives the standard Classic survival horizon, the difficulty ships.

**Anti-pattern screen:**
- Mirror disease: pass — rotation choice is independent of which tray slot or board origin you pick.
- Breathe disease: pass — without the rotation cap this is Classic; the cap doesn't auto-trigger from any other rule.
- Pipeline disease: borderline — the rotation cap removes some agency (free rotates) without obviously adding new agency. Defense: it adds a *meta-resource decision* (when to spend) that Classic doesn't have. Risk: the new decision feels small; needs playtest.
- Scar disease: pass — budget changes are deterministic functions of player actions.

**Estimated implementation complexity (S/M/L):** S — single integer in `GameState`, decrement on `ROTATE_TRAY_PIECE`, regenerate on clear, gate the rotate button by counter > 0. UI shows "Rotations: 4/6".

**Immediate suspicion / risk:** "Run out of rotations" might create unrecoverable positions where the only fit requires a rotation the player can't perform — degenerates into Pipeline disease (forced no-action). Mitigation: game-over only when no piece in any *current* orientation fits; rotation is for optimisation, not survival. Need to verify the generator's survival sim respects this.

---

### Candidate: Negative Piece
> ID: C19


**Core rule (one sentence, mechanics-speak):** The tray displays pieces normally, but on placement the piece writes the *complement* within its bounding box: the bounding rectangle becomes a wall of fill, while the original piece-footprint cells become empty *holes punched through any prior fill at those positions*.

So a placement does two things atomically: (a) writes the bounding-box-minus-piece cells as new fill, and (b) erases (writes null over) the original piece-cells, even if those cells were previously occupied by other fill (but NOT walls or sentinel cells).

**Antagonist:** The bounding box. Big-bbox pieces dominate the board with new fill (a 4×4 bbox writes 11+ cells); small-bbox pieces are timid. The piece's "cells" are eraser-tipped — the tool for removing prior placements — but you don't get one without the other.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Piece footprint. The footprint cells are the eraser; the bounding box is the writer. To erase a critical cell you must accept writing the surrounding bounding-box. Player wants the eraser (to remove earlier mistakes) and fears the writer (to avoid filling target-empty cells).

**New placement question introduced (versus Classic):** "Where do I want to *both* erase and stamp?" — every placement is a coordinated subtract-and-add, and the two effects' positions are rigidly linked by piece geometry.

**Why order matters:** Erasure is partial undo of earlier placements. Placing piece B over the bounding-box cells of placed piece A erases A's fill at piece-B's cells but stamps fresh fill at A's piece-cells (now walled by B's bbox). Order determines which earlier writes survive.

**Why negative space matters:** Negative space *within the piece's bounding box* (the internal holes of L, T, U shapes) becomes the positive write. A solid square piece becomes a no-op (bounding-box cells = piece cells, complement is empty). A sparse piece (sparse polyomino with many bbox holes) is the most aggressive fill tool. Negative space on the *target* must be reachable — every target-empty cell must be in some piece's footprint position at the right turn.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim: at each step enumerate orientations + origins where (a) the bounding box is fully in-bounds, (b) every bounding-box-minus-piece cell is currently empty (we're writing fill there). Apply: write fill to bbox-minus-piece, write null to piece cells. Detect line clears, apply. End-state is target. Constructive solution is the forward-sim trace.

**Anti-pattern screen:**
- Mirror disease: pass — placement is a single decision; the dual write is a transformation of that one decision, not a doubled write of an unchanged decision (Mirror's failure was that the reflection is *the same placement* mirrored).
- Breathe disease: pass — the negation rule is the core primitive; without it, you have Shadow Cast (similar but no eraser) or Classic.
- Pipeline disease: pass — placement agency is deepened (eraser dimension added), not removed.
- Scar disease: pass — fully deterministic.

**Estimated implementation complexity (S/M/L):** M — placement validator checks bounding-box clearance (not piece-footprint clearance); placement effect writes two regions (bbox-minus-piece as fill, piece cells as null). UI must communicate both effects on hover preview (two overlay colors). Generator forward-sim follows the same template.

**Immediate suspicion / risk:** Solid pieces (squares, bars) are no-ops or near-no-ops, polluting the tray. The pool must be restricted to pieces with high (bbox - cells) > 1 ratio. Also: the eraser-on-prior-placements property may be confusing — players see fill disappear from a piece they placed several turns ago, which might read as a bug. Strong UX needed (highlight erase, distinct from placement). Borderline: the dual-write structure is complex, may push past "10th-play teachable."

---

### Candidate: Tide-III
> ID: C20


**Core rule (one sentence, mechanics-speak):**
The board has a designated EBB column index e (a single column 0–7) and a parameter L; the win condition is that, at game end, exactly L cells in column e are EMPTY (and all other puzzle constraints — a positive target on the other 7 columns — are met); after every line clear, the column e is *re-filled* to its pre-clear occupancy by the engine (cells that were filled in column e before the clear become filled again with sentinel "tide" color), so the only way to change column e's empty count is to fill it via player placement (which the engine permits).

**Antagonist:**
Column e auto-restores after clears, so any line clear that cuts through it is undone *only in column e*. The player must fill column e by placement — but placements that overlap column e have to navigate a column the engine keeps refilling.

**Dual-purpose mechanic:**
Line clears. Clears clean the rest of the board but column e snaps back. Clearing is essential to hit the positive target on columns ≠ e but doesn't help (and arguably hurts, by re-establishing tide cells) on column e.

**New placement question introduced:**
"Is my placement straddling column e or not, and how does that interact with which row clears I'm planning to trigger?" — a column becomes asymmetric.

**Why order matters:**
Filling column e cells *before* triggering a clear means the clear removes them and tide refills them — wasted moves. Filling them *after* the last clear means they survive. Sequencing your column-e placements relative to your clear-triggering placements is the central skill.

**Why negative space matters:**
The win check on column e is purely "exactly L empties." The other 7 columns have a positive target. Half the win predicate is negative-space arithmetic on a single column.

**Solvability strategy:**
Forward-sim: pick e, L, target (over the 7 non-e columns); simulate placements with the tide-restore-after-clear rule live; accept sims where the simulated end state has L empties in column e and matches the target on the other 7. The simulation is by construction a valid play.

**Anti-pattern screen:**
- Mirror disease: pass — tide refill is an engine-side event triggered by clears, not a function of any one placement.
- Breathe disease: pass — Puzzle's positive target doesn't capture "exact empties in one column"; Tide adds an independent count constraint.
- Pipeline disease: pass — placement agency retained.
- Scar disease: pass — e and L are fixed at generation; the refill rule is deterministic and triggered only by player-initiated clears.

**Estimated implementation complexity (S/M/L):** M (snapshot column e before clear, restore after; render tide cells with sentinel color; win predicate adds column-e empty-count check).

**Immediate suspicion / risk:**
"Refill column e to pre-clear state" is a surprising mechanic; players may assume clears do what clears always do, and feel cheated. Needs strong telegraphing (column e is colored differently throughout, animation shows the snap-back). Also: if L=0 (column e must be fully filled at end), the rule mostly degenerates to "column e isn't really clearable." Need L ∈ [1, 4] for the negative-space target to bite.

---

### Candidate: Tide-II
> ID: C21


**Core rule (one sentence, mechanics-speak):** A "tide line" starts at row 0 and advances one row downward every K placements; cells the tide line passes over that are EMPTY become permanent indestructible "flooded" cells (sentinel color, count as filled for clears but never erased by them, including by row clears); cells the tide passes over that are filled with player color are unaffected (the player's blocks "survived the flood"); round ends in loss when the tide line reaches row 7 and there are still empty cells above it that didn't survive, in win when the tide reaches row 7 and the tray is empty AND every cell above the line is either filled-by-player or flooded (i.e. nothing is "lost").

**Antagonist:** The tide line. A row index that monotonically increases, converting unfilled cells in its wake into permanent garbage.

**Dual-purpose mechanic:** The placement footprint itself. Each placement both (a) protects cells from the next tide pass (you want to fill row R before the tide hits R) and (b) consumes tray pieces faster, advancing the tide counter — you fear placing because every placement brings the tide closer.

**New placement question introduced (versus Classic):** "Among legal placements, which ones cover the most cells in the next-to-flood row?" Classic never asks about a particular row's empty count.

**Why order matters:** The K-placement counter is global and monotonic, so the order in which you commit pieces determines which row is next-to-flood when each piece lands. A 5-cell piece played early covers a high row; the same piece played late covers a low row — wholly different protection patterns.

**Why negative space matters:** Empty cells above the tide line are losses-in-waiting. The placement task is partly an active "where do I leave gaps" problem because some gaps will be flooded into permanent walls and others (below the tide) won't matter yet. The player chooses which empty cells to "sacrifice" to the tide.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim with the augmented rule: pick a tray and K, simulate, at each placement enumerate legal positions, advance tide every K placements, mark flooded cells. Filter for runs where the final board has no "lost" empty cells above the tide. The accepted run IS a constructive solution.

**Anti-pattern screen:**
- Mirror disease: pass — the tide is a separate state element, not a function of the placement.
- Breathe disease: pass — the win check ("nothing above tide is empty") is not implied by Classic's placement and clear rules; you can play Classic-legally and still lose to the tide.
- Pipeline disease: pass — nothing removed; new resource (tide row + counter) added.
- Scar disease: pass — tide advances deterministically every K placements; the row to be flooded is visible.

**Estimated implementation complexity (S/M/L):** M. Sentinel FLOOD color, a `tideRow` and `tideCounter` in state, reducer hook after every placement, a generator using forward-sim, UI band/overlay showing the next row to flood.

**Immediate suspicion / risk:** Hard to make K feel principled — too small and the player can never get ahead of the tide; too large and the antagonist barely exists. Also the win-check "no losses above tide" might be auto-satisfied if K is small (because you HAVE to fill row R to keep playing) — would need careful tuning and possibly a min-K to avoid Breathe disease creeping in.

---

### Candidate: Sonar
> ID: C22


**Core rule (one sentence, mechanics-speak):** Puzzle mode where the target is hidden, but every placed piece reports back the count of its footprint cells that coincide with target cells (an integer 0..|piece|), shown next to the placed piece; the player wins by ending with the board exactly matching the hidden target.

**Antagonist:** the hidden target — same forward-sim-generated bitmap as Echo, but revealed cell-by-cell only via overlap counts.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** the placement footprint — each placement both commits cells AND emits a measurement (overlap count). A pentomino placed in a wide-open area generates a 5-bit measurement (0..5); the player wants high-information placements (those that span ambiguous cells) but fears placing into cells that turn out to be non-target, requiring a clear to undo.

**New placement question introduced (versus Classic):** "given the overlap counts of every previously placed piece, which cells are now provably target / provably non-target / still ambiguous, and where should I place this piece to resolve the most ambiguity per cell committed?" This is Battleship-style hypothesis pruning, on top of placement.

**Why order matters:** the overlap of a piece with the target is information about a *specific set of cells*; the same piece placed in a different spot probes a different cell set. Placing the largest piece first gives the most information but commits the most board area irreversibly. Order also matters because clears redistribute which cells are still occupied for the win check.

**Why negative space matters:** overlap = 0 placements mean every cell in the footprint is non-target; the player will deliberately make low-information sacrificial placements into "negative-space-confirming" zones, then clear the row to free those cells. Negative space is the deduction substrate.

**Solvability strategy (constructive proof — usually forward-simulation):** generator forward-sims a target; the simulation's placements form a witness solution where every piece's overlap with the target equals its full size (piece is placed entirely on target cells). Quality filter: the puzzle's measurement model (set of all possible (placement, overlap) tuples per piece) must uniquely identify the target — checked by enumerating placements of the first piece, branching on each possible overlap value, and verifying at most one target survives the deduction tree using the full tray.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — overlap counts are a function of placement, but the underlying target is independent; the player chooses placement, the game discloses a fact about it.
- Breathe disease (rule auto-implied by other rules): pass — overlap = |piece| does not entail full target match (you might still have non-target cells filled elsewhere).
- Pipeline disease (agency removed without comparable agency added): pass — gives up the visible target, gains a probing-and-pruning game.
- Scar disease (random uncontrollable punishment): pass — measurements are deterministic functions of (placement, target); no RNG at runtime.

**Estimated implementation complexity (S/M/L):** L — the uniqueness filter is expensive; UI must render per-placement overlap badges that persist across clears; a "deduction helper" overlay (cells provably empty / provably filled given placements so far) is almost essential to make the mode tractable, and is itself non-trivial.

**Immediate suspicion / risk:** without a deduction helper, the cognitive load is too high for a casual session; with a full deduction helper, the mode collapses to "follow the helper's forced cells" and loses agency. The right level of helper assistance is a tuning problem.

---

### Candidate: Cargo
> ID: C23


**Core rule (one sentence, mechanics-speak):** A subset of tray pieces is marked CARGO and carries a sentinel-colored cell embedded in its footprint; the cell is immortal (line clears delete the rest of the piece's cells normally, but the cargo cell remains in place even if its row or column clears) and the round is won when the board's cargo-cell positions exactly match a target set of cargo positions while the board is otherwise empty.

**Antagonist:** The cargo cells already on the board from earlier placements — they cannot be removed once delivered, so a misdelivered cargo cell is a permanent puzzle violation.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Line clears — wanted because they remove the non-cargo body of a piece (so the piece "delivers" its cargo and disappears), feared because clearing a row that contains a previously-delivered cargo cell does NOT remove that cargo cell, and a clear that runs through a future delivery target overwrites that cell with empty without removing the upstream pre-fill plan.

**New placement question introduced (versus Classic):** "Which orientation+origin places the cargo cell of THIS piece at one of the target positions, while choosing the rest of the footprint to land on cells that will clear in the same or a later step?" The cargo's relative position inside the piece footprint constrains origin choice independently of fit.

**Why order matters:** A delivered cargo cell becomes an obstacle for subsequent piece geometry — it occupies a cell that future pieces must route around. Delivering cargo at a target adjacent to dense pre-fill before clearing the pre-fill traps the cell.

**Why negative space matters:** Each target cargo position must end as a single filled cell with the 4-neighbors being whatever the target says (empty, by default). Adjacent fill from a piece body that didn't clear permanently violates the win check.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim a tray with K cargo pieces; record each cargo cell's final settled position (a cell the forward-sim placed and that did NOT clear because the sim was constructed to leave it). Set the target cargo positions to those settled positions. Sim's order is a proof of solvability.

**Anti-pattern screen:**
- Mirror disease: pass — cargo placement is one decision (origin+rotation), the cargo cell's destination is determined by the placement but not by an unrelated rule; only one decision is being asked.
- Breathe disease: pass — win is a positional match on cargo cells only; not auto-satisfied by the placement rules. A player who places legally can still miss the cargo positions.
- Pipeline disease: pass — adds the cargo-positioning constraint on top of standard placement, doesn't remove the slot-choice agency.
- Scar disease: pass — cargo identity is shown on tray pieces, target positions are shown on board, no RNG between the player and the result.

**Estimated implementation complexity (S/M/L):** M — sentinel color for cargo cells, generator marks one cell per cargo piece, line-clear function gains a "preserve cargo color" branch (exists already for walls in Quarantine), target overlay extended for cargo positions.

**Immediate suspicion / risk:** Visually, distinguishing cargo cells inside a tray piece preview vs. on the board adds two more legend entries. Could feel similar to Monolith's "touched cell propagates" pattern; needs a play test to confirm the question is genuinely different.

---

### Candidate: Pulses
> ID: C24


**Core rule (one sentence, mechanics-speak):** Endless mode where every placement increments a "heat" counter by the placement's cell count (1–9) and decrements it by 4 per cleared line; when heat reaches H (e.g. 12 on Normal), the next placement triggers a "pulse" that empties the bottom row of the board (whatever cells are there, including pre-fill, stamps, the lot — sentinel cells survive only if explicitly flagged) and resets heat to 0; the player additionally owns K (3/2/1) "vent" tokens that manually reset heat without firing a pulse.

**Antagonist:** The heat counter — placement is the only way to score AND the only way to advance heat; clearing lines is the only way to safely keep heat in check; vent tokens are the emergency brake but limited.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Placement size — large pieces (3×3 = 9 cells) score and fill the board fast (good) but blow heat to pulse-trigger in 2 placements (bad); small pieces score little and don't help fill rows, but keep heat low.

**New placement question introduced (versus Classic):** "Do I place the 3×3 now to set up a clear (and accept that heat hits H next placement, triggering a pulse that may erase work I want to keep) or place the small 1-piece, save heat, and hope a clear comes from a future tray?"

**Why order matters:** Heat is global state; the order of large-vs-small placements directly determines when the pulse fires. A clear at heat 11 (decrement to 7, place at 3 → 10) is fine; the same clear at heat 8 leaves heat at 4 and the same placement leaves it at 7 — same pieces, different timing, different pulse schedule.

**Why negative space matters:** When the pulse fires, the *bottom row's* current occupancy is what's erased. Players manage the bottom row's occupancy ahead of pulse-time to control what's lost (empty bottom row → pulse is harmless; row-7 used as scaffolding → pulse erases scaffolding, free).

**Solvability strategy (constructive proof — usually forward-simulation):** Survival sim: a greedy strategy that prefers placements maintaining at least 4 empty cells in row 7 and uses vents only when heat ≥ H-2 with no clear-completing placement available must survive M turns under standard piece distribution.

**Anti-pattern screen:**
- Mirror disease: pass — heat update is a function of placement cell count (single decision input → single update), but the *spend* (vent token) is an independent decision, so the dual-decision structure holds.
- Breathe disease: pass — without heat/pulse this is Classic; the new rule is load-bearing.
- Pipeline disease: pass — adds a heat-management decision and a vent-spend decision.
- Scar disease: borderline — the pulse erases the bottom row deterministically (no RNG), but the player can't always control which cells are in the bottom row at pulse time. Defense: the pulse fires on the placement that *hits* heat H, so the player chooses which placement that is (and thus the bottom row's state at that moment). The "punishment" is fully predictable: heat is visible, pulse fires deterministically when it crosses H. Pass.

**Estimated implementation complexity (S/M/L):** M — heat counter in GameState, vent token counter, "pulse pending" indicator, post-placement pulse routine that clears row 7 (reuse `clearLines`), UI heat gauge. Generator: just survival-sim Classic with this rule layered.

**Immediate suspicion / risk:** Pulse erasing the bottom row is a powerful free clear — players may stuff the bottom row with garbage and *pray* for the pulse, inverting the antagonist relationship. Also: the heat-decrement formula (placement+1, clear-4) needs careful tuning, otherwise either pulses fire constantly (no decision) or never (no decision). High playtest sensitivity.

---

### Candidate: Echo-I
> ID: C25


**Core rule (one sentence, mechanics-speak):** The tray is a planning artifact, not a queue: the player sees the entire finite tray (5–8 pieces) up front and may place pieces in any order, BUT each placement also writes a sentinel-colored shadow of the immediately previous piece (in its as-placed orientation) onto the next-empty 1×1 cell of the column directly to the right of the new placement's bounding box, treating the right edge as wraparound; the round is won when the board matches a target pattern.

**Antagonist:** The shadow cells. Each placement spawns one (or marks "no spawn" if the spawn column has no empty cell). Shadows act as additional pre-fill that must be cleared.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The tray order — wanted because the player gets full freedom to pick any tray piece (a planning win), feared because every placement spawns a deterministic shadow whose position depends on the previous placement, so the order chosen creates a chain of obligations.

**New placement question introduced (versus Classic):** "If I place piece A now and then piece B next turn, where does B's shadow land, and does that ruin my path? Should I instead place B first so that B's shadow goes elsewhere?" Order itself is the lever, not just the placement.

**Why order matters:** Each placement's shadow location is determined by the PREVIOUS placement's footprint; reordering the tray changes the entire shadow trail.

**Why negative space matters:** The "next empty cell in the column to the right of the bounding box" rule means every empty column matters — leaving a column empty turns it into a shadow magnet for placements that border it.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim a fixed permutation: at each step, pick a legal placement, compute its shadow per the rule, write both, allow line clears. Snapshot result as target. Tray = the sim's pieces in some deterministic display order; the SIM ORDER is the secret solution. Sim provides constructive proof.

**Anti-pattern screen:**
- Mirror disease: borderline — the shadow's footprint shape mirrors the previous piece's, but its location is determined by the current piece. The shadow is not a simple function of the current placement alone, so two decisions are coupled (current footprint, ordering) rather than one decision auto-implying another. PASS but worth checking the spawn rule isn't degenerate.
- Breathe disease: pass — target-match is the win, no auxiliary rule auto-implied.
- Pipeline disease: pass — the player gets MORE order agency than Classic (full reorder), not less.
- Scar disease: pass — shadow positions are deterministic given the play history.

**Estimated implementation complexity (S/M/L):** L — finite freely-orderable tray UI is new, shadow-spawn rule needs animation/preview, generator must verify the chosen sim order produces a target the player can actually re-derive (otherwise puzzle is brute-force), legibility risk is high.

**Immediate suspicion / risk:** Borderline candidate. The "shadow of previous piece on next empty cell to the right" rule is intricate and may feel arbitrary rather than systemic. The wraparound makes geometry hard to reason about. Including specifically as a stress test for the structural filter.

---

### Candidate: Smother
> ID: C26


**Core rule (one sentence, mechanics-speak):** A single "ember" cell (sentinel color) sits on the board; after every placement, if the ember has ≥1 empty 4-neighbor, the ember spawns a new ember on the highest-index empty 4-neighbor (reading order, ties broken by the original ember's id) — and the ORIGINAL ember stays; an ember that becomes 4-surrounded by non-empty cells (player color, pre-fill, walls, or other embers) "smothers" and is destroyed; round ends in win when no embers remain AND tray is empty, in loss when total embers exceed N or tray empties with embers alive.

**Antagonist:** Embers — single-cell entities that multiply unless smothered.

**Dual-purpose mechanic:** Surrounding. The player WANTS to surround embers (to smother them) but FEARS surrounding from the wrong sides (because every placement gives the ember a chance to spread first; you can fill 3 sides and still let the ember birth a child on the 4th, then have to surround the child too).

**New placement question introduced (versus Classic):** "Does this placement smother the ember in the SAME action that the placement triggers another spread?" The placement-then-spread sequencing creates a real ordering question Classic doesn't ask.

**Why order matters:** Each piece causes a spread step. A wide piece played first across the ember's spread-front prevents N spread events; played last it prevents 1. Order changes the embers' birth genealogy.

**Why negative space matters:** Every empty 4-neighbor of every ember is fuel. Choosing which empty cells to leave (and on which side of which ember) directly determines spread direction.

**Solvability strategy (constructive proof — usually forward-simulation):** Seed 1 ember, sample tray, forward-sim by selecting placements that either (a) smother an ember on this turn (fill its last empty neighbor) or (b) at least don't increase ember count by more than would still leave a smothering line for the next placement. Filter accepted runs by "all embers dead at tray-end".

**Anti-pattern screen:**
- Mirror disease: pass — ember spread is separate state.
- Breathe disease: pass — ember death is not implied by Classic rules.
- Pipeline disease: pass — nothing removed.
- Scar disease: borderline — the spread direction is deterministic ("highest-index empty 4-neighbor") but only experienced players will internalize it. Mitigation: render an arrow on each ember pointing to its next spawn cell. With the arrow, FAIL → PASS.

**Estimated implementation complexity (S/M/L):** M. Single sentinel color, per-placement spread pass with smother check, augmented forward-sim, UI arrow per ember.

**Immediate suspicion / risk:** With a single starting ember and a 3-piece tray refill, an ember-spawn snowball can outpace the tray; needs cap-N tuning. Also feels close to Bloom — the differentiator (original ember persists, smother-by-surround vs. overwrite, per-ember arrow) must be clear or it's a Bloom reskin.

---

### Candidate: Quartet
> ID: C27


**Core rule (one sentence, mechanics-speak):**
The player must place all three tray pieces before the tray refills (no partial-tray refills); after the third placement, the *bounding box* enclosing all three placements' footprints is computed, and any complete row/column entirely within that bounding box is cleared (rows/cols outside the box are not checked even if full).

**Antagonist:**
Bounding-box compression — wide-spread placements give a large box and many cleared candidates, but consume more empty space; tight-cluster placements give a small box with fewer clears, leaving the rest of the board uncleared and accumulating fill.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):**
Geographic spread of the trio — wide spread means clears are eligible across most of the board (good), but spread placements rarely co-fill a row (bad).

**New placement question introduced (versus Classic):**
"How do I shape the bounding box of my three placements so that the rows/cols I've been priming are inside it?" — origin choices for all three pieces couple via the bounding box.

**Why order matters:**
The bounding box is order-independent in geometry, but the third placement determines *whether* the resulting box covers a primed row, so deferring the third placement to a row-aligned position is the planning decision.

**Why negative space matters:**
Empty cells outside the bounding box are dead for clearing this tray cycle; the player must arrange emptiness inside the box.

**Solvability strategy (constructive proof — usually forward-simulation):**
Forward-simulate placing all three pieces, then apply box-restricted clears; the trajectory is a valid solution. Reject seeds where no trajectory clears any line.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — bounding box is a function of *all three* origins, not any one, and the box-restriction creates a genuine new tradeoff.
- Breathe disease (rule auto-implied by other rules): pass — Classic clears all full rows; box-restricted clears are different.
- Pipeline disease (agency removed without comparable agency added): pass — full slot/origin/rotation agency intact; new decision (box-shape vs. clear-priming) added.
- Scar disease (random uncontrollable punishment): pass — bounding box is visible (overlay during tray) and deterministic.

**Estimated implementation complexity (S/M/L):**
M — needs to defer line-clear until tray-empty, track all three placement footprints, compute bounding box, and run a restricted clear; new UI overlay for "current bounding box."

**Immediate suspicion / risk:**
Combo readout becomes meaningless (all clears are simultaneous at tray-end); also, the player gets immediate placement feedback only via "did this go in the right corner of the box," which may feel slow.

---

### Candidate: Starve
> ID: C28


**Core rule (one sentence, mechanics-speak):**
The board is seeded with one or more 4-connected EMPTY-region "feeders" of total cell count F; on each placement (counting from move 1, regardless of whether the placement touched the feeder), every feeder loses 1 cell from its perimeter (turned into an inert SCAR-style indestructible block by the engine, deterministic — picks the lowest-row, lowest-col cell adjacent to the existing scar boundary); the round ends in win iff every feeder reaches exactly 0 empty cells on the same turn the tray empties, loss otherwise.

**Antagonist:**
Time. Each placement consumes a non-fungible "feeder slot" whether you wanted it to or not. The feeder shrinks deterministically along a published rule, and the player must arrange placements so the tray runs out the same turn the last feeder cell vanishes.

**Dual-purpose mechanic:**
Spending a tray piece. Every placement is also a tick on the feeder clock — the player wants pieces (to fill), fears pieces (each one shrinks the feeder, which they may have wanted to use as space).

**New placement question introduced:**
"Will the cell that the feeder is about to lose this turn collide with where I want to place?" — players must look ahead at the deterministic feeder-shrink schedule.

**Why order matters:**
Placing a small piece "wastes" a feeder tick the same as a big piece. The player's tray has a fixed length; consuming a small piece early frees a feeder cell that a larger piece could have used later (or the inverse — sometimes shrinking the feeder first opens a placement origin).

**Why negative space matters:**
The feeder *is* the negative space. The win check is "feeder empty count = 0 ∧ tray empty"; nothing about positive fill. The feeder's shape and shrink schedule dominate planning.

**Solvability strategy:**
Generator: seed feeder of F cells (8–14, single component). Build a tray of size T such that T ≥ F and the forward-simulation can play out by either placing inside the feeder (filling its cells) or placing outside (letting the feeder shrink for free). Forward-sim picks placements; a feeder cell that gets placed-on-or-shrunk is removed from the feeder; the sim accepts iff |feeder|=0 exactly at tray exhaustion. By construction the sim is a winning play.

**Anti-pattern screen:**
- Mirror disease: pass — the shrink rule is a deterministic engine action, not a function of player decisions; the placement is the player's free choice.
- Breathe disease: pass — Puzzle has no concept of an off-board timer; Starve's win predicate cannot be derived from a positive-target match.
- Pipeline disease: pass — full placement agency retained; new resource (feeder tick) added.
- Scar disease: pass — the shrink schedule is **deterministic and visible**, not random; the player can plan against it. (Critical that we publish the schedule, not roll dice.)

**Estimated implementation complexity (S/M/L):** M (feeder-shrink scheduler, reuse SCAR_COLOR-style rendering for shrunk cells, augment placement post-step to advance the feeder).

**Immediate suspicion / risk:**
The "deterministic shrink picks lowest-row-col adjacent" rule is arbitrary and may feel unfair when it picks the cell the player needed. Mitigation: render the next-to-shrink cell with a pulsing outline so the player has full information. Risk: if the shrink rule is too predictable, players just "subtract" it from their plan, but if it's too clever (e.g. shrink toward perimeter), it stops feeling deterministic.

---

### Candidate: Polarity-II
> ID: C29


**Core rule (one sentence, mechanics-speak):** Puzzle mode where each tray piece has a hidden polarity flag (+ or −) statically assigned at generation time; the polarity is invisible to the player; placing a + piece adds its cells normally, placing a − piece writes "anti-cells" (sentinel color) that get cancelled (both anti-cell and any pre-existing fill at that location become null) on contact instead of adding to the board; the player must end matching the visible target, and learns each piece's polarity only by placing it.

**Antagonist:** the hidden polarity assignment — a 7-bit string (one bit per tray piece) the player must decode by trial placement.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** placing on already-filled pre-fill — wanted because if the piece is −, its footprint will erase pre-fill (free progress); feared because if the piece is +, the placement is illegal (collision) and consumes the player's attempt to learn polarity. The cells-with-pre-fill region is the testbed.

**New placement question introduced (versus Classic):** "where should I place this unknown-polarity piece such that I learn its polarity at minimum cost? specifically: a footprint that would be legal-and-useful as + and also legal-and-useful as − is an information-cheap probe; a footprint that's only legal if − is a hypothesis test." Classic doesn't ask 'which placement maximises information about hidden state'.

**Why order matters:** the first placement of an unknown-polarity piece is high-information (binary outcome learned); subsequent placements of the same piece are deterministic. Placing the most-uncertain piece first into a probe-friendly region is strictly better than placing it last. Also, late discovery that a piece is − may strand the player in a board state they can't recover.

**Why negative space matters:** + pieces add to and − pieces subtract from the board; the target is a specific occupancy pattern. Empty cells are both potential + sites and necessary anti-cell-resolution sites. The player must reserve pre-fill chunks specifically for testing hypothesised − pieces.

**Solvability strategy (constructive proof — usually forward-simulation):** generator chooses polarities first (e.g. 60% +, 40% −), forward-sims by treating + pieces as additive (standard placement) and − pieces as subtractive (footprint-must-overlap-existing-fill, then erase). The simulation produces a target. Witness: same placements played in the same order win. Solvability inherited.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — polarity is independent generator-set data, not derived from prior placements.
- Breathe disease (rule auto-implied by other rules): pass — polarity adds genuinely new state transitions (subtractive placement) not implied by line-clear rules.
- Pipeline disease (agency removed without comparable agency added): pass — loses certainty about each piece's effect, gains the probe-design game (where to place to learn).
- Scar disease (random uncontrollable punishment): pass — polarity is fixed at generation; an optimal player can always make a probing placement that preserves win-feasibility (generator must guarantee this — see risk).

**Estimated implementation complexity (S/M/L):** L — new placement primitive (subtractive piece), new pre-fill role (must persist enough pre-fill for − pieces to land on), new piece-state UI, generator must verify "probing placement always exists without losing winnability".

**Immediate suspicion / risk:** the "always a safe probe" constraint is hard for the generator to guarantee — if a − piece's only legal placements all cancel cells the player needs in the target, the player loses to information they couldn't obtain. May need an "you can preview one piece's polarity per puzzle" escape hatch, which weakens the mechanic.

---

### Candidate: Hollow
> ID: C30


**Core rule (one sentence, mechanics-speak):**
The puzzle ships with a TARGET-EMPTY pattern (a set of cells that must be empty at win time) and a finite tray; the win check passes iff every TARGET-EMPTY cell is `null` AND every non-TARGET-EMPTY cell is filled — but TARGET-EMPTY cells are also the only cells that may NEVER be transiently filled at any intermediate step (a placement that ever writes a TARGET-EMPTY cell is rejected).

**Antagonist:**
The TARGET-EMPTY pattern, drawn as a fragile silhouette of forbidden cells. It is small and disconnected (e.g. 6–10 cells in 3–4 separate components) so it slices the board into awkward placement corridors.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):**
Line clears. Clearing fills 14 cells in one row + col stroke (minus overlaps), but every cleared row/col deletes ALL non-wall cells in it — including any pieces already adjacent to TARGET-EMPTY cells that the player needed for the final fill. The clear simultaneously creates space and erases progress.

**New placement question introduced (versus Classic):**
"Which footprint cells *cannot* I write to, ever?" — beyond the usual "is this cell empty?" the player must also check "does this cell appear in TARGET-EMPTY?". The placement legality predicate is augmented, not replaced.

**Why order matters:**
Because TARGET-EMPTY cells may not be transiently written, large pieces near a TARGET-EMPTY cluster must be placed before the surrounding cells get filled by smaller pieces — once you've boxed in a TARGET-EMPTY cluster with non-clearable filled cells, you can't extend through it. Order determines whether you reach the exact-fill target.

**Why negative space matters:**
The puzzle is *defined* by the TARGET-EMPTY mask. The win check on filled cells is the negation: fill everything that isn't TARGET-EMPTY. Two boards with identical filled-cell counts and shapes but different TARGET-EMPTY patterns are different puzzles. The player's planning is dominated by routing pieces *around* the forbidden cells.

**Solvability strategy (constructive proof — usually forward-simulation):**
Generator: pick TARGET-EMPTY cells (5–10 cells, 2–4 components, none adjacent to each other within a component-pair). Forward-simulate placement of a tray onto the empty board with the constraint `canPlace ∧ no footprint cell ∈ TARGET-EMPTY ∧ no clear-affected row/col would clear a TARGET-EMPTY-adjacent placed cell needed for fill`. The post-sim filled set is exactly the complement of TARGET-EMPTY iff the sim ends with the board having all non-TARGET-EMPTY cells filled. Reject sims that don't hit exact complement; the survivors are by construction solvable. Tighten target cell count (≥54) so few "almost-filled" boards qualify.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — the TARGET-EMPTY mask is independent input data, not derivable from any other placement.
- Breathe disease (rule auto-implied by other rules): pass — Standard Puzzle says "match positive target"; Hollow's positive target is "all non-EMPTY cells filled" *plus* the no-transient-write rule. Many sequences that achieve final positive fill would have transiently written through TARGET-EMPTY (e.g. place a 5-cell piece that crosses a hole then clear a row to evict the bad cell). Hollow forbids those, so the rule excludes solutions the bare positive check would accept.
- Pipeline disease (agency removed without comparable agency added): pass — the TARGET-EMPTY constraint is a new question, not a removed degree of freedom; the player still chooses piece, rotation, origin freely within a richer legality predicate.
- Scar disease (random uncontrollable punishment): pass — TARGET-EMPTY is fixed at puzzle generation, fully visible from move 1.

**Estimated implementation complexity (S/M/L):** M (new mask renderer, augmented `canPlace` per mode, reuse puzzle generator skeleton).

**Immediate suspicion / risk:**
The "no transient write" rule may collapse to "TARGET-EMPTY cells are walls" (i.e. equivalent to a Quarantine wall pattern). If walls suffice, this is just Quarantine with a fill-everything-else target. Mitigation: walls block clears differently — Quarantine clears preserve walls but Hollow has no walls in the line-clear topology, so a row through a TARGET-EMPTY cell can clear without preservation. Still need to verify these aren't isomorphic.

---

### Candidate: Brail
> ID: C31


**Core rule (one sentence, mechanics-speak):** Puzzle mode where the target is rendered only as outline glyphs on the eight border edges (top, bottom, left, right) — each edge cell shows whether its row/column has 0, 1–3, 4–6, or 7–8 target cells via a 4-state border tick; the interior of the target is hidden, and the player must end with the board exactly matching the hidden target.

**Antagonist:** the hidden interior of the target — known only via its row/column count buckets (coarser than Echo).

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** placement that crosses a bucket boundary — wanted because it confirms whether a row/column actually held more target cells than the bucket's lower bound; feared because committing to an interpretation of the bucket may be wrong, requiring a costly clear to recover.

**New placement question introduced (versus Classic):** "given coarse per-row and per-column count buckets, what's the maximum-information placement that disambiguates two viable target hypotheses, and is there a piece whose footprint exactly straddles the disambiguating cells?" The deduction game is on bucket boundaries, not raw counts.

**Why order matters:** an early placement that resolves the bucket of a critical row reduces the hypothesis space exponentially for downstream placements; deferring it means subsequent placements are made under wider uncertainty.

**Why negative space matters:** bucket = 0 rows mean every cell in that row must end empty; bucket = 7-8 rows mean almost-full rows. Bucket = 1-3 rows are the deduction-rich rows where negative space placement matters most.

**Solvability strategy (constructive proof — usually forward-simulation):** generator forward-sims a target, computes row/col bucket vectors (`bucket = floor(count/2)` clamped to {0,1-3,4-6,7-8}), publishes only the buckets. Quality filter: at least 4 of the 16 bucket values must be in 1-3 or 4-6 (the ambiguous brackets) to ensure deduction work; AND the (buckets, tray) pair must allow at most a small number of consistent targets that are all reachable, with ≥ 1 reachable — exact uniqueness is too strong here, so we relax to "all consistent boards reachable from the same tray converge to the same final occupancy" (i.e. the bucket disambiguation is forced by play, not a separate puzzle).

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — bucket vectors are independent generator output.
- Breathe disease (rule auto-implied by other rules): pass — bucket match is strictly weaker than full target match; matching buckets does not imply matching the target.
- Pipeline disease (agency removed without comparable agency added): pass — loses crisp target picture, gains coarse-clue deduction.
- Scar disease (random uncontrollable punishment): pass — buckets are static.

**Estimated implementation complexity (S/M/L):** M — bucket vector storage and rendering on the 4 borders; the relaxed uniqueness check is generator-side only.

**Immediate suspicion / risk:** the "all consistent targets converge" filter may be too generous and let through puzzles where two different targets are both achievable, demoralising the player who finds the "wrong right answer". Tightening the filter pushes the generator toward Echo's stricter uniqueness regime and may reject most candidates.

---

### Candidate: Skips
> ID: C32


**Core rule (one sentence, mechanics-speak):** Endless Classic-style mode where the player owns K (4/3/2 across difficulty) "skip" tokens, each of which discards one chosen tray slot (the slot becomes empty without being placed), with the standard Classic refill rule (refill when all 3 slots empty) unchanged and tokens regenerate at +1 per 5 lines cleared (no cap).

**Antagonist:** The tray composition itself — discarding without placing forces the *next* refill to come sooner, but the next refill is unknown, so each skip is a bet that the next 3 pieces will be friendlier.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The tray — wanted because pieces fill the board and clear lines, feared because a bad piece in a bad slot can dead-end the round; skipping is the only way to "refuse" a piece.

**New placement question introduced (versus Classic):** "Is this 3×3 piece worth placing in a position that fragments the board, or worth burning a skip to roll a new piece — knowing skips regenerate slowly and the new piece is unseen?"

**Why order matters:** Skipping a piece changes when the refill triggers (when all 3 slots are empty), changing the *contents* of the next tray (different RNG draw point). Place-then-skip ordering inside one tray cycle determines which combination of (placed, placed, skipped) becomes the actual play sequence.

**Why negative space matters:** A skip frees no cells but is justified primarily by the negative space the piece *would* destroy. Players evaluate skip by counting how many small-piece landing zones the placement would eliminate.

**Solvability strategy (constructive proof — usually forward-simulation):** Survival floor forward-sim: simulator runs Classic with a strategy that skips when no placement leaves at least 2 small-piece-fittable holes. If the sim survives M turns under standard piece distribution, the difficulty ships. K is tuned so that aggressive-skip strategies run out of tokens before round end at the difficulty's intended length.

**Anti-pattern screen:**
- Mirror disease: pass — skip-target slot is independent of placement.
- Breathe disease: pass — without skips it's pure Classic; skip cap creates the new pressure.
- Pipeline disease: borderline — fewer placements = fewer score events = subtractive on the surface. Defense: skip *adds* a tray-curation decision that Classic doesn't have; the agency added (refuse pieces) outweighs the agency lost (place fewer pieces).
- Scar disease: pass — skips are player-chosen, regen is deterministic from clears.

**Estimated implementation complexity (S/M/L):** S — token counter, "skip" button per tray slot, decrement counter on use, regenerate on clear. Refill triggers unchanged.

**Immediate suspicion / risk:** Skipping is asymmetric — discarding the 3-cell piece is much cheaper than discarding the 5-cell piece (less wasted material). May lead to a single dominant strategy ("always skip the smallest piece if no good fit"). Mitigation: regen is per-line not per-piece, so wasteful skips don't refund themselves through scoring. Needs playtest.

---

### Candidate: Echo-II
> ID: C33


**Core rule (one sentence, mechanics-speak):**
The puzzle ships with two TARGET patterns — POSITIVE_TARGET (cells that must be filled at win) and NEGATIVE_TARGET (cells that must be empty at win) — where POSITIVE_TARGET ∪ NEGATIVE_TARGET is a strict subset of the board (so a band of "don't care" cells exists); the win check requires both targets to be satisfied simultaneously with a finite tray, and crucially, the puzzle is generated so that the NEGATIVE_TARGET is NOT the complement of POSITIVE_TARGET.

**Antagonist:**
The "don't care" cells. They are the only cells the player can use freely, and they're laid out as awkward L-shaped strips connecting the positive and negative regions — pieces *must* pass through them but can't rest in negative regions.

**Dual-purpose mechanic:**
The "don't care" cells. They both (a) host transient placements that don't affect the win check and (b) host the row/col clears the player needs to evict pieces that landed in NEGATIVE_TARGET. Wanting them as workspace conflicts with needing them clearable.

**New placement question introduced:**
"Does this placement land any cells in NEGATIVE_TARGET, and if so, can I clear them out before tray exhaustion?" — explicit two-target accounting that Puzzle never demands (Puzzle has exactly one target where empty-implies-must-be-empty).

**Why order matters:**
A piece that drops cells into NEGATIVE_TARGET must be evicted via a row/col clear before the round ends. Clearing requires building up an entire row or column — which uses tray pieces. Order determines whether you have enough tray left to fill POSITIVE_TARGET after evicting your own mistakes.

**Why negative space matters:**
NEGATIVE_TARGET is an explicit, generator-defined set of cells that must be empty independently of any positive constraint. Two boards with identical filled-cell sets pass or fail Echo depending on which cells are NEGATIVE_TARGET — not derivable from the positive target alone.

**Solvability strategy:**
Generator: pick POSITIVE_TARGET (8–18 cells, must touch ≥2 rows and cols); pick NEGATIVE_TARGET (8–14 cells, **disjoint from POSITIVE_TARGET, AND such that POSITIVE_TARGET ∪ NEGATIVE_TARGET ≠ all cells**, with at least 8 don't-care cells). Forward-sim a tray onto an empty board: at each step, allow placements anywhere, tracking which placements drop into NEGATIVE_TARGET; require the sim to engineer at least one row/col clear that fully evacuates NEGATIVE_TARGET cells. Accept sims whose end state matches both targets.

**Anti-pattern screen:**
- Mirror disease: pass — POSITIVE and NEGATIVE are independent puzzle data.
- Breathe disease: borderline — if NEGATIVE_TARGET ⊆ complement(POSITIVE_TARGET) is the only constraint, then "match POSITIVE exactly" implies "all complement cells empty" implies NEGATIVE is satisfied; the rule is auto-implied. We avoid this by NOT requiring exact POSITIVE match — the win check is "POSITIVE cells are filled AND NEGATIVE cells are empty," with don't-care cells freely in either state. So a board that fills POSITIVE plus some don't-care cells (and leaves NEGATIVE empty) wins — different from Puzzle's exact-match. Negative target is a **separable** independent assertion, not an automatic consequence. Pass.
- Pipeline disease: pass — placement freedom unchanged; new accounting added.
- Scar disease: pass — both targets are puzzle data fixed at generation.

**Estimated implementation complexity (S/M/L):** M (two distinct target overlays — outline for POSITIVE, hatched for NEGATIVE; win predicate is a conjunction of two cell-set checks instead of an exact match).

**Immediate suspicion / risk:**
The visual language of "outline = must fill, hatched = must empty, plain = anything" is dense; new players may confuse the two markers. Bigger risk: if don't-care cells are too numerous, the player can ignore NEGATIVE_TARGET entirely and just fill around it — the negative target becomes vestigial. Generation must constrain don't-care cells to a narrow band that funnels pieces *through* NEGATIVE_TARGET, forcing eviction via clears.

---

### Candidate: Tide-IV
> ID: C34


**Core rule (one sentence, mechanics-speak):** Puzzle mode where the visible target pattern *cycles* through three statically-determined variants on a fixed 4-placement clock (variant A for placements 1–4, variant B for 5–8, variant C for 9–12, then back to A); the player wins by matching whichever variant is currently displayed at end-of-tray; the clock and variants are deterministic and visible (variant glyphs A/B/C shown on each cell), but the player must plan toward the right one.

**Antagonist:** the clock — the target the player is racing toward changes if they take too many or too few placements; tray length and clock cycle interact.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** placing — wanted because progress; feared because each placement also advances the clock; an off-by-one placement count means the player matches variant B when the clock has rolled to C, and the win check fails.

**New placement question introduced (versus Classic):** "which of the 3 visible target variants is reachable in the remaining piece budget AND lands the clock on that variant's window? Choose the variant first, then plan placements; replan if pieces force a clear that destroys progress toward the chosen variant." Classic and Puzzle never ask "which target".

**Why order matters:** the clock is incremented by every placement; reordering placements doesn't change the clock end-state but reordering pieces *between trays* (if Tide spans multiple refills) does, because the variant the player commits to mid-game may close off later variants. Also, line clears that "don't count as placements" (or "do") create order-dependent clock-state interactions.

**Why negative space matters:** the three variants share some cells (let those be "anchor cells", always target) and disagree on others ("swing cells"); the player optimises by filling anchor cells early (committed regardless of variant) and deferring swing-cell placements until the chosen variant is locked.

**Solvability strategy (constructive proof — usually forward-simulation):** generator forward-sims a base target (A); applies a small statically-computed mutation (e.g. shift one column, or rotate a sub-region) to produce B and C; chooses the witness placement count so that one of A/B/C lands on the right clock window; verifies at least one variant is reachable from the start board with the given tray AND lands on the matching window. Three valid solutions exist (one per variant) when possible.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — variants and the clock are independent of placement choice; placement only advances the clock.
- Breathe disease (rule auto-implied by other rules): pass — clock + variant is a separate state machine, not implied by placement geometry.
- Pipeline disease (agency removed without comparable agency added): borderline — the player gains the variant-choice game but the clock is a strict scheduler that may feel like enforced subtraction. The compensating agency is the variant choice itself — picking which target to converge on is a real decision space Classic never offers.
- Scar disease (random uncontrollable punishment): pass — the clock and variants are deterministic.

**Estimated implementation complexity (S/M/L):** L — three target variants stored, clock state in reducer, three-coloured target overlay UI, win check parameterised on (variant, clock window), generator must enumerate variants.

**Immediate suspicion / risk:** showing three variants at once is visually dense and may overwhelm; the "which variant, when" decision may collapse to "always pick whichever is closest to the start board" — which makes the clock decorative. Need to ensure all three variants have comparable "distance" from start to keep the choice meaningful, which is a hard generator constraint.

---

### Candidate: Migrate
> ID: C35


**Core rule (one sentence, mechanics-speak):** Each filled cell on the board carries an integer "stake" set when placed; on every placement, every cell with stake > 0 has its stake decremented by 1, and any cell that hits stake == 0 migrates one row downward (if the cell directly below is empty; otherwise it stays put). Newly-placed cells start at stake = 2. Rows and columns clear normally.

**Antagonist:** The countdown migration. Cells you place are stationary for two placements, then start drifting down on their own — your carefully assembled row at row 3 will have crept to row 4 by turn 5, possibly into cells you wanted to leave empty for another piece.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Stake-driven migration. Wanted: a half-built row at row 2 will migrate down into row 3, potentially completing a row at row 3 if the gaps line up. Feared: structures drift out of position before you can finish them; a column you were building from the top has its top cells walking south while you stack from the bottom.

**New placement question introduced (versus Classic):** "What does this cell turn into N placements from now?" — every placement now also asks about every existing cell's future position.

**Why order matters:** A cell placed turn 1 reaches stake 0 at turn 3 and starts migrating; the same cell placed turn 3 doesn't move until turn 5. The order in which you fill positions determines which subset is migrating at any given turn.

**Why negative space matters:** Empty cells directly below filled-and-migrating cells are migration receivers — leaving the cell at (r+1, c) empty when (r, c) has stake 1 means at next turn the cell at (r+1, c) will be filled. Choosing what's empty is choosing what the migrators land on.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim: place piece (cells get stake 2), decrement all existing stakes, run migration pass (cells with stake 0 fall one row if the slot below is empty; resolve collisions in row order), then detect & clear lines. Snapshot. Provably solvable.

**Anti-pattern screen:**
- Mirror disease: pass — migration depends on each cell's *placement* turn, not on the last placement's identity. The player making a different last move doesn't change any other cell's stake countdown.
- Breathe disease: pass — migration is its own predicate, not implied by line-clears.
- Pipeline disease: pass — agency expanded.
- Scar disease: borderline — nothing random; stakes start at a fixed 2 and decrement deterministically. Migration target (the cell below) is determined by current board, which the player controls. Pass.

**Estimated implementation complexity (S/M/L):** L — needs a per-cell stake matrix, a migration-resolution pass that orders cells (top-down? bottom-up?) to handle stacks consistently, plus UI to show stake countdown on each cell.

**Immediate suspicion / risk:** The migration-collision rule (what if two cells try to migrate into the same target) needs careful definition or it becomes nondeterministic. Also: visualizing per-cell stakes is busy on a small grid — may need a tint-darkness scheme similar to Decay's. Risk that the rule is too noisy and the player can't keep mental state.

---

### Candidate: Compass
> ID: C36


**Core rule (one sentence, mechanics-speak):** Puzzle mode where the target is hidden, but a single board cell is marked as the "anchor" and after every placement the game reports the Chebyshev distance from the anchor to the nearest still-unfilled target cell (an integer 0..7, or a "done" sentinel when zero target cells remain unfilled).

**Antagonist:** the hidden target combined with the descent constraint — the player must drive the reported distance monotonically (non-strictly) downward without overshoot.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** filling a cell — wanted because filling a target cell may shrink the reported distance (revealing the closest-target ring around the anchor); feared because filling a non-target cell anywhere closer to the anchor doesn't change the readout (so the readout's silence is itself evidence the cell wasn't a target). Each placement is read as a multi-bit oracle.

**New placement question introduced (versus Classic):** "given the distance readouts after each placement, where is the unfilled-target frontier, and which cell of this piece's footprint should be the closest-to-anchor?" The player solves a constrained shortest-path-to-boundary problem on top of placement.

**Why order matters:** later placements are made under a tighter distance constraint than earlier ones (the frontier moves inward); placing a wide piece across the anchor's neighborhood early reveals cheap structural facts about the target's center. Placing the same piece last reveals only one value.

**Why negative space matters:** the distance readout encodes negative space implicitly — a steady distance after a placement means none of the footprint hit a target cell, which lights up that footprint as confirmed empty in the player's mental model.

**Solvability strategy (constructive proof — usually forward-simulation):** generator forward-sims a target, picks the anchor as a cell that lies inside or on the boundary of the target (so the initial distance is 0 or small and informative). Quality filter: the sequence of distance readouts produced by the witness placement order must contain at least 3 distinct values (otherwise the oracle is degenerate) AND no two distinct candidate targets in the search space produce the same readout sequence under any single tray permutation.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — the oracle reads from the hidden target, not from the player's prior decisions.
- Breathe disease (rule auto-implied by other rules): pass — distance-zero readout doesn't imply full target match; many boards drive distance to zero without filling all target cells.
- Pipeline disease (agency removed without comparable agency added): pass — loses target picture, gains distance-driven deduction.
- Scar disease (random uncontrollable punishment): pass — anchor and target are static.

**Estimated implementation complexity (S/M/L):** M — single integer readout, simple UI; uniqueness filter over readout sequences is moderately expensive but bounded by tray length.

**Immediate suspicion / risk:** a single scalar readout per turn may carry too little information for tray sizes ≥ 5; might need to either shorten trays (loses puzzle scope) or add a second anchor (creeps toward feature creep).

---

### Candidate: Lookahead
> ID: C37


**Core rule (one sentence, mechanics-speak):** Classic-style endless mode but the tray always shows the *next* tray's three pieces alongside the current tray (six pieces visible, three placeable now), and a fixed "buffer slot" lets the player one-time-per-cycle swap one current-tray piece with one next-tray piece before placing.

**Antagonist:** the upcoming pieces — visible, so the player can plan around them, but the buffer can only fire once per refill cycle, so commitment is real.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** the buffer swap — wanted because it lets the player route around bad piece-board fits; feared because spending it commits to a particular next-cycle order (the swapped piece is now bound to its new slot for the rest of the cycle and can't be re-swapped, and the buffer doesn't refill until the current tray empties).

**New placement question introduced (versus Classic):** "given the next 6 pieces and one swap, which placement of the current 3 leaves the board in a state the next 3 can also be placed AND a target row/column completion is achievable across the boundary?" Classic asks one-tray-deep planning; this asks two-tray-deep planning with one editing operation.

**Why order matters:** placement order within a tray matters in Classic because it changes the board state for the next placement; here it matters double because it also changes the board state the *visible next tray* will encounter, which the player has already pre-planned against. Also, the order of swapping vs. placing matters: swap-then-place lets the swapped piece participate in this cycle, place-then-swap lets it shape the next.

**Why negative space matters:** a planning-2-deep mode asks the player to reserve specific empty regions (columns, L-shaped pockets) for known-incoming pieces; negative space becomes a named resource ("the I3 in next tray is going in column 7, so column 7 stays open").

**Solvability strategy (constructive proof — usually forward-simulation):** Classic-genre — no fixed target, score-attack. Solvability is "you can always make at least one legal move in the current tray", same as Classic; the lookahead is purely informational. Generator just samples two trays at a time.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — lookahead is independent display data, not a function of the player's choice.
- Breathe disease (rule auto-implied by other rules): pass — there's no extra win/lose check beyond Classic; the buffer-swap rule isn't auto-implied because Classic has no swap.
- Pipeline disease (agency removed without comparable agency added): borderline — strictly *adds* visibility AND adds the swap action. Pure addition risks feature creep, but the swap is a constrained agency mechanic (one per cycle), not just "show more".
- Scar disease (random uncontrollable punishment): pass — no RNG punishment; piece sampling is the same as Classic.

**Estimated implementation complexity (S/M/L):** M — UI changes (six-piece display, swap affordance), tray state expanded to two tiers, buffer counter; reducer changes are localized.

**Immediate suspicion / risk:** borderline candidate — the information addition is large, and the only consumption-side mechanic is the once-per-cycle swap; if the swap is too cheap or too restrictive, the mode degenerates to Classic-with-extra-info (feature creep). May fail the 10th-play test if players just learn to ignore the lookahead.

---

### Candidate: Echo-IV
> ID: C38


**Core rule (one sentence, mechanics-speak):** The tray contains a single piece slot; after each placement, the next tray piece is computed from the cells the player just placed — specifically, the smallest bounding rectangle of the placement, with each cell's fill state inverted (placed cells become holes in the next piece, gap cells become solid in the next piece), normalized to a polyomino.

**Antagonist:** The placement you just made — it dictates the next piece, so a comfortable placement now becomes an awkward forced piece next turn. The player must defeat their own past decisions.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Placement bounding box. A placement that fits a small bounding box is easy to place now (and produces a small next piece — easy to re-place), but a placement that's strategically valuable (e.g. a tall thin piece bridging a gap) produces a tall thin next piece — useful only in narrow channels. Player wants efficient placements (good now, predictable next) and fears placements with awkward bounding rects (bad next).

**New placement question introduced (versus Classic):** "What shape will this placement become?" — the player evaluates each move twice: once for board impact, once for next-piece quality.

**Why order matters:** Trivially. Each placement *generates* the next piece; a different ordering of moves produces a strictly different sequence of subsequent pieces. There is no commutative subset of moves.

**Why negative space matters:** Negative space WITHIN the bounding box of each placement becomes positive space in the next piece. Every empty cell inside your piece's bounding rect (every concavity, every L-notch) is a cell that will be solid next turn — the player chooses placements partly by what holes they spawn.

**Solvability strategy (constructive proof — usually forward-simulation):** Generator pre-computes a full play sequence: pick an initial piece, place it; compute the echo; place that; compute the next echo; etc., for N steps. Forward-simulation guarantees the sequence is playable in this exact order. Win condition: end-state board matches a target pattern, OR the player survives K placements (score-attack variant). Each candidate run is constructively solvable because it's literally a recorded simulation. Filter on: echo pieces never become the empty piece (≥ 1 cell), never exceed the catalog's max bounding box.

**Anti-pattern screen:**
- Mirror disease: pass — the echo rule does NOT double-write the same decision; it produces a *new* future decision (where to place the echo). The next-piece is computed from the past placement but the next *decision* is fresh.
- Breathe disease: pass — the echo isn't implied by the place-and-clear rules; it's an orthogonal new primitive.
- Pipeline disease: pass — agency is shifted (piece selection becomes a function of placement choice), but the placement choice itself becomes more agentic, not less. Net agency added.
- Scar disease: pass — the echo is fully deterministic from the player's choice; no RNG.

**Estimated implementation complexity (S/M/L):** M — needs an "invert bounding box to polyomino" helper, normalization (translate to origin, ensure 4-connected; reject and re-derive if not), end-of-game when the echo can't fit. The forward-sim generator is small (single-piece tray makes it cheap).

**Immediate suspicion / risk:** Echo pieces may degenerate. A solid 2×2 placement echoes to the empty piece (no cells); a 1×4 placement echoes to the empty piece (zero gaps). Need a clear fallback: maybe echo-to-empty triggers a "tray refresh" with a random small piece, which dilutes the inversion. Alternative: forbid placements whose echo is empty, which would prevent some natural moves. Either path waters down the lens.

---

### Candidate: Heading
> ID: C39


**Core rule (one sentence, mechanics-speak):**
Each placement records its "heading" (orientation index 0–3); line clears triggered by a placement only erase cells in the half-board (top/bottom for orientations 0/2, left/right for orientations 1/3) that the heading points toward; cells in the other half remain even on a full-row clear.

**Antagonist:**
Half-clear residue — when you wanted a full row gone but your heading points the wrong way, the wrong half stays filled and now you have a one-cell-tall plateau anchored against the board edge.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):**
Orientation choice — rotating to make the piece fit a specific empty pocket is what you need, but the same rotation may flip your heading away from the half you wanted to clear.

**New placement question introduced (versus Classic):**
"Of the orientations that geometrically fit, which one points its clear-arrow at the half I want erased?" — orientation now binds the *direction* of clears, not just the footprint.

**Why order matters:**
Placing piece A heading-up first to clear the top half leaves the bottom half filled; placing A heading-down first clears bottom and now piece B has a different empty workspace.

**Why negative space matters:**
The empty cells in the *non-cleared* half are the only place clears can be set up next, so where you leave holes determines whether subsequent headings can land productively.

**Solvability strategy (constructive proof — usually forward-simulation):**
Forward-simulate by enumerating (orientation, origin) tuples, applying heading-restricted clears; the simulator's trajectory proves solvability. Reject simulations whose heading distribution is degenerate (≥ 80% same heading).

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — orientation already exists as a player choice, but Classic's clear is symmetric; coupling clear-direction to orientation creates a *new tradeoff* (fit vs. clear-direction), not a redundant rewrite.
- Breathe disease (rule auto-implied by other rules): pass — Classic line clears erase the entire row; half-clear is genuinely different.
- Pipeline disease (agency removed without comparable agency added): pass — slot agency intact; orientation gains a second meaning.
- Scar disease (random uncontrollable punishment): pass — heading is fully under player control via rotation.

**Estimated implementation complexity (S/M/L):**
M — needs heading metadata per orientation (already implicit), a clear-restriction in the placement resolver, and a UI arrow indicator on the tray piece preview.

**Immediate suspicion / risk:**
Rotational symmetry of square-ish pieces (e.g. 3×3, monomino) makes heading meaningless for them; need to either label all orientations distinctly or restrict the piece pool to non-symmetric shapes.

---

### Candidate: Toroidal Pieces
> ID: C40


**Core rule (one sentence, mechanics-speak):** A piece footprint that extends past the right edge wraps around into the left columns of the same rows (and likewise top-to-bottom); placement is legal iff every wrapped cell is in-bounds within the same row (resp. column) and lands on an empty cell. Line-clear, scoring, and tray are otherwise standard.

**Antagonist:** Wrap-around itself. A 1×4 placed at column 6 fills columns 6, 7, 0, 1 of its row, completing horizontal regions you didn't intend to touch and breaking the player's "left side" / "right side" mental partition of the board.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The toroidal placement. Wanted: a piece can plug holes on both edges with one placement. Feared: a piece wrapping past the edge fills cells in a region you were keeping clear for another piece.

**New placement question introduced (versus Classic):** "Should I place this piece in a wrap-around position, or in a strictly in-frame position?" — wrap-around placements double the legal placement set per piece per turn.

**Why order matters:** A wrap-placement at column 7 fills column 0; if the next piece needed column 0 to be empty for an in-frame placement at column 0..2, the order has invalidated it.

**Why negative space matters:** "Empty in column 0" is strategically different from "empty in column 7" only when you ignore wrap; with wrap they're connected, and an empty cell at column 7 can be reached by any piece extending right from column 5+. Negative-space planning collapses across the wrap seam.

**Solvability strategy (constructive proof — usually forward-simulation):** Generator forward-sims with the expanded placement set (each piece × each rotation × each (r, c-with-wrap) origin). Snapshot final board as target. Provably solvable.

**Anti-pattern screen:**
- Mirror disease: pass — the wrap is a static property of the board's adjacency, not a function of the last move.
- Breathe disease: pass — placement legality changes meaningfully (more positions become legal).
- Pipeline disease: pass — agency expanded.
- Scar disease: pass — wrap topology is fixed.

**Estimated implementation complexity (S/M/L):** M — `canPlacePiece` and `placePiece` need wrap-aware versions; line-clear and the rest are unchanged because wrap is only on the placement step. Tray rotation legality probe enumerates more origins.

**Immediate suspicion / risk:** Visual: a piece that wraps will look like two disconnected blobs unless we render a "ghost" of the wrap-half during drag. Without that, the player can't predict where a piece will land. Also: line-clear stays per-row, which may feel inconsistent if pieces wrap but lines don't.

---

### Candidate: Aperture
> ID: C41


**Core rule (one sentence, mechanics-speak):**
The board has a designated APERTURE region (a contiguous 4-connected set of cells, generated as a 6–12 cell shape); each placement is legal only if, after applying the placement and any line clears, the count of empty cells inside APERTURE is strictly greater than zero AND less than or equal to a per-puzzle cap K — an empty APERTURE or a fully-filled APERTURE both reject the placement.

**Antagonist:**
The aperture itself — a window the player must keep partially-but-not-fully open at every intermediate step, not just at the end. Gradually fills from outside-in as placements eat the surrounding cells.

**Dual-purpose mechanic:**
Filling cells inside the aperture. Each cell filled inside APERTURE both (a) advances the win condition (target requires APERTURE end with exactly 1–2 empty cells) and (b) risks crossing the cap K from below into "too few empties left" mid-game, ending the round.

**New placement question introduced:**
"How many of my footprint cells fall inside the APERTURE region, and does that move the empty-count into the legal band?" — every placement gets a region-overlap arithmetic check.

**Why order matters:**
Filling APERTURE cells out of order can lock the player out: a 5-cell piece filling 4 APERTURE cells is illegal if APERTURE only had 5 empties left (would leave 1 — within cap, OK) but the same piece played one move later when APERTURE has 4 empties is illegal (would leave 0). Same pieces, same target, different order yields different reachability.

**Why negative space matters:**
The win check is exact on EMPTY cells inside APERTURE; a board with 1 APERTURE empty wins, 0 loses, 3 doesn't win. Outside APERTURE, fill is unconstrained (a separate "must fill ≥ X cells outside" target avoids degenerate solutions). The win predicate is not a function of the filled-set.

**Solvability strategy:**
Forward-sim with cap K = max APERTURE empties just-before-final-piece + 1. Generate APERTURE (random walk to 8–12 cells), pick tray, forward-sim with the cap rule live; accept the final sim if APERTURE empty count is in [1, 2]. Tray + APERTURE + cap is provably solvable by the sim's own play.

**Anti-pattern screen:**
- Mirror disease: pass — the cap rule is an independent threshold, not a function of placement geometry.
- Breathe disease: pass — Standard Puzzle would only check end-state; Aperture rejects mid-game placements that would close the aperture, excluding solutions Puzzle would accept.
- Pipeline disease: pass — choice of (piece, rotation, origin) remains; new gating is added.
- Scar disease: pass — APERTURE and K are fixed at generation, visible from move 1.

**Estimated implementation complexity (S/M/L):** M (region mask renderer, per-placement region-empty-count check, win predicate split between APERTURE and non-APERTURE).

**Immediate suspicion / risk:**
The "cap K" feels like a numeric knob bolted on. If K is large enough that no realistic placement triggers it, the rule is vestigial. If K is tight, generation success may collapse. Needs careful calibration. Also: if APERTURE is small enough, it might be solvable by a single-piece placement, which trivializes ordering.

---

### Candidate: Pulse
> ID: C42


**Core rule (one sentence, mechanics-speak):** On odd-numbered placements (1st, 3rd, 5th, …) line-clear acts on rows only (no column clears); on even-numbered placements (2nd, 4th, …) line-clear acts on columns only (no row clears). The active axis is announced in the status indicator.

**Antagonist:** The axis schedule. A row that is full at the end of an even-numbered placement does NOT clear that turn; the player must wait until the next odd turn to trigger it, and meanwhile the row is just dead occupied space.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The fixed-axis clear. Wanted: knowing the next clear is row-only lets you build a row across multiple turns without worrying about a column completing it accidentally. Feared: a column you just spent three turns assembling won't clear if you complete it on the wrong turn — it sits there blocking.

**New placement question introduced (versus Classic):** "Should I complete this line now, or hold it until the axis flips?"

**Why order matters:** Two valid placements that differ only in order land on different parities, so a clear that fires under order A doesn't fire under order B. Choosing which placement is "this turn" vs "next turn" picks the axis you'll clear on.

**Why negative space matters:** Empty cells that would *almost* complete a column on an odd turn are wasted slots for that turn; the player learns to leave column-completing pieces for even turns and row-completing pieces for odd turns, and where to leave the "not yet" gap depends on the parity.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim: track placement count, detect-and-clear filtered by current axis, snapshot final board. Provably solvable.

**Anti-pattern screen:**
- Mirror disease: pass — axis is a function of placement count, not move identity.
- Breathe disease: pass — strictly weaker clear predicate than Classic; the difference is observable.
- Pipeline disease: borderline — removes the "either-axis can clear" option from each turn, but adds a temporal-planning dimension (which axis are you completing next?). Net: agency-shape changed, not simply removed; pass.
- Scar disease: pass — schedule is alternating and announced.

**Estimated implementation complexity (S/M/L):** S — placement-count parity gate inside detectCompletedLines.

**Immediate suspicion / risk:** Only "half" the clear options per turn may make the board fill up faster and the run end quicker — needs a generator pass to confirm the difficulty curve is reasonable. Also: reads as a flavor-of-Classic and may feel underweight relative to other candidates.

---

### Candidate: Carve
> ID: C43


**Core rule (one sentence, mechanics-speak):** The board starts fully (or near-fully) filled with pre-fill cells; each "placement" of a tray piece *erases* the cells under its footprint instead of writing them, and the round ends when the board's empty pattern matches a target negative.

**Antagonist:** The pre-fill itself, plus the line-clear rule turned hazard — completing a line during carving auto-refills that row/column with pre-fill (the "tide returns"), so over-clearing rebuilds the board you're trying to dismantle.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Footprint coverage. A larger piece carves more cells per move (good — fewer pieces left to spend) but is more likely to expose a row that's already mostly empty, triggering the tide refill that undoes prior carving (bad).

**New placement question introduced (versus Classic):** "Which filled cells do I want to *keep*?" — the player chooses subtraction rather than addition, and must navigate the carving piece around cells that need to remain.

**Why order matters:** Once a cell is carved, it cannot be re-filled by a tray piece (pieces only carve), only by triggering the tide. So early carving permanently changes the legal placements for later pieces — a piece that needs a 2×2 of filled cells to land on cannot use a region that was carved earlier.

**Why negative space matters:** The win condition IS the negative-space pattern; every empty cell you create is committed unless you intentionally trip a tide refill. Empty cells also block subsequent piece footprints, so each carve constrains future placements.

**Solvability strategy (constructive proof — usually forward-simulation):** Mirror of `puzzleGenerator`: start with the target empty-pattern as a fully-filled board minus the target negatives. Forward-sim *carving*: at each step enumerate (orientation, origin) where every footprint cell is currently filled; pick one randomly; carve. The end state of the simulation is the start board for the player; running the tray in reverse order solves it. Tide refills can be modelled by having the simulator probabilistically write back a row instead of carving — same constructive proof.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — the placement decision is "where to remove cells"; nothing is added that's a function of the chosen footprint, the inversion makes the same primitive (footprint application) do new work (subtraction).
- Breathe disease (rule auto-implied by other rules): pass — the tide-refill rule is not implied by carving; without it, line-clears would be impossible (no full lines ever), with it they become an active hazard.
- Pipeline disease (agency removed without comparable agency added): pass — agency is added (the carving placement question is new) without removing the existing place-from-tray-slot agency.
- Scar disease (random uncontrollable punishment): pass — tide refills are deterministic consequences of completing lines via carving (which the player triggers and can predict), not RNG.

**Estimated implementation complexity (S/M/L):** M — needs an inverted placement validator (cells-must-be-filled), an inverted "applyPlacement" (writes nulls), a tide refill detector (full lines after carving — vacuous; the relevant detector is empty-line detection that triggers refill), and a carving forward-sim generator.

**Immediate suspicion / risk:** Whether tide refill is genuinely a meaningful tool/threat or just chaos. If carving never produces empty rows/cols (which is likely with small pieces on an 8×8), the tide rule never fires and the mode collapses to "use your N pieces to remove K cells" — a constraint puzzle without the dual-purpose mechanic. Needs forward-sim tuning to ensure trays are sized so emptying a full line is a genuine option a player would consider.

---

### Candidate: Vault-I
> ID: C44


**Core rule (one sentence, mechanics-speak):** The board has K (e.g. 3) VAULT cells pre-marked at puzzle start (sentinel-marked, but empty); the player's goal is to FILL exactly the vault cells AND nothing else by the time the finite tray is exhausted, and a vault cell, once filled by any placement, cannot be cleared (line clears that pass through a filled vault cell skip that cell, leaving it filled — same mechanic as walls in Quarantine but with a positive role).

**Antagonist:** The vault cells — they are the targets, but they are 1×1 cells distributed in places where naïve placement also fills neighboring cells that THEN must be cleared away.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Line clears — wanted (clear away non-vault fill that placements left behind), feared (clearing a row/col that DOESN'T contain a vault is fine, but the clear may delete a piece you intended as scaffolding for a vault-fill later).

**New placement question introduced (versus Classic):** "Which placement covers a vault cell exactly, while leaving the rest of its footprint in cells that will become part of a clearable row/col?" Each piece must do double duty: deposit on a vault, and bury its other cells in a future clear lane.

**Why order matters:** Vaults filled early stay filled forever and become permanent obstacles for later placements.

**Why negative space matters:** Win check is "vaults filled, ALL OTHER cells empty"; every non-vault filled cell at end is a violation. Empty cells = the win.

**Solvability strategy (constructive proof — usually forward-simulation):** Reverse-puzzle generator: forward-sim a sequence of pieces that CLEAR back to a state with K filled cells; mark those K filled cells as the vaults. Pre-mark them on the puzzle board (still empty). Sim's order is the solution.

**Anti-pattern screen:**
- Mirror disease: pass — vaults are a property of the board, not a function of the placement decision.
- Breathe disease: borderline — could the win condition (board exactly equals vault set) be auto-implied by the forward-sim's stopping state? No — the player can fill vaults in wrong order, leaving non-vault cells unclearable. So the rule is not auto-satisfied.
- Pipeline disease: pass — adds a vault-routing constraint on top of placement.
- Scar disease: pass — vaults visible from turn 0, fully deterministic.

**Estimated implementation complexity (S/M/L):** S-M — sentinel for vault-marker (empty but special), clearing-skip-vault-if-filled is a small extension to the clear function (already present for walls), win check is straightforward.

**Immediate suspicion / risk:** Risk of feeling like Quarantine inverted (Quarantine: walls block placements; Vault: filled-vaults block clears). Need to test that the filled-vault-as-permanent-obstacle creates a different planning question than walls do.

---

### Candidate: Vermin
> ID: C45


**Core rule (one sentence, mechanics-speak):** N "vermin" markers each occupy a single cell (sentinel color, counts as filled for clears); after every placement, each surviving vermin attempts to walk one cell (deterministic priority: down > right > up > left, choosing the first direction whose target cell is empty), swapping with the empty cell — so the vermin moves and leaves an empty cell behind; a vermin that completes a walk into one of a small set of pre-marked "nest" cells wins for the antagonist (loss); a vermin destroyed by being included in a line clear, OR boxed in (no legal walk direction at its scheduled step), is removed; round ends in win when all vermin are removed AND the tray is empty.

**Antagonist:** Vermin tokens with a fixed pursuit goal (reach a nest cell) and a deterministic, public movement rule.

**Dual-purpose mechanic:** Empty cells around a vermin. The player wants empty cells (to place pieces and complete clears) but fears them around a vermin (because empty neighbors are exactly the cells a vermin can step into to advance toward its nest). Plugging an empty cell next to a vermin is both useful (board control) and dangerous (you may close off the vermin's escape only on the wrong side, leaving its preferred path open).

**New placement question introduced (versus Classic):** "After this placement, which direction will each vermin walk on the resolution step, and does any of them step into a nest?" Classic doesn't track moving entities.

**Why order matters:** Vermin walk after every placement, so two pieces in different orders cause different vermin trajectories — the same final board can be reached with the vermin already in a nest (loss) or boxed in (cleared).

**Why negative space matters:** The vermin's deterministic walk reads empty cells. The shape of the empty region around a vermin is the antagonist's playing field. Placing to deny a SPECIFIC empty neighbor (not just any empty cell) is the central tactical move.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim: seed vermin, seed nests far from vermin, sample tray, walk tray, after each placement step the vermin per the rule, choose placements (uniformly at random over legal ones) such that no vermin reaches a nest and at least one vermin is destroyed each pass. Accept runs where all vermin are removed by tray-end. The accepted run IS the solution.

**Anti-pattern screen:**
- Mirror disease: pass — vermin movement is separate state, not a function of the placement.
- Breathe disease: pass — "all vermin removed" is not implied by Classic clear rules; you can clear lines all day and still lose to a vermin walking into a nest you didn't block.
- Pipeline disease: pass — nothing removed; new agency (boxing-in routes, deciding which vermin to attack first) added.
- Scar disease: pass — vermin walking direction is a fully public deterministic function of the current board.
- (borderline note: ties hard to deterministic priority order — if players can't predict it the rule collapses to random pursuit, so the priority must be visible — e.g. an arrow on each vermin showing its next step.)

**Estimated implementation complexity (S/M/L):** L. Multiple moving entities with a per-piece schedule; UI must render movement and an arrow per vermin; nest cells; generator must do augmented forward-sim with vermin reasoning. The most expensive idea in this batch.

**Immediate suspicion / risk:** Movement priority feels gamey ("south first") and hard to explain in onboarding. If the priority is too simple, players solve it once and find the optimal "always corner the vermin in the SE quadrant" move. May also produce boards where the player can't even trigger the first vermin step productively, hard to balance.

---

### Candidate: Shadow Cast
> ID: C46


**Core rule (one sentence, mechanics-speak):** When the player places a piece at `origin`, the board is updated by writing the piece's *bounding rectangle minus its cells* (the negative-space "shadow"); the piece's actual footprint cells remain empty.

**Antagonist:** The shadow itself. The player wants to place the piece's solid cells where target cells are needed, but it's the shadow (the bounding-box gaps) that actually gets written — so pieces with lots of internal holes (L-pieces, T-pieces, U-shapes) are powerful writers, while compact pieces (squares, bars) write almost nothing.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Bounding box. A 4×4 bounding rect with a 5-cell pentomino inside writes 11 shadow cells (many) — high coverage but rigid placement constraints (the whole 4×4 must be in-bounds and clear). A tight 2×2 piece writes 0 shadow cells — ineffective. Player wants a piece with high bbox-to-cells ratio (writes a lot) and fears its placement difficulty (large bbox = rare valid origins).

**New placement question introduced (versus Classic):** "Where can the *gaps in this piece* land usefully?" — the player must mentally invert the piece before scanning for placements.

**Why order matters:** Shadow cells fill the board; a written shadow cell at (r, c) blocks any later piece whose footprint OR bounding-box-shadow would overlap (r, c). Order of writes determines which subsequent pieces have legal origins.

**Why negative space matters:** Negative space inside each piece *becomes* the positive space on the board. The player thinks in terms of piece-holes, not piece-cells. The relationship between piece geometry and board geometry is inverted.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim with `applyShadowAndClear`: at each step enumerate orientations and origins where the entire bounding rect fits in-bounds AND every shadow cell is currently empty (the piece-cells positions don't matter for clash since they're not written). Pick one uniformly. Snapshot end board as target. Line clears trigger off the shadow-written board. Solvability proof identical to puzzle's.

**Anti-pattern screen:**
- Mirror disease: pass — the shadow-write is a transformation of the placement footprint, but the placement *decision* (which orientation, which origin) drives a write that has fundamentally different topology than the piece. The decision input isn't merely doubled; it's transformed.
- Breathe disease: pass — shadow casting isn't implied by anything; remove it and you have a different game (piece-cells written, like Classic).
- Pipeline disease: pass — adds a new placement-question (think in terms of holes) without removing existing agency.
- Scar disease: pass — fully deterministic.

**Estimated implementation complexity (S/M/L):** S — change the placement-write helper to compute shadow cells, change collision check to test shadow cells against board (and bounding-rect bounds against board edges). Existing line-clear/target-match infrastructure works unchanged.

**Immediate suspicion / risk:** Tight pieces (1×1 monomino, 2×2 square, 1×N bars) have no shadow — they're inert. The tray must exclude these or they become visual junk. Also, the inverted thinking is hard for new players; the "10th-play test" might still be confusion rather than mastery. Suspect this lands as a brain-teaser puzzle mode, not a casual mode.

---

### Candidate: Fuse
> ID: C47


**Core rule (one sentence, mechanics-speak):** Pre-fill cells are FUSE cells with integer countdowns 1..K painted on them; every placement decrements every fuse's counter by 1, a fuse at 0 explodes and converts each of its 4-neighbor empty cells into permanent indestructible WALLs at the start of the next turn, and the round is won when the board occupancy matches a target pattern with no fuses remaining (every fuse must be removed via row/column clear before it reaches 0).

**Antagonist:** The fuse cells with countdowns. Their state advances on every placement regardless of player intent.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Placement itself — every placement is required to make progress toward the target, but every placement also ticks every fuse closer to detonation, including fuses the player hasn't yet had a chance to clear.

**New placement question introduced (versus Classic):** "Which placement clears a fuse-bearing row/column THIS turn (before its counter ticks again) AND fits the partial target, when I have only N placements left and K fuses each ticking on every placement?" Each placement is dual-coded (target progress + fuse defusal scheduling).

**Why order matters:** A placement that defuses fuse A first leaves fuse B with one fewer tick of slack than the reverse order. Fuses with low counters must be cleared early; fuses with high counters can be deferred but only at the cost of using a turn that doesn't progress the target. Solving requires an ordering where every fuse is cleared before its counter hits 0.

**Why negative space matters:** Empty cells adjacent to fuses are the cells that will become permanent walls on detonation — they must either be filled before detonation, or kept as the empty cells the target wants. The empty pattern around each fuse is part of the puzzle.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim variant: start with empty board, run standard puzzle forward-sim with N+1 pieces to produce a target. Then walk backwards: insert F fuse cells along the rows/cols that the sim cleared, recording for each fuse the placement-index at which the sim's clear event removed it. Set each fuse's countdown to (its-clear-index − 0) so the sim is exactly tight. Pre-fill = fuses; solution = the sim's tray order. Provably solvable because the sim is the proof.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — fuse decrement is global per turn (not a function of the placement's footprint), and the player chooses where to place, so the placement decision is single-valued (footprint) but the fuse state introduces an independent dimension (which fuse to clear next).
- Breathe disease (rule auto-implied by other rules): pass — the win check (target match + no fuses) is NOT auto-satisfied by the target; the forward-sim only chose a placement order that happens to clear in time, the player must rediscover one.
- Pipeline disease (agency removed without comparable agency added): pass — adds the agency of "scheduling defusals against a global clock" on top of standard placement choice; nothing is taken away.
- Scar disease (random uncontrollable punishment): pass — fuse positions and countdowns are visible from turn 0 and fixed; detonation is fully deterministic given the player's placement order.

**Estimated implementation complexity (S/M/L):** M — needs new sentinel cell type with overlay number, generator that decorates a sim's clear events with fuse countdowns, win-check extension, walls already exist (from Quarantine).

**Immediate suspicion / risk:** The countdown overlay number on a cell is a new UI primitive — needs to render legibly inside a board cell. Generator must guarantee the fuse-clear schedule is feasible; if too many fuses share a row/col the puzzle reduces to "do the obvious clear" which collapses the dual-coding.

---

### Candidate: Charges
> ID: C48


**Core rule (one sentence, mechanics-speak):** Endless Classic-style mode where the player accumulates "charge" by clearing lines (1 charge per cleared line, hard-capped at K=5) and may spend 3 charges to discharge a single chosen empty 3×3 region's "live" sentinel cells (pre-seeded in a known pattern that grows by 1 cell per turn), with game-over triggered when the sentinel cells fully fill the board OR no piece fits.

**Antagonist:** A deterministic per-turn growth schedule: every turn after a placement, one specific empty cell (chosen by a fixed walk order — top-left scanline — over empties, NOT RNG) becomes a sentinel "creep" cell that occupies the cell but cannot be cleared by row/col clears.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Line clears — wanted because they generate charge and free space, feared because they reset combo only when they *don't* trigger a charge cap (over-cap clears waste).

**New placement question introduced (versus Classic):** "Do I clear this line now to bank a charge (limited storage) and lose access to the row of pre-creep cells the clear would have removed for free, or do I let the row stay full so the creep walks past those cells without converting them?"

**Why order matters:** Creep cells are written in a deterministic walk order, so the player can predict exactly which empty cells become creep next turn. Placement order changes which cells are empty at the moment the walker advances, deterministically reshaping where the creep lands.

**Why negative space matters:** A cell only gets creep-ified if it is *empty* at the walker's current position. Filling the cell with a placement immunises it for one turn (placement happens before walker). The negative-space pattern *is* the creep schedule.

**Solvability strategy (constructive proof — usually forward-simulation):** Game-over inevitable in finite turns (creep monotonically grows in worst case), but generator proves a survival floor: forward-sim with a greedy "always place to cover the next walker cell, spend 3 charges to nuke the worst cluster when board > 50% filled" strategy must survive M turns for the difficulty to be considered shipping-ready.

**Anti-pattern screen:**
- Mirror disease: pass — discharge target is a free 3×3 origin choice independent of placement.
- Breathe disease: pass — creep walker is an independent system; without it the mode is just Classic.
- Pipeline disease: pass — adds a new action (discharge) and a new resource axis (charge), not subtracts.
- Scar disease: pass — the walker order is deterministic and pre-displayed (UI overlay shows the next 3 cells the walker will touch).

**Estimated implementation complexity (S/M/L):** M — walker state in GameState (next walker index), charge counter, discharge-targeting UI (select 3×3 origin like a piece-placement gesture), and a "next walker cells" preview overlay reusing the target-overlay infrastructure.

**Immediate suspicion / risk:** Showing the next walker cells via overlay risks visual clutter on top of the placed pieces. The 3×3 discharge area is large relative to the board (14% of cells); may be too forgiving and reduce charges to a "panic button" with no positional thought. Tune K and discharge size together.

---

### Candidate: Census
> ID: C49


**Core rule (one sentence, mechanics-speak):**
After every placement (and any resulting line clears), compute the multiset of 4-connected EMPTY-cell component sizes; the win condition requires this multiset to exactly equal a target multiset (e.g. `{8, 5, 3}`); an explicit per-puzzle "ceiling" multiset must also dominate the running multiset at every intermediate step (no component may grow larger than the largest ceiling entry, no more components than the ceiling allows).

**Antagonist:**
Empty-component fragmentation. The player must shape the *holes* into a precise inventory of sizes — too-merged or too-shattered both fail.

**Dual-purpose mechanic:**
Line clears. A clear merges previously-isolated empty regions into one big region (good for splitting later? bad for present sizes?). Each clear is a high-energy reshape of the empty-component multiset that may save or doom the run.

**New placement question introduced:**
"What does the empty-component histogram look like after this placement?" — the player tracks a number-of-holes-of-each-size budget, never asked in any other mode.

**Why order matters:**
A piece that merges two small holes into one medium hole has a different effect on the histogram than placing a different piece first that subdivides one of the small holes into singletons. The same final filled-cell set can be reached by sequences with different intermediate histograms; only sequences that never violate the ceiling reach the win.

**Why negative space matters:**
The entire win predicate is computed on empty-cell connectivity; the filled-cell set is irrelevant beyond determining where the holes are. Two solutions with identical empty-component multisets but different filled-cell colorings both win.

**Solvability strategy:**
Forward-sim a tray onto an empty (or lightly pre-filled) board; at the end, compute the empty-component multiset and use that as both the target and the ceiling (ceiling = elementwise max of running histogram observed during sim). Sim is by construction a valid play. Reject sims with degenerate multisets (singleton, or all cells in one component).

**Anti-pattern screen:**
- Mirror disease: pass — the histogram check is over the empty cells, not over a function of any single placement.
- Breathe disease: pass — Standard Puzzle's positive-fill match doesn't determine the empty-component histogram (two different positive-fill targets can have the same histogram, and one positive-fill target can be reachable with multiple histograms depending on order).
- Pipeline disease: pass — placement freedom unchanged; new constraint added on top.
- Scar disease: pass — target and ceiling are fixed at puzzle generation.

**Estimated implementation complexity (S/M/L):** L (per-placement BFS over empty cells, multiset comparison UI, ceiling rendering — abstract for the player to read).

**Immediate suspicion / risk:**
**Borderline.** The histogram is hard to display — the player must continuously parse "how big is each hole?" A cell-color overlay (hue per component) helps but adds noise. Also: if the ceiling is loose, the rule degenerates to "match the histogram only at end" which is more like Puzzle. If too tight, generation fails frequently. The mode might be brilliant or unplayably abstract — needs prototype.

---

### Candidate: Charge
> ID: C50


**Core rule (one sentence, mechanics-speak):**
The board carries a "charge meter" 0–7; placing a piece adds (cellCount − 3) to the meter (positive for tetrominoes/pentominoes, negative for monominoes/duominoes); a row/column clear is *only* triggered when the meter is ≥ 4 at the moment the row fills, otherwise the row stays full and continues to count toward future clears.

**Antagonist:**
Cold board — if the meter sits at 0 because the player has been placing small pieces, even a fully-filled row won't clear, and the board fills up.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):**
Large pieces — they raise the meter (good, you can clear) and also fill the board faster (bad, you have less room).

**New placement question introduced (versus Classic):**
"Should I place this small piece now and bank a clear for later, or dump a tetromino to spend charge and clear immediately?" — piece selection (slot choice) now binds clear-availability.

**Why order matters:**
Placing the pentomino last wastes its charge if no row is near-full; placing it first banks charge for the small pieces' final fills.

**Why negative space matters:**
Holding rows at 7/8 filled is a deliberate strategy — you accumulate charge first, then close the row; empty cells become "charge wallets."

**Solvability strategy (constructive proof — usually forward-simulation):**
Forward-simulate tracking the meter; when picking placements, weight the random choice toward those that respect the meter constraint at the moment of any line completion. Trajectories that triggered ≥ 1 charge-gated clear are accepted.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — piece cellCount is part of the existing decision, but the meter is a *cumulative* state across placements, so the rule depends on history, not a single decision.
- Breathe disease (rule auto-implied by other rules): pass — Classic clears every full row; charge-gating breaks that.
- Pipeline disease (agency removed without comparable agency added): pass — slot/origin/rotation agency intact; a new resource-management decision is added.
- Scar disease (random uncontrollable punishment): pass — meter is visible; charge changes are deterministic.

**Estimated implementation complexity (S/M/L):**
M — adds a `chargeMeter` field, modifies `applyPlacementAndClear` to consult it, needs a meter UI element.

**Immediate suspicion / risk:**
"Banked full rows" is visually confusing — a fully-filled row that doesn't clear looks like a bug; need a strong UI affordance (pulsing border) to communicate "armed but uncharged."

---

### Candidate: Magnet
> ID: C51


**Core rule (one sentence, mechanics-speak):** Each row carries a row-polarity (+ or −) and each column carries a column-polarity, fixed at puzzle start; a piece carries one polarity tag (drawn from the catalog like color); placing the piece is legal only if the placement's bounding-box CENTER row and CENTER column polarities are both EQUAL to the piece's polarity, OR both OPPOSITE — never mixed; win = target match.

**Antagonist:** The polarity grid (row and column tags) and the polarity-tagged tray pieces — together they restrict legal origin to a sparse subset of the board.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Color (recoded as polarity) — wanted because polarity-driven origin restriction makes the puzzle structured (legal moves are few, easy to enumerate), feared because the wrong piece-polarity arriving in the tray can leave a needed cell unreachable.

**New placement question introduced (versus Classic):** "Of the (origin, rotation) pairs that geometrically fit, which ones have polarity-consistent center coordinates for this piece?" Rotation may shift the bounding-box center by half a cell; the polarity rule turns rotation into a polarity decision.

**Why order matters:** Polarity restrictions don't depend on board state, but pre-fill clearing changes which rows/cols become reachable for later placements (a row that remains partially blocked by pre-fill restricts which centers are achievable).

**Why negative space matters:** Same as Puzzle, plus: cells whose row/col polarity combination matches no tray piece are dead cells — the target must avoid them.

**Solvability strategy (constructive proof — usually forward-simulation):** Generator first samples row + col polarities, then forward-sims pieces whose polarity is sampled to match the placement's center polarity at each step. Sim is the proof.

**Anti-pattern screen:**
- Mirror disease: borderline-pass — the polarity check is a function of placement origin (existing decision), but it FILTERS legal placements rather than ADDING side-effects, so it doesn't fail the disease in the same way Mirror mode does (Mirror writes additional cells, polarity just gates). The new decision is "which orientation centers the piece on a polarity-legal row/col," which is a real choice.
- Breathe disease: pass — polarity is enforced live, not auto-implied by target.
- Pipeline disease: pass — restricts legal moves but adds the polarity-planning dimension.
- Scar disease: pass — polarities are visible.

**Estimated implementation complexity (S/M/L):** M — row/col polarity strip UI on board edges, per-piece polarity tag, placement validator gains polarity check.

**Immediate suspicion / risk:** The "center" definition for even-sized pieces is fractional — needs a precise rule (e.g. floor of (top+bottom)/2). Could feel arbitrary; players need to read both row and col polarity strips on every move. Borderline as the gating rule may not feel substantively different from the geometry rule it composes with.

---

### Candidate: Diagonal Cull
> ID: C52


**Core rule (one sentence, mechanics-speak):** Standard placement, but the line-clear predicate is replaced with: any of the 15 diagonals of length ≥ 4 (8 NE-SW + 7 NW-SE that fit) that are entirely filled clears that diagonal. Rows and columns never clear.

**Antagonist:** The diagonal axes themselves: pieces are axis-aligned rectangles of cells, so completing a diagonal requires interleaving pieces that land at staircased offsets — a 1×4 placed horizontally contributes one cell to four different diagonals at once.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Multi-diagonal contribution per cell. Wanted: a single piece advances multiple diagonal-completions. Feared: it advances diagonals you can't finish, leaving cells stranded in lines that will never clear because there's no piece shape that can plug a one-cell hole at a non-axis-aligned position.

**New placement question introduced (versus Classic):** "Which of the 4 diagonals through this cell can I actually complete given my tray?"

**Why order matters:** A diagonal through positions (0,0), (1,1), (2,2), (3,3) needs four placements at staircase-offsets; the order of those placements decides whether you can fit the next axis-aligned piece around the partial staircase.

**Why negative space matters:** Empty cells along an in-progress diagonal are the only positions the next piece in the chain can target; wide swathes of empty negative space along the diagonal axis directly equal "diagonals I can still finish."

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim with the diagonal-clear predicate. Generator picks tray, places at random legal (axis-aligned) positions, checks diagonals after each, snapshots final board. Provably solvable by construction.

**Anti-pattern screen:**
- Mirror disease: pass — clear axis (diagonal) is fixed at game start, not derived from any move.
- Breathe disease: pass — diagonal clears are an entirely new predicate, not auto-implied.
- Pipeline disease: pass — choice space unchanged or expanded (more clear options).
- Scar disease: pass — diagonal axes are visible board geometry, fixed from turn 1.

**Estimated implementation complexity (S/M/L):** S — the only behavioral change is the line-detection function; everything else stays.

**Immediate suspicion / risk:** Diagonals are hard to read on an 8×8 grid without diagonal gridlines drawn. Also: tray pieces being axis-aligned may make some diagonal-completions structurally impossible (need to verify with the generator that the success rate isn't dismal).

---

### Candidate: Companion
> ID: C53


**Core rule (one sentence, mechanics-speak):**
The first piece placed from each fresh tray (tray refill marks slot 1 as "anchor") establishes an anchor color; every subsequent piece placed from the same tray (slots 2 and 3) must share at least one footprint cell that is 4-adjacent to the anchor's footprint OR to a previously-placed companion's footprint, forming a single tray-component that breaks when the tray refills.

**Antagonist:**
Anchor isolation — if the first placement lands in a corner pocket, slots 2/3 must extend outward from the corner; cleared rows can erase the anchor mid-tray, leaving slots 2/3 with no companion seed.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):**
Adjacency to anchor — needed to validate the placement, feared because it pulls the next piece into the same region of the board, restricting where you can set up clears.

**New placement question introduced (versus Classic):**
"Where do I put the anchor so that the remaining two pieces can chain off it AND set up the clear I want?" — first-placement origin binds the legal regions for the rest of the tray.

**Why order matters:**
Anchor first vs. anchor last is meaningless because slot 1 is always the anchor (refill convention), but the choice of *which* tray piece you treat as anchor (by reordering the tray once) is itself a planning decision in difficulty modes that allow it.

**Why negative space matters:**
A pocket adjacent to the anchor must remain empty enough to accept the second piece; the player must preserve a contiguous adjacency-rich neighborhood around the anchor.

**Solvability strategy (constructive proof — usually forward-simulation):**
Forward-simulate by placing the first piece anywhere legal, then enumerating placements for slots 2/3 restricted to the companion-adjacency rule. Trajectories that complete the tray are valid.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — anchor placement determines the *region* of legal companion placements but neither the orientation nor the exact origin within the region; the player still has multiple decisions per piece.
- Breathe disease (rule auto-implied by other rules): pass — Classic doesn't require cross-piece adjacency.
- Pipeline disease (agency removed without comparable agency added): pass — slot 1 is consumed first by convention, but in exchange for a new "anchor placement plans the next two" decision.
- Scar disease (random uncontrollable punishment): pass — adjacency is fully visible and deterministic; even tray-refill is rule-driven, not RNG-punishment.

**Estimated implementation complexity (S/M/L):**
M — needs `anchorFootprint` and `companionFootprints` state per tray, validation in `PLACE_PIECE`, and a UI overlay highlighting legal companion zones (similar to Monolith's touch-highlight).

**Immediate suspicion / risk:**
Overlap with Monolith mode — "must touch existing component" feels close. Distinction: Monolith has a *board-persistent* component; Companion resets every tray refill, so the constraint has rhythm. Borderline candidate.

---

### Candidate: Vault-II
> ID: C54


**Core rule (one sentence, mechanics-speak):**
The puzzle declares one or more TREASURE pre-fill cells (rendered as a sentinel color) and a "shell radius" r ∈ {1, 2}; the win check requires that, at game end, every TREASURE cell is empty (cleared away) AND the 4-connected ring of cells at exactly Chebyshev distance r from each TREASURE position is fully filled (the "shell"); during play, no placement may write a cell at Chebyshev distance < r from any current TREASURE cell.

**Antagonist:**
A no-go zone around each TREASURE that shrinks only when the TREASURE cell itself gets cleared (via a row/col clear that includes it). The player must engineer clears that delete the TREASURE while leaving the shell intact.

**Dual-purpose mechanic:**
Line clears. A clear is the only way to remove TREASURE (mandatory) but the same clear erases everything else in the row/col — including shell cells the player has been carefully building. The clear is needed but actively fights the win condition.

**New placement question introduced:**
"Does this footprint dip into the no-go zone of any uncleared TREASURE, and if not, am I building the shell correctly?" — placement legality + a positive sub-goal (shell fill).

**Why order matters:**
Building shell cells before clearing TREASURE means the clear that removes TREASURE will also damage the shell (need to refill). Clearing TREASURE before shell-building gives a clean slate but the player may exhaust the tray before shell fill is complete. Sequencing TREASURE-clear vs. shell-build is the central decision.

**Why negative space matters:**
The win check requires specific cells (TREASURE positions) to be EMPTY at game end. The shell fill is positive, but the TREASURE-must-be-empty is the load-bearing negative-space requirement, and intermediate placements are gated by proximity to TREASURE empties.

**Solvability strategy:**
Generator: seed 1–3 TREASURE cells in interior positions. Define shell as ring at distance r. Build a tray that includes (a) at least one piece capable of triggering a TREASURE-containing row/col clear in the simulated mid-game, and (b) enough remaining pieces to refill the shell after the clear. Forward-sim with the no-go rule active; accept sims where final TREASURE cells are empty and shell cells are filled.

**Anti-pattern screen:**
- Mirror disease: pass — the no-go zone is a function of TREASURE position (puzzle data), not of any placement.
- Breathe disease: pass — Puzzle's target-match doesn't enforce mid-game proximity rules; Vault excludes sequences that overlap TREASURE before clearing it.
- Pipeline disease: pass — full placement agency.
- Scar disease: pass — TREASURE positions, no-go radius, and shell are all fixed and visible at puzzle start.

**Estimated implementation complexity (S/M/L):** M (proximity check during placement, shell rendering distinct from positive target, win predicate split positive+negative).

**Immediate suspicion / risk:**
"Chebyshev distance" as a player-facing concept is awkward; render the no-go zone as a halo. Risk that it just becomes "negative pre-fill that goes away when you clear the row" — which is close to Puzzle mode's existing pre-fill story. Differentiation hinges on the no-go zone being a real placement constraint, not just visual.

---

### Candidate: Solvent
> ID: C55


**Core rule (one sentence, mechanics-speak):**
Each cell of the board has an integer "moisture" counter starting at 0; every empty cell at the end of a turn (i.e. unfilled after placement + any clears) has its counter incremented by 1; any cell whose counter reaches a per-puzzle threshold M (e.g. 4) becomes a permanent indestructible block on the board (sentinel color, never clears, blocks placement); the win condition is to empty the tray AND have at least N specific TARGET cells filled at game end.

**Antagonist:**
Decay. Empty cells rot into walls if the player ignores them too long. The board self-fortifies against the player.

**Dual-purpose mechanic:**
Empty cells. The player needs empty cells to land pieces in (Classic), and also needs to *cover* empty cells before they ossify into walls. Every empty cell is a placement opportunity AND a future hazard.

**New placement question introduced:**
"Is that empty cell about to ossify, and if I don't cover it now, will the resulting wall block the only path I had for the next piece?" — adds a per-cell time-pressure layer absent from every other mode.

**Why order matters:**
A cell at moisture 3 ossifies on turn N+1 if not covered on turn N. Choosing which threatened cell to cover this turn is order-coupled across pieces (the piece that fits one cluster may not fit the other).

**Why negative space matters:**
Every empty cell carries a moisture state that the player must read. Empty cells are not interchangeable; each one is a count-down. Two boards with identical filled patterns but different moisture maps are different game states.

**Solvability strategy:**
Forward-sim with the moisture tick live: seed board, pick tray, simulate; at each step the sim's chosen placement must be the one that satisfies the moisture rule (i.e. covers any cell about to hit M). Accept simulations whose final board has the specified TARGET cells filled and no premature game-over (game-over = ossification produces a board where the remaining tray cannot place anywhere). The sim is a constructive solution.

**Anti-pattern screen:**
- Mirror disease: pass — moisture is per-cell engine state, not a function of any single placement geometry.
- Breathe disease: pass — Puzzle's positive-fill check ignores empty-cell history; Solvent rejects long sequences that leave cells untended.
- Pipeline disease: pass — placement choice remains free; new pressure added (cover threatened cells).
- Scar disease: borderline — ossification is **deterministic** (counter hits threshold, predictable from visible state), not random, so it's NOT scar disease. But it FEELS punitive; needs UI that surfaces moisture clearly (numeric overlay or color saturation).

**Estimated implementation complexity (S/M/L):** L (per-cell counter state, render moisture, ossification animation, augment placement engine).

**Immediate suspicion / risk:**
Moisture displayed as numbers is ugly; as opacity ramps, hard to read precisely. Players may mis-count and feel cheated. Also: if M is too high, the rule never triggers in short tray runs. If too low, the board ossifies into a Quarantine-like fixed walls shape regardless of play, and the mode collapses to "place pieces in the residual region."

---

### Candidate: Polarity-I
> ID: C56


**Core rule (one sentence, mechanics-speak):**
Each tray piece carries a polarity sign (+/−) drawn from a fixed cycle (++−, −++, +−−); a placement is legal only if the sum of polarity-weighted cells in every row and column it touches stays within [−3, +3] after the placement (each placed cell contributes its piece's polarity to the count of every row and column its cell occupies).

**Antagonist:**
Polarity drift — repeated same-sign placements push a row's running sum to ±3, after which the only legal placements in that row must be opposite sign; if the tray runs three same-sign in a row, certain rows become locked to that sign for the rest of the tray cycle.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):**
Sign accumulation: pushing a row's sum toward an extreme is necessary to set up clears (you want filled rows), but it forecloses future placements of the same sign there.

**New placement question introduced (versus Classic):**
"Which row's polarity budget am I willing to spend on this piece?" — orientation and origin now bind a polarity ledger, not just empty cells.

**Why order matters:**
Placing the +1 piece first frees the −1 piece to balance the same row; reversing order can lock the row out for the −1 piece because it would push past −3.

**Why negative space matters:**
Empty cells in a row aren't equivalent — empty cells in a row near its ±3 cap behave like blocked cells for same-sign pieces, so the player must reason about polarity-empty rather than geometry-empty.

**Solvability strategy (constructive proof — usually forward-simulation):**
Sample tray with a balanced sign sequence (forced count of each sign equals piece count / 2), forward-simulate restricting placements to those keeping all row/col sums in [−3, +3]; the trajectory itself is a solution.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — polarity-of-piece is fixed at tray sample but origin/orientation are free, and the polarity rule rejects some origins another origin would allow, so the rule is not a function of any single existing decision.
- Breathe disease (rule auto-implied by other rules): pass — Classic geometry permits placements that the polarity check rejects.
- Pipeline disease (agency removed without comparable agency added): pass — slot order is free; the new ledger management is added agency.
- Scar disease (random uncontrollable punishment): pass — sign sequence is visible at tray reveal and deterministic.

**Estimated implementation complexity (S/M/L):**
M — needs per-row/col polarity state, a +/− badge on each tray slot, and a numeric ledger overlay along the board border.

**Immediate suspicion / risk:**
Numerical rule is hard to read at a glance; risk that players treat polarity as random punishment if the UI doesn't make the row sums tactile. Borderline — could collapse into noise if budget is too tight or too loose.

---

### Candidate: Reservoir
> ID: C57


**Core rule (one sentence, mechanics-speak):** Rotation is repurposed as a consumable currency: the round starts with a global ROTATION RESERVE counter R (e.g. 4), every clockwise rotation of any tray piece spends 1 from the reserve, the rotate button is grayed out at R=0, completing a row/column refunds 1 (cap at R_max), and the round goal is a standard target-match puzzle.

**Antagonist:** The rotation reserve counter — pieces are sampled from the catalog in randomly chosen orientations (some "wrong"), so reserve depletion forces the player to plan rotations as a budget.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Line clears — wanted (still remove pre-fill toward target like Puzzle), additionally wanted because they refund rotations, but the placements that produce a clear may consume rotations to set up.

**New placement question introduced (versus Classic):** "Can I solve this puzzle with at most R rotations? Which placements can I do with zero rotation, and which sequence of clear-producing placements refunds enough rotation budget for the rotation-heavy placements I need later?"

**Why order matters:** Rotation refunds happen at clear-time; a placement that needs 3 rotations to position must be preceded by enough clear-producing placements to fund those rotations.

**Why negative space matters:** Same as Puzzle — empty cells are the target, plus negative space drives whether a row/col can be completed (refunding rotation).

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim: at each step, pick a piece, pick a target-supporting placement, count rotations from spawn orientation to placement orientation, debit reserve, credit refund if clear occurs. Reject sims whose reserve goes negative. Spawn orientations and starting reserve are recorded into the puzzle.

**Anti-pattern screen:**
- Mirror disease: pass — rotation cost is independent of placement geometry; two different decisions (where to place, whether to rotate first).
- Breathe disease: pass — reserve constraint is enforced live, not a post-hoc check.
- Pipeline disease: pass — reserve is a finite resource with player-driven spend/refund; net agency added (resource management) rather than removed.
- Scar disease: pass — reserve and refund rules are deterministic and visible.

**Estimated implementation complexity (S/M/L):** S-M — counter UI, rotate-button gating, refund hook on clear event, generator gains a rotation-cost accumulator.

**Immediate suspicion / risk:** Risks feeling like a Puzzle variant rather than a distinct mode (the new question is "rotation budget" rather than a new placement geometry). Rotation cost might just translate to "spawn pieces in correct orientation," in which case the budget never bites.

---

### Candidate: Carousel
> ID: C58


**Core rule (one sentence, mechanics-speak):** After every placement (whether or not it triggered a clear), the entire board's columns shift cyclically left by one — column c moves to column c-1, column 0 wraps to column 7 — and on the very next placement they shift again; row indices are unchanged, only column identity rotates.

**Antagonist:** The shift itself: a row that is N cells short of completing this turn will be N cells short next turn but with all the holes one column to the left, so a partial bar built across columns 2..6 needs the gap-cell to be planted in column 7 right now, knowing the bar will read as columns 1..5 plus 6 next turn.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The shift. Wanted: it can carry a near-complete row's hole around to land under a piece you're about to drop. Feared: it carries your carefully-stacked vertical column out from under the next vertical piece, breaking column-completion plans.

**New placement question introduced (versus Classic):** "Where is this footprint two placements from now?" — the player must place pieces in coordinates that are valid in a future-shifted frame, not the present frame.

**Why order matters:** The shift count between two placements is exactly the number of placements between them; placing piece A then piece B leaves A two columns left of where it was when B is dropped, so the two placements interlock at a specific lateral offset that order changes.

**Why negative space matters:** A gap at column 0 will be at column 7 next turn (it wraps around); leaving negative space on a wrapping edge is functionally different from leaving it in the interior — wrap-edge holes are reachable by any piece next turn, interior holes only by pieces of matching width.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim the puzzle generator: pick tray, simulate placement on board, then apply the deterministic column shift before the next placement, then place again, etc. Snapshot the final board (after the last shift) as target. Because the simulation IS a legal play sequence, the puzzle is provably solvable.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — the shift is a function of *time* (placement count), not of the player's last move; two different moves at turn T both produce the same shift at turn T+1.
- Breathe disease (rule auto-implied by other rules): pass — the cyclic-column constraint isn't implied by line-clear rules; you can win Classic boards that fail this game and vice versa.
- Pipeline disease (agency removed without comparable agency added): pass — nothing is removed from the player's choice space; a new dimension (planning across a shifting frame) is added.
- Scar disease (random uncontrollable punishment): pass — the shift schedule is announced (one column per placement, deterministic, visible).

**Estimated implementation complexity (S/M/L):** M — board cyclic shift after each placement is O(64), plus a UI tick to animate the shift. Tray and clear logic unchanged.

**Immediate suspicion / risk:** May feel disorienting in a way that destroys the player's ability to read the board at a glance. Test: does the player still see "this row needs the column-3 cell filled" after the column has shifted twice? Likely needs visible column-index labels that ride the shift.

---

### Candidate: Flood
> ID: C59


**Core rule (one sentence, mechanics-speak):** Completing a row or column does NOT clear it; instead it permanently floods every cell in that row/column with an indestructible "water" sentinel color, and the win condition is reaching a target board pattern where specified cells are *empty* (not flooded, not filled by pieces).

**Antagonist:** Water. Once a cell becomes water it can never be removed; water cells block all subsequent piece placements; water spreads only through your own line completions.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Line completion. A finished line in Classic frees space; here it converts that space into permanent obstacle. But the only way to permanently mark cells as "non-empty" relative to the target is via flooding — a target that requires a specific row to be fully solid is reachable *only* by flooding it. Player wants completion (to lock in target cells) and fears it (to avoid locking out non-target ones).

**New placement question introduced (versus Classic):** "Which row/column do I want to flood, and at which exact moment?" — placements are evaluated for whether they trigger flooding on the right axis at the right time, not whether they earn clears.

**Why order matters:** A flooded row reduces the legal placements for every later piece. Flooding row 4 before placing a horizontal piece that needed row 4 makes that piece unplaceable. The sequence in which floods are triggered determines which subsequent pieces can fit.

**Why negative space matters:** The target specifies empty cells (cells that must end up neither piece-filled nor flooded). Every placement must avoid filling target-empty cells, AND every flood must avoid sweeping through target-empty cells. Negative space is the win condition.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim with a modified `applyPlacementAndClear`: instead of `clearLines` use `floodLines` (write WATER_COLOR to every cell of the completed row/col). At each step pick a legal placement uniformly. Final board is target-feasible by construction. Quality filter: target-empty cells must be cells the simulation never piece-filled AND never flooded.

**Anti-pattern screen:**
- Mirror disease: pass — flooding is determined by line completion, but the *decision* to complete a line is a real placement decision the player makes; flood is an effect of that decision, not a doubled write of an unchanged decision.
- Breathe disease: pass — the flood rule is not implied by anything else; it actively replaces clear behavior. Removing it returns the mode to a puzzle variant.
- Pipeline disease: pass — adds the flood-trigger placement question without removing the place-from-tray agency.
- Scar disease: pass — floods are deterministically caused by player-completed lines, fully predictable (the will-clear flash UI already exists for this).
**Estimated implementation complexity (S/M/L):** M — reuses Quarantine's wall infrastructure (sentinel color, "treat as filled but unclearable" logic in `clearLinesPreservingWalls`); needs a different completion-effect (write water instead of erase) and a target-empty win predicate.

**Immediate suspicion / risk:** Risk of *isomorphism with Quarantine* — Quarantine has indestructible walls and an empty-cell target. The difference is that Quarantine walls are pre-placed (region topology is the puzzle), Flood walls are player-triggered (when to flood is the puzzle). If the generator routinely produces puzzles where flooding-or-not is forced (only one legal sequence avoids stranding pieces), the player-agency dimension collapses and it becomes Quarantine-with-extra-steps. Tuning the target so the player has a real flood-axis choice each turn is the key risk.

---

### Candidate: Anti-Clear
> ID: C60


**Core rule (one sentence, mechanics-speak):** Line clears are forbidden — any placement that would *complete* a row or column is illegal (rejected by the placement validator); the round goal is to reach a target fill threshold (e.g. "≥ 50 cells filled") without ever triggering a clear, with a finite tray.

**Antagonist:** The line-completion rule itself. The player wants to fill the board (toward the threshold) but every row and column has a hard cap of 7 cells (8 = clear-trigger = illegal). The "do not complete" constraint shapes every placement.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** Cell coverage. Every placed cell counts toward the win threshold (good), but every placed cell pushes some row and some column closer to the 7-cell ceiling (bad — once any row/col hits 7, no piece can land in that row/col without making it 8 = illegal).

**New placement question introduced (versus Classic):** "Which row/col is this placement pushing toward the cap, and is that the right axis to spend?" — the player tracks row/col fill counts (max 7 per axis) as a cap-resource rather than as a clear-trigger.

**Why order matters:** Each placement raises specific row/col fill counts; the order in which axes hit 7 determines which subsequent placements are legal. A piece that needs columns 2 and 3 to have at least 5 free cells each cannot be placed if earlier moves drove either column to 7.

**Why negative space matters:** Every row/col MUST end with at least one empty cell (otherwise it would have been completed = illegal). The negative-space pattern is structural: 8 row-holes + 8 col-holes minimum (with overlap), embedded in any winning board state.

**Solvability strategy (constructive proof — usually forward-simulation):** Forward-sim: at each step enumerate legal placements (canPlacePiece AND no-line-completion); pick uniformly. The simulation produces a board with no completed rows/cols by construction. Filter on: final fill count ≥ threshold. Tray sized so the threshold is reachable (e.g. for 50-cell target, tray total cell count ≥ 50 after accounting for rejected placements).

**Anti-pattern screen:**
- Mirror disease: pass — placement decision is single; the new rule (no-complete) constrains the legal set, doesn't double the write.
- Breathe disease: this is the borderline test. The "no fully-filled row/col" constraint is structurally similar to Breathe's "no solid 2×2." But there's a key difference: in Breathe, the forward-sim generator naturally satisfies the rule, so the rule does no work. Here, the rule actively *changes the legal placement set during play* — placements that would be legal in Classic are rejected mid-game. Pass — the rule constrains live play, not just the win-state.
- Pipeline disease: pass — the no-complete rule reduces the legal set per turn but the player still freely picks among the remaining legal placements.
- Scar disease: pass — fully deterministic, no RNG.

**Estimated implementation complexity (S/M/L):** S — placement validator gets an extra check: simulate placement, run `detectCompletedLines`, reject if non-empty. Win check counts filled cells against threshold. Tray is finite (no refill).

**Immediate suspicion / risk:** Risk that the dominant strategy is trivially "fill diagonally outward, never approach 7-in-a-row" and the threshold becomes reachable without thought. Or, conversely, risk that any non-trivial threshold is unreachable because piece geometry forces axis-fills. Also: the rule is essentially "Breathe with row/col instead of 2×2" and might inherit Breathe's disease if the generator filters out unreachable thresholds (then the rule auto-satisfies via tray choice). Borderline candidate; needs playtest to validate that the no-complete constraint produces meaningfully different placement decisions vs. just-don't-fill-rows habit.

---

### Candidate: Bash
> ID: C61


**Core rule (one sentence, mechanics-speak):** Quarantine-style round on a wall-partitioned board where the player owns K (2/3/4) "bash" tokens, each of which destroys one chosen wall cell (removing it from the board and possibly merging two regions into one), and the win condition is the standard Quarantine per-region empty-cell match — but the per-region targets are computed against the *original* (un-bashed) wall topology, so merging regions changes the win equation.

**Antagonist:** The wall topology — a region can only be solved if the empty count in *its current 4-connected component* matches the target, and bashing changes which cells belong to which component (a region with target 2 + a region with target 5 become one region with combined target 7 if their wall is bashed, but only if their summed empty count matches that exact 7).

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):** The wall — wanted as a target boundary (it makes per-region targets achievable independently) and feared because a wall in the wrong place blocks tray pieces that don't fit any single region; bashing a wall trades target precision for placement freedom.

**New placement question introduced (versus Classic):** "Should I bash this wall to merge two regions and place a 5-cell piece across the seam (saving placements but committing to a combined empty-target), or keep them split and try to fit two smaller pieces independently?"

**Why order matters:** Bash before placing a cross-seam piece is required (the seam is unwalkable). Bash after placing means the piece is constrained to one side. Bashing in a different order (which wall cell first) creates different region topologies for subsequent placements.

**Why negative space matters:** Each region's win condition is "exactly N empty cells remaining," so the negative space *is* the target. Bashing redefines which empties belong to which target.

**Solvability strategy (constructive proof — usually forward-simulation):** Generator picks a wall topology, then a forward-sim that randomly interleaves bash ops (between placements) into the standard Quarantine-sim; sums remaining empties per (post-bash) region as the per-region targets. Trace is the proof.

**Anti-pattern screen:**
- Mirror disease: pass — bash-target choice is independent of placement geometry.
- Breathe disease: pass — bashes are a new degree of freedom; targets are computed off the bashed topology so the rule isn't auto-implied.
- Pipeline disease: pass — adds bash as a new action.
- Scar disease: pass — bash is player-chosen.

**Estimated implementation complexity (S/M/L):** L — extends Quarantine. Needs bash-mode UI (tap a wall cell), recompute regions after each bash (already have `computeQuarantineRegions`), revise per-region empty counts in win check, generator variant of quarantineGenerator that interleaves bashes. Significant interaction with existing Quarantine code.

**Immediate suspicion / risk:** Bashing makes Quarantine too easy unless targets are pre-computed against the bashed topology, which the design specifies — but this means the player must figure out the *post-bash* target without seeing it. Risk: target display must update live as bashes are spent, otherwise the puzzle becomes guesswork. Defendable: live update is the natural UX.

---

### Candidate: Tether
> ID: C62


**Core rule (one sentence, mechanics-speak):**
Each tray slot is paired (1↔2, and 3 is a free piece); when the player places a piece from a paired slot, the next placement from its partner slot must include at least one cell within Chebyshev-distance ≤ 2 of any cell of the previous placement, otherwise the placement is rejected.

**Antagonist:**
Stale partner constraint — placing slot 1 in a corner restricts where slot 2 can go to a 5×5 box around that corner; if the box is full of pre-fill or board edges, slot 2 has no legal placement and the round ends.

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):**
Chebyshev tether: tightening (placing the first piece in a high-flexibility area) lets you reach more rows/columns with the second piece, but the same act commits you to that geographic slice — you cannot use the partner piece to start a clear elsewhere.

**New placement question introduced (versus Classic):**
"Where do I place piece A so that piece B's only legal landing zones include the row/column I want to clear?" — the origin choice for slot 1 binds the origin space for slot 2.

**Why order matters:**
Placing slot 2 before slot 1 inverts which placement constrains which; the free slot 3 can be a planned bailout if a tether would soft-lock you, so when you spend the free slot is itself a decision.

**Why negative space matters:**
The 5×5 tether window must contain enough empty cells to fit the partner piece; the player must protect a contiguous-enough empty pocket near the first placement, otherwise the second is unplaceable.

**Solvability strategy (constructive proof — usually forward-simulation):**
Forward-simulate by sampling slot 1 origins uniformly, then sampling slot 2 origins uniformly only from the tether-legal subset; if either set is empty, retry with a smaller pre-fill. The simulator's own trajectory is a valid solution.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — the tether constrains the *space* of legal partner origins but does not determine a unique partner placement; the player still chooses orientation + which legal origin within the box.
- Breathe disease (rule auto-implied by other rules): pass — Classic placement rules don't restrict cross-piece distance, so the tether is a genuine new constraint.
- Pipeline disease (agency removed without comparable agency added): pass — slot order is freely chosen, and the tether adds a new "where to land slot 1 to maximise slot 2 options" decision that Classic doesn't ask.
- Scar disease (random uncontrollable punishment): pass — the tether is fully visible (highlight the 5×5 window) and deterministic.

**Estimated implementation complexity (S/M/L):**
M — needs persistent "last partner placement" state per pair, a tether overlay UI, and a placement validator that knows pair membership.

**Immediate suspicion / risk:**
Soft-lock risk if the player tethers into a dead pocket; need a "retry tether" undo or a generator constraint that guarantees ≥ k legal partner placements at every step.

---

### Candidate: Slipstream
> ID: C63


**Core rule (one sentence, mechanics-speak):**
After every placement, the row immediately above the placement's topmost filled cell shifts one column to the right (cells in column 7 wrap to column 0), and the row immediately below the placement's bottommost cell shifts one column to the left (column 0 wraps to column 7); pre-shift collisions (a wrapping cell would land on a filled cell) reject the placement entirely.

**Antagonist:**
Cascade displacement — placing a piece is fine geometrically, but the induced row-shifts above/below may push existing fill into rows that were primed for clears, breaking the setup, OR may complete a row you didn't intend to complete (consuming pieces in your tray).

**Dual-purpose mechanic (one primitive that the player simultaneously wants and fears):**
The vertical extent of your piece — pieces that span more rows induce shifts on rows you may not want to disturb; tall pieces fewer affected rows but block more cells in their span.

**New placement question introduced (versus Classic):**
"What state will rows above and below be in *after* the shift, and is that the state I want?" — origin choice now binds the geometry of two other rows.

**Why order matters:**
Placing piece A first shifts row k; piece B placed second sees row k in its shifted state, so the order of placements changes which rows participate in B's adjacency / clear logic.

**Why negative space matters:**
The cells in the wrap target (column 7 of the row-above, column 0 of the row-below) must be empty; the player must protect those wrap cells, which are *not* in the placement footprint itself.

**Solvability strategy (constructive proof — usually forward-simulation):**
Forward-simulate placements and apply shift rules; reject placements whose induced shift causes a wrap collision. Generator pre-validates that the seed has wrap cells empty for the chosen sample trajectory.

**Anti-pattern screen:**
- Mirror disease (rule a function of an existing decision): pass — origin determines which rows shift, but the shift is a *side effect on cells not in the footprint*, so it adds new state changes the placement decision must reason about; the player still freely chooses origin.
- Breathe disease (rule auto-implied by other rules): pass — Classic does not shift rows; this is a genuine new state transition.
- Pipeline disease (agency removed without comparable agency added): pass — full slot/orientation/origin agency intact; new "what does the shift do to my setup?" decision added.
- Scar disease (random uncontrollable punishment): pass — shifts are deterministic and visible; the player can predict them.

**Estimated implementation complexity (S/M/L):**
L — wrap-shift logic is a new board transformation, needs animation choreography (the existing UI has no row-shift animation), and the validator must simulate the shift to detect wrap collisions before accepting the placement.

**Immediate suspicion / risk:**
Wrap-shift may be too cognitively expensive for a casual placement game — the player must mentally simulate two shifts per placement. Also, may collide with Gravity / Drop modes' "things move after placement" feel; risk it reads as just another physics mode rather than a coupling. Borderline.

---

### Candidate: Hourglass
> ID: C64


**Core rule (one sentence, mechanics-speak):** A small set of "hourglass" cells (sentinel color, count as filled, cannot be cleared by lines and cannot be placed onto) each carry a visible decreasing integer 0..K; after every placement, every hourglass decrements by 1; when an hourglass reaches 0 it "expires" and converts itself plus its 4-connected empty cells (computed at expiry time) into permanent walls (sentinel WALL color, indestructible, count as filled, never placed onto, never cleared) — a flood-fill across the empty connected component that includes the expiring hourglass; a row/column clear that completes a line containing an unexpired hourglass deletes it (the hourglass dies before expiry, the flood doesn't trigger); round ends in win when all hourglasses are dead AND tray is empty, in loss when an hourglass expires AND the resulting flood-fill walls off the board such that the remaining tray pieces cannot be placed.

**Antagonist:** Hourglass cells with public countdown timers tied to placement count. Their failure mode is huge (entire connected empty region becomes permanent walls).

**Dual-purpose mechanic:** Connected empty regions. The player WANTS large empty regions (more legal placements, easier line completion) but FEARS them around live hourglasses (because expiry of a hourglass in a 30-empty-cell region kills 30 cells permanently). The player's choice of where to place pieces SPLITS the empty space into smaller components — the same "monolith-style" connectivity primitive turned hostile.

**New placement question introduced (versus Classic):** "Of the legal placements, which best (a) reduces the size of the connected empty component containing an hourglass that will expire soon, or (b) directly clears a line containing an hourglass?" Classic doesn't track connected empty components.

**Why order matters:** Every placement decrements every hourglass — a placement spent on hourglass A's component shrinks A's flood but doesn't help B. Order determines which hourglass is closest to expiry and therefore which empty region you must currently isolate.

**Why negative space matters:** The flood-fill on expiry is exactly a negative-space transformation. The shape and size of empty regions IS the loss magnitude.

**Solvability strategy (constructive proof — usually forward-simulation):** Seed hourglasses with countdowns longer than the tray length but achievable by clears, forward-sim selecting placements that either include an hourglass in a clear or shrink the empty component containing the soonest-expiring hourglass; accept runs where every hourglass dies before expiry.

**Anti-pattern screen:**
- Mirror disease: pass — hourglass timers are separate state.
- Breathe disease: pass — "kill all hourglasses" is not implied by Classic rules.
- Pipeline disease: pass — nothing removed.
- Scar disease: pass — countdown is fully visible; flood-fill is a public deterministic function of the board at expiry time.

**Estimated implementation complexity (S/M/L):** L. Sentinel HOURGLASS color with per-cell countdown (cell-with-state plumbing tax again), expiry pass that runs flood-fill, can mass-convert empties to WALL_COLOR (reusing Quarantine's wall infrastructure — nice), augmented forward-sim.

**Immediate suspicion / risk:** Borderline catastrophic — one mis-managed hourglass walls off half the board permanently and the round becomes obviously unwinnable, frustrating. Mitigation: limit K (countdown values) so initial hourglasses are dispatchable in 2–3 placements, OR limit flood-fill to the hourglass's 4-neighborhood (a single ring of 4 walls) instead of the whole connected component — but that weakens the antagonist. Tuning is the whole game here.

---
