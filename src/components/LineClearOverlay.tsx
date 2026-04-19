import type { ClearAnimCell } from '../game/types';

type LineClearOverlayProps = {
  cells: ClearAnimCell[];
};

export function LineClearOverlay({ cells }: LineClearOverlayProps) {
  return (
    <>
      {cells.map((cell) => (
        <div
          key={`${cell.row},${cell.col}`}
          className="clear-cell"
          style={
            {
              '--r': cell.row,
              '--c': cell.col,
              '--delay': `${cell.delay}ms`,
              '--color': cell.color,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}
