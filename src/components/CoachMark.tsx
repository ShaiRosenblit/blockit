import { useEffect, useLayoutEffect, useState } from 'react';

type CoachMarkProps = {
  /** The cell (or any element) the arrow should point at. */
  anchor: HTMLElement | null;
  /** One-line instruction displayed in the bubble. */
  text: string;
  /** Called once the coach-mark has been dismissed (timeout or interaction). */
  onDismiss: () => void;
  /** How long the coach-mark stays on screen, in milliseconds. */
  autoDismissMs?: number;
};

type Position = { top: number; left: number; arrowAtTop: boolean };

/**
 * Floating pointer bubble that anchors itself to a DOM element and
 * auto-dismisses after a short timeout. Re-positions on viewport changes so
 * it stays glued to its anchor through resizes / orientation flips.
 *
 * Kept intentionally dumb — the one-shot persistence logic lives in
 * `useCoachMarks`; this component is just pixels.
 */
export function CoachMark({ anchor, text, onDismiss, autoDismissMs = 6000 }: CoachMarkProps) {
  const [pos, setPos] = useState<Position | null>(null);

  useLayoutEffect(() => {
    // When `anchor` becomes null we rely on the render-time guard below
    // (`if (!anchor || !pos) return null`) to hide the bubble — no need to
    // write `null` back into state. That keeps this effect free of
    // synchronous setState-on-mount, which the hooks linter (rightly) flags
    // as a cascading-render smell.
    if (!anchor) return;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      // Prefer floating below the anchor (most cells are in the upper half
      // of the viewport) unless that would clip; fall back to above.
      const spaceBelow = window.innerHeight - rect.bottom;
      const arrowAtTop = spaceBelow > 80;
      const top = arrowAtTop ? rect.bottom + 10 : rect.top - 10;
      const left = rect.left + rect.width / 2;
      setPos({ top, left, arrowAtTop });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;
    const id = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(id);
  }, [anchor, autoDismissMs, onDismiss]);

  if (!anchor || !pos) return null;

  return (
    <div
      className={`coach-mark${pos.arrowAtTop ? ' coach-mark--below' : ' coach-mark--above'}`}
      style={{ top: pos.top, left: pos.left }}
      role="status"
      aria-live="polite"
    >
      <div className="coach-mark__arrow" aria-hidden />
      <div className="coach-mark__bubble">{text}</div>
    </div>
  );
}
