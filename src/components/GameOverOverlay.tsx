import { useEffect, useState } from 'react';
import { useGame } from '../hooks/useGame';
import { haptics } from '../haptics';
import { sounds } from '../sounds';
import { TUTORIAL_STEP_COUNT } from '../game/tutorial';

/**
 * How long after game-over to hold the "show options" pill offscreen, so the
 * celebration / final-board moment lands without a UI nudge in the corner.
 * Solves get a longer hold because the celebration itself runs longer.
 */
const PILL_REVEAL_SOLVED_MS = 1700;
const PILL_REVEAL_FAILED_MS = 900;
const PILL_REVEAL_CLASSIC_MS = 900;

export function GameOverOverlay() {
  const { state, dispatch } = useGame();
  /** The player has tapped the pill and wants the full results card. */
  const [revealed, setRevealed] = useState(false);
  /** The pill itself has fully shown up (post-celebration nudge). */
  const [pillReady, setPillReady] = useState(false);

  const isRiddle = state.mode === 'riddle';
  const solved = isRiddle && state.riddleResult === 'solved';
  const failed = isRiddle && state.riddleResult === 'failed';
  const isTutorial = isRiddle && state.riddleDifficulty === 'tutorial';
  const isLastTutorialStep =
    isTutorial && state.tutorialStep >= TUTORIAL_STEP_COUNT - 1;

  // Reveal the pill after a short hold so the celebration / final board has
  // the spotlight first. Cleanup fires when isGameOver / result changes
  // (e.g. RESTART), which also flips both flags back to their closed state.
  useEffect(() => {
    if (!state.isGameOver) return;
    const delay = solved
      ? PILL_REVEAL_SOLVED_MS
      : failed
        ? PILL_REVEAL_FAILED_MS
        : PILL_REVEAL_CLASSIC_MS;
    const t = window.setTimeout(() => setPillReady(true), delay);
    return () => {
      window.clearTimeout(t);
      setPillReady(false);
      setRevealed(false);
    };
  }, [state.isGameOver, solved, failed]);

  // Loss feedback (haptic + sound). Hold briefly so it doesn't collide with
  // place / line-clear audio fired in the same tick.
  useEffect(() => {
    if (!state.isGameOver) return;
    if (solved) return;
    const t = window.setTimeout(() => {
      haptics.gameOver();
      sounds.gameOver();
    }, 380);
    return () => window.clearTimeout(t);
  }, [state.isGameOver, solved]);

  // ESC dismisses the full card back to the pill, matching the common modal
  // contract and keeping the board-view escape hatch one keystroke away.
  useEffect(() => {
    if (!revealed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRevealed(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed]);

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
        ? 'Great solve. Retry for a tighter score, or roll a new puzzle.'
        : 'Tip: row/column clears can remove unwanted cells — plan the order.'
      : null;

  const selectionLabel = isTutorial
    ? `Tutorial · Step ${state.tutorialStep + 1} of ${TUTORIAL_STEP_COUNT}`
    : isRiddle
      ? `Riddle · Difficulty ${state.riddleDifficulty}`
      : `Classic · ${state.classicDifficulty}`;

  const bestLabel =
    !isRiddle
      ? `Best (${state.classicDifficulty})`
      : isTutorial
        ? null
        : `Best (Riddle ${state.riddleDifficulty})`;

  // Stage 1: game is over but the player hasn't asked for options yet.
  // Show nothing over the board — just a small pill at the bottom they can
  // tap when they're done admiring / screenshotting the final state.
  if (!revealed) {
    if (!pillReady) return null;
    const pillLabel = solved
      ? 'Solved — show options'
      : failed
        ? 'Done — show options'
        : 'Round over — show options';
    const pillClass = solved
      ? 'game-over-pill game-over-pill--solved'
      : 'game-over-pill';
    return (
      <button
        type="button"
        className={pillClass}
        onClick={() => setRevealed(true)}
        aria-label={pillLabel}
      >
        <span className="game-over-pill__dot" aria-hidden />
        <span className="game-over-pill__label">{pillLabel}</span>
      </button>
    );
  }

  // Stage 2: the player tapped the pill — show the full card with actions.
  // Clicking the dim backdrop (but not the card itself) dismisses back to
  // pill view so the board is visible again.
  return (
    <div
      className="game-over-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={headline}
      onClick={(e) => {
        if (e.target === e.currentTarget) setRevealed(false);
      }}
    >
      <div className="game-over-card">
        <button
          type="button"
          className="game-over-close"
          aria-label="Back to board"
          onClick={() => setRevealed(false)}
        >
          {'\u00D7'}
        </button>
        <h2>{headline}</h2>
        <p className="game-over-difficulty">{selectionLabel}</p>
        {subline && <p className="game-over-sub">{subline}</p>}
        {/* Tutorials are about the concept, not the score — hide the number
            to keep focus on the lesson. */}
        {!isTutorial && <p className="game-over-score">Score: {state.score}</p>}
        {bestLabel && <p className="game-over-best">{bestLabel}: {state.bestScore}</p>}

        <div className="game-over-actions">
          {isTutorial ? (
            <>
              {solved ? (
                <button
                  className="restart-btn"
                  onClick={() => dispatch({ type: 'TUTORIAL_NEXT' })}
                >
                  {isLastTutorialStep ? 'Start Riddle 1' : 'Next step'}
                </button>
              ) : (
                <button
                  className="restart-btn"
                  onClick={() => dispatch({ type: 'RESTART' })}
                >
                  Retry
                </button>
              )}
              <button
                className="restart-btn restart-btn--ghost"
                onClick={() => dispatch({ type: 'SET_RIDDLE_DIFFICULTY', difficulty: 1 })}
              >
                Skip tutorial
              </button>
            </>
          ) : isRiddle ? (
            <>
              <button
                className="restart-btn"
                onClick={() => dispatch({ type: 'RESTART' })}
              >
                Retry
              </button>
              <button
                className="restart-btn restart-btn--ghost"
                onClick={() => dispatch({ type: 'NEW_RIDDLE' })}
              >
                New puzzle
              </button>
            </>
          ) : (
            <button className="restart-btn" onClick={() => dispatch({ type: 'RESTART' })}>
              Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
