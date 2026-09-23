import React, { useState, useEffect } from 'react';
import {
  Database,
  Layers,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  KeyRound,
  Eye,
  AlertTriangle,
} from 'lucide-react';

interface SubsystemHealth {
  status: 'OPERATIONAL' | 'DEGRADED';
  database: {
    status: 'CONNECTED' | 'DOWN';
    latencyMs: number;
  };
  outboxQueue: {
    pending: number;
    deadLetter: number;
    healthy: boolean;
  };
  supportSessions: {
    activeCount: number;
  };
  timestamp: string;
}

interface DeadLetterEvent {
  id: string;
  tenantId: string;
  aggregateType: string;
  aggregateId?: string | null;
  eventType: string;
  attempts: number;
  lastError?: string | null;
  payload: any;
  createdAt: string;
}

interface SuperAdminOperationsViewProps {
  authToken: string;
}

export const SuperAdminOperationsView: React.FC<SuperAdminOperationsViewProps> = ({
  authToken,
}) => {
  const [health, setHealth] = useState<SubsystemHealth | null>(null);
  const [deadLetters, setDeadLetters] = useState<DeadLetterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [inspectEvent, setInspectEvent] = useState<DeadLetterEvent | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const [healthRes, dlRes] = await Promise.all([
        fetch('/api/admin/operations/health', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch('/api/admin/operations/dead-letters', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (healthRes.ok) {
        const json = await healthRes.json();
        setHealth(json.data);
      } else {
        throw new Error(`Failed to retrieve subsystem health (${healthRes.status})`);
      }

      if (dlRes.ok) {
        const json = await dlRes.json();
        const rawList = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.data)
          ? json.data.data
          : Array.isArray(json)
          ? json
          : [];
        setDeadLetters(rawList);
      } else {
        setDeadLetters([]);
      }
    } catch (err: any) {
      console.error('Failed to load operations status:', err);
      setError(err.message || 'Unable to connect to operations backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [authToken]);

  const handleReplay = async (id: string) => {
    try {
      setReplayingId(id);
      const res = await fetch(`/api/admin/operations/dead-letters/${id}/replay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to trigger replay:', err);
    } finally {
      setReplayingId(null);
    }
  };

  if (loading && !health) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm text-stone-500 font-medium">Loading system operations status...</p>
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="text-base font-semibold text-red-900">Failed to Load Operations Status</h3>
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchStatus}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">System Operations & Health</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                health?.status === 'OPERATIONAL'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {health?.status || 'CHECKING'}
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Real-time infrastructure health, transactional outbox reliability, and dead-letter queue recovery.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-lg transition shadow-xs cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* ── Subsystem Health Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Database Connectivity */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">PostgreSQL Primary</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health?.database?.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              {health?.database?.status === 'CONNECTED' ? 'Operational' : 'Unavailable'}
            </div>
            <div className="text-xs text-stone-500 mt-1 font-mono">
              Latency: {health?.database?.latencyMs ?? 0}ms roundtrip
            </div>
          </div>
        </div>

        {/* Transactional Outbox Queue */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Transactional Outbox</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health?.outboxQueue?.healthy ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {health?.outboxQueue?.healthy ? 'Queue Healthy' : 'Action Needed'}
            </div>
            <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
              <span>Pending: <strong>{health?.outboxQueue?.pending ?? 0}</strong></span>
              <span>•</span>
              <span className={health?.outboxQueue?.deadLetter ? 'text-amber-600 font-bold' : ''}>
                Dead Letter: <strong>{health?.outboxQueue?.deadLetter ?? 0}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Active Support Sessions */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Support Access</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-900">
              {health?.supportSessions?.activeCount ?? 0} Active Session(s)
            </div>
            <div className="text-xs text-stone-500 mt-1">
              Time-limited, audited tenant access
            </div>
          </div>
        </div>
      </div>

      {/* ── Dead-Letter Outbox Recovery Queue ──────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900">Dead-Letter Outbox Queue</h3>
            <p className="text-xs text-stone-500">
              Events that failed after 5 retry attempts. Inspect error payloads and replay on demand.
            </p>
          </div>
          <span className="text-xs text-stone-500 font-mono">
            {Array.isArray(deadLetters) ? deadLetters.length : 0} Unresolved
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          {!Array.isArray(deadLetters) || deadLetters.length === 0 ? (
            <div className="p-10 text-center text-stone-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-stone-900">Zero Dead-Letter Events</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-0.5">
                All transactional outbox events have been processed and dispatched successfully.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Aggregate</th>
                    <th className="py-3 px-4">Attempts</th>
                    <th className="py-3 px-4">Last Error</th>
                    <th className="py-3 px-4">Failed At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {(Array.isArray(deadLetters) ? deadLetters : []).map((event) => (
                    <tr key={event.id} className="hover:bg-stone-50/60 transition text-xs">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {event.eventType}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-stone-600">
                        {event.aggregateType} ({event.aggregateId ? event.aggregateId.slice(0, 8) + '...' : 'N/A'})
                      </td>

                      <td className="py-3 px-4 font-semibold text-stone-800">
                        {event.attempts} / 5
                      </td>

                      <td className="py-3 px-4 max-w-xs truncate text-rose-600" title={event.lastError || ''}>
                        {event.lastError || 'Unknown execution error'}
                      </td>

                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => setInspectEvent(event)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-brand bg-stone-100 hover:bg-brand/10 px-2.5 py-1 rounded-lg transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Payload
                        </button>

                        <button
                          onClick={() => handleReplay(event.id)}
                          disabled={replayingId === event.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${replayingId === event.id ? 'animate-spin' : ''}`} />
                          Replay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Event Detail Modal ────────────────────────────────────── */}
      {inspectEvent && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                Outbox Event: <span className="font-mono text-sm text-rose-700">{inspectEvent.eventType}</span>
              </h3>
              <button
                onClick={() => setInspectEvent(null)}
                className="text-stone-400 hover:text-stone-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-red-900">
                <span className="font-semibold block mb-0.5">Failure Stack / Reason:</span>
                <p className="font-mono text-[11px] break-all">{inspectEvent.lastError || 'No error message captured'}</p>
              </div>

              <div>
                <span className="font-semibold text-stone-700 block mb-1">Event Payload:</span>
                <pre className="bg-stone-900 text-stone-100 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 border border-stone-800">
                  {JSON.stringify(inspectEvent.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setInspectEvent(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleReplay(inspectEvent.id);
                  setInspectEvent(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs font-bold rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Replay Event Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
