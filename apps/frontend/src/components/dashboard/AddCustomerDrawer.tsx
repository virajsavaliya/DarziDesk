import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import type { Customer } from '../../types/dashboard';
import { UserPlus, AlertCircle, CheckCircle2, Phone, Mail, User } from 'lucide-react';

interface AddCustomerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onCustomerCreated: (customer: Customer) => void;
}

export const AddCustomerDrawer: React.FC<AddCustomerDrawerProps> = ({
  isOpen,
  onClose,
  authToken,
  onCustomerCreated,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('WALK_IN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setSource('WALK_IN');
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
    if (!phone.trim() || phone.trim().length < 8) {
      setError('A valid phone number with at least 8 digits is required.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/^0+/, '')}`,
        firstInteractionSource: source,
      };

      if (email.trim()) {
        payload.email = email.trim();
      }

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || 'Failed to create customer');
      }

      setSuccess(true);
      onCustomerCreated(json.data);
      setTimeout(() => {
        handleClose();
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Error creating customer');
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
          <span>Add New Customer</span>
        </div>
      }
      subtitle="Register a new customer profile in your tailor shop"
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
            <span>Customer registered successfully!</span>
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
                id="input-customer-firstname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Rahul"
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
              id="input-customer-lastname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Sharma"
              required
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Phone Number <span className="text-error">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              id="input-customer-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210 or +919876543210"
              required
              className="w-full pl-9 pr-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
            />
            <Phone className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Used for WhatsApp / SMS updates and customer portal access.
          </p>
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Email Address <span className="text-text-muted font-normal lowercase">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="email"
              id="input-customer-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@example.com"
              className="w-full pl-9 pr-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
            />
            <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          </div>
        </div>

        {/* Interaction Source */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Customer Source
          </label>
          <select
            id="select-customer-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all cursor-pointer"
          >
            <option value="WALK_IN">Walk-in Customer</option>
            <option value="PHONE">Phone / WhatsApp Inquiry</option>
            <option value="REFERRAL">Referral from existing client</option>
            <option value="MARKETPLACE">DarziDesk Marketplace</option>
          </select>
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
            id="btn-save-customer"
            disabled={loading || success}
            className="px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Save Customer</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
};
