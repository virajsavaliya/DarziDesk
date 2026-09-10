import React, { useState, useEffect } from 'react';
import { Drawer } from '../common/Drawer';
import type { Customer, GarmentType, MeasurementProfile } from '../../types/dashboard';
import { Ruler, AlertCircle, CheckCircle2, Plus, Trash2, User } from 'lucide-react';

interface AddMeasurementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onProfileCreated: (profile: MeasurementProfile) => void;
}

const GARMENT_PRESETS: Record<GarmentType, string[]> = {
  SHIRT: ['Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeve Length', 'Shirt Length', 'Collar', 'Cuff', 'Armhole'],
  PANT: ['Waist', 'Hip', 'Inseam', 'Outseam', 'Thigh', 'Knee', 'Bottom', 'Fly Length'],
  KURTA: ['Chest', 'Waist', 'Hip', 'Length', 'Shoulder', 'Sleeve Length', 'Neck Round'],
  TSHIRT: ['Chest', 'Length', 'Shoulder', 'Sleeve Length', 'Neck'],
  CUSTOM: ['Length', 'Chest', 'Waist'],
};

export const AddMeasurementDrawer: React.FC<AddMeasurementDrawerProps> = ({
  isOpen,
  onClose,
  authToken,
  customers,
  selectedCustomer,
  onProfileCreated,
}) => {
  const [customerId, setCustomerId] = useState(selectedCustomer?.id || '');
  const [name, setName] = useState('');
  const [garmentType, setGarmentType] = useState<GarmentType>('SHIRT');
  const [unit, setUnit] = useState<'INCHES' | 'CENTIMETERS'>('INCHES');
  const [fitPreference, setFitPreference] = useState('REGULAR');
  const [fitNotes, setFitNotes] = useState('');

  // Values map: fieldName -> value
  const [values, setValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync customerId when selectedCustomer prop changes
  useEffect(() => {
    if (selectedCustomer) {
      setCustomerId(selectedCustomer.id);
    } else if (customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
    }
  }, [selectedCustomer, customers, customerId]);

  // Set default profile name when garmentType changes
  useEffect(() => {
    const label = garmentType.charAt(0) + garmentType.slice(1).toLowerCase();
    setName((prev) => {
      if (!prev || Object.values(GARMENT_PRESETS).some(() => prev.includes('Measurement') || prev.includes('Profile'))) {
        return `Custom ${label} Profile`;
      }
      return prev;
    });
  }, [garmentType]);

  const activeCustomer = customers.find((c) => c.id === customerId) || selectedCustomer;
  const currentFields = [...GARMENT_PRESETS[garmentType], ...customFields];

  const handleValueChange = (field: string, val: string) => {
    setValues((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFieldName.trim();
    if (!cleanName) return;
    if (!currentFields.includes(cleanName)) {
      setCustomFields((prev) => [...prev, cleanName]);
    }
    setNewFieldName('');
    setShowAddField(false);
  };

  const handleRemoveCustomField = (fieldName: string) => {
    setCustomFields((prev) => prev.filter((f) => f !== fieldName));
    setValues((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const resetForm = () => {
    setName('Custom Shirt Profile');
    setGarmentType('SHIRT');
    setUnit('INCHES');
    setFitPreference('REGULAR');
    setFitNotes('');
    setValues({});
    setCustomFields([]);
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

    if (!customerId) {
      setError('Please select a customer for this measurement profile.');
      return;
    }
    if (!name.trim()) {
      setError('Profile name is required.');
      return;
    }

    // Filter numeric values
    const numericValues: Record<string, number> = {};
    for (const [k, v] of Object.entries(values)) {
      const parsed = parseFloat(v.trim());
      if (!isNaN(parsed) && parsed > 0) {
        numericValues[k] = parsed;
      }
    }

    if (Object.keys(numericValues).length === 0) {
      setError('Please enter at least one measurement dimension.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
        garmentType,
        unit,
        fitPreference,
        values: numericValues,
      };

      if (fitNotes.trim()) {
        payload.fitNotes = fitNotes.trim();
      }

      const res = await fetch(`/api/customers/${customerId}/measurements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || 'Failed to record measurements');
      }

      setSuccess(true);
      onProfileCreated(json.data);
      setTimeout(() => {
        handleClose();
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Error recording measurements');
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
            <Ruler className="w-5 h-5" />
          </div>
          <span>Record New Measurements</span>
        </div>
      }
      subtitle="Save structured tailoring measurements for garments"
      widthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3.5 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Measurement profile recorded successfully!</span>
          </div>
        )}

        {/* ── 1. Customer Selection ───────────────────────────── */}
        <div className="p-4 bg-background border border-border rounded-xl space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Customer
          </label>
          {customers.length === 0 ? (
            <div className="text-xs text-error">
              No customers found in this shop. Please add a customer first.
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-surface rounded-lg border border-border text-text-muted">
                <User className="w-4 h-4" />
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="flex-1 px-3 py-2 bg-surface border border-border rounded-xl text-sm font-semibold text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all cursor-pointer"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeCustomer && (
            <div className="text-xs text-text-muted">
              Measurements will be stored under {activeCustomer.firstName} {activeCustomer.lastName}'s permanent record.
            </div>
          )}
        </div>

        {/* ── 2. Garment Type & Profile Name ──────────────────── */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Garment Type
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(['SHIRT', 'PANT', 'KURTA', 'TSHIRT', 'CUSTOM'] as GarmentType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setGarmentType(type)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                  garmentType === type
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-surface border-border text-text-secondary hover:bg-background hover:text-text-primary'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Profile Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="input-profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wedding 3-Piece Suit"
              required
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all cursor-pointer"
              >
                <option value="INCHES">Inches (in)</option>
                <option value="CENTIMETERS">Centimeters (cm)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Fit Style
              </label>
              <select
                value={fitPreference}
                onChange={(e) => setFitPreference(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all cursor-pointer"
              >
                <option value="REGULAR">Regular Fit</option>
                <option value="SLIM">Slim Fit</option>
                <option value="LOOSE">Comfort / Loose</option>
                <option value="RELAXED">Relaxed</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── 3. Measurement Dimension Inputs ─────────────────── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Garment Dimensions ({unit === 'INCHES' ? 'in' : 'cm'})
            </label>
            <button
              type="button"
              onClick={() => setShowAddField(!showAddField)}
              className="text-xs font-bold text-brand hover:text-brand-dark flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Measurement</span>
            </button>
          </div>

          {showAddField && (
            <div className="p-3 bg-surface-muted border border-border rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
              <input
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="Field name (e.g. Bicep, Wrist, Crotch)"
                className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomField}
                className="px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-dark transition-colors"
              >
                Add
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-background border border-border rounded-xl max-h-[300px] overflow-y-auto">
            {currentFields.map((field) => {
              const isCustom = customFields.includes(field);
              const fieldSlug = field.toLowerCase().replace(/\s+/g, '-');
              return (
                <div key={field} className="relative group bg-surface p-2.5 rounded-xl border border-border/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider truncate">
                      {field}
                    </span>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(field)}
                        className="text-text-muted hover:text-error p-0.5 rounded transition-colors"
                        title="Remove custom field"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      id={`input-dimension-${fieldSlug}`}
                      data-testid={`input-dimension-${fieldSlug}`}
                      value={values[field] || ''}
                      onChange={(e) => handleValueChange(field, e.target.value)}
                      placeholder="0.0"
                      className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm font-mono font-bold text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
                    />
                    <span className="text-[11px] text-text-muted font-mono shrink-0">
                      {unit === 'INCHES' ? 'in' : 'cm'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Fit Notes & Special Instructions ──────────────── */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Tailor Notes & Fit Instructions <span className="text-text-muted font-normal lowercase">(optional)</span>
          </label>
          <textarea
            value={fitNotes}
            onChange={(e) => setFitNotes(e.target.value)}
            rows={2}
            id="input-fit-notes"
            placeholder="e.g. Extra ease around chest, high-armhole cut, double cuffs."
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all resize-none"
          />
        </div>

        {/* ── Form Actions ────────────────────────────────────── */}
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
            id="btn-save-measurements"
            disabled={loading || success || !customerId}
            className="px-6 py-2.5 bg-accent text-white text-sm font-bold rounded-xl hover:bg-accent-dark active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Measurements...</span>
              </>
            ) : (
              <>
                <Ruler className="w-4 h-4" />
                <span>Save Measurements</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Drawer>
  );
};
