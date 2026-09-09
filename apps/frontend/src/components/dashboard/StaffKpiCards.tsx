import React from 'react';
import type { Order, DailySummary, DemoUser } from '../../types/dashboard';
import { StatCard } from '../common/StatCard';
import { Scissors, Clock, CheckCircle2, AlertTriangle, Layers, UserCheck } from 'lucide-react';

interface StaffKpiCardsProps {
  orders: Order[];
  summary: DailySummary | null;
  currentUser: DemoUser | null;
  loading: boolean;
}

export const StaffKpiCards: React.FC<StaffKpiCardsProps> = ({
  orders,
  summary,
  currentUser,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-surface border border-border rounded-xl p-5 shadow-sm animate-pulse"
          />
        ))}
      </div>
    );
  }

  const completedToday = summary?.completedToday ?? 0;
  const now = new Date();

  // Helper: check if date is today in local comparison
  const isDueToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const activeOrders = orders.filter(
    (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED',
  );

  const dueTodayCount = activeOrders.filter((o) => isDueToday(o.estimatedDeliveryDate)).length;
  const urgentCount = activeOrders.filter((o) => {
    if (!o.estimatedDeliveryDate) return false;
    const diff = (new Date(o.estimatedDeliveryDate).getTime() - now.getTime()) / (1000 * 60 * 60);
    return diff <= 48;
  }).length;

  const roleName = (currentUser?.name || '').toLowerCase();
  const isCutter = roleName.includes('cutter') || roleName.includes('cutting');
  const isTailor = roleName.includes('stitching') || roleName.includes('tailor');

  // Role-specific KPI configuration per Section 8.3:
  // Cutter: Cutting Queue | Urgent Orders | Due Today | Completed
  // Tailor: Stitching Queue | Due Today | QC Pending | Completed
  // General: Assigned Tasks | In Progress | Due Today | Completed
  if (isCutter) {
    const cuttingCount = activeOrders.filter((o) => o.status === 'CUTTING').length;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cutting Queue"
          value={cuttingCount}
          subtext="Ready for pattern cutting"
          variant="brand"
          icon={<Scissors className="w-6 h-6" />}
        />
        <StatCard
          title="Urgent Orders"
          value={urgentCount}
          subtext="Approaching deadline"
          variant="warning"
          icon={<AlertTriangle className="w-6 h-6" />}
        />
        <StatCard
          title="Due Today"
          value={dueTodayCount}
          subtext="Target delivery today"
          variant="accent"
          icon={<Clock className="w-6 h-6" />}
        />
        <StatCard
          title="Completed"
          value={completedToday}
          subtext={`Delivered in ${summary?.timezone || 'Shop Timezone'}`}
          variant="success"
          icon={<CheckCircle2 className="w-6 h-6" />}
        />
      </div>
    );
  }

  if (isTailor) {
    const stitchingCount = activeOrders.filter((o) => o.status === 'STITCHING').length;
    const qcPendingCount = activeOrders.filter((o) => o.status === 'QUALITY_CHECK').length;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Stitching Queue"
          value={stitchingCount}
          subtext="Active at stitching table"
          variant="brand"
          icon={<Scissors className="w-6 h-6" />}
        />
        <StatCard
          title="Due Today"
          value={dueTodayCount}
          subtext="Target delivery today"
          variant="accent"
          icon={<Clock className="w-6 h-6" />}
        />
        <StatCard
          title="QC Pending"
          value={qcPendingCount}
          subtext="Awaiting final check"
          variant="info"
          icon={<Layers className="w-6 h-6" />}
        />
        <StatCard
          title="Completed"
          value={completedToday}
          subtext={`Delivered in ${summary?.timezone || 'Shop Timezone'}`}
          variant="success"
          icon={<CheckCircle2 className="w-6 h-6" />}
        />
      </div>
    );
  }

  // Generic Staff / Helper / Owner KPIs per Section 8.3
  const inProgressCount = activeOrders.filter(
    (o) => o.status !== 'PLACED' && o.status !== 'READY',
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Assigned Tasks"
        value={activeOrders.length}
        subtext="Active in personal queue"
        variant="brand"
        icon={<UserCheck className="w-6 h-6" />}
      />
      <StatCard
        title="In Progress"
        value={inProgressCount}
        subtext="Crafting underway"
        variant="accent"
        icon={<Scissors className="w-6 h-6" />}
      />
      <StatCard
        title="Due Today"
        value={dueTodayCount}
        subtext="Delivery scheduled today"
        variant="warning"
        icon={<Clock className="w-6 h-6" />}
      />
      <StatCard
        title="Completed"
        value={completedToday}
        subtext={`Delivered in ${summary?.timezone || 'Shop Timezone'}`}
        variant="success"
        icon={<CheckCircle2 className="w-6 h-6" />}
      />
    </div>
  );
};
