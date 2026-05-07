import { SCAR_COLOR } from '../game/scar';
import { WALL_COLOR } from '../game/board';
import { FUSE_COLOR } from '../game/fuse';

type CellProps = {
  color: string | null;
  preview?: 'valid' | 'invalid' | null;
  justPlaced?: boolean;
  willClear?: boolean;
  /** When set, emitted as `data-coord` so coach marks can find this cell. */
  coord?: string;
  /**
   * Puzzle-mode target hint:
   *   'needs-fill'  — this cell is empty but the target requires it filled.
   *   'needs-clear' — this cell is filled but the target requires it empty.
   *   'target-met'  — cell is filled and is part of the target (no dedicated
   *                   glyph; it just reads as "filled". A subtle family tint
   *                   groups it with needs-fill cells so the player can still
   *                   see which cells belong to the pattern).
   *   'neutral'     — cell matches the target and is not part of it.
   * Undefined in non-puzzle modes.
   */
  targetState?: 'needs-fill' | 'needs-clear' | 'target-met' | 'neutral';
  /**
   * Gravity-mode fall animation: number of rows this cell fell during the
   * current cascade step. When > 0 the cell animates in from
   * `translateY(-fallRows * cellSize)` back to 0, giving the impression
   * that it just dropped into place. 0 / undefined → no animation.
   */
  fallRows?: number;
  /** Board cell size in px — multiplied by `fallRows` to derive the start offset. */
  fallCellSize?: number;
  /**
   * Decay-mode age tier for this filled cell, clamped to 1..3 (Board does
   * the clamping). Adds a `cell--age-<n>` class so the CSS can apply a
   * progressively darker / less-opaque tint as the cell ripens. Undefined
   * outside Decay or for freshly-placed cells (age 0).
   */
  decayAge?: number;
  /**
   * Fuse-mode countdown for this cell. Set on cells whose colour is
   * `FUSE_COLOR` — the integer countdown remaining before the fuse
   * expires. Rendered as a small numeric badge overlaying the cell so
   * the player can read each fuse's deadline at a glance. Undefined
   * outside Fuse mode and on non-fuse cells.
   */
  fuseCountdown?: number;
};

/** Soft tint like invalid preview (rgba overlay), not whole-cell opacity — avoids harsh/snappy look */
function hexToRgba(hex: string, alpha: number): string | undefined {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function Cell({
  color,
  preview,
  justPlaced,
  willClear,
  targetState,
  coord,
  fallRows,
  fallCellSize,
  decayAge,
  fuseCountdown,
}: CellProps) {
  let className = 'cell';
  let style: React.CSSProperties = {};

  if (preview === 'valid') {
    className += ' cell--preview-valid';
    style = { backgroundColor: color ? hexToRgba(color, 0.4) : undefined };
  } else if (preview === 'invalid') {
    className += ' cell--preview-invalid';
  } else if (color) {
    className += ' cell--filled';
    if (justPlaced) className += ' cell--just-placed';
    // Scar mode's sentinel color: tag with `cell--scar` so the CSS can apply
    // the cracked-rust look that visually separates "permanent damage" from
    // ordinary placed pieces. The damage class is purely additive — the
    // backgroundColor is still set so any environment that ignores the
    // class (e.g. screenshots without the stylesheet) still shows SOMETHING.
    if (color === SCAR_COLOR) className += ' cell--scar';
    // Quarantine mode's wall sentinel: tag with `cell--wall` so the CSS can
    // give it a heavy, slate-stone look that reads as "indestructible
    // partition" rather than "placed piece". Walls are non-clearable and
    // never the target of a piece, so they need a visually distinct
    // affordance from ordinary fills.
    if (color === WALL_COLOR) className += ' cell--wall';
    // Fuse mode's countdown sentinel: tag with `cell--fuse` so the CSS
    // can render the clay-red base + a small numeric badge with the
    // countdown rendered on the cell itself. The badge content is
    // emitted as a child element below; the class enables the styling.
    if (color === FUSE_COLOR) className += ' cell--fuse';
    style = { backgroundColor: color };
  }

  if (willClear) className += ' cell--will-clear';

  // Decay-mode age tint. The class controls a CSS-driven fade so the
  // player can read at a glance which cells are ripening toward the
  // clear threshold. Only applied to filled cells (Board guarantees
  // `decayAge` is undefined otherwise).
  if (color && decayAge !== undefined) {
    className += ` cell--age-${decayAge}`;
  }

  // Suppress target hint while a preview is showing on this cell — the preview
  // is a stronger signal and stacking both reads as visual noise.
  if (!preview && (targetState === 'needs-fill' || targetState === 'target-met')) {
    className += ' cell--target-family';
  }
  if (!preview && targetState === 'needs-fill') className += ' cell--target-needs-fill';
  if (!preview && targetState === 'needs-clear') className += ' cell--target-needs-clear';

  // Gravity cascade fall-in animation. Only applies to filled cells that
  // actually moved during the step (fallRows > 0). The CSS custom property
  // carries the start offset; the keyframes animate from there back to 0.
  if (color && fallRows && fallRows > 0 && fallCellSize) {
    className += ' cell--falling';
    const offsetPx = -(fallRows * fallCellSize);
    style = {
      ...style,
      ['--cell-fall-offset' as string]: `${offsetPx}px`,
    } as React.CSSProperties;
  }

  // Fuse mode: when this cell is a live fuse AND we have a countdown to
  // show, render the integer as a child span that the CSS positions as
  // a small badge over the cell. We branch the JSX so non-fuse cells
  // stay as a self-closing div (every other mode hits this path) and
  // never carry a stray empty child node.
  if (color === FUSE_COLOR && fuseCountdown !== undefined) {
    return (
      <div className={className} style={style} data-coord={coord} data-fuse-count={fuseCountdown}>
        <span className="cell__fuse-count" aria-hidden>{fuseCountdown}</span>
      </div>
    );
  }

  return <div className={className} style={style} data-coord={coord} />;
}
