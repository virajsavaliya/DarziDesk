import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart2,
  TrendingUp,
  Calendar,
  Layers,
  Users,
  Clock,
  Scissors,
  AlertTriangle,
  FileText,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { MiniBarChart } from '../common/MiniBarChart';
import { DonutChart } from '../common/DonutChart';

interface OwnerReportsViewProps {
  authToken: string;
}

type DatePreset = 'this_month' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
type ReportTab = 'revenue' | 'orders' | 'staff' | 'fabric';

export const OwnerReportsView: React.FC<OwnerReportsViewProps> = ({ authToken }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('revenue');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');

  // Custom date inputs (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const startOfMonthStr = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }, []);

  const [customFrom, setCustomFrom] = useState(startOfMonthStr);
  const [customTo, setCustomTo] = useState(todayStr);

  // Active query range
  const [activeRange, setActiveRange] = useState<{ from: string; to: string }>({
    from: startOfMonthStr,
    to: todayStr,
  });

  // Report data states
  const [revenueData, setRevenueData] = useState<any>(null);
  const [ordersData, setOrdersData] = useState<any>(null);
  const [staffData, setStaffData] = useState<any>(null);
  const [fabricData, setFabricData] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate range dates based on preset
  const computePresetRange = useCallback((preset: DatePreset) => {
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);

    if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString().slice(0, 10), to: endStr };
    }
    if (preset === 'last_7_days') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return { from: start.toISOString().slice(0, 10), to: endStr };
    }
    if (preset === 'last_30_days') {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { from: start.toISOString().slice(0, 10), to: endStr };
    }
    if (preset === 'last_90_days') {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      return { from: start.toISOString().slice(0, 10), to: endStr };
    }
    return { from: customFrom, to: customTo };
  }, [customFrom, customTo]);

  // Handle preset selection
  const handleSelectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const r = computePresetRange(preset);
      setActiveRange(r);
    }
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    setActiveRange({ from: customFrom, to: customTo });
  };

  // Fetch report data for active tab
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        activeTab === 'revenue'
          ? '/api/reports/revenue'
          : activeTab === 'orders'
          ? '/api/reports/orders'
          : activeTab === 'staff'
          ? '/api/reports/staff-performance'
          : '/api/reports/fabric-consumption';

      const url = `${endpoint}?from=${encodeURIComponent(activeRange.from)}&to=${encodeURIComponent(activeRange.to)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access denied: Reports are restricted to Shop Owners only.');
        }
        throw new Error(`Failed to load report data (${res.status})`);
      }

      const json = await res.json();
      if (activeTab === 'revenue') setRevenueData(json.data);
      else if (activeTab === 'orders') setOrdersData(json.data);
      else if (activeTab === 'staff') setStaffData(json.data);
      else if (activeTab === 'fabric') setFabricData(json.data);
    } catch (err: any) {
      setError(err.message || 'Error fetching report data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeRange, authToken]);

  useEffect(() => {
    if (authToken) {
      fetchReport();
    }
  }, [authToken, fetchReport]);

  // Formatted date label
  const formattedRangeLabel = useMemo(() => {
    try {
      const f = new Date(activeRange.from).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      const t = new Date(activeRange.to).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${f} – ${t}`;
    } catch {
      return `${activeRange.from} to ${activeRange.to}`;
    }
  }, [activeRange]);

  return (
    <div className="space-y-6">
      {/* ── Top Header & Range Controls ── */}
      <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider">
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Executive Business Intelligence</span>
            </div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight" id="reports-page-title">
              Reports & Business Analytics
            </h1>
            <p className="text-xs text-text-secondary">
              Period financial margins, SLA turnaround velocities, tailor performance, and live fabric consumption.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-muted px-3 py-1.5 bg-surface-muted rounded-xl border border-border flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-secondary" />
              <span>{formattedRangeLabel}</span>
            </span>
            <button
              type="button"
              onClick={fetchReport}
              disabled={loading}
              className="p-2.5 bg-surface-muted hover:bg-border rounded-xl text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              title="Refresh Report Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Date Range Preset Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(
              [
                { id: 'this_month', label: 'This Month' },
                { id: 'last_7_days', label: 'Last 7 Days' },
                { id: 'last_30_days', label: 'Last 30 Days' },
                { id: 'last_90_days', label: 'Last 90 Days' },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map((p) => {
              const isActive = datePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    isActive
                      ? 'bg-brand text-white border-brand shadow-sm'
                      : 'bg-surface-muted border-border text-text-secondary hover:text-text-primary hover:bg-border/60'
                  }`}
                  id={`preset-${p.id}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Inputs */}
          {datePreset === 'custom' && (
            <form onSubmit={handleApplyCustomRange} className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
                id="input-custom-from"
              />
              <span className="text-xs text-text-muted font-bold">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
                id="input-custom-to"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-brand text-white font-bold text-xs rounded-lg hover:bg-brand-dark transition-colors"
                id="btn-apply-custom-range"
              >
                Apply
              </button>
            </form>
          )}
        </div>

        {/* Report Section Tabs */}
        <div className="flex items-center gap-2 border-b border-border -mb-1 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('revenue')}
            className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'revenue'
                ? 'border-brand text-brand'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
            id="tab-revenue"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Revenue & Financials</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'orders'
                ? 'border-brand text-brand'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
            id="tab-orders"
          >
            <Clock className="w-4 h-4" />
            <span>Order Volumes & SLA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'staff'
                ? 'border-brand text-brand'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
            id="tab-staff"
          >
            <Users className="w-4 h-4" />
            <span>Staff Performance</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
              Owner
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fabric')}
            className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'fabric'
                ? 'border-brand text-brand'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
            id="tab-fabric"
          >
            <Layers className="w-4 h-4" />
            <span>Fabric Consumption</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-error-light border border-error/30 rounded-2xl text-error text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-6 bg-surface border border-border rounded-2xl animate-pulse space-y-2">
                <div className="h-3 bg-surface-muted rounded w-1/2" />
                <div className="h-7 bg-surface-muted rounded w-3/4" />
              </div>
            ))}
          </div>
          <div className="p-8 bg-surface border border-border rounded-2xl animate-pulse h-64" />
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════
              TAB 1: REVENUE & FINANCIALS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'revenue' && revenueData && (
            <div className="space-y-6">
              {/* Revenue Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Revenue</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-text-primary tracking-tight font-mono" id="stat-total-revenue">
                      ₹{revenueData.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[11px] text-text-muted">
                      {revenueData.invoiceCount} invoices issued in period
                    </p>
                  </div>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Stitching Charges</span>
                    <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                      <Scissors className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-text-primary tracking-tight font-mono">
                      ₹{revenueData.breakdown.stitchingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[11px] text-text-muted">Tailoring & craftsmanship charges</p>
                  </div>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Fabric Billed</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-text-primary tracking-tight font-mono">
                      ₹{revenueData.breakdown.fabricCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[11px] text-text-muted">Direct fabric material sales</p>
                  </div>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5 shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Outstanding Balances
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono" id="stat-outstanding-balance">
                      ₹{revenueData.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                      Unpaid receivables across active orders
                    </p>
                  </div>
                </div>
              </div>

              {/* Revenue Trend Chart & Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Daily Revenue Trend */}
                <div className="lg:col-span-8 bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-text-primary">Revenue Trend</h3>
                      <p className="text-xs text-text-secondary mt-0.5">Daily invoice totals generated during this window</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-text-muted">
                      {revenueData.revenueByPeriod.length} active days
                    </span>
                  </div>

                  {revenueData.revenueByPeriod.length > 0 ? (
                    <div className="pt-4">
                      <MiniBarChart data={revenueData.revenueByPeriod} height={160} color="#22A06B" />
                    </div>
                  ) : (
                    <div className="p-12 text-center text-text-muted text-xs space-y-2">
                      <Info className="w-6 h-6 mx-auto text-text-muted/50" />
                      <p>No revenue data recorded for this period.</p>
                    </div>
                  )}
                </div>

                {/* Margins & Tax Distribution */}
                <div className="lg:col-span-4 bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-text-primary">Financial Distribution</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Revenue breakdown by cost category</p>
                  </div>

                  <div className="space-y-3.5 py-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-text-secondary">Stitching Charges</span>
                        <span className="text-text-primary font-mono">
                          ₹{revenueData.breakdown.stitchingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-surface-muted rounded-full h-2">
                        <div
                          className="bg-brand h-2 rounded-full"
                          style={{
                            width: `${
                              revenueData.totalRevenue > 0
                                ? (revenueData.breakdown.stitchingCharges / revenueData.totalRevenue) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-text-secondary">Fabric Material Cost</span>
                        <span className="text-text-primary font-mono">
                          ₹{revenueData.breakdown.fabricCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-surface-muted rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${
                              revenueData.totalRevenue > 0
                                ? (revenueData.breakdown.fabricCost / revenueData.totalRevenue) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-text-secondary">Taxes Collected</span>
                        <span className="text-text-primary font-mono">
                          ₹{revenueData.breakdown.taxCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-surface-muted rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{
                            width: `${
                              revenueData.totalRevenue > 0
                                ? (revenueData.breakdown.taxCollected / revenueData.totalRevenue) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {revenueData.breakdown.urgentSurcharge > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-text-secondary">Rush / Urgent Surcharges</span>
                          <span className="text-text-primary font-mono">
                            ₹{revenueData.breakdown.urgentSurcharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="w-full bg-surface-muted rounded-full h-2">
                          <div
                            className="bg-accent h-2 rounded-full"
                            style={{
                              width: `${
                                revenueData.totalRevenue > 0
                                  ? (revenueData.breakdown.urgentSurcharge / revenueData.totalRevenue) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-surface-muted rounded-xl text-[11px] text-text-muted space-y-1 border border-border">
                    <p className="font-bold text-text-primary">Atelier Tax Compliance</p>
                    <p>GST/Tax collected will appear in monthly compliance filings for your jurisdiction.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: ORDER VOLUMES & SLA
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'orders' && ordersData && (
            <div className="space-y-6">
              {/* Order KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Orders</span>
                    <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-text-primary tracking-tight font-mono" id="stat-total-orders">
                      {ordersData.totalOrders}
                    </span>
                    <p className="text-[11px] text-text-muted">Bespoke commissions placed in range</p>
                  </div>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Completed Orders</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-text-primary tracking-tight font-mono">
                      {ordersData.deliveredOrdersCount}
                    </span>
                    <p className="text-[11px] text-text-muted">Delivered to satisfied clients</p>
                  </div>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Avg Turnaround SLA</span>
                    <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-text-primary tracking-tight font-mono" id="stat-avg-turnaround">
                      {ordersData.averageTurnaroundDays > 0 ? `${ordersData.averageTurnaroundDays} days` : 'N/A'}
                    </span>
                    <p className="text-[11px] text-text-muted">Commission to handoff timeline</p>
                  </div>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Cancellation Rate</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-text-primary tracking-tight font-mono">
                      {ordersData.cancellationRate}%
                    </span>
                    <p className="text-[11px] text-text-muted">Cancelled commissions ratio</p>
                  </div>
                </div>
              </div>

              {/* Charts Row: Volume Trend & Garment Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Volume Trend Bar Chart */}
                <div className="lg:col-span-7 bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-text-primary">Order Volume Trend</h3>
                      <p className="text-xs text-text-secondary mt-0.5">Daily order placement cadence</p>
                    </div>
                  </div>

                  {ordersData.volumeTrend.length > 0 ? (
                    <div className="pt-4">
                      <MiniBarChart data={ordersData.volumeTrend} height={160} color="#F28C28" />
                    </div>
                  ) : (
                    <div className="p-12 text-center text-text-muted text-xs space-y-2">
                      <Info className="w-6 h-6 mx-auto text-text-muted/50" />
                      <p>No orders logged in this period.</p>
                    </div>
                  )}
                </div>

                {/* Garment Distribution Donut Chart */}
                <div className="lg:col-span-5 bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-4">
                  <div>
                    <h3 className="font-extrabold text-base text-text-primary">Garment Type Breakdown</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Most requested bespoke apparel styles</p>
                  </div>

                  {ordersData.byGarmentType.length > 0 ? (
                    <div className="py-2 flex items-center justify-center">
                      <DonutChart segments={ordersData.byGarmentType} size={150} thickness={28} />
                    </div>
                  ) : (
                    <div className="p-12 text-center text-text-muted text-xs space-y-2">
                      <Info className="w-6 h-6 mx-auto text-text-muted/50" />
                      <p>No garment classification data available.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Snapshot Tiles */}
              <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-4">
                <h3 className="font-extrabold text-base text-text-primary">Current Lifecycle Status Distribution</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {ordersData.byStatus.map((item: any) => (
                    <div
                      key={item.status}
                      className="p-3 bg-background rounded-xl border border-border text-center space-y-1"
                    >
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block truncate">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xl font-extrabold font-mono text-text-primary">{item.count}</span>
                    </div>
                  ))}
                  {ordersData.byStatus.length === 0 && (
                    <p className="col-span-full text-xs text-text-muted text-center py-4">No active statuses in range.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 3: STAFF PERFORMANCE (OWNER ONLY)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'staff' && staffData && (
            <div className="space-y-6">
              {/* Atelier Staff Team KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Active Staff Craftsmen</span>
                    <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-2xl font-black text-text-primary tracking-tight font-mono" id="stat-staff-count">
                    {staffData.totalStaffCount}
                  </span>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Team Delivered Orders</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-2xl font-black text-emerald-600 tracking-tight font-mono">
                    {staffData.staff.reduce((acc: number, s: any) => acc + s.completedOrders, 0)}
                  </span>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">QC Rework Incidents</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-2xl font-black text-amber-600 tracking-tight font-mono">
                    {staffData.staff.reduce((acc: number, s: any) => acc + s.reworkCount, 0)}
                  </span>
                </div>
              </div>

              {/* Staff Table */}
              <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-text-primary">Tailor Productivity & SLA Matrix</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Monitors orders completed in date range, active queue, turnaround time, and quality rework rate.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-surface-muted text-text-secondary text-xs font-mono font-bold border border-border">
                    Owner Confidential
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="table-staff-performance">
                    <thead>
                      <tr className="bg-surface-muted/50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-muted">
                        <th className="py-3 px-6">Craftsman</th>
                        <th className="py-3 px-4 text-center">Delivered in Range</th>
                        <th className="py-3 px-4 text-center">Current Active Queue</th>
                        <th className="py-3 px-4 text-center">Avg Turnaround</th>
                        <th className="py-3 px-4 text-center">Rework Loops (QC → Stitch)</th>
                        <th className="py-3 px-6 text-right">Rework Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {staffData.staff.map((s: any) => (
                        <tr key={s.staffId} className="hover:bg-surface-muted/30 transition-colors">
                          <td className="py-4 px-6 font-semibold text-text-primary">
                            <div>
                              <p className="font-bold text-sm text-text-primary">{s.name}</p>
                              <p className="text-[11px] font-normal text-text-muted">{s.email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center font-bold font-mono text-emerald-600">
                            {s.completedOrders}
                          </td>
                          <td className="py-4 px-4 text-center font-bold font-mono text-brand">
                            {s.activeOrders}
                          </td>
                          <td className="py-4 px-4 text-center font-mono">
                            {s.averageTurnaroundDays > 0 ? `${s.averageTurnaroundDays} days` : '—'}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {s.reworkCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{s.reworkCount} rework{s.reworkCount > 1 ? 's' : ''}</span>
                              </span>
                            ) : (
                              <span className="text-text-muted">0 (Flawless)</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right font-mono font-bold text-text-secondary">
                            {s.reworkRate}%
                          </td>
                        </tr>
                      ))}
                      {staffData.staff.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-text-muted italic">
                            No staff team members registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 4: FABRIC CONSUMPTION
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'fabric' && fabricData && (
            <div className="space-y-6">
              {/* Fabric Consumption KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Meters Consumed in Period</span>
                    <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                      <Scissors className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-text-primary tracking-tight font-mono" id="stat-meters-consumed">
                      {fabricData.totalMetersConsumed} m
                    </span>
                    <p className="text-[11px] text-text-muted">Direct stock deductions via orders</p>
                  </div>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Consumed Material Cost</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-text-primary tracking-tight font-mono">
                      ₹{fabricData.totalCostConsumed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[11px] text-text-muted">Cost value of fabric consumed</p>
                  </div>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Remaining In-Stock Valuation</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-emerald-600 tracking-tight font-mono" id="stat-instock-valuation">
                      ₹{fabricData.inStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[11px] text-text-muted">Total capital held in active inventory</p>
                  </div>
                </div>
              </div>

              {/* Fast Movers vs Slow Movers Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Consumed Fabrics */}
                <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-text-primary">Most Consumed Fabrics</h3>
                      <p className="text-xs text-text-secondary mt-0.5">Top fabric stock drawn for tailor orders</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                      High Velocity
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {fabricData.mostUsedFabrics.map((f: any) => (
                      <div
                        key={f.fabricId}
                        className="p-3 bg-background rounded-xl border border-border flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-xs text-text-primary">{f.name}</p>
                          <p className="text-[10px] text-text-muted">
                            {f.color} • {f.type} • ₹{f.pricePerMeter}/m
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-sm text-text-primary">{f.metersConsumed} m</span>
                          <p className="text-[10px] text-emerald-600 font-bold">
                            ₹{f.costConsumed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {fabricData.mostUsedFabrics.length === 0 && (
                      <p className="text-xs text-text-muted italic text-center py-6">
                        No fabric consumption in selected date range.
                      </p>
                    )}
                  </div>
                </div>

                {/* Slow Movers / Overstock Risk */}
                <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-text-primary">Slow Movers & Capital Locked</h3>
                      <p className="text-xs text-text-secondary mt-0.5">Low-consumption fabrics with significant stock</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">
                      Overstock Watch
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {fabricData.leastUsedFabrics.map((f: any) => (
                      <div
                        key={f.fabricId}
                        className="p-3 bg-background rounded-xl border border-border flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-xs text-text-primary">{f.name}</p>
                          <p className="text-[10px] text-text-muted">
                            {f.color} • {f.type} • ₹{f.pricePerMeter}/m
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-xs text-text-secondary">
                            {f.availableMeters} m in stock
                          </span>
                          <p className="text-[10px] text-amber-600 font-bold">
                            ₹{f.inStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} locked
                          </p>
                        </div>
                      </div>
                    ))}
                    {fabricData.leastUsedFabrics.length === 0 && (
                      <p className="text-xs text-text-muted italic text-center py-6">No fabrics registered.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Complete Fabric Stock Consumption Ledger */}
              <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-extrabold text-base text-text-primary">Fabric Consumption & Inventory Ledger</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Complete catalog with usage metrics in selected timeframe and live inventory status.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="table-fabric-ledger">
                    <thead>
                      <tr className="bg-surface-muted/50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-muted">
                        <th className="py-3 px-6">Fabric Material</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-right">Price / Meter</th>
                        <th className="py-3 px-4 text-center">Consumed in Range</th>
                        <th className="py-3 px-4 text-right">Consumed Value</th>
                        <th className="py-3 px-4 text-center">Current Stock</th>
                        <th className="py-3 px-6 text-right">In-Stock Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {fabricData.fabricList.map((f: any) => (
                        <tr key={f.fabricId} className="hover:bg-surface-muted/30 transition-colors">
                          <td className="py-3.5 px-6 font-bold text-text-primary">
                            <div>
                              <p className="font-bold text-sm text-text-primary">{f.name}</p>
                              <p className="text-[11px] font-normal text-text-muted">{f.color}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-text-secondary font-medium">{f.type}</td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            ₹{f.pricePerMeter.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold font-mono">
                            {f.metersConsumed > 0 ? (
                              <span className="text-emerald-600 font-black">{f.metersConsumed} m</span>
                            ) : (
                              <span className="text-text-muted">0 m</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-text-secondary">
                            ₹{f.costConsumed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-brand">
                            {f.availableMeters} m
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono font-black text-text-primary">
                            ₹{f.inStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
