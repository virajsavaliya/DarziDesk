import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8 px-4' : 'py-16 px-6'
      }`}
    >
      {icon && (
        <div
          className={`mb-4 flex items-center justify-center rounded-2xl bg-surface-muted text-text-muted ${
            compact ? 'w-12 h-12' : 'w-16 h-16'
          }`}
        >
          <span className={compact ? 'w-6 h-6' : 'w-8 h-8'}>{icon}</span>
        </div>
      )}
      <h3
        className={`font-semibold text-text-primary ${compact ? 'text-sm' : 'text-base'}`}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`mt-1.5 text-text-muted max-w-sm leading-relaxed ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
