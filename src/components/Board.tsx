import { useGame } from '../hooks/useGame';
import { Cell } from './Cell';
import type { Coord } from '../game/types';
import { BOARD_SIZE } from '../game/types';
import type { ClearAnim } from '../App';

type BoardProps = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  previewCells?: Map<string, 'valid' | 'invalid'>;
  previewColor?: string | null;
  placedCells?: Set<string>;
  clearPreviewCells?: Set<string>;
  clearAnim?: ClearAnim;
};

function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function Board({ boardRef, previewCells, previewColor, placedCells, clearPreviewCells, clearAnim }: BoardProps) {
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
      {clearAnim && (
        <div className="topple-overlay">
          {clearAnim.cells.map(({ r, c, color, delay }) => (
            <div
              key={`${clearAnim.id}-${r}-${c}`}
              className="topple-cell"
              style={{
                left: `calc(var(--gap) + ${c} * (var(--cell-size) + var(--gap)))`,
                top: `calc(var(--gap) + ${r} * (var(--cell-size) + var(--gap)))`,
                backgroundColor: color,
                animationDelay: `${delay}ms`,
              }}
            />
          ))}
        </div>
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
