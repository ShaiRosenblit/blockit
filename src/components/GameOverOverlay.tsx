import { useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { haptics } from '../haptics';
import { sounds } from '../sounds';
import { RIDDLE_MAX_LEVEL } from '../game/riddleGenerator';

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
  const solved = isRiddle && state.riddleResult === 'solved';
  const failed = isRiddle && state.riddleResult === 'failed';
  const atLastLevel = state.riddleLevel >= RIDDLE_MAX_LEVEL;
  const hasNextLevel = isRiddle && solved && !atLastLevel;

  const headline = solved
    ? atLastLevel
      ? 'You mastered the riddle!'
      : 'Pattern matched!'
    : failed
      ? 'Pattern not matched'
      : 'Game Over';

  const subline = isRiddle
    ? solved
      ? atLastLevel
        ? 'Level 10 complete — you beat every riddle.'
        : `Level ${state.riddleLevel} cleared. Level ${state.riddleLevel + 1} unlocked.`
      : 'Tip: row/column clears can remove unwanted cells — plan the order.'
    : null;

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <h2>{headline}</h2>
        <p className="game-over-difficulty">
          {isRiddle ? `Riddle · Level ${state.riddleLevel}` : state.difficulty}
        </p>
        {subline && <p className="game-over-sub">{subline}</p>}
        <p className="game-over-score">Score: {state.score}</p>
        <p className="game-over-best">Best ({state.difficulty}): {state.bestScore}</p>

        <div className="game-over-actions">
          {hasNextLevel ? (
            <>
              <button
                className="restart-btn"
                onClick={() => dispatch({ type: 'SET_RIDDLE_LEVEL', level: state.riddleLevel + 1 })}
              >
                Next level →
              </button>
              <button
                className="restart-btn restart-btn--ghost"
                onClick={() => dispatch({ type: 'RESTART' })}
              >
                Replay
              </button>
            </>
          ) : isRiddle && solved && atLastLevel ? (
            <button
              className="restart-btn"
              onClick={() => dispatch({ type: 'NEW_RIDDLE' })}
            >
              New puzzle
            </button>
          ) : isRiddle && failed ? (
            <button className="restart-btn" onClick={() => dispatch({ type: 'RESTART' })}>
              Retry level
            </button>
          ) : (
            <button className="restart-btn" onClick={() => dispatch({ type: 'RESTART' })}>
              {isRiddle ? 'Play again' : 'Play Again'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
