import React, { useState } from 'react';
import { X, CreditCard, AlertCircle, CheckCircle2, Banknote, QrCode, Building2 } from 'lucide-react';
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

  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'CASH', label: 'Cash', icon: <Banknote className="w-3.5 h-3.5" /> },
    { id: 'UPI_MANUAL', label: 'UPI / QR', icon: <QrCode className="w-3.5 h-3.5" /> },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: <Building2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Record Payment</h3>
              <p className="text-xs text-text-muted font-mono">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-error-light border border-error/20 text-error text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Balance Due Notice */}
          <div className="p-4 rounded-xl bg-brand/5 border border-brand/15 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Outstanding Balance Due
              </span>
              <span className="text-xs text-text-secondary">
                Total Invoice: ₹{Number(invoice.totalAmount).toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-bold text-brand">
                ₹{Number(invoice.balanceDue).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Payment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmount(invoice.balanceDue)}
                className="text-[11px] font-semibold text-accent hover:underline"
              >
                Pay Full Balance
              </button>
            </div>
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
                className="w-full pl-8 pr-4 py-2.5 text-sm bg-surface-muted border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors font-mono font-bold"
                required
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-text-muted">Max payable: ₹{maxAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'border-brand bg-brand text-white shadow-xs'
                        : 'border-border bg-surface-muted/60 text-text-secondary hover:border-brand/30 hover:bg-surface-muted'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
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
              className="w-full px-3.5 py-2 text-sm bg-surface-muted border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Payment Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Advance paid at counter"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface-muted border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || maxAmount <= 0}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
