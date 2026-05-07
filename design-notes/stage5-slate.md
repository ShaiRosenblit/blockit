# Stage 5 — implementation slate (final, committed)

The slate contains exactly **5 candidates**, the floor of the spec's allowed
range (5–7). All five passed Stages 2, 3, and 4 (anti-pattern screen,
6–10-move simulation trace, generator feasibility analysis).

## The slate

| ID | Name | Cluster | Distinct placement question |
| --- | --- | --- | --- |
| C11 | Erasures | resource | When do I spend a finite erase token to remove a player-placed component, knowing each spend foregoes a future spend? |
| C14 | Decay | topology / temporal | When do I close a row knowing it freezes that region for ~3 turns until cells age into clear-eligibility? |
| C39 | Heading | coupling (orientation → clear half) | Which orientation do I rotate this piece to, knowing the orientation determines which half of the row it would clear gets erased? |
| C47 | Fuse | spreading-antagonist (timer) | Do I spend this placement on target-pattern progress or on a fuse-defusing line clear before the countdown reaches zero? |
| C62 | Tether | coupling (origin → origin) | Where do I anchor this piece knowing its tray-partner's next placement must fit within Chebyshev-2 of any cell of mine? |

All five questions are demonstrably absent from Classic and from the four
bad shipped modes (Mirror, Breathe, Pipeline, Scar). All five questions
are demonstrably absent from Puzzle, Chroma, Gravity, Drop, Monolith,
and Quarantine, by inspection of those modes' rule sets.

## Why each survived (vs candidates that didn't)

- **C11 Erasures** survived because the erase-token unit is a 4-connected
  *component* of player-placed cells, not a single cell. This forces a
  topology decision the player faces actively (do I keep my scaffolds
  separate so I can erase one without erasing the other?). The token-as-undo
  failure mode is real but mitigated by the tray being finite and the
  generator filter requiring ≥1 mandatory erase. Other resource candidates
  (Pre-clears, Stamps, Bash, Skips, Rotations, Charges, Reservoir, Toll)
  collapsed to Pipeline disease, Breathe disease, or "tap-to-use verb."

- **C14 Decay** survived because the 3-turn ageing rule creates a
  multi-turn calendar question — the player is choosing among
  intermediate boards, not just final boards. Two viable strategies
  (bank-and-cascade vs steady ageing) survived the trace. Competing
  topology candidates (Carousel, Hot Frame, Migrate, Tide-I, Toroidal,
  Ferris) collapsed for various reasons (cosmetic effect, pure
  subtraction, or single-pass dominant strategy).

- **C39 Heading** survived because rotation is repurposed from "flatten
  the piece into the gap" (the only Classic question rotation answers)
  into "decide which half the line clear erases" — a wholly new question.
  Square / monomino pieces have no defined heading and the generator
  excludes them. Competing coupling candidates (Yoke, Polarity-I, Charge,
  Toll, Cargo, Companion, Quartet) fell to Mirror disease or Breathe
  disease.

- **C47 Fuse** survived because fuses give every move a dual-coded
  question: progress on target AND defusal scheduling. The trace produced
  three viable strategy modes (defuse-first, risk-tolerant, co-opt), and
  the Stage 4 feasibility design uses backwards-construction with
  countdown slack to keep solutions order-tolerant. Competing
  spreading-antagonist candidates (Cancer, Crust, Smother, Vermin, Bloom,
  Solvent, Tide-II, Hourglass) collapsed for Scar disease or single-shot
  trivialisation. Vermin had a corner-trap degenerate strategy. Cancer
  and Bloom were neighbor-threshold but the player's response was always
  "just place onto the spreader," not a strategic choice. Fuse couples
  defusal to LINE CLEARS, which is what gives it the dual-purpose
  primitive.

- **C62 Tether** survived because the slot-2 origin is genuinely
  constrained by the slot-1 origin — the player faces a real "anchor
  decision" that maximises slot-2's options. Soft-lock is mitigated by
  generator constraint `minTetherOptions ≥ 2` at every step. Competing
  coupling candidates failed for the reasons above.

## Diversity audit

5 candidates across 5 clusters:

- Resource (C11)
- Topology / temporal (C14)
- Coupling: orientation→clear (C39)
- Spreading antagonist with timer (C47)
- Coupling: origin→origin (C62)

No two candidates ask the same placement question. No two candidates
share a primary mechanic. The slate covers a meaningful breadth of
design space.

What the slate **lacks**:

- No deduction / hidden-target candidate (every variant collapsed to
  Picross-genre clash or to Scar disease).
- No negative-space candidate (Hollow killed line clears structurally,
  Census reduced to combinatorial arithmetic, Aperture / Vault-II were
  cut for cluster diversity earlier).
- No inversion candidate (Carve had no middle ground, Shadow Cast was
  brain-teaser-shaped, Negative Piece was complexity-risky).

These absences are **deliberate** — every candidate in those clusters
that reached Stage 3 either failed the trace or was structurally
indistinct from a survivor in another cluster. Forcing a survivor from
those clusters would mean shipping a structurally weaker mode for
diversity's sake.

## Commitment

Per the spec: from this point forward, all 5 candidates will be
implemented fully (Stage 6). Implementation may surface bugs that
require fixes but ONLY a structural flaw (not implementation difficulty)
justifies dropping a candidate before Stage 8 comparative evaluation.

Stage 8 must produce **at least 3 surviving merged implementations**.
With 5 going into Stage 6, the safety margin is 2.

Implementation order (simplest → most complex):

1. **C39 Heading** — variant of finite-tray puzzle; rule is local to clear semantics. Smallest delta.
2. **C14 Decay** — endless score-attack with cell ages. New per-cell state but no new generator concept.
3. **C47 Fuse** — finite-tray puzzle with fuse cells + backwards-construction generator.
4. **C11 Erasures** — finite-tray puzzle with K erase tokens. Needs tap-to-erase UI.
5. **C62 Tether** — endless score-attack with paired-tray constraint + status indicator.
