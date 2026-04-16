type CellProps = {
  color: string | null;
  preview?: 'valid' | 'invalid' | null;
};

export function Cell({ color, preview }: CellProps) {
  let className = 'cell';
  let style: React.CSSProperties = {};

  if (preview === 'valid') {
    className += ' cell--preview-valid';
    style = { backgroundColor: color ?? undefined };
  } else if (preview === 'invalid') {
    className += ' cell--preview-invalid';
  } else if (color) {
    className += ' cell--filled';
    style = { backgroundColor: color };
  }

  return <div className={className} style={style} />;
}
