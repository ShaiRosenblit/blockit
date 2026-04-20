import { useGame } from '../hooks/useGame';
import { Cell } from './Cell';
import type { Coord } from '../game/types';
import { BOARD_SIZE } from '../game/types';

type BoardProps = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  previewCells?: Map<string, 'valid' | 'invalid'>;
  previewColor?: string | null;
  placedCells?: Set<string>;
  clearPreviewCells?: Set<string>;
};

function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function Board({ boardRef, previewCells, previewColor, placedCells, clearPreviewCells }: BoardProps) {
  const { state } = useGame();
  const target = state.riddleTarget;
  const isRiddle = state.mode === 'riddle';

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = coordKey(r, c);
      const preview = previewCells?.get(key) ?? null;
      const justPlaced = placedCells?.has(key) ?? false;
      const willClear = clearPreviewCells?.has(key) ?? false;

      let targetState: 'needs-fill' | 'needs-clear' | 'target-met' | 'neutral' | undefined;
      if (target) {
        const want = target[r][c];
        const filled = state.board[r][c] !== null;
        if (want && !filled) targetState = 'needs-fill';
        else if (!want && filled) targetState = 'needs-clear';
        else if (want && filled) targetState = 'target-met';
        else targetState = 'neutral';
      }

      cells.push(
        <Cell
          key={key}
          color={preview === 'valid' ? previewColor ?? null : state.board[r][c]}
          preview={preview}
          justPlaced={justPlaced}
          willClear={willClear}
          targetState={targetState}
        />
      );
    }
  }

  return (
    <div className={isRiddle ? 'board board--riddle' : 'board'} ref={boardRef}>
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
