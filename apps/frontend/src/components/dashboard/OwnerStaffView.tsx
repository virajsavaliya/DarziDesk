import React, { useState, useEffect, useCallback } from 'react';
import { Users2, Briefcase, UserPlus, Trash2, AlertCircle, CheckCircle2, Scissors, ShieldCheck, X } from 'lucide-react';
import type { StaffMember } from '../../types/dashboard';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';
import { AddStaffDrawer } from './AddStaffDrawer';

interface OwnerStaffViewProps {
  authToken: string;
}

export const OwnerStaffView: React.FC<OwnerStaffViewProps> = ({ authToken }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/users returns tenant-scoped users
      const res = await fetch('/api/users?limit=100', {
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

  const handleRoleChange = async (userId: string, newRole: 'STAFF' | 'SHOP_OWNER') => {
    setUpdatingRoleId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to update role');
      }
      setStaffList((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m)),
      );
      setSuccessMessage('Staff role updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/users/${memberToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to delete staff member');
      }
      setStaffList((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      setMemberToDelete(null);
      setSuccessMessage('Staff member removed successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete staff member');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = staffList.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return name.includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Panel Allocation Matrix & Guide Banner ───────────── */}
      <div className="p-4 bg-gradient-to-r from-surface-muted/80 via-surface to-surface-muted/80 border border-border rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand/10 text-brand rounded-lg">
              <Users2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-text-primary">Staff Workspace & Panel Allocation Matrix</h3>
          </div>
          <span className="text-[11px] font-medium text-text-muted bg-surface px-2.5 py-1 rounded-full border border-border">
            Role-Based Access Control
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Every team member is allocated a specialized panel upon login based on their assigned role. 
          Use this to configure permissions between your workshop craftsmen and shop managers:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Workshop Panel Info Card */}
          <div className="p-3 bg-surface border border-border rounded-xl space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-bold">
                <Scissors className="w-3.5 h-3.5" />
                <span>Tailoring Workshop Panel</span>
              </span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-surface-muted text-text-secondary">
                STAFF Role
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Allocated to tailors, cutting masters, and finishing artisans.
            </p>
            <div className="pt-1 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-muted rounded text-text-secondary">Tasks Queue</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-muted rounded text-text-secondary">Order Execution</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-muted rounded text-text-secondary">Customer Measurements</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-red-500/10 text-red-600 rounded">Invoices Hidden</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-red-500/10 text-red-600 rounded">Revenue Restricted</span>
            </div>
          </div>

          {/* Admin Panel Info Card */}
          <div className="p-3 bg-surface border border-border rounded-xl space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Shop Owner Admin Panel</span>
              </span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-surface-muted text-text-secondary">
                OWNER Role
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Allocated to shop owners and senior executive managers.
            </p>
            <div className="pt-1 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-muted rounded text-text-secondary">All 11 Modules</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-muted rounded text-text-secondary">Revenue & Reports</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-muted rounded text-text-secondary">Billing & Invoices</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-muted rounded text-text-secondary">Fabric Roll Ledger</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-muted rounded text-text-secondary">Staff Management</span>
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        title={`Staff Members ${filtered.length > 0 ? `(${filtered.length})` : ''}`}
        action={
          <button
            type="button"
            id="btn-add-staff"
            onClick={() => setIsAddStaffOpen(true)}
            className="min-h-[38px] px-3.5 py-1.5 bg-brand text-white font-bold text-xs rounded-xl hover:bg-brand-dark active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Staff Member</span>
          </button>
        }
      >
        {/* Search */}
        <div className="mb-4">
          <input
            id="search-staff-input"
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
          <div className="space-y-2.5">
            {filtered.map((member) => (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-surface border border-border rounded-xl hover:bg-surface-muted/40 transition-colors"
              >
                {/* Left: Avatar & Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                    {member.firstName.charAt(0)}
                    {member.lastName.charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-text-muted truncate">{member.email}</p>
                  </div>
                </div>

                {/* Center / Right: Allocated Panel Badge & Role Selector & Actions */}
                <div className="flex flex-wrap items-center gap-3 shrink-0 sm:justify-end">
                  {/* Allocated Panel Badge */}
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Allocated Panel
                    </span>
                    {member.role === 'SHOP_OWNER' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Shop Owner Admin Panel</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-lg">
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Tailoring Workshop Panel</span>
                      </span>
                    )}
                  </div>

                  {/* Role Selector */}
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      System Role
                    </span>
                    {member.role === 'SHOP_OWNER' ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-brand/10 text-brand border border-brand/20">
                        Owner
                      </span>
                    ) : (
                      <select
                        id={`select-role-${member.id}`}
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.id, e.target.value as 'STAFF' | 'SHOP_OWNER')
                        }
                        disabled={updatingRoleId === member.id}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-surface border border-border text-text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand/40 transition-colors"
                        title="Change staff role to reallocate their workspace panel"
                      >
                        <option value="STAFF">Staff (Allocates Workshop Panel)</option>
                        <option value="SHOP_OWNER">Owner (Allocates Admin Panel)</option>
                      </select>
                    )}
                  </div>

                  {/* Assigned orders count if available */}
                  {member._count?.assignedOrders !== undefined && (
                    <div
                      className="flex items-center gap-1.5 text-xs text-text-muted px-2 py-1 bg-surface-muted rounded-lg border border-border/50"
                      title="Assigned orders in production"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-text-secondary" />
                      <span className="font-semibold">{member._count.assignedOrders}</span>
                      <span className="text-[10px] hidden sm:inline">orders</span>
                    </div>
                  )}

                  {/* Delete button */}
                  {member.role === 'STAFF' ? (
                    <button
                      type="button"
                      id={`btn-delete-staff-${member.id}`}
                      onClick={() => {
                        setDeleteError(null);
                        setMemberToDelete(member);
                      }}
                      className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-colors shrink-0"
                      title="Delete staff member and revoke panel access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Add Staff Drawer ───────────────────────────────── */}
      <AddStaffDrawer
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        authToken={authToken}
        onStaffAdded={fetchStaff}
      />

      {/* ── Delete Confirmation Dialog ──────────────────────── */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => !deleting && setMemberToDelete(null)}
          />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Delete Staff Member</h3>
                <p className="text-xs text-text-muted">Remove access from your shop</p>
              </div>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-text-primary">
                {memberToDelete.firstName} {memberToDelete.lastName}
              </span>{' '}
              (<span className="font-mono text-xs">{memberToDelete.email}</span>) from your
              shop? They will no longer have access to DarziDesk.
            </p>

            {deleteError && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                id="cancel-delete-staff-btn"
                disabled={deleting}
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-muted rounded-xl transition-colors min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-staff-btn"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-error hover:bg-red-700 active:scale-[0.98] rounded-xl transition-all flex items-center gap-1.5 shadow-sm min-h-[38px] disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Staff</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
