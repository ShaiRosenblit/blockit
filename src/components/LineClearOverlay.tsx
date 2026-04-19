import { BOARD_SIZE } from '../game/types';

export type LineClearAnim = {
  id: number;
  rows: number[];
  cols: number[];
  /** Colors on the board immediately before the clear (after placement). */
  cellColors: Map<string, string>;
};

function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}

const MID = (BOARD_SIZE - 1) / 2;

type LineClearOverlayProps = {
  anim: LineClearAnim;
};

export function LineClearOverlay({ anim }: LineClearOverlayProps) {
  const rowSet = new Set(anim.rows);
  const colSet = new Set(anim.cols);

  const stacks: React.ReactNode[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const inRow = rowSet.has(r);
      const inCol = colSet.has(c);
      if (!inRow && !inCol) continue;

      const color = anim.cellColors.get(coordKey(r, c));
      if (!color) continue;

      const txRow = `calc((${MID} - ${c}) * (var(--cell-size) + var(--gap)))`;
      const tyCol = `calc((${MID} - ${r}) * (var(--cell-size) + var(--gap)))`;
      const spinRow = c < MID ? '540deg' : '-540deg';
      const spinCol = r < MID ? '-540deg' : '540deg';
      const arcRow = c % 2 === 0 ? '10px' : '-10px';
      const arcCol = r % 2 === 0 ? '-10px' : '10px';

      stacks.push(
        <div key={`${r}-${c}`} className="line-clear-stack" style={{ gridRow: r + 1, gridColumn: c + 1 }}>
          {inRow && (
            <div
              className="line-clear-ghost line-clear-ghost--row"
              style={
                {
                  ['--tx' as string]: txRow,
                  ['--spin-amt' as string]: spinRow,
                  ['--arc' as string]: arcRow,
                  ['--cell-glow' as string]: color,
                  backgroundColor: color,
                } as React.CSSProperties
              }
            />
          )}
          {inCol && (
            <div
              className="line-clear-ghost line-clear-ghost--col"
              style={
                {
                  ['--ty' as string]: tyCol,
                  ['--spin-amt' as string]: spinCol,
                  ['--arc' as string]: arcCol,
                  ['--cell-glow' as string]: color,
                  backgroundColor: color,
                } as React.CSSProperties
              }
            />
          )}
        </div>
      );
    }
  }

  const rowShockwaves = anim.rows.map((r) => (
    <div
      key={`sw-r-${r}`}
      className="line-clear-shockwave-anchor line-clear-shockwave-anchor--row"
      style={{ gridRow: r + 1, gridColumn: '1 / -1' }}
    >
      <div className="line-clear-shockwave-ring" />
      <div className="line-clear-core-flash" />
    </div>
  ));

  const colShockwaves = anim.cols.map((c) => (
    <div
      key={`sw-c-${c}`}
      className="line-clear-shockwave-anchor line-clear-shockwave-anchor--col"
      style={{ gridRow: '1 / -1', gridColumn: c + 1 }}
    >
      <div className="line-clear-shockwave-ring" />
      <div className="line-clear-core-flash" />
    </div>
  ));

  return (
    <div className="line-clear-overlay" aria-hidden>
      {stacks}
      {rowShockwaves}
      {colShockwaves}
    </div>
  );
}
