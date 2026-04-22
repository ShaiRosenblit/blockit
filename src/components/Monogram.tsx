/**
 * Compact "B" monogram built from the same colored-blocks-on-a-grid
 * language as the full `<Wordmark>` SVG. Used in the header on narrow
 * viewports (≤389 px) where the full wordmark won't fit next to the
 * mode pill + mute toggle.
 *
 * Structurally it's the `B` letter grid from `Wordmark.tsx` rendered
 * alone with one cell of padding on every side — viewBox 60×70 (~0.86:1
 * aspect). Filled cells get the same coral hue as the `B` in the full
 * wordmark so the two marks read as the same visual family.
 *
 * Kept as a separate component (rather than a prop on `Wordmark`) so
 * the two can live side-by-side in the DOM and swap via CSS
 * `display: none` at a media-query break, with zero JS.
 */

const B_GRID: number[][] = [
  [1, 1, 1, 0],
  [1, 0, 0, 1],
  [1, 1, 1, 0],
  [1, 0, 0, 1],
  [1, 1, 1, 0],
];

// Same metrics as Wordmark: 10-unit cells with a 1-unit grid gap, 1-unit padding.
const CELL = 10;
const CELL_INSET = 0.5;
const CELL_INNER = CELL - 2 * CELL_INSET;
const CORNER_RADIUS = 1.2;
const PAD = 1;
const ROWS = PAD + B_GRID.length + PAD;
const COLS = PAD + B_GRID[0].length + PAD;
const VIEW_W = COLS * CELL;
const VIEW_H = ROWS * CELL;

const B_COLOR = '#FF6B6B';
const EMPTY_FILL = '#0f3460';
const HIGHLIGHT = 'rgba(255, 255, 255, 0.32)';
const EDGE_STROKE = 'rgba(255, 255, 255, 0.16)';

type MonogramProps = {
  className?: string;
};

export function Monogram({ className }: MonogramProps) {
  const cells: React.ReactElement[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      cells.push(
        <rect
          key={`bg-${row}-${col}`}
          x={col * CELL + CELL_INSET}
          y={row * CELL + CELL_INSET}
          width={CELL_INNER}
          height={CELL_INNER}
          rx={CORNER_RADIUS}
          fill={EMPTY_FILL}
        />
      );
    }
  }

  B_GRID.forEach((row, rowIdx) => {
    row.forEach((filled, colIdx) => {
      if (!filled) return;
      const x = (PAD + colIdx) * CELL + CELL_INSET;
      const y = (PAD + rowIdx) * CELL + CELL_INSET;
      cells.push(
        <g key={`fill-${rowIdx}-${colIdx}`}>
          <rect
            x={x}
            y={y}
            width={CELL_INNER}
            height={CELL_INNER}
            rx={CORNER_RADIUS}
            fill={B_COLOR}
            stroke={EDGE_STROKE}
            strokeWidth={0.3}
          />
          <rect
            x={x + 1.4}
            y={y + 1.4}
            width={2}
            height={0.7}
            rx={0.3}
            fill={HIGHLIGHT}
          />
        </g>
      );
    });
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      // Intrinsic hint only — CSS (`.title__monogram`) drives the real size.
      width={28}
      height={Math.round((28 * VIEW_H) / VIEW_W)}
      role="img"
      aria-label="Blockit"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {cells}
    </svg>
  );
}
