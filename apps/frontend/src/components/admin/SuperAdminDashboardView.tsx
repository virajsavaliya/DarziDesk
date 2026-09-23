import React, { useState, useEffect } from 'react';
import {
  Building2,
  TrendingUp,
  Activity,
  AlertTriangle,
  ShoppingBag,
  RefreshCw,
  KeyRound,
  FileText,
  ToggleLeft,
  ArrowUpRight,
} from 'lucide-react';

interface DashboardMetrics {
  overview: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    mrr: number;
    arr: number;
    totalUsers: number;
    totalCustomers: number;
    totalOrders: number;
    ordersToday: number;
    ordersMonth: number;
    activeSupportSessions: number;
    deadLetterOutboxCount: number;
  };
  tenantsByState: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  systemStatus: {
    dbHealthy: boolean;
    outboxHealthy: boolean;
    timestamp: string;
  };
}

interface SuperAdminDashboardViewProps {
  authToken: string;
  onNavigate?: (route: string) => void;
}

export const SuperAdminDashboardView: React.FC<SuperAdminDashboardViewProps> = ({
  authToken,
  onNavigate,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (fresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/dashboard${fresh ? '?fresh=true' : ''}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load platform metrics (${res.status})`);
      }

      const json = await res.json();
      setMetrics(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve platform metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [authToken]);

  if (loading && !metrics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm text-stone-500 font-medium">Loading platform metrics...</p>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-red-900 mb-1">Failed to Load Dashboard</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={() => fetchMetrics(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const overview = metrics?.overview;
  const states = metrics?.tenantsByState || {};
  const subs = metrics?.subscriptionsByStatus || {};
  const status = metrics?.systemStatus;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Platform Control Center</h1>
          <p className="text-sm text-stone-500 mt-1">
            Enterprise overview of tenants, subscription revenue, platform security, and system health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {status && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-lg text-xs text-stone-600 border border-stone-200">
              <span className={`w-2 h-2 rounded-full ${status.dbHealthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span>DB: {status.dbHealthy ? 'Healthy' : 'Disconnected'}</span>
              <span className="text-stone-300">|</span>
              <span className={`w-2 h-2 rounded-full ${status.outboxHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>Outbox: {status.outboxHealthy ? 'Clear' : 'Issues'}</span>
            </div>
          )}

          <button
            onClick={() => fetchMetrics(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-lg transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── System Alerts (if any) ─────────────────────────────────── */}
      {overview && overview.deadLetterOutboxCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                {overview.deadLetterOutboxCount} Dead-Letter Outbox Events Detected
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Certain asynchronous domain events reached maximum retry attempts. Review and replay from System Operations.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('/admin/operations')}
              className="text-xs font-semibold text-amber-900 bg-amber-200/60 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
            >
              View Operations
            </button>
          )}
        </div>
      )}

      {/* ── Primary KPI Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Tenants */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Tenants</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-stone-900 tracking-tight">{overview?.totalTenants ?? 0}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
            <span className="text-emerald-600 font-semibold">{overview?.activeTenants ?? 0} Active</span>
            <span>•</span>
            <span className="text-rose-600 font-semibold">{overview?.suspendedTenants ?? 0} Suspended</span>
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Est. MRR</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-stone-900 tracking-tight">₹{overview?.mrr.toLocaleString('en-IN') ?? 0}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
            <span>ARR:</span>
            <span className="font-semibold text-stone-700">₹{overview?.arr.toLocaleString('en-IN') ?? 0}</span>
          </div>
        </div>

        {/* Orders Volume */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Orders Today</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-stone-900 tracking-tight">{overview?.ordersToday ?? 0}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
            <span>Month: <strong className="text-stone-700">{overview?.ordersMonth ?? 0}</strong></span>
            <span>•</span>
            <span>Total: <strong className="text-stone-700">{overview?.totalOrders ?? 0}</strong></span>
          </div>
        </div>

        {/* Security & Access */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Support Access</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-stone-900 tracking-tight">
              {overview?.activeSupportSessions ?? 0}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
            <span className={overview?.activeSupportSessions ? 'text-amber-600 font-semibold' : 'text-stone-400'}>
              {overview?.activeSupportSessions ? 'Active sessions currently live' : 'No active sessions'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Status Breakdown Panels ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Lifecycle Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Tenant Lifecycle States</h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('/admin/tenants')}
                className="text-xs text-brand hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                Manage Tenants <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {[
              { key: 'ACTIVE', label: 'Active', color: 'bg-emerald-500', text: 'text-emerald-700' },
              { key: 'SUSPENDED', label: 'Suspended', color: 'bg-rose-500', text: 'text-rose-700' },
              { key: 'REGISTERED', label: 'Registered (Onboarding)', color: 'bg-blue-500', text: 'text-blue-700' },
              { key: 'CANCELLED', label: 'Cancelled', color: 'bg-stone-400', text: 'text-stone-700' },
              { key: 'ARCHIVED', label: 'Archived', color: 'bg-stone-300', text: 'text-stone-500' },
            ].map(({ key, label, color, text }) => {
              const count = states[key] || 0;
              const pct = overview?.totalTenants ? Math.round((count / overview.totalTenants) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-stone-700">{label}</span>
                    <span className={`font-semibold ${text}`}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Status Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Subscription Health</h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('/admin/revenue')}
                className="text-xs text-brand hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                Revenue Report <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {[
              { key: 'ACTIVE', label: 'Active Subscriptions', color: 'bg-emerald-500', text: 'text-emerald-700' },
              { key: 'TRIALING', label: 'Trial Period', color: 'bg-indigo-500', text: 'text-indigo-700' },
              { key: 'PAST_DUE', label: 'Past Due', color: 'bg-amber-500', text: 'text-amber-700' },
              { key: 'CANCELLED', label: 'Cancelled', color: 'bg-stone-400', text: 'text-stone-700' },
              { key: 'EXPIRED', label: 'Expired', color: 'bg-rose-400', text: 'text-rose-700' },
            ].map(({ key, label, color, text }) => {
              const count = subs[key] || 0;
              const totalSubs = Object.values(subs).reduce((a, b) => a + b, 0);
              const pct = totalSubs ? Math.round((count / totalSubs) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-stone-700">{label}</span>
                    <span className={`font-semibold ${text}`}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Governance & Operations Quick Navigation ──────────────── */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
          Control Plane Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => onNavigate && onNavigate('/admin/support-sessions')}
            className="bg-white p-4 rounded-xl border border-stone-200 hover:border-brand/40 text-left hover:shadow-xs transition group cursor-pointer"
          >
            <KeyRound className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-sm font-semibold text-stone-900">Support Sessions</h4>
            <p className="text-xs text-stone-500 mt-1">Initiate safe time-limited tenant support access</p>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('/admin/audit')}
            className="bg-white p-4 rounded-xl border border-stone-200 hover:border-brand/40 text-left hover:shadow-xs transition group cursor-pointer"
          >
            <FileText className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-sm font-semibold text-stone-900">Audit Logs</h4>
            <p className="text-xs text-stone-500 mt-1">Inspect immutable, sanitized administrative event logs</p>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('/admin/feature-flags')}
            className="bg-white p-4 rounded-xl border border-stone-200 hover:border-brand/40 text-left hover:shadow-xs transition group cursor-pointer"
          >
            <ToggleLeft className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-sm font-semibold text-stone-900">Feature Flags</h4>
            <p className="text-xs text-stone-500 mt-1">Control global features and tenant overrides</p>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('/admin/operations')}
            className="bg-white p-4 rounded-xl border border-stone-200 hover:border-brand/40 text-left hover:shadow-xs transition group cursor-pointer"
          >
            <Activity className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-sm font-semibold text-stone-900">Operations Health</h4>
            <p className="text-xs text-stone-500 mt-1">Monitor background outbox queue and database</p>
          </button>
        </div>
      </div>
    </div>
  );
};
