import type { Order } from '../../types/dashboard';
import { STATUS_CONFIG } from '../../types/dashboard';

interface TaskCardProps {
  order: Order;
  onClick: () => void;
}

export function TaskCard({ order, onClick }: TaskCardProps) {
  const statusCfg = STATUS_CONFIG[order.status] || {
    label: order.status,
    bgClass: 'bg-surface-muted',
    textClass: 'text-text-primary',
    dotClass: 'bg-text-muted',
  };

  // Delivery status calculation
  let deliveryLabel = 'No deadline';
  let isOverdue = false;
  let isDueSoon = false;

  if (order.estimatedDeliveryDate) {
    const deliveryDate = new Date(order.estimatedDeliveryDate);
    const now = new Date();
    const diffHours = (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0 && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
      isOverdue = true;
      deliveryLabel = `Overdue (${Math.abs(Math.round(diffHours / 24))}d ago)`;
    } else if (diffHours <= 48 && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
      isDueSoon = true;
      deliveryLabel = `Due in ${Math.max(1, Math.round(diffHours))}h`;
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
      className="bg-surface border border-border hover:border-border-strong rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
    >
      <div>
        {/* ── Card Header: Garment Type & Status Badge ───────── */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-muted text-text-primary border border-border">
            <span className="text-accent font-bold">●</span>
            {order.garmentType}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.bgClass} ${statusCfg.textClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
            {statusCfg.label}
          </span>
        </div>

        {/* ── Customer Name & Contact ────────────────────────── */}
        <h3 className="text-base font-bold text-text-primary group-hover:text-brand transition-colors">
          {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Walk-in Customer'}
        </h3>
        {order.customer?.phone && (
          <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
            <span>📞</span> {order.customer.phone}
          </p>
        )}

        {/* ── Fabric & Meter Details ──────────────────────────── */}
        <div className="mt-3 pt-3 border-t border-border/60 text-xs text-text-secondary space-y-1">
          <div className="flex justify-between">
            <span className="text-text-muted">Fabric:</span>
            <span className="font-medium text-text-primary">
              {order.fabric ? `${order.fabric.name} (${order.fabric.color})` : 'Fabric Assigned'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Meters Used:</span>
            <span className="font-medium text-text-primary">{order.metersUsed}m</span>
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
        <div className="flex items-center gap-1 text-xs">
          <span className="text-text-muted">Delivery:</span>
          <span
            className={`font-semibold ${
              isOverdue
                ? 'text-error font-bold'
                : isDueSoon
                ? 'text-warning font-bold'
                : 'text-text-primary'
            }`}
          >
            {deliveryLabel}
          </span>
        </div>

        <span className="text-xs font-semibold text-brand group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
          Details & Transition →
        </span>
      </div>
    </div>
  );
}
