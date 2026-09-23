import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SectionCard } from '../common/SectionCard';
import {
  CheckCircle2,
  AlertCircle,
  Save,
  MessageSquare,
  Mail,
  Smartphone,
  Tag,
  Compass,
  Users,
  Building,
  Phone,
  MapPin,
  Image,
  QrCode,
  RefreshCw,
  Send,
  ExternalLink,
  WifiOff,
  LogOut,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OwnerSettingsViewProps {
  authToken: string;
}

interface WhatsAppStatus {
  available: boolean;
  sessionId: string | null;
  name: string;
  status: 'offline' | 'created' | 'initializing' | 'qr_ready' | 'authenticating' | 'ready' | 'disconnected' | 'failed';
  phone: string | null;
  pushName: string | null;
  qrCode: string | null;
  dashboardUrl: string;
  errorMessage?: string | null;
}

interface ShopProfile {
  id?: string;
  name: string;
  slug?: string;
  address: string;
  phone: string;
  city: string;
  coverPhotoUrl: string;
}

interface NotificationConfig {
  smsEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
}

export const OwnerSettingsView: React.FC<OwnerSettingsViewProps> = ({ authToken }) => {
  const navigate = useNavigate();

  // ── 1. Shop Profile State ─────────────────────────────────────────────────
  const [profile, setProfile] = useState<ShopProfile>({
    name: '',
    address: '',
    phone: '',
    city: '',
    coverPhotoUrl: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── 2. Notification Preferences State ─────────────────────────────────────
  const [notifications, setNotifications] = useState<NotificationConfig>({
    smsEnabled: true,
    emailEnabled: true,
    whatsappEnabled: true,
  });
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Load Shop Profile ─────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch('/api/shop/profile', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.data) {
        setProfile({
          name: json.data.name || '',
          address: json.data.address || '',
          phone: json.data.phone || '',
          city: json.data.city || '',
          coverPhotoUrl: json.data.coverPhotoUrl || '',
          id: json.data.id,
          slug: json.data.slug,
        });
      }
    } catch {
      // Fallback if needed
    } finally {
      setLoadingProfile(false);
    }
  }, [authToken]);

  // ── Load Notification Config ──────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch('/api/notifications/config', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.data) {
        setNotifications({
          smsEnabled: Boolean(json.data.smsEnabled),
          emailEnabled: Boolean(json.data.emailEnabled),
          whatsappEnabled: Boolean(json.data.whatsappEnabled),
        });
      }
    } catch {
      // Keep defaults
    } finally {
      setLoadingNotifications(false);
    }
  }, [authToken]);

  // ── 3. WhatsApp Integration State (OpenWA Gateway) ────────────────────────
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [loadingWa, setLoadingWa] = useState(false);
  const [connectingWa, setConnectingWa] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const pollTimerRef = useRef<any>(null);

  const fetchWaStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingWa(true);
    try {
      const res = await fetch('/api/notifications/whatsapp/status', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (json.data) {
        setWaStatus(json.data);
      }
    } catch {
      setWaStatus({
        available: false,
        sessionId: null,
        name: 'darzi-desk',
        status: 'offline',
        phone: null,
        pushName: null,
        qrCode: null,
        dashboardUrl: 'http://localhost:2785',
        errorMessage: 'OpenWA WhatsApp gateway not responding',
      });
    } finally {
      if (!isSilent) setLoadingWa(false);
    }
  }, [authToken]);

  const handleConnectWa = async () => {
    setConnectingWa(true);
    setTestFeedback(null);
    try {
      const res = await fetch('/api/notifications/whatsapp/connect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (json.data) setWaStatus(json.data);
    } catch (err: any) {
      setTestFeedback({ type: 'error', text: err.message || 'Failed to start session' });
    } finally {
      setConnectingWa(false);
    }
  };

  const handleDisconnectWa = async () => {
    setConnectingWa(true);
    setTestFeedback(null);
    try {
      await fetch('/api/notifications/whatsapp/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await fetchWaStatus(true);
    } catch (err: any) {
      setTestFeedback({ type: 'error', text: err.message || 'Failed to disconnect session' });
    } finally {
      setConnectingWa(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;
    setSendingTest(true);
    setTestFeedback(null);
    try {
      const res = await fetch('/api/notifications/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          phone: testPhone.trim(),
          message: testMessage.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Failed to send test message');
      setTestFeedback({
        type: 'success',
        text: `WhatsApp alert sent successfully to ${testPhone}! Check your phone.`,
      });
    } catch (err: any) {
      setTestFeedback({
        type: 'error',
        text: err.message || 'Failed to dispatch test message',
      });
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchProfile();
      fetchNotifications();
      fetchWaStatus();
    }
  }, [authToken, fetchProfile, fetchNotifications, fetchWaStatus]);

  // Poll for QR scan completion if not yet ready
  useEffect(() => {
    if (notifications.whatsappEnabled && waStatus?.status && waStatus.status !== 'ready') {
      pollTimerRef.current = setInterval(() => {
        fetchWaStatus(true);
      }, 3500);
    } else if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [notifications.whatsappEnabled, waStatus?.status, fetchWaStatus]);

  // ── Save Shop Profile ─────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch('/api/shop/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: profile.name.trim(),
          address: profile.address.trim() || null,
          phone: profile.phone.trim() || null,
          city: profile.city.trim() || null,
          coverPhotoUrl: profile.coverPhotoUrl.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update shop profile.');
      }

      setProfileMsg({
        type: 'success',
        text: 'Shop profile saved! Changes are now reflected across the platform and on generated invoices.',
      });
      if (json.data) {
        setProfile((prev) => ({ ...prev, ...json.data }));
      }
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err.message || 'Error saving shop profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Toggle / Save Notification Preferences ────────────────────────────────
  const handleToggleNotification = async (channel: keyof NotificationConfig) => {
    const updated = {
      ...notifications,
      [channel]: !notifications[channel],
    };
    setNotifications(updated);
    setSavingNotifications(true);
    setNotifMsg(null);

    try {
      const res = await fetch('/api/notifications/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updated),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update notification settings.');
      }

      setNotifMsg({
        type: 'success',
        text: 'Notification preferences updated and saved to server.',
      });
    } catch (err: any) {
      // Revert on failure
      setNotifications(notifications);
      setNotifMsg({
        type: 'error',
        text: err.message || 'Error saving preferences.',
      });
    } finally {
      setSavingNotifications(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── SECTION 1: SHOP PROFILE ────────────────────────────────────────── */}
      <SectionCard
        title="Shop Profile & Business Details"
        subtitle="Manage your studio's official name, contact information, and branding. These details appear on invoices and customer communications."
      >
        {profileMsg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              profileMsg.type === 'success'
                ? 'bg-success-light border border-success/30 text-success'
                : 'bg-error-light border border-error/30 text-error'
            }`}
          >
            {profileMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{profileMsg.text}</span>
          </div>
        )}

        {loadingProfile ? (
          <div className="p-6 text-center text-xs text-text-muted">Loading shop profile…</div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shop Name */}
              <div>
                <label htmlFor="shop-name" className="block text-xs font-semibold text-text-secondary mb-1">
                  Atelier / Shop Name *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    id="shop-name"
                    data-testid="shop-name-input"
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="e.g. Shree Ganesh Bespoke Tailors"
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-muted border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
                  />
                </div>
              </div>

              {/* Contact Phone */}
              <div>
                <label htmlFor="shop-phone" className="block text-xs font-semibold text-text-secondary mb-1">
                  Business Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    id="shop-phone"
                    data-testid="shop-phone-input"
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-muted border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
                  />
                </div>
              </div>

              {/* Physical Address */}
              <div>
                <label htmlFor="shop-address" className="block text-xs font-semibold text-text-secondary mb-1">
                  Studio Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    id="shop-address"
                    data-testid="shop-address-input"
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="e.g. 101 Fashion Street, Ring Road"
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-muted border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label htmlFor="shop-city" className="block text-xs font-semibold text-text-secondary mb-1">
                  City / Location
                </label>
                <input
                  id="shop-city"
                  data-testid="shop-city-input"
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="e.g. Surat"
                  className="w-full px-3 py-2.5 bg-surface-muted border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
                />
              </div>

              {/* Cover / Logo URL */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Shop Logo / Cover Photo URL
                </label>
                <div className="relative">
                  <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="url"
                    value={profile.coverPhotoUrl}
                    onChange={(e) => setProfile({ ...profile, coverPhotoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-muted border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                data-testid="save-profile-btn"
                disabled={savingProfile}
                className="py-2.5 px-5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm min-h-[44px] transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'Saving Shop Profile…' : 'Save Shop Profile'}</span>
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* ── SECTION 2: NOTIFICATION PREFERENCES ────────────────────────────── */}
      <SectionCard
        title="Customer Notification Channels"
        subtitle="Control which automated notifications your bespoke customers receive on order placement, measurement milestones, cutting, and completion."
      >
        {notifMsg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              notifMsg.type === 'success'
                ? 'bg-success-light border border-success/30 text-success'
                : 'bg-error-light border border-error/30 text-error'
            }`}
          >
            {notifMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notifMsg.text}</span>
          </div>
        )}

        {loadingNotifications ? (
          <div className="p-6 text-center text-xs text-text-muted">Loading preferences…</div>
        ) : (
          <div className="space-y-3">
            {/* SMS */}
            <div className="p-4 bg-surface-muted/40 border border-border rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-text-primary">SMS Alerts</div>
                  <div className="text-[11px] text-text-muted">
                    Send transactional SMS updates to customer's mobile number.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="toggle-sms"
                  checked={notifications.smsEnabled}
                  onChange={() => handleToggleNotification('smsEnabled')}
                  disabled={savingNotifications}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            {/* Email */}
            <div className="p-4 bg-surface-muted/40 border border-border rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-text-primary">Email Notifications</div>
                  <div className="text-[11px] text-text-muted">
                    Send invoice PDFs and detailed measurement confirmation emails.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="toggle-email"
                  checked={notifications.emailEnabled}
                  onChange={() => handleToggleNotification('emailEnabled')}
                  disabled={savingNotifications}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            {/* WhatsApp */}
            <div className="p-4 bg-surface-muted/40 border border-border rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-text-primary">WhatsApp Updates</div>
                  <div className="text-[11px] text-text-muted">
                    Send interactive WhatsApp messages when garments enter cutting or ready for pickup.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="toggle-whatsapp"
                  checked={notifications.whatsappEnabled}
                  onChange={() => handleToggleNotification('whatsappEnabled')}
                  disabled={savingNotifications}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            {/* WhatsApp OpenWA Gateway Hub */}
            {notifications.whatsappEnabled && (
              <div className="p-5 rounded-2xl bg-surface border border-emerald-500/20 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
                        WhatsApp Gateway (OpenWA)
                        {loadingWa ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                            <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                          </span>
                        ) : waStatus?.status === 'ready' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Connected
                          </span>
                        ) : waStatus?.status === 'qr_ready' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Scan QR Code
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {waStatus?.status || 'Offline'}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-text-muted">
                        Self-hosted OpenWA gateway for sending live alerts directly from your tailor shop number.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchWaStatus()}
                      disabled={loadingWa}
                      title="Refresh WhatsApp Status"
                      className="p-1.5 rounded-lg border border-border bg-surface-muted hover:bg-border text-text-secondary transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingWa ? 'animate-spin' : ''}`} />
                    </button>
                    <a
                      href={waStatus?.dashboardUrl || 'http://localhost:2785'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      OpenWA Dashboard
                    </a>
                  </div>
                </div>

                {/* State 1: QR Ready -> Show QR Code & Instructions */}
                {waStatus?.status === 'qr_ready' && (
                  <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-xl bg-surface-muted/60 border border-border">
                    <div className="shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-border flex flex-col items-center justify-center">
                      {waStatus.qrCode ? (
                        <img
                          src={waStatus.qrCode}
                          alt="WhatsApp Link QR Code"
                          className="w-48 h-48 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-48 h-48 flex flex-col items-center justify-center text-text-muted">
                          <Loader2 className="w-6 h-6 animate-spin text-accent mb-2" />
                          <span className="text-[11px]">Generating QR...</span>
                        </div>
                      )}
                      <span className="text-[10px] text-text-muted mt-2 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Auto-refreshing in real time
                      </span>
                    </div>

                    <div className="space-y-3 text-left">
                      <div className="font-bold text-xs text-text-primary">
                        How to link your WhatsApp account:
                      </div>
                      <ol className="space-y-2 text-xs text-text-secondary list-decimal list-inside leading-relaxed">
                        <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                        <li>
                          Navigate to <strong>Settings</strong> &gt; <strong>Linked Devices</strong> (or tap ⋮ Menu on Android).
                        </li>
                        <li>
                          Tap <strong>Link a Device</strong> and point your camera at the QR code on the left.
                        </li>
                        <li>
                          Once scanned, DarziDesk will automatically connect and verify your session.
                        </li>
                      </ol>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleConnectWa}
                          disabled={connectingWa}
                          className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${connectingWa ? 'animate-spin' : ''}`} />
                          Regenerate QR Code
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* State 2: Ready & Connected -> Show Live Test & Details */}
                {waStatus?.status === 'ready' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          Connected as <strong>{waStatus.pushName || 'DarziDesk Studio'}</strong> ({waStatus.phone || 'Phone verified'})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnectWa}
                        disabled={connectingWa}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors text-[11px] font-semibold flex items-center gap-1 self-start sm:self-auto"
                      >
                        <LogOut className="w-3 h-3" />
                        Disconnect
                      </button>
                    </div>

                    {/* Test Message Dispatcher */}
                    <form onSubmit={handleSendTestMessage} className="p-4 rounded-xl bg-surface-muted/40 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-accent" />
                          Send Quick Test WhatsApp Message
                        </span>
                        <span className="text-[10px] text-text-muted">Direct delivery test</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Phone (e.g. 9876543210 or +919876543210)"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface border border-border focus:border-accent outline-none text-text-primary"
                          />
                          <button
                            type="submit"
                            disabled={sendingTest || !testPhone.trim()}
                            className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Send className={`w-3.5 h-3.5 ${sendingTest ? 'animate-spin' : ''}`} />
                            {sendingTest ? 'Sending...' : 'Send Test'}
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Optional test message (e.g. Namaste from DarziDesk!)"
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          className="px-3 py-1.5 text-[11px] rounded-xl bg-surface border border-border focus:border-accent outline-none text-text-primary placeholder:text-text-muted/60"
                        />
                      </div>
                      {testFeedback && (
                        <div
                          className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                            testFeedback.type === 'success'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                          }`}
                        >
                          {testFeedback.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0" />
                          )}
                          <span>{testFeedback.text}</span>
                        </div>
                      )}
                    </form>

                    {/* Automated Order Lifecycle Triggers */}
                    <div className="p-4 rounded-xl bg-surface-muted/30 border border-border space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Automated WhatsApp Order Milestones (Active)
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Auto-Dispatched
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="p-2.5 rounded-lg bg-surface border border-border/80 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            1. Order Confirmed
                          </div>
                          <p className="text-[11px] text-text-muted">
                            Auto-sent with order # and estimated delivery date when an order is created.
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-surface border border-border/80 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            2. Collect Item Alert
                          </div>
                          <p className="text-[11px] text-text-muted">
                            Auto-sent when order status changes to Ready for Pickup with balance due.
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-surface border border-border/80 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            3. Collected / Delivered
                          </div>
                          <p className="text-[11px] text-text-muted">
                            Auto-sent when customer collects the garment with a thank-you note.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* State 3: Offline / Error */}
                {waStatus && waStatus.status !== 'ready' && waStatus.status !== 'qr_ready' && (
                  <div className="p-4 rounded-xl bg-surface-muted border border-border text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-text-primary">
                      <WifiOff className="w-4 h-4 text-text-muted" />
                      Session Status: <span className="capitalize font-mono">{waStatus.status}</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {waStatus.status === 'offline'
                        ? 'OpenWA WhatsApp gateway container is currently offline or initializing. Ensure the Docker container is running.'
                        : 'Session needs initialization to generate a login QR code.'}
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConnectWa}
                        disabled={connectingWa}
                        className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${connectingWa ? 'animate-spin' : ''}`} />
                        {connectingWa ? 'Starting Session...' : 'Start / Reconnect WhatsApp'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── SECTION 3: MANAGEMENT HUB & DIRECT LINKS ──────────────────────── */}
      <SectionCard
        title="Management Hub & Subsystems"
        subtitle="Quickly navigate to advanced pricing, marketplace discovery settings, and staff accounts."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Products & Services */}
          <div
            onClick={() => navigate('/dashboard/products')}
            className="p-4 bg-surface border border-border hover:border-brand/50 rounded-xl cursor-pointer transition-all hover:shadow-sm group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Tag className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-text-primary group-hover:text-accent transition-colors">
                Products & Pricing Rules
              </h4>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                Base tailoring fees, stitching rates, rush surcharges, and GST tax percentages.
              </p>
            </div>
            <div className="mt-4 pt-2 flex items-center text-[11px] font-semibold text-accent gap-1">
              <span>Open Pricing →</span>
            </div>
          </div>

          {/* Marketplace Profile */}
          <div
            onClick={() => navigate('/dashboard/marketplace-settings')}
            className="p-4 bg-surface border border-border hover:border-brand/50 rounded-xl cursor-pointer transition-all hover:shadow-sm group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Compass className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-text-primary group-hover:text-emerald-600 transition-colors">
                Marketplace Profile
              </h4>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                Public directory listing, customer reviews, specialty tags, and storefront preview.
              </p>
            </div>
            <div className="mt-4 pt-2 flex items-center text-[11px] font-semibold text-emerald-600 gap-1">
              <span>Open Storefront →</span>
            </div>
          </div>

          {/* Staff Accounts */}
          <div
            onClick={() => navigate('/dashboard/staff')}
            className="p-4 bg-surface border border-border hover:border-brand/50 rounded-xl cursor-pointer transition-all hover:shadow-sm group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-text-primary group-hover:text-indigo-600 transition-colors">
                Staff & Workshop Team
              </h4>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                Artisan accounts, cutters, master tailors, and production task queue assignments.
              </p>
            </div>
            <div className="mt-4 pt-2 flex items-center text-[11px] font-semibold text-indigo-600 gap-1">
              <span>Manage Team →</span>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
