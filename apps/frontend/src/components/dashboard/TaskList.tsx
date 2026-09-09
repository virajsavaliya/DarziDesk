import { useState, useMemo } from 'react';
import type { Order, OrderStatus } from '../../types/dashboard';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  orders: Order[];
  loading: boolean;
  selectedStatus: OrderStatus | 'ALL';
  onStatusChange: (status: OrderStatus | 'ALL') => void;
  onSelectOrder: (order: Order) => void;
}

const FILTER_PILLS: Array<{ id: OrderStatus | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All Tasks' },
  { id: 'PLACED', label: 'Placed' },
  { id: 'MEASUREMENT_CONFIRMED', label: 'Measurement' },
  { id: 'CUTTING', label: 'Cutting' },
  { id: 'STITCHING', label: 'Stitching' },
  { id: 'QUALITY_CHECK', label: 'Quality Check' },
  { id: 'READY', label: 'Ready' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export function TaskList({
  orders,
  loading,
  selectedStatus,
  onStatusChange,
  onSelectOrder,
}: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Client-side quick search by customer name, phone, or order ID
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const customerName = order.customer
        ? `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase()
        : '';
      const phone = order.customer?.phone?.toLowerCase() || '';
      const garment = order.garmentType.toLowerCase();
      const fabric = order.fabric?.name?.toLowerCase() || '';
      const id = order.id.toLowerCase();

      return (
        customerName.includes(q) ||
        phone.includes(q) ||
        garment.includes(q) ||
        fabric.includes(q) ||
        id.includes(q)
      );
    });
  }, [orders, searchQuery]);

  return (
    <div className="space-y-4">
      {/* ── Filter Bar & Quick Search ────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Horizontal scrolling filter pills for tablet / mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {FILTER_PILLS.map((pill) => {
            const active = selectedStatus === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => onStatusChange(pill.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-none ${
                  active
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-surface text-text-secondary border border-border hover:bg-surface-muted hover:text-text-primary'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Search input in task queue */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search task by name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border focus:border-brand focus:ring-1 focus:ring-brand rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted transition-colors outline-none"
          />
          <span className="absolute left-2.5 top-2 text-text-muted text-xs">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1.5 text-text-muted hover:text-text-primary text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Order Grid / List ─────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 bg-surface border border-border rounded-xl p-5 shadow-sm"
            />
          ))}
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <TaskCard
              key={order.id}
              order={order}
              onClick={() => onSelectOrder(order)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mx-auto text-2xl mb-3 text-text-muted">
            📦
          </div>
          <h3 className="text-base font-bold text-text-primary mb-1">No Orders Found</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            {selectedStatus === 'ALL'
              ? 'No active tasks found matching the criteria in your queue.'
              : `No orders in status "${selectedStatus}" found.`}
          </p>
          {selectedStatus !== 'ALL' && (
            <button
              onClick={() => onStatusChange('ALL')}
              className="mt-4 px-4 py-1.5 text-xs font-medium text-brand bg-surface-muted hover:bg-border rounded-lg transition-colors"
            >
              View All Tasks
            </button>
          )}
        </div>
      )}
    </div>
  );
}
