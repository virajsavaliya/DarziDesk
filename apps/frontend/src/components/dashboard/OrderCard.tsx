import React from 'react';
import type { Order } from '../../types/dashboard';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge, type PriorityLevel } from '../common/PriorityBadge';
import { Phone, ArrowRight } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onClick: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onClick }) => {
  // Delivery deadline calculation & priority determination
  let deliveryLabel = 'No date set';
  let priority: PriorityLevel = 'Normal';

  if (order.estimatedDeliveryDate) {
    const deliveryDate = new Date(order.estimatedDeliveryDate);
    const now = new Date();
    const diffHours = (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0 && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
      priority = 'Urgent';
      deliveryLabel = `Overdue (${Math.abs(Math.round(diffHours / 24))}d ago)`;
    } else if (diffHours <= 24 && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
      priority = 'Urgent';
      deliveryLabel = 'Due Today';
    } else if (diffHours <= 48 && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
      priority = 'High';
      deliveryLabel = `Due in ${Math.round(diffHours)}h`;
    } else {
      deliveryLabel = deliveryDate.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="bg-surface border border-border hover:border-border-strong rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between group active:scale-[0.99] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <div>
        {/* ── Header: Garment Type & Priority + StatusBadge ── */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-surface-muted text-text-primary border border-border">
              {order.garmentType}
            </span>
            {priority !== 'Normal' && <PriorityBadge priority={priority} />}
          </div>

          <StatusBadge status={order.status} size="sm" />
        </div>

        {/* ── Customer Info ─────────────────────────────────── */}
        <h3 className="text-base font-bold text-text-primary group-hover:text-brand transition-colors">
          {order.customer
            ? `${order.customer.firstName} ${order.customer.lastName}`
            : 'Walk-in Customer'}
        </h3>
        {order.customer?.phone && (
          <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-text-muted" />
            <span>{order.customer.phone}</span>
          </p>
        )}

        {/* ── Fabric & Crafting Specs ───────────────────────── */}
        <div className="mt-3 pt-3 border-t border-border/60 text-xs text-text-secondary space-y-1.5">
          <div className="flex justify-between">
            <span className="text-text-muted">Fabric:</span>
            <span className="font-medium text-text-primary truncate max-w-[160px]">
              {order.fabric ? `${order.fabric.name} (${order.fabric.color})` : 'Assigned Fabric'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Meters Used:</span>
            <span className="font-mono font-medium text-text-primary">{order.metersUsed}m</span>
          </div>
          {order.assignedStaff && (
            <div className="flex justify-between">
              <span className="text-text-muted">Tailor:</span>
              <span className="font-medium text-brand">
                {order.assignedStaff.firstName} {order.assignedStaff.lastName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Card Footer: Delivery Date & CTA ─────────────────── */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-text-muted">Delivery:</span>
          <span
            className={`font-semibold ${
              priority === 'Urgent'
                ? 'text-error font-bold'
                : priority === 'High'
                ? 'text-warning font-bold'
                : 'text-text-primary'
            }`}
          >
            {deliveryLabel}
          </span>
        </div>

        <span className="text-xs font-semibold text-brand group-hover:translate-x-0.5 transition-transform flex items-center gap-1 min-h-[32px]">
          <span>Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
