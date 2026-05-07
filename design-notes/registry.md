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

(Populated by Stage 1.)
