# Candidate registry

Total candidates considered: 64 (across 8 lenses, 8 candidates each).
Stage 2 survivors: 18.

Per-candidate detail lives in `stage1/lens<N>-*.md`. Stage 2 verdicts in `stage2-screen.md`.

## Lens 1 — Repurpose primitive (Opus)
- L1-1 Magnet — KILL (line-clear-disabled drops the dual-purpose-of-clears anchor)
- L1-2 Pivot Budget — KILL (near-duplicate of L5-1)
- **L1-3 Chord** — KEEP
- L1-4 Slot Modes — KILL (3 verbs at once = cognitive overload)
- **L1-5 Color Chord Clear** — KEEP
- **L1-6 Board Spin** — KEEP
- **L1-7 Tetromino Tax** — KEEP
- L1-8 Color Key — KILL (mechanical sibling of L1-5; L1-5 wins)

## Lens 2 — Antagonist (Sonnet)
- **L2-1 Plague** — KEEP
- **L2-2 Siege** — KEEP
- **L2-3 Fuse** — KEEP
- L2-4 Anchor — KILL (Monolith overlap)
- L2-5 Flood — KILL (redundant with Plague)
- L2-6 Rival — KILL (redundant)
- L2-7 Chain — KILL (Breathe disease — auto-satisfied)
- L2-8 Tide — KILL (redundant with Siege)

## Lens 3 — Couple decisions (Opus)
- L3-1 Tally — KILL (cognitive overload — modular tag-sum)
- **L3-2 Twin Bond** — KEEP
- L3-3 Slot Lens — KILL (Pipeline disease — author flagged)
- **L3-4 Axis Vow** — KEEP
- **L3-5 Footprint Echo** — KEEP
- L3-6 Quartet Cap — KILL (rotation-as-resource redundant)
- L3-7 Color Pact — KILL (Chroma overlap)
- L3-8 Pivot — KILL (cognitive overload — Chebyshev rings)

## Lens 4 — Negative space (Sonnet)
- **L4-1 Lacuna** — KEEP
- **L4-2 Quarantine** — KEEP
- L4-3 Airlock — KILL (subsumed by Lacuna)
- L4-4 Fault — KILL (arbitrary diagonal rule, flavor-driven)
- L4-5 Vault — KILL (generator solvability hard under clears)
- L4-6 Moat — KILL (Breathe disease)
- **L4-7 Rift** — KEEP
- L4-8 Seam — KILL (Chroma overlap)

## Lens 5 — Finite resource (Haiku, GPT substitute)
- L5-1 Rotation Budget — KILL (rotation-as-resource redundant)
- L5-2 Wildcard — KILL (mechanically odd compression)
- L5-3 Anchor Budget — KILL (Monolith overlap)
- L5-4 Swap — KILL (commitment-erasure)
- L5-5 Preview — KILL (meta to gameplay)
- L5-6 Delete — KILL (degenerate L8-1)
- L5-7 Turn Budget — KILL (Pipeline-adjacent pacing)
- **L5-8 Ink** — KEEP

## Lens 6 — Information variant (Haiku, Composer substitute) — entire lens KILLED
- L6-1 Revealed Frontier — KILL (memorization)
- L6-2 Partial Board Vision — KILL (memorization)
- L6-3 Queued Tray — KILL (memorization)
- L6-4 Target Partial Reveal — KILL (memorization)
- L6-5 Piece-Color Hidden — KILL (memorization, lottery feel)
- L6-6 Tray Reveal Chain — KILL (single-play-per-seed)
- L6-7 Board Region Fogged — KILL (memorization)
- L6-8 Color-Gated Zones — KILL (not actually an info variant)

## Lens 7 — Topological twist (Haiku, GPT-codex substitute)
- L7-1 Cylinder — KILL (subtle change, subsumed by L7-2)
- L7-2 Torus — KILL (cognitive load, ambiguous decisions)
- **L7-3 Partitioned Board** — KEEP
- L7-4 Diagonal Lines — KILL (piece geometry mismatch)
- **L7-5 Slope** — KEEP
- L7-6 Rotating Board — KILL (every-4-placements discontinuity)
- L7-7 Hexagonal Grid — KILL (UI feasibility)
- L7-8 Gravity Wells — KILL (UX mess at boundaries)

## Lens 8 — Inversion (Haiku, Composer substitute)
- **L8-1 Erase** — KEEP
- L8-2 Void King — KILL (not an inversion of a primitive)
- **L8-3 Hoard** — KEEP
- L8-4 Unstack — KILL (cosmetic inversion + Mirror-disease)
- L8-5 Inward Spiral — KILL (not an inversion)
- L8-6 Stamp — KILL (UI risk + perspective shift)
- L8-7 Invert Score — KILL (not a primitive)
- L8-8 Asymmetric Mirror — KILL (rule-addition disguised)

---

## 18 survivors carrying forward to Stage 3

| ID | Name | Lens | Headline mechanic |
|----|------|------|-------------------|
| L1-3 | Chord | repurpose | row+col simultaneous required to clear |
| L1-5 | Color Chord Clear | repurpose | 4+ same-color contiguous in row/col clears |
| L1-6 | Board Spin | repurpose | rotate gesture rotates the board |
| L1-7 | Tetromino Tax | repurpose | clears cost a tray piece |
| L2-1 | Plague | antagonist | infection spreads on density |
| L2-2 | Siege | antagonist | wall advances upward unless cleared |
| L2-3 | Fuse | antagonist | bombs with countdown defused by clears |
| L3-2 | Twin Bond | couple | bonded pair must touch each other |
| L3-4 | Axis Vow | couple | rotation parity declares row/col axis |
| L3-5 | Footprint Echo | couple | next placement must touch prev bbox |
| L4-1 | Lacuna | negative space | empty cells must stay 4-connected |
| L4-2 | Quarantine | negative space | per-region exact-size empty targets |
| L4-7 | Rift | negative space | clear when row near-empty (inverted threshold) |
| L5-8 | Ink | resource | cells cost ink, clears refund ink |
| L7-3 | Partitioned Board | topology | clears trigger per 4×4 region |
| L7-5 | Slope | topology | mandatory tilt after each placement |
| L8-1 | Erase | inversion | pieces subtract from pre-filled board |
| L8-3 | Hoard | inversion | tray refills only on line clears |
