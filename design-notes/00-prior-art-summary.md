# Prior-art summary (must understand before designing)

## Forward-simulation generation

`puzzleGenerator.ts` is the canonical pattern. To generate a winnable instance:

1. Pick a difficulty spec (piece count, cell-count band, target cell band, pre-fill amount, minimum pre-fill cleared).
2. Seed an empty (or pre-filled) `BoardGrid`.
3. Sample N piece templates from the `PIECE_CATALOG` (filtered by cell-count band).
4. **Forward-simulate**: enumerate every legal `(rotation, origin)` for each piece in turn, pick one at random, apply `applyPlacementAndClear` (place + clear full rows/cols), repeat. If at any step there are zero legal placements, abandon the candidate.
5. Snapshot the resulting board occupancy — that becomes the **target pattern**.
6. Apply quality filters (target cells in band, target spans ≥2 rows AND ≥2 cols, enough pre-fill cleared).
7. Shuffle / re-orient the same N templates → that becomes the player's tray. Because the simulation walked a legal sequence with these exact templates, **a solution provably exists**.
8. Reject duplicate signatures across recent generations to keep replays varied.
9. Hard-coded fallback (`buildFallback`) if generation fails repeatedly.

Validators: `boardMatchesTarget` for solvability check, `canReachTarget` (BFS over occupancy×remaining-multiset, capped at 120k expansions) for stronger verification on small instances.

Mirror, Breathe, Monolith generators all follow this shape: extra invariant baked into either (a) the placement validator, (b) the line-clear semantics, or (c) the post-sim acceptance test, plus optional pre-fill (blockers, seed cells, blocks).

## Reducer dispatch pattern

`gameReducer.ts` uses one big `switch (action.type)`. For `PLACE_PIECE`, mode-specific logic lives in early-return branches:
- `if (state.mode === 'pipeline' && trayIndex !== state.pipelinePhase) return state;` — round-robin gate before any work.
- `if (state.mode === 'scar') { … return … }` — full inline sub-block: place, detect clears, run `clearLinesPreservingScars`, drop scar burst, refill tray, classic-style game-over check, return.
- `if (state.mode === 'monolith') { … }` — extends the puzzle pattern with `canPlaceMonolith` validator + target check on tray-empty.
- `if (state.mode === 'mirror') { … }` — uses `placePieceMirrored` + `canPlacePieceMirrored` + target check.
- Default fallthrough handles classic / chroma / gravity / drop / puzzle / breathe with shared mid-section.

Each new mode adds:
1. A literal in `GameMode` union + a `*Difficulty` type + a `*_DIFFICULTIES` const + a `ModeSelection` arm in `types.ts`.
2. A generator file (or no generator if it's score-attack like Scar).
3. A reducer branch in `PLACE_PIECE` (and possibly `ROTATE_TRAY_PIECE`'s game-over check).
4. Game-over probe variants in `board.ts` (`hasValidXxxMoves`).
5. A persistence key + `freshXxxState` factory in the reducer (`localStorage` for difficulty + best score).
6. UI: experimental-mode chip in `App.tsx` (`experimentalModes` array), difficulty chip block, Intro component, optional placement-validator branch in drag/place handlers.

## UI primitives

- 8×8 `Board` component with cell highlight (preview, will-clear, target overlay, blockers, sentinel-color cells).
- 3-slot `Tray` with rotation gesture; pieces are colored from `COLORS` (or `CHROMA_COLORS`).
- Drag-from-tray placement with hover preview and snap-to-cell. Drop landing simulator for Drop mode.
- Score bar + combo + best score.
- Target overlay (Puzzle / Mirror / Breathe / Monolith): renders the goal pattern as faint filled cells underneath the live board.
- Status indicators for mode-specific state (Pipeline phase pill, scar count, monolith component count).
- Drawer-based mode picker; per-mode Intro components on first entry.
- No new piece shapes, no board-size change, no mid-game color reassignment, no resource bar widget.

## Why each of the four bad modes is bad (mechanics-speak)

### Mirror

> Every placement also writes the same cells reflected across the vertical axis between cols 3 and 4. Pre-fill is asymmetric blockers. Win = match target.

**Mirror disease**: The "what to place on the right half" is a function of "what I placed on the left half" — fully determined, never a real second decision. The only *real* decision the player makes is unchanged from Puzzle: where to put the piece. The mirror writes itself; the player asks the same single question per placement that Puzzle already asks. The asymmetric blockers gate the legal set but don't add a second axis of choice — they just shrink the legal set the player was already searching. **No new question per placement**.

### Breathe

> Final board must satisfy: every 2×2 sub-square contains at least one empty cell.

**Breathe disease**: For a generated target T that already satisfies the no-2×2 constraint, the player's job is to reach T. If they reach T, the constraint is automatically satisfied (because T satisfies it). Mid-game 2×2s are allowed, so the constraint imposes no choice during play — only at the very end. The win-condition is the conjunction of "match T" and "no solid 2×2," but since T was generated to satisfy the latter, it's redundant. **The new rule is auto-satisfied by the rule it was layered onto**.

### Pipeline

> Three-slot tray + a round-robin lock: only slot `pipelinePhase` is legal, and `pipelinePhase` cycles 0→1→2→0 after every placement.

**Pipeline disease**: Classic asks "given 3 pieces and the current board, which one and where?" Pipeline asks "given the *forced* piece and the current board, where?" One degree of freedom (piece choice) is removed; nothing is added in its place. The player can still *see* the upcoming pieces, but seeing isn't deciding. **Agency removed without comparable agency added** — the mode is strictly Classic minus the piece-pick decision.

### Scar

> Every line clear leaves K cells of the just-cleared region permanently impassable, picked at random by the engine. K = 1/2/3 by difficulty.

**Scar disease**: The scar destination is RNG. The player can decide *whether* to clear (because clearing damages terrain), but they cannot *direct* where damage lands once they commit. Across 10 plays the player learns "fewer clears" — but cannot learn a placement *rule* that lets them choose where the next scar lands relative to their plan. The penalty is uncontrollable. **Random uncontrollable punishment** that the player can only minimize globally, not steer locally.

## Implication for new candidates

A good new mode must produce a **second axis of decision** at placement time that genuinely couples to the existing one (placement geometry). The dual-purpose mechanic is the fastest test: does some primitive (clears / rotation / color / tray order / a finite resource) flip its sign — wanted in some contexts, feared in others — based on board state the player has to read?

If "the new question per placement" reduces to "where does this piece fit best?" you have not added a mode, you have added a skin.
