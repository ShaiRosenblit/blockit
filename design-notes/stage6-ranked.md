# Stage 6 — Ranked selection

Score each remaining candidate 0–2 on each of the 7 ingredients. Max 14.

| Candidate | Bnd | Antag | Dual | Order | NegSpc | Solvbl | Aha | Total |
|-----------|-----|-------|------|-------|--------|--------|-----|-------|
| F4 Vault | 2 | 2 | 2 | 2 | 1 | 1 | 2 | **12** |
| F8 Perimeter | 2 | 1 | 2 | 2 | 2 | 2 | 1 | **12** |
| F9 Detonators | 2 | 2 | 2 | 2 | 1 | 2 | 2 | **13** |
| F11 Monolith | 2 | 1 | 2 | 2 | 2 | 2 | 2 | **13** |

Justification (terse):

- **Bounded**: all four have clean win/lose, 8×8 board, finite tray.
- **Antagonist**: Vault cells are explicit defeats; Detonators has overflow timer; Monolith has fragmentation threat (clears = self-inflicted antagonist); Perimeter's pre-fill on border is mild.
- **Dual-purpose**: Vault — clears (normal vs double); Perimeter — clears (delete + evict); Detonators — line completion (target progress + overflow); Monolith — clears (delete pre-fill + fragment monolith). All 2.
- **Order**: all four have strong order coupling.
- **Negative space**: Perimeter explicitly (border empty); Monolith implicitly (cells outside connected region); Vault and Detonators less so.
- **Solvability**: Detonators, Perimeter, Monolith have clean forward-sim. Vault is hairier (1).
- **Structural aha**: Vault, Detonators, Monolith have crisp insights ("double-clear", "save detonators", "don't fragment"). Perimeter's "border evicts via clears" is decent but less crisp (1).

## Ranking

1. **F11 Monolith** (13) — primary
2. **F9 Detonators** (13) — reserve 1
3. **F8 Perimeter** (12) — reserve 2
4. **F4 Vault** (12) — held; generator complexity penalty makes it last

Tiebreak between Monolith and Detonators: Monolith has the **cleanest dual-purpose mechanic** (the same primitive — placement adjacency — is BOTH the win-vector and the constraint, and clears are the bidirectional dual-use), the **lowest generator risk**, and the **clearest structural aha** ("the connection is the puzzle"). Detonators is also strong but has more rule surface (detonator UI, overflow counter, value comparison) which adds implementation surface.

**Primary candidate: Monolith.** Proceed to Stage 7.
