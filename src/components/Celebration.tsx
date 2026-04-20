import { useEffect, useMemo, useState } from 'react';
import { COLORS } from '../game/types';

/**
 * Intensity is a 0..1 dial that governs every celebration knob at once:
 * piece count, burst radius, physical reach, duration, and fireworks.
 * Tutorial solves use a tiny value; the hardest numeric riddle maxes out.
 */
type Props = {
  intensity: number;
  centerX: number;
  centerY: number;
  /** Bumped on each new celebration so React remounts + effects re-run. */
  runId: number;
  onComplete?: () => void;
};

type ConfettiPiece = {
  id: number;
  endX: number;
  endY: number;
  fall: number;
  rotation: number;
  width: number;
  height: number;
  color: string;
  delay: number;
  duration: number;
  shape: 'rect' | 'circle';
};

type Firework = {
  id: number;
  x: number;
  y: number;
  delay: number;
  color: string;
  scale: number;
};

let pieceSeq = 0;
let fireworkSeq = 0;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function Celebration({ intensity, centerX, centerY, runId, onComplete }: Props) {
  const clamped = Math.max(0, Math.min(1, intensity));
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const { pieces, fireworks, totalDuration } = useMemo(() => {
    if (reduced) {
      // Still give a small burst for reduced-motion — just fewer, shorter.
      const count = Math.round(8 + clamped * 12);
      const arr: ConfettiPiece[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const radius = 80 + Math.random() * (40 + clamped * 80);
        arr.push({
          id: ++pieceSeq,
          endX: Math.cos(angle) * radius,
          endY: Math.sin(angle) * radius - 20,
          fall: 0,
          rotation: 0,
          width: 8,
          height: 8,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: 0,
          duration: 420,
          shape: 'circle',
        });
      }
      return { pieces: arr, fireworks: [] as Firework[], totalDuration: 600 };
    }

    const count = Math.round(36 + clamped * 220);
    const arr: ConfettiPiece[] = [];
    const maxSpeed = 220 + clamped * 520;
    // Upward bias on the initial burst — confetti then falls under "gravity"
    // via the extra downward offset at the animation's end keyframe.
    for (let i = 0; i < count; i++) {
      // Distribute around the full circle but jitter so it doesn't look like a grid.
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = maxSpeed * (0.45 + Math.random() * 0.55);
      const endX = Math.cos(angle) * speed;
      // Bias y upward (-) so the arc feels like a proper firework.
      const endY = Math.sin(angle) * speed - (80 + Math.random() * (40 + clamped * 160));
      // Extra fall distance — higher intensity = bigger pieces fall further.
      const fall = 320 + Math.random() * (160 + clamped * 420);
      const isRect = Math.random() > 0.35;
      const baseSize = 5 + Math.random() * (6 + clamped * 8);
      arr.push({
        id: ++pieceSeq,
        endX,
        endY,
        fall,
        rotation: (Math.random() - 0.5) * 1080,
        width: isRect ? baseSize * (0.6 + Math.random() * 0.8) : baseSize,
        height: isRect ? baseSize * (1.2 + Math.random() * 1.2) : baseSize,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * (80 + clamped * 220),
        duration: 1400 + Math.random() * (600 + clamped * 1600),
        shape: isRect ? 'rect' : 'circle',
      });
    }

    // Fireworks only for the higher intensities — keeps lighter solves calm.
    const fireworkCount = clamped < 0.4 ? 0 : Math.round(1 + clamped * 5);
    const fw: Firework[] = [];
    for (let i = 0; i < fireworkCount; i++) {
      fw.push({
        id: ++fireworkSeq,
        // Spread across viewport, slightly biased around the board centre.
        x: centerX + (Math.random() - 0.5) * window.innerWidth * 0.7,
        y: centerY + (Math.random() - 0.5) * window.innerHeight * 0.5 - 40,
        delay: 150 + i * (260 + Math.random() * 180),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        scale: 0.8 + Math.random() * (0.4 + clamped * 0.6),
      });
    }

    const confettiEnd = Math.max(
      ...arr.map((p) => p.delay + p.duration),
      0
    );
    const fireworkEnd = Math.max(
      ...fw.map((f) => f.delay + 900),
      0
    );
    return {
      pieces: arr,
      fireworks: fw,
      totalDuration: Math.max(confettiEnd, fireworkEnd) + 120,
    };
  }, [clamped, reduced, centerX, centerY]);

  const [alive, setAlive] = useState(true);
  useEffect(() => {
    setAlive(true);
    const t = window.setTimeout(() => {
      setAlive(false);
      onComplete?.();
    }, totalDuration);
    return () => window.clearTimeout(t);
    // runId intentionally included so a new celebration resets the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, totalDuration]);

  if (!alive) return null;

  return (
    <div className="celebration-overlay" aria-hidden>
      {fireworks.map((f) => (
        <div
          key={f.id}
          className="celebration-firework"
          style={{
            left: f.x,
            top: f.y,
            animationDelay: `${f.delay}ms`,
            ['--fw-color' as string]: f.color,
            ['--fw-scale' as string]: String(f.scale),
          } as React.CSSProperties}
        />
      ))}
      {pieces.map((p) => (
        <div
          key={p.id}
          className={`celebration-piece celebration-piece--${p.shape}`}
          style={{
            left: centerX,
            top: centerY,
            width: p.width,
            height: p.height,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            ['--end-x' as string]: `${p.endX}px`,
            ['--end-y' as string]: `${p.endY}px`,
            ['--fall' as string]: `${p.fall}px`,
            ['--rot' as string]: `${p.rotation}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
