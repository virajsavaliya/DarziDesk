import React, { useState, useEffect, useCallback } from 'react';
import { SectionCard } from '../common/SectionCard';
import { Tag, Receipt, CheckCircle2, AlertCircle, Save, Scissors } from 'lucide-react';
import type { GarmentType } from '../../types/dashboard';

interface PricingRule {
  id?: string;
  garmentType: GarmentType;
  stitchingCharge: string;
}

interface ProductsAndServicesViewProps {
  authToken: string;
}

const ALL_GARMENT_TYPES: { type: GarmentType; label: string; description: string }[] = [
  {
    type: 'SHIRT',
    label: 'Formal & Casual Shirts',
    description: 'Bespoke dress shirts, casual linen shirts, and custom collars',
  },
  {
    type: 'PANT',
    label: 'Trousers & Formal Pants',
    description: 'Pleated trousers, slim chinos, and formal suit pants',
  },
  {
    type: 'KURTA',
    label: 'Kurtas & Ethnic Wear',
    description: 'Traditional kurtas, pathani suits, and festive ethnic garments',
  },
  {
    type: 'TSHIRT',
    label: 'Custom T-Shirts & Polos',
    description: 'Fitted polo collars, round-neck tailored tees, and leisure tops',
  },
  {
    type: 'CUSTOM',
    label: 'Specialty Garments & 2/3-Piece Suits',
    description: 'Bespoke suits, blazers, bandhgala, sherwanis, and complex designs',
  },
];

export const ProductsAndServicesView: React.FC<ProductsAndServicesViewProps> = ({ authToken }) => {
  const [pricingRules, setPricingRules] = useState<Record<GarmentType, string>>({
    SHIRT: '650.00',
    PANT: '750.00',
    KURTA: '950.00',
    TSHIRT: '450.00',
    CUSTOM: '3500.00',
  });
  const [taxRatePercent, setTaxRatePercent] = useState('5.00');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Success states
  const [taxSuccess, setTaxSuccess] = useState(false);
  const [pricingSuccessMsg, setPricingSuccessMsg] = useState<string | null>(null);
  const [savingTax, setSavingTax] = useState(false);
  const [savingPriceType, setSavingPriceType] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/invoices/config/pricing', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load pricing config (${res.status})`);
      const json = await res.json();
      const data = json.data;

      if (data) {
        if (data.taxRatePercent !== undefined) {
          setTaxRatePercent(parseFloat(data.taxRatePercent).toFixed(2));
        }
        if (Array.isArray(data.rules)) {
          const ruleMap: Record<GarmentType, string> = { ...pricingRules };
          data.rules.forEach((r: PricingRule) => {
            if (r.garmentType && r.stitchingCharge) {
              ruleMap[r.garmentType] = parseFloat(r.stitchingCharge).toFixed(2);
            }
          });
          setPricingRules(ruleMap);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching pricing configuration');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSaveTaxRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaxSuccess(false);
    setError(null);

    const parsed = parseFloat(taxRatePercent);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      setError('Tax rate must be a percentage between 0 and 100.');
      return;
    }

    setSavingTax(true);
    try {
      const res = await fetch('/api/invoices/config/tax', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ taxRatePercent: parsed.toFixed(2) }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || 'Failed to update tax rate');
      }

      setTaxRatePercent(parseFloat(json.data.taxRatePercent).toFixed(2));
      setTaxSuccess(true);
      setTimeout(() => setTaxSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Error updating tax rate');
    } finally {
      setSavingTax(false);
    }
  };

  const handleUpdatePrice = async (type: GarmentType, amountStr: string) => {
    setPricingSuccessMsg(null);
    setError(null);

    const parsed = parseFloat(amountStr);
    if (isNaN(parsed) || parsed < 0) {
      setError(`Stitching charge for ${type} must be a non-negative number.`);
      return;
    }

    setSavingPriceType(type);
    try {
      const res = await fetch('/api/invoices/config/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          garmentType: type,
          stitchingCharge: parsed.toFixed(2),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || `Failed to update price for ${type}`);
      }

      setPricingRules((prev) => ({
        ...prev,
        [type]: parsed.toFixed(2),
      }));

      setPricingSuccessMsg(`Updated standard stitching charge for ${type} to ₹${parsed.toFixed(2)}`);
      setTimeout(() => setPricingSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || `Error updating pricing for ${type}`);
    } finally {
      setSavingPriceType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider mb-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Service Catalog & Pricing</span>
            </div>
            <h1 className="text-xl font-extrabold text-text-primary">
              Products, Services & Tailoring Rates
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Configure baseline garment stitching charges and shop GST / sales tax rates
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 1. Tax Rate Configuration ─────────────────────────── */}
      <SectionCard
        title="Tax & GST Configuration"
        action={
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Receipt className="w-3.5 h-3.5 text-brand" />
            <span>Applied automatically on generated invoices</span>
          </div>
        }
      >
        <form onSubmit={handleSaveTaxRate} className="space-y-4">
          {taxSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tax rate successfully updated to {taxRatePercent}%!</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-md">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Default Shop Tax Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  id="input-tax-rate"
                  disabled={loading}
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(e.target.value)}
                  placeholder="5.00"
                  required
                  className="w-full pl-3.5 pr-8 py-2.5 bg-surface-muted border border-border rounded-xl text-sm font-mono font-bold text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all disabled:opacity-50"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-text-muted">
                  %
                </span>
              </div>
            </div>

            <button
              type="submit"
              id="btn-save-tax"
              disabled={savingTax || loading}
              className="min-h-[42px] px-5 py-2 bg-brand text-white font-bold text-xs rounded-xl hover:bg-brand-dark active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shrink-0"
            >
              {savingTax ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Tax Rate</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-text-muted">
            Standard GST for bespoke apparel in India is typically 5% (or 12% for luxury custom garments). Enter 0 for tax-exempt operations.
          </p>
        </form>
      </SectionCard>

      {/* ── 2. Tailoring Services & Stitching Rates ─────────────── */}
      <SectionCard
        title="Garment Stitching Services & Standard Charges"
        action={
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Scissors className="w-3.5 h-3.5 text-accent" />
            <span>Used as standard base charge during order creation</span>
          </div>
        }
      >
        <div className="space-y-4">
          {pricingSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{pricingSuccessMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-16 bg-surface-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {ALL_GARMENT_TYPES.map(({ type, label, description }) => {
                const currentPrice = pricingRules[type] || '0.00';
                const isSaving = savingPriceType === type;

                return (
                  <div
                    key={type}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text-primary">{label}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-muted text-text-secondary border border-border">
                          {type}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">{description}</p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-text-muted">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          id={`input-price-${type.toLowerCase()}`}
                          value={currentPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPricingRules((prev) => ({ ...prev, [type]: val }));
                          }}
                          className="w-32 pl-7 pr-3 py-2 bg-surface-muted border border-border rounded-xl text-sm font-mono font-bold text-text-primary focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
                        />
                      </div>

                      <button
                        type="button"
                        id={`btn-save-price-${type.toLowerCase()}`}
                        disabled={isSaving}
                        onClick={() => handleUpdatePrice(type, currentPrice)}
                        className="px-4 py-2 bg-accent text-white font-bold text-xs rounded-xl hover:bg-accent-dark active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                      >
                        {isSaving ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3 h-3" />
                            <span>Update Price</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};
