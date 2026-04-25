import { useEffect, useState } from 'react';

// v2: intro was rewritten when Mirror mode picked up asymmetric blockers,
// so we use a fresh key here to re-introduce the new mechanic to anyone
// who'd dismissed the original "place once, land twice" version.
const STORAGE_KEY = 'blockit:mirror:introDismissed:v2';

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
        center line. The catch: each side starts with its own{' '}
        <strong>asymmetric blockers</strong> — so a placement only works when{' '}
        <em>both</em> halves dodge them. Neither side can be solved on its own.
      </p>
      <ul className="mirror-intro__tips">
        <li>
          <span aria-hidden>▣</span> Slate cells are blockers — different on each
          side, never mirrored.
        </li>
        <li>
          <span aria-hidden>↔︎</span> A piece is legal only if it AND its reflection
          fit, dodging blockers on both halves.
        </li>
        <li>
          <span aria-hidden>○</span> Match the asymmetric target — clears can wipe
          blockers if you set them up.
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
