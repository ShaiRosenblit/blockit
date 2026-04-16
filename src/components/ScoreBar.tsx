import { useGame } from '../hooks/useGame';

export function ScoreBar() {
  const { state } = useGame();

  return (
    <div className="score-bar">
      <div className="score-item">
        <span className="score-label">Score</span>
        <span className="score-value">{state.score}</span>
      </div>
      <div className="score-item">
        <span className="score-label">Best</span>
        <span className="score-value">{state.bestScore}</span>
      </div>
    </div>
  );
}
