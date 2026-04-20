import type { TutorialStep } from '../game/tutorial';

type TutorialBannerProps = {
  stepIndex: number;
  totalSteps: number;
  step: TutorialStep;
  /** Jump directly to a step by clicking its dot. */
  onJump: (stepIndex: number) => void;
};

/**
 * Pinned above the board while the tutorial is active. Shows the current
 * step's title + instruction, plus a dot row for quick navigation between
 * steps. The content adapts automatically to the currently-selected step
 * in the reducer — this component is a pure render.
 */
export function TutorialBanner({ stepIndex, totalSteps, step, onJump }: TutorialBannerProps) {
  return (
    <section
      className="tutorial-banner"
      role="region"
      aria-label={`Tutorial — ${step.title}`}
    >
      <header className="tutorial-banner__head">
        <span className="tutorial-banner__eyebrow">
          Tutorial · Step {stepIndex + 1} of {totalSteps}
        </span>
        <h2 className="tutorial-banner__title">{step.title}</h2>
      </header>
      <p className="tutorial-banner__text">{step.text}</p>
      {step.hint && <p className="tutorial-banner__hint">{step.hint}</p>}
      <div className="tutorial-banner__dots" role="tablist" aria-label="Tutorial steps">
        {Array.from({ length: totalSteps }, (_, i) => {
          const isCurrent = i === stepIndex;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              aria-label={`Go to step ${i + 1}`}
              className={`tutorial-banner__dot${isCurrent ? ' tutorial-banner__dot--current' : ''}`}
              onClick={() => onJump(i)}
            >
              <span className="tutorial-banner__dot-inner" aria-hidden />
            </button>
          );
        })}
      </div>
    </section>
  );
}
