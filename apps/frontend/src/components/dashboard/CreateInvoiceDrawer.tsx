import React, { useState, useEffect, useCallback } from 'react';
import { Drawer } from '../common/Drawer';
import type { Order } from '../../types/dashboard';
import { StatusBadge } from '../common/StatusBadge';
import {
  AlertCircle,
  CheckCircle2,
  Search,
  Check,
  Receipt,
} from 'lucide-react';

interface CreateInvoiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onInvoiceCreated?: (invoice: any) => void;
}

export const CreateInvoiceDrawer: React.FC<CreateInvoiceDrawerProps> = ({
  isOpen,
  onClose,
  authToken,
  onInvoiceCreated,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders?limit=100', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      const allOrders: Order[] = json.data ?? [];

      // Filter to eligible orders (not CANCELLED, preferably uninvoiced or recent)
      setOrders(allOrders.filter((o) => o.status !== 'CANCELLED'));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (isOpen && authToken) {
      fetchOrders();
      setSelectedOrderId('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, authToken, fetchOrders]);

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const custName = o.customer
      ? `${o.customer.firstName} ${o.customer.lastName}`.toLowerCase()
      : '';
    return (
      o.id.toLowerCase().includes(q) ||
      custName.includes(q) ||
      o.garmentType.toLowerCase().includes(q)
    );
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const handleGenerate = async () => {
    if (!selectedOrderId) {
      setError('Please select an order to invoice.');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ orderId: selectedOrderId }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error?.message ||
            json.message ||
            `Invoice generation failed (${res.status}).`,
        );
      }

      const invoice = json.data;
      setSuccess(`Invoice #${invoice.invoiceNumber} generated successfully! Total: ₹${Number(invoice.totalAmount).toFixed(2)}`);

      if (onInvoiceCreated) {
        onInvoiceCreated(invoice);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to generate invoice.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Invoice for Order"
      size="md"
    >
      <div className="space-y-4 pb-6">
        {/* Error */}
        {error && (
          <div className="p-3 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="p-3 bg-success-light border border-success/30 rounded-xl text-success text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="text-xs text-text-muted">
          Select an active order below to compute fabric, tailoring charges, and taxes, and issue a formal invoice.
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, order #, or garment…"
            className="w-full pl-9 pr-3 py-2.5 bg-surface-muted border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent min-h-[42px]"
          />
        </div>

        {/* Order List */}
        <div className="max-h-80 overflow-y-auto border border-border rounded-xl divide-y divide-border/60 bg-surface-muted/30">
          {loading ? (
            <div className="p-4 text-xs text-center text-text-muted">Loading orders…</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-4 text-xs text-center text-text-muted">
              No matching active orders found.
            </div>
          ) : (
            filteredOrders.map((o) => {
              const isSelected = selectedOrderId === o.id;
              const hasInvoices = o.invoices && o.invoices.length > 0;

              return (
                <div
                  key={o.id}
                  data-testid={`select-invoice-order-${o.id}`}
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`p-3 text-left flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-accent/15 border-l-4 border-l-accent'
                      : 'hover:bg-surface-muted/80'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-text-primary">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <StatusBadge status={o.status} size="sm" />
                      {hasInvoices && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-secondary border border-border/60">
                          {o.invoices?.length || 0} invoice(s)
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-text-primary mt-1">
                      {o.customer?.firstName} {o.customer?.lastName} • <span className="capitalize">{o.garmentType.toLowerCase()}</span>
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      {o.fabric ? `${o.fabric.name} (${o.metersUsed}m)` : `${o.metersUsed}m fabric`}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted group-hover:text-text-primary">
                        Select →
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Order Summary Card */}
        {selectedOrder && (
          <div className="p-3.5 bg-accent/10 border border-accent/30 rounded-xl text-xs space-y-1" data-testid="selected-invoice-order-summary">
            <div className="font-bold text-text-primary flex items-center justify-between">
              <span>Ready to invoice Order #{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
              <span className="font-mono text-accent">₹{Number(selectedOrder.priceSnapshot).toFixed(2)}/m</span>
            </div>
            <p className="text-text-muted">
              Customer: {selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName} ({selectedOrder.customer?.phone})
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-surface-muted hover:bg-border text-text-primary font-semibold text-xs rounded-xl min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="generate-invoice-submit-btn"
            onClick={handleGenerate}
            disabled={!selectedOrderId || generating}
            className="flex-[2] py-2.5 px-4 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
          >
            <Receipt className="w-4 h-4" />
            <span>{generating ? 'Generating Invoice…' : 'Generate Invoice Now'}</span>
          </button>
        </div>
      </div>
    </Drawer>
  );
};
