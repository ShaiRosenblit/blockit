export type ClearingInfo = { color: string; delay: number };

type CellProps = {
  color: string | null;
  preview?: 'valid' | 'invalid' | null;
  clearing?: ClearingInfo | null;
  justPlaced?: boolean;
};

export function Cell({ color, preview, clearing, justPlaced }: CellProps) {
  let className = 'cell';
  let style: React.CSSProperties = {};

  if (clearing) {
    className += ' cell--clearing';
    style = { backgroundColor: clearing.color, animationDelay: `${clearing.delay}ms` };
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
