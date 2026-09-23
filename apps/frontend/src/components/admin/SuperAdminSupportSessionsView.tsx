import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Plus,
  AlertTriangle,
  ExternalLink,
  Eye,
  Edit3,
} from 'lucide-react';
import { setSupportSession } from './SupportModeBanner';

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  city?: string;
  isActive: boolean;
}

interface ActiveSupportSession {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  adminUserId: string;
  adminEmail: string;
  adminName: string;
  reason: string;
  scope: 'READ_ONLY' | 'READ_WRITE';
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface SuperAdminSupportSessionsViewProps {
  authToken: string;
}

export const SuperAdminSupportSessionsView: React.FC<SuperAdminSupportSessionsViewProps> = ({
  authToken,
}) => {
  const [activeSessions, setActiveSessions] = useState<ActiveSupportSession[]>([]);
  const [historySessions, setHistorySessions] = useState<ActiveSupportSession[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [reason, setReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [scope, setScope] = useState<'READ_ONLY' | 'READ_WRITE'>('READ_ONLY');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Token Created Display Modal
  const [createdSessionData, setCreatedSessionData] = useState<{
    token: string;
    session: any;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      const [activeRes, tenantsRes] = await Promise.all([
        fetch('/api/admin/support-sessions/active', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch('/api/admin/tenants?limit=100', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (activeRes.ok) {
        const json = await activeRes.json();
        setActiveSessions(json.data || []);
      }

      if (tenantsRes.ok) {
        const json = await tenantsRes.json();
        setTenants(json.tenants || json.data?.tenants || []);
      }
    } catch (err) {
      console.error('Failed to load support sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/admin/support-sessions/history?limit=50', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setHistorySessions(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch session history:', err);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, [authToken]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      setCreateError('Please select a target tenant');
      return;
    }
    if (reason.trim().length < 5) {
      setCreateError('Please provide a descriptive business justification (min 5 characters)');
      return;
    }

    try {
      setSubmitting(true);
      setCreateError(null);
      const res = await fetch('/api/admin/support-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          reason: reason.trim(),
          durationMinutes,
          scope,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || 'Failed to create support session');
      }

      const json = await res.json();
      setCreatedSessionData(json.data);
      setShowCreateModal(false);
      setSelectedTenantId('');
      setReason('');
      setScope('READ_ONLY');
      fetchActiveSessions();
    } catch (err: any) {
      setCreateError(err.message || 'Error initiating support session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string, tenantName: string) => {
    if (!window.confirm(`Revoke support session for ${tenantName}? Access will terminate immediately.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/support-sessions/${id}/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        fetchActiveSessions();
        if (tab === 'HISTORY') fetchHistory();
      }
    } catch (err) {
      console.error('Failed to revoke session:', err);
    }
  };

  const handleEnterSupportMode = (sessionData: { token: string; session: any }) => {
    setSupportSession(sessionData);
    window.location.href = '/dashboard/orders';
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Tenant Support Sessions</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Escalated Access Control
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Server-authoritative, time-limited tenant support access. Default scope is strictly Read-Only.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (tab === 'ACTIVE') fetchActiveSessions();
              else fetchHistory();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-lg transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Support Session
          </button>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => setTab('ACTIVE')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition cursor-pointer ${
            tab === 'ACTIVE'
              ? 'border-brand text-brand'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          Active Sessions ({activeSessions.length})
        </button>
        <button
          onClick={() => {
            setTab('HISTORY');
            fetchHistory();
          }}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition cursor-pointer ${
            tab === 'HISTORY'
              ? 'border-brand text-brand'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          Audit History
        </button>
      </div>

      {/* ── Active Sessions Table ─────────────────────────────────── */}
      {tab === 'ACTIVE' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          {activeSessions.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-stone-900 mb-1">No Active Support Sessions</h3>
              <p className="text-sm text-stone-500 max-w-md mx-auto mb-4">
                No administrators are currently accessing tenant environments. All tenant boundaries are strictly isolated.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Initiate Support Session
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Target Tenant</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4">Super Admin</th>
                    <th className="py-3 px-4">Justification</th>
                    <th className="py-3 px-4">Time Remaining</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {activeSessions.map((s) => {
                    const isReadOnly = s.scope === 'READ_ONLY';
                    const diffMs = new Date(s.expiresAt).getTime() - Date.now();
                    const minsRemaining = Math.max(0, Math.floor(diffMs / 60000));

                    return (
                      <tr key={s.id} className="hover:bg-stone-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-stone-900">{s.tenantName}</div>
                          <div className="text-xs text-stone-500 font-mono">{s.tenantSlug}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isReadOnly
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isReadOnly ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                            {s.scope}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-stone-900">{s.adminName}</div>
                          <div className="text-xs text-stone-500">{s.adminEmail}</div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="text-xs text-stone-700 line-clamp-2" title={s.reason}>
                            "{s.reason}"
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-amber-700">
                            <Clock className="w-3.5 h-3.5" />
                            {minsRemaining}m remaining
                          </div>
                          <div className="text-[11px] text-stone-400">
                            Expires {new Date(s.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleRevoke(s.id, s.tenantName)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg transition cursor-pointer"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── History Table ─────────────────────────────────────────── */}
      {tab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Target Tenant</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Super Admin</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {historySessions.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-900">{s.tenantName}</div>
                      <div className="text-xs text-stone-500 font-mono">{s.tenantSlug}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                        {s.scope}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-stone-900">{s.adminEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.status === 'REVOKED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-600">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-600 max-w-sm truncate" title={s.reason}>
                      {s.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Session Modal ───────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-stone-900">Initiate Support Session</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              {/* Tenant Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Target Tenant Shop
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
                  required
                >
                  <option value="">-- Select a Tenant --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug}) {t.city ? `- ${t.city}` : ''} {!t.isActive ? '[SUSPENDED]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Access Scope
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      scope === 'READ_ONLY'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="READ_ONLY"
                      checked={scope === 'READ_ONLY'}
                      onChange={() => setScope('READ_ONLY')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-stone-900 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-indigo-600" /> READ_ONLY (Default)
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Inspect tenant data safely. Write operations are strictly blocked by middleware.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      scope === 'READ_WRITE'
                        ? 'border-rose-600 bg-rose-50/50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="READ_WRITE"
                      checked={scope === 'READ_WRITE'}
                      onChange={() => setScope('READ_WRITE')}
                      className="mt-0.5 text-rose-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-rose-900 flex items-center gap-1">
                        <Edit3 className="w-3.5 h-3.5 text-rose-600" /> READ_WRITE
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Elevated access to create or modify resources. Full audit logs recorded.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {scope === 'READ_WRITE' && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Elevated Mutation Warning:</span> You are requesting write capability inside a customer tenant. Every change will be permanently logged in the Platform Audit Trail.
                  </div>
                </div>
              )}

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Session Duration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                  className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour (Recommended)</option>
                  <option value={120}>2 Hours</option>
                  <option value={240}>4 Hours</option>
                </select>
              </div>

              {/* Business Justification */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Mandatory Business Justification
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Investigating ticket #4102: customer reported order state stuck at CUTTING"
                  className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 min-h-[80px]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Generating Token...' : 'Create Support Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Token Generated Modal ──────────────────────────────────── */}
      {createdSessionData && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Support Session Ready</h3>
                <p className="text-xs text-stone-500">
                  Target Tenant: <strong className="text-stone-800">{createdSessionData.session.tenantName}</strong>
                </p>
              </div>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-2">
              <div className="flex justify-between">
                <span>Scope:</span>
                <span className="font-bold font-mono">{createdSessionData.session.scope}</span>
              </div>
              <div className="flex justify-between">
                <span>Expires At:</span>
                <span className="font-mono">{new Date(createdSessionData.session.expiresAt).toLocaleString()}</span>
              </div>
              <div>
                <span>Opaque Support Token (Displayed ONCE):</span>
                <div className="mt-1 flex items-center gap-2 bg-white p-2 rounded-lg border border-stone-200 font-mono text-[11px] text-stone-800 break-all select-all">
                  <span className="flex-1">{createdSessionData.token}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdSessionData.token);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 shrink-0 cursor-pointer"
                    title="Copy Token"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCreatedSessionData(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 transition cursor-pointer"
              >
                Close
              </button>

              <button
                onClick={() => handleEnterSupportMode(createdSessionData)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Enter Support Mode Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
