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

## Stage 2 — first-pass structural filter (in progress)

Survivors: TBD

