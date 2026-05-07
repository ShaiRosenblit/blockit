# Stage 6 — Ranked selection

Score each survivor on the 7 ingredients (0–2 each, max 14). Top score is primary; reserves at ≥11.

## Ingredients

1. **Bounded scope** — finite tray, clear win/lose, fast restart.
2. **Antagonist** — board element actively defeated.
3. **Dual-purpose mechanic** — primitive both wanted and feared.
4. **Order matters** — placement order changes outcome.
5. **Negative space matters** — where you don't place is constrained.
6. **Solvability guarantee** — generator proves every instance winnable.
7. **Structural aha** — insight from system, not flavor.

## Scores

| ID | Name | 1 | 2 | 3 | 4 | 5 | 6 | 7 | Total |
|----|------|---|---|---|---|---|---|---|-------|
| L4-2 | Quarantine | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **14** ⭐ |
| L1-6 | Board Spin | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 13 |
| L2-1 | Plague | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 13 |
| L3-2 | Twin Bond | 2 | 1 | 2 | 2 | 1 | 2 | 2 | 12 |
| L8-3 | Hoard | 2 | 2 | 2 | 2 | 1 | 1 | 2 | 12 |
| L2-2 | Siege | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 11 |

## Justifications (selected scores)

**Quarantine (14)**: every ingredient maxed.
- Bounded: explicit per-region targets, finite tray.
- Antagonist: walls + per-region budgets.
- Dual-purpose: a boundary-spanning piece serves region A AND region B simultaneously — wanted by one, feared by the other.
- Order: filling region A early may make a bridge piece illegal.
- Negative space: per-region empty count IS the win condition — most negative-space-central of any survivor.
- Solvability: cleanest forward-sim of the 6 (target = sim result).
- Structural aha: number-budget on geometric placement is novel for Blockit.

**Board Spin (13)**: negative space scored 1 because spin-survival of saved empty cells is a real concern but not the centerpiece.

**Plague (13)**: negative space 1 because gaps near infected cells are constrained but not as central as Quarantine.

**Twin Bond (12)**: antagonist 1 — bond timer is internal state, not a tangible board element. Negative space 1 — the partner's reserved touch zone is constrained but transient.

**Hoard (12)**: solvability 1 — generator state space (board × tray × queue cursor) is more complex than others; reject rate ~80%.

**Siege (11)**: dual-purpose 1 — pieces feed wall-clear OR feed score, but it's the same primitive (placement) doing the same thing in different rows; not strongly two-faced. Structural aha 1 — Tetris-derivative pattern, less novel.

## Selection

- **Primary**: L4-2 Quarantine (14)
- **Reserves** (≥11): L1-6 Board Spin (13), L2-1 Plague (13), L3-2 Twin Bond (12), L8-3 Hoard (12), L2-2 Siege (11)

For the run target of 1–3 modes, the ranked plan is:
1. Implement Quarantine first (Stage 7 → 8 → 9 → 10).
2. If Stage 9 passes and the run still has budget (≤3 cumulative Stage-9 failures, ≤3 modes merged): try Board Spin next.
3. If still under budget: try Plague.

Top score (14) clears the threshold ≥11 by a large margin — proceeding to Stage 7.
