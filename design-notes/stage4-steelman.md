# Stage 4 — Steelman + cross-family critique + defense

For each of the 9 Stage-3 survivors:
1. **Steelman** (1 paragraph): the strongest case FOR the mode.
2. **Critique** (cross-family): the strongest case AGAINST.
3. **Defense** (1 paragraph): rebuttal.

If the defense reads as cope ("the player will figure it out," "we can tune it," "this is rare in practice") → KILL.

The cross-family critic for L1-3, L1-5, L1-6, L3-2 (Opus champions) and L7-3, L8-3 (Haiku champions) was Claude Sonnet — see `stage4-critic.md`. For L2-1, L2-2, L4-2 (Sonnet champions) I (Opus) am the cross-family critic.

---

## L1-3 Chord (Opus champion → Sonnet critic)

**Steelman**: The chord rule turns line completion from pure reward into a *commitment*: completing a row without simultaneously chording a column creates a permanent dead stripe. This generates a fundamentally new placement question per turn — "is there ANY placement that doesn't half-complete a line I can't finish later?" The dual-purpose primitive is line-completion (Classic reward → Chord penalty-without-pair). Order matters because tray-1's row-completion forecloses tray-3's column threading. Negative space is concrete: chord-intersection cells must stay empty until the right piece arrives.

**Critique (Sonnet)**: Stripe-locking is Scar disease in a coat — punishment is structural, retroactive, unrecoverable. The "10th play" decision collapses to a binary chord-yes-or-no spatial check; same question per move with noisier inputs. Optimal play is to AVOID partial lines entirely → mode's signature mechanic is self-defeating. Generator has no mechanism to guarantee chord opportunities exist.

**Defense**: Two of the three points have real teeth. (1) Stripe-locking is deterministic, not random, so it's not strictly Scar disease — but the practical effect (a near-miss permanently penalizes you) is structurally severe. (2) The "no depth ladder" critique is the killer: I cannot demonstrate that placement question 10 is mentally different from placement question 1 in this mode. The Stage-3 transcript ("setup → orphan-risk → recovery") works for a single instance but does it produce 10 fresh instances of the same depth ladder? Probably not — most instances will plateau at "is there a chord here, yes/no." The defense ("generator must guarantee chord opportunities") promises something concrete, but doesn't address Sonnet's deeper concern that the optimal player AVOIDS the chord mechanic, making the mode's signature decoration. **That reads as cope.**

**Verdict: KILL.**

---

## L1-5 Color Chord Clear (Opus champion → Sonnet critic)

**Steelman**: Color is repurposed from cosmetic to clear-trigger predicate. A 4-cell same-color piece is a self-deleting tool unless it bridges pre-fill — a real mechanical insight that changes how the player VALUES tray composition. Dual-purpose: color is wanted (extend a friendly run) and feared (commit to a color near a near-mono row, blocking other colors). Pre-fill (mixed colors) is the antagonist.

**Critique (Sonnet)**: Structurally identical to Classic — "fit piece into pattern" with color as the pattern variable. No dual-purpose tension; every placement evaluated on one dimension (does it extend a run?). Negative space inert. Optimal play degenerates into single-color banding — collapsing the color space into a single-color pipeline.

**Defense**: The "structurally same-shape question as Classic" critique is the deepest. Color does buy a second axis (which color, where), but Sonnet is right that the question's MENTAL OPERATION is the same as Classic's: "fit piece into a pattern that extends what's already there." The single-color-banding exploit may be partly mitigated by pre-fill being multi-colored (forcing engagement with all colors), but a skilled player still plays one color at a time in sequence — that's just sequential single-color play. **The defense relies on "generator must seed correct colors" — that's the same shape of cope as L1-3.**

**Verdict: KILL.**

---

## L1-6 Board Spin (Opus champion → Sonnet critic)

**Steelman**: The rotate gesture is INVERTED — instead of rotating the tool (piece) it rotates the workspace (board). All filled cells (pre-fill + previous placements) rotate together. The dual-purpose primitive is the spin: wanted (align the piece's locked orientation to a gap) and feared (rearranges every existing fill, possibly completing an unwanted line or breaking a setup). Spin budget creates an explicit save-or-spend pressure. Pre-fill is the antagonist.

**Critique (Sonnet)**: Spin budget converges to hoard-and-react. Orientation-locked pieces is Pipeline disease (piece-rotation removed). Spinning isn't equivalent agency — it's chaos. Dense boards force defensive spins. By play 30, players maintain artificially sparse boards to avoid spinning — playing Classic with a stamina tax.

**Defense**: 
- Hoard-and-react is real for any consumable, but spin has a UNIQUE positive use (rearranging existing fills to complete a line) that no other mechanic provides — so the resource isn't just an emergency button.
- Pipeline disease: piece rotation is replaced with board rotation. Sonnet says these aren't equivalent agency. **They aren't equivalent — board rotation is STRICTLY MORE POWERFUL** because it interacts with the entire board state. The agency added is greater than the agency removed.
- "Defensive spin" trap: real concern, but soluble by generator difficulty calibration (puzzles seeded so the budget allows ≥1 creative spin per play).

The defense engages each critique with concrete mechanical points, not promises. The "board rotation is strictly more powerful" rebuttal is a genuine structural answer.

**Verdict: KEEP.**

---

## L2-1 Plague (Sonnet champion → Opus critic)

**Steelman**: Infected cells spread when they accumulate ≥2 filled neighbors. Each placement adjacent to an infected cell is dual-purpose: it builds toward the row/col clear that DEFEATS the infection, AND risks pushing the infection over its spread threshold. Spread targets are deterministic-seeded (learnable). The race between fill-toward-clear and fill-triggers-spread is a genuine new placement question.

**Critique (Opus, cross-family for Sonnet)**: 
- Spread simulation is cognitively heavy: a 3-step lookahead per placement (will my fill push infection past threshold? where does the deterministic spread land? does the new infected cell still allow a clear-path?). High mental cost vs. depth.
- The deterministic seed for spread destination is invisible on first play — feels random until the rule is internalized.
- Spread cap needed to avoid cascading lose conditions on dense boards.
- Antagonist family overlaps the cautionary "external pressure" theme.

**Defense**: 
- Cognitive load: yes, but Blockit's Monolith already asks 2-step lookahead (placement → component check). Plague's 3-step is at the edge of acceptable, mitigated by visualizing the deterministic spread target in the UI (highlight which empty cell the next spread will hit).
- Spread cap: a hard rule like "no more than K spreads per round, regardless of triggers" prevents runaway, and is easy to implement.
- Differentiation from Monolith: Monolith preserves a single-component invariant; Plague defeats infected cells via clears — different goals, different verbs, different mechanics.

The defense gives concrete mitigations (spread visualization, spread cap, differentiation argument). Engages, doesn't dodge.

**Verdict: KEEP.**

---

## L2-2 Siege (Sonnet champion → Opus critic)

**Steelman**: A wall of sentinels advances upward each turn unless its row is cleared. The race-against-the-wall creates a deadline that disciplines piece allocation — every piece either feeds the wall-clear or buys the wall a row of advance. Pre-fill (the wall) is a continuously-evolving antagonist.

**Critique (Opus)**: 
- Familiar pattern from Tetris (rising garbage rows) — not Blockit-native; lacks the structural-aha quality Puzzle has.
- The "wall regenerates 2 turns after clear" creates an oscillating timer that the player internalizes by play 10. After internalization, the mode becomes a rote race.
- Solvability under regen is hard for the generator — must forward-sim including each new wall's clearability.

**Defense**: 
- Tetris-derivative: borrowing a known pattern isn't disqualifying. The Blockit framing (puzzle goal, finite tray, target pattern) makes it Blockit-native enough.
- Rote race: yes, the rhythm becomes predictable. But each wall regeneration is geometrically different (gap positions vary), so the per-clear question — which gaps need plugging, which non-wall scoring is worth the delay — has fresh inputs. Question shape is similar but content differs.
- Generator solvability: forward-sim with regen is mechanically more complex but feasible (the regen is a deterministic event, not a random one).

Defense is honest about the rote-race concern but argues the geometry-variation keeps each cycle fresh. Marginal defense — not full cope, but not a slam dunk either.

**Verdict: KEEP marginally.**

---

## L2-3 Fuse — already killed at Stage 3 (n/a)

## L3-2 Twin Bond (Opus champion → Sonnet critic)

**Steelman**: The bonded-pair adjacency requirement creates cross-piece coupling that doesn't exist in Classic. The dual-purpose primitive is piece adjacency: wanted (it's where you'd want to land for clear-setups) and feared (it's now reserved for the partner). The choice of A-first vs B-first reserves different adjacent pockets, producing genuinely different reachable boards.

**Critique (Sonnet)**: Bond breaks are board-determined → Scar disease. The "must place partner next" rail is Pipeline disease. Loss becomes luck-driven on dense boards. Bond-break rate rises monotonically with density.

**Defense**: 
- Bond break is deterministic given (tray, board) state. The player can SEE in advance, by surveying the partner's possible touches, whether a bond will be breakable. Choosing the unbonded slot first delays the bond — that's a real decision. Choosing A-first vs B-first changes the legal partner-set. Player has multiple levers to control bond outcomes.
- Pipeline rail: the "must place partner next" is a temporal forced sequence, BUT the player chose to arm the bond by placing the first bonded slot; they could have placed the unbonded slot first. The rail is conditional, not constant.
- High-density luck: yes, dense boards make bonds harder. Generator must constrain difficulty.

The defense gives multiple concrete decision-levers (slot order, A-vs-B, partner position). Engages.

**Verdict: KEEP.**

---

## L4-2 Quarantine (Sonnet champion → Opus critic)

**Steelman**: Wall-partitioned regions with exact-empty-cell targets. The dual-purpose primitive is the boundary-spanning piece: a piece across two regions decreases BOTH counts, which is wanted (efficient multi-region progress) and feared (over-spending one budget while saving another). Order matters: filling region A early may make a region-bridging piece unplaceable later. Negative space matters concretely (each region's empty count is the win condition).

**Critique (Opus)**: 
- Number-puzzle layered on geometry: integer budgets per region + spatial placement = two constraint systems simultaneously. High cognitive load.
- Pre-computed targets become predictable; mental work doesn't grow with practice.
- Walls indestructible: structurally important at corners but not novel for the bulk of placements.

**Defense**: 
- High cognitive load is a DIFFERENT load than Classic's pure spatial — it's quantitative budgeting, novel for Blockit. The novel cognition is the mode's value proposition.
- Per-puzzle freshness: targets and region shapes vary per generated instance, so memorization doesn't carry across plays. Pattern recognition does, but that's true of every puzzle mode.
- Walls' role: they create the partitions. Without walls, no regions. Their job is structural, not decorative.

Defense engages each critique with concrete mechanical answers.

**Verdict: KEEP.**

---

## L7-3 Partitioned Board (Haiku champion → Sonnet critic)

**Steelman**: Region-local clears (4-cell row inside a 4×4 region) is a fresh clear-mechanic. Pieces spanning region boundaries are dual-purpose: wanted by one region (close to clearing) and feared by another (already nearly clear, would over-fill). Order matters across regions because clears don't propagate.

**Critique (Sonnet)**: Mirror disease — region clear is a function of where you place. Mode fragments into 4 simultaneous Classics. Region-sequencing exploit (pack one region dense for fast clears) makes it strictly easier than Classic.

**Defense**:
- Mirror disease: in Classic, "row N clears when full" is also a function of placement; that's just how clears work. The MIRROR disease test is whether an EXTRA constraint is auto-determined; here the EXTRA constraint is "regions are independent." Independence is structurally a topological property, not a function of any single placement.
- Region-sequencing exploit: real concern. In Classic, similar exploit is "pack one corner dense" but the 8-cell row clear caps single-corner densification. In Partitioned, the 4-cell region-row clear has no equivalent cap. **Sonnet's "strictly easier than Classic" critique is hard to refute** — the 4-cell clear is materially easier and produces more clears at lower difficulty.
- Without an offsetting difficulty mechanism (e.g., fewer pieces, denser pre-fill), the mode is strictly easier.

The defense fails to deliver a structural argument that the mode is at least as hard as Classic. **The "strictly easier" critique stands.**

**Verdict: KILL.**

---

## L8-3 Hoard (Haiku champion → Sonnet critic)

**Steelman**: Tray refills only on clears. Clears flip from pure reward to lifeblood. The dual-purpose primitive is line clears: wanted (extend play, generate piece) and feared (random shape may conflict with target). Pacing decision is real per turn: clear early to refill, but watch out for piece quality.

**Critique (Sonnet)**: Random piece on clear = Scar disease at strategic level. Pre-fill puzzle goal is mechanically incompatible with clear-based generation (clears want line configurations; pre-fill wants targeted erasure). Solvability not addressed; dead-end states indistinguishable from hard states.

**Defense**: 
- Random piece: the candidate description specifies "random shape from a fixed seeded set" — the seed makes the sequence deterministic given the puzzle ID. Player learns the sequence over plays, can plan around it. **Not strictly Scar disease; controllable through learning.**
- Mechanical incompatibility: clears can both delete pre-fill cells AND generate pieces. The generator forward-simulates including the seeded piece-replenishment chain — so by construction, the piece sequence + clear sequence reach the target.
- Solvability: harder for the generator (state space includes the piece-replenishment queue) but mechanically tractable.

Defense engages each critique with concrete mechanical answers. Seeded RNG is a legitimate Scar-disease escape hatch, not cope.

**Verdict: KEEP.**

---

## Stage 4 summary

**Survivors: 6 of 9** (kill rate 33%). 

| ID | Name | Verdict |
|----|------|---------|
| L1-3 | Chord | KILL — no depth ladder |
| L1-5 | Color Chord Clear | KILL — structurally same-shape question as Classic |
| L1-6 | Board Spin | KEEP |
| L2-1 | Plague | KEEP |
| L2-2 | Siege | KEEP marginally |
| L3-2 | Twin Bond | KEEP |
| L4-2 | Quarantine | KEEP |
| L7-3 | Partitioned Board | KILL — strictly easier than Classic |
| L8-3 | Hoard | KEEP |

The Stage 4 kill criterion (defense reads as cope) caught three modes whose Stage 1–3 reasoning had glossed over depth-ladder or difficulty issues. Survivors carry forward to Stage 5 (generator feasibility).
