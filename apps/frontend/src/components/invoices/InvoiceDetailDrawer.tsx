import React, { useState } from 'react';
import {
  Download,
  CreditCard,
  User,
  Scissors,
  Calendar,
} from 'lucide-react';
import type { Invoice } from '../../types/dashboard';
import { INVOICE_STATUS_CONFIG } from '../../types/dashboard';
import { Drawer } from '../common/Drawer';
import { RecordPaymentModal } from './RecordPaymentModal';

interface InvoiceDetailDrawerProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onInvoiceUpdated: (updated: Invoice) => void;
}

export const InvoiceDetailDrawer: React.FC<InvoiceDetailDrawerProps> = ({
  invoice,
  isOpen,
  onClose,
  authToken,
  onInvoiceUpdated,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  if (!invoice) return null;

  const statusConfig = INVOICE_STATUS_CONFIG[invoice.status];
  const balanceDueNum = Number(invoice.balanceDue);
  const isPaid = invoice.status === 'PAID' || balanceDueNum <= 0;

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Error downloading invoice PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <span className="font-bold text-text-primary">{invoice.invoiceNumber}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bgClass} ${statusConfig.textClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
              {statusConfig.label}
            </span>
          </div>
        }
        widthClass="max-w-xl"
      >
        <div className="space-y-6 pb-12">
          {/* Action Bar */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-muted/60 border border-border-default">
            <div>
              <div className="text-xs text-text-muted">Invoice Date</div>
              <div className="text-sm font-semibold text-text-primary">
                {new Date(invoice.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-primary bg-surface border border-border-default hover:bg-surface-card rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadingPdf ? 'Exporting...' : 'PDF'}
              </button>

              {!isPaid && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Record Payment
                </button>
              )}
            </div>
          </div>

          {/* Customer & Order Information */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-surface-card border border-border-default space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <User className="w-3.5 h-3.5" /> Customer Details
              </div>
              <div className="text-sm font-bold text-text-primary">
                {invoice.customer
                  ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
                  : 'Customer'}
              </div>
              <div className="text-xs text-text-muted">{invoice.customer?.phone}</div>
              {invoice.customer?.email && (
                <div className="text-xs text-text-muted truncate">{invoice.customer.email}</div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface-card border border-border-default space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <Scissors className="w-3.5 h-3.5" /> Garment Order
              </div>
              <div className="text-sm font-bold text-text-primary">
                {invoice.order?.garmentType ?? 'Garment'}
              </div>
              <div className="text-xs text-text-muted">
                Order Status: <span className="font-medium text-text-primary">{invoice.order?.status}</span>
              </div>
              {invoice.order?.fabric && (
                <div className="text-xs text-text-muted truncate">
                  Fabric: {invoice.order.fabric.name} ({invoice.order.fabric.color})
                </div>
              )}
            </div>
          </div>

          {/* Itemized Financial Breakdown */}
          <div className="p-5 rounded-2xl bg-surface-card border border-border-default space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Itemized Cost Breakdown
            </h4>

            <div className="space-y-2.5 divide-y divide-border-default/60 text-xs">
              {/* Fabric Cost */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-semibold text-text-primary">Fabric Material</span>
                  <div className="text-[11px] text-text-muted">
                    {invoice.order?.metersUsed ?? '—'}m @ ₹{invoice.order?.priceSnapshot ?? '—'}/m
                  </div>
                </div>
                <span className="font-bold text-text-primary">
                  ₹{Number(invoice.fabricCost).toFixed(2)}
                </span>
              </div>

              {/* Stitching Charge */}
              <div className="flex items-center justify-between pt-2.5">
                <div>
                  <span className="font-semibold text-text-primary">Stitching & Tailoring Charge</span>
                  <div className="text-[11px] text-text-muted">
                    Standard charge for {invoice.order?.garmentType ?? 'garment'}
                  </div>
                </div>
                <span className="font-bold text-text-primary">
                  ₹{Number(invoice.stitchingCharge).toFixed(2)}
                </span>
              </div>

              {/* Urgent Surcharge */}
              {Number(invoice.urgentSurcharge) > 0 && (
                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className="font-semibold text-text-primary">Rush / Urgent Delivery Surcharge</span>
                    <div className="text-[11px] text-text-muted">Priority workshop queue fee</div>
                  </div>
                  <span className="font-bold text-text-primary">
                    ₹{Number(invoice.urgentSurcharge).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Tax */}
              <div className="flex items-center justify-between pt-2.5">
                <div>
                  <span className="font-semibold text-text-primary">Taxes (GST)</span>
                  <div className="text-[11px] text-text-muted">
                    Rate: {Number(invoice.taxRatePercent).toFixed(1)}%
                  </div>
                </div>
                <span className="font-bold text-text-primary">
                  ₹{Number(invoice.taxAmount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Total, Paid, Balance Summary */}
            <div className="pt-3 border-t border-border-default space-y-2 bg-surface-muted/30 -mx-5 -mb-5 p-5 rounded-b-2xl">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-text-primary">Total Amount</span>
                <span className="font-extrabold text-base text-text-primary">
                  ₹{Number(invoice.totalAmount).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text-muted">Advance / Paid Amount</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{Number(invoice.advancePaid).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm pt-2 border-t border-border-default/60">
                <span className="font-bold text-text-primary">Balance Due</span>
                <span
                  className={`font-black text-base ${
                    isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  ₹{Number(invoice.balanceDue).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Payment History ({invoice.payments?.length ?? 0})
              </h4>
            </div>

            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="border border-border-default rounded-xl overflow-hidden divide-y divide-border-default">
                {invoice.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3.5 bg-surface-card hover:bg-surface-muted/40 transition-colors text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">{p.paymentMethod}</span>
                        {p.reference && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-surface-muted text-text-muted font-mono">
                            {p.reference}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.recordedAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {p.recordedBy && ` • by ${p.recordedBy.firstName}`}
                      </div>
                      {p.notes && <div className="text-[11px] text-text-muted italic">{p.notes}</div>}
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        +₹{Number(p.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-border-default text-center text-xs text-text-muted">
                No payments have been recorded for this invoice yet.
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        invoice={invoice}
        authToken={authToken}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={(updated) => {
          onInvoiceUpdated(updated);
        }}
      />
    </>
  );
};
