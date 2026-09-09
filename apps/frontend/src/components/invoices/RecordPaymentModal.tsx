import React, { useState } from 'react';
import { X, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Invoice, PaymentMethod } from '../../types/dashboard';

interface RecordPaymentModalProps {
  invoice: Invoice;
  authToken: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (updatedInvoice: Invoice) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  authToken,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const [amount, setAmount] = useState<string>(invoice.balanceDue);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const maxAmount = Number(invoice.balanceDue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (numAmount > maxAmount) {
      setError(`Amount cannot exceed the balance due of ₹${maxAmount.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: numAmount.toFixed(2),
          paymentMethod,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to record payment');
      }

      onPaymentSuccess(data.data.invoice);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-surface-card border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-muted/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">Record Payment</h3>
              <p className="text-xs text-text-muted">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Balance Due Notice */}
          <div className="p-3.5 rounded-xl bg-surface-muted/70 border border-border-default flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Outstanding Balance:</span>
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
              ₹{Number(invoice.balanceDue).toFixed(2)}
            </span>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Payment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-semibold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2 text-sm bg-surface border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors font-medium"
                required
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-text-muted">Max: ₹{maxAmount.toFixed(2)}</span>
              <button
                type="button"
                onClick={() => setAmount(invoice.balanceDue)}
                className="text-[11px] font-semibold text-brand hover:underline"
              >
                Pay Full Balance
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3.5 py-2 text-sm bg-surface border border-border-default rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors font-medium"
            >
              <option value="CASH">Cash</option>
              <option value="UPI_MANUAL">UPI / GooglePay / PhonePe</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Transaction / UTR Reference
            </label>
            <input
              type="text"
              placeholder="e.g. UPI Ref # or Bank Auth Code"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Payment Notes
            </label>
            <input
              type="text"
              placeholder="Optional notes or receipt remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || maxAmount <= 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-sm transition-all"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
