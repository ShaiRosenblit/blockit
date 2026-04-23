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
  const renderBoard = overrideBoard ?? state.board;

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
        />
      );
    }
  }

  let boardClass = isPuzzle ? 'board board--puzzle' : 'board';
  if (shake) boardClass += ' board--cascade-shake';

  return (
    <div className={boardClass} ref={boardRef}>
      {cells}
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
