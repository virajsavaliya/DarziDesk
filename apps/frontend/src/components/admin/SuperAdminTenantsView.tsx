import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  CreditCard,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import type {
  AdminTenantSummaryItem,
  AdminTenantDetailItem,
  SubscriptionPlanItem,
  SubscriptionPaymentMethod,
} from '../../types/dashboard';

interface SuperAdminTenantsViewProps {
  authToken: string;
}

export const SuperAdminTenantsView: React.FC<SuperAdminTenantsViewProps> = ({ authToken }) => {
  const [tenants, setTenants] = useState<AdminTenantSummaryItem[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Selected Tenant Detail Drawer
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<AdminTenantDetailItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Change Plan Modal
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [effectiveImmediate, setEffectiveImmediate] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Record Payment Modal
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('1999');
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>('BANK_TRANSFER');
  const [referenceNote, setReferenceNote] = useState('');
  const [extendMonths, setExtendMonths] = useState(1);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/admin/tenants?limit=100';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      if (planFilter) url += `&plan=${encodeURIComponent(planFilter)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load tenants (${res.status})`);
      const json = await res.json();
      setTenants(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching platform tenants');
    } finally {
      setLoading(false);
    }
  }, [authToken, searchQuery, statusFilter, planFilter]);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/plans', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setPlans(json.data || []);
      }
    } catch (err) {
      console.warn('Error fetching plans:', err);
    }
  }, [authToken]);

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, [fetchTenants, fetchPlans]);

  const fetchTenantDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/admin/tenants/${id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          setTenantDetail(json.data);
          if (json.data.currentSubscription?.planId) {
            setSelectedPlanId(json.data.currentSubscription.planId);
          }
        }
      } catch (err) {
        console.warn('Error loading tenant detail:', err);
      } finally {
        setDetailLoading(false);
      }
    },
    [authToken],
  );

  const handleOpenDetail = (id: string) => {
    setSelectedTenantId(id);
    fetchTenantDetail(id);
  };

  const handleCloseDetail = () => {
    setSelectedTenantId(null);
    setTenantDetail(null);
  };

  const handleSuspend = async (id: string) => {
    if (!window.confirm('Are you sure you want to suspend this tenant? Staff and owner logins will be blocked immediately.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/suspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to suspend tenant');
      await fetchTenants();
      if (selectedTenantId) await fetchTenantDetail(selectedTenantId);
    } catch (err: any) {
      alert(err.message || 'Error suspending tenant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to reactivate tenant');
      await fetchTenants();
      if (selectedTenantId) await fetchTenantDetail(selectedTenantId);
    } catch (err: any) {
      alert(err.message || 'Error reactivating tenant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !selectedPlanId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenantId}/change-plan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          effectiveImmediate,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to change plan');
      }
      setIsChangePlanOpen(false);
      await fetchTenants();
      await fetchTenantDetail(selectedTenantId);
    } catch (err: any) {
      alert(err.message || 'Error changing plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenantId}/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          paymentMethod,
          referenceNote: referenceNote || undefined,
          extendMonths: Number(extendMonths),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to record payment');
      }
      setIsRecordPaymentOpen(false);
      setReferenceNote('');
      await fetchTenants();
      await fetchTenantDetail(selectedTenantId);
    } catch (err: any) {
      alert(err.message || 'Error recording payment');
    } finally {
      setActionLoading(false);
    }
  };

  // KPIs
  const totalCount = tenants.length;
  const activeCount = tenants.filter((t) => t.isActive && t.subscription?.status === 'ACTIVE').length;
  const trialCount = tenants.filter((t) => t.subscription?.status === 'TRIAL').length;
  const suspendedCount = tenants.filter((t) => !t.isActive).length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-primary" />
            Tenants & Platform Shops
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Cross-tenant platform governance, subscription plan management, and live entitlement enforcement.
          </p>
        </div>

        <button
          onClick={() => {
            fetchTenants();
            fetchPlans();
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-secondary transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* ── Platform Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-text-muted uppercase font-semibold tracking-wider">Total Tenants</span>
          <div className="text-2xl font-bold text-text-primary mt-1">{totalCount}</div>
          <span className="text-xs text-text-muted">Registered shops on platform</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-semibold tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active Paid
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
          <span className="text-xs text-text-muted">Paid monthly / yearly plans</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-amber-600 dark:text-amber-400 uppercase font-semibold tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> In Trial
          </span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{trialCount}</div>
          <span className="text-xs text-text-muted">Evaluating platform</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-rose-600 dark:text-rose-400 uppercase font-semibold tracking-wider flex items-center gap-1">
            <Ban className="w-3.5 h-3.5" /> Suspended
          </span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{suspendedCount}</div>
          <span className="text-xs text-text-muted">Login blocked by platform</span>
        </div>
      </div>

      {/* ── Filters Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by shop name, slug, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm bg-surface-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Subscription Statuses</option>
            <option value="ACTIVE">Active Paid</option>
            <option value="TRIAL">Trial</option>
            <option value="PAST_DUE">Past Due</option>
            <option value="SUSPENDED">Suspended (Platform Inactive)</option>
            <option value="CANCELLED">Cancelled / Expired</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="text-sm bg-surface-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Plan Tiers</option>
            {plans.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-4 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Tenants Data Table ──────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted animate-pulse">Loading platform tenants...</div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center text-text-muted">No tenants matched your search criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-primary">
              <thead className="bg-surface-elevated border-b border-border text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="py-3 px-4">Shop & Identifier</th>
                  <th className="py-3 px-4">Plan & Cycle</th>
                  <th className="py-3 px-4">Subscription Status</th>
                  <th className="py-3 px-4">Staff Entitlement</th>
                  <th className="py-3 px-4">Monthly Orders Limit</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenants.map((t) => {
                  const sub = t.subscription;
                  const maxStaff = sub?.plan.maxStaffAccounts || 5;
                  const maxOrders = sub?.plan.maxOrdersPerMonth || 50;
                  const staffPct = Math.min(100, Math.round((t.staffCount / maxStaff) * 100));
                  const orderPct = Math.min(100, Math.round((t.orderCountThisPeriod / maxOrders) * 100));

                  return (
                    <tr key={t.id} className="hover:bg-surface-elevated/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text-primary">{t.name}</div>
                        <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{t.slug}</span>
                          {t.city && <span>• {t.city}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {sub ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 font-semibold text-primary">
                              <Layers className="w-3.5 h-3.5" />
                              {sub.plan.name}
                            </span>
                            <span className="text-xs text-text-muted">
                              {sub.billingCycle === 'YEARLY' ? 'Annual (₹' + Number(sub.plan.priceYearly).toLocaleString() + '/yr)' : 'Monthly (₹' + Number(sub.plan.priceMonthly).toLocaleString() + '/mo)'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-muted text-xs">No Plan</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {!t.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                            <Ban className="w-3 h-3" /> Suspended
                          </span>
                        ) : sub?.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : sub?.status === 'TRIAL' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3 h-3" /> Trial
                          </span>
                        ) : sub?.status === 'PAST_DUE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800">
                            <AlertCircle className="w-3 h-3" /> Past Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {sub?.status || 'Unknown'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-text-primary">{t.staffCount} / {maxStaff}</span>
                          <span className="text-text-muted">{staffPct}%</span>
                        </div>
                        <div className="w-28 bg-border h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${staffPct >= 100 ? 'bg-rose-500' : staffPct >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
                            style={{ width: `${staffPct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-text-primary">{t.orderCountThisPeriod} / {maxOrders}</span>
                          <span className="text-text-muted">{orderPct}%</span>
                        </div>
                        <div className="w-28 bg-border h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${orderPct >= 100 ? 'bg-rose-500' : orderPct >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
                            style={{ width: `${orderPct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs text-text-muted">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(t.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface-elevated hover:bg-surface text-primary transition"
                        >
                          Inspect & Manage
                          <ArrowRight className="w-3.5 h-3.5" />
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

      {/* ── Slide-Over Detail Drawer ────────────────────────────────────────── */}
      {selectedTenantId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-surface border-l border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {tenantDetail?.tenant.name || 'Tenant Management'}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  ID: <span className="font-mono">{selectedTenantId}</span>
                </p>
              </div>

              <button
                onClick={handleCloseDetail}
                className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading || !tenantDetail ? (
                <div className="p-12 text-center text-text-muted animate-pulse">Loading tenant details...</div>
              ) : (
                <>
                  {/* Status & Quick Actions Banner */}
                  <div className="bg-surface-elevated border border-border rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-text-muted uppercase font-semibold">Current Platform Status</span>
                      <div className="flex items-center gap-2 mt-1">
                        {!tenantDetail.tenant.isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300">
                            Suspended (Login Blocked)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300">
                            Active Platform Shop
                          </span>
                        )}
                        <span className="text-xs text-text-muted">Slug: /{tenantDetail.tenant.slug}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {tenantDetail.tenant.isActive ? (
                        <button
                          onClick={() => handleSuspend(tenantDetail.tenant.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Suspend Tenant
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(tenantDetail.tenant.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Entitlement Resource Meters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-elevated border border-border rounded-xl p-4">
                      <span className="text-xs text-text-muted uppercase font-semibold">Staff Accounts Allocated</span>
                      <div className="text-2xl font-bold text-text-primary mt-1">
                        {tenantDetail.tenant.staffCount}
                        <span className="text-sm font-normal text-text-muted">
                          {' '}
                          / {tenantDetail.currentSubscription?.plan.maxStaffAccounts || 'Unlimited'}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Governed by server-side Phase 1 user creation guard.
                      </p>
                    </div>

                    <div className="bg-surface-elevated border border-border rounded-xl p-4">
                      <span className="text-xs text-text-muted uppercase font-semibold">Monthly Orders Placed</span>
                      <div className="text-2xl font-bold text-text-primary mt-1">
                        {tenantDetail.tenant.orderCountThisPeriod}
                        <span className="text-sm font-normal text-text-muted">
                          {' '}
                          / {tenantDetail.currentSubscription?.plan.maxOrdersPerMonth || 'Unlimited'}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Orders placed in current billing cycle.
                      </p>
                    </div>
                  </div>

                  {/* Current Subscription Plan Card */}
                  <div className="bg-surface-elevated border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-text-muted uppercase font-semibold">Active Subscription Plan</span>
                        <div className="text-lg font-bold text-primary flex items-center gap-2 mt-0.5">
                          <Layers className="w-5 h-5" />
                          {tenantDetail.currentSubscription?.plan.name || 'No Active Plan'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsChangePlanOpen(true)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-primary transition"
                        >
                          Change Plan
                        </button>
                        <button
                          onClick={() => setIsRecordPaymentOpen(true)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Record Payment
                        </button>
                      </div>
                    </div>

                    {tenantDetail.currentSubscription && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-border">
                        <div>
                          <span className="text-text-muted">Billing Cycle:</span>
                          <div className="font-semibold">{tenantDetail.currentSubscription.billingCycle}</div>
                        </div>
                        <div>
                          <span className="text-text-muted">Period Start:</span>
                          <div className="font-semibold">
                            {new Date(tenantDetail.currentSubscription.currentPeriodStart).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-text-muted">Period End:</span>
                          <div className="font-semibold">
                            {new Date(tenantDetail.currentSubscription.currentPeriodEnd).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-text-muted">Subscription Status:</span>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {tenantDetail.currentSubscription.status}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Full Subscription History */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <Clock className="w-4 h-4 text-text-muted" />
                      Subscription History
                    </h3>

                    <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface border-b border-border text-text-muted uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Plan</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Billing Cycle</th>
                            <th className="py-2.5 px-3">Period End</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {tenantDetail.subscriptionHistory.map((sub) => (
                            <tr key={sub.id} className="hover:bg-surface/50">
                              <td className="py-2.5 px-3 font-semibold text-text-primary">{sub.plan.name}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface border border-border">
                                  {sub.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-text-muted">{sub.billingCycle}</td>
                              <td className="py-2.5 px-3 text-text-muted">
                                {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Change Plan Modal ──────────────────────────────────────────────── */}
      {isChangePlanOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Change Subscription Plan</h3>
              <button
                onClick={() => setIsChangePlanOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePlanSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Select New Plan Tier
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40"
                  required
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{Number(p.priceMonthly).toLocaleString()}/mo ({p.maxStaffAccounts} staff, {p.maxOrdersPerMonth} orders)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-surface-elevated border border-border rounded-xl space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-text-primary">
                  <input
                    type="checkbox"
                    checked={effectiveImmediate}
                    onChange={(e) => setEffectiveImmediate(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Apply Immediately (New Billing Cycle)</span>
                </label>
                <p className="text-xs text-text-muted pl-6">
                  {effectiveImmediate
                    ? 'Limits update immediately. Existing staff will remain grandfathered if new limit is lower.'
                    : 'Plan change will take effect at the end of the current billing period.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePlanOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-surface-elevated text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition"
                >
                  {actionLoading ? 'Updating...' : 'Confirm Plan Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Manual Payment Modal ────────────────────────────────────── */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Record Manual Subscription Payment
              </h3>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as SubscriptionPaymentMethod)}
                  className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="CHEQUE">Cheque Clearance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Extend Period By (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={extendMonths}
                  onChange={(e) => setExtendMonths(Number(e.target.value))}
                  className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Reference Note / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC IMPS #9823019283"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-surface-elevated text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition"
                >
                  {actionLoading ? 'Recording...' : 'Record Payment & Extend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
