import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, Clock, Eye, Edit3 } from 'lucide-react';

export interface StoredSupportSession {
  token: string;
  session: {
    id: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    reason: string;
    scope: 'READ_ONLY' | 'READ_WRITE';
    expiresAt: string;
  };
}

export function getSupportSession(): StoredSupportSession | null {
  try {
    const raw = localStorage.getItem('darzi_support_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.token || !parsed.session) return null;
    if (new Date(parsed.session.expiresAt).getTime() <= Date.now()) {
      clearSupportSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSupportSession(data: StoredSupportSession) {
  localStorage.setItem('darzi_support_session', JSON.stringify(data));
  localStorage.setItem('darzi_support_token', data.token);
  window.dispatchEvent(new Event('support_session_updated'));
}

export function clearSupportSession() {
  localStorage.removeItem('darzi_support_session');
  localStorage.removeItem('darzi_support_token');
  window.dispatchEvent(new Event('support_session_updated'));
}

export const SupportModeBanner: React.FC = () => {
  const [sessionData, setSessionData] = useState<StoredSupportSession | null>(getSupportSession());
  const [timeLeft, setTimeLeft] = useState<string>('');

  const syncSession = () => {
    setSessionData(getSupportSession());
  };

  useEffect(() => {
    window.addEventListener('support_session_updated', syncSession);
    window.addEventListener('storage', syncSession);

    const interval = setInterval(() => {
      const current = getSupportSession();
      if (!current) {
        setSessionData(null);
        return;
      }
      const diff = new Date(current.session.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        clearSupportSession();
        setSessionData(null);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
      }
    }, 1000);

    return () => {
      window.removeEventListener('support_session_updated', syncSession);
      window.removeEventListener('storage', syncSession);
      clearInterval(interval);
    };
  }, []);

  if (!sessionData) return null;

  const { session } = sessionData;
  const isReadOnly = session.scope === 'READ_ONLY';

  const handleExit = () => {
    if (window.confirm(`Exit support mode for ${session.tenantName}?`)) {
      clearSupportSession();
      window.location.href = '/admin/support-sessions';
    }
  };

  return (
    <div
      role="alert"
      className="bg-amber-500 text-amber-950 px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm font-medium z-50 border-b border-amber-600 sticky top-0"
    >
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="flex items-center gap-1.5 bg-amber-950 text-amber-100 font-bold px-2 py-0.5 rounded uppercase tracking-wider text-[11px]">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          Support Session Active
        </span>

        <span className="text-amber-950 font-semibold">
          Tenant: <span className="underline decoration-amber-700">{session.tenantName}</span> ({session.tenantSlug})
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
            isReadOnly
              ? 'bg-blue-100 text-blue-900 border border-blue-300'
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}
        >
          {isReadOnly ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
          {session.scope} {isReadOnly ? '(Safe Read-Only)' : '(Elevated Write Access)'}
        </span>

        <span className="text-amber-900/80 hidden lg:inline max-w-sm truncate" title={session.reason}>
          Reason: "{session.reason}"
        </span>
      </div>

      <div className="flex items-center gap-3">
        {timeLeft && (
          <span className="flex items-center gap-1 bg-amber-600/30 px-2 py-0.5 rounded text-amber-950 font-mono text-xs">
            <Clock className="w-3.5 h-3.5" />
            Expires in {timeLeft}
          </span>
        )}

        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 bg-amber-950 hover:bg-black text-white px-3 py-1 rounded text-xs font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit Support Mode
        </button>
      </div>
    </div>
  );
};
