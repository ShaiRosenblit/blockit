import { useEffect, useRef, useState } from 'react';
import { useGame } from '../hooks/useGame';
import type { PieceShape } from '../game/types';
import { DRAG_POINTER_OFFSET_X, DRAG_POINTER_OFFSET_Y } from '../dragConstants';

type PieceTrayProps = {
  onTrayPointerDown: (index: number, e: React.PointerEvent) => void;
  draggingIndex: number | null;
  /**
   * When set, the slot at this index renders with the `is-active`
   * highlight and every other slot renders with the `is-locked` dim
   * treatment. Used by Pipeline mode to make the round-robin queue
   * cursor visible. Undefined (the default) means "no highlighting" —
   * every other mode passes nothing here so the rendering matches the
   * pre-Pipeline behaviour exactly.
   */
  activeIndex?: number;
};

const MINI_GAP_PX = 2;
/**
 * Per-tier caps on the rendered mini-cell size. Keeps thumbnails legible
 * without letting them balloon on desktop. The actual cell size is the
 * smaller of (slot-width / maxDim) and this cap.
 */
const MINI_CELL_CAP_PX = 28;
/**
 * Fallback inner slot size used before the ResizeObserver has fired on
 * first paint. Matches the previous hard-coded defaults closely enough
 * that the first frame doesn't jump visibly.
 */
const FALLBACK_INNER_PX = { dense: 56, loose: 76 } as const;

function PieceMiniGrid({ piece, slotInnerPx }: { piece: PieceShape; slotInnerPx: number }) {
  const maxDim = Math.max(piece.width, piece.height, 1);
  const cellSize = Math.max(
    1,
    Math.min(
      MINI_CELL_CAP_PX,
      Math.floor((slotInnerPx - MINI_GAP_PX * (maxDim - 1)) / maxDim)
    )
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

/**
 * Single tray slot. We measure the rendered slot width with a ResizeObserver
 * and feed the live value to the mini grid so thumbnails scale with the
 * container — e.g. the slot grows on tablet/desktop tiers because its CSS
 * max-width is bumped per tier, and the mini pieces grow with it without
 * any tier-aware JS.
 */
function TraySlot({
  piece,
  index,
  dense,
  dragging,
  active,
  locked,
  onPointerDown,
}: {
  piece: PieceShape | null;
  index: number;
  dense: boolean;
  dragging: boolean;
  active: boolean;
  locked: boolean;
  onPointerDown: (index: number, e: React.PointerEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [innerPx, setInnerPx] = useState<number>(
    dense ? FALLBACK_INNER_PX.dense : FALLBACK_INNER_PX.loose
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const rect = el.getBoundingClientRect();
      // `getBoundingClientRect().width` already reflects CSS transforms,
      // but reading clientWidth keeps it zoom-agnostic and cheaper.
      const cs = window.getComputedStyle(el);
      const padX =
        parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0');
      const inner = Math.max(0, (rect.width || el.clientWidth) - padX);
      if (inner > 0) setInnerPx(inner);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`piece-slot${dense ? ' piece-slot--dense' : ''}${!piece ? ' piece-slot--empty' : ''}${dragging ? ' piece-slot--dragging' : ''}${active ? ' piece-slot--active' : ''}${locked ? ' piece-slot--locked' : ''}`}
      onPointerDown={(e) => piece && !locked && onPointerDown(index, e)}
      style={{ touchAction: 'none' }}
    >
      {piece && !dragging && <PieceMiniGrid piece={piece} slotInnerPx={innerPx} />}
    </div>
  );
}

export function PieceTray({ onTrayPointerDown, draggingIndex, activeIndex }: PieceTrayProps) {
  const { state } = useGame();
  const dense = state.mode === 'puzzle' && state.tray.length > 3;

  // Column count tuned per tray size so rows stay visually balanced and
  // the tray occupies as few rows as possible on short portrait viewports.
  // Principles:
  //   - 3 pieces  → 3 cols (1 row). Easy puzzle / Classic.
  //   - 4 pieces  → 4 cols (1 row). Normal puzzle — saves a row vs 3+1.
  //   - 5 pieces  → 3 cols (3+2, balanced). Hard puzzle — 4+1 would look
  //                 off-balance with an orphan on row 2.
  //   - 7 pieces  → 4 cols (4+3). Expert — saves a row vs 3+3+1.
  //   - Anything else → 3 cols fallback.
  // Expressed as a CSS custom property so the grid CSS stays declarative.
  const trayCols = !dense
    ? 3
    : state.tray.length === 5
      ? 3
      : 4;

  return (
    <div
      className={`piece-tray${dense ? ' piece-tray--dense' : ''}`}
      style={{ ['--tray-cols' as string]: String(trayCols) }}
    >
      {state.tray.map((piece, i) => {
        // `activeIndex === undefined` means "no highlighting" (every mode
        // except Pipeline). When defined, exactly one slot is `active` and
        // the others are `locked` — the locked treatment dims the slot
        // and disables pointer-down so a stray drag attempt from a
        // non-active slot does nothing visible at all.
        const isActive = activeIndex !== undefined && i === activeIndex;
        const isLocked = activeIndex !== undefined && i !== activeIndex;
        return (
          <TraySlot
            key={i}
            piece={piece}
            index={i}
            dense={dense}
            dragging={draggingIndex === i}
            active={isActive}
            locked={isLocked}
            onPointerDown={onTrayPointerDown}
          />
        );
      })}
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
