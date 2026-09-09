import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Download,
  Store,
  FileText,
} from 'lucide-react';
import type { CustomerPortalInvoice, InvoiceStatus } from '../../types/dashboard';

interface CustomerInvoicesViewProps {
  authToken: string;
}

const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  DRAFT: {
    label: 'Draft',
    bgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600',
    textClass: 'text-slate-600',
  },
  ISSUED: {
    label: 'Payment Pending',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700',
    textClass: 'text-blue-700',
  },
  PARTIALLY_PAID: {
    label: 'Partially Paid',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700',
    textClass: 'text-amber-700',
  },
  PAID: {
    label: 'Paid in Full',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700',
    textClass: 'text-emerald-700',
  },
  VOID: {
    label: 'Void',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700',
    textClass: 'text-rose-700',
  },
};

export const CustomerInvoicesView: React.FC<CustomerInvoicesViewProps> = ({ authToken }) => {
  const [invoices, setInvoices] = useState<CustomerPortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/invoices', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load invoices (${res.status})`);
      const json = await res.json();
      setInvoices(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching invoices');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDownloadPdf = async (invoice: CustomerPortalInvoice) => {
    setDownloadingId(invoice.id);
    try {
      const res = await fetch(`/api/portal/invoices/${invoice.id}/pdf`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to download PDF (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error downloading invoice: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Billing & Receipts</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">My Invoices</h1>
            <p className="text-xs text-text-secondary">
              Review charges, payments, and download official PDF tax invoices.
            </p>
          </div>
        </div>
      </div>

      {/* ── Invoices List ──────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 bg-surface border border-border rounded-2xl animate-pulse flex items-center justify-between"
            >
              <div className="space-y-2 w-1/3">
                <div className="h-4 bg-surface-muted rounded w-1/2" />
                <div className="h-3 bg-surface-muted rounded w-3/4" />
              </div>
              <div className="h-8 bg-surface-muted rounded-xl w-28" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-error-light border border-error/30 rounded-2xl text-error text-sm">
          <p className="font-semibold">Unable to load invoices</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl space-y-3">
          <FileText className="w-8 h-8 text-text-muted mx-auto" />
          <h3 className="text-base font-bold text-text-primary">No invoices yet</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Invoices generated by tailors for your orders will appear here for review and download.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const statusMeta = INVOICE_STATUS_META[inv.status] || {
              label: inv.status,
              bgClass: 'bg-surface-muted text-text-secondary',
            };

            return (
              <div
                key={inv.id}
                className="p-5 bg-surface border border-border hover:border-brand/30 rounded-2xl shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-brand/5 border border-brand/10 text-brand flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-brand" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand bg-brand/5 px-2 py-0.5 rounded-md">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-current/20 ${statusMeta.bgClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text-primary flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-text-muted" />
                        {inv.tenant?.name}
                      </span>
                      <span>•</span>
                      <span>
                        Date:{' '}
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {inv.order && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{inv.order.garmentType.toLowerCase()}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Amounts & Download CTA */}
                <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-text-muted block">
                      Total / Balance Due
                    </span>
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span className="text-base font-extrabold text-brand font-mono">
                        ₹{inv.totalAmount}
                      </span>
                      {Number(inv.balanceDue) > 0 && (
                        <span className="text-xs font-semibold text-amber-600 font-mono">
                          (₹{inv.balanceDue} due)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadPdf(inv)}
                    disabled={downloadingId === inv.id}
                    className="px-3.5 py-2 bg-brand/5 hover:bg-brand/10 border border-brand/20 text-brand rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                    title="Download PDF Invoice"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingId === inv.id ? 'Preparing...' : 'PDF'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
