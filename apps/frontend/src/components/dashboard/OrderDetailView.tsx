import React, { useState, useEffect } from 'react';
import type { Order, OrderStatus, Invoice } from '../../types/dashboard';
import { STATUS_CONFIG, INVOICE_STATUS_CONFIG } from '../../types/dashboard';
import { StatusBadge } from '../common/StatusBadge';
import {
  Phone,
  ArrowRight,
  AlertCircle,
  Receipt,
  FileText,
  CheckCircle2,
  Check,
  UserCheck,
  Sparkles,
  Scissors,
  Clock,
  Shirt,
  ShieldCheck,
  PackageCheck,
  Truck,
  MessageSquare,
  Send,
  Smartphone,
  ExternalLink,
  X,
} from 'lucide-react';
import { InvoiceDetailDrawer } from '../invoices/InvoiceDetailDrawer';
import { VerticalOrderPipeline } from '../common/responsive/VerticalOrderPipeline';

interface OrderDetailViewProps {
  orderId: string;
  authToken: string;
  onOrderUpdated: () => void;
}

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const BESPOKE_STAGES: {
  status: OrderStatus;
  label: string;
  stepNumber: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    status: 'PLACED',
    label: 'Order Placed',
    stepNumber: 1,
    description: 'Fabric selected & garment order booked in workshop',
    icon: Clock,
  },
  {
    status: 'MEASUREMENT_CONFIRMED',
    label: 'Measurements Verified',
    stepNumber: 2,
    description: 'Master tailor confirmed customer body measurements',
    icon: UserCheck,
  },
  {
    status: 'CUTTING',
    label: 'Cutting Fabric',
    stepNumber: 3,
    description: 'Pattern mapped onto fabric and precision cutting in progress',
    icon: Scissors,
  },
  {
    status: 'STITCHING',
    label: 'Stitching Garment',
    stepNumber: 4,
    description: 'Craftsman assembling and sewing garment pieces',
    icon: Shirt,
  },
  {
    status: 'QUALITY_CHECK',
    label: 'Quality Check',
    stepNumber: 5,
    description: 'Final stitching inspection, buttons, and iron finish',
    icon: ShieldCheck,
  },
  {
    status: 'READY',
    label: 'Ready for Pickup',
    stepNumber: 6,
    description: 'Garment packed and ready for customer collection or delivery',
    icon: PackageCheck,
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    stepNumber: 7,
    description: 'Order fulfilled and received by customer',
    icon: Truck,
  },
];

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

  // Staff assignment state
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [assigningStaff, setAssigningStaff] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Customer notification alert state
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyChannel, setNotifyChannel] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP');
  const [notifyTemplate, setNotifyTemplate] = useState('TRIAL_READY');
  const [notifyCustomText, setNotifyCustomText] = useState('');
  const [sendingNotify, setSendingNotify] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSendNotification = async () => {
    if (!order?.customer?.phone) return;
    setSendingNotify(true);
    setNotifyMsg(null);

    const templateMessages: Record<string, string> = {
      TRIAL_READY: `Namaste ${order.customer.firstName}! Your bespoke ${order.garmentType} is ready for trial fitting at our workshop. Please visit at your convenience.`,
      ORDER_READY: `Namaste ${order.customer.firstName}! Your bespoke ${order.garmentType} is completed and ready for counter pickup.`,
      ORDER_CUTTING: `Namaste ${order.customer.firstName}! Your fabric has been precision-cut and is now with our craftsmen for stitching.`,
      PAYMENT_REMINDER: `Namaste ${order.customer.firstName}! Reminder from atelier regarding pending balance invoice for your ${order.garmentType} order.`,
      CUSTOM: notifyCustomText.trim() || `Status update regarding your bespoke ${order.garmentType} order.`,
    };

    const message = notifyTemplate === 'CUSTOM' ? notifyCustomText.trim() : templateMessages[notifyTemplate];

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          customerId: order.customerId,
          orderId: order.id,
          channel: notifyChannel,
          templateName: notifyTemplate,
          recipient: order.customer.phone,
          message,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to dispatch notification');

      setNotifyMsg({ type: 'success', text: `Dispatched via ${notifyChannel} to ${order.customer.phone}!` });
      setTimeout(() => setNotifyModalOpen(false), 1800);
    } catch (err: any) {
      setNotifyMsg({ type: 'error', text: err.message || 'Error dispatching notification' });
    } finally {
      setSendingNotify(false);
    }
  };

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

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setStaffList(json.data || []);
      }
    } catch {
      setStaffList([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail(orderId);
      fetchStaff();
      setActionNote('');
      setActionSuccess(null);
      setAssignMsg(null);
    }
  }, [orderId, authToken]);

  const handleAssignStaff = async (staffId: string) => {
    if (!order) return;
    setAssigningStaff(true);
    setAssignMsg(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ assignedStaffId: staffId || null }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to assign craftsman');
      }

      setAssignMsg({ type: 'success', text: 'Craftsman updated successfully!' });
      await fetchOrderDetail(order.id);
      onOrderUpdated();
    } catch (err: any) {
      setAssignMsg({ type: 'error', text: err.message || 'Error assigning craftsman' });
    } finally {
      setAssigningStaff(false);
    }
  };

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

      setActionSuccess(`Order updated to: ${STATUS_CONFIG[toStatus]?.label || toStatus}`);
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

  const currentStageIndex = BESPOKE_STAGES.findIndex((s) => s.status === order.status);
  const currentStageInfo = currentStageIndex >= 0 ? BESPOKE_STAGES[currentStageIndex] : null;

  // Filter allowed next transitions into forward advancement vs cancel
  const nextAdvancements = (order.allowedNextTransitions || []).filter((s) => s !== 'CANCELLED');
  const canCancel = (order.allowedNextTransitions || []).includes('CANCELLED');

  return (
    <div className="space-y-6">
      {/* ── Visual Tailoring Stage Tracker ────────────────────────── */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Bespoke Tailoring Pipeline
              </h3>
              <p className="text-[11px] text-text-muted">
                Real-time progress synced with Customer Portal
              </p>
            </div>
          </div>
          {currentStageIndex !== -1 && (
            <span className="text-xs font-bold text-brand bg-brand/10 border border-brand/20 px-3 py-1 rounded-full">
              Stage {currentStageIndex + 1} of 7
            </span>
          )}
        </div>

        {/* 7-Stage Horizontal Pipeline Tracker (>= 1024px) */}
        <div className="hidden lg:block py-4 px-2">
          <div className="w-full grid grid-cols-7 items-start relative">
            {BESPOKE_STAGES.map((stage, idx) => {
              const isCompleted = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;
              const StageIcon = stage.icon;
              const isLast = idx === BESPOKE_STAGES.length - 1;

              return (
                <div
                  key={stage.status}
                  className="flex flex-col items-center text-center relative group"
                >
                  {/* Connecting Line Segment (to the next step) */}
                  {!isLast && (
                    <div className="absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2 z-0">
                      {/* Base Track */}
                      <div className="w-full h-full bg-border" />
                      {/* Filled Progress Track */}
                      <div
                        className="absolute inset-0 bg-brand transition-all duration-500 origin-left"
                        style={{
                          transform: isCompleted ? 'scaleX(1)' : 'scaleX(0)',
                        }}
                      />
                    </div>
                  )}

                  {/* Circle Indicator */}
                  <div className="relative z-10 flex items-center justify-center">
                    {/* Pulsing ring for current active stage */}
                    {isCurrent && (
                      <span className="absolute inset-0 rounded-full bg-brand animate-ping opacity-25" />
                    )}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ring-4 ring-surface ${
                        isCompleted
                          ? 'bg-brand text-white shadow-xs'
                          : isCurrent
                          ? 'bg-brand text-white ring-4 ring-brand/20 shadow-md scale-110'
                          : 'bg-surface border-2 border-border text-text-muted'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <StageIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  {/* Stage Label */}
                  <div className="mt-2.5 px-1 text-center min-h-[32px] flex items-start justify-center">
                    <span
                      className={`text-[11px] font-medium leading-tight line-clamp-2 ${
                        isCurrent
                          ? 'font-bold text-brand'
                          : isCompleted
                          ? 'text-text-primary'
                          : 'text-text-muted'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7-Stage Vertical Progression Stepper (< 1024px) */}
        <div className="lg:hidden my-2">
          <VerticalOrderPipeline currentStatus={order.status} />
        </div>

        {/* Current Active Stage Summary Card */}
        {currentStageInfo && order.status !== 'CANCELLED' && (
          <div className="mt-4 p-4 rounded-xl bg-brand/5 border border-brand/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                  Current Active Stage:
                </span>
                <span className="text-xs font-bold text-text-primary">
                  {currentStageInfo.label}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {currentStageInfo.description}
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <span className="text-[11px] text-brand/80 font-medium bg-brand/10 px-2.5 py-1 rounded-lg inline-block">
                Customer notified on portal
              </span>
            </div>
          </div>
        )}

        {/* Alerts */}
        {actionSuccess && (
          <div className="mt-4 p-3 bg-success-light border border-success/30 rounded-xl text-success text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="mt-4 p-3 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Action Controls to Advance to Next Stage */}
        {order.allowedNextTransitions && order.allowedNextTransitions.length > 0 ? (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Stage Transition Remarks (Optional):
              </label>
              <input
                type="text"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="e.g. Sleeves cut according to measurement profile"
                className="w-full h-10 px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                disabled={transitioning}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {nextAdvancements.map((nextStatus) => {
                const stageMeta = BESPOKE_STAGES.find((s) => s.status === nextStatus);
                const labelText = stageMeta?.label || STATUS_CONFIG[nextStatus]?.label || nextStatus;

                return (
                  <button
                    key={nextStatus}
                    onClick={() => handleTransition(nextStatus)}
                    disabled={transitioning}
                    className={`flex-1 h-11 px-5 rounded-xl font-bold text-xs sm:text-sm text-white bg-brand hover:bg-brand-dark transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] min-h-[44px] ${
                      transitioning ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {transitioning ? (
                      <span>Updating Stage...</span>
                    ) : (
                      <>
                        <span>Advance to: {labelText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setNotifyModalOpen(true)}
                className="h-11 px-4 text-xs font-semibold text-success hover:bg-success/10 rounded-xl border border-success/30 transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                title="Send WhatsApp or SMS notification to customer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Notify Customer</span>
              </button>

              {canCancel && (
                <button
                  type="button"
                  onClick={() => handleTransition('CANCELLED')}
                  disabled={transitioning}
                  className="h-11 px-4 text-xs font-semibold text-error hover:bg-error-light rounded-xl border border-error/20 transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-surface-muted rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span className="text-text-muted font-medium">
              {order.status === 'DELIVERED'
                ? 'This order has been completed and delivered to the customer.'
                : order.status === 'CANCELLED'
                ? 'This order has been cancelled.'
                : `Order is currently in ${order.status}.`}
            </span>
            <button
              type="button"
              onClick={() => setNotifyModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-success bg-success/10 hover:bg-success/20 border border-success/30 flex items-center gap-1.5 shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Send WhatsApp / SMS</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Customer & Craftsman Card ────────────────────────── */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
          Customer & Craftsman Assignment
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-text-muted block">Customer Name</span>
            <span className="font-semibold text-text-primary">
              {order.customer?.firstName} {order.customer?.lastName}
            </span>
          </div>
          <div>
            <span className="text-xs text-text-muted block">Phone & Instant Alerts</span>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <a
                href={`tel:${order.customer?.phone}`}
                className="font-semibold text-brand hover:underline inline-flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-brand" />
                <span>{order.customer?.phone}</span>
              </a>
              <button
                type="button"
                onClick={() => setNotifyModalOpen(true)}
                className="px-2 py-0.5 rounded-md bg-success/10 text-success hover:bg-success/20 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Send WhatsApp or SMS alert"
              >
                <MessageSquare className="w-3 h-3" />
                <span>WhatsApp Alert</span>
              </button>
            </div>
          </div>
          {order.customer?.email && (
            <div>
              <span className="text-xs text-text-muted block">Email</span>
              <span className="font-medium text-text-primary">{order.customer.email}</span>
            </div>
          )}

          {/* Interactive Craftsman Assignment */}
          <div className="sm:col-span-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-brand" />
                <span>Assigned Workshop Craftsman</span>
              </span>
              {assigningStaff && (
                <span className="text-[11px] text-brand font-medium animate-pulse">
                  Updating craftsman...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={order.assignedStaffId || ''}
                onChange={(e) => handleAssignStaff(e.target.value)}
                disabled={assigningStaff || loadingStaff}
                className="flex-1 px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-medium"
              >
                <option value="">Unassigned (Click to assign craftsman)</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.role === 'STAFF' ? 'Craftsman' : s.role})
                  </option>
                ))}
              </select>
            </div>

            {assignMsg && (
              <div
                className={`mt-2 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                  assignMsg.type === 'success'
                    ? 'bg-success-light text-success'
                    : 'bg-error-light text-error'
                }`}
              >
                {assignMsg.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>{assignMsg.text}</span>
              </div>
            )}
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

      {/* ── Customer Notification Modal ──────────────────────────── */}
      {notifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Send Customer Alert</h3>
                  <p className="text-xs text-text-muted">{order.customer?.firstName} ({order.customer?.phone})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifyModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {notifyMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  notifyMsg.type === 'success' ? 'bg-success-light text-success' : 'bg-error-light text-error'
                }`}
              >
                {notifyMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{notifyMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Dispatch Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNotifyChannel('WHATSAPP')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    notifyChannel === 'WHATSAPP'
                      ? 'border-success bg-success/10 text-success'
                      : 'border-border bg-surface text-text-muted'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setNotifyChannel('SMS')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    notifyChannel === 'SMS'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-surface text-text-muted'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  SMS
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Milestone Template
              </label>
              <select
                value={notifyTemplate}
                onChange={(e) => setNotifyTemplate(e.target.value)}
                className="w-full h-10 px-3 bg-surface-muted border border-border rounded-xl text-xs text-text-primary font-medium focus:ring-2 focus:ring-accent"
              >
                <option value="TRIAL_READY">Trial Fitting Ready</option>
                <option value="ORDER_READY">Order Completed & Ready</option>
                <option value="ORDER_CUTTING">Fabric Cutting In Progress</option>
                <option value="PAYMENT_REMINDER">Invoice Balance Reminder</option>
                <option value="CUSTOM">Custom Message</option>
              </select>
            </div>

            {notifyTemplate === 'CUSTOM' && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Message Text
                </label>
                <textarea
                  value={notifyCustomText}
                  onChange={(e) => setNotifyCustomText(e.target.value)}
                  rows={3}
                  placeholder="Enter bespoke tailoring update..."
                  className="w-full p-3 bg-surface-muted border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-accent"
                />
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              {/* WhatsApp direct click link if customer has phone */}
              {order.customer?.phone && (
                <a
                  href={`https://wa.me/${(order.customer.phone.replace(/\D/g, '')).startsWith('91') ? order.customer.phone.replace(/\D/g, '') : '91' + order.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Namaste ${order.customer.firstName}! Update regarding your bespoke ${order.garmentType} order with our workshop: ${
                      notifyTemplate === 'TRIAL_READY'
                        ? 'Your trial fitting is ready! Please visit our workshop at your convenience.'
                        : notifyTemplate === 'ORDER_READY'
                        ? 'Your completed order is pressed and packed, ready for counter collection.'
                        : notifyTemplate === 'ORDER_CUTTING'
                        ? 'Our master tailor has precision-cut your cloth and assembled it for workshop stitching.'
                        : notifyCustomText || 'Your order is progressing smoothly.'
                    }`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-success text-white text-xs font-bold hover:bg-success/90 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open in WhatsApp Web / App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNotifyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSendNotification}
                  disabled={sendingNotify}
                  className="flex-1 py-2.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-dark flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingNotify ? 'Dispatching...' : `Log & Send via Server`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
