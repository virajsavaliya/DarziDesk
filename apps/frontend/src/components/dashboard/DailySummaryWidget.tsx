import type { DailySummary } from '../../types/dashboard';

interface DailySummaryWidgetProps {
  summary: DailySummary | null;
  loading: boolean;
}

export function DailySummaryWidget({ summary, loading }: DailySummaryWidgetProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-surface border border-border rounded-xl p-4 shadow-sm"
          />
        ))}
      </div>
    );
  }

  const completedToday = summary?.completedToday ?? 0;
  const pendingCount = summary?.pendingCount ?? 0;
  const dueNext48Hours = summary?.dueNext48Hours ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* ── Completed Today ─────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Completed Today
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary mt-1">
            {completedToday}
          </p>
          <span className="text-xs text-text-secondary mt-0.5 block">
            Delivered in {summary?.timezone || 'Shop Timezone'}
          </span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center font-bold text-xl">
          ✓
        </div>
      </div>

      {/* ── Pending Tasks ────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Pending Tasks
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary mt-1">
            {pendingCount}
          </p>
          <span className="text-xs text-text-secondary mt-0.5 block">
            Active in workshop queue
          </span>
        </div>
        <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-xl">
          ✂
        </div>
      </div>

      {/* ── Due Within 48 Hours ─────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Due Within 48 Hours
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary mt-1">
            {dueNext48Hours}
          </p>
          <span className="text-xs text-text-secondary mt-0.5 block">
            {dueNext48Hours > 0 ? 'Urgent / approaching deadline' : 'All delivery schedules on track'}
          </span>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
          dueNext48Hours > 0 ? 'bg-warning-light text-warning' : 'bg-surface-muted text-text-muted'
        }`}>
          ⏱
        </div>
      </div>
    </div>
  );
}
