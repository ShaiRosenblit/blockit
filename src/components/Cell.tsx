type CellProps = {
  color: string | null;
  preview?: 'valid' | 'invalid' | null;
  justPlaced?: boolean;
  willClear?: boolean;
  /**
   * Riddle-mode target hint:
   *   'needs-fill'  — this cell is empty but the target requires it filled.
   *   'needs-clear' — this cell is filled but the target requires it empty.
   *   'match'       — cell already matches the target (rendered neutrally).
   * Undefined in non-riddle modes.
   */
  targetState?: 'needs-fill' | 'needs-clear' | 'match';
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

export function Cell({ color, preview, justPlaced, willClear, targetState }: CellProps) {
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
  if (!preview && targetState === 'needs-fill') className += ' cell--target-needs-fill';
  if (!preview && targetState === 'needs-clear') className += ' cell--target-needs-clear';

  return <div className={className} style={style} />;
}
