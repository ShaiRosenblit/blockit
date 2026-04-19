export type Coord = { row: number; col: number };

export type PieceShape = {
  id: string;
  cells: Coord[];
  width: number;
  height: number;
  color: string;
};

export type TraySlot = PieceShape | null;

export type BoardCell = string | null;
export type BoardGrid = BoardCell[][];

/**
 * Target occupancy for a riddle. `true` means the final board must have a
 * filled cell at that position; `false` means the cell must be empty.
 */
export type TargetPattern = boolean[][];

export type Difficulty = 'easy' | 'normal' | 'hard' | 'zen' | 'riddle';

export const BOARD_SIZE = 8;

export const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#FF8C42',
];
