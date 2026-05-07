import { useGame } from '../hooks/useGame';
import { Cell } from './Cell';
import type { BoardGrid, Coord } from '../game/types';
import { BOARD_SIZE } from '../game/types';

type BoardProps = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  previewCells?: Map<string, 'valid' | 'invalid'>;
  previewColor?: string | null;
  placedCells?: Set<string>;
  clearPreviewCells?: Set<string>;
  /**
   * Click handler invoked with the `(row, col)` of the cell the player
   * tapped. Used by Erasures mode to dispatch `ERASE_COMPONENT` when
   * the player is in select mode. Undefined / unwired in every other
   * mode and during normal placement gameplay; the handler is gated
   * upstream on `state.erasureSelectMode` so attaching it
   * unconditionally is safe but unnecessary outside Erasures.
   */
  onCellClick?: (row: number, col: number) => void;
  /**
   * Set of `${row},${col}` keys that are *eligible* for an erase tap
   * — i.e. cells on which `ERASE_COMPONENT` would do something. Used
   * to render an `cell--erase-eligible` highlight in select mode.
   * Undefined outside Erasures-select mode.
   */
  eraseEligibleCells?: Set<string>;
  /**
   * True while the player is in Erasures select mode. Triggers
   * board-wide dimming (via a wrapper class) so non-eligible cells
   * read as inert and the player's eye is drawn to the eligible
   * cluster.
   */
  eraseSelectActive?: boolean;
  /**
   * Tether-mode active "tether window" — the precomputed set of
   * `${row},${col}` keys within Chebyshev-distance ≤ 2 of any cell
   * in the most recent paired-slot placement. Cells whose key is in
   * this set get a `cell--tether-window` outline so the player can
   * see exactly where the next partner placement may anchor.
   * Undefined outside Tether mode and when no pending paired
   * placement is loaded (round start, or after the partner slot has
   * already placed and refilled past the window).
   */
  tetherWindowCells?: Set<string>;
  /**
   * Gravity-mode cascade playback override. When set, renders this board
   * instead of `state.board` — the reducer commits the final post-cascade
   * state in one dispatch, but the UI replays the intermediate steps to
   * make the chain reaction visible. Undefined in all other modes / idle.
   */
  overrideBoard?: BoardGrid;
  /**
   * Per-cell fall distance (rows) for the current cascade step. Used to
   * animate filled cells in from `translateY(-distance * cellSize)` back
   * to 0. Parallel to `overrideBoard`. Cells with `null`/0 don't animate.
   */
  overrideFallDistances?: (number | null)[][];
  /** Cell size in px — needed to translate `overrideFallDistances` into pixels. */
  cellSize?: number;
  /**
   * When the cascade animation advances to a new "fall" phase, bumping
   * this key forces the Board subtree to remount so CSS animations on the
   * newly-falling cells restart cleanly.
   */
  cascadeRenderKey?: string;
  /** Shake the whole board once — used for chain-step payoff (k >= 3). */
  shake?: boolean;
};

function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function Board({
  boardRef,
  previewCells,
  previewColor,
  placedCells,
  clearPreviewCells,
  overrideBoard,
  overrideFallDistances,
  cellSize,
  cascadeRenderKey,
  shake,
  onCellClick,
  eraseEligibleCells,
  eraseSelectActive,
  tetherWindowCells,
}: BoardProps) {
  const { state } = useGame();
  const target = state.puzzleTarget;
  const isPuzzle = state.mode === 'puzzle';
  const isMirror = state.mode === 'mirror';
  const isMonolith = state.mode === 'monolith';
  const isBreathe = state.mode === 'breathe';
  const isQuarantine = state.mode === 'quarantine';
  const isDecay = state.mode === 'decay';
  const isFuse = state.mode === 'fuse';
  const renderBoard = overrideBoard ?? state.board;

  // Fuse mode: build an O(1) lookup from `r,c` → countdown for each
  // live fuse so per-cell rendering doesn't have to scan the fuse list.
  // Empty Map outside Fuse so the lookup is a no-op everywhere else.
  const fuseCountdownByCell = new Map<string, number>();
  if (isFuse) {
    for (const f of state.fuseCells) {
      fuseCountdownByCell.set(`${f.row},${f.col}`, f.countdown);
    }
  }

  // Quarantine target badges — one per region, anchored to the first cell
  // of each region. Rendered as grid items so the badge lands in the
  // correct cell without us doing absolute-positioning math that has to
  // account for `.board`'s gap. Sized via `container-type: inline-size`
  // on `.board` (already set) plus `cqi` units on the badge so it scales
  // with the live cell pitch instead of needing a JS-piped --cell-size.
  const quarantineBadges: React.ReactNode[] = [];
  if (isQuarantine && state.quarantineRegions && state.quarantineTargets) {
    const regions = state.quarantineRegions;
    const targets = state.quarantineTargets;
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      if (region.length === 0) continue;
      const anchor = region[0];
      let empties = 0;
      for (const { row, col } of region) {
        if (renderBoard[row][col] === null) empties++;
      }
      let badgeClass = 'quarantine-target-badge';
      if (empties === targets[i]) badgeClass += ' quarantine-target-badge--met';
      else if (empties < targets[i]) badgeClass += ' quarantine-target-badge--over';
      quarantineBadges.push(
        <div
          key={`q-badge-${i}`}
          className={badgeClass}
          style={{ gridRow: anchor.row + 1, gridColumn: anchor.col + 1 }}
          aria-label={`Region ${i + 1}: ${empties} empty of ${targets[i]} target`}
        >
          {empties}/{targets[i]}
        </div>
      );
    }
  }

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = coordKey(r, c);
      const preview = previewCells?.get(key) ?? null;
      const justPlaced = placedCells?.has(key) ?? false;
      const willClear = clearPreviewCells?.has(key) ?? false;
      const fallRows = overrideFallDistances?.[r]?.[c] ?? 0;

      let targetState: 'needs-fill' | 'needs-clear' | 'target-met' | 'neutral' | undefined;
      if (target) {
        const want = target[r][c];
        const filled = renderBoard[r][c] !== null;
        if (want && !filled) targetState = 'needs-fill';
        else if (!want && filled) targetState = 'needs-clear';
        else if (want && filled) targetState = 'target-met';
        else targetState = 'neutral';
      }

      // Decay mode: read the cell's age and tag the rendered cell with a
      // `cell--age-<n>` class (clamped to 3) so the CSS can fade older
      // tiles toward muted/dark — the player needs a quick visual on
      // which lines are ripe enough to clear. Skipped for empty cells
      // and outside Decay so non-Decay modes never carry the class.
      let ageClass: number | undefined;
      if (isDecay) {
        const age = state.boardAges[r]?.[c];
        if (renderBoard[r][c] !== null && age !== null && age !== undefined && age > 0) {
          ageClass = Math.min(age, 3);
        }
      }

      // Fuse mode: pass the per-cell countdown into the Cell so the
      // numeric badge can render. Skipped on cells that aren't live
      // fuses (Map miss → undefined); also skipped while a placement
      // preview is showing on the cell since the preview overrides
      // the fuse colour and the badge would dangle.
      const fuseCountdown =
        isFuse && preview === null ? fuseCountdownByCell.get(key) : undefined;

      // Erasures mode: tag eligible cells (cluster of player-placed
      // cells the player CAN erase) and ineligible cells (everything
      // else, dimmed) while the select toggle is active. Outside
      // select mode both flags are undefined and the cell renders
      // exactly as in any other puzzle mode.
      let eraseClass: 'eligible' | 'ineligible' | undefined;
      if (eraseSelectActive) {
        eraseClass = eraseEligibleCells?.has(key) ? 'eligible' : 'ineligible';
      }

      // Tether mode: tag cells inside the active tether window so
      // the per-cell CSS can render a faint dashed outline. The
      // outline is purely informational — the placement validator
      // also enforces the rule, but the visual confirmation makes
      // the geometry parseable at a glance instead of forcing the
      // player to mentally project a Chebyshev-2 envelope around
      // the prior placement.
      const inTetherWindow = tetherWindowCells?.has(key) ?? false;

      cells.push(
        <Cell
          key={cascadeRenderKey ? `${cascadeRenderKey}:${key}` : key}
          coord={key}
          color={preview === 'valid' ? previewColor ?? null : renderBoard[r][c]}
          preview={preview}
          justPlaced={justPlaced}
          willClear={willClear}
          targetState={targetState}
          fallRows={fallRows ?? undefined}
          fallCellSize={cellSize}
          decayAge={ageClass}
          fuseCountdown={fuseCountdown}
          eraseClass={eraseClass}
          inTetherWindow={inTetherWindow}
        />
      );
    }
  }

  let boardClass = 'board';
  if (isPuzzle) boardClass += ' board--puzzle';
  if (isMirror) boardClass += ' board--puzzle board--mirror';
  if (isBreathe) boardClass += ' board--puzzle';
  if (isMonolith) boardClass += ' board--puzzle';
  if (isQuarantine) boardClass += ' board--puzzle';
  if (isFuse) boardClass += ' board--puzzle';
  if (state.mode === 'erasures') boardClass += ' board--puzzle';
  if (eraseSelectActive) boardClass += ' board--erase-select';
  if (shake) boardClass += ' board--cascade-shake';

  // Erasures-select click handler. Reads the `data-coord` of the
  // tapped child (set on every Cell), parses it back into (row, col),
  // and forwards to the upstream `onCellClick` handler. Only attached
  // when both `onCellClick` and `eraseSelectActive` are set so non-
  // Erasures modes never see synthetic click handlers on the board.
  const handleClick = onCellClick && eraseSelectActive
    ? (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement | null;
        const coord = target?.closest<HTMLElement>('[data-coord]')?.dataset.coord;
        if (!coord) return;
        const [rs, cs] = coord.split(',');
        const row = Number(rs);
        const col = Number(cs);
        if (!Number.isFinite(row) || !Number.isFinite(col)) return;
        onCellClick(row, col);
      }
    : undefined;

  return (
    <div className={boardClass} ref={boardRef} onClick={handleClick}>
      {cells}
      {isMirror && <div className="board__mirror-axis" aria-hidden />}
      {quarantineBadges}
    </div>
  );
}

export function getCoordsFromPointer(
  boardEl: HTMLElement,
  clientX: number,
  clientY: number
): Coord | null {
  const rect = boardEl.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const cellSize = rect.width / BOARD_SIZE;
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return { row, col };
}
