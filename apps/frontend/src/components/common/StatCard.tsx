import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'brand' | 'accent' | 'success' | 'warning' | 'info' | 'neutral';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  variant = 'brand',
  trend,
  loading = false,
}) => {
  const iconVariants = {
    brand: 'bg-brand/10 text-brand',
    accent: 'bg-accent/15 text-accent',
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
    info: 'bg-info-light text-info',
    neutral: 'bg-surface-muted text-text-muted',
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm transition-all hover:border-border-strong flex items-center justify-between min-h-[104px]">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          {loading ? (
            <div className="h-9 w-16 bg-surface-muted animate-pulse rounded-lg" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-text-primary font-mono tracking-tight">
              {value}
            </p>
          )}
          {!loading && trend && (
            <span
              className={`text-xs font-semibold ${
                trend.isPositive ? 'text-success' : 'text-error'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        {subtext && (
          <p className="text-xs text-text-secondary line-clamp-1">{subtext}</p>
        )}
      </div>

      {icon && (
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            iconVariants[variant]
          }`}
        >
          {icon}
        </div>
      )}
    </div>
  );
};
