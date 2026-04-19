import { useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { haptics } from '../haptics';
import { sounds } from '../sounds';

export function GameOverOverlay() {
  const { state, dispatch } = useGame();

  useEffect(() => {
    if (!state.isGameOver) return;
    if (state.difficulty === 'riddle' && state.riddleResult === 'solved') return;
    haptics.gameOver();
    sounds.gameOver();
  }, [state.isGameOver, state.difficulty, state.riddleResult]);

  if (!state.isGameOver) return null;

  const isRiddle = state.difficulty === 'riddle';
  const headline =
    isRiddle && state.riddleResult === 'solved'
      ? 'Riddle solved!'
      : isRiddle && state.riddleResult === 'failed'
        ? 'Puzzle over'
        : 'Game Over';
  const subline = isRiddle
    ? state.riddleResult === 'solved'
      ? 'You cleared every cell.'
      : 'Tip: each full row or column vanishes — place so nothing is left.'
    : null;

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <h2>{headline}</h2>
        <p className="game-over-difficulty">{state.difficulty}</p>
        {subline && <p className="game-over-sub">{subline}</p>}
        <p className="game-over-score">Score: {state.score}</p>
        <p className="game-over-best">Best ({state.difficulty}): {state.bestScore}</p>
        <button
          className="restart-btn"
          onClick={() => dispatch({ type: 'RESTART' })}
        >
          {isRiddle ? 'Next riddle' : 'Play Again'}
        </button>
      </div>
    </div>
  );
}
