import type { CSSProperties } from 'react';
import { BOARD_SIZE, type BoardGrid } from '../game/types';

const PARTICLE_COUNT_MIN = 8;
const PARTICLE_COUNT_MAX = 15;
const SPARKLE_COLORS = ['#FFFFFF', '#FFF7C2', '#FFEAA7'];

export type ClearParticle = {
  id: string;
  dx: number;
  dy: number;
  fall: number;
  spin: number;
  durationMs: number;
  delayMs: number;
  size: number;
  stretch: number;
  shape: 'confetti' | 'spark';
  color: string;
};

export type ClearingCell = {
  row: number;
  col: number;
  color: string;
  particles: ClearParticle[];
};

export type ClearBurstEvent = {
  id: number;
  cells: ClearingCell[];
  durationMs: number;
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function createParticle(cellColor: string, index: number): ClearParticle {
  const shape: ClearParticle['shape'] = Math.random() < 0.28 ? 'spark' : 'confetti';
  const angle = rand(0, Math.PI * 2);
  const speed = shape === 'spark' ? rand(0.28, 0.72) : rand(0.34, 0.96);
  const lift = rand(0.18, 0.82);
  const durationMs = randInt(520, 780);

  return {
    id: `${index}-${Math.round(angle * 1000)}`,
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed - lift,
    fall: rand(0.32, 0.96),
    spin: rand(shape === 'spark' ? 120 : 220, shape === 'spark' ? 360 : 760),
    durationMs,
    delayMs: randInt(0, 90),
    size: rand(shape === 'spark' ? 0.1 : 0.14, shape === 'spark' ? 0.2 : 0.28),
    stretch: rand(shape === 'spark' ? 0.9 : 1.1, shape === 'spark' ? 1.35 : 1.8),
    shape,
    color: shape === 'spark' ? SPARKLE_COLORS[randInt(0, SPARKLE_COLORS.length - 1)] : cellColor,
  };
}

function createParticles(cellColor: string): ClearParticle[] {
  const count = randInt(PARTICLE_COUNT_MIN, PARTICLE_COUNT_MAX);
  return Array.from({ length: count }, (_, index) => createParticle(cellColor, index));
}

export function createClearBurstEvent(
  id: number,
  board: BoardGrid,
  rows: number[],
  cols: number[]
): ClearBurstEvent | null {
  const coords = new Set<string>();
  const cells: ClearingCell[] = [];

  for (const row of rows) {
    for (let col = 0; col < BOARD_SIZE; col++) coords.add(`${row},${col}`);
  }

  for (const col of cols) {
    for (let row = 0; row < BOARD_SIZE; row++) coords.add(`${row},${col}`);
  }

  for (const key of coords) {
    const [rowText, colText] = key.split(',');
    const row = Number(rowText);
    const col = Number(colText);
    const color = board[row]?.[col];
    if (!color) continue;
    cells.push({ row, col, color, particles: createParticles(color) });
  }

  if (cells.length === 0) return null;

  const durationMs = cells.reduce((max, cell) => {
    const longestParticle = cell.particles.reduce(
      (cellMax, particle) => Math.max(cellMax, particle.durationMs + particle.delayMs),
      0
    );
    return Math.max(max, longestParticle);
  }, 720);

  return { id, cells, durationMs };
}

type ClearBurstOverlayProps = {
  bursts: ClearBurstEvent[];
};

export function ClearBurstOverlay({ bursts }: ClearBurstOverlayProps) {
  if (bursts.length === 0) return null;

  return (
    <div className="clear-burst-overlay" aria-hidden="true">
      {bursts.flatMap((burst) =>
        burst.cells.map((cell) => (
          <div
            key={`${burst.id}-${cell.row}-${cell.col}`}
            className="clear-burst-cell"
            style={{
              gridRow: cell.row + 1,
              gridColumn: cell.col + 1,
              '--burst-color': cell.color,
            } as CSSProperties}
          >
            <span className="clear-burst-cell__flash" />
            {cell.particles.map((particle) => (
              <span
                key={particle.id}
                className="clear-burst-particle"
                style={{
                  '--dx': particle.dx,
                  '--dy': particle.dy,
                  '--fall': particle.fall,
                  '--spin': `${particle.spin}deg`,
                  '--duration': `${particle.durationMs}ms`,
                  '--delay': `${particle.delayMs}ms`,
                  '--particle-color': particle.color,
                  '--particle-size': `${particle.size}`,
                  '--particle-stretch': `${particle.stretch}`,
                } as CSSProperties}
              >
                <span
                  className={`clear-burst-particle__shape clear-burst-particle__shape--${particle.shape}`}
                />
              </span>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
