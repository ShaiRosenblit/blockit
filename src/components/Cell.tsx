type CellProps = {
  color: string | null;
  preview?: 'valid' | 'invalid' | null;
  justPlaced?: boolean;
  willClear?: boolean;
};

export function Cell({ color, preview, justPlaced, willClear }: CellProps) {
  let className = 'cell';
  let style: React.CSSProperties = {};

  if (preview === 'valid') {
    className += ' cell--preview-valid';
    style = { backgroundColor: color ?? undefined };
  } else if (preview === 'invalid') {
    className += ' cell--preview-invalid';
  } else if (color) {
    className += ' cell--filled';
    if (justPlaced) className += ' cell--just-placed';
    style = { backgroundColor: color };
  }

  if (willClear) className += ' cell--will-clear';

  return <div className={className} style={style} />;
}
