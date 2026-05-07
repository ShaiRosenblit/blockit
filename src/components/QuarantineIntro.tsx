import { useEffect, useState } from 'react';

const STORAGE_KEY = 'blockit:quarantine:introDismissed';

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
 * One-shot welcome card for Quarantine mode. Mirrors MonolithIntro shape:
 * persists a dismissed flag in localStorage and goes away after the
 * player taps Got it. The flag is intentionally separate from game state
 * — it has no effect on the run itself.
 */
export function QuarantineIntro() {
  const [dismissed, setDismissed] = useState<boolean>(() => loadDismissed());

  useEffect(() => {
    if (dismissed) saveDismissed();
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <section className="scar-intro" role="region" aria-label="How to play Quarantine">
      <header className="scar-intro__head">
        <span className="scar-intro__eyebrow">New mode · Quarantine</span>
        <h2 className="scar-intro__title">Two budgets. Hit them exactly.</h2>
      </header>
      <p className="scar-intro__text">
        Indestructible <strong>walls</strong> partition the board into
        regions. Each region shows its target empty-cell count. Win when
        the tray is empty and every region's empty count exactly matches
        its target — placing a piece across a wall debits both regions.
      </p>
      <ul className="scar-intro__tips">
        <li>
          <span aria-hidden>▣</span> Walls block placements and never clear,
          but rows that contain a wall can still complete (the wall stays).
        </li>
        <li>
          <span aria-hidden>↔</span> Pieces straddling a wall split their
          cells across two budgets — wanted by one, feared by the other.
        </li>
        <li>
          <span aria-hidden>✓</span> Each badge shows live empties / target.
          Green = met, red = over.
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
