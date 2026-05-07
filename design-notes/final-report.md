# Final report — autonomous mode-design run

Branch: `mode-explore-20260507-1410`
Run start: 2026-05-07 14:10 IDT
Run end: 2026-05-07 18:30 IDT (approx.)

## Candidate funnel

| Stage | In | Out | Method |
| --- | --: | --: | --- |
| Stage 1 — divergent generation | (empty) | 64 | 8 generator subagents, one per design lens, 8 candidates each |
| Stage 2 first-pass | 64 | 34 | 4 cross-mixed evaluators on shuffled C01..C64 slices |
| Stage 2 second-pass | 34 | 11 | 1 evaluator on full re-mixed pool with cluster-cap diversity rule |
| Stage 3 — simulation traces | 11 | 5 | 3 trace agents walked 6–10 move sequences |
| Stage 4 — generator feasibility | 5 | 5 | 1 evaluator did per-candidate generator design |
| Stage 5 — slate locked | 5 | 5 | (commitment doc, no further filtering) |
| Stage 6 — implementation | 5 | 5 | 5 implementation agents + 1 fix agent; ~6200 LOC |
| Stage 7 — playtest | 5 | 5 | 1 Playwright agent + 1 fix agent (Heading glyph) |
| Stage 8 — comparative eval | 5 | 5 | 1 evaluator, all 5 voted MERGE |

Subagent budget at end: generators 8/16, evaluators 11/16. Implementation
agents (5 mode + 2 fixes) and the housekeeping pool/shuffle agent are
outside the eval/judge budget.

## Implemented and merged modes (5)

### Heading (orientation → clear-half coupling) — best thread runner-up

Each placement records its heading (orientation 0..3 = UP/RIGHT/DOWN/LEFT).
A row clear from a placement with heading LEFT erases only columns 0..3
of that row, leaving 4..7 filled. RIGHT erases 4..7, UP erases rows 0..3
of a cleared column, DOWN erases 4..7. Square / monomino / X-pentomino
have heading "FULL" (no rotation distinction) and clear normally.

**New placement question:** Which orientation do I rotate this piece to,
knowing the orientation determines which half of the row it would clear
gets erased and which half stays as residue?

**Antagonist:** the residue from prior half-clears — partial filled rows
that the player must either clear with a matching heading (full half) or
build into completable lines.

**Dual-purpose mechanic:** rotation is simultaneously wanted (to fit the
piece into the gap) and feared (because it changes which half of the
clear remains).

### Decay (cell age gates line clears)

Every cell carries an integer age set to 0 on placement and incremented
by 1 after every subsequent placement. A row or column clears only when
every filled cell in the line has age ≥ T (T = 4 / 3 / 2 by easy /
normal / hard). Aged pre-fill cells are seeded at age T to give the
player early agency. Cells render with progressively darker tint.

**New placement question:** When do I close a row knowing it freezes
that region for ~T turns until cells age into clear-eligibility?

**Antagonist:** the calendar — every closed-but-unripe row blocks
placements above and around it for the duration of its ripening.

**Dual-purpose mechanic:** filling a row is simultaneously wanted (it
will eventually clear and score) and feared (it locks down the region
for T turns).

### Fuse (countdown antagonist coupled to line clears) — best thread

Pre-fill includes fuse cells with integer countdowns 1..K painted on
them. Every placement decrements every fuse's countdown. A fuse at 0
explodes: each of its 4-neighbor empty cells becomes a permanent
indestructible wall, and the fuse itself becomes a wall. Win = tray
empty AND board matches target AND no fuses remain. Generator places
fuses on cells the canonical-solution simulation passes through cleared
lines, with countdown = `clearMove + slack(1..2)` so the canonical order
defuses each fuse before its expiry.

**New placement question:** Do I spend this placement on target-pattern
progress or on a fuse-defusing line clear before the countdown reaches
zero?

**Antagonist:** the fuse countdowns themselves — each one is a clock
the player must beat with a row/column clear that includes that fuse.

**Dual-purpose mechanic:** line clears are simultaneously wanted (to
defuse fuses) and feared (because they erase progress on the target).

### Erasures (finite erase tokens delete player components)

Finite-tray puzzle on a heavily pre-filled board where the player owns
K erase tokens (3 / 5 / 7 by easy / normal / hard). Each token spent
deletes one 4-connected component of player-placed cells (NOT pre-fill,
NOT walls). Win = standard target match after tray is exhausted.

**New placement question:** When do I spend a finite erase token to
remove a player-placed component, knowing each spend foregoes a future
spend?

**Antagonist:** the player's own scaffolds — placements that helped
solve a sub-problem but now block the next sub-problem.

**Dual-purpose mechanic:** placing a piece is simultaneously wanted (to
build toward the target) and feared (because it may form a component
the player will later need to spend a token to remove).

**Documented compromise:** the shipped generator uses the
"escape-valves" path — the puzzle is solvable without spending tokens.
The mandatory-erase path (where every solution requires ≥ 1 token) is
documented as future work in `erasuresPuzzleGenerator.ts`. In the
shipped form, Erasures' placement question survives only when the player
mis-plays — making it the weakest of the five (Stage 8 ranked it 5th).
But the K-token-spend-decision still creates a real if optional tradeoff.

### Tether (paired-tray Chebyshev-2 origin coupling)

Tray has 3 slots. Slots 0 and 1 are paired; slot 2 is free. When
the player places a piece from a paired slot, the next placement from
its partner slot must include at least one cell within Chebyshev-2 of
any cell of the previous placement. Slot 2 placements never trigger
or consume the tether constraint. Endless score-attack with tray
refill. Hard difficulty's sampler enforces `minTetherOptions ≥ 2` at
every refill.

**New placement question:** Where do I anchor this piece knowing its
tray-partner's next placement must fit within Chebyshev-2 of any cell
of mine?

**Antagonist:** the shrinking legal-origin space — each paired
placement narrows the next paired placement's choices, and a careless
anchor can soft-lock the partner.

**Dual-purpose mechanic:** the placement origin is simultaneously
wanted (for the current piece's score / line completion) and feared
(because it constrains the partner's next move).

## Why at least 3 survived merge

Stage 8 confirmed all 5 implementations are structurally sound enough
to ship. The single-evaluator vote was unanimous-MERGE. The Stage 8
ranking 1=Fuse, 2=Decay, 3=Tether, 4=Heading, 5=Erasures separates the
five by structural strength but no mode falls below the bar of "is
this structurally sound enough to ship to players?" The spec's floor
of 3 merged survivors is exceeded by 2.

The single most important comparison-pressure insight from Stage 8:
**mechanic location matters more than mechanic strength**. The four
modes whose new rule lives in the *forward path* (Heading, Decay,
Fuse, Tether) force engagement on every placement; Erasures' rule
lives in the *backward path* and only fires on misplays. That's the
single structural weakness separating Erasures from the other four.

## Anti-pattern proof for each survivor

For each survivor, all four anti-pattern verdicts are PASS. Detailed
reasoning lives in `stage8-evaluation.md`; summary here:

| Mode | Mirror | Breathe | Pipeline | Scar |
| --- | :---: | :---: | :---: | :---: |
| Heading  | PASS — heading is a player choice (rotation count), not auto-derived from origin | PASS — half-clear rule is not implied by target-match | PASS — adds a new orientation decision dimension | PASS — heading is fully visible per slot |
| Decay    | PASS — age threshold is per-cell state, not derived from placement | PASS — clear-on-age-≥-T is not implied by classic clear rule | PASS — adds a temporal planning dimension | PASS — ages are visible per cell tint |
| Fuse     | PASS — fuse countdowns are independent of placement choice | PASS — fuse-clearance rule is not auto-implied by target-match | PASS — adds defusal scheduling on top of target-progress | PASS — countdowns are visible badges |
| Erasures | PASS — token spend is a separate verb | PASS — erase-on-component is not implied by target-match | PASS — adds the token-spend decision | PASS — token count is visible |
| Tether   | PASS — tether window is partner-determined but the player still chooses partner-origin within it | PASS — tether constraint is not implied by placement legality alone | PASS — adds origin-anchoring planning | PASS — window outline is rendered |

## Comparison against Puzzle mode (the canonical positive example)

Puzzle mode's structural strengths:
- **Bounded scope** — finite tray, clear win/lose state, fast restart.
- **Antagonist** — the pre-fill the player must clear away.
- **Dual-purpose mechanic** — line clears (a Classic reward) become a strategic verb.
- **Order matters** — clears change the board, so placement order alters intermediate states.
- **Negative space matters** — target cells outside the pattern must end empty.
- **Solvability guarantee** — forward-simulation generation.
- **Structural aha** — clears repurposed.

Where each survivor matches:

| Mode | Bounded | Antagonist | Dual | Order | Negative | Solvable | Aha |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Heading  | Y | Y (residue from half-clears) | Y (rotation as half-selector) | Y | Y (target excludes residue) | Y (forward sim) | Y (rotation as a placement question, not just a fitting tool) |
| Decay    | endless, but well-bounded by board state | Y (calendar) | Y (filling a row both wins and locks region) | Y (placement order = ageing schedule) | Y (empty cells age too) | trivially solvable for endless | Y (you don't always want to clear) |
| Fuse     | Y | Y (countdowns) | Y (line clears) | Y | Y (fuse cells must end cleared) | Y (forward sim with backward-fuse-seeding) | Y (every move has dual coding) |
| Erasures | Y | Y (player's own scaffolds) | Y (placement) | Y | Y | Y | weak — escape valves are optional |
| Tether   | endless | Y (shrinking legal origins) | Y (origin) | Y | Y (avoid origins that shrink the partner window) | trivially solvable | Y (origin is a constraint-shaping decision) |

## What new placement questions do the survivors introduce?

(Restated cleanly, for the comparison-against-Puzzle audit.)

| Mode | New placement question |
| --- | --- |
| Heading  | Which orientation do I pick, knowing it determines which half of the row clear gets erased? |
| Decay    | When do I close a row, knowing it freezes the region for T turns? |
| Fuse     | Do I spend this placement on target progress or on a fuse-defusing clear? |
| Erasures | When (and on which scaffold) do I spend a finite erase token? |
| Tether   | Where do I anchor knowing the partner's origin must be within Chebyshev-2? |

None of these questions appears in Classic, Puzzle, Chroma, Gravity,
Drop, Monolith, Quarantine, Mirror, Breathe, Pipeline, or Scar.

## Postmortem on rejected candidates

64 generated; 59 rejected. Highlights of the rejection postmortem:

**Cluster collapse — multiple candidates ate each other.** The
spreading-antagonist cluster (10 first-pass keeps) collapsed to 1
survivor (Fuse) after Stage 3 — Vermin had a corner-trap degeneracy,
the rest were variants on "spread one cell each turn" that asked the
same placement question. Lesson: the lens-as-source approach
overproduces same-question variants.

**Negative-space cluster collapsed entirely.** Hollow's win-time check
made line clears structurally impossible (every winnable instance must
put a forbidden cell in every row & col). Census's component-histogram
reduced to combinatorial arithmetic, not spatial intuition. Aperture
and Vault-II were eaten by Hollow / Census in Stage 2 cluster-cap.
Lesson: negative space is a hard constraint to make playable on an 8×8
finite-tray board.

**Hidden-target / deduction cluster collapsed entirely.** Echo-III,
Echo-II, Compass — all reduced to Picross-genre clash. Without an
undo and with finite-tray finality, hidden-target play is unforgiving
in a way that doesn't match Blockit's "drop and clear" feel.

**Inversion cluster collapsed entirely.** Carve had no middle ground
(trivial or unwinnable). Shadow Cast was brain-teaser-shaped. Negative
Piece was complexity-risky. Echo-IV was ate by Carve at Stage 2.
Lesson: inversion is structurally fragile — most flipped primitives
break the game's solvability guarantees.

**Pipeline-disease catches were the most common failure mode.** Many
"resource budget" and "information" candidates collapsed to "remove
agency without adding agency" — Skips, Rotations (Lens 5 batch), Pulses,
Quartet, Polarity-II, Sonar, Brail. The discipline of asking "what
NEW agency does this add?" caught all of them in Stage 2.

## Suggested future exploration directions

1. **Mandatory-erase path for Erasures.** The escape-valves fallback
   weakens the mode. A generator that produces puzzles where every
   solution requires ≥ K token spends — by interleaving placements and
   erases in the forward sim — would push Erasures into the
   forward-path bucket.

2. **Heading Easy `minHalfClears ≥ 1`.** The current Easy allows
   puzzles where no half-clear ever fires. A player who learns Heading
   from Easy may never see the rule in action. Tightening Easy's
   filter would help onboarding without adding difficulty.

3. **Tether slot-2 as relief valve, not skip-turn.** Currently slot
   2 placements leave `lastPairedPlacementCells` unchanged, so the
   tether window persists. Making slot 2 *reset* the window would
   give the player explicit relief and might map better to the
   player's mental model.

4. **Decay difficulty scaling on large pre-fill.** The current spec
   tunes the age threshold and pre-fill count separately. A mode
   variant where pre-fill cells start at *non-uniform* ages (some
   ripe, some still ripening) could create a different planning
   shape worth exploring.

5. **Negative space, retried.** None of the negative-space candidates
   shipped. A future run could push harder on the "empty cells form
   a target shape" idea with a generator that proves matchability via
   a different construction strategy than forward-sim.

6. **Hybrid modes.** Each survivor exercises one design lens cleanly.
   A natural extension: combine two — e.g. Fuse + Heading (fuses
   defused only by half-clears toward them), or Decay + Tether
   (paired tray + age threshold). These are higher-risk but higher-
   ceiling design directions for a follow-up run.

## Branch and merge metadata

(Filled in at merge time — see `stage9-merge.md`.)
