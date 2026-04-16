import { useGame } from '../hooks/useGame';

export function GameOverOverlay() {
  const { state, dispatch } = useGame();

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
