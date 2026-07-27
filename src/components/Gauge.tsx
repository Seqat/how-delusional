import type { JSX } from 'preact';

interface GaugeProps {
  /** 0..100 */
  value: number;
  /** hex color string */
  color: string;
  label: string;
}

/**
 * A 180° arc gauge, hand-drawn SVG. No libraries.
 * The arc starts at 180° (left) and sweeps to 360° (right), so 0 is fully
 * left, 100 is fully right. Color is supplied by the caller based on the
 * score tier.
 */
export function Gauge({ value, color, label }: GaugeProps): JSX.Element {
  const v = Math.max(0, Math.min(100, value));
  const r = 80;
  const cx = 100;
  const cy = 100;
  const strokeWidth = 18;

  // Angle in radians: 180° → 360°.
  const startAngle = Math.PI; // 180°
  const endAngle = 2 * Math.PI; // 360°
  const valueAngle = startAngle + (v / 100) * (endAngle - startAngle);

  const polar = (angle: number, radius: number = r) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const startPt = polar(startAngle);
  const endPt = polar(endAngle);
  const valuePt = polar(valueAngle);

  // Background arc (full 180°).
  const bgArc = `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 0 1 ${endPt.x} ${endPt.y}`;

  // Value arc (from start to value).
  const valArc = `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 0 1 ${valuePt.x} ${valuePt.y}`;

  // Tick marks every 10 units.
  const ticks: JSX.Element[] = [];
  for (let i = 0; i <= 10; i++) {
    const tAngle = startAngle + (i / 10) * (endAngle - startAngle);
    const outer = polar(tAngle, r + 12);
    const inner = polar(tAngle, r + 4);
    ticks.push(
      <line
        key={i}
        x1={outer.x}
        y1={outer.y}
        x2={inner.x}
        y2={inner.y}
        stroke="var(--gauge-tick)"
        strokeWidth={i % 5 === 0 ? 2 : 1}
      />,
    );
  }

  return (
    <div class="gauge">
      <svg viewBox="0 0 200 130" role="img" aria-label={`${label}: ${v.toFixed(0)} / 100`}>
        <path d={bgArc} fill="none" stroke="var(--gauge-track)" stroke-width={strokeWidth} stroke-linecap="round" />
        <path d={valArc} fill="none" stroke={color} stroke-width={strokeWidth} stroke-linecap="round" />
        {ticks}
        <text
          x={cx}
          y={cy - 6}
          text-anchor="middle"
          class="gauge-value"
          fill={color}
        >
          {v.toFixed(0)}
        </text>
        <text x={cx} y={cy + 16} text-anchor="middle" class="gauge-label">
          {label}
        </text>
        <text x={startPt.x - 4} y={startPt.y + 18} class="gauge-tick-label">0</text>
        <text x={endPt.x + 4} y={endPt.y + 18} class="gauge-tick-label" text-anchor="end">100</text>
      </svg>
    </div>
  );
}
