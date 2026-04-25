import { useEffect, useState } from 'react';

const STORAGE_KEY = 'blockit:monolith:introDismissed';

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
    /* see ScarIntro — localStorage can fail in private mode and the
       worst case is the card shows again next session, which is fine. */
  }
}

/**
 * One-shot welcome card for Monolith mode. Mirrors MirrorIntro / ScarIntro:
 * shows above the board the first time a player enters Monolith at any
 * difficulty and goes away after dismissal. Persistence is in
 * localStorage and intentionally separate from game state because the
 * dismissed flag has no bearing on the run itself.
 */
export function MonolithIntro() {
  const [dismissed, setDismissed] = useState<boolean>(() => loadDismissed());

  useEffect(() => {
    if (dismissed) saveDismissed();
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <section className="scar-intro" role="region" aria-label="How to play Monolith">
      <header className="scar-intro__head">
        <span className="scar-intro__eyebrow">New mode · Monolith</span>
        <h2 className="scar-intro__title">One stone. Keep it whole.</h2>
      </header>
      <p className="scar-intro__text">
        A teal seed sits on the board. Every piece you place must
        <strong> touch</strong> the seed or something already attached to it,
        and after every line clear the whole monolith must remain a single
        connected component. Clearing a line through your own monolith is
        legal — as long as the rest still touches itself.
      </p>
      <ul className="scar-intro__tips">
        <li>
          <span aria-hidden>◉</span> Pieces must extend the monolith on every
          turn. Floating placements are illegal.
        </li>
        <li>
          <span aria-hidden>≣</span> Line clears can sever the monolith — and
          can also evict grey block cells that are in your way.
        </li>
        <li>
          <span aria-hidden>✓</span> Win when the tray is empty and the lit
          target outline is filled exactly.
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
