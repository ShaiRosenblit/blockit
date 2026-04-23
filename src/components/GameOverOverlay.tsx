import { useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { haptics } from '../haptics';
import { sounds } from '../sounds';
import { TUTORIAL_STEP_COUNT } from '../game/tutorial';
import { nextPuzzleLevel } from '../game/gameReducer';
import { puzzleDifficultyLabel, type PuzzleLevel } from '../game/types';

/**
 * Per-difficulty "level up" copy that fires once, the very first time a
 * player solves a numeric puzzle difficulty. Written to feel like a
 * teammate noticing you just did the thing — a quick high-five, then a
 * dare to keep climbing. Clearing Expert gets its own mastery moment
 * since there's no higher rung to propose.
 */
type LevelUpCopy = {
  eyebrow: string;
  headline: string;
  subline: string;
  cta: string;
};

const LEVEL_UP_COPY: Record<PuzzleLevel, LevelUpCopy> = {
  1: {
    eyebrow: 'Level up',
    headline: 'Easy? Handled.',
    subline: "You've got the rhythm. Think you can keep it up on Normal?",
    cta: 'Step up to Normal',
  },
  2: {
    eyebrow: 'Level up',
    headline: 'Normal: nailed it.',
    subline: 'Smooth moves. Turn up the heat — Hard is calling.',
    cta: 'Step up to Hard',
  },
  3: {
    eyebrow: 'Level up',
    headline: 'Hard? Crushed.',
    subline: 'Impressive work. One trial stands between you and mastery — Expert awaits.',
    cta: 'Step up to Expert',
  },
  4: {
    eyebrow: 'Mastery unlocked',
    headline: 'Expert: mastered.',
    subline: "You've cleared the toughest tier. Officially a Blockit legend.",
    cta: 'Another Expert puzzle',
  },
};

type Props = {
  /**
   * Called when the player taps "Challenge a friend". Only relevant in
   * puzzle mode; tutorial steps aren't shareable. Parent owns the share
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

  const isPuzzle = state.mode === 'puzzle';
  const solved = isPuzzle && state.puzzleResult === 'solved';
  const failed = isPuzzle && state.puzzleResult === 'failed';
  const isTutorial = isPuzzle && state.puzzleDifficulty === 'tutorial';
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

  // First-time solve of a numeric difficulty trumps the generic "solved"
  // copy with a one-shot promotion prompt. The reducer only sets
  // `puzzleLevelUp` on that exact tick (and clears it on any subsequent
  // action), so this banner inherently fires at most once per difficulty.
  const levelUpLevel = isPuzzle && solved ? state.puzzleLevelUp : null;
  const levelUp: LevelUpCopy | null = levelUpLevel !== null ? LEVEL_UP_COPY[levelUpLevel] : null;
  const nextLevel = levelUpLevel !== null ? nextPuzzleLevel(levelUpLevel) : null;

  // Tutorial messaging is separate from the generic puzzle/classic copy so
  // the overlay teaches rather than congratulates when the student solves
  // an authored step, and encourages a retry (not "new puzzle") on failure.
  const headline = isTutorial
    ? solved
      ? isLastTutorialStep
        ? 'Tutorial complete!'
        : 'Nice — step solved!'
      : 'Not quite — try again'
    : levelUp
      ? levelUp.headline
      : solved
        ? 'Pattern matched!'
        : failed
          ? 'Pattern not matched'
          : 'Game Over';

  const subline = isTutorial
    ? solved
      ? isLastTutorialStep
        ? "You've got the hang of Blockit. Time to tackle your first Easy puzzle!"
        : 'On to the next lesson.'
      : 'Use Retry to reset this step and give it another go.'
    : levelUp
      ? levelUp.subline
      : isPuzzle
        ? solved
          ? 'Nicely done.'
          : 'Tip: row/column clears can remove unwanted cells — plan the order.'
        : null;

  const selectionLabel = isTutorial
    ? `Tutorial · Step ${state.tutorialStep + 1} of ${TUTORIAL_STEP_COUNT}`
    : isPuzzle
      ? `Puzzle · ${puzzleDifficultyLabel(state.puzzleDifficulty)}`
      : `Classic · ${state.classicDifficulty}`;

  // Puzzle mode is a binary solve/not-solve challenge, so numeric score
  // and per-difficulty best aren't meaningful feedback — they're suppressed
  // here. Classic mode still shows both.
  const bestLabel = !isPuzzle ? `Best (${state.classicDifficulty})` : null;
  const showStats = !isPuzzle;

  const variant = solved
    ? 'game-over-panel--solved'
    : failed
      ? 'game-over-panel--failed'
      : 'game-over-panel--classic';
  const levelUpClass = levelUp ? ' game-over-panel--level-up' : '';

  return (
    <div
      className={`game-over-panel ${variant}${levelUpClass}`}
      role="region"
      aria-live="polite"
      aria-label={headline}
    >
      <div className="game-over-panel__head">
        <span className="game-over-panel__mark" aria-hidden>
          {levelUp ? '\u{1F3C6}' : solved ? '\u2728' : failed ? '\u25CB' : '\u25CB'}
        </span>
        <div className="game-over-panel__headings">
          {levelUp && (
            <span className="game-over-panel__eyebrow" aria-hidden>
              {levelUp.eyebrow}
            </span>
          )}
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
                {isLastTutorialStep ? 'Start Easy puzzle' : 'Next step'}
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
              onClick={() => dispatch({ type: 'SET_PUZZLE_DIFFICULTY', difficulty: 1 })}
            >
              Skip tutorial
            </button>
          </>
        ) : isPuzzle ? (
          <>
            {/* Primary action depends on outcome: after a solve the natural
                next step is a fresh puzzle, not replaying the one you just
                beat; after a failure the player most often wants another go
                at the same board. First-time solves of a given difficulty
                promote the "step up" CTA to primary — clearing Easy for the
                first time should feel like an invitation into Normal, not
                just another new-puzzle prompt. */}
            {solved ? (
              <>
                {levelUp && nextLevel !== null ? (
                  <button
                    className="game-over-panel__btn game-over-panel__btn--primary game-over-panel__btn--level-up"
                    onClick={() =>
                      dispatch({ type: 'SET_PUZZLE_DIFFICULTY', difficulty: nextLevel })
                    }
                  >
                    <span aria-hidden>{'\u{1F680}'}</span> {levelUp.cta}
                  </button>
                ) : (
                  <button
                    className="game-over-panel__btn game-over-panel__btn--primary"
                    onClick={() => dispatch({ type: 'NEW_PUZZLE' })}
                  >
                    {levelUp ? levelUp.cta : 'New puzzle'}
                  </button>
                )}
                <button
                  className="game-over-panel__btn"
                  onClick={() => dispatch({ type: 'RESTART' })}
                >
                  Replay
                </button>
              </>
            ) : (
              <>
                <button
                  className="game-over-panel__btn game-over-panel__btn--primary"
                  onClick={() => dispatch({ type: 'RESTART' })}
                >
                  Retry
                </button>
                <button
                  className="game-over-panel__btn"
                  onClick={() => dispatch({ type: 'NEW_PUZZLE' })}
                >
                  New puzzle
                </button>
              </>
            )}
            {onShare && state.puzzleInitialBoard && state.puzzleTarget && (
              // Intentionally full-width: "Challenge a friend" reads
              // better than a shortened "Challenge", so we let it drop
              // onto its own row below the two primary-flow buttons.
              // The board is sized (see --board-max) so that even with
              // this second action row the panel still fits alongside
              // the board on iPhone-13-class viewports.
              <button
                className="game-over-panel__btn game-over-panel__btn--wide"
                onClick={onShare}
              >
                <span aria-hidden>{'\u{1F3AF}'}</span>{' '}
                {shareStatus === 'copied'
                  ? 'Link copied!'
                  : shareStatus === 'failed'
                    ? 'Copy failed'
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
