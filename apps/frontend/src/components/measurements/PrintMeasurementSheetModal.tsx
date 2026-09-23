import React, { useState } from 'react';
import { Printer, X, User, Info } from 'lucide-react';
import type { Customer } from '../../types/dashboard';
import { PrintableMeasurementSheet } from './PrintableMeasurementSheet';

interface PrintMeasurementSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  customers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
  presetLabel: string;
  garmentType: string;
  profileName: string;
  unit: 'in' | 'cm';
  fitPreference: string;
  notes: string;
  values: Record<string, string | number>;
  shopName?: string;
}

export const PrintMeasurementSheetModal: React.FC<PrintMeasurementSheetModalProps> = ({
  isOpen,
  onClose,
  customer,
  customers,
  onSelectCustomer,
  presetLabel,
  garmentType,
  profileName,
  unit,
  fitPreference,
  notes: initialNotes,
  values,
  shopName = 'Shree Ganesh Bespoke Tailors',
}) => {
  const [includeBlueprint, setIncludeBlueprint] = useState(true);
  const [customNotes, setCustomNotes] = useState(initialNotes);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(customer);

  React.useEffect(() => {
    setActiveCustomer(customer);
  }, [customer]);

  React.useEffect(() => {
    setCustomNotes(initialNotes);
  }, [initialNotes]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCustomerChange = (customerId: string) => {
    const found = customers.find((c) => c.id === customerId) || null;
    setActiveCustomer(found);
    if (found && onSelectCustomer) {
      onSelectCustomer(found);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 no-print">
      <div className="bg-surface border border-border rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ── Modal Top Header ───────────────────────────────── */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand/10 text-brand rounded-2xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary">
                Print Tailoring Worksheet & Workshop Job Card
              </h2>
              <p className="text-xs text-text-secondary">
                Production-ready A4 cutting specification sheet for master tailors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              id="btn-confirm-print-sheet"
              className="px-4 py-2 bg-brand hover:bg-brand-dark active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              id="btn-close-print-modal"
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Modal Body: 2 Columns (Controls Left, Live Paper Preview Right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Controls Side Panel */}
          <div className="lg:col-span-4 p-6 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto space-y-5 bg-surface">
            {/* Customer Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-text-muted" />
                <span>Customer on Sheet</span>
              </label>
              <select
                value={activeCustomer?.id || ''}
                onChange={(e) => handleCustomerChange(e.target.value)}
                id="select-print-customer"
                className="w-full bg-surface-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-text-primary focus:outline-none focus:border-brand transition-colors"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Garment & Profile Summary */}
            <div className="p-3 bg-surface-muted rounded-2xl border border-border space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-text-muted font-medium">Garment:</span>
                <span className="font-bold text-text-primary">{garmentType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted font-medium">Template:</span>
                <span className="font-semibold text-text-primary">{presetLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted font-medium">Fit Style:</span>
                <span className="font-semibold text-text-primary">{fitPreference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted font-medium">Unit:</span>
                <span className="font-mono font-bold text-brand uppercase">{unit}</span>
              </div>
            </div>

            {/* Print Options */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block">
                Worksheet Options
              </span>

              <label className="flex items-center gap-2.5 text-xs text-text-primary font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBlueprint}
                  onChange={(e) => setIncludeBlueprint(e.target.checked)}
                  className="rounded border-border text-brand focus:ring-brand"
                />
                <span>Include Landmark Guide Banner</span>
              </label>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Cutter Instructions & Remarks
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Sleeves 0.5 inch longer; soft collar fusing; taper trousers from knee down..."
                rows={4}
                className="w-full bg-surface-muted border border-border rounded-xl p-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            {/* Workshop Guide Tip */}
            <div className="p-3.5 bg-brand/5 border border-brand/10 rounded-2xl text-[11px] text-text-secondary flex items-start gap-2.5">
              <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <span>
                Formatted specifically for standard A4 paper. Clicking <strong>Print Now</strong> invokes the printer dialog with clean high-contrast black ink and removes all dashboard chrome.
              </span>
            </div>
          </div>

          {/* Live Paper Preview Panel */}
          <div className="lg:col-span-8 p-4 sm:p-8 bg-slate-100 dark:bg-slate-900/60 overflow-y-auto flex items-start justify-center">
            <div className="shadow-2xl rounded-lg overflow-hidden border border-slate-300 w-full max-w-[210mm] scale-95 origin-top transition-transform">
              <PrintableMeasurementSheet
                customer={activeCustomer}
                garmentType={garmentType}
                presetLabel={presetLabel}
                profileName={profileName}
                unit={unit}
                fitPreference={fitPreference}
                notes={customNotes}
                values={values}
                includeBlueprint={includeBlueprint}
                shopName={shopName}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
