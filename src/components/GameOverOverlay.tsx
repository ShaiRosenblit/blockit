import { useEffect, useState } from 'react';
import { useGame } from '../hooks/useGame';
import { haptics } from '../haptics';
import { sounds } from '../sounds';
import { TUTORIAL_STEP_COUNT } from '../game/tutorial';

/**
 * How long to keep the overlay hidden after game-over so the player can look
 * at their finished board. Longer on a solve so the celebration lands first;
 * shorter on a failure because there's nothing to watch beyond the board
 * itself.
 */
const OVERLAY_DELAY_SOLVED_MS = 2100;
const OVERLAY_DELAY_FAILED_MS = 1400;
const OVERLAY_DELAY_CLASSIC_MS = 1400;

export function GameOverOverlay() {
  const { state, dispatch } = useGame();
  const [visible, setVisible] = useState(false);

  const isRiddle = state.mode === 'riddle';
  const solved = isRiddle && state.riddleResult === 'solved';
  const failed = isRiddle && state.riddleResult === 'failed';

  // Delay overlay so the player can inspect the final board (win or lose)
  // before the retry / new-puzzle buttons cover it up. We set `visible` via
  // a timer here, and reset it via the cleanup function when deps change
  // (e.g. RESTART flips isGameOver back to false) — avoids calling setState
  // synchronously in the effect body.
  useEffect(() => {
    if (!state.isGameOver) return;
    const delay = solved
      ? OVERLAY_DELAY_SOLVED_MS
      : failed
        ? OVERLAY_DELAY_FAILED_MS
        : OVERLAY_DELAY_CLASSIC_MS;
    const t = window.setTimeout(() => setVisible(true), delay);
    return () => {
      window.clearTimeout(t);
      setVisible(false);
    };
  }, [state.isGameOver, solved, failed]);

  // Loss feedback (haptic + sound). Hold it slightly so it doesn't collide
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

  if (!state.isGameOver || !visible) return null;

  const isTutorial = isRiddle && state.riddleDifficulty === 'tutorial';

  const isLastTutorialStep =
    isTutorial && state.tutorialStep >= TUTORIAL_STEP_COUNT - 1;

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

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
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
