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
}: BoardProps) {
  const { state } = useGame();
  const target = state.puzzleTarget;
  const isPuzzle = state.mode === 'puzzle';
  const isMirror = state.mode === 'mirror';
  const isMonolith = state.mode === 'monolith';
  const isBreathe = state.mode === 'breathe';
  const isQuarantine = state.mode === 'quarantine';
  const isDecay = state.mode === 'decay';
  const renderBoard = overrideBoard ?? state.board;

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
  if (shake) boardClass += ' board--cascade-shake';

  return (
    <div className={boardClass} ref={boardRef}>
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
