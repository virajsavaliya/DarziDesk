import React, { useState, useMemo } from 'react';
import type { Order, OrderStatus } from '../../types/dashboard';
import { OrderCard } from './OrderCard';
import { SearchInput } from '../common/SearchInput';
import { SectionCard } from '../common/SectionCard';
import { ClipboardList } from 'lucide-react';

interface StaffWorkQueueProps {
  orders: Order[];
  loading: boolean;
  selectedStatus: OrderStatus | 'ALL';
  onStatusChange: (status: OrderStatus | 'ALL') => void;
  onSelectOrder: (order: Order) => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
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

export const StaffWorkQueue: React.FC<StaffWorkQueueProps> = ({
  orders,
  loading,
  selectedStatus,
  onStatusChange,
  onSelectOrder,
  searchQuery: externalSearch,
  onSearchChange: externalOnSearchChange,
}) => {
  const [internalSearch, setInternalSearch] = useState('');

  const query = externalSearch !== undefined ? externalSearch : internalSearch;
  const setQuery = externalOnSearchChange || setInternalSearch;

  // Client-side quick search by customer name, phone, garment or order ID
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
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
  }, [orders, query]);

  return (
    <SectionCard
      title="My Work"
      subtitle="Orders requiring your active craft and attention"
      action={
        <div className="w-full sm:w-64">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by customer, garment..."
            id="work-queue-search"
          />
        </div>
      }
    >
      {/* ── Status Filter Pills (min 44px touch targets) ─────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {FILTER_PILLS.map((pill) => {
          const isActive = selectedStatus === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => onStatusChange(pill.id)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center ${
                isActive
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-surface-muted text-text-secondary hover:bg-border/70 hover:text-text-primary'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* ── Loading Skeleton ─────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-48 rounded-xl bg-surface-muted border border-border animate-pulse"
            />
          ))}
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────── */}
      {!loading && filteredOrders.length === 0 && (
        <div className="py-16 text-center text-text-muted flex flex-col items-center justify-center bg-background rounded-xl border border-dashed border-border p-6">
          <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center text-text-muted mb-3">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text-primary">No tasks found</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm">
            {query
              ? `No orders matching "${query}". Try adjusting your search or filters.`
              : selectedStatus !== 'ALL'
              ? `No orders currently in "${selectedStatus}" status.`
              : 'You have no assigned orders in your queue today.'}
          </p>
        </div>
      )}

      {/* ── Orders Grid ──────────────────────────────────────── */}
      {!loading && filteredOrders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => onSelectOrder(order)}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
};
