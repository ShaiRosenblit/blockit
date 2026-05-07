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

## Stage 3 — reducer simulation traces (in progress)


