import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  UserPlus,
  CreditCard,
  Clock,
  ArrowRight,
  BarChart2,
  Store,
  Clock3,
  XCircle,
} from 'lucide-react';
import type {
  OwnerDashboardSummary,
  ActivityEntry,
  Order,
  OrderStatus,
  MarketplaceSettings,
} from '../../types/dashboard';
import { STATUS_CONFIG } from '../../types/dashboard';
import { StatCard } from '../common/StatCard';
import { SectionCard } from '../common/SectionCard';
import { StatusBadge } from '../common/StatusBadge';
import { DataTable, type TableColumn } from '../common/DataTable';
import { MiniBarChart } from '../common/MiniBarChart';
import { DonutChart } from '../common/DonutChart';
import { EmptyState } from '../common/EmptyState';
import { Drawer } from '../common/Drawer';
import { OrderDetailView } from './OrderDetailView';

// Status color map for the donut chart (using design token hex values)
const STATUS_COLORS: Record<OrderStatus, string> = {
  PLACED: '#3B82F6',
  MEASUREMENT_CONFIRMED: '#6366F1',
  CUTTING: '#F59E0B',
  STITCHING: '#F28C28',
  QUALITY_CHECK: '#8B5CF6',
  READY: '#14B8A6',
  DELIVERED: '#22A06B',
  CANCELLED: '#D64545',
};

const QUICK_ACTIONS = [
  { id: 'new-order', icon: <PlusCircle className="w-5 h-5" />, label: 'New Order', color: 'bg-accent/10 text-accent hover:bg-accent/20' },
  { id: 'add-customer', icon: <UserPlus className="w-5 h-5" />, label: 'Add Customer', color: 'bg-info/10 text-info hover:bg-info/20' },
  { id: 'record-payment', icon: <CreditCard className="w-5 h-5" />, label: 'Record Payment', color: 'bg-success/10 text-success hover:bg-success/20' },
  { id: 'view-reports', icon: <BarChart2 className="w-5 h-5" />, label: 'View Reports', color: 'bg-purple-100 text-purple-600 hover:bg-purple-200' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface OwnerDashboardViewProps {
  authToken: string;
  currentUser: { name: string };
  onNavigate?: (id: string) => void;
}

export const OwnerDashboardView: React.FC<OwnerDashboardViewProps> = ({
  authToken,
  currentUser,
  onNavigate,
}) => {
  const [summary, setSummary] = useState<OwnerDashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchAll = useCallback(async () => {
    setLoadingSummary(true);
    setLoadingOrders(true);
    setLoadingActivity(true);

    const [summaryRes, ordersRes, activityRes, marketRes] = await Promise.allSettled([
      fetch('/api/dashboard/summary', { headers }).then((r) => r.json()),
      fetch('/api/dashboard/orders/recent?limit=10', { headers }).then((r) => r.json()),
      fetch('/api/dashboard/activity?limit=15', { headers }).then((r) => r.json()),
      fetch('/api/shop/marketplace-settings', { headers }).then((r) => r.json()),
    ]);

    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data ?? null);
    setLoadingSummary(false);

    if (ordersRes.status === 'fulfilled') setRecentOrders(ordersRes.value.data ?? []);
    setLoadingOrders(false);

    if (activityRes.status === 'fulfilled') setActivity(activityRes.value.data ?? []);
    setLoadingActivity(false);

    if (marketRes.status === 'fulfilled') setMarketplaceSettings(marketRes.value.data ?? null);
  }, [authToken, refreshTrigger]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Recent Orders DataTable columns
  const orderColumns: TableColumn<Order>[] = [
    {
      key: 'id',
      label: 'Order',
      render: (o) => (
        <span className="font-mono text-xs font-semibold text-text-primary">
          #{o.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (o) =>
        o.customer ? (
          <span className="text-sm text-text-primary">
            {o.customer.firstName} {o.customer.lastName}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: 'garmentType',
      label: 'Item',
      render: (o) => (
        <span className="text-sm text-text-secondary capitalize">
          {o.garmentType.charAt(0) + o.garmentType.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      key: 'estimatedDeliveryDate',
      label: 'Due',
      render: (o) => {
        if (!o.estimatedDeliveryDate)
          return <span className="text-text-muted text-xs">—</span>;
        const due = new Date(o.estimatedDeliveryDate);
        const isOverdue = due < new Date() && !['DELIVERED', 'CANCELLED'].includes(o.status);
        return (
          <span
            className={`text-xs font-medium ${isOverdue ? 'text-error font-semibold' : 'text-text-secondary'}`}
          >
            {due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (o) => <StatusBadge status={o.status} size="sm" />,
    },
    {
      key: 'actions',
      label: '',
      render: (o) => (
        <button
          onClick={() => setSelectedOrder(o)}
          className="text-xs text-accent font-semibold hover:underline flex items-center gap-1"
        >
          View <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  // Donut segments from summary
  const donutSegments = (summary?.ordersByStatus ?? [])
    .filter((s) => s.count > 0)
    .map((s) => ({
      label: STATUS_CONFIG[s.status]?.label ?? s.status,
      value: s.count,
      color: STATUS_COLORS[s.status] ?? '#94A3B8',
    }));

  return (
    <div className="space-y-6">
      {/* ── Welcome Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary leading-tight">
            {getGreeting()}, {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">
            Here's what's happening in your shop today.
          </p>
        </div>
        <button
          onClick={() => onNavigate?.('orders')}
          className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-accent/90 transition-colors shadow-sm min-h-[44px]"
        >
          <PlusCircle className="w-4 h-4" />
          New Order
        </button>
      </div>

      {/* ── KPI StatCards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Today's Orders"
          value={loadingSummary ? '—' : (summary?.todaysOrders ?? 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="info"
          loading={loadingSummary}
        />
        <StatCard
          title="Active Orders"
          value={loadingSummary ? '—' : (summary?.activeOrders ?? 0)}
          icon={<Clock className="w-5 h-5" />}
          variant="neutral"
          loading={loadingSummary}
        />
        <StatCard
          title="Ready for Pickup"
          value={loadingSummary ? '—' : (summary?.readyForDelivery ?? 0)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="success"
          loading={loadingSummary}
        />
        <StatCard
          title="Low Stock Items"
          value={loadingSummary ? '—' : (summary?.lowStockFabrics ?? 0)}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant={(summary?.lowStockFabrics ?? 0) > 0 ? 'warning' : 'neutral'}
          loading={loadingSummary}
        />
      </div>

      {/* ── Charts Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <SectionCard title="Orders This Week" className="lg:col-span-3">
          {loadingSummary ? (
            <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
          ) : summary?.ordersThisWeek && summary.ordersThisWeek.length > 0 ? (
            <MiniBarChart data={summary.ordersThisWeek} height={128} />
          ) : (
            <EmptyState
              icon={<BarChart2 className="w-6 h-6" />}
              title="No data yet"
              compact
            />
          )}
        </SectionCard>

        <SectionCard title="Orders by Status" className="lg:col-span-2">
          {loadingSummary ? (
            <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
          ) : (
            <DonutChart segments={donutSegments} size={120} thickness={22} />
          )}
        </SectionCard>
      </div>

      {/* ── Recent Orders DataTable ─────────────────────────────────── */}
      <SectionCard
        title="Recent Orders"
        action={
          <button
            onClick={() => onNavigate?.('orders')}
            className="text-xs text-accent font-semibold hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        }
      >
        <DataTable<Order>
          columns={orderColumns}
          rows={recentOrders}
          loading={loadingOrders}
          emptyMessage="No orders yet — place your first order to get started."
          getRowKey={(o) => o.id}
        />
      </SectionCard>

      {/* ── Activity + Quick Actions Row ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Activity Feed */}
        <SectionCard title="Recent Activity" className="lg:col-span-3">
          {loadingActivity ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 bg-surface-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <EmptyState icon={<Clock className="w-5 h-5" />} title="No activity yet" compact />
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {activity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-muted/50 transition-colors"
                >
                  {/* Status dot */}
                  <div
                    className="mt-1 w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[entry.toStatus] ?? '#94A3B8' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-primary leading-snug">
                      {entry.order?.customer
                        ? `${entry.order.customer.firstName} ${entry.order.customer.lastName}'s `
                        : ''}
                      <span className="font-medium">
                        {entry.order?.garmentType
                          ? entry.order.garmentType.charAt(0) +
                            entry.order.garmentType.slice(1).toLowerCase()
                          : 'Order'}
                      </span>
                      {' moved to '}
                      <span
                        className="font-semibold"
                        style={{ color: STATUS_COLORS[entry.toStatus] }}
                      >
                        {STATUS_CONFIG[entry.toStatus]?.label ?? entry.toStatus}
                      </span>
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {entry.changedBy
                        ? `${entry.changedBy.firstName} ${entry.changedBy.lastName} · `
                        : ''}
                      {new Date(entry.changedAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Right Rail */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Actions */}
          <SectionCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    if (action.id === 'new-order') onNavigate?.('orders');
                    else if (action.id === 'add-customer') onNavigate?.('customers');
                    else if (action.id === 'record-payment') onNavigate?.('billing');
                    else onNavigate?.('reports');
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-xs font-semibold min-h-[72px] transition-colors ${action.color}`}
                >
                  {action.icon}
                  <span className="text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Marketplace Dynamic Status Card */}
          <SectionCard title="Marketplace">
            {marketplaceSettings?.isListedOnMarketplace ? (
              marketplaceSettings.listingStatus === 'APPROVED' ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto text-white shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                    ● Live on Marketplace
                  </div>
                  <p className="text-xs font-semibold text-text-primary">Approved & Discoverable</p>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Your studio is active on the public directory in {marketplaceSettings.city || 'your area'}.
                  </p>
                  <button
                    onClick={() => onNavigate?.('marketplace-settings')}
                    className="w-full text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 py-2 px-3 rounded-lg transition-colors min-h-[36px]"
                  >
                    Manage Storefront →
                  </button>
                </div>
              ) : marketplaceSettings.listingStatus === 'PENDING_REVIEW' ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-500/30 text-center space-y-2">
                  <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center mx-auto text-white shadow-sm">
                    <Clock3 className="w-5 h-5" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                    ● Pending Review
                  </div>
                  <p className="text-xs font-semibold text-text-primary">Submission in Queue</p>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Your marketplace profile is awaiting SuperAdmin verification.
                  </p>
                  <button
                    onClick={() => onNavigate?.('marketplace-settings')}
                    className="w-full text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 py-2 px-3 rounded-lg transition-colors min-h-[36px]"
                  >
                    View Listing Profile →
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-500/30 text-center space-y-2">
                  <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center mx-auto text-white shadow-sm">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                    ● Revision Required
                  </div>
                  <p className="text-xs font-semibold text-text-primary">Changes Requested</p>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {marketplaceSettings.rejectionReason || 'Please review and update your storefront.'}
                  </p>
                  <button
                    onClick={() => onNavigate?.('marketplace-settings')}
                    className="w-full text-xs font-semibold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 py-2 px-3 rounded-lg transition-colors min-h-[36px]"
                  >
                    Update Profile →
                  </button>
                </div>
              )
            ) : (
              <div className="p-4 bg-gradient-to-br from-brand/5 to-accent/5 rounded-xl border border-brand/10 text-center space-y-2">
                <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center mx-auto text-white shadow-sm">
                  <Store className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-text-primary">Grow your reach</p>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  List your shop on the DarziDesk Marketplace and connect with bespoke clients.
                </p>
                <button
                  onClick={() => onNavigate?.('marketplace-settings')}
                  className="w-full text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 py-2 px-3 rounded-lg transition-colors min-h-[36px]"
                >
                  Get Listed on Marketplace →
                </button>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Order Detail Drawer ─────────────────────────────────────── */}
      <Drawer
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        title={
          selectedOrder && (
            <div className="flex items-center gap-2.5">
              <span>ORDER #{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
              <StatusBadge status={selectedOrder.status} size="sm" />
            </div>
          )
        }
        subtitle={
          selectedOrder &&
          `${selectedOrder.garmentType} for ${
            selectedOrder.customer
              ? `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName}`
              : 'Customer'
          }`
        }
      >
        {selectedOrder && (
          <OrderDetailView
            orderId={selectedOrder.id}
            authToken={authToken}
            onOrderUpdated={() => setRefreshTrigger((p) => p + 1)}
          />
        )}
      </Drawer>
    </div>
  );
};
