import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { PackagePlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddFabricDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onFabricCreated: () => void;
}

const FABRIC_TYPES = [
  'Cotton',
  'Linen',
  'Silk',
  'Wool',
  'Poly-Cotton',
  'Velvet',
  'Satin',
  'Denim',
  'Georgette',
  'Chiffon',
  'Brocade',
  'Raw Silk',
  'Other',
];

export const AddFabricDrawer: React.FC<AddFabricDrawerProps> = ({
  isOpen,
  onClose,
  authToken,
  onFabricCreated,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [type, setType] = useState('Cotton');
  const [pricePerMeter, setPricePerMeter] = useState('');
  const [availableMeters, setAvailableMeters] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [supplierName, setSupplierName] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setName('');
    setColor('');
    setType('Cotton');
    setPricePerMeter('');
    setAvailableMeters('');
    setLowStockThreshold('10');
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
    setError(null);

    if (!name.trim()) {
      setError('Fabric name is required.');
      return;
    }
    if (!color.trim()) {
      setError('Color is required.');
      return;
    }
    const priceNum = parseFloat(pricePerMeter);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Price per meter must be greater than 0.');
      return;
    }
    const initialMetersNum = availableMeters ? parseFloat(availableMeters) : 0;
    if (isNaN(initialMetersNum) || initialMetersNum < 0) {
      setError('Initial available meters must be 0 or more.');
      return;
    }
    const thresholdNum = lowStockThreshold ? parseFloat(lowStockThreshold) : 0;
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setError('Low stock threshold must be 0 or more.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
        color: color.trim(),
        type: type.trim(),
        pricePerMeter: priceNum.toFixed(2),
        initialMeters: initialMetersNum.toFixed(2),
        lowStockThreshold: thresholdNum.toFixed(2),
      };

      if (supplierName.trim()) {
        payload.supplierName = supplierName.trim();
      }
      if (purchaseNotes.trim()) {
        payload.purchaseNotes = purchaseNotes.trim();
      }

      const res = await fetch('/api/fabrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || 'Failed to add fabric');
      }

      setSuccess(true);
      onFabricCreated();
      setTimeout(() => {
        handleClose();
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Error creating fabric');
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
            <PackagePlus className="w-5 h-5" />
          </div>
          <span>Add Fabric to Inventory</span>
        </div>
      }
      subtitle="Register new roll/bolt stock with pricing and threshold alerts"
      widthClass="max-w-lg"
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
            <span>Fabric added to inventory successfully!</span>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Fabric Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="input-fabric-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Italian Super 120s Wool"
            required
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
          />
        </div>

        {/* Color & Type */}
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Color <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="input-fabric-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Navy Blue"
              required
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Fabric Type <span className="text-error">*</span>
            </label>
            <select
              id="select-fabric-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all cursor-pointer"
            >
              {FABRIC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price & Initial Meters */}
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Price / Meter (₹) <span className="text-error">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              id="input-fabric-price"
              value={pricePerMeter}
              onChange={(e) => setPricePerMeter(e.target.value)}
              placeholder="e.g. 750"
              required
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Initial Stock (Meters)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              id="input-fabric-initial-meters"
              value={availableMeters}
              onChange={(e) => setAvailableMeters(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
            />
          </div>
        </div>

        {/* Low Stock Threshold */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Low Stock Alert Threshold (Meters)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            id="input-fabric-threshold"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            placeholder="e.g. 10"
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
          />
          <p className="text-[11px] text-text-muted mt-1">
            The dashboard will flag this fabric when available stock dips to or below this amount.
          </p>
        </div>

        {/* Supplier Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Supplier / Mill Name <span className="text-text-muted font-normal lowercase">(optional)</span>
          </label>
          <input
            type="text"
            id="input-fabric-supplier"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="e.g. Raymond / Arvind Mills"
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Purchase Notes <span className="text-text-muted font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="input-fabric-notes"
            value={purchaseNotes}
            onChange={(e) => setPurchaseNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Batch #4982, premium weave, shrink-resistant"
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
            id="btn-save-fabric"
            disabled={loading || success}
            className="px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-dark active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Adding Fabric...</span>
              </>
            ) : (
              <>
                <PackagePlus className="w-4 h-4" />
                <span>Add Fabric</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
};
