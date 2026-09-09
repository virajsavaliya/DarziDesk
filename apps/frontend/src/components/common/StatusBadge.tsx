import React from 'react';
import type { OrderStatus } from '../../types/dashboard';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

const STATUS_METADATA: Record<
  OrderStatus,
  { label: string; textClass: string; bgClass: string; dotClass: string }
> = {
  PLACED: {
    label: 'Order Placed',
    textClass: 'text-status-placed',
    bgClass: 'bg-status-placed/10 border-status-placed/20',
    dotClass: 'bg-status-placed',
  },
  MEASUREMENT_CONFIRMED: {
    label: 'Measurement Confirmed',
    textClass: 'text-status-measurement',
    bgClass: 'bg-status-measurement/10 border-status-measurement/20',
    dotClass: 'bg-status-measurement',
  },
  CUTTING: {
    label: 'Cutting',
    textClass: 'text-status-cutting',
    bgClass: 'bg-status-cutting/10 border-status-cutting/20',
    dotClass: 'bg-status-cutting',
  },
  STITCHING: {
    label: 'Stitching',
    textClass: 'text-status-stitching',
    bgClass: 'bg-status-stitching/10 border-status-stitching/20',
    dotClass: 'bg-status-stitching',
  },
  QUALITY_CHECK: {
    label: 'Quality Check',
    textClass: 'text-status-qc',
    bgClass: 'bg-status-qc/10 border-status-qc/20',
    dotClass: 'bg-status-qc',
  },
  READY: {
    label: 'Ready for Pickup',
    textClass: 'text-status-ready',
    bgClass: 'bg-status-ready/10 border-status-ready/20',
    dotClass: 'bg-status-ready',
  },
  DELIVERED: {
    label: 'Delivered',
    textClass: 'text-status-delivered',
    bgClass: 'bg-status-delivered/10 border-status-delivered/20',
    dotClass: 'bg-status-delivered',
  },
  CANCELLED: {
    label: 'Cancelled',
    textClass: 'text-status-cancelled',
    bgClass: 'bg-status-cancelled/10 border-status-cancelled/20',
    dotClass: 'bg-status-cancelled',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const meta = STATUS_METADATA[status] || {
    label: status,
    textClass: 'text-text-secondary',
    bgClass: 'bg-surface-muted border-border',
    dotClass: 'bg-text-muted',
  };

  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full font-semibold transition-colors ${
        meta.bgClass
      } ${meta.textClass} ${isSmall ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotClass}`} />
      <span>{meta.label}</span>
    </span>
  );
};
