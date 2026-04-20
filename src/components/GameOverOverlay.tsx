import { useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { haptics } from '../haptics';
import { sounds } from '../sounds';
import { TUTORIAL_STEP_COUNT } from '../game/tutorial';

type Props = {
  /**
   * Called when the player taps "Challenge a friend". Only relevant in
   * riddle mode; tutorial steps aren't shareable. Parent owns the share
   * flow so behaviour stays consistent with the header's Share button.
   */
  onShare?: () => void;
  /** Mirror of the parent's share-status so the button can show feedback. */
  shareStatus?: null | 'copied' | 'failed';
};

/**
 * Renders inline (in place of the piece tray) when the round ends — no dim
 * backdrop, no modal. The board stays fully visible above it so the player
 * can screenshot "board + result" in one frame, and the retry / new-puzzle
 * buttons live in the panel itself so there's nothing else to dismiss.
 */
export function GameOverOverlay({ onShare, shareStatus = null }: Props = {}) {
  const { state, dispatch } = useGame();

  const isRiddle = state.mode === 'riddle';
  const solved = isRiddle && state.riddleResult === 'solved';
  const failed = isRiddle && state.riddleResult === 'failed';
  const isTutorial = isRiddle && state.riddleDifficulty === 'tutorial';
  const isLastTutorialStep =
    isTutorial && state.tutorialStep >= TUTORIAL_STEP_COUNT - 1;

  // Loss feedback (haptic + sound). Held briefly so it doesn't collide
  // with the place / line-clear audio fired in the same tick.
  useEffect(() => {
    if (!state.isGameOver) return;
    if (solved) return;
    const t = window.setTimeout(() => {
      haptics.gameOver();
      sounds.gameOver();
    }, 380);
    return () => window.clearTimeout(t);
  }, [state.isGameOver, solved]);

  if (!state.isGameOver) return null;

  // Tutorial messaging is separate from the generic riddle/classic copy so
  // the overlay teaches rather than congratulates when the student solves
  // an authored step, and encourages a retry (not "new puzzle") on failure.
  const headline = isTutorial
    ? solved
      ? isLastTutorialStep
        ? 'Tutorial complete!'
        : 'Nice — step solved!'
      : 'Not quite — try again'
    : solved
      ? 'Pattern matched!'
      : failed
        ? 'Pattern not matched'
        : 'Game Over';

  const subline = isTutorial
    ? solved
      ? isLastTutorialStep
        ? "You've got the hang of Blockit. Time to tackle Riddle 1!"
        : 'On to the next lesson.'
      : 'Use Retry to reset this step and give it another go.'
    : isRiddle
      ? solved
        ? 'Nicely done.'
        : 'Tip: row/column clears can remove unwanted cells — plan the order.'
      : null;

  const selectionLabel = isTutorial
    ? `Tutorial · Step ${state.tutorialStep + 1} of ${TUTORIAL_STEP_COUNT}`
    : isRiddle
      ? `Riddle · Difficulty ${state.riddleDifficulty}`
      : `Classic · ${state.classicDifficulty}`;

  // Riddle mode is a binary solve/not-solve challenge, so numeric score
  // and per-difficulty best aren't meaningful feedback — they're suppressed
  // here. Classic mode still shows both.
  const bestLabel = !isRiddle ? `Best (${state.classicDifficulty})` : null;
  const showStats = !isRiddle;

  const variant = solved
    ? 'game-over-panel--solved'
    : failed
      ? 'game-over-panel--failed'
      : 'game-over-panel--classic';

  return (
    <div
      className={`game-over-panel ${variant}`}
      role="region"
      aria-live="polite"
      aria-label={headline}
    >
      <div className="game-over-panel__head">
        <span className="game-over-panel__mark" aria-hidden>
          {solved ? '\u2728' : failed ? '\u25CB' : '\u25CB'}
        </span>
        <div className="game-over-panel__headings">
          <h2 className="game-over-panel__title">{headline}</h2>
          <p className="game-over-panel__meta">{selectionLabel}</p>
        </div>
      </div>

      {subline && <p className="game-over-panel__sub">{subline}</p>}

      {showStats && (
        <div className="game-over-panel__stats">
          <span className="game-over-panel__stat">
            <span className="game-over-panel__stat-label">Score</span>
            <span className="game-over-panel__stat-value">{state.score}</span>
          </span>
          {bestLabel && (
            <span className="game-over-panel__stat">
              <span className="game-over-panel__stat-label">{bestLabel}</span>
              <span className="game-over-panel__stat-value">{state.bestScore}</span>
            </span>
          )}
        </div>
      )}

      <div className="game-over-panel__actions">
        {isTutorial ? (
          <>
            {solved ? (
              <button
                className="game-over-panel__btn game-over-panel__btn--primary"
                onClick={() => dispatch({ type: 'TUTORIAL_NEXT' })}
              >
                {isLastTutorialStep ? 'Start Riddle 1' : 'Next step'}
              </button>
            ) : (
              <button
                className="game-over-panel__btn game-over-panel__btn--primary"
                onClick={() => dispatch({ type: 'RESTART' })}
              >
                Retry
              </button>
            )}
            <button
              className="game-over-panel__btn"
              onClick={() => dispatch({ type: 'SET_RIDDLE_DIFFICULTY', difficulty: 1 })}
            >
              Skip tutorial
            </button>
          </>
        ) : isRiddle ? (
          <>
            <button
              className="game-over-panel__btn game-over-panel__btn--primary"
              onClick={() => dispatch({ type: 'RESTART' })}
            >
              Retry
            </button>
            <button
              className="game-over-panel__btn"
              onClick={() => dispatch({ type: 'NEW_RIDDLE' })}
            >
              New puzzle
            </button>
            {onShare && state.riddleInitialBoard && state.riddleTarget && (
              <button
                className="game-over-panel__btn game-over-panel__btn--wide"
                onClick={onShare}
                title="Share this riddle as a challenge"
              >
                <span aria-hidden>{'\u{1F3AF}'}</span>{' '}
                {shareStatus === 'copied'
                  ? 'Link copied!'
                  : shareStatus === 'failed'
                    ? 'Share failed'
                    : 'Challenge a friend'}
              </button>
            )}
          </>
        ) : (
          <button
            className="game-over-panel__btn game-over-panel__btn--primary"
            onClick={() => dispatch({ type: 'RESTART' })}
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}
