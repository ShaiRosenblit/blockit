/**
 * "BLOCKIT" wordmark rendered as pixel-block letters in the in-game piece
 * palette (see `COLORS` in `game/types.ts`), echoing the app icon's
 * letter-made-of-blocks concept. Each letter gets its own color so the
 * mark visually rhymes with the tetrominoes in the tray.
 *
 * Layout: each letter sits on a 7-column × 7-row cell grid with 2-cell-thick
 * strokes (cell = 4 viewBox units). Letters are separated by a 1-cell gap.
 * Total: 7 letters × 7 cols + 6 gaps × 1 col = 55 cells wide = 220 viewBox
 * units × 28 tall. The 2-cell stroke was chosen over a thinner 1-cell stroke
 * after visual testing — 1-cell letters read as skeletal at header sizes and
 * didn't match the chunky feel of the tetromino pieces below.
 *
 * Actual render size is controlled by CSS (`.title svg` in index.css) so
 * the mark adapts to viewport width. The `width`/`height` attributes below
 * serve only as intrinsic size hints before CSS loads.
 */

type LetterGrid = readonly (readonly number[])[];

const B_GRID: LetterGrid = [
  [1, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 0],
];

const L_GRID: LetterGrid = [
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1],
];

const O_GRID: LetterGrid = [
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
];

const C_GRID: LetterGrid = [
  [0, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1],
];

const K_GRID: LetterGrid = [
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 1, 1, 0],
  [1, 1, 0, 1, 1, 0, 0],
  [1, 1, 1, 1, 0, 0, 0],
  [1, 1, 0, 1, 1, 0, 0],
  [1, 1, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 1],
];

const I_GRID: LetterGrid = [
  [1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1],
];

const T_GRID: LetterGrid = [
  [1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
];

type LetterSpec = { grid: LetterGrid; color: string };

const WORD: readonly LetterSpec[] = [
  { grid: B_GRID, color: '#FF6B6B' }, // coral
  { grid: L_GRID, color: '#4ECDC4' }, // teal
  { grid: O_GRID, color: '#45B7D1' }, // sky blue
  { grid: C_GRID, color: '#96CEB4' }, // sage
  { grid: K_GRID, color: '#FFEAA7' }, // butter yellow
  { grid: I_GRID, color: '#DDA0DD' }, // plum
  { grid: T_GRID, color: '#FF8C42' }, // orange
];

const CELL = 4;
const LETTER_COLS = 7;
const LETTER_ROWS = 7;
const LETTER_GAP_COLS = 1;
const VIEW_W =
  WORD.length * LETTER_COLS * CELL +
  (WORD.length - 1) * LETTER_GAP_COLS * CELL;
const VIEW_H = LETTER_ROWS * CELL;

type WordmarkProps = {
  className?: string;
};

export function Wordmark({ className }: WordmarkProps) {
  const rects: React.ReactElement[] = [];
  WORD.forEach((letter, letterIdx) => {
    const xOffset =
      letterIdx * (LETTER_COLS + LETTER_GAP_COLS) * CELL;
    letter.grid.forEach((row, rowIdx) => {
      row.forEach((filled, colIdx) => {
        if (!filled) return;
        rects.push(
          <rect
            key={`${letterIdx}-${rowIdx}-${colIdx}`}
            x={xOffset + colIdx * CELL}
            y={rowIdx * CELL}
            width={CELL}
            height={CELL}
            fill={letter.color}
          />
        );
      });
    });
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      /* Intrinsic hint only — CSS sizes the mark responsively. */
      width={240}
      height={Math.round((240 * VIEW_H) / VIEW_W)}
      role="img"
      aria-label="Blockit"
      className={className}
      shapeRendering="crispEdges"
      preserveAspectRatio="xMidYMid meet"
    >
      {rects}
    </svg>
  );
}
