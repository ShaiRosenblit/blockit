import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../hooks/useGame';
import { Cell } from './Cell';
import type { Coord } from '../game/types';
import { BOARD_SIZE } from '../game/types';

type ClearingCell = {
  row: number;
  col: number;
  color: string;
};

type ClearAnimationEvent = {
  id: number;
  cells: ClearingCell[];
};

type BoardProps = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  previewCells?: Map<string, 'valid' | 'invalid'>;
  previewColor?: string | null;
  placedCells?: Set<string>;
  clearPreviewCells?: Set<string>;
  clearAnimations?: ClearAnimationEvent[];
  shakeTrigger?: number;
};

function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}

function randomFromSeed(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function createShardConfigs(eventId: number, cell: ClearingCell) {
  const seedBase = eventId * 131 + cell.row * 17 + cell.col * 31;
  const centerOffsetX = cell.col - (BOARD_SIZE - 1) / 2;
  const centerOffsetY = cell.row - (BOARD_SIZE - 1) / 2;
  const centerMagnitude = Math.hypot(centerOffsetX, centerOffsetY);
  const baseAngle =
    centerMagnitude > 0.15
      ? Math.atan2(centerOffsetY, centerOffsetX)
      : randomFromSeed(seedBase + 0.77) * Math.PI * 2;
  const shardCount = 4 + Math.floor(randomFromSeed(seedBase + 1.13) * 6);
  const shardShapes = [
    'polygon(0 0, 70% 12%, 88% 80%, 16% 100%)',
    'polygon(16% 0, 100% 24%, 84% 100%, 0 72%)',
    'polygon(0 12%, 92% 0, 100% 68%, 24% 100%)',
    'polygon(12% 0, 78% 0, 100% 44%, 50% 100%, 0 58%)',
    'polygon(0 36%, 42% 0, 100% 24%, 82% 100%, 18% 92%)',
  ];

  return Array.from({ length: shardCount }, (_, index) => {
    const shardSeed = seedBase + index * 9.91;
    const angleSpread = (randomFromSeed(shardSeed + 0.31) - 0.5) * 1.24;
    const angle = baseAngle + angleSpread;
    const speed = 24 + randomFromSeed(shardSeed + 0.67) * 38;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - (12 + randomFromSeed(shardSeed + 0.93) * 18);
    const drift = (randomFromSeed(shardSeed + 1.23) - 0.5) * 18;
    const size = 24 + randomFromSeed(shardSeed + 1.79) * 28;
    const rotationStart = (randomFromSeed(shardSeed + 2.09) - 0.5) * 80;
    const rotationEnd = rotationStart + (randomFromSeed(shardSeed + 2.41) - 0.5) * 380;
    const duration = 540 + randomFromSeed(shardSeed + 2.83) * 130;
    const delay = randomFromSeed(shardSeed + 3.21) * 65;
    const clipPath =
      shardShapes[Math.floor(randomFromSeed(shardSeed + 3.57) * shardShapes.length)] ??
      shardShapes[0];
    const shardStyle = {
      '--dx': `${dx.toFixed(2)}px`,
      '--dy': `${dy.toFixed(2)}px`,
      '--drift': `${drift.toFixed(2)}px`,
      '--size': `${size.toFixed(2)}%`,
      '--spin-start': `${rotationStart.toFixed(2)}deg`,
      '--spin-end': `${rotationEnd.toFixed(2)}deg`,
      '--duration': `${duration.toFixed(2)}ms`,
      '--delay': `${delay.toFixed(2)}ms`,
      clipPath,
    } as React.CSSProperties;
    return { key: `${cell.row}-${cell.col}-${index}`, style: shardStyle };
  });
}

export function Board({
  boardRef,
  previewCells,
  previewColor,
  placedCells,
  clearPreviewCells,
  clearAnimations,
  shakeTrigger,
}: BoardProps) {
  const { state } = useGame();
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (!shakeTrigger) return;
    setIsShaking(true);
    const timerId = window.setTimeout(() => {
      setIsShaking(false);
    }, 360);
    return () => clearTimeout(timerId);
  }, [shakeTrigger]);

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = coordKey(r, c);
      const preview = previewCells?.get(key) ?? null;
      const justPlaced = placedCells?.has(key) ?? false;
      const willClear = clearPreviewCells?.has(key) ?? false;
      cells.push(
        <Cell
          key={key}
          color={preview === 'valid' ? previewColor ?? null : state.board[r][c]}
          preview={preview}
          justPlaced={justPlaced}
          willClear={willClear}
        />
      );
    }
  }

  const clearOverlay = useMemo(() => {
    if (!clearAnimations || clearAnimations.length === 0) return null;
    return clearAnimations.map((event) =>
      event.cells.map((cell) => {
        const cellStyle = {
          left: `calc(var(--gap) + ${cell.col} * (var(--cell-size) + var(--gap)))`,
          top: `calc(var(--gap) + ${cell.row} * (var(--cell-size) + var(--gap)))`,
          '--clear-color': cell.color,
        } as React.CSSProperties;
        const shards = createShardConfigs(event.id, cell);
        return (
          <div key={`${event.id}:${cell.row}:${cell.col}`} className="clear-cell-shatter" style={cellStyle}>
            <div className="clear-cell-flash" />
            {shards.map((shard) => (
              <div key={shard.key} className="clear-cell-shard" style={shard.style} />
            ))}
          </div>
        );
      })
    );
  }, [clearAnimations]);

  return (
    <div className={`board${isShaking ? ' board--shake' : ''}`} ref={boardRef}>
      {cells}
      <div className="board-clear-overlay">{clearOverlay}</div>
    </div>
  );
}

export function getCoordsFromPointer(
  boardEl: HTMLElement,
  clientX: number,
  clientY: number
): Coord | null {
  const rect = boardEl.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const cellSize = rect.width / BOARD_SIZE;
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return { row, col };
}
