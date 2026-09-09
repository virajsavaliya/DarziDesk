import React, { useState, useEffect } from 'react';
import {
  Clock,
  Store,
  Ruler,
  AlertCircle,
  Scissors,
  Check,
  FileText,
} from 'lucide-react';
import type { CustomerPortalOrder, OrderStatus } from '../../types/dashboard';
import { StatusBadge } from '../common/StatusBadge';

interface CustomerOrderDetailViewProps {
  orderId: string;
  authToken: string;
  onBack?: () => void;
}

const ORDER_LIFECYCLE: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'PLACED', label: 'Order Placed', desc: 'Order received & recorded' },
  { status: 'MEASUREMENT_CONFIRMED', label: 'Measurement Confirmed', desc: 'Fittings verified by tailor' },
  { status: 'CUTTING', label: 'Cutting Fabric', desc: 'Master pattern cut from cloth' },
  { status: 'STITCHING', label: 'Stitching', desc: 'Craftsman assembling garment' },
  { status: 'QUALITY_CHECK', label: 'Quality Check', desc: 'Inspection & finishing touches' },
  { status: 'READY', label: 'Ready for Pickup', desc: 'Ready at workshop counter' },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Handed over to customer' },
];

export const CustomerOrderDetailView: React.FC<CustomerOrderDetailViewProps> = ({
  orderId,
  authToken,
  onBack,
}) => {
  const [order, setOrder] = useState<CustomerPortalOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/portal/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load order (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (isMounted) setOrder(json.data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Error fetching order details');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId, authToken]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-surface-muted rounded w-1/4" />
        <div className="h-28 bg-surface border border-border rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-surface border border-border rounded-2xl" />
          <div className="h-44 bg-surface border border-border rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 bg-error-light border border-error/30 rounded-2xl text-error text-center space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto" />
        <p className="font-semibold text-sm">{error || 'Order not found'}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white text-text-primary border border-border rounded-xl text-xs font-semibold shadow-sm"
          >
            ← Back to My Orders
          </button>
        )}
      </div>
    );
  }

  // Determine stage index
  const isCancelled = order.status === 'CANCELLED';
  const currentStageIndex = ORDER_LIFECYCLE.findIndex((stage) => stage.status === order.status);

  return (
    <div className="space-y-6">
      {/* ── Top Header with Back & Status ──────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-surface border border-border rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="text-xs font-semibold text-text-secondary hover:text-brand transition-colors mr-1"
              >
                ← Back
              </button>
            )}
            <h2 className="text-lg font-bold text-brand tracking-tight">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h2>
            <StatusBadge status={order.status} size="sm" />
          </div>
          <p className="text-xs text-text-secondary flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-text-muted" />
            <span className="font-semibold text-text-primary">{order.tenant?.name}</span>
            <span>•</span>
            <span>Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
          </p>
        </div>

        {order.estimatedDeliveryDate && (
          <div className="text-right bg-brand/5 border border-brand/10 px-3.5 py-2 rounded-xl">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-text-muted block">
              Estimated Delivery
            </span>
            <span className="text-sm font-bold text-brand font-mono">
              {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>

      {/* ── Visual Progression Stepper per Section 8.4 ──────────────── */}
      <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand" />
          <span>Tailoring Workflow Status</span>
        </h3>

        {isCancelled ? (
          <div className="p-4 bg-error-light border border-error/20 rounded-xl text-error text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This order was cancelled. Please contact the workshop for details.</span>
          </div>
        ) : (
          <div className="py-4">
            {/* Desktop horizontal timeline */}
            <div className="hidden lg:grid grid-cols-7 gap-2 relative">
              {ORDER_LIFECYCLE.map((stage, idx) => {
                const isCompleted = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx;

                return (
                  <div key={stage.status} className="flex flex-col items-center text-center relative group">
                    {/* Connecting line */}
                    {idx < ORDER_LIFECYCLE.length - 1 && (
                      <div
                        className={`absolute top-4 left-1/2 w-full h-0.5 -z-0 ${
                          currentStageIndex > idx ? 'bg-emerald-500' : 'bg-border'
                        }`}
                      />
                    )}

                    {/* Step Icon Indicator */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-brand text-white ring-4 ring-brand/20 animate-pulse'
                          : 'bg-surface-muted text-text-muted border border-border'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </div>

                    {/* Label */}
                    <div className="mt-2.5">
                      <p
                        className={`text-xs font-bold leading-tight ${
                          isCurrent ? 'text-brand' : isCompleted ? 'text-text-primary' : 'text-text-muted'
                        }`}
                      >
                        {stage.label}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5 hidden xl:block">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile / Tablet vertical timeline */}
            <div className="lg:hidden space-y-4">
              {ORDER_LIFECYCLE.map((stage, idx) => {
                const isCompleted = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx;

                return (
                  <div key={stage.status} className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-brand text-white ring-4 ring-brand/20'
                          : 'bg-surface-muted text-text-muted border border-border'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-brand font-extrabold' : isCompleted ? 'text-text-primary' : 'text-text-muted'
                        }`}
                      >
                        {stage.label}
                      </p>
                      <p className="text-[11px] text-text-muted">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Order Specifications Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fabric & Garment Specs */}
        <div className="p-5 bg-surface border border-border rounded-2xl shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Scissors className="w-4 h-4 text-brand" />
            <span>Garment & Fabric Details</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-text-secondary">Garment Type</span>
              <strong className="text-text-primary font-semibold capitalize">
                {order.garmentType.toLowerCase()}
              </strong>
            </div>
            {order.fabric && (
              <>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-text-secondary">Selected Fabric</span>
                  <strong className="text-text-primary font-semibold">{order.fabric.name}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-text-secondary">Color & Material</span>
                  <strong className="text-text-primary font-semibold">
                    {order.fabric.color} ({order.fabric.type})
                  </strong>
                </div>
              </>
            )}
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-text-secondary">Fabric Length Reserved</span>
              <strong className="text-text-primary font-mono font-semibold">{order.metersUsed} meters</strong>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-text-secondary">Price per Meter Snapshot</span>
              <strong className="text-text-primary font-mono font-semibold">₹{order.priceSnapshot}</strong>
            </div>
          </div>
        </div>

        {/* Measurement Profile Used */}
        <div className="p-5 bg-surface border border-border rounded-2xl shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Ruler className="w-4 h-4 text-brand" />
            <span>Measurement Profile</span>
          </h4>

          {order.measurementProfile ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-text-secondary">Profile Name</span>
                <strong className="text-text-primary font-semibold">
                  {order.measurementProfile.name}
                </strong>
              </div>
              {order.measurementProfile.name === 'In-Store Fitting' ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-200 text-xs">
                  <p className="font-semibold">In-Store Measurement Requested</p>
                  <p className="text-[11px] mt-0.5">
                    Please visit {order.tenant?.name || 'the shop'} for your in-person fitting session.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-surface-muted rounded-xl border border-border space-y-1">
                  <span className="text-[11px] font-bold text-text-secondary uppercase">
                    Fittings Verified
                  </span>
                  <p className="text-[11px] text-text-muted">
                    Your bespoke measurements for this garment are recorded on file at the workshop.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-muted">No measurement profile recorded.</p>
          )}
        </div>
      </div>

      {/* ── Status Audit Trail / Timeline Log ──────────────────────── */}
      {order.statusLogs && order.statusLogs.length > 0 && (
        <div className="p-5 bg-surface border border-border rounded-2xl shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand" />
            <span>Activity & Milestone History</span>
          </h4>

          <div className="divide-y divide-border/60">
            {order.statusLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary">
                      {log.toStatus.replace(/_/g, ' ')}
                    </span>
                    {log.fromStatus && (
                      <span className="text-text-muted text-[11px]">
                        (from {log.fromStatus.replace(/_/g, ' ')})
                      </span>
                    )}
                  </div>
                  {log.note && <p className="text-text-secondary text-[11px]">{log.note}</p>}
                </div>

                <span className="text-text-muted font-mono text-[11px] shrink-0">
                  {new Date(log.changedAt).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
