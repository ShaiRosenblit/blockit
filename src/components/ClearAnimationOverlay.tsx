type ClearAnimationCell = {
  id: string;
  row: number;
  col: number;
  color: string;
  delayMs: number;
  tailScale: number;
  wobblePx: number;
  driftPx: number;
  fallCells: number;
  satelliteScale: number;
};

type ClearAnimationOverlayProps = {
  cells: ClearAnimationCell[];
};

type ClearAnimationVars = React.CSSProperties & Record<`--${string}`, string | number>;

function getAnimationVars(cell: ClearAnimationCell): ClearAnimationVars {
  return {
    '--row': cell.row,
    '--col': cell.col,
    '--color': cell.color,
    '--delay': `${cell.delayMs}ms`,
    '--tail-scale': cell.tailScale,
    '--wobble': `${cell.wobblePx}px`,
    '--drift-x': `${cell.driftPx}px`,
    '--fall-cells': cell.fallCells,
    '--satellite-scale': cell.satelliteScale,
  };
}

export type { ClearAnimationCell };

export function ClearAnimationOverlay({ cells }: ClearAnimationOverlayProps) {
  if (cells.length === 0) return null;

  return (
    <div className="board-clear-overlay" aria-hidden="true">
      {cells.map((cell) => (
        <div key={cell.id} className="clear-droplet" style={getAnimationVars(cell)}>
          <div className="clear-droplet__glow" />
          <div className="clear-droplet__blob" />
          <div className="clear-droplet__thread" />
          <div className="clear-droplet__satellite clear-droplet__satellite--one" />
          <div className="clear-droplet__satellite clear-droplet__satellite--two" />
          <div className="clear-droplet__puddle" />
        </div>
      ))}
    </div>
  );
}
