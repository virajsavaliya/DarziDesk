import React, { useState, useEffect, useCallback } from 'react';
import { Drawer } from '../common/Drawer';
import type { Customer } from '../../types/dashboard';
import { UserCheck, AlertCircle, CheckCircle2, Phone, Mail, User } from 'lucide-react';

interface EditCustomerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  customer: Customer | null;
  onCustomerUpdated: (customer: Customer) => void;
}

export const EditCustomerDrawer: React.FC<EditCustomerDrawerProps> = ({
  isOpen,
  onClose,
  authToken,
  customer,
  onCustomerUpdated,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync state when customer or isOpen changes
  useEffect(() => {
    if (customer && isOpen) {
      setFirstName(customer.firstName || '');
      setLastName(customer.lastName || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setError(null);
      setSuccess(false);
    }
  }, [customer, isOpen]);

  const handleClose = useCallback(() => {
    setError(null);
    setSuccess(false);
    onClose();
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setError(null);

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setError('A valid phone number with at least 8 digits is required.');
      return;
    }

    setLoading(true);

    try {
      const payload: {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string | null;
      } = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/^0+/, '')}`,
      };

      if (email.trim()) {
        payload.email = email.trim();
      } else {
        payload.email = null;
      }

      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || 'Failed to update customer details');
      }

      setSuccess(true);
      onCustomerUpdated(json.data);
      setTimeout(() => {
        handleClose();
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Error updating customer details');
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
          <div className="p-2 bg-accent/10 text-accent rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <span>Edit Customer Details</span>
        </div>
      }
      subtitle={`Update profile information for ${customer ? `${customer.firstName} ${customer.lastName}` : 'customer'}`}
      widthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3.5 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Customer profile updated successfully!</span>
          </div>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              First Name <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="input-edit-customer-firstname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Ramesh"
                className="w-full bg-surface-muted border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                required
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
              id="input-edit-customer-lastname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Patel"
              className="w-full bg-surface-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              required
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Phone Number <span className="text-error">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              id="input-edit-customer-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full bg-surface-muted border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              required
            />
            <Phone className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Unique customer mobile phone number used for SMS and WhatsApp status updates.
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Email Address <span className="text-text-muted font-normal lowercase">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="email"
              id="input-edit-customer-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ramesh@example.com"
              className="w-full bg-surface-muted border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            id="btn-cancel-edit-customer"
            className="px-4 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-muted rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            id="btn-save-customer-changes"
            className="px-5 py-2.5 bg-accent hover:bg-accent-dark active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
};
