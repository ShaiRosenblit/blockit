import { useGame } from '../hooks/useGame';

type ScoreBarProps = {
  scoreValueRef?: React.RefObject<HTMLSpanElement | null>;
};

export function ScoreBar({ scoreValueRef }: ScoreBarProps) {
  const { state } = useGame();

  return (
    <div className="score-bar">
      <div className="score-item">
        <span className="score-label">Score</span>
        <span
          ref={scoreValueRef}
          className="score-value score-value--primary"
        >
          {state.score}
        </span>
      </div>
      <div className="score-item">
        <span className="score-label">Best</span>
        <span className="score-value">{state.bestScore}</span>
      </div>
    </div>
  );
}
