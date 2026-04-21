/**
 * "BLOCKIT" wordmark rendered in the style of the game's puzzle board:
 * letters are spelled out with colored puzzle-piece blocks placed on a
 * visible grid (empty cells in the game's `--cell-empty` navy, filled
 * cells in the piece palette). This echoes the app icon — where the
 * letter B is built from blocks on a grid — and makes the title feel
 * like a natural extension of gameplay rather than stylized text.
 *
 * Per-letter colors come from `COLORS` in `game/types.ts`, so every
 * palette hue used by in-game pieces also appears in the title.
 *
 * Layout (in grid cells):
 *   col:  0 | 1..4  B | 5 gap | 6..8  L | 9 gap | 10..13 O | 14 gap |
 *         15..18 C | 19 gap | 20..23 K | 24 gap | 25..27 I | 28 gap |
 *         29..31 T | 32 pad
 *   row:  0 pad | 1..5 letters | 6 pad
 * Total: 33 cols × 7 rows, viewBox 330×70 (≈4.7:1 aspect).
 *
 * Each cell is a 10×10 viewBox square with a 9×9 inner block, so a 1-unit
 * gap separates cells and the parent surface shows through as the board's
 * grid lines. Filled cells get a subtle top-left highlight + faint white
 * edge so they read as polished game pieces, matching the in-game look.
 */

type LetterGrid = number[][];

const B: LetterGrid = [
  [1, 1, 1, 0],
  [1, 0, 0, 1],
  [1, 1, 1, 0],
  [1, 0, 0, 1],
  [1, 1, 1, 0],
];
const L: LetterGrid = [
  [1, 0, 0],
  [1, 0, 0],
  [1, 0, 0],
  [1, 0, 0],
  [1, 1, 1],
];
const O: LetterGrid = [
  [0, 1, 1, 0],
  [1, 0, 0, 1],
  [1, 0, 0, 1],
  [1, 0, 0, 1],
  [0, 1, 1, 0],
];
const C: LetterGrid = [
  [0, 1, 1, 1],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [0, 1, 1, 1],
];
const K: LetterGrid = [
  [1, 0, 0, 1],
  [1, 0, 1, 0],
  [1, 1, 0, 0],
  [1, 0, 1, 0],
  [1, 0, 0, 1],
];
const I: LetterGrid = [
  [1, 1, 1],
  [0, 1, 0],
  [0, 1, 0],
  [0, 1, 0],
  [1, 1, 1],
];
const T: LetterGrid = [
  [1, 1, 1],
  [0, 1, 0],
  [0, 1, 0],
  [0, 1, 0],
  [0, 1, 0],
];

type LetterSpec = { grid: LetterGrid; color: string };

const LETTERS: LetterSpec[] = [
  { grid: B, color: '#FF6B6B' }, // coral
  { grid: L, color: '#4ECDC4' }, // teal
  { grid: O, color: '#45B7D1' }, // sky blue
  { grid: C, color: '#96CEB4' }, // sage
  { grid: K, color: '#FFEAA7' }, // butter yellow
  { grid: I, color: '#DDA0DD' }, // plum
  { grid: T, color: '#FF8C42' }, // orange
];

const CELL = 10;
const CELL_INSET = 0.5; // half of the 1-unit grid gap
const CELL_INNER = CELL - 2 * CELL_INSET; // 9
const CORNER_RADIUS = 1.2;

const LEFT_PAD = 1;
const RIGHT_PAD = 1;
const TOP_PAD = 1;
const BOTTOM_PAD = 1;
const LETTER_GAP = 1;
const LETTER_ROWS = 5;

const LETTER_WIDTHS = LETTERS.map((l) => l.grid[0].length);
const LETTER_X_OFFSETS: number[] = [];
{
  let cursor = LEFT_PAD;
  for (const w of LETTER_WIDTHS) {
    LETTER_X_OFFSETS.push(cursor);
    cursor += w + LETTER_GAP;
  }
}
const COLS =
  LEFT_PAD +
  LETTER_WIDTHS.reduce((s, w) => s + w, 0) +
  LETTER_GAP * (LETTERS.length - 1) +
  RIGHT_PAD;
const ROWS = TOP_PAD + LETTER_ROWS + BOTTOM_PAD;
const VIEW_W = COLS * CELL;
const VIEW_H = ROWS * CELL;

const EMPTY_FILL = '#0f3460'; // matches --cell-empty in index.css
const HIGHLIGHT = 'rgba(255, 255, 255, 0.32)';
const EDGE_STROKE = 'rgba(255, 255, 255, 0.16)';

type WordmarkProps = {
  className?: string;
};

export function Wordmark({ className }: WordmarkProps) {
  const cells: React.ReactElement[] = [];

  // Background grid — every cell rendered first so the letters sit on top.
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

  // Letter cells — colored blocks with a thin pale edge + a small
  // top-left glint so they read as polished pieces sitting on the board.
  LETTERS.forEach((letter, letterIdx) => {
    const x0 = LETTER_X_OFFSETS[letterIdx];
    letter.grid.forEach((row, rowIdx) => {
      row.forEach((filled, colIdx) => {
        if (!filled) return;
        const cx = x0 + colIdx;
        const cy = TOP_PAD + rowIdx;
        const x = cx * CELL + CELL_INSET;
        const y = cy * CELL + CELL_INSET;
        cells.push(
          <g key={`fill-${letterIdx}-${rowIdx}-${colIdx}`}>
            <rect
              x={x}
              y={y}
              width={CELL_INNER}
              height={CELL_INNER}
              rx={CORNER_RADIUS}
              fill={letter.color}
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
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      // Intrinsic hint only — CSS (`.title svg`) drives the real size.
      width={280}
      height={Math.round((280 * VIEW_H) / VIEW_W)}
      role="img"
      aria-label="Blockit"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {cells}
    </svg>
  );
}
