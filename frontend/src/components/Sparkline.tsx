interface SparklineProps {
  data: Array<{ date: string; stars: number }>;
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 80, height = 24, color }: SparklineProps) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="flex items-center justify-center text-github-muted/30 text-xs">-</div>;
  }

  // Sort by date ascending
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map(d => d.stars);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Generate SVG path
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const pathD = `M${points.join('L')}`;
  const fillD = `${pathD}L${width},${height}L0,${height}Z`;

  // Determine color based on trend
  const trendColor = color || (values[values.length - 1] >= values[0] ? 'var(--color-green)' : 'var(--color-red)');

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      {/* Fill area */}
      <path
        d={fillD}
        fill={trendColor}
        opacity={0.1}
      />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2}
        r={2}
        fill={trendColor}
      />
    </svg>
  );
}
