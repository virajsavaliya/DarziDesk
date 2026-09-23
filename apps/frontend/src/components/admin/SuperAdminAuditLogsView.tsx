import React, { useState, useEffect } from 'react';
import {
  FileText,
  Filter,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  actorUserId?: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  tenantId?: string | null;
  tenant?: { id: string; name: string; slug: string } | null;
  supportSessionId?: string | null;
  beforeData?: any;
  afterData?: any;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

interface SuperAdminAuditLogsViewProps {
  authToken: string;
}

export const SuperAdminAuditLogsView: React.FC<SuperAdminAuditLogsViewProps> = ({
  authToken,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterTargetType, setFilterTargetType] = useState('');

  // Selected for inspection modal
  const [inspectEntry, setInspectEntry] = useState<AuditLogEntry | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filterAction) params.append('action', filterAction);
      if (filterTargetType) params.append('targetType', filterTargetType);

      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
        setTotal(json.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [authToken, page, filterAction, filterTargetType]);

  const totalPages = Math.ceil(total / limit) || 1;

  const getActionBadgeClass = (action: string) => {
    if (action.includes('SUSPEND') || action.includes('REVOKE') || action.includes('DELETE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('REACTIVATE') || action.includes('CREATE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('SUPPORT')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-stone-100 text-stone-700 border-stone-200';
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Platform Audit Logs</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Immutable Trail
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Tamper-evident, sanitized administrative event stream. All sensitive credentials are automatically redacted.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-lg transition shadow-xs cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </div>

        <div>
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-stone-200 rounded-xl px-3 py-1.5 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="">All Actions</option>
            <option value="TENANT_SUSPENDED">TENANT_SUSPENDED</option>
            <option value="TENANT_REACTIVATED">TENANT_REACTIVATED</option>
            <option value="SUPPORT_SESSION_CREATED">SUPPORT_SESSION_CREATED</option>
            <option value="SUPPORT_SESSION_REVOKED">SUPPORT_SESSION_REVOKED</option>
            <option value="FEATURE_FLAG_CREATED">FEATURE_FLAG_CREATED</option>
            <option value="FEATURE_FLAG_UPDATED">FEATURE_FLAG_UPDATED</option>
            <option value="TENANT_FEATURE_OVERRIDE_SET">TENANT_FEATURE_OVERRIDE_SET</option>
          </select>
        </div>

        <div>
          <select
            value={filterTargetType}
            onChange={(e) => {
              setFilterTargetType(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-stone-200 rounded-xl px-3 py-1.5 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="">All Target Types</option>
            <option value="TENANT">TENANT</option>
            <option value="SUPPORT_SESSION">SUPPORT_SESSION</option>
            <option value="FEATURE_FLAG">FEATURE_FLAG</option>
            <option value="SUBSCRIPTION">SUBSCRIPTION</option>
            <option value="ORDER">ORDER</option>
          </select>
        </div>

        {(filterAction || filterTargetType) && (
          <button
            onClick={() => {
              setFilterAction('');
              setFilterTargetType('');
              setPage(1);
            }}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition cursor-pointer"
          >
            Clear Filters
          </button>
        )}

        <div className="ml-auto text-xs text-stone-500">
          Total Recorded Events: <strong className="text-stone-800">{total}</strong>
        </div>
      </div>

      {/* ── Logs Table / Mobile List ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Mobile Card List (< 768px) */}
        <div className="md:hidden divide-y divide-stone-100">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs">
              No audit records matching the specified filters.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 space-y-2.5 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getActionBadgeClass(
                      log.action,
                    )}`}
                  >
                    {log.action}
                  </span>
                  <div className="text-right text-[11px] font-mono text-stone-500">
                    <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-stone-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="font-semibold text-stone-900">{log.actorRole}</span>
                    <span className="text-stone-400 font-mono text-[11px] ml-1.5">
                      {log.actorUserId ? log.actorUserId.slice(0, 8) + '...' : 'System'}
                    </span>
                  </div>
                  <div className="text-right text-stone-600 font-medium">
                    {log.tenant ? log.tenant.name : log.targetType}
                  </div>
                </div>

                {log.reason && (
                  <p className="text-xs text-stone-600 italic bg-stone-50 p-2 rounded-lg border border-stone-100">
                    "{log.reason}"
                  </p>
                )}

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setInspectEntry(log)}
                    className="min-h-[36px] inline-flex items-center gap-1 text-xs font-bold text-stone-700 hover:text-brand bg-stone-100 hover:bg-brand/10 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Reason / Details</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">
                    No audit records matching the specified filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/60 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-stone-700">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getActionBadgeClass(
                          log.action,
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-stone-900">{log.actorRole}</div>
                      <div className="text-[11px] text-stone-500 font-mono truncate max-w-[120px]" title={log.actorUserId || ''}>
                        {log.actorUserId ? log.actorUserId.slice(0, 8) + '...' : 'System'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-stone-900">
                        {log.targetType}
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono truncate max-w-[140px]">
                        {log.tenant ? log.tenant.name : log.targetId?.slice(0, 8) + '...'}
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-sm">
                      <div className="text-xs text-stone-700 truncate" title={log.reason || ''}>
                        {log.reason ? `"${log.reason}"` : <span className="text-stone-400 italic">No notes</span>}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectEntry(log)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-brand bg-stone-100 hover:bg-brand/10 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-stone-200 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-stone-200 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Inspection Modal ──────────────────────────────────────── */}
      {inspectEntry && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90dvh] flex flex-col shadow-2xl border border-stone-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand" />
                <h3 className="text-base font-bold text-stone-900">
                  Audit Record: <span className="font-mono text-sm text-brand">{inspectEntry.action}</span>
                </h3>
              </div>
              <button
                onClick={() => setInspectEntry(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-600 text-sm font-semibold cursor-pointer"
                aria-label="Close audit inspection dialog"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs text-stone-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <span className="text-stone-500">Record ID:</span>
                  <div className="font-mono font-medium text-stone-900 break-all">{inspectEntry.id}</div>
                </div>
                <div>
                  <span className="text-stone-500">Timestamp:</span>
                  <div className="font-mono font-medium text-stone-900">
                    {new Date(inspectEntry.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-stone-500">Actor Role / User ID:</span>
                  <div className="font-mono text-stone-900">{inspectEntry.actorRole} ({inspectEntry.actorUserId || 'System'})</div>
                </div>
                <div>
                  <span className="text-stone-500">Target Type / ID:</span>
                  <div className="font-mono text-stone-900">{inspectEntry.targetType}: {inspectEntry.targetId || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-stone-500">Client IP Address:</span>
                  <div className="font-mono text-stone-900">{inspectEntry.ipAddress || 'Internal'}</div>
                </div>
                <div>
                  <span className="text-stone-500">Support Session ID:</span>
                  <div className="font-mono text-stone-900">{inspectEntry.supportSessionId || 'None'}</div>
                </div>
              </div>

              {inspectEntry.reason && (
                <div className="bg-amber-50/50 border border-amber-200 p-3 rounded-xl">
                  <span className="font-semibold text-amber-900">Business Justification:</span>
                  <p className="mt-1 text-amber-800">{inspectEntry.reason}</p>
                </div>
              )}

              {/* Snapshot State */}
              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  State Transition Snapshot (Sanitized)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-stone-500 font-semibold block mb-1">Before Data:</span>
                    <pre className="bg-stone-900 text-stone-100 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 border border-stone-800">
                      {inspectEntry.beforeData
                        ? JSON.stringify(inspectEntry.beforeData, null, 2)
                        : '// null (New Resource Creation)'}
                    </pre>
                  </div>

                  <div>
                    <span className="text-stone-500 font-semibold block mb-1">After Data:</span>
                    <pre className="bg-stone-900 text-stone-100 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 border border-stone-800">
                      {inspectEntry.afterData
                        ? JSON.stringify(inspectEntry.afterData, null, 2)
                        : '// null (Deleted Resource)'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setInspectEntry(null)}
                className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
