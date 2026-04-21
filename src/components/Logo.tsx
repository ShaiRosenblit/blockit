type LogoProps = {
  /** Rendered width in px; height scales to preserve aspect. Defaults to 28. */
  size?: number;
  className?: string;
};

/**
 * Inline SVG "B"-from-blocks mark for Blockit. Uses the in-game piece palette
 * (see `COLORS` in `game/types.ts`) so the header mark visually matches the
 * tetrominoes the player drags onto the board. The teal spine doubles as the
 * app's primary accent color.
 *
 * Rendered as six rectangles on a 5×7 cell grid (cell = 4 units); the subtle
 * stroke in the app background color creates the "assembled blocks" feel
 * without needing an outline.
 */
export function Logo({ size = 28, className }: LogoProps) {
  const width = size;
  const height = Math.round((size * 28) / 20);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 28"
      width={width}
      height={height}
      role="img"
      aria-label="Blockit"
      className={className}
    >
      <g stroke="#1a1a2e" strokeWidth="0.6" shapeRendering="crispEdges">
        {/* Spine */}
        <rect x="0" y="0" width="4" height="28" fill="#4ECDC4" />
        {/* Top bar */}
        <rect x="4" y="0" width="12" height="4" fill="#FF6B6B" />
        {/* Top-right bump */}
        <rect x="16" y="4" width="4" height="8" fill="#FFEAA7" />
        {/* Middle bar */}
        <rect x="4" y="12" width="12" height="4" fill="#45B7D1" />
        {/* Bottom-right bump */}
        <rect x="16" y="16" width="4" height="8" fill="#DDA0DD" />
        {/* Bottom bar */}
        <rect x="4" y="24" width="12" height="4" fill="#FF8C42" />
      </g>
    </svg>
  );
}
