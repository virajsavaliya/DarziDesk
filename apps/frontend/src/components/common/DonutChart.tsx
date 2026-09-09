import React from 'react';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  thickness?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 140,
  thickness = 28,
}) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const paths = segments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const fraction = seg.value / (total || 1);
      const dash = fraction * circumference;
      const gap = circumference - dash;
      const strokeDasharray = `${dash} ${gap}`;
      // rotate so the first segment starts at 12 o'clock
      const rotate = -90 + (offset / (total || 1)) * 360;
      offset += seg.value;
      return { ...seg, strokeDasharray, rotate };
    });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* SVG Donut */}
      <div className="shrink-0 relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={thickness}
          />
          {paths.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={seg.strokeDasharray}
              strokeLinecap="butt"
              transform={`rotate(${seg.rotate} ${cx} ${cy})`}
              className="transition-all duration-700"
            />
          ))}
        </svg>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-primary leading-none">{total}</span>
          <span className="text-[10px] font-medium text-text-muted mt-0.5">Orders</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 min-w-0">
        {segments
          .filter((s) => s.value > 0)
          .map((seg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-text-secondary truncate max-w-[100px]">{seg.label}</span>
              <span className="text-text-primary font-semibold ml-auto pl-2">{seg.value}</span>
            </div>
          ))}
        {segments.filter((s) => s.value > 0).length === 0 && (
          <span className="text-xs text-text-muted italic">No orders yet</span>
        )}
      </div>
    </div>
  );
};
