type LogoProps = {
  /** Rendered width in px; height scales to preserve aspect. Defaults to 28. */
  size?: number;
  className?: string;
};

/**
 * Inline SVG "B"-from-blocks mark for Blockit.
 *
 * Reads as a letterform first, "made of blocks" second: a single teal B
 * silhouette (the game's primary accent, matching `COLORS[1]` in
 * `game/types.ts`) with crisp dark dividers laid over a 5×7 cell grid so
 * each cell looks like a dropped tetromino square. Using one color keeps
 * the shape legible at header sizes — a multi-color pixelated mark turns
 * into visual noise below ~32px.
 */
export function Logo({ size = 28, className }: LogoProps) {
  const width = size;
  const height = Math.round((size * 28) / 20);
  const fill = '#4ECDC4';
  const divider = '#1a1a2e';
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
      <g stroke={divider} strokeWidth="1.2" shapeRendering="crispEdges">
        {/* Spine (full-height column) */}
        <rect x="0" y="0" width="4" height="28" fill={fill} />
        {/* Top bar */}
        <rect x="4" y="0" width="16" height="4" fill={fill} />
        {/* Top-right bump */}
        <rect x="16" y="4" width="4" height="8" fill={fill} />
        {/* Middle bar */}
        <rect x="4" y="12" width="16" height="4" fill={fill} />
        {/* Bottom-right bump */}
        <rect x="16" y="16" width="4" height="8" fill={fill} />
        {/* Bottom bar */}
        <rect x="4" y="24" width="16" height="4" fill={fill} />
      </g>
      {/* Internal grid dividers: vertical & horizontal lines every 4 units
          so the solid-color "B" still reads as an assembly of individual
          block cells. Drawn on top of the fill rects. */}
      <g stroke={divider} strokeWidth="1" shapeRendering="crispEdges">
        <line x1="4" y1="0" x2="4" y2="28" />
        <line x1="8" y1="0" x2="8" y2="4" />
        <line x1="12" y1="0" x2="12" y2="4" />
        <line x1="16" y1="0" x2="16" y2="12" />
        <line x1="8" y1="12" x2="8" y2="16" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="16" y1="12" x2="16" y2="24" />
        <line x1="8" y1="24" x2="8" y2="28" />
        <line x1="12" y1="24" x2="12" y2="28" />
        <line x1="0" y1="4" x2="20" y2="4" />
        <line x1="0" y1="8" x2="4" y2="8" />
        <line x1="16" y1="8" x2="20" y2="8" />
        <line x1="0" y1="12" x2="20" y2="12" />
        <line x1="0" y1="16" x2="20" y2="16" />
        <line x1="0" y1="20" x2="4" y2="20" />
        <line x1="16" y1="20" x2="20" y2="20" />
        <line x1="0" y1="24" x2="20" y2="24" />
      </g>
    </svg>
  );
}
