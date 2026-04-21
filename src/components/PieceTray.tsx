import { useGame } from '../hooks/useGame';
import type { PieceShape } from '../game/types';
import { DRAG_POINTER_OFFSET_X, DRAG_POINTER_OFFSET_Y } from '../dragConstants';

type PieceTrayProps = {
  onTrayPointerDown: (index: number, e: React.PointerEvent) => void;
  draggingIndex: number | null;
};

const MINI_GAP_PX = 2;
const MAX_MINI_CELL_PX = 20;

function PieceMiniGrid({ piece, slotInnerPx }: { piece: PieceShape; slotInnerPx: number }) {
  const maxDim = Math.max(piece.width, piece.height, 1);
  const cellSize = Math.min(
    MAX_MINI_CELL_PX,
    Math.floor((slotInnerPx - MINI_GAP_PX * (maxDim - 1)) / maxDim)
  );

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < piece.height; r++) {
    for (let c = 0; c < piece.width; c++) {
      const filled = piece.cells.some((cell) => cell.row === r && cell.col === c);
      cells.push(
        <div
          key={`${r},${c}`}
          className={filled ? 'mini-cell mini-cell--filled' : 'mini-cell'}
          style={{
            width: cellSize,
            height: cellSize,
            ...(filled ? { backgroundColor: piece.color } : {}),
          }}
        />
      );
    }
  }

  return (
    <div
      className="mini-grid"
      style={{
        gridTemplateColumns: `repeat(${piece.width}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${piece.height}, ${cellSize}px)`,
        gap: MINI_GAP_PX,
      }}
    >
      {cells}
    </div>
  );
}

export function PieceTray({ onTrayPointerDown, draggingIndex }: PieceTrayProps) {
  const { state } = useGame();
  const dense = state.mode === 'puzzle' && state.tray.length > 3;
  const slotInnerPx = dense ? 56 : 76;

  return (
    <div className={`piece-tray${dense ? ' piece-tray--dense' : ''}`}>
      {state.tray.map((piece, i) => (
        <div
          key={i}
          className={`piece-slot${dense ? ' piece-slot--dense' : ''}${!piece ? ' piece-slot--empty' : ''}${draggingIndex === i ? ' piece-slot--dragging' : ''}`}
          onPointerDown={(e) => piece && onTrayPointerDown(i, e)}
          style={{ touchAction: 'none' }}
        >
          {piece && draggingIndex !== i && <PieceMiniGrid piece={piece} slotInnerPx={slotInnerPx} />}
        </div>
      ))}
    </div>
  );
}

export function FloatingPiece({
  piece,
  x,
  y,
  cellSize,
}: {
  piece: PieceShape;
  x: number;
  y: number;
  cellSize: number;
}) {
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < piece.height; r++) {
    for (let c = 0; c < piece.width; c++) {
      const filled = piece.cells.some((cell) => cell.row === r && cell.col === c);
      cells.push(
        <div
          key={`${r},${c}`}
          className={filled ? 'mini-cell mini-cell--filled' : 'mini-cell mini-cell--invisible'}
          style={filled ? { backgroundColor: piece.color, width: cellSize, height: cellSize } : { width: cellSize, height: cellSize }}
        />
      );
    }
  }

  const left = x + DRAG_POINTER_OFFSET_X - (piece.width * cellSize) / 2;
  const top = y + DRAG_POINTER_OFFSET_Y - (piece.height * cellSize) / 2;

  return (
    <div
      className="floating-piece"
      style={{
        position: 'fixed',
        left,
        top,
        gridTemplateColumns: `repeat(${piece.width}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${piece.height}, ${cellSize}px)`,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {cells}
    </div>
  );
}
