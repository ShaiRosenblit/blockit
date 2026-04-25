# Section 1 — Why this run exists (verbatim ground truth)

Four modes were recently shipped — Mirror, Breathe, Pipeline, Scar — and on review they are all bad. The reasons are diagnosed below and are non-negotiable inputs to your work. Your job is to find one to three new modes that do not have any of these problems.

## The "10th play" test

> *If a player is on their 10th attempt of this mode, what new question does each placement decision ask them — that the base game wouldn't already ask?*

If the answer is "none" or "the same question repeated," the mode is bad. This test trumps everything else.

## The 7 ingredients of a good Blockit mode

A good mode satisfies all of these:

1. **Bounded scope** — finite tray, clear win and lose state, fast restart.
2. **Antagonist** — something on the board that the player must actively *defeat*, not merely *absorb*.
3. **Dual-purpose mechanic** — a single primitive (line clears, rotation, color, the tray) that the player simultaneously *wants* and *fears*, depending on context.
4. **Order matters** — the same set of pieces placed in different orders gives different boards (placement decisions are coupled across pieces, not local).
5. **Negative space matters** — where the player *doesn't* place is constrained too.
6. **Solvability guarantee** — the generator proves every instance is winnable (typically via forward-simulation).
7. **Structural aha** — the moment of insight comes from understanding the system, not from a flavor gimmick.

Puzzle mode is the canonical positive example. It re-purposes line clears (in Classic, a *reward*) into the player's *strategic verb for deleting pre-fill*. The same primitive does double duty. Pre-fill is the antagonist. Order matters because clears change the board. Negative space matters because target cells outside the pattern must end empty. The generator proves solvability via forward simulation. **Read `src/game/puzzleGenerator.ts` end-to-end before you generate any candidates** — it is your design exemplar.

## The 4 anti-patterns (named — every candidate must be screened against all four)

- **Mirror disease**: extra constraint that's a *function* of a choice the player already makes, not a new choice. Test: trace the placement decision; if the new rule is automatic given the existing decision, fail.
- **Breathe disease**: extra rule that is auto-satisfied by the conjunction of the other rules. Test: list all win sub-conditions; if the new rule is implied by the others, fail.
- **Pipeline disease**: agency removed without comparable agency added. Test: list decisions removed vs. added relative to the base mode; if subtraction wins, fail.
- **Scar disease**: random uncontrollable punishment. Test: can the player learn a rule that lets them direct or exploit the new mechanic? If no, fail.

## Mechanics-speak vs. marketing-speak (forbidden vs. required)

Every candidate description must be in **mechanics-speak**:

> ❌ "Mirror mode makes you think about both halves of the board at once."
> ✅ "Every placement also writes the same shape, mirrored across the vertical axis. Pre-seeded blockers may exist asymmetrically. Win = match target. New decision asked: none — placement determines mirror automatically."

The forbidden form is verb phrases about the player's experience ("makes you think," "challenges you to," "rewards mastery"). The required form is concrete state transitions and an explicit listing of what new question, if any, the player faces. If you catch yourself writing marketing-speak, rewrite in mechanics-speak before continuing.
