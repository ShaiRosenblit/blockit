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
};
