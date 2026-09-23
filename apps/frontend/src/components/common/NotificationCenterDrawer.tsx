import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  X,
  MessageSquare,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  RefreshCw,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';
import type { DemoUser } from '../../types/dashboard';

export interface NotificationLogItem {
  id: string;
  tenantId?: string;
  customerId?: string | null;
  orderId?: string | null;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'IN_APP';
  templateName: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  payload: any;
  errorMessage?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  } | null;
  order?: {
    id: string;
    garmentType: string;
    status: string;
  } | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DemoUser | null;
  onNavigateOrder?: (orderId: string) => void;
}

export const NotificationCenterDrawer: React.FC<NotificationCenterDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigateOrder,
}) => {
  const [notifications, setNotifications] = useState<NotificationLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'WHATSAPP' | 'SMS' | 'COMPOSE'>('ALL');

  // Quick compose state
  const [composeCustomerPhone, setComposeCustomerPhone] = useState('');
  const [composeChannel, setComposeChannel] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP');
  const [composeTemplate, setComposeTemplate] = useState('TRIAL_READY');
  const [composeCustomMsg, setComposeCustomMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);

  const isCustomer = currentUser?.role === 'CUSTOMER';
  const token = currentUser?.token || '';

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const endpoint = isCustomer ? '/api/portal/notifications' : '/api/notifications?limit=40';
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || `Failed to load notifications (HTTP ${res.status})`);
      }
      const json = await res.json();
      setNotifications(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [token, isCustomer]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeCustomerPhone.trim()) {
      setSendErrorMsg('Please enter a recipient phone number.');
      return;
    }

    setSending(true);
    setSendSuccessMsg(null);
    setSendErrorMsg(null);

    const templateMessages: Record<string, string> = {
      TRIAL_READY: 'Namaste! Your bespoke garment is ready for trial fitting at our workshop. Please visit at your convenience.',
      ORDER_READY: 'Namaste! Your order is completed and pressed, ready for counter pickup or delivery.',
      ORDER_CUTTING: 'Your fabric pattern has been cut by our master tailor and moved to workshop stitching.',
      PAYMENT_REMINDER: 'Reminder from atelier regarding pending order balance invoice. Thank you for your custom.',
      CUSTOM: composeCustomMsg.trim() || 'Status update regarding your bespoke tailoring order.',
    };

    const finalMessage = composeTemplate === 'CUSTOM' ? composeCustomMsg.trim() : templateMessages[composeTemplate];

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel: composeChannel,
          templateName: composeTemplate,
          recipient: composeCustomerPhone.trim(),
          message: finalMessage,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to dispatch notification');
      }

      setSendSuccessMsg(`Notification successfully queued via ${composeChannel} to ${composeCustomerPhone}`);
      setComposeCustomMsg('');
      await fetchNotifications();
      setTimeout(() => setActiveTab('ALL'), 1500);
    } catch (err: any) {
      setSendErrorMsg(err.message || 'Error dispatching notification');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'WHATSAPP') return n.channel === 'WHATSAPP';
    if (activeTab === 'SMS') return n.channel === 'SMS';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="notif-drawer-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-250">
          {/* ── Header ────────────────────────────────────────────── */}
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-muted/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 id="notif-drawer-title" className="text-base font-bold text-text-primary leading-tight">
                  Notification Center
                </h2>
                <p className="text-xs text-text-muted">
                  {isCustomer ? 'Real-time updates on your garments' : 'SMS, WhatsApp & Atelier Dispatches'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchNotifications}
                disabled={loading}
                className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                title="Refresh logs"
                aria-label="Refresh logs"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label="Close notification center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Tabs ──────────────────────────────────────────────── */}
          {!isCustomer && (
            <div className="flex items-center px-4 border-b border-border bg-surface shrink-0 gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
                  activeTab === 'ALL'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                All Logs ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('WHATSAPP')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'WHATSAPP'
                    ? 'border-success text-success'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp ({notifications.filter((n) => n.channel === 'WHATSAPP').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SMS')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'SMS'
                    ? 'border-brand text-brand'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                SMS ({notifications.filter((n) => n.channel === 'SMS').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COMPOSE')}
                className={`ml-auto my-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'COMPOSE'
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-surface-muted text-text-primary hover:bg-border'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                Send Alert
              </button>
            </div>
          )}

          {/* ── Content Body ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
            {activeTab === 'COMPOSE' ? (
              /* Compose New Customer Alert Form */
              <form onSubmit={handleSendNotification} className="space-y-4 bg-surface-muted/40 p-4 rounded-2xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">Dispatch Customer Notification</h3>
                </div>

                {sendSuccessMsg && (
                  <div className="p-3 bg-success-light border border-success/30 rounded-xl text-success text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{sendSuccessMsg}</span>
                  </div>
                )}

                {sendErrorMsg && (
                  <div className="p-3 bg-error-light border border-error/30 rounded-xl text-error text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{sendErrorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setComposeChannel('WHATSAPP')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        composeChannel === 'WHATSAPP'
                          ? 'border-success bg-success/10 text-success'
                          : 'border-border bg-surface text-text-muted hover:border-text-secondary'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposeChannel('SMS')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        composeChannel === 'SMS'
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border bg-surface text-text-muted hover:border-text-secondary'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      SMS
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Recipient Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={composeCustomerPhone}
                    onChange={(e) => setComposeCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210 or 9876543210"
                    required
                    className="w-full h-11 px-3 bg-surface border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Message Template
                  </label>
                  <select
                    value={composeTemplate}
                    onChange={(e) => setComposeTemplate(e.target.value)}
                    className="w-full h-11 px-3 bg-surface border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="TRIAL_READY">Trial Fitting Ready</option>
                    <option value="ORDER_READY">Order Ready for Pickup</option>
                    <option value="ORDER_CUTTING">Cutting Stage In Progress</option>
                    <option value="PAYMENT_REMINDER">Invoice Balance Reminder</option>
                    <option value="CUSTOM">Custom Tailoring Message</option>
                  </select>
                </div>

                {composeTemplate === 'CUSTOM' && (
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Custom Message Text
                    </label>
                    <textarea
                      value={composeCustomMsg}
                      onChange={(e) => setComposeCustomMsg(e.target.value)}
                      rows={3}
                      placeholder="Type bespoke message for the customer..."
                      className="w-full p-3 bg-surface border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL')}
                    className="px-4 py-2.5 rounded-xl border border-border text-xs font-medium text-text-secondary hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Dispatch {composeChannel}
                  </button>
                </div>
              </form>
            ) : (
              /* Notifications List */
              <>
                {loading && notifications.length === 0 ? (
                  <div className="py-12 text-center text-text-muted space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent" />
                    <p className="text-xs">Loading notification logs...</p>
                  </div>
                ) : error ? (
                  <div className="p-5 bg-error-light border border-error/30 rounded-xl text-error text-center text-xs space-y-2.5">
                    <AlertCircle className="w-5 h-5 mx-auto text-error" />
                    <p className="font-semibold">{error}</p>
                    <button
                      type="button"
                      onClick={fetchNotifications}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-error/30 text-text-primary rounded-lg hover:bg-surface-muted transition-colors font-medium text-xs shadow-2xs cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Try Again
                    </button>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-surface-muted text-text-muted flex items-center justify-center mx-auto">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-medium text-text-secondary">No notifications logged yet.</p>
                    <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                      Automated alerts will appear here when orders advance through cutting, trial fittings, and counter pickups.
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((item) => {
                    const isWhatsApp = item.channel === 'WHATSAPP';
                    const isSMS = item.channel === 'SMS';
                    const isEmail = item.channel === 'EMAIL';
                    const isSent = item.status === 'SENT';
                    const isFailed = item.status === 'FAILED';

                    const rawPhone = item.customer?.phone || (typeof item.payload === 'object' && item.payload?.phone) || '';
                    const cleanPhone = rawPhone.replace(/\D/g, '');

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-surface border border-border hover:border-accent/30 transition-all space-y-2 shadow-2xs"
                      >
                        {/* Top bar: Channel badge + Status + Timestamp */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 ${
                                isWhatsApp
                                  ? 'bg-success/10 text-success'
                                  : isSMS
                                  ? 'bg-brand/10 text-brand'
                                  : isEmail
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                  : 'bg-accent/10 text-accent'
                              }`}
                            >
                              {isWhatsApp && <MessageSquare className="w-3 h-3" />}
                              {isSMS && <Smartphone className="w-3 h-3" />}
                              {isEmail && <Mail className="w-3 h-3" />}
                              {item.channel}
                            </span>
                            {item.tenant?.name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand font-medium border border-brand/20">
                                {item.tenant.name}
                              </span>
                            )}
                            <span className="text-xs font-bold text-text-primary">
                              {item.templateName.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isSent
                                  ? 'bg-success-light text-success'
                                  : isFailed
                                  ? 'bg-error-light text-error'
                                  : 'bg-warning-light text-warning'
                              }`}
                            >
                              {isSent ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : isFailed ? (
                                <AlertCircle className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {item.status}
                            </span>
                          </div>
                        </div>

                        {/* Customer & Order relation summary */}
                        {(item.customer || item.order) && (
                          <div className="text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                            {item.customer && (
                              <span className="font-semibold text-text-primary">
                                {item.customer.firstName} {item.customer.lastName} ({item.customer.phone})
                              </span>
                            )}
                            {item.order && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.orderId && onNavigateOrder) {
                                    onNavigateOrder(item.orderId);
                                    onClose();
                                  }
                                }}
                                className="text-accent hover:underline text-xs flex items-center gap-0.5"
                              >
                                {item.order.garmentType} Order →
                              </button>
                            )}
                          </div>
                        )}

                        {/* Payload details / preview */}
                        {item.payload && (
                          <div className="text-[11px] text-text-muted bg-surface-muted/50 p-2 rounded-lg font-mono truncate">
                            {typeof item.payload === 'object'
                              ? JSON.stringify(item.payload).slice(0, 100)
                              : String(item.payload)}
                          </div>
                        )}

                        {/* Failure note if any */}
                        {item.errorMessage && (
                          <div className="text-[11px] text-error flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{item.errorMessage}</span>
                          </div>
                        )}

                        {/* Bottom Actions: e.g. Open in WhatsApp Web */}
                        <div className="flex items-center justify-between pt-1 text-[11px] text-text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>

                          {cleanPhone && !isCustomer && (
                            <a
                              href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(
                                `Namaste! Regarding your tailoring order at DarziDesk atelier: ${item.templateName.replace(/_/g, ' ')}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-success hover:underline flex items-center gap-1 font-semibold"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Open in WhatsApp
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="p-3.5 border-t border-border bg-surface-muted/50 flex items-center justify-between text-xs text-text-muted shrink-0">
            <span>Automated webhooks active</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold text-text-primary hover:bg-border transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
