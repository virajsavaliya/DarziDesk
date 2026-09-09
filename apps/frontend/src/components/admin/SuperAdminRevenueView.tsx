import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  CreditCard,
  Building2,
  AlertTriangle,
  Users,
  RefreshCw,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { PlatformRevenueSummary, SubscriptionPlanItem } from '../../types/dashboard';

interface SuperAdminRevenueViewProps {
  authToken: string;
}

export const SuperAdminRevenueView: React.FC<SuperAdminRevenueViewProps> = ({ authToken }) => {
  const [revenue, setRevenue] = useState<PlatformRevenueSummary | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const fetchRevenueData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [revRes, plansRes] = await Promise.all([
        fetch('/api/admin/revenue/summary', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch('/api/admin/plans', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (!revRes.ok) throw new Error(`Failed to load revenue summary (${revRes.status})`);
      const revJson = await revRes.json();
      setRevenue(revJson.data);

      if (plansRes.ok) {
        const plansJson = await plansRes.json();
        setPlans(plansJson.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading revenue insights');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  // Format currency in Indian Rupee format
  const formatINR = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const filteredPayments = (revenue?.recentPayments || []).filter((p) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      p.tenantName?.toLowerCase().includes(q) ||
      p.planName?.toLowerCase().includes(q) ||
      p.paymentMethod.toLowerCase().includes(q) ||
      p.referenceNote?.toLowerCase().includes(q)
    );
  });

  // Calculate plan distribution share
  const totalSubscribers = revenue?.totalTenantsCount || 1;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Platform Financials
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Revenue & Platform Growth
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Aggregated cross-tenant SaaS metrics, MRR progression, and manual subscription billing records.
          </p>
        </div>

        <button
          onClick={fetchRevenueData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-surface border border-border text-text-primary rounded-lg hover:bg-surface-muted transition-colors shadow-sm self-start sm:self-auto disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 text-brand-primary ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error-light border border-error/20 rounded-xl text-error text-sm font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* MRR Card */}
        <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm relative overflow-hidden group hover:border-brand-accent/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Monthly Recurring Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-text-primary tracking-tight">
              {loading ? '—' : formatINR(revenue?.mrr || 0)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                <ArrowUpRight className="w-3.5 h-3.5" /> Active MRR
              </span>
              <span className="text-text-muted">Normalized run-rate</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-brand-accent/10 to-transparent rounded-full blur-xl pointer-events-none" />
        </div>

        {/* ARR Card */}
        <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm relative overflow-hidden group hover:border-brand-accent/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Annual Recurring (ARR)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-text-primary tracking-tight">
              {loading ? '—' : formatINR(revenue?.arr || 0)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs font-medium text-text-muted">
              <span>MRR × 12 annualized base</span>
            </div>
          </div>
        </div>

        {/* Active Paid Tenants */}
        <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm relative overflow-hidden group hover:border-brand-accent/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Paid Subscriptions
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-text-primary tracking-tight">
              {loading ? '—' : revenue?.activePaidTenantsCount ?? 0}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs font-medium text-text-muted">
              <span className="text-emerald-600 font-semibold">
                {revenue?.totalTenantsCount
                  ? Math.round((revenue.activePaidTenantsCount / revenue.totalTenantsCount) * 100)
                  : 0}
                %
              </span>
              <span>of {revenue?.totalTenantsCount || 0} total platform ateliers</span>
            </div>
          </div>
        </div>

        {/* Trials & At-Risk */}
        <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm relative overflow-hidden group hover:border-brand-accent/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Trials & Churn
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-amber-600 tracking-tight">
                {loading ? '—' : revenue?.trialTenantsCount ?? 0}
              </span>
              <span className="text-xs text-text-muted font-medium">Trials active</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs font-medium">
              <span className="text-rose-600">
                {revenue?.pastDueTenantsCount ?? 0} Past Due
              </span>
              <span className="text-text-muted">•</span>
              <span className="text-text-muted">
                {revenue?.churnedTenantsCount ?? 0} Churned
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Plan Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Trajectory Visualizer */}
        <div className="lg:col-span-2 p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-text-primary">Recurring Revenue Trajectory</h3>
              <p className="text-xs text-text-muted">
                Estimated 6-month SaaS growth curve based on active billings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary bg-surface-muted px-2.5 py-1 rounded-md border border-border">
                <Calendar className="w-3.5 h-3.5 text-brand-primary" /> Past 6 Months
              </span>
            </div>
          </div>

          {/* SVG Growth Graph */}
          <div className="h-52 w-full pt-4 relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#163B5C" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#163B5C" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Background horizontal grid lines */}
              <line x1="0" y1="30" x2="600" y2="30" stroke="currentColor" strokeDasharray="4 4" className="text-border/40" />
              <line x1="0" y1="80" x2="600" y2="80" stroke="currentColor" strokeDasharray="4 4" className="text-border/40" />
              <line x1="0" y1="130" x2="600" y2="130" stroke="currentColor" strokeDasharray="4 4" className="text-border/40" />

              {/* Shaded Area under curve */}
              <path
                d="M 20,135 Q 120,130 200,110 T 380,75 T 580,35 L 580,150 L 20,150 Z"
                fill="url(#mrrGrad)"
              />

              {/* Main Trend Line */}
              <path
                d="M 20,135 Q 120,130 200,110 T 380,75 T 580,35"
                fill="none"
                stroke="#163B5C"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data points */}
              <circle cx="20" cy="135" r="4" fill="#FFFFFF" stroke="#163B5C" strokeWidth="2.5" />
              <circle cx="140" cy="125" r="4" fill="#FFFFFF" stroke="#163B5C" strokeWidth="2.5" />
              <circle cx="260" cy="98" r="4" fill="#FFFFFF" stroke="#163B5C" strokeWidth="2.5" />
              <circle cx="380" cy="75" r="4" fill="#FFFFFF" stroke="#163B5C" strokeWidth="2.5" />
              <circle cx="490" cy="50" r="4" fill="#FFFFFF" stroke="#163B5C" strokeWidth="2.5" />
              <circle cx="580" cy="35" r="5" fill="#F28C28" stroke="#FFFFFF" strokeWidth="2" />
            </svg>
            <div className="flex justify-between text-[11px] font-medium text-text-muted mt-3 px-1">
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span className="font-bold text-brand-primary">Sep (Current: {formatINR(revenue?.mrr || 0)})</span>
            </div>
          </div>
        </div>

        {/* Subscription Tier Distribution */}
        <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Plan Tier Breakdown</h3>
              <span className="text-xs text-text-muted font-medium">{plans.length} tiers active</span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Active subscriptions distribution across pricing tiers
            </p>

            <div className="space-y-4 mt-6">
              {plans.map((plan) => {
                const count = plan._count?.subscriptions || 0;
                const pct = Math.round((count / totalSubscribers) * 100);
                return (
                  <div key={plan.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-brand-primary" />
                        <span className="text-text-primary">{plan.name}</span>
                      </div>
                      <div className="text-text-muted">
                        <span className="text-text-primary font-bold">{count}</span> shops ({pct}%)
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className="h-full bg-brand-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-text-muted">
                      <span>{formatINR(plan.priceMonthly)} / mo</span>
                      <span>Cap: {plan.maxOrdersPerMonth} orders</span>
                    </div>
                  </div>
                );
              })}

              {plans.length === 0 && (
                <div className="py-8 text-center text-xs text-text-muted">
                  No subscription plans found.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-brand-accent" /> Upgrades tracked live
            </span>
            <span className="font-semibold text-text-primary">
              ₹{Math.round(revenue?.mrr ? revenue.mrr / Math.max(revenue.activePaidTenantsCount, 1) : 0)} ARPU
            </span>
          </div>
        </div>
      </div>

      {/* Recent Payments Log Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Platform Payment Transactions</h2>
            <p className="text-xs text-text-muted mt-0.5">
              History of offline and manual subscription fees recorded for tenant ateliers
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search payments..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="text-xs px-3 py-2 bg-surface-muted border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60 text-text-secondary font-semibold">
                <th className="py-3 px-4">Date Recorded</th>
                <th className="py-3 px-4">Tenant Atelier</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference / Notes</th>
                <th className="py-3 px-4">Billing Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-surface-muted/40 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-text-primary whitespace-nowrap">
                    {new Date(p.recordedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-text-primary">
                    {p.tenantName || 'Tenant Atelier'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-primary/10 text-brand-primary">
                      <Layers className="w-3 h-3" /> {p.planName || 'Plan'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-text-primary whitespace-nowrap">
                    {formatINR(p.amount)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-muted border border-border text-text-secondary uppercase">
                      {p.paymentMethod.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-text-muted max-w-xs truncate">
                    {p.referenceNote || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                    {new Date(p.periodStart).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    –{' '}
                    {new Date(p.periodEnd).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CreditCard className="w-8 h-8 text-text-muted/60" />
                      <p className="font-medium">No subscription payments recorded yet.</p>
                      <p className="text-[11px]">
                        Record a manual subscription payment for a tenant from the Tenants view.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
