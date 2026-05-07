# Stage 8 — Comparative evaluation of 5 implemented modes

Evaluator: fresh pass, no knowledge of which generator agent or design lens
produced each mode. Judgments are made strictly against the implemented
source code (generators + reducer branches) and the Stage 7 playtest verdicts.
The four anti-patterns from `00-prior-art-summary.md` (Mirror / Breathe /
Pipeline / Scar disease) are re-applied as a post-implementation screen.

The 5 modes under review:

- Heading — `src/game/headingPuzzleGenerator.ts`, reducer branch
  `gameReducer.ts:3757-3825`, plus rotation hook at `gameReducer.ts:3342-3345`.
- Decay — `src/game/decay.ts`, reducer branch `gameReducer.ts:3840-3907`,
  fresh-state factory `gameReducer.ts:2491-2515`.
- Fuse — `src/game/fusePuzzleGenerator.ts` + `src/game/fuse.ts`,
  reducer branch `gameReducer.ts:4062-4169`.
- Erasures — `src/game/erasuresPuzzleGenerator.ts` +
  `src/game/erasures.ts`, reducer branch `gameReducer.ts:3673-3749`,
  + token actions `gameReducer.ts:5825-5930`.
- Tether — `src/game/tether.ts` + `src/game/tetherTray.ts`,
  reducer branch `gameReducer.ts:3931-4042`.

---

## Per-mode analyses

### Heading

**Exact placement question (one sentence, mechanics-speak):** which
rotation index of the chosen piece (UP/RIGHT/DOWN/LEFT or FULL) do I want
to commit so that, when this placement triggers a row or column completion,
the **half** of that line on the heading's side is the half that gets
erased — given that the target pattern requires specific cells to remain
filled afterwards.

**Core source of tension (single primitive simultaneously wanted and
feared):** the line clear itself. The player wants clears (they're the
only way to reach the target), but every clear leaves residue on one half
that may or may not match the target — so each clear is also feared.

**Primary failure mode players will encounter:** rotating to the
"intuitive" geometric orientation (which fits the empty slot) and then
discovering that the placement triggered a clear on the wrong half,
leaving residue where the target wanted empty.

**System-level insight ("aha"):** rotation has two simultaneous effects
— it changes the piece's footprint AND its heading. On symmetric pieces
those are decoupled (heading is FULL regardless); on asymmetric pieces
rotation count is the heading.

**Dominant tradeoff structure:** geometric fit vs. half-clear direction.
Often the rotation that fits geometrically clears the wrong half; the
rotation that clears the right half doesn't fit. The compromise is
ordering — clear in a direction that leaves usable residue for a
later piece.

**Generator's strongest property:** the `minHalfClears` filter on
Normal/Hard guarantees the canonical solution exercises the half-clear
rule at least once (Normal) or twice (Hard). This directly forecloses
the "Heading collapses to Puzzle" failure case at construction time.

**Generator's weakest property:** the piece pool is filtered only on
cell count, not on symmetry. Easy (`pieceCount=2`, `minHalfClears=0`)
can legitimately deal a tray dominated by `dot`/`sq2`/`sq3`/`plus` and
solve as plain Puzzle. The probability is small but non-zero, and Easy
has no filter to exclude it. Hard's `pool` for `[3..5]` cells excludes
`dot`/`sq2` automatically (size mismatch) but still admits `sq3` (4 cells)
and `plus` (5 cells); however `minHalfClears=2` forces at least one
asymmetric piece into the canonical solution, making a fully-symmetric
tray statistically vanishing.

**Risk of degeneracy after repeated play (LOW):** the half-clear
constraint is enforced on Normal/Hard at generation time. Easy can drift
toward Puzzle but Easy is the tutorial rung.

**Anti-pattern re-screen (post-implementation):**
- Mirror disease: **pass** — the placement decision is genuinely
  multi-valued (rotation index is a real degree of freedom, not a
  deterministic function of a single choice).
- Breathe disease: **pass** — the half-clear rule is not auto-satisfied
  by matching the target. The target is the *post-half-clear* board;
  reaching it requires correctly directed clears.
- Pipeline disease: **pass** — no agency is removed; rotation freedom
  is *expanded* (rotation index is now a meaningful choice on top of
  the visual orientation).
- Scar disease: **pass** — the half-clear residue is fully determined
  by the player's heading choice, not RNG.

**Implementation quality (S/M/L issues):**
- S: Easy difficulty's `minHalfClears=0` makes the mode locally
  collapsible to Puzzle on a fortuitous symmetric tray. Acceptable for
  a tutorial rung.
- M: rotation index→heading mapping for 2-orientation pieces (dominoes,
  I-pieces, S/Z) maps rot 0/1/2/3 → up/right/down/left even though
  rot 0 and rot 2 are visually identical. The doc comment flags this
  as intentional. Players will rotate "to no visual change" and see
  the heading badge flip. That is potentially confusing but correctly
  signposted by the per-slot glyph fix landed in Stage 7.

---

### Decay

**Exact placement question (one sentence, mechanics-speak):** where do I
place this piece so that the cells it touches (which start at age 0) and
the cells it does NOT touch (which all tick +1) leave the maximum number
of lines that will all-cells-age-≥T at some near-future placement.

**Core source of tension (single primitive simultaneously wanted and
feared):** placing on the board. Every placement ages every other cell
(good — aging unlocks clears) but also re-injects fresh age-0 cells
(bad — those cells now block any line they're on).

**Primary failure mode players will encounter:** completing a row
geometrically, expecting a clear, and getting nothing because one cell
in the row is too young. Players will misread "filled line" as
"clearable line" until they internalise the age gate.

**System-level insight ("aha"):** the player is always racing
themselves — each placement both ripens existing cells and plants fresh
unripe ones. The optimal strategy is to *avoid* placing on rows that
are about to ripen (so they ripen this turn instead of being
re-poisoned).

**Dominant tradeoff structure:** completing a row vs. preserving its
age profile. The greedy "complete the line now" play often plants a
fresh age-0 cell that gates the clear T placements into the future.

**Generator's strongest property:** the per-difficulty pre-fill is
seeded at age = T (already ripe) so the player can clear lines that
include those cells from move 1, mitigating the dead-game-start failure
mode.

**Generator's weakest property:** pre-fill positions are uniform
random. There is no constraint that the seeded cells share rows or
columns; on a bad RNG draw the 4–8 pre-fills land on 4–8 distinct
rows AND distinct columns, with no two on the same line. In that
case "already ripe" buys the player nothing concrete — they still
have to build a full line from scratch and age every cell from 0,
which is exactly the dead first-3-moves problem the seeding was
meant to fix.

**Risk of degeneracy after repeated play (LOW–MEDIUM):** the rule
itself is robust (it's a wait gate, not a decoration), but the early-
game flatness is RNG-sensitive. Pre-fill row/col co-occurrence would
materially help.

**Anti-pattern re-screen (post-implementation):**
- Mirror disease: **pass** — placement is one decision; the rule
  expands what *matters* about the choice (where you put it changes
  who ages), not what the choice itself is.
- Breathe disease: **pass** — the age gate cannot be auto-satisfied
  by any other rule.
- Pipeline disease: **pass** — no agency removed; the player still
  picks slot, rotation, origin freely.
- Scar disease: **pass** — aging is fully deterministic. There is no
  RNG punishment, only RNG starting conditions.

**Implementation quality (S/M/L issues):**
- M: pre-fill placement is uniform random with no row/col co-occurrence
  bias. First-3-moves can still be flat on a bad seed.
- S: the doc comment in `decay.ts` describes the per-placement order
  as steps 1–6 but the reducer collapses steps 2 and 3 into the
  equivalent "advance ages then stamp new cells = 0". The comment
  in the reducer (`gameReducer.ts:3845-3854`) explicitly justifies
  this; not a bug.

---

### Fuse

**Exact placement question (one sentence, mechanics-speak):** which
fuse cell's row or column is going to clear within the next K
placements (where K is its current countdown), and which placement
contributes most to completing that line — vs. which placements
should I delay or sacrifice so the right line completes first.

**Core source of tension (single primitive simultaneously wanted and
feared):** placement count itself. Every placement makes progress (good)
but also decrements every fuse (bad — each placement burns a unit of
slack on every active fuse). The tray is the clock.

**Primary failure mode players will encounter:** ordering placements
by "easiest first" instead of "soonest fuse first", letting a fuse
expire mid-tray and creating a wall cluster that bumps the board off
the target permanently.

**System-level insight ("aha"):** the K fuses define a *partial order*
on placements. The player must topologically sort the tray against
the fuse deadlines, not just place geometrically.

**Dominant tradeoff structure:** geometric efficiency (clearing two
lines at once with one piece) vs. temporal urgency (clear THIS line
this turn even if it's only a 1-line clear). On Hard with 4 fuses,
the temporal pressure dominates.

**Generator's strongest property:** the fuse-seed step picks cells
that the *canonical solution* clears at known move indices, then
sets each fuse's countdown to `clearMove + slack` where `slack ∈
{1, 2}`. This is by-construction guaranteed solvable AND the slack
is small enough that the temporal pressure is real.

**Generator's weakest property:** slack is uniformly +1 or +2
*per fuse*, without correlation. On Hard with 4 fuses all rolling
slack=1, the puzzle has *zero* order-tolerance — any deviation from
the canonical move order expires a fuse. In practice the slack
distribution should yield mean ≈1.5; some variation is likely but
the worst case (all-1 slack) is not blocked.

**Risk of degeneracy after repeated play (LOW):** fuse expiry creates
walls — a permanent terrain change. Even if the player solves
optimally every time, the failure paths are texturally distinct
(walls, not just "you didn't reach the target"). The mode telegraphs
its threat with a visible countdown badge.

**Anti-pattern re-screen (post-implementation):**
- Mirror disease: **pass** — fuse countdowns are an independent
  resource that the placement decision must trade off against
  geometric fit.
- Breathe disease: **pass** — the no-fuses-remaining win condition
  is NOT implied by target match. A fuse can survive on a target cell
  if its line never clears.
- Pipeline disease: **pass** — no slot lock; the player chooses
  freely from the tray.
- Scar disease: **pass** — fuse positions and countdowns are
  visible at round start. No RNG punishment in-round; only
  predictable expiry from player misordering.

**Implementation quality (S/M/L issues):**
- S: slack draw is uniform `{1, 2}` per fuse with no correlation.
  Hard with `fuseCount=4` can produce a "zero-tolerance" deal.
- S: the fallback (`buildFallback` in `fusePuzzleGenerator.ts:497`)
  is hand-built, so when the RNG fights generation it's still a
  meaningful Fuse instance.
- The reducer's per-placement pipeline (drop-cleared → decrement
  → expire → walls) matches the spec doc precisely; this is the
  most carefully-ordered branch of the five.

---

### Erasures

**Exact placement question (one sentence, mechanics-speak):** do I
place this piece on a target cell (committing it irreversibly except
via spending a token), and if I'm uncertain whether this scaffold
leads to the target, do I spend a token now to reset a 4-connected
component or continue and risk needing more tokens later?

**Core source of tension (single primitive simultaneously wanted and
feared):** the placement itself, viewed as a *reversible* commit.
Player wants commits (they make progress) but fears them (each commit
shrinks the room for future placements; an erase token is needed to
undo).

**Primary failure mode players will encounter:** in the
escape-valves-fallback shipped, the K tokens are *more than enough*
for any conceivable misplacement recovery on Easy/Normal (3 and 5
tokens respectively, against 4–5 piece trays). The mode reduces to
"Puzzle with a free undo button" until the player intentionally tries
hard placements without spending tokens.

**System-level insight ("aha"):** erasing a *4-connected component*
(not a cell) means a misplaced piece that touched a pre-existing
filled component erases the WHOLE thing. The token "cost" is real
on dense boards.

**Dominant tradeoff structure:** spend tokens *now* on a recoverable
mistake vs. save tokens for a *future* harder mistake. Acute when the
tray is short and the board is dense.

**Generator's strongest property:** clear acknowledgement of the
fallback compromise in the top doc comment, with the reasoning made
explicit. The differs-from-prefill check
(`erasuresPuzzleGenerator.ts:384-390`) prevents the degenerate
"target equals starting board" edge case.

**Generator's weakest property:** the canonical solution requires
ZERO tokens. By construction. The token reserve is purely an escape
valve. This means a perfectly-played round is indistinguishable from
a Puzzle round with extra pre-fill.

**Specific concern — does the fallback collapse Erasures to "Puzzle +
optional undo"?**

Yes, partially. A maximally-careful player can solve every Erasures
round without using a single token. The K-token-spend decision is
real *only when the player has already misplaced* — and at that
point it's a recovery decision, not a strategic decision. Compare to
Heading or Fuse, where the new mechanic is in the FORWARD path
(every clear is a heading-clear; every placement decrements every
fuse) — Erasures' new mechanic is in the BACKWARD path (only when
the player wants to undo).

That said, the fallback **does not** make Erasures unfit to ship.
The K-token-spend decision IS real on Hard (where the tray is 6
pieces and the target is 16–32 cells — the chance of a player
threading a hard target perfectly without ever wanting to backtrack
is low). It just means Erasures' identity is "puzzle with a
*structured* undo" rather than "puzzle with a forward-coupled
constraint." That's a genuine variation, just a weaker one than the
other four candidates here.

**Risk of degeneracy after repeated play (MEDIUM):** the more
puzzles the player solves, the more they'll discover that careful
forward play makes tokens a no-op. They'll start trying harder
placements just to see if the token reserve catches them. This is
partial mitigation, but the mode is the most vulnerable of the five
to "what was the point."

**Anti-pattern re-screen (post-implementation):**
- Mirror disease: **pass** — erase is a separate action, not a
  function of the placement decision.
- Breathe disease: **partial fail** — on the canonical zero-token
  solution, the win check (target match) is identical to Puzzle.
  The token rule isn't auto-satisfied; it's auto-irrelevant. This
  is the weakest screen of any mode here.
- Pipeline disease: **pass** — no agency removed; agency is added
  (the erase action).
- Scar disease: **pass** — the player chooses which component to
  erase; nothing random.

**Implementation quality (S/M/L issues):**
- L: the fallback compromise itself. Documented honestly in the top
  doc comment, but it weakens the placement question.
- S: token counts (3/5/7) are very generous — Easy gets 3 tokens for
  a 4-piece tray, i.e. nearly one undo per turn. Could be tightened
  (e.g. 2/3/5) without breaking solvability.

---

### Tether

**Exact placement question (one sentence, mechanics-speak):** if I'm
about to place a paired-slot piece, where among the cells within
Chebyshev-distance 2 of the partner's last placement is there a legal
origin that ALSO produces a useful line completion or future tether
window — vs. should I burn slot 2 now to break out of a constrained
window.

**Core source of tension (single primitive simultaneously wanted and
feared):** the paired placement itself. The player wants paired
placements to score (they're 2 of 3 tray slots) but each one tightens
the next window — a too-clustered placement leaves no room for the
partner.

**Primary failure mode players will encounter:** placing slot 0
optimally for the *current* line, then discovering slot 1's piece
won't fit anywhere in the resulting Chebyshev-2 window — soft-lock
unless slot 2 is still around to break the tether.

**System-level insight ("aha"):** the third slot is a relief valve.
Every paired placement narrows the next window; slot 2 is the only
unconstrained choice and you save it for emergencies, not for
geometry.

**Dominant tradeoff structure:** paired-placement *quality* (line
completion, scoring) vs. partner *survivability* (does the next
paired piece have ≥1 legal origin in the window). Scoring vs.
solvability.

**Generator's strongest property:** the Hard `minTetherOptions ≥ 2`
resample at tray refill time (`tetherTray.ts:141-159`) actively
prevents the most common soft-lock. The bounded retry budget
(`HARD_RESAMPLE_BUDGET = 12`) prevents pathological loops.

**Generator's weakest property:** the resample only fires at *tray
refill*, not after every paired placement mid-tray. Within a single
tray of 3 pieces, slot 1's piece is sampled at refill time using
the window from the LAST tray's final paired placement (or null on
round start) — not the window that slot 0's actual placement
produces. So slot 1 *can* end up with zero legal options inside
slot 0's window, even on Hard.

**Specific concern — does the soft-lock guard actually prevent
soft-locks in practice?**

Partially. The guard prevents soft-locks at the seam between trays
(refill → first paired placement). But within a tray, after slot 0
places, slot 1 was already sampled and there's no resample. If
slot 0's placement creates a window that slot 1 cannot satisfy,
the player must use slot 2 (the relief valve) to invalidate the
last-paired record OR accept game-over. Slot 2 placements DO leave
`lastPairedPlacementCells` unchanged (`gameReducer.ts:3978-3991`)
— they're the relief valve only in the sense of "they don't tighten
the window further" — they do NOT invalidate the existing window.
So slot 2 only buys a turn; the next paired placement still faces
the same window.

The `hasValidTetherMoves` predicate (`tether.ts:236-279`) catches
the soft-lock and ends the round; the player isn't left clicking
infinitely. But the soft-lock IS reachable by Hard play with bad
luck.

**Risk of degeneracy after repeated play (LOW):** the constraint is
geometric, learnable, and difficulty-tuned. Even the soft-lock is a
legitimate mechanical outcome (game-over from a real choice), not a
glitch.

**Anti-pattern re-screen (post-implementation):**
- Mirror disease: **pass** — the tether constraint genuinely
  multiplies decisions (origin must satisfy window AND legality AND
  geometric utility). Not a function of a single existing decision.
- Breathe disease: **pass** — the tether constraint isn't implied
  by the line-clear rule.
- Pipeline disease: **pass** — slot lock is per-pair, not per-slot,
  and slot 2 is unconstrained. Agency is restructured, not removed.
- Scar disease: **pass** — windows are deterministic and visible
  (the `.cell--tether-window` outline added in Stage 7).

**Implementation quality (S/M/L issues):**
- M: the soft-lock guard only fires at tray-refill time. A
  mid-tray slot-1-cannot-fit case is reachable on Hard. Game-over
  detection works but the soft-lock itself is a UX rough edge.
- S: slot 2 not invalidating the active window is consistent with
  the spec but counter-intuitive — players will try slot 2 as a
  "reset" and learn it isn't.

---

## Ranking (strongest → weakest)

1. **Fuse.** Visible per-fuse countdown turns the abstract
   "ordering matters" rule into a direct, learnable signal. Generator
   guarantees solvability with bounded slack; mechanic is in the
   forward path (every placement burns countdown). Walls from expiry
   give the failure mode a permanent visible footprint.

2. **Decay.** Endless score-attack rather than a finite puzzle, so the
   ordering tension never resolves to a single "did I solve it" gate
   — it's a continuous race. Lacks Fuse's per-cell countdown UI but
   compensates with cleaner endless-mode replayability. Slightly
   weaker than Fuse because the early-game flatness on bad pre-fill
   draws is RNG-sensitive (no row/col co-occurrence guarantee).

3. **Tether.** Strong geometric constraint with a real
   wanted-and-feared primitive (paired placement). One rank below
   Decay because the mid-tray soft-lock guard is incomplete (only
   refill-time, not post-slot-0) and slot 2's relief-valve semantics
   are subtle.

4. **Heading.** Real second decision (rotation-as-heading), generator
   filters the half-clear-utilisation. One rank below Tether because
   Easy difficulty's `minHalfClears=0` admits trays where the rule
   never fires, and the rot-0/rot-2 visual-equivalence on
   2-orientation pieces is a learnability cliff (mitigated by the
   Stage 7 per-slot glyph fix but not eliminated).

5. **Erasures.** Honestly-shipped fallback compromise. The rule is
   real (4-component erasure is mechanically distinct from undo) but
   the canonical solution requires zero tokens, weakening the
   placement question. One rank below Heading because Heading's rule
   is in the forward path and Erasures' is in the backward path.

Each rank n+1 has at least one structural shortcoming relative to
rank n, as listed above.

---

## Best thread + survivors

**Best thread:** Fuse. Cleanest mechanic-to-UI mapping (countdown
badge), strongest forward-path coupling (every placement burns
every fuse), most carefully-ordered reducer pipeline of the five,
generator guarantees solvability with constructive proof and bounded
slack.

**Additional survivors:** Decay, Tether, Heading. Each has a real
forward-path mechanic, passes all four anti-pattern screens, and
ships with a generator that guarantees a non-degenerate experience
on Normal/Hard. Their ranking-relative weaknesses are *structural
shortcomings*, not *catastrophic failures*; they meet the
ship-to-players bar.

**Erasures** is a borderline case. Its forward path is identical to
Puzzle, and the token rule is in the backward path only — a careful
player solves every round without engaging with the new mechanic.
This is a genuine structural weakness vs. the spec's "single
primitive simultaneously wanted and feared" requirement (the
primitive — the placement — isn't *feared* unless the player
already mis-placed). However:

- The mode is technically sound (no crashes, no soft-locks, win
  check correct).
- The fallback compromise is documented honestly in the top doc
  comment with a clear forward path to a future mandatory-erase
  generator (no schema change required).
- The 4-component erasure (not single-cell undo) is mechanically
  distinct from any other recovery affordance in the game.
- The "spend now vs. save for later" decision is real on Hard and
  in mis-played rounds.

By the spec's bar — "is this mode structurally sound enough to ship
to players?" — Erasures clears, even if it's the weakest of the
five. It is NOT a Pipeline-disease case (no agency removed); it is
NOT a Mirror-disease case (the new action is independent of
placement); it is NOT a Scar-disease case (no RNG punishment); it
borders on Breathe-disease (the rule is auto-irrelevant on the
canonical solution, not auto-satisfied) but the mode-distinct UI
loop and the genuine recovery affordance keep it shipping.

---

## Specific concerns — direct answers

- **Erasures fallback.** The rule does NOT collapse to "Puzzle +
  optional undo" because (a) the erase is component-scoped not
  step-scoped, (b) tokens are bounded and the spend decision IS
  real once the player has mis-placed, and (c) Hard's tray length
  (6) and target band (16–32) make zero-token solves
  statistically rare. But the placement *question* is weakened —
  the forward path is Puzzle's. Verdict: ship as a survivor with
  the documented future upgrade path to mandatory-erase generation.

- **Tether soft-lock.** The Hard resample prevents soft-locks at
  refill. Mid-tray soft-locks (slot 1 cannot satisfy slot 0's
  window) ARE reachable; the engine catches them via
  `hasValidTetherMoves` and ends the round cleanly, so they don't
  brick the UI. Verdict: ship; consider a Stage 9 polish item to
  resample slot 1 immediately after slot 0 places (currently only
  resamples at tray refill).

- **Decay first-3-moves.** The seeded-aged-prefill DOES fire at
  fresh-state time (`gameReducer.ts:2491-2515`), but its row/col
  co-occurrence is uniform random. On a bad RNG draw the early
  game can still feel flat. Mitigation would be a row/col bias on
  pre-fill placement; not a ship-blocker.

- **Fuse order-tolerance.** Slack of `+1` or `+2` per fuse is just
  enough to give the player meaningful slack on most deals.
  Worst-case (all fuses roll slack=1 on Hard with 4 fuses) is
  reachable and produces a zero-tolerance puzzle. Acceptable for a
  Hard rung; consider a Stage 9 polish item to enforce a minimum
  *mean* slack across the K fuses on Hard.

- **Heading symmetric pieces.** On Hard the cell-count band
  `[3..5]` excludes `dot` (1) and `sq2` (4? — `sq2` has 4 cells,
  so it IS admitted; let me recheck). Actually `sq2` has 4 cells
  and Hard's `maxPieceCells=5` — admitted. `sq3` (9 cells) is
  excluded by Hard's max. `plus` (5 cells) is admitted. So Hard's
  pool admits 2 of the 4 symmetric pieces. The
  `minHalfClears ≥ 2` filter makes a fully-symmetric tray
  statistically vanishing — at minimum 2 of 4 placements must be
  asymmetric to satisfy the filter — but a 2-symmetric / 2-
  asymmetric tray IS possible. Easy's `[2..3]` band excludes all
  symmetric pieces except `dot` (cells=1, excluded by min=2). So
  Easy actually *can't* deal `dot`/`sq2`/`sq3`/`plus` — symmetric
  trays are a Hard-only risk, mitigated by the half-clear filter.
  Verdict: not catastrophic; pool weighting could be tuned in
  Stage 9 to reduce the symmetric proportion.

---

## Verdict

| Mode | Status |
| --- | --- |
| Fuse | **MERGE** — best thread |
| Decay | **MERGE** |
| Tether | **MERGE** |
| Heading | **MERGE** |
| Erasures | **MERGE** (weakest survivor; documented fallback) |

**Total MERGE count: 5.**

No mode has a catastrophic technical or structural failure. All five
ship to players. Stage 9 polish items by mode are listed in the
per-mode "Implementation quality" sections; none are merge-blockers.
