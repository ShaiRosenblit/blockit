import { useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { haptics } from '../haptics';
import { sounds } from '../sounds';

export function GameOverOverlay() {
  const { state, dispatch } = useGame();

  useEffect(() => {
    if (!state.isGameOver) return;
    if (state.mode === 'riddle' && state.riddleResult === 'solved') return;
    haptics.gameOver();
    sounds.gameOver();
  }, [state.isGameOver, state.mode, state.riddleResult]);

  if (!state.isGameOver) return null;

  const isRiddle = state.mode === 'riddle';
  const solved = isRiddle && state.riddleResult === 'solved';
  const failed = isRiddle && state.riddleResult === 'failed';

  const headline = solved
    ? 'Pattern matched!'
    : failed
      ? 'Pattern not matched'
      : 'Game Over';

  const subline = isRiddle
    ? solved
      ? 'Great solve. Retry for a tighter score, or roll a new puzzle.'
      : 'Tip: row/column clears can remove unwanted cells — plan the order.'
    : null;

  const selectionLabel = isRiddle
    ? `Riddle · Difficulty ${state.riddleDifficulty}`
    : `Classic · ${state.classicDifficulty}`;

  const bestLabel = isRiddle
    ? `Best (Riddle ${state.riddleDifficulty})`
    : `Best (${state.classicDifficulty})`;

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <h2>{headline}</h2>
        <p className="game-over-difficulty">{selectionLabel}</p>
        {subline && <p className="game-over-sub">{subline}</p>}
        <p className="game-over-score">Score: {state.score}</p>
        <p className="game-over-best">{bestLabel}: {state.bestScore}</p>

        <div className="game-over-actions">
          {isRiddle ? (
            <>
              <button
                className="restart-btn"
                onClick={() => dispatch({ type: 'RESTART' })}
              >
                {solved ? 'Retry' : 'Retry'}
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
