import React from 'react';

export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Hide column on tablet portrait (<1024px) to preserve density */
  hideOnTablet?: boolean;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyMessage?: string;
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Optional custom mobile card renderer for screens < 768px */
  mobileCardRender?: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  emptyMessage = 'No data to display',
  getRowKey,
  onRowClick,
  mobileCardRender,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-xl bg-surface-muted animate-pulse"
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-text-muted text-sm bg-surface rounded-2xl border border-dashed border-border p-6">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile Card View (< 768px) ────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => {
          const key = getRowKey(row);
          if (mobileCardRender) {
            return (
              <div key={key} onClick={() => onRowClick?.(row)}>
                {mobileCardRender(row)}
              </div>
            );
          }

          // Default auto-generated card for tables without custom card renderer
          return (
            <div
              key={key}
              onClick={() => onRowClick?.(row)}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              className={`p-4 bg-surface rounded-2xl border border-border shadow-2xs space-y-2.5 transition-all ${
                onRowClick ? 'active:scale-[0.99] cursor-pointer hover:border-brand/40' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="font-bold text-sm text-text-primary">
                  {columns[0]?.render
                    ? columns[0].render(row)
                    : String((row as Record<string, unknown>)[columns[0]?.key] ?? '—')}
                </div>
                {columns.find((c) => c.key.toLowerCase().includes('status')) && (
                  <div>
                    {columns
                      .find((c) => c.key.toLowerCase().includes('status'))
                      ?.render?.(row)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {columns.slice(1).map((col) => {
                  if (col.key.toLowerCase().includes('status') || col.key === 'actions') {
                    return null;
                  }
                  return (
                    <div key={col.key} className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block">
                        {col.label}
                      </span>
                      <div className="text-text-secondary font-medium">
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action column at bottom if present */}
              {columns.find((c) => c.key === 'actions') && (
                <div className="pt-2 border-t border-border/50 flex justify-end">
                  {columns.find((c) => c.key === 'actions')?.render?.(row)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Tablet & Desktop Tabular View (>= 768px) ──────────────── */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface-muted/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3.5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap ${
                    col.hideOnTablet ? 'hidden lg:table-cell' : ''
                  } ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row, idx) => (
              <tr
                key={getRowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors hover:bg-surface-muted/60 ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${idx % 2 === 0 ? '' : 'bg-surface-muted/20'}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3.5 py-3 text-text-primary whitespace-nowrap ${
                      col.hideOnTablet ? 'hidden lg:table-cell' : ''
                    } ${col.className ?? ''}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
