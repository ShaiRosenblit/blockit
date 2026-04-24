import type { BoardGrid, Coord, PieceShape, TargetPattern } from './types';
import { BOARD_SIZE } from './types';
import { createEmptyBoard } from './board';

/**
 * Authored step-by-step introduction shown before the numeric puzzle levels.
 * Each step is a fully-formed puzzle (board + tray + target pattern) paired
 * with instructional copy. The player drives progression by solving each
 * step; on the final step they graduate to the first Easy puzzle.
 *
 * Design notes:
 * - Steps are intentionally tiny so the meaning of each rule lands clearly.
 * - We lean on the existing puzzle machinery: target pattern + "all pieces
 *   placed → isGameOver + puzzleResult" drives win/fail detection, and
 *   `boardMatchesTarget` validates the final state. Tutorials never touch
 *   best-score storage.
 * - The `hint` copy is shown under the primary instruction in small text;
 *   use it for the "try this!" nudge, not the rule explanation itself.
 */

export type TutorialStep = {
  /** Short headline for the banner. */
  title: string;
  /** Primary instruction shown to the player. */
  text: string;
  /** Secondary nudge, e.g. "Tap a piece to rotate it." */
  hint?: string;
  /** Starting board. */
  board: BoardGrid;
  /** Starting tray. Exactly these pieces, in this order. */
  tray: PieceShape[];
  /** Occupancy the solved board must exactly match. */
  target: TargetPattern;
};

const CYAN = '#4ECDC4';
const PINK = '#FF6B6B';
const YELLOW = '#FFEAA7';
const PURPLE = '#DDA0DD';
const ORANGE = '#FF8C42';
const PREFILL_COLOR = '#5c6b7a';

function emptyTarget(): TargetPattern {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );
}

function targetFromCells(cells: ReadonlyArray<readonly [number, number]>): TargetPattern {
  const t = emptyTarget();
  for (const [r, c] of cells) t[r][c] = true;
  return t;
}

function buildPiece(
  id: string,
  cells: ReadonlyArray<readonly [number, number]>,
  color: string
): PieceShape {
  const cellObjs: Coord[] = cells.map(([row, col]) => ({ row, col }));
  let maxR = 0;
  let maxC = 0;
  for (const c of cellObjs) {
    if (c.row > maxR) maxR = c.row;
    if (c.col > maxC) maxC = c.col;
  }
  return {
    id,
    cells: cellObjs,
    width: maxC + 1,
    height: maxR + 1,
    color,
  };
}

function boardWithPrefill(cells: ReadonlyArray<readonly [number, number]>): BoardGrid {
  const b = createEmptyBoard();
  for (const [r, c] of cells) b[r][c] = PREFILL_COLOR;
  return b;
}

/** Row 7 pre-filled in columns 0..5 — used by the line-clear teaching steps. */
const ROW_SEVEN_PREFILL: ReadonlyArray<readonly [number, number]> = [
  [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5],
];

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  // 1. Drag & drop: single piece onto a clearly-marked outline.
  {
    title: 'Step 1 — Drag onto the ringed cells',
    text: 'Welcome to Blockit! Drag the piece from the tray onto the ringed cells on the board.',
    hint: 'Press and hold to pick it up, then drop it so every block lines up with a ringed cell.',
    board: createEmptyBoard(),
    tray: [buildPiece('tut1-h3', [[0, 0], [0, 1], [0, 2]], CYAN)],
    target: targetFromCells([[4, 2], [4, 3], [4, 4]]),
  },

  // 2. Rotation: same piece shape, but the outline is vertical.
  {
    title: 'Step 2 — Tap to rotate',
    text: 'The target is vertical, but your piece is horizontal. Tap the piece to rotate it, then drop it in.',
    hint: 'Tap (without dragging) rotates the piece 90°. You can also press R on a keyboard.',
    board: createEmptyBoard(),
    tray: [buildPiece('tut2-h3', [[0, 0], [0, 1], [0, 2]], PINK)],
    target: targetFromCells([[2, 4], [3, 4], [4, 4]]),
  },

  // 3. Multiple pieces filling a target.
  {
    title: 'Step 3 — Fill every ringed cell',
    text: 'Use both dominoes to fill the 2×2 ring of target cells. A puzzle is solved when every ringed cell is filled and no extra cells remain.',
    hint: 'Pieces can be placed in any order. Try one, then the other.',
    board: createEmptyBoard(),
    tray: [
      buildPiece('tut3-d1', [[0, 0], [0, 1]], YELLOW),
      buildPiece('tut3-d2', [[0, 0], [0, 1]], PURPLE),
    ],
    target: targetFromCells([[3, 3], [3, 4], [4, 3], [4, 4]]),
  },

  // 4. Line-clear rule: complete a row to wipe it.
  {
    title: 'Step 4 — Clear a row',
    text: 'The bottom row is almost full. Place the piece to complete it — the whole row will vanish!',
    hint: 'Completing any full row or column clears every cell in it. Here, the target wants an empty board.',
    board: boardWithPrefill(ROW_SEVEN_PREFILL),
    tray: [buildPiece('tut4-h2', [[0, 0], [0, 1]], ORANGE)],
    target: emptyTarget(),
  },

  // 5. Plan the order: use a clear to remove unwanted cells, then hit the target.
  {
    title: 'Step 5 — Cells marked X must be empty',
    text: "Cells marked X must be empty at the end. Use one piece to finish the bottom row (it'll clear), then fill the ringed cells with the other.",
    hint: "Any full row or column clears — that's how you get rid of X cells.",
    board: boardWithPrefill(ROW_SEVEN_PREFILL),
    tray: [
      buildPiece('tut5-h2', [[0, 0], [0, 1]], CYAN),
      buildPiece('tut5-h2b', [[0, 0], [0, 1]], PINK),
    ],
    target: targetFromCells([[1, 3], [1, 4]]),
  },

  // 6. The core combo: one piece, part fills target, part completes a row.
  //    Prefill leaves only col 7 empty in row 7, so the vertical 3-bar has
  //    exactly one valid placement — its bottom cell completes and clears
  //    row 7 while its top two cells satisfy the target.
  {
    title: 'Step 6 — One piece, two jobs',
    text: "Here's the real trick of Blockit. Place the piece so its top cells land on the ringed targets AND its bottom cell finishes the X row. The row clears — the targets stay.",
    hint: "A single piece can fill targets and clear clutter at the same time. That's how most puzzles are solved.",
    board: boardWithPrefill([
      [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
    ]),
    tray: [buildPiece('tut6-v3', [[0, 0], [1, 0], [2, 0]], CYAN)],
    target: targetFromCells([[5, 7], [6, 7]]),
  },

  // 7. Same combo with a bent piece. Stem lands on the ringed cells, foot
  //    pokes down into row 7 to finish (6 prefill + 2 new = 8 → clears).
  {
    title: 'Step 7 — Trickier shape, same trick',
    text: 'Same combo with a bent piece. Its stem sits on the ringed cells; its foot reaches down to complete the X row.',
    hint: "The piece only fits one way. If it doesn't look right, tap to rotate.",
    board: boardWithPrefill([
      [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5],
    ]),
    tray: [buildPiece('tut7-L', [[0, 0], [1, 0], [2, 0], [2, 1]], ORANGE)],
    target: targetFromCells([[5, 6], [6, 6]]),
  },

  // 8. Graduation-flavoured combo: two pieces each contribute half of the
  //    row-7 clear AND half of the ringed target above it. Fewer X-cells
  //    than steps 6/7 — the row gets finished collaboratively, which is
  //    the shape of a real Easy puzzle without the fog.
  {
    title: 'Step 8 — Two pieces, one clear',
    text: 'Almost a real puzzle. Both pieces have to reach the bottom row to finish it — and each one also lands on two of the ringed cells above.',
    hint: 'Think combo, times two. Each piece does both jobs.',
    board: boardWithPrefill([
      [7, 0], [7, 1], [7, 2], [7, 3],
    ]),
    tray: [
      buildPiece('tut8-sq1', [[0, 0], [0, 1], [1, 0], [1, 1]], YELLOW),
      buildPiece('tut8-sq2', [[0, 0], [0, 1], [1, 0], [1, 1]], PURPLE),
    ],
    target: targetFromCells([[6, 4], [6, 5], [6, 6], [6, 7]]),
  },
];

export const TUTORIAL_STEP_COUNT = TUTORIAL_STEPS.length;

export function getTutorialStep(index: number): TutorialStep {
  if (index < 0) return TUTORIAL_STEPS[0];
  if (index >= TUTORIAL_STEPS.length) return TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
  return TUTORIAL_STEPS[index];
}

export function clampTutorialStep(index: number): number {
  if (!Number.isFinite(index)) return 0;
  const n = Math.floor(index);
  if (n < 0) return 0;
  if (n >= TUTORIAL_STEPS.length) return TUTORIAL_STEPS.length - 1;
  return n;
}
