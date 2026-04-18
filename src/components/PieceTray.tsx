import { useGame } from '../hooks/useGame';
import type { PieceShape } from '../game/types';

type PieceTrayProps = {
  onTrayPointerDown: (index: number, e: React.PointerEvent) => void;
  draggingIndex: number | null;
};

function PieceMiniGrid({ piece }: { piece: PieceShape }) {
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < piece.height; r++) {
    for (let c = 0; c < piece.width; c++) {
      const filled = piece.cells.some((cell) => cell.row === r && cell.col === c);
      cells.push(
        <div
          key={`${r},${c}`}
          className={filled ? 'mini-cell mini-cell--filled' : 'mini-cell'}
          style={filled ? { backgroundColor: piece.color } : undefined}
        />
      );
    }
  }

  return (
    <div
      className="mini-grid"
      style={{
        gridTemplateColumns: `repeat(${piece.width}, 1fr)`,
        gridTemplateRows: `repeat(${piece.height}, 1fr)`,
      }}
    >
      {cells}
    </div>
  );
}

export function PieceTray({ onTrayPointerDown, draggingIndex }: PieceTrayProps) {
  const { state } = useGame();

  return (
    <div className="piece-tray">
      {state.tray.map((piece, i) => (
        <div
          key={i}
          className={`piece-slot${!piece ? ' piece-slot--empty' : ''}${draggingIndex === i ? ' piece-slot--dragging' : ''}`}
          onPointerDown={(e) => piece && onTrayPointerDown(i, e)}
          style={{ touchAction: 'none' }}
        >
          {piece && draggingIndex !== i && <PieceMiniGrid piece={piece} />}
        </div>
      ))}
    </div>
  );
}

export function FloatingPiece({
  piece,
  x,
  y,
}: {
  piece: PieceShape;
  x: number;
  y: number;
}) {
  const cellSize = 40;
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

  return (
    <div
      className="floating-piece"
      style={{
        position: 'fixed',
        left: x - (piece.width * cellSize) / 2,
        top: y - (piece.height * cellSize) / 2 - 40,
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
