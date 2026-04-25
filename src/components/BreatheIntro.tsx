import { useEffect, useState } from 'react';

const STORAGE_KEY = 'blockit:breathe:introDismissed';

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
 * One-shot welcome card for Breathe mode. Renders above the board the
 * very first time a player enters the mode (across any difficulty), and
 * quietly goes away forever once dismissed. Persistence lives in
 * localStorage — we deliberately don't put this in game state because it
 * has no bearing on the puzzle itself.
 *
 * The card includes a tiny SVG showing the rule visually: a 2×2 with one
 * hole = OK (green ring), a fully-packed 2×2 = not OK (red ring).
 */
export function BreatheIntro() {
  const [dismissed, setDismissed] = useState<boolean>(() => loadDismissed());

  useEffect(() => {
    if (dismissed) saveDismissed();
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <section className="breathe-intro" role="region" aria-label="How to play Breathe">
      <header className="breathe-intro__head">
        <span className="breathe-intro__eyebrow">New mode · Breathe</span>
        <h2 className="breathe-intro__title">Every 2×2 needs to breathe.</h2>
      </header>
      <p className="breathe-intro__text">
        Match the target like a normal puzzle — but the winning board can&rsquo;t
        contain <strong>any solid 2×2</strong>. Every 2×2 square must keep at
        least one hole. You can pack things tightly mid-game; just make sure
        you&rsquo;ve cleared a path before placing the last piece.
      </p>
      <div className="breathe-intro__demo" aria-hidden>
        <span className="breathe-intro__demo-cell breathe-intro__demo-cell--ok">
          <svg viewBox="0 0 24 24" width="36" height="36">
            <rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor" />
            <rect x="13" y="2" width="9" height="9" rx="1.5" fill="currentColor" />
            <rect x="2" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.18" />
            <rect x="13" y="13" width="9" height="9" rx="1.5" fill="currentColor" />
          </svg>
          <span className="breathe-intro__demo-label">OK</span>
        </span>
        <span className="breathe-intro__demo-cell breathe-intro__demo-cell--bad">
          <svg viewBox="0 0 24 24" width="36" height="36">
            <rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor" />
            <rect x="13" y="2" width="9" height="9" rx="1.5" fill="currentColor" />
            <rect x="2" y="13" width="9" height="9" rx="1.5" fill="currentColor" />
            <rect x="13" y="13" width="9" height="9" rx="1.5" fill="currentColor" />
          </svg>
          <span className="breathe-intro__demo-label">Suffocates</span>
        </span>
      </div>
      <ul className="breathe-intro__tips">
        <li>
          <span aria-hidden>○</span> Match the target outline like a normal puzzle.
        </li>
        <li>
          <span aria-hidden>◳</span> No 2×2 patch may be fully filled at the end.
        </li>
        <li>
          <span aria-hidden>↺</span> Mid-game packing is fine — clear before the last piece.
        </li>
      </ul>
      <button
        type="button"
        className="breathe-intro__btn"
        onClick={() => setDismissed(true)}
      >
        Got it
      </button>
    </section>
  );
}
