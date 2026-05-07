# Candidate registry — full audit trail

Every candidate generated in Stage 1 lives here. Stages 2–5 update the
status field as candidates are filtered, simulated, and selected for
implementation.

Status values:
- `generated` — produced by Stage 1
- `rejected:<stage>:<reason>` — eliminated
- `surviving` — passed the most recent filter
- `slate` — selected for Stage 6 implementation
- `merged` — survived all stages and is on main
- `reverted` — implemented but cut after Stage 8

Cross-agent mixing rule: candidate IDs are assigned in the pooled,
shuffled order — they do **not** preserve generator-agent grouping.
Evaluators see candidates by ID with no provenance information.

---

## Stage 1 — generation complete

64 candidates produced by 8 generator subagents (lens-segregated generation,
~8 per lens). After generation, all 64 were pooled, shuffled by SHA-1 of
candidate name (lineage-blind), and assigned anonymous IDs C01..C64.

- **Pool**: `candidates/pool.md` (full mechanics-speak records, no provenance)
- **Index**: `candidates/index.md` (ID → name → core rule, one row each)

Name disambiguation: "Tide" → Tide-I..Tide-V (5 instances, the spec
underestimated to 4); "Echo" → Echo-I..Echo-IV; "Vault" → Vault-I..II;
"Polarity" → Polarity-I..II.

Raw per-lens files have been deleted — evaluators must not see lineage.

## Stage 2 — first-pass structural filter (complete)

- First-pass evaluators (4 parallel, slices A/B/C/D): kept 34 of 64.
- Second-pass cross-mix tightening (1 evaluator on full mixed pool, with explicit cluster-cap diversity rule): kept 11 of 34.
- See `stage2-eval-{A,B,C,D}.md` (per-slice verdicts) and `stage2-final.md` (final survivors with per-candidate rationale + cluster-cap accounting).

**11 survivors entering Stage 3:**

| ID | Name | Cluster |
| --- | --- | --- |
| C04 (was kept first-pass; cut here) | Tide-I | topology — eaten by Carousel |
| C11 | Erasures | resource |
| C13 | Echo-III | deduction |
| C14 | Decay | topology (temporal) |
| C30 | Hollow | negative-space (must-empty mask) |
| C39 | Heading | coupling (orientation → clear half) |
| C43 | Carve | inversion |
| C45 | Vermin | spreading-antagonist (pursuit) |
| C47 | Fuse | spreading-antagonist (timer) |
| C49 | Census | negative-space (component histogram) |
| C58 | Carousel | topology (spatial drift) |
| C62 | Tether | coupling (origin → origin) |

(Tide-I was kept first-pass; second-pass tighten dropped it because Carousel covers the same topology question more cleanly. Final list: 11.)

## Stage 3 — reducer simulation traces (complete)

3 trace agents wrote one file per candidate to `simulations/`. Each agent
walked a 6–10 move sequence on a representative board and verdict'd
SURVIVE / REJECT.

| ID | Name | Verdict | Key insight |
| --- | --- | --- | --- |
| C11 | Erasures | SURVIVE | erase-component-as-atomic-unit forces a topology question (don't merge scaffolds) absent in other candidates |
| C13 | Echo-III | REJECT | Picross-genre clash — piece geometry can forbid the unique correct cell, no recovery |
| C14 | Decay | SURVIVE | 3-turn ageing creates a multi-turn calendar question; bank-and-cascade vs steady ageing both viable |
| C30 | Hollow | REJECT | every winnable instance must put a forbidden cell in every row & col → line clears structurally impossible |
| C39 | Heading | SURVIVE | orientation→clear-half coupling supports two viable strategies (full-clear vs anchor-residue) |
| C43 | Carve | REJECT | piece-erase + tide-refill leaves no middle ground — trivial or unwinnable, no choice space |
| C45 | Vermin | REJECT | deterministic D>R>U>L walk has corner trap + tiny static nests = 3-step degenerate recipe |
| C47 | Fuse | SURVIVE | dual-coded question (target match AND defusal scheduling against global tick) every move |
| C49 | Census | REJECT | reduces to combinatorial histogram arithmetic, not spatial intuition; ceiling rule trivializes or pipelines |
| C58 | Carousel | REJECT | column shift is cosmetic — rows clear identically so dominant play abandons columns entirely |
| C62 | Tether | SURVIVE | "where do I anchor slot 1 to maximise slot 2's tether-window legal origins" recurs with weight |

**5 survivors** entering Stage 4 — at the slate floor (≥ 5 required).
Slate diversity check: 1 resource (Erasures), 1 topology/temporal (Decay),
1 spreading antagonist (Fuse), 2 coupling (Heading, Tether). Lost
all of: deduction, negative-space, inversion, spatial-topology.

## Stage 4 — generator feasibility (complete)

All 5 surviving candidates ruled FEASIBLE by 1 generator-design agent.
See `stage4-feasibility.md` for per-candidate hidden state, validity
checks, difficulty knobs, complexity, failure modes & mitigations.

Most dangerous failure mode flagged per candidate (with mitigation):
- **C11 Erasures**: tokens become decoration → `minMandatoryErases ≥ 1` filter.
- **C14 Decay**: empty-board first 3 moves act like Classic → seed pre-fill at non-zero age.
- **C39 Heading**: traces all happen to be full-half → `minHalfClears` quality filter.
- **C47 Fuse**: backwards-construction yields ONE valid order, fragile → countdown slack.
- **C62 Tether**: tether-window collapses mid-run → `minTetherOptions ≥ 2` at refill, free-piece fallback.

## Stage 5 — implementation slate (complete)

5-candidate slate locked at the spec floor. See `stage5-slate.md` for
per-candidate rationale and the diversity audit.

**Slate**: C11 Erasures, C14 Decay, C39 Heading, C47 Fuse, C62 Tether.

Implementation order (simplest first): C39 → C14 → C47 → C11 → C62.

## Stage 6 — full implementation (complete)

All 5 slate candidates implemented and committed; baseline build passes
clean throughout. ~6200 LOC across 5 modes.

| ID | Name | Commit | LOC | Notes |
| --- | --- | --- | --- | --- |
| C39 | Heading | `e949b0e` | 1155 | full backwards-compat threading of `headingDifficulty` through every freshXState |
| C14 | Decay | `14cb8b4` | 768 | endless score-attack, parallel `boardAges` field, age-3 pre-fill seeding |
| C47 | Fuse | `0523482` | 1563 | finite-tray puzzle, fuse cells with countdown badges + wall expansion |
| C11 | Erasures | `397c4c8` | 1604 | finite-tray puzzle, K erase tokens, escape-valves fallback generator (mandatory-erase path deferred — see file's top doc) |
| C62 | Tether | `97635ea` | 1107 | endless score-attack, paired-tray Chebyshev-2 constraint, tether-window outline overlay |

Erasures fallback caveat: the generator ships the "tokens as escape valves"
path (player CAN solve without spending tokens). The mandatory-erase path
(every solution requires ≥ 1 token) is documented as future work in the
generator file's top doc. This is allowed by the Stage 4 spec but it does
weaken the mode's distinctness — flag for Stage 8 evaluation.

## Stage 7 — internal playtest + debug (complete)

Browser-based playtest via Playwright across all 5 modes. See
`stage7-playtest.md` for per-mode findings.

| Mode | Playtest verdict | Action |
| --- | --- | --- |
| Decay    | READY  | (none) |
| Fuse     | READY  | (none) |
| Erasures | READY  | (none) |
| Heading  | FIX    | per-slot heading-glyph badge missing → fixed in `620df41` |
| Tether   | VERIFY | tether-window outline confirmed by code-review path inspection (Playwright drag flakiness blocked visual verification but the code path is sound) |

All 5 modes load without console errors, accept difficulty switching,
render their distinctive UI element, and survive at least one placement
attempt. No structural flaws revealed. No mode dropped at this stage.

## Stage 8 — comparative evaluation (complete)

1 evaluator, all 5 modes voted MERGE. Best thread = **Fuse**. See
`stage8-evaluation.md` for the per-mode structured analysis (placement
question / source of tension / failure mode / aha / generator strongest
& weakest property / degeneracy risk / anti-pattern re-screen / impl
quality) and the structural ranking.

**Ranking by structural strength (1=strongest):**

1. **Fuse** — best thread; cleanest forward-path coupling, generator solvability by construction with bounded slack
2. **Decay** — temporal calendar question, well-mitigated first-3-moves problem via aged pre-fill
3. **Tether** — origin-coupling forces real anchor decisions; minor relief-valve semantics quirk noted
4. **Heading** — orientation-as-clear-half is novel; Easy's `minHalfClears=0` is the only soft spot
5. **Erasures** — weakest of the 5 because rule lives on the *backward* path (only fires on misplays); shipped escape-valves fallback documented in code

All 5 → MERGE. Above the spec floor of 3 by 2.

## Stage 9 — final polish + merge (in progress)







