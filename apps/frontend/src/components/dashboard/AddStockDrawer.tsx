import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import type { FabricItem } from '../../types/dashboard';
import { PlusCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddStockDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  fabric: FabricItem | null;
  onStockAdded: () => void;
}

export const AddStockDrawer: React.FC<AddStockDrawerProps> = ({
  isOpen,
  onClose,
  authToken,
  fabric,
  onStockAdded,
}) => {
  const [meters, setMeters] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setMeters('');
    setSupplierName('');
    setPurchaseNotes('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fabric) return;
    setError(null);

    const parsedMeters = parseFloat(meters);
    if (isNaN(parsedMeters) || parsedMeters <= 0) {
      setError('Meters to add must be greater than 0.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        meters: parsedMeters.toFixed(2),
      };

      if (supplierName.trim()) {
        payload.supplierName = supplierName.trim();
      }
      if (purchaseNotes.trim()) {
        payload.purchaseNotes = purchaseNotes.trim();
      }

      const res = await fetch(`/api/fabrics/${fabric.id}/stock/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || 'Failed to add stock');
      }

      setSuccess(true);
      onStockAdded();
      setTimeout(() => {
        handleClose();
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Error adding stock');
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
          <div className="p-2 bg-success/10 text-success rounded-xl">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span>Add Fabric Stock</span>
        </div>
      }
      subtitle={
        fabric
          ? `Record new roll replenishment for ${fabric.name}`
          : 'Replenish fabric meterage'
      }
      widthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Stock added to ledger successfully!</span>
          </div>
        )}

        {fabric && (
          <div className="p-4 bg-background border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text-primary">{fabric.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary border border-border">
                {fabric.color} · {fabric.type}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-secondary pt-1">
              <div>
                <span>Current Available: </span>
                <span className="font-bold text-success">
                  {parseFloat(fabric.availableMeters).toFixed(2)} m
                </span>
              </div>
              <div>
                <span>Reserved: </span>
                <span className="font-bold text-warning">
                  {parseFloat(fabric.reservedMeters).toFixed(2)} m
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Meters to add */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Meters to Add (m) <span className="text-error">*</span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            id="input-add-stock-meters"
            value={meters}
            onChange={(e) => setMeters(e.target.value)}
            placeholder="e.g. 25.5"
            required
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-base font-mono font-bold text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
          />
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Supplier / Mill Name <span className="text-text-muted font-normal lowercase">(optional)</span>
          </label>
          <input
            type="text"
            id="input-add-stock-supplier"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="e.g. Surat Textile Mart"
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Purchase Notes / Invoice Ref <span className="text-text-muted font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="input-add-stock-notes"
            value={purchaseNotes}
            onChange={(e) => setPurchaseNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Delivery Challan #8172, bolt received in prime condition"
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all resize-none"
          />
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
            id="btn-save-stock"
            disabled={loading || success || !fabric}
            className="px-6 py-2.5 bg-success text-white text-sm font-bold rounded-xl hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Recording Stock...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Add Stock</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
};
