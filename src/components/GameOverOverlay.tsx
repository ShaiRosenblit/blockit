import { useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { haptics } from '../haptics';
import { sounds } from '../sounds';

export function GameOverOverlay() {
  const { state, dispatch } = useGame();

  useEffect(() => {
    if (state.isGameOver) {
      haptics.gameOver();
      sounds.gameOver();
    }
  }, [state.isGameOver]);

  if (!state.isGameOver) return null;

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <h2>Game Over</h2>
        <p className="game-over-score">Score: {state.score}</p>
        <p className="game-over-best">Best: {state.bestScore}</p>
        <button
          className="restart-btn"
          onClick={() => dispatch({ type: 'RESTART' })}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
