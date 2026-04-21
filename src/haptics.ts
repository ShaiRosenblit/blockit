function vibrate(pattern: number | number[]) {
  navigator.vibrate?.(pattern);
}

export const haptics = {
  pickup: () => vibrate(10),
  place: () => vibrate(25),
  lineClear: (count: number) => {
    if (count >= 3) vibrate([40, 30, 40, 30, 40]);
    else if (count === 2) vibrate([30, 20, 30]);
    else vibrate([30, 20, 30]);
  },
  invalidDrop: () => vibrate([15, 40, 15]),
  gameOver: () => vibrate([50, 80, 100, 80, 200]),
  /**
   * Puzzle-solve celebration. `intensity` is 0..1 (scales with difficulty).
   * Low intensity: single short pulse; high intensity: longer cheer burst.
   */
  celebrate: (intensity: number) => {
    const clamped = Math.max(0, Math.min(1, intensity));
    const pulses = Math.round(2 + clamped * 5);
    const pattern: number[] = [];
    for (let i = 0; i < pulses; i++) {
      pattern.push(Math.round(30 + clamped * 50));
      if (i < pulses - 1) pattern.push(Math.round(30 + clamped * 30));
    }
    vibrate(pattern);
  },
};
