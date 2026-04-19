import { useGame } from '../hooks/useGame';
import { Cell } from './Cell';
import { ClearAnimationOverlay } from './ClearAnimationOverlay';
import type { ClearAnimationCell } from './ClearAnimationOverlay';
import { BOARD_SIZE } from '../game/types';

type BoardProps = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  previewCells?: Map<string, 'valid' | 'invalid'>;
  previewColor?: string | null;
  placedCells?: Set<string>;
  clearPreviewCells?: Set<string>;
  clearAnimations?: ClearAnimationCell[];
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
  clearAnimations,
}: BoardProps) {
  const { state } = useGame();

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = coordKey(r, c);
      const preview = previewCells?.get(key) ?? null;
      const justPlaced = placedCells?.has(key) ?? false;
      const willClear = clearPreviewCells?.has(key) ?? false;
      cells.push(
        <Cell
          key={key}
          color={preview === 'valid' ? previewColor ?? null : state.board[r][c]}
          preview={preview}
          justPlaced={justPlaced}
          willClear={willClear}
        />
      );
    }
  }

  return (
    <div className="board" ref={boardRef}>
      {cells}
      <ClearAnimationOverlay cells={clearAnimations ?? []} />
    </div>
  );
}
