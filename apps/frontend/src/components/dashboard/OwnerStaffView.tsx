import React, { useState, useEffect, useCallback } from 'react';
import { Users2, Briefcase } from 'lucide-react';
import type { StaffMember } from '../../types/dashboard';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';

interface OwnerStaffViewProps {
  authToken: string;
}

export const OwnerStaffView: React.FC<OwnerStaffViewProps> = ({ authToken }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/users returns tenant-scoped users
      const res = await fetch('/api/users?role=STAFF&limit=100', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      setStaffList(json.data ?? []);
    } catch {
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filtered = staffList.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return name.includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Staff Members ${filtered.length > 0 ? `(${filtered.length})` : ''}`}
      >
        {/* Search */}
        <div className="mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name or email…"
            className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[44px]"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users2 className="w-6 h-6" />}
            title="No staff members found"
            description="Add staff members to your shop to manage work assignments."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-3 bg-surface border border-border rounded-xl hover:bg-surface-muted/40 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-brand text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {member.firstName.charAt(0)}
                  {member.lastName.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-text-muted truncate">{member.email}</p>
                </div>

                {/* Role badge */}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-surface-muted text-text-secondary border border-border shrink-0">
                  {member.role === 'SHOP_OWNER' ? 'Owner' : 'Staff'}
                </span>

                {/* Assigned orders count if available */}
                {member._count?.assignedOrders !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs text-text-muted shrink-0">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{member._count.assignedOrders}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};
