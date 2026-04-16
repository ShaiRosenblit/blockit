type CellProps = {
  color: string | null;
  preview?: 'valid' | 'invalid' | null;
  flash?: string | null;
  justPlaced?: boolean;
};

export function Cell({ color, preview, flash, justPlaced }: CellProps) {
  let className = 'cell';
  let style: React.CSSProperties = {};

  if (flash) {
    className += ' cell--clearing';
    style = { backgroundColor: flash };
  } else if (preview === 'valid') {
    className += ' cell--preview-valid';
    style = { backgroundColor: color ?? undefined };
  } else if (preview === 'invalid') {
    className += ' cell--preview-invalid';
  } else if (color) {
    className += ' cell--filled';
    if (justPlaced) className += ' cell--just-placed';
    style = { backgroundColor: color };
  }

  return <div className={className} style={style} />;
}
