import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { UserPlus, AlertCircle, CheckCircle2, Lock, Mail, User, Shield } from 'lucide-react';

interface AddStaffDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onStaffAdded: () => void;
}

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
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
        // Specific error message from backend entitlement or validation
        const msg = json?.error?.message || json?.message || 'Failed to create staff member';
        throw new Error(msg);
      }

      setSuccess(true);
      onStaffAdded();
      setTimeout(() => {
        handleClose();
      }, 300);
    } catch (err: any) {
      // Surface exact backend error message (e.g. "Staff limit reached (X/Y) for your Plan plan")
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
          <span>Add Staff Member</span>
        </div>
      }
      subtitle="Invite and create accounts for tailors, cutters, and masters"
      widthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            <span>Staff account created successfully!</span>
          </div>
        )}

        {/* Role information */}
        <div className="p-3 bg-surface-muted border border-border rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
            <Shield className="w-4 h-4 text-brand" />
            <span>Account Role</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-brand/10 text-brand border border-brand/20">
            STAFF
          </span>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
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
                className="w-full pl-9 pr-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
              />
              <User className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Last Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="input-staff-lastname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Sharma"
              required
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
            />
          </div>
        </div>

        {/* Work Email */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
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
              className="w-full pl-9 pr-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
            />
            <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
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
              className="w-full pl-9 pr-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
            />
            <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            The staff member will use this password to log in under your shop URL.
          </p>
        </div>

        {/* Form Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-background rounded-xl transition-all"
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
                <span>Creating Staff...</span>
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
