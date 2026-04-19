import { useGame } from '../hooks/useGame';
import { Cell } from './Cell';
import { LineClearOverlay } from './LineClearOverlay';
import type { ClearAnimCell, Coord } from '../game/types';
import { BOARD_SIZE } from '../game/types';

type BoardProps = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  previewCells?: Map<string, 'valid' | 'invalid'>;
  previewColor?: string | null;
  placedCells?: Set<string>;
  clearPreviewCells?: Set<string>;
  clearAnimCells?: ClearAnimCell[];
};

function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function Board({ boardRef, previewCells, previewColor, placedCells, clearPreviewCells, clearAnimCells }: BoardProps) {
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
      {clearAnimCells && clearAnimCells.length > 0 && (
        <LineClearOverlay cells={clearAnimCells} />
      )}
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
