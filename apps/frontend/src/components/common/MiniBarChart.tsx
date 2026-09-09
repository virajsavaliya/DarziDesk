import React from 'react';

export interface BarData {
  label?: string;
  date?: string;
  count: number;
}

interface MiniBarChartProps {
  data: BarData[];
  color?: string;
  height?: number;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data,
  color = '#F28C28',
  height = 120,
}) => {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end gap-1.5 h-full pb-6 relative">
        {data.map((d, i) => {
          const pct = max === 0 ? 0 : (d.count / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-1 group h-full"
            >
              {/* Tooltip */}
              <div className="absolute -top-7 hidden group-hover:flex items-center justify-center">
                <span className="bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm whitespace-nowrap">
                  {d.count}
                </span>
              </div>

              {/* Bar */}
              <div className="w-full flex items-end" style={{ height: `calc(100% - 20px)` }}>
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: pct === 0 ? '3px' : `${pct}%`,
                    backgroundColor: color,
                    opacity: 0.7 + (i / Math.max(data.length - 1, 1)) * 0.3,
                    minHeight: '3px',
                  }}
                />
              </div>

              {/* Label */}
              <span className="text-[9px] font-medium text-text-muted truncate w-full text-center leading-none">
                {d.label ? d.label.split(' ')[0] : (d.date ? d.date.slice(5) : '')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
