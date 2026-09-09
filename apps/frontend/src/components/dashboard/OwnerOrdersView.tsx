import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ArrowRight } from 'lucide-react';
import type { Order, OrderStatus } from '../../types/dashboard';
import { STATUS_CONFIG } from '../../types/dashboard';
import { SectionCard } from '../common/SectionCard';
import { StatusBadge } from '../common/StatusBadge';
import { DataTable, type TableColumn } from '../common/DataTable';
import { Drawer } from '../common/Drawer';
import { OrderDetailView } from './OrderDetailView';

const ALL_STATUSES: OrderStatus[] = [
  'PLACED',
  'MEASUREMENT_CONFIRMED',
  'CUTTING',
  'STITCHING',
  'QUALITY_CHECK',
  'READY',
  'DELIVERED',
  'CANCELLED',
];

interface OwnerOrdersViewProps {
  authToken: string;
}

export const OwnerOrdersView: React.FC<OwnerOrdersViewProps> = ({ authToken }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/orders?sort=estimatedDeliveryDate&order=asc&limit=100';
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      setOrders(json.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [authToken, statusFilter, refreshTrigger]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Client-side search filter
  const filtered = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const custName = o.customer
      ? `${o.customer.firstName} ${o.customer.lastName}`.toLowerCase()
      : '';
    return (
      o.id.toLowerCase().includes(q) ||
      custName.includes(q) ||
      o.garmentType.toLowerCase().includes(q)
    );
  });

  const columns: TableColumn<Order>[] = [
    {
      key: 'id',
      label: 'Order ID',
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
          <div>
            <p className="text-sm font-medium text-text-primary">
              {o.customer.firstName} {o.customer.lastName}
            </p>
            <p className="text-xs text-text-muted">{o.customer.phone}</p>
          </div>
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
      key: 'assignedStaff',
      label: 'Assigned To',
      render: (o) =>
        o.assignedStaff ? (
          <span className="text-sm text-text-secondary">
            {o.assignedStaff.firstName} {o.assignedStaff.lastName}
          </span>
        ) : (
          <span className="text-xs text-text-muted italic">Unassigned</span>
        ),
    },
    {
      key: 'estimatedDeliveryDate',
      label: 'Due Date',
      render: (o) => {
        if (!o.estimatedDeliveryDate) return <span className="text-text-muted">—</span>;
        const due = new Date(o.estimatedDeliveryDate);
        const isOverdue = due < new Date() && !['DELIVERED', 'CANCELLED'].includes(o.status);
        return (
          <span className={`text-xs font-medium ${isOverdue ? 'text-error' : 'text-text-secondary'}`}>
            {due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
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
          className="text-xs text-accent font-semibold hover:underline flex items-center gap-1 min-h-[44px] px-2"
        >
          Manage <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionCard
        title={`All Orders ${filtered.length > 0 ? `(${filtered.length})` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            <span className="text-xs text-text-muted">Filter</span>
          </div>
        }
      >
        {/* Search + Status Filters */}
        <div className="mb-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, order ID, or garment…"
              className="w-full pl-9 pr-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[44px]"
            />
          </div>

          {/* Status pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold min-h-[32px] transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-brand text-white'
                  : 'bg-surface-muted text-text-secondary hover:bg-border'
              }`}
            >
              All
            </button>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold min-h-[32px] transition-colors ${
                  statusFilter === s
                    ? 'bg-brand text-white'
                    : 'bg-surface-muted text-text-secondary hover:bg-border'
                }`}
              >
                {STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        <DataTable<Order>
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyMessage={
            statusFilter !== 'ALL'
              ? `No orders with status "${STATUS_CONFIG[statusFilter]?.label ?? statusFilter}"`
              : 'No orders yet'
          }
          getRowKey={(o) => o.id}
        />
      </SectionCard>

      {/* Order Detail Drawer */}
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
