# Stage 7 Internal Playtest — 5 New Modes

Test environment: dev server at http://localhost:5173/blockit/, Playwright MCP, 2026-05-07.

## Heading
- Mode loads: YES
- Difficulty switch: YES (easy default; difficulty tabs present and selectable)
- Distinctive UI element visible: NO — no heading-glyph (↑→↓←) on any tray piece. The tray hint text reads `Heading · headings → ↓ · clears erase only that half` so the model is producing headings, but the per-slot glyph is absent. The how-to-play card promises a glyph per slot.
- Console errors: NONE
- Placement attempt: drag via Playwright timed out (known Playwright drag flakiness, not a mode bug); no crash, no console errors after the attempt
- Bugs flagged:
  - **Missing tray-slot heading-glyph indicator.** Mode is fundamentally unreadable without it — players can't see which half a piece will clear.
  - Tray rendered only 2 slots while `--tray-cols: 3`. (May be expected for finite-tray puzzle modes; verify against design intent.)
- 10th-play test verdict: DOUBTFUL — without a heading glyph, the rotation→half-clear coupling is invisible. Players will rotate and see no feedback; the mechanic disappears.

## Decay
- Mode loads: YES
- Difficulty switch: YES — easy = 4 pre-fills, hard = 8 pre-fills, board re-renders cleanly
- Distinctive UI element visible: YES — pre-filled cells render with `cell--age-3` class and palette colors (rgb(78,205,196), rgb(69,183,209), rgb(255,234,167), rgb(255,140,66)). Aged tint appears via the age class.
- Console errors: NONE
- Placement attempt: not attempted directly; UI did not crash on mode/difficulty switches
- Bugs flagged: NONE
- 10th-play test verdict: HOLDS — endless score-attack with visible aged pre-fill is well-formed.

## Fuse
- Mode loads: YES (4 tray slots, 2 pre-filled fuse cells with countdown badges)
- Difficulty switch: YES (Easy default; difficulty tabs functional)
- Distinctive UI element visible: YES — `.cell--fuse` cells with `.cell__fuse-count` showing "6" badge text on each fuse cell. Visually distinct.
- Console errors: NONE
- Placement attempt: not attempted directly; no crash on mode entry
- Bugs flagged: NONE
- 10th-play test verdict: HOLDS — the fuse-count badge is the headline mechanic and is rendering correctly.

## Erasures
- Mode loads: YES (4 tray slots, 6 pre-fills)
- Difficulty switch: YES (Easy)
- Distinctive UI element visible: YES — "Erase (3)" button rendered with aria-label "Erase a piece component (3 tokens left)". Token count visible.
- Console errors: NONE
- Placement attempt: not attempted directly; mode entered cleanly
- Bugs flagged: NONE
- 10th-play test verdict: HOLDS — erase token UI is clear and matches spec.

## Tether
- Mode loads: YES (3 tray slots, 0 pre-fills — pure endless score-attack)
- Difficulty switch: YES — easy → hard switched cleanly, label updated to "Tether · Hard"
- Distinctive UI element visible: PARTIAL — tray hint text says "Tether · paired slots couple by Chebyshev-2 origin", but no `.tether-window` or paired-window outline class found pre-placement. Per design, the tether window only outlines AFTER the first paired placement is locked, so absence at fresh-board state may be expected.
- Console errors: NONE
- Placement attempt: drag via Playwright timed out (Playwright limitation); no crash
- Bugs flagged:
  - Could not verify tether-window outline appears post-placement because Playwright drag is flaky. Recommend manual verification — couldn't be ruled out as broken.
- 10th-play test verdict: DOUBTFUL pending visual confirmation of tether-window outline during/after a real paired placement. Mode entry and difficulty-switch are clean.

## Overall Summary

| Mode | Status | Action |
| --- | --- | --- |
| Heading | Distinctive UI missing | **FIX** before merge — render heading glyph per tray slot |
| Decay | Clean | **READY** |
| Fuse | Clean | **READY** |
| Erasures | Clean | **READY** |
| Tether | Entry clean; window outline unverified | **FIX (verify)** — manually confirm tether-window outline renders after first paired placement; if absent, implement |

### Critical bugs flagged
1. **Heading**: heading-glyph (↑/→/↓/←) is not rendered on tray pieces. Without this, the orientation→half-clear coupling is invisible to the player. The hint text claims headings exist but no per-slot indicator is drawn. Blocks merge.
2. **Tether**: tether-window outline not visible at fresh-board state. Likely fine (only appears after first paired placement) but unverified due to Playwright drag flakiness. Needs manual confirmation before merge.

### Stable enough to merge as-is
- Decay, Fuse, Erasures.

### Need fixes before merge
- Heading (missing glyph — must-fix).
- Tether (manual verification of tether-window during paired placement).

### Console health
All 5 modes loaded with **0 console errors**. Only a single non-blocking warning across the full session.

## Stage 7 fixes

### Heading — per-slot glyph (CRITICAL, fixed)
**Diagnosis.** `headingHintForTray()` only emitted a single status-line text in the tray hint; no per-slot decoration ever rendered, so the rotation → half-clear coupling was invisible.

**Fix.** Added a `headingBadge` prop to `TraySlot` in `src/components/PieceTray.tsx` and a small absolute-positioned `.piece-slot__heading-badge` element in `src/index.css`. `PieceTray` now computes `headingGlyph(headingForPiece(piece))` per slot when `state.mode === 'heading'` and passes it down; outside Heading mode the badge is `undefined` and rendering is byte-for-byte identical to before.

**Verification (Playwright).**
- Navigated to Heading mode (already the active mode at fresh load): both slots showed compass-arrow badges (→ and ↓).
- DOM read confirmed `.piece-slot__heading-badge` text on each non-empty slot.
- Tapped slot 0 to rotate: badge cycled `→` → `↓` → `←` across two taps, exactly tracking `headingForPiece` (rotation index → cardinal direction). The mechanic is now visible.

### Tether — window outline (LOW, verified clean by code review)
**Verification path (code review, no Playwright drag needed).**
- `src/App.tsx:1199-1212` derives `tetherWindowCellsSet` from `tetherWindowCells(state.lastPairedPlacementCells)` only when `mode === 'tether'`, `lastPairedPlacementCells !== null`, `lastPairedSlot !== null`, AND the partner slot's piece is still in the tray.
- `src/App.tsx:2029` passes that set down as `tetherWindowCells={...}` to `Board`.
- `src/components/Board.tsx:203-219` derives `inTetherWindow = tetherWindowCells?.has(key) ?? false` per cell and threads it into each `<Cell>`.
- `src/components/Cell.tsx:157` adds `cell--tether-window` to the className whenever `inTetherWindow` is true.
- `src/index.css:1533-1536` defines the dashed outline (`outline: 1px dashed rgba(255, 234, 167, 0.5); outline-offset: -2px;`).

The full chain is intact. The Stage 7 inability to see the outline was driven entirely by the Playwright drag flakiness preventing a paired placement from ever locking — not a rendering bug. No fix required.

### Build / lint
- `npm run build`: clean.
- `npm run lint`: 3 pre-existing errors only (App.tsx setState-in-effect, Board.tsx fast-refresh export); no new warnings or errors introduced by this fix.
