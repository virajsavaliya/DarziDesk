import React, { useState, useEffect } from 'react';
import type { DemoSessionData, DemoUser } from '../../types/dashboard';

interface DemoSessionSwitcherProps {
  currentUser: DemoUser | null;
  onSelectUser: (user: DemoUser) => void;
}

export const DemoSessionSwitcher: React.FC<DemoSessionSwitcherProps> = ({
  currentUser,
  onSelectUser,
}) => {
  // Hard guard: never display demo session switcher in production builds
  if (!import.meta.env.DEV) {
    return null;
  }

  const [sessionData, setSessionData] = useState<DemoSessionData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/dev/demo-session')
      .then((res) => {
        if (!res.ok) throw new Error('Demo endpoint unavailable');
        return res.json();
      })
      .then((json: any) => {
        const data: DemoSessionData = json.data || json;
        setSessionData(data);
        // If no user selected yet, default to first user (Owner or Staff)
        if (!currentUser && data.users?.length > 0) {
          onSelectUser(data.users[0]);
        }
      })
      .catch((err) => {
        console.warn('Dev demo session endpoint unreachable:', err);
      });
  }, []);

  if (!sessionData || sessionData.users.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-block text-[11px] uppercase tracking-wider text-text-muted font-bold">
          Demo Session:
        </span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 text-xs font-semibold text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          aria-expanded={open}
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>
            {currentUser
              ? `${currentUser.name} (${
                  currentUser.role === 'SHOP_OWNER'
                    ? 'Owner'
                    : currentUser.role === 'SUPER_ADMIN'
                    ? 'Admin'
                    : currentUser.role === 'CUSTOMER'
                    ? 'Customer'
                    : 'Staff'
                })`
              : 'Select User'}
          </span>
          <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-xl shadow-xl bg-surface border border-border ring-1 ring-black/5 z-50 p-2">
            <div className="px-3 py-2 border-b border-border/60">
              <p className="text-xs font-bold text-text-primary">Switch Persona (Dev Mode)</p>
              <p className="text-[11px] text-text-muted">
                Shop: {sessionData.tenant.name}
              </p>
            </div>
            <div className="py-1 space-y-1">
              {sessionData.users.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-accent/15 text-accent font-bold'
                        : 'text-text-primary hover:bg-background font-medium'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-[10px] text-text-muted">{u.email}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'SHOP_OWNER'
                          ? 'bg-brand/20 text-brand'
                          : u.role === 'SUPER_ADMIN'
                          ? 'bg-purple-500/20 text-purple-400'
                          : u.role === 'CUSTOMER'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-text-muted/15 text-text-secondary'
                      }`}
                    >
                      {u.role === 'SHOP_OWNER'
                        ? 'OWNER'
                        : u.role === 'SUPER_ADMIN'
                        ? 'ADMIN'
                        : u.role === 'CUSTOMER'
                        ? 'CLIENT'
                        : 'STAFF'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
