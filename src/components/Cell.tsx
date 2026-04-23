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
    style = { backgroundColor: color };
  }

  if (willClear) className += ' cell--will-clear';

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

  return <div className={className} style={style} data-coord={coord} />;
}
