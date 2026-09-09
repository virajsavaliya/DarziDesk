import React from 'react';

export type PriorityLevel = 'Urgent' | 'High' | 'Normal';

interface PriorityBadgeProps {
  priority: PriorityLevel;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  let badgeStyle = 'bg-surface-muted text-text-muted border-border';

  if (priority === 'Urgent') {
    badgeStyle = 'bg-error/10 text-error border-error/20';
  } else if (priority === 'High') {
    badgeStyle = 'bg-warning/10 text-warning border-warning/20';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded text-[11px] font-semibold uppercase tracking-wider ${badgeStyle}`}
    >
      <span>{priority}</span>
    </span>
  );
};
