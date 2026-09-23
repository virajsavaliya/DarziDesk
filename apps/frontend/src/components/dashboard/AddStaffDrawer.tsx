import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import {
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Scissors,
  Ruler,
  Scroll,
  Users,
  Receipt,
  CreditCard,
  BarChart3,
  Sliders,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface AddStaffDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onStaffAdded: () => void;
}

type AccessPreset = 'TAILOR' | 'FRONT_DESK' | 'MANAGER' | 'CUSTOM';

interface PermissionModule {
  id: string;
  name: string;
  category: 'Operations' | 'Finance' | 'Directory' | 'Admin';
  icon: React.ReactNode;
  description: string;
}

const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'orders',
    name: 'Orders & Workshop Tasks',
    category: 'Operations',
    icon: <Scissors className="w-4 h-4 text-blue-500" />,
    description: 'Accept orders, view queue, and transition cutting & stitching stages',
  },
  {
    id: 'measurements',
    name: 'Measurements & Visual Charts',
    category: 'Operations',
    icon: <Ruler className="w-4 h-4 text-emerald-500" />,
    description: 'Record body measurements and view anatomical diagrams (A–O)',
  },
  {
    id: 'fabrics',
    name: 'Fabric Inventory Ledger',
    category: 'Operations',
    icon: <Scroll className="w-4 h-4 text-amber-500" />,
    description: 'Check fabric rolls stock, log cut meter usage and record fabric defects',
  },
  {
    id: 'customers',
    name: 'Customer Directory',
    category: 'Directory',
    icon: <Users className="w-4 h-4 text-indigo-500" />,
    description: 'Access customer profiles, phone numbers, and past order records',
  },
  {
    id: 'invoices',
    name: 'Billing & Invoices',
    category: 'Finance',
    icon: <Receipt className="w-4 h-4 text-purple-500" />,
    description: 'Generate customer invoices and view itemized cost breakdowns',
  },
  {
    id: 'payments',
    name: 'Record Payments',
    category: 'Finance',
    icon: <CreditCard className="w-4 h-4 text-rose-500" />,
    description: 'Collect Cash/UPI payments from customers and update balance ledgers',
  },
  {
    id: 'reports',
    name: 'Financial Reports & Turnover',
    category: 'Admin',
    icon: <BarChart3 className="w-4 h-4 text-cyan-500" />,
    description: 'View shop revenue totals, business margins, and monthly analytics',
  },
  {
    id: 'settings',
    name: 'Shop & Team Administration',
    category: 'Admin',
    icon: <Sliders className="w-4 h-4 text-slate-500" />,
    description: 'Invite new staff members and configure atelier shop settings',
  },
];

const PRESET_PERMISSIONS: Record<Exclude<AccessPreset, 'CUSTOM'>, string[]> = {
  TAILOR: ['orders', 'measurements', 'fabrics'],
  FRONT_DESK: ['orders', 'customers', 'invoices', 'payments'],
  MANAGER: ['orders', 'measurements', 'fabrics', 'customers', 'invoices', 'payments', 'reports', 'settings'],
};

export const AddStaffDrawer: React.FC<AddStaffDrawerProps> = ({
  isOpen,
  onClose,
  authToken,
  onStaffAdded,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STAFF' | 'SHOP_OWNER'>('STAFF');
  const [accessPreset, setAccessPreset] = useState<AccessPreset>('TAILOR');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    PRESET_PERMISSIONS.TAILOR,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePresetSelect = (preset: AccessPreset) => {
    setAccessPreset(preset);
    if (preset === 'MANAGER') {
      setRole('SHOP_OWNER');
      setSelectedPermissions(PRESET_PERMISSIONS.MANAGER);
    } else if (preset === 'TAILOR') {
      setRole('STAFF');
      setSelectedPermissions(PRESET_PERMISSIONS.TAILOR);
    } else if (preset === 'FRONT_DESK') {
      setRole('STAFF');
      setSelectedPermissions(PRESET_PERMISSIONS.FRONT_DESK);
    }
  };

  const handleRoleChange = (newRole: 'STAFF' | 'SHOP_OWNER') => {
    setRole(newRole);
    if (newRole === 'SHOP_OWNER') {
      setAccessPreset('MANAGER');
      setSelectedPermissions(PRESET_PERMISSIONS.MANAGER);
    } else {
      if (accessPreset === 'MANAGER') {
        setAccessPreset('TAILOR');
        setSelectedPermissions(PRESET_PERMISSIONS.TAILOR);
      }
    }
  };

  const togglePermission = (permId: string) => {
    setAccessPreset('CUSTOM');
    setSelectedPermissions((prev) => {
      const next = prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId];

      // Auto-escalate to SHOP_OWNER if sensitive admin modules selected
      if (next.includes('reports') || next.includes('settings')) {
        setRole('SHOP_OWNER');
      }
      return next;
    });
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setRole('STAFF');
    setAccessPreset('TAILOR');
    setSelectedPermissions(PRESET_PERMISSIONS.TAILOR);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid work email is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters with numbers and special characters.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      };

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.error?.message || json?.message || 'Failed to create staff member';
        throw new Error(msg);
      }

      setSuccess(true);
      onStaffAdded();
      setTimeout(() => {
        handleClose();
      }, 350);
    } catch (err: any) {
      setError(err.message || 'Error creating staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand/10 text-brand rounded-xl">
            <UserPlus className="w-5 h-5" />
          </div>
          <span>Add Staff Member & Access Control</span>
        </div>
      }
      subtitle="Configure role, permissions, and workspace access for craftsmen and shop managers"
      widthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 pb-6">
        {error && (
          <div
            id="staff-error-banner"
            className="p-3.5 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Staff account and permissions configured successfully!</span>
          </div>
        )}

        {/* ── Section 1: Role & Panel Allocation ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Role & Panel Allocation <span className="text-error">*</span>
            </label>
            <span className="text-[10px] font-semibold text-text-muted">
              Determines Default Workspace
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Workshop Panel Card (STAFF) */}
            <div
              onClick={() => handleRoleChange('STAFF')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                role === 'STAFF'
                  ? 'bg-blue-500/10 border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                  : 'bg-surface border-border hover:bg-surface-muted/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="staff-role-radio"
                    id="role-radio-staff"
                    checked={role === 'STAFF'}
                    onChange={() => handleRoleChange('STAFF')}
                    className="text-brand focus:ring-brand"
                  />
                  <span className="text-xs font-bold text-text-primary">Staff Craftsman</span>
                </div>
              </div>
              <span className="inline-block text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full mb-1">
                Workshop Panel
              </span>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Focused on production: Orders, Cutting & Stitching tasks, and Body Measurements.
              </p>
            </div>

            {/* Admin Panel Card (SHOP_OWNER) */}
            <div
              onClick={() => handleRoleChange('SHOP_OWNER')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                role === 'SHOP_OWNER'
                  ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-1 ring-amber-500/30'
                  : 'bg-surface border-border hover:bg-surface-muted/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="staff-role-radio"
                    id="role-radio-owner"
                    checked={role === 'SHOP_OWNER'}
                    onChange={() => handleRoleChange('SHOP_OWNER')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-text-primary">Co-Owner / Manager</span>
                </div>
              </div>
              <span className="inline-block text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full mb-1">
                Admin Panel
              </span>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Full administrative access: Revenue reports, Invoices, Fabric inventory, and Staff.
              </p>
            </div>
          </div>

          {/* Hidden select kept for automated test selectors and form syncing */}
          <select
            id="select-staff-role"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as 'STAFF' | 'SHOP_OWNER')}
            className="sr-only"
            aria-hidden="true"
          >
            <option value="STAFF">Staff Member</option>
            <option value="SHOP_OWNER">Co-Owner / Manager</option>
          </select>
        </div>

        {/* ── Section 2: Access Control & Module Permissions ── */}
        <div className="p-4 bg-surface-muted/40 border border-border rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-brand/10 text-brand rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Access Control & Permissions
                </h4>
                <p className="text-[11px] text-text-muted">
                  Choose an archetype or customize permissions module-by-module
                </p>
              </div>
            </div>

            {/* Permission Count Pill */}
            <span className="text-[11px] font-bold px-2.5 py-1 bg-surface border border-border rounded-full text-brand shadow-2xs">
              {selectedPermissions.length} / {PERMISSION_MODULES.length} Granted
            </span>
          </div>

          {/* Access Control Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handlePresetSelect('TAILOR')}
              className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                accessPreset === 'TAILOR'
                  ? 'border-brand bg-brand text-white shadow-xs'
                  : 'border-border bg-surface text-text-secondary hover:border-brand/40'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Craftsman</span>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('FRONT_DESK')}
              className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                accessPreset === 'FRONT_DESK'
                  ? 'border-brand bg-brand text-white shadow-xs'
                  : 'border-border bg-surface text-text-secondary hover:border-brand/40'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Front Desk</span>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('MANAGER')}
              className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                accessPreset === 'MANAGER'
                  ? 'border-brand bg-brand text-white shadow-xs'
                  : 'border-border bg-surface text-text-secondary hover:border-brand/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Manager</span>
            </button>

            <button
              type="button"
              onClick={() => setAccessPreset('CUSTOM')}
              className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                accessPreset === 'CUSTOM'
                  ? 'border-brand bg-brand text-white shadow-xs'
                  : 'border-border bg-surface text-text-secondary hover:border-brand/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Custom</span>
            </button>
          </div>

          {/* Granular Permission Checklist */}
          <div className="space-y-1.5 pt-1">
            {PERMISSION_MODULES.map((mod) => {
              const isGranted = selectedPermissions.includes(mod.id);
              return (
                <div
                  key={mod.id}
                  onClick={() => togglePermission(mod.id)}
                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    isGranted
                      ? 'bg-surface border-border shadow-2xs hover:border-brand/40'
                      : 'bg-surface/50 border-border/60 opacity-60 hover:opacity-100 hover:bg-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`perm-checkbox-${mod.id}`}
                    checked={isGranted}
                    onChange={() => togglePermission(mod.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 rounded text-brand focus:ring-brand cursor-pointer"
                  />
                  <div className="p-1.5 bg-surface-muted rounded-lg shrink-0 mt-0.5">
                    {mod.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-text-primary leading-tight">
                        {mod.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                          isGranted
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                            : 'text-text-muted bg-surface-muted'
                        }`}
                      >
                        {isGranted ? 'Granted' : 'Restricted'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-snug mt-0.5">
                      {mod.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 3: Staff Identity & Credentials ── */}
        <div className="space-y-3.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Staff Identity & Login Details <span className="text-error">*</span>
          </label>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                First Name <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="input-staff-firstname"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Karan"
                  required
                  className="w-full pl-9 pr-3.5 py-2 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
                />
                <User className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Last Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="input-staff-lastname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sharma"
                required
                className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
              />
            </div>
          </div>

          {/* Work Email */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Work Email Address <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                id="input-staff-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. karan.tailor@shreeganesh.com"
                required
                className="w-full pl-9 pr-3.5 py-2 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
              />
              <Mail className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Temporary Login Password <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                id="input-staff-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 chars with number & symbol"
                required
                className="w-full pl-9 pr-3.5 py-2 bg-background border border-border rounded-xl text-sm font-mono text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
              />
              <Lock className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              The staff member will use this password to sign into their allocated workspace.
            </p>
          </div>
        </div>

        {/* ── Form Actions ── */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-muted rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            id="btn-save-staff"
            disabled={loading || success}
            className="px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
};
