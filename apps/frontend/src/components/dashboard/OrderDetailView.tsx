import React, { useState, useEffect } from 'react';
import type { Order, OrderStatus, Invoice } from '../../types/dashboard';
import { STATUS_CONFIG, INVOICE_STATUS_CONFIG } from '../../types/dashboard';
import { StatusBadge } from '../common/StatusBadge';
import { Phone, ArrowRight, AlertCircle, Receipt, FileText, CheckCircle2 } from 'lucide-react';
import { InvoiceDetailDrawer } from '../invoices/InvoiceDetailDrawer';

interface OrderDetailViewProps {
  orderId: string;
  authToken: string;
  onOrderUpdated: () => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  orderId,
  authToken,
  onOrderUpdated,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceMsg, setInvoiceMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

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
    }
  }, [orderId, authToken]);

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

  const handleGenerateInvoice = async () => {
    if (!order) return;
    setGeneratingInvoice(true);
    setInvoiceMsg(null);
    try {
      const res = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to generate invoice');
      }
      setInvoiceMsg({ type: 'success', text: `Invoice ${json.data.invoiceNumber} generated!` });
      await fetchOrderDetail(order.id);
      setSelectedInvoice(json.data);
    } catch (err: any) {
      setInvoiceMsg({ type: 'error', text: err.message || 'Invoice generation error' });
    } finally {
      setGeneratingInvoice(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="py-20 text-center text-text-muted animate-pulse">
        Loading order details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm flex items-center gap-2">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!order) return null;

  const latestVersion = order.measurementProfile?.versions?.[0];
  const measurementValues = latestVersion?.values || {};

  return (
    <div className="space-y-6">
      {/* ── Status Action Center (Touch-friendly 44px+) ──────── */}
      <div className="bg-background rounded-xl p-5 border border-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3 flex items-center justify-between">
          <span>Workflow Transition Center</span>
          <span className="text-[11px] font-normal text-text-muted">44px+ Touch Targets</span>
        </h3>

        {actionSuccess && (
          <div className="mb-3 p-3 bg-success-light border border-success/30 rounded-lg text-success text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="mb-3 p-3 bg-error-light border border-error/30 rounded-lg text-error text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
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
                placeholder="e.g. Measurement verified with customer"
                className="w-full h-11 px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={transitioning}
              />
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {order.allowedNextTransitions.map((nextStatus) => {
                const isDestructive = nextStatus === 'CANCELLED';
                return (
                  <button
                    key={nextStatus}
                    onClick={() => handleTransition(nextStatus)}
                    disabled={transitioning}
                    className={`flex-1 min-w-[150px] min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                      isDestructive
                        ? 'bg-error-light text-error border border-error/30 hover:bg-error/20'
                        : 'bg-accent text-white hover:opacity-90 active:scale-[0.98]'
                    } ${transitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {transitioning ? (
                      <span>Updating...</span>
                    ) : (
                      <>
                        <span>Advance to {STATUS_CONFIG[nextStatus]?.label || nextStatus}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-muted italic">
            This order is in a terminal state ({order.status}). No further transitions available.
          </p>
        )}
      </div>

      {/* ── Customer Information Card ────────────────────────── */}
      <div className="bg-surface rounded-xl p-5 border border-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
          Customer Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-text-muted block">Full Name</span>
            <span className="font-semibold text-text-primary">
              {order.customer?.firstName} {order.customer?.lastName}
            </span>
          </div>
          <div>
            <span className="text-xs text-text-muted block">Phone (Click to call)</span>
            <a
              href={`tel:${order.customer?.phone}`}
              className="font-semibold text-brand hover:underline inline-flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-brand" />
              <span>{order.customer?.phone}</span>
            </a>
          </div>
          {order.customer?.email && (
            <div>
              <span className="text-xs text-text-muted block">Email</span>
              <span className="font-medium text-text-primary">{order.customer.email}</span>
            </div>
          )}
          <div>
            <span className="text-xs text-text-muted block">Assigned Craftsman</span>
            <span className="font-medium text-text-primary">
              {order.assignedStaff
                ? `${order.assignedStaff.firstName} ${order.assignedStaff.lastName}`
                : 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Fabric & Order Specs ─────────────────────────────── */}
      <div className="bg-surface rounded-xl p-5 border border-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
          Garment & Fabric Specifications
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-text-muted block">Garment Type</span>
            <span className="font-bold text-text-primary">{order.garmentType}</span>
          </div>
          <div>
            <span className="text-xs text-text-muted block">Fabric</span>
            <span className="font-semibold text-text-primary">
              {order.fabric?.name || 'N/A'}
            </span>
            <span className="text-xs text-text-muted block">
              {order.fabric?.color} • {order.fabric?.type}
            </span>
          </div>
          <div>
            <span className="text-xs text-text-muted block">Fabric Usage</span>
            <span className="font-mono font-bold text-text-primary">{order.metersUsed}m</span>
          </div>
          <div>
            <span className="text-xs text-text-muted block">Estimated Delivery</span>
            <span className="font-bold text-accent">
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

      {/* ── Invoicing & Billing Card ────────────────────────── */}
      <div className="bg-surface rounded-xl p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Billing & Invoices
            </h3>
          </div>
          <button
            type="button"
            onClick={handleGenerateInvoice}
            disabled={generatingInvoice}
            className="px-3 py-1.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{generatingInvoice ? 'Calculating...' : 'Generate Invoice'}</span>
          </button>
        </div>

        {invoiceMsg && (
          <div
            className={`mb-3 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
              invoiceMsg.type === 'success'
                ? 'bg-success/10 border border-success/30 text-success'
                : 'bg-error/10 border border-error/30 text-error'
            }`}
          >
            {invoiceMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{invoiceMsg.text}</span>
          </div>
        )}

        {order.invoices && order.invoices.length > 0 ? (
          <div className="space-y-2">
            {order.invoices.map((inv) => {
              const statusCfg = INVOICE_STATUS_CONFIG[inv.status];
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="p-3.5 bg-background hover:bg-surface-hover border border-border rounded-xl flex items-center justify-between cursor-pointer transition-all hover:border-brand/40 group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-text-primary">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusCfg.bgClass} ${statusCfg.textClass} border border-border`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(inv.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-text-primary font-mono">
                        ₹{Number(inv.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs font-medium font-mono text-warning">
                        Bal: ₹{Number(inv.balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-text-muted italic">
            No invoices generated yet for this order. Click "Generate Invoice" above to compute fabric,
            stitching, and tax charges.
          </p>
        )}
      </div>

      {/* ── Tailor Measurement Sheet ─────────────────────────── */}
      <div className="bg-surface rounded-xl p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Measurement Sheet ({order.measurementProfile?.name || 'Profile'})
          </h3>
          {latestVersion && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-muted text-text-secondary font-mono border border-border">
              v{latestVersion.versionNumber} ({latestVersion.unit || 'in'})
            </span>
          )}
        </div>

        {latestVersion?.fitPreference && (
          <div className="mb-3 text-xs bg-surface-muted p-2.5 rounded-lg border border-border/60 text-text-secondary">
            <span className="font-bold text-text-primary">Fit Preference: </span>
            {latestVersion.fitPreference}
            {latestVersion.fitNotes && <span> — {latestVersion.fitNotes}</span>}
          </div>
        )}

        {Object.keys(measurementValues).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Object.entries(measurementValues).map(([key, val]) => (
              <div
                key={key}
                className="bg-background p-3 rounded-xl border border-border/80 flex flex-col justify-between"
              >
                <span className="text-[10px] font-bold uppercase text-text-muted tracking-wider">
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

      {/* ── Status Audit Timeline ────────────────────────────── */}
      <div className="bg-surface rounded-xl p-5 border border-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
          Lifecycle History
        </h3>
        {order.statusLogs && order.statusLogs.length > 0 ? (
          <div className="space-y-4">
            {order.statusLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <StatusBadge status={log.toStatus} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-text-primary truncate">
                      {log.fromStatus ? `${log.fromStatus} → ` : 'Created at '}
                      {log.toStatus}
                    </span>
                    <span className="text-text-muted font-mono text-[11px] shrink-0">
                      {new Date(log.changedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-text-secondary mt-0.5">
                    By {log.changedBy ? `${log.changedBy.firstName} ${log.changedBy.lastName}` : 'System'}
                    {log.note && <span className="italic text-text-muted"> — "{log.note}"</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">No transition history logged yet.</p>
        )}
      </div>

      {/* Invoice Detail Drawer */}
      <InvoiceDetailDrawer
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        authToken={authToken}
        onInvoiceUpdated={() => {
          if (order) fetchOrderDetail(order.id);
          onOrderUpdated();
        }}
      />
    </div>
  );
};
