import { useEffect, useState } from 'react';

const STORAGE_KEY = 'blockit:scar:introDismissed';

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
    // localStorage can fail (private mode, quota); the worst case is the
    // intro shows again next session, which is fine.
  }
}

/**
 * One-shot welcome card for Scar mode. Mirrors the MirrorIntro pattern —
 * shows above the board the first time a player enters Scar at any
 * difficulty and goes away after dismissal. Persistence is in
 * localStorage and intentionally separate from game state because the
 * dismissed flag has no bearing on the run itself.
 */
export function ScarIntro() {
  const [dismissed, setDismissed] = useState<boolean>(() => loadDismissed());

  useEffect(() => {
    if (dismissed) saveDismissed();
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <section className="scar-intro" role="region" aria-label="How to play Scar">
      <header className="scar-intro__head">
        <span className="scar-intro__eyebrow">New mode · Scar</span>
        <h2 className="scar-intro__title">Every clear leaves a mark.</h2>
      </header>
      <p className="scar-intro__text">
        Score-attack, classic rules — with one twist. Each placement that
        clears a line <strong>scars</strong> the board: a few empty cells
        crack into permanent rust-coloured blockers that you can never
        place over and never heal. The longer you play, the smaller your
        usable field gets.
      </p>
      <ul className="scar-intro__tips">
        <li>
          <span aria-hidden>✕</span> Scars block placement forever — but
          they still count toward completing a row or column.
        </li>
        <li>
          <span aria-hidden>≣</span> Lines that include a scar still clear,
          earning points; the scar itself stays put.
        </li>
        <li>
          <span aria-hidden>!</span> Big, greedy clears can wreck the
          terrain you'll need next. Pick your battles.
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
