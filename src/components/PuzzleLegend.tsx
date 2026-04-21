import { Cell } from './Cell';

/**
 * A tiny always-visible key to the puzzle-mode symbols, rendered above the
 * board in numeric puzzle levels. Intentionally uses the same `<Cell>`
 * component and CSS classes the real board uses so the legend glyphs stay
 * perfectly in sync with whatever the board draws — no duplicated SVGs, no
 * drift.
 *
 * Hidden during the tutorial: the tutorial banner already teaches one
 * symbol at a time, and stacking both reads as noise.
 */
export function PuzzleLegend() {
  return (
    <div className="puzzle-legend" role="note" aria-label="Puzzle symbol legend">
      <div className="puzzle-legend__item">
        <div className="puzzle-legend__swatch board--puzzle">
          <Cell color={null} targetState="needs-fill" />
        </div>
        <span className="puzzle-legend__label">Fill</span>
      </div>
      <div className="puzzle-legend__item">
        <div className="puzzle-legend__swatch board--puzzle">
          <Cell color="#5c6b7a" targetState="needs-clear" />
        </div>
        <span className="puzzle-legend__label">Clear</span>
      </div>
    </div>
  );
}
