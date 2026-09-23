import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  CreditCard,
  User,
  Scissors,
  Calendar,
  Loader,
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

const toNum = (val: unknown, fallback = 0): number => {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

export const InvoiceDetailDrawer: React.FC<InvoiceDetailDrawerProps> = ({
  invoice,
  isOpen,
  onClose,
  authToken,
  onInvoiceUpdated,
}) => {
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(invoice);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  // Sync prop changes
  useEffect(() => {
    setActiveInvoice(invoice);
  }, [invoice]);

  // Fetch complete invoice data with full order, customer, and payments
  const fetchFullInvoice = useCallback(async (invoiceId: string) => {
    if (!invoiceId || !authToken) return;
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setActiveInvoice(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load complete invoice details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (isOpen && invoice?.id) {
      fetchFullInvoice(invoice.id);
    }
  }, [isOpen, invoice?.id, fetchFullInvoice]);

  const currentInvoice = activeInvoice || invoice;
  if (!currentInvoice) return null;

  const statusConfig = INVOICE_STATUS_CONFIG[currentInvoice.status] || {
    label: currentInvoice.status,
    bgClass: 'bg-surface-muted',
    textClass: 'text-text-muted',
    dotClass: 'bg-text-muted',
  };

  const fabricCost = toNum(currentInvoice.fabricCost);
  const stitchingCharge = toNum(currentInvoice.stitchingCharge);
  const urgentSurcharge = toNum(currentInvoice.urgentSurcharge);
  const taxRatePercent = toNum(currentInvoice.taxRatePercent);
  const taxAmount = toNum(currentInvoice.taxAmount);
  const totalAmount = toNum(currentInvoice.totalAmount);
  const advancePaid = toNum(currentInvoice.advancePaid);
  const balanceDue = toNum(currentInvoice.balanceDue);

  const isPaid = currentInvoice.status === 'PAID' || balanceDue <= 0;

  // Resolve customer display
  const customerName = currentInvoice.customer
    ? `${currentInvoice.customer.firstName} ${currentInvoice.customer.lastName}`.trim()
    : 'Customer';
  const customerPhone = currentInvoice.customer?.phone;
  const customerEmail = currentInvoice.customer?.email;

  // Resolve order display
  const garmentType = currentInvoice.order?.garmentType ?? 'Garment';
  const orderStatus = currentInvoice.order?.status;
  const fabricInfo = currentInvoice.order?.fabric;
  const metersUsed = currentInvoice.order?.metersUsed;
  const priceSnapshot = currentInvoice.order?.priceSnapshot;

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await fetch(`/api/invoices/${currentInvoice.id}/pdf`, {
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
      a.download = `Invoice-${currentInvoice.invoiceNumber}.pdf`;
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
            <span className="font-bold text-text-primary">{currentInvoice.invoiceNumber}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bgClass} ${statusConfig.textClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
              {statusConfig.label}
            </span>
            {loadingDetails && (
              <Loader className="w-3.5 h-3.5 text-brand animate-spin" />
            )}
          </div>
        }
        widthClass="max-w-xl"
      >
        <div className="space-y-6 pb-12">
          {/* Action Bar */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-muted/60 border border-border">
            <div>
              <div className="text-xs text-text-muted">Invoice Date</div>
              <div className="text-sm font-semibold text-text-primary">
                {new Date(currentInvoice.createdAt).toLocaleDateString('en-IN', {
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
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-text-primary bg-surface border border-border hover:bg-surface-muted rounded-xl transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadingPdf ? 'Exporting...' : 'PDF'}
              </button>

              {!isPaid && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  data-testid="open-record-payment-btn"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-dark rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Record Payment
                </button>
              )}
            </div>
          </div>

          {/* Customer & Order Information */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <User className="w-3.5 h-3.5" /> Customer Details
              </div>
              <div className="text-sm font-bold text-text-primary">
                {customerName}
              </div>
              {customerPhone ? (
                <div className="text-xs text-text-muted font-mono">{customerPhone}</div>
              ) : (
                <div className="text-xs text-text-muted italic">No phone recorded</div>
              )}
              {customerEmail && (
                <div className="text-xs text-text-muted truncate">{customerEmail}</div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <Scissors className="w-3.5 h-3.5" /> Garment Order
              </div>
              <div className="text-sm font-bold text-text-primary">
                {garmentType}
              </div>
              {orderStatus && (
                <div className="text-xs text-text-muted">
                  Order Status: <span className="font-medium text-text-primary">{orderStatus}</span>
                </div>
              )}
              {fabricInfo ? (
                <div className="text-xs text-text-muted truncate">
                  Fabric: {fabricInfo.name} ({fabricInfo.color})
                </div>
              ) : (
                <div className="text-xs text-text-muted italic">Tailoring material</div>
              )}
            </div>
          </div>

          {/* Itemized Financial Breakdown */}
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Itemized Cost Breakdown
            </h4>

            <div className="space-y-2.5 divide-y divide-border/60 text-xs">
              {/* Fabric Cost */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-semibold text-text-primary">Fabric Material</span>
                  <div className="text-[11px] text-text-muted">
                    {metersUsed && priceSnapshot
                      ? `${metersUsed}m @ ₹${toNum(priceSnapshot).toFixed(2)}/m`
                      : 'Material usage & cut'}
                  </div>
                </div>
                <span className="font-bold text-text-primary font-mono">
                  ₹{fabricCost.toFixed(2)}
                </span>
              </div>

              {/* Stitching Charge */}
              <div className="flex items-center justify-between pt-2.5">
                <div>
                  <span className="font-semibold text-text-primary">Stitching & Tailoring Charge</span>
                  <div className="text-[11px] text-text-muted">
                    Standard charge for {garmentType}
                  </div>
                </div>
                <span className="font-bold text-text-primary font-mono">
                  ₹{stitchingCharge.toFixed(2)}
                </span>
              </div>

              {/* Urgent Surcharge */}
              {urgentSurcharge > 0 && (
                <div className="flex items-center justify-between pt-2.5">
                  <div>
                    <span className="font-semibold text-text-primary">Rush / Urgent Delivery Surcharge</span>
                    <div className="text-[11px] text-text-muted">Priority workshop queue fee</div>
                  </div>
                  <span className="font-bold text-text-primary font-mono">
                    ₹{urgentSurcharge.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Tax */}
              <div className="flex items-center justify-between pt-2.5">
                <div>
                  <span className="font-semibold text-text-primary">Taxes (GST)</span>
                  <div className="text-[11px] text-text-muted">
                    Rate: {taxRatePercent.toFixed(1)}%
                  </div>
                </div>
                <span className="font-bold text-text-primary font-mono">
                  ₹{taxAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Total, Paid, Balance Summary */}
            <div className="pt-3 border-t border-border space-y-2 bg-surface-muted/30 -mx-5 -mb-5 p-5 rounded-b-2xl">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-text-primary">Total Amount</span>
                <span className="font-mono font-extrabold text-base text-text-primary">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text-muted">Advance / Paid Amount</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{advancePaid.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm pt-2 border-t border-border/60">
                <span className="font-bold text-text-primary">Balance Due</span>
                <span
                  className={`font-mono font-black text-base ${
                    isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  ₹{balanceDue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Payment History ({currentInvoice.payments?.length ?? 0})
              </h4>
            </div>

            {currentInvoice.payments && currentInvoice.payments.length > 0 ? (
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {currentInvoice.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3.5 bg-surface hover:bg-surface-muted/40 transition-colors text-xs"
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
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        +₹{toNum(p.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-text-muted">
                No payments have been recorded for this invoice yet.
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        invoice={currentInvoice}
        authToken={authToken}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={(updated) => {
          setActiveInvoice(updated);
          onInvoiceUpdated(updated);
        }}
      />
    </>
  );
};
