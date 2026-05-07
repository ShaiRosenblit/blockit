import { useEffect, useState } from 'react';

const STORAGE_KEY = 'blockit:heading:introDismissed';

function loadDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* localStorage can fail in private mode; worst case the card shows
       again next session, which is fine. */
  }
}

/**
 * One-shot welcome card for Heading mode. Mirrors QuarantineIntro shape:
 * persists a dismissed flag in localStorage and goes away after the
 * player taps Got it. The flag is intentionally separate from game state
 * — it has no effect on the run itself.
 *
 * Explains the half-clear coupling: a piece's heading (visible on the
 * tray slot as a compass arrow) decides which half of any line it
 * completes actually erases — the rest stays filled. Symmetric pieces
 * (squares, the monomino, the plus) carry the FULL marker and revert to
 * Classic full-line clears.
 */
export function HeadingIntro() {
  const [dismissed, setDismissed] = useState<boolean>(() => loadDismissed());

  useEffect(() => {
    if (dismissed) saveDismissed();
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <section className="scar-intro" role="region" aria-label="How to play Heading">
      <header className="scar-intro__head">
        <span className="scar-intro__eyebrow">New mode · Heading</span>
        <h2 className="scar-intro__title">Rotation picks the half that clears.</h2>
      </header>
      <p className="scar-intro__text">
        Every tray piece carries a <strong>heading</strong> (↑ → ↓ ←) that
        comes from how many times you've rotated it. When the placement
        completes a row or column, only the half pointed at by that heading
        actually erases — the other half stays filled, even though the line
        was technically complete. Win when the board matches the target.
      </p>
      <ul className="scar-intro__tips">
        <li>
          <span aria-hidden>↑↓</span> Vertical headings bite column clears
          (top half vs. bottom half). Row clears erase the full row.
        </li>
        <li>
          <span aria-hidden>←→</span> Horizontal headings bite row clears
          (left half vs. right half). Column clears erase the full column.
        </li>
        <li>
          <span aria-hidden>•</span> Symmetric pieces (squares, monomino,
          plus) carry FULL — they ignore heading and clear the whole line.
        </li>
      </ul>
      <button
        type="button"
        className="scar-intro__btn"
        onClick={() => setDismissed(true)}
      >
        Got it
      </button>
    </section>
  );
}
