import React, { useState, useEffect } from 'react';
import type { Order, OrderStatus } from '../../types/dashboard';
import { STATUS_CONFIG } from '../../types/dashboard';

interface OrderDetailDrawerProps {
  orderId: string | null;
  authToken: string;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  orderId,
  authToken,
  onClose,
  onOrderUpdated,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOrderDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/staff/me/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access denied: this order is not assigned to you.');
        }
        if (res.status === 404) {
          throw new Error('Order not found.');
        }
        throw new Error(`Failed to load order details (${res.status})`);
      }

      const json = await res.json();
      setOrder(json.data);
    } catch (err: any) {
      setError(err.message || 'Error fetching order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail(orderId);
      setActionNote('');
      setActionSuccess(null);
    } else {
      setOrder(null);
    }
  }, [orderId, authToken]);

  if (!orderId) return null;

  const handleTransition = async (toStatus: OrderStatus) => {
    if (!order) return;
    setTransitioning(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          toStatus,
          note: actionNote.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            json.error?.message ||
              'Status transition conflict. This order may have been modified by another user.',
          );
        }
        if (res.status === 403) {
          throw new Error(
            json.error?.message || 'You are not authorized to transition this order.',
          );
        }
        throw new Error(json.error?.message || 'Transition failed');
      }

      setActionSuccess(`Status updated to ${STATUS_CONFIG[toStatus]?.label || toStatus}`);
      setActionNote('');
      await fetchOrderDetail(order.id);
      onOrderUpdated();
    } catch (err: any) {
      setActionError(err.message || 'An error occurred during status transition');
    } finally {
      setTransitioning(false);
    }
  };

  const statusConfig = order ? STATUS_CONFIG[order.status] : null;
  const latestVersion = order?.measurementProfile?.versions?.[0];
  const measurementValues = latestVersion?.values || {};

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-surface border-l border-border shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-text-muted">
                  ORDER #{orderId.slice(0, 8)}
                </span>
                {statusConfig && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bgClass} ${statusConfig.textClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                    {statusConfig.label}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-text-primary mt-1">
                {order ? `${order.garmentType} for ${order.customer?.firstName} ${order.customer?.lastName}` : 'Order Details'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Close drawer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {loading && !order && (
              <div className="py-20 text-center text-text-muted animate-pulse">
                Loading order details...
              </div>
            )}

            {error && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
                {error}
              </div>
            )}

            {order && (
              <>
                {/* Status Action Center */}
                <div className="bg-background rounded-xl p-5 border border-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3 flex items-center justify-between">
                    <span>Order Lifecycle Action</span>
                    <span className="text-[11px] font-normal text-text-muted">Tablet Touch Optimized</span>
                  </h3>

                  {actionSuccess && (
                    <div className="mb-3 p-3 bg-success/15 border border-success/30 rounded-lg text-success text-xs font-medium flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {actionSuccess}
                    </div>
                  )}

                  {actionError && (
                    <div className="mb-3 p-3 bg-error/15 border border-error/30 rounded-lg text-error text-xs font-medium">
                      {actionError}
                    </div>
                  )}

                  {order.allowedNextTransitions && order.allowedNextTransitions.length > 0 ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Transition Note (optional):
                        </label>
                        <input
                          type="text"
                          value={actionNote}
                          onChange={(e) => setActionNote(e.target.value)}
                          placeholder="e.g. Measurement confirmed with customer over call"
                          className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                          disabled={transitioning}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {order.allowedNextTransitions.map((nextStatus) => {
                          const isDestructive = nextStatus === 'CANCELLED';
                          return (
                            <button
                              key={nextStatus}
                              onClick={() => handleTransition(nextStatus)}
                              disabled={transitioning}
                              className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                                isDestructive
                                  ? 'bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20'
                                  : 'bg-accent text-white hover:opacity-90 active:scale-[0.98]'
                              } ${transitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {transitioning ? (
                                <span>Updating...</span>
                              ) : (
                                <>
                                  <span>Advance to {STATUS_CONFIG[nextStatus]?.label || nextStatus}</span>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">
                      This order is in a final state ({order.status}). No further transitions available.
                    </p>
                  )}
                </div>

                {/* Customer Information Card */}
                <div className="bg-surface rounded-xl p-5 border border-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-text-muted block">Full Name</span>
                      <span className="font-medium text-text-primary">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Phone (Click to call)</span>
                      <a
                        href={`tel:${order.customer?.phone}`}
                        className="font-medium text-brand hover:underline inline-flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {order.customer?.phone}
                      </a>
                    </div>
                    {order.customer?.email && (
                      <div>
                        <span className="text-xs text-text-muted block">Email</span>
                        <span className="font-medium text-text-primary">{order.customer.email}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-text-muted block">Assigned Tailor</span>
                      <span className="font-medium text-text-primary">
                        {order.assignedStaff ? `${order.assignedStaff.firstName} ${order.assignedStaff.lastName}` : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fabric & Specs Card */}
                <div className="bg-surface rounded-xl p-5 border border-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
                    Garment & Fabric Details
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-text-muted block">Garment Type</span>
                      <span className="font-semibold text-text-primary">{order.garmentType}</span>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Fabric</span>
                      <span className="font-medium text-text-primary">{order.fabric?.name || 'N/A'}</span>
                      <span className="text-xs text-text-muted block">{order.fabric?.color} • {order.fabric?.type}</span>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Fabric Usage</span>
                      <span className="font-semibold text-text-primary">{order.metersUsed} meters</span>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Delivery Due</span>
                      <span className="font-semibold text-accent">
                        {order.estimatedDeliveryDate
                          ? new Date(order.estimatedDeliveryDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'No date set'}
                      </span>
                    </div>
                  </div>
                  {order.notes && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-xs text-text-muted block">Order Notes</span>
                      <p className="text-sm text-text-secondary mt-1">{order.notes}</p>
                    </div>
                  )}
                </div>

                {/* Tailor Measurement Sheet */}
                <div className="bg-surface rounded-xl p-5 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Measurement Sheet ({order.measurementProfile?.name || 'Profile'})
                    </h3>
                    {latestVersion && (
                      <span className="text-xs px-2 py-0.5 rounded bg-background text-text-muted font-mono">
                        v{latestVersion.versionNumber} ({latestVersion.unit || 'inches'})
                      </span>
                    )}
                  </div>

                  {latestVersion?.fitPreference && (
                    <div className="mb-3 text-xs bg-background p-2 rounded-lg text-text-secondary">
                      <span className="font-semibold text-text-primary">Fit Preference: </span>
                      {latestVersion.fitPreference}
                      {latestVersion.fitNotes && <span> — {latestVersion.fitNotes}</span>}
                    </div>
                  )}

                  {Object.keys(measurementValues).length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(measurementValues).map(([key, val]) => (
                        <div
                          key={key}
                          className="bg-background/80 p-3 rounded-lg border border-border/50 flex flex-col justify-between"
                        >
                          <span className="text-[11px] font-semibold uppercase text-text-muted tracking-wider">
                            {key}
                          </span>
                          <span className="text-lg font-bold text-text-primary font-mono mt-1">
                            {String(val)}{' '}
                            <span className="text-xs font-normal text-text-muted">
                              {latestVersion?.unit || 'in'}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No measurement points recorded.</p>
                  )}
                </div>

                {/* Audit Timeline */}
                <div className="bg-surface rounded-xl p-5 border border-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
                    Activity & Transition History
                  </h3>
                  {order.statusLogs && order.statusLogs.length > 0 ? (
                    <div className="space-y-4">
                      {order.statusLogs.map((log) => {
                        const toConf = STATUS_CONFIG[log.toStatus];
                        return (
                          <div key={log.id} className="flex items-start gap-3 text-xs">
                            <span className={`w-2 h-2 rounded-full mt-1.5 ${toConf?.dotClass || 'bg-text-muted'}`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-text-primary">
                                  {log.fromStatus ? `${log.fromStatus} → ` : 'Started at '}
                                  <span className={toConf?.textClass}>{log.toStatus}</span>
                                </span>
                                <span className="text-text-muted font-mono text-[11px]">
                                  {new Date(log.changedAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-text-secondary mt-0.5">
                                By {log.changedBy ? `${log.changedBy.firstName} ${log.changedBy.lastName}` : 'System'}
                                {log.note && <span className="italic text-text-muted"> — "{log.note}"</span>}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">No transition history recorded yet.</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="px-6 py-4 border-t border-border bg-background flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-border text-text-primary text-sm font-semibold hover:bg-surface transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
