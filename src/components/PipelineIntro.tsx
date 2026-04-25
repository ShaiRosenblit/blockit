import { useEffect, useState } from 'react';

const STORAGE_KEY = 'blockit:pipeline:introDismissed';

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
 * One-shot welcome card for Pipeline mode. Renders above the board the
 * very first time a player enters the mode (across any difficulty), and
 * quietly goes away forever once dismissed. Persistence lives in
 * localStorage — we deliberately don't put this in game state because
 * it has no bearing on scoring or the round itself.
 */
export function PipelineIntro() {
  const [dismissed, setDismissed] = useState<boolean>(() => loadDismissed());

  useEffect(() => {
    if (dismissed) saveDismissed();
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <section className="pipeline-intro" role="region" aria-label="How to play Pipeline">
      <header className="pipeline-intro__head">
        <span className="pipeline-intro__eyebrow">New mode · Pipeline</span>
        <h2 className="pipeline-intro__title">Now serving: slot one.</h2>
      </header>
      <p className="pipeline-intro__text">
        Your tray is a <strong>queue</strong>. Only the highlighted slot is
        live — place that piece, and the lock advances <strong>0 → 1 → 2 → 0</strong>.
        No skipping, no cherry-picking. Plan your clears around what's coming, or
        the pipeline jams.
      </p>
      <ul className="pipeline-intro__tips">
        <li>
          <span aria-hidden>▶︎</span> Only the glowing slot can be placed or
          rotated. The other two are locked until their turn.
        </li>
        <li>
          <span aria-hidden>↻</span> After every placement the lock advances
          one slot. The order is fixed for the whole round.
        </li>
        <li>
          <span aria-hidden>⚠︎</span> Game over the moment your <em>next</em>{' '}
          piece can't fit anywhere — not when "no piece" can fit.
        </li>
      </ul>
      <button
        type="button"
        className="pipeline-intro__btn"
        onClick={() => setDismissed(true)}
      >
        Got it
      </button>
    </section>
  );
}
