import { useEffect, useState } from 'react';

const STORAGE_KEY = 'blockit:mirror:introDismissed';

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
 * One-shot welcome card for Mirror mode. Renders above the board the very
 * first time a player enters the mode (across any difficulty), and quietly
 * goes away forever once dismissed. Persistence lives in localStorage —
 * we deliberately don't put this in game state because it has no bearing
 * on the puzzle itself.
 */
export function MirrorIntro() {
  const [dismissed, setDismissed] = useState<boolean>(() => loadDismissed());

  useEffect(() => {
    if (dismissed) saveDismissed();
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <section className="mirror-intro" role="region" aria-label="How to play Mirror">
      <header className="mirror-intro__head">
        <span className="mirror-intro__eyebrow">New mode · Mirror</span>
        <h2 className="mirror-intro__title">Place once. Land twice.</h2>
      </header>
      <p className="mirror-intro__text">
        Every piece you place also writes its <strong>reflection</strong> across the
        center line. Match the symmetric target to win — every move is two moves at
        once.
      </p>
      <ul className="mirror-intro__tips">
        <li>
          <span aria-hidden>↔︎</span> Drag pieces anywhere — both halves must fit.
        </li>
        <li>
          <span aria-hidden>○</span> Hollow rings show the target you&rsquo;re building.
        </li>
        <li>
          <span aria-hidden>↩</span> Tap Undo if a placement breaks symmetry.
        </li>
      </ul>
      <button
        type="button"
        className="mirror-intro__btn"
        onClick={() => setDismissed(true)}
      >
        Got it
      </button>
    </section>
  );
}
