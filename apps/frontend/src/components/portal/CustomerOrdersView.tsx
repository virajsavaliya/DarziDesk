import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Store,
  Calendar,
  ChevronRight,
  Package,
  Search,
} from 'lucide-react';
import type { CustomerPortalOrder } from '../../types/dashboard';
import { StatusBadge } from '../common/StatusBadge';

interface CustomerOrdersViewProps {
  authToken: string;
  onSelectOrder: (order: CustomerPortalOrder) => void;
  onNavigateToCatalog?: () => void;
}

export const CustomerOrdersView: React.FC<CustomerOrdersViewProps> = ({
  authToken,
  onSelectOrder,
  onNavigateToCatalog,
}) => {
  const [orders, setOrders] = useState<CustomerPortalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'READY' | 'DELIVERED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/orders', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load orders (${res.status})`);
      const json = await res.json();
      setOrders(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading orders');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    // Status filter
    if (statusFilter === 'ACTIVE') {
      if (['DELIVERED', 'CANCELLED'].includes(order.status)) return false;
    } else if (statusFilter === 'READY') {
      if (order.status !== 'READY') return false;
    } else if (statusFilter === 'DELIVERED') {
      if (order.status !== 'DELIVERED') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchShop = order.tenant?.name?.toLowerCase().includes(q);
      const matchGarment = order.garmentType.toLowerCase().includes(q);
      return matchId || matchShop || matchGarment;
    }

    return true;
  });

  const activeCount = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;

  return (
    <div className="space-y-6">
      {/* ── Welcome & KPI Overview Header ──────────────────────────── */}
      <div className="bg-gradient-to-r from-brand to-brand-dark rounded-2xl p-6 text-white shadow-sm border border-brand-dark/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-accent-light text-xs font-semibold uppercase tracking-wider mb-2">
              <ClipboardList className="w-3.5 h-3.5" /> Customer Bespoke Portal
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">My Tailoring Orders</h1>
            <p className="text-sm text-[#B8C7D6] mt-1">
              Track status, delivery schedules, and fittings across all your partner ateliers.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onNavigateToCatalog && (
              <button
                onClick={onNavigateToCatalog}
                className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
              >
                <Store className="w-4 h-4" />
                <span>Order from Shop</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-xs text-[#B8C7D6] block">Total Orders</span>
            <span className="text-xl font-bold text-white font-mono mt-0.5 block">
              {orders.length}
            </span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-xs text-[#B8C7D6] block">In Progress</span>
            <span className="text-xl font-bold text-accent-light font-mono mt-0.5 block">
              {activeCount}
            </span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 col-span-2 sm:col-span-1">
            <span className="text-xs text-[#B8C7D6] block">Ready for Pickup</span>
            <span className="text-xl font-bold text-emerald-400 font-mono mt-0.5 block">
              {readyCount}
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-xl border border-border w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'ACTIVE', 'READY', 'DELIVERED'] as const).map((filter) => {
            const isActive = statusFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-surface text-brand shadow-sm font-bold border border-border'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {filter === 'ALL'
                  ? 'All Orders'
                  : filter === 'ACTIVE'
                  ? 'Active / In Progress'
                  : filter === 'READY'
                  ? 'Ready for Pickup'
                  : 'Delivered'}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by order #, shop, garment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
        </div>
      </div>

      {/* ── Order Cards List ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 bg-surface border border-border rounded-2xl animate-pulse flex items-center justify-between"
            >
              <div className="space-y-2 w-1/2">
                <div className="h-4 bg-surface-muted rounded w-1/3" />
                <div className="h-3 bg-surface-muted rounded w-2/3" />
              </div>
              <div className="h-8 bg-surface-muted rounded-full w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-error-light border border-error/30 rounded-2xl text-error text-sm">
          <p className="font-semibold">Unable to load orders</p>
          <p className="text-xs mt-1">{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-3 px-3 py-1.5 bg-white text-error border border-error/30 rounded-lg text-xs font-semibold shadow-sm"
          >
            Retry
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-text-muted mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text-primary">No orders found</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try changing your search term or status filter.'
              : 'You have not placed any tailoring orders yet. Start your first custom order now!'}
          </p>
          {onNavigateToCatalog && !searchQuery && statusFilter === 'ALL' && (
            <button
              onClick={onNavigateToCatalog}
              className="mt-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white font-semibold text-xs rounded-xl shadow-sm inline-flex items-center gap-2"
            >
              <Store className="w-4 h-4" />
              <span>Browse Fabrics & Order</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="group p-5 bg-surface hover:bg-surface-muted/50 border border-border hover:border-brand-primary/30 rounded-2xl shadow-sm transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-brand/5 border border-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Package className="w-5 h-5 text-brand" />
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand bg-brand/5 px-2 py-0.5 rounded-md">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-sm font-bold text-text-primary capitalize">
                      {order.garmentType.toLowerCase()}
                    </span>
                    <span className="text-xs text-text-muted">•</span>
                    <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-text-muted" />
                      {order.tenant?.name || 'Tailor Atelier'}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary flex flex-wrap items-center gap-3 pt-0.5">
                    {order.fabric && (
                      <span className="text-text-muted">
                        Fabric:{' '}
                        <strong className="text-text-primary font-medium">
                          {order.fabric.name} ({order.fabric.color})
                        </strong>
                      </span>
                    )}
                    {order.estimatedDeliveryDate && (
                      <span className="inline-flex items-center gap-1 text-text-muted">
                        <Calendar className="w-3.5 h-3.5 text-text-muted" />
                        Est. Delivery:{' '}
                        <strong className="text-text-primary font-medium">
                          {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </strong>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right Status & Action */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                <StatusBadge status={order.status} size="sm" />

                <div className="flex items-center text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform">
                  <span>Track Timeline</span>
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
