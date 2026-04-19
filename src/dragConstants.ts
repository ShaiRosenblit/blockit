/**
 * Viewport offset from the pointer while dragging a tray piece (screen px).
 * Negative Y moves the floating piece above the finger; small X shifts it sideways
 * so the hand does not cover the preview.
 */
export const DRAG_POINTER_OFFSET_X = -8;
export const DRAG_POINTER_OFFSET_Y = -104;

/**
 * Multiplier on pointer delta from the drag anchor: >1 means a short finger stroke
 * moves the piece further on the board (less travel to reach the top/sides).
 */
export const DRAG_POINTER_SCALE = 1.38;

/** Maps raw pointer to an amplified position using delta from the drag anchor. */
export function dragPointerToEffective(
  clientX: number,
  clientY: number,
  anchorX: number,
  anchorY: number
): { x: number; y: number } {
  return {
    x: anchorX + (clientX - anchorX) * DRAG_POINTER_SCALE,
    y: anchorY + (clientY - anchorY) * DRAG_POINTER_SCALE,
  };
}
