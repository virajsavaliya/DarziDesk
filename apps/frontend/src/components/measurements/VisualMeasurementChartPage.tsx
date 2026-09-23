import React, { useState, useEffect, useRef } from 'react';
import {
  Ruler,
  Scissors,
  Printer,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  User,
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Customer, GarmentType } from '../../types/dashboard';
import {
  BodyMannequinDiagram,
  MEASUREMENT_DEFINITIONS,
} from './BodyMannequinDiagram';
import { MobileBottomSheet } from '../common/responsive/MobileBottomSheet';
import { PrintMeasurementSheetModal } from './PrintMeasurementSheetModal';
import { PrintableMeasurementSheet } from './PrintableMeasurementSheet';

interface VisualMeasurementChartPageProps {
  authToken: string;
  customers: Customer[];
  onMeasurementSaved?: () => void;
  onOpenAddCustomer?: () => void;
}

const PRESETS: {
  id: string;
  label: string;
  codes: string[];
  garmentType: GarmentType;
}[] = [
  {
    id: 'ALL',
    label: 'All Landmarks (A–O)',
    codes: MEASUREMENT_DEFINITIONS.map((d) => d.letter),
    garmentType: 'CUSTOM',
  },
  {
    id: 'SUIT',
    label: 'Bespoke Suit',
    codes: ['A', 'B', 'C', 'D', 'E', 'F', 'J', 'K', 'L', 'M', 'N', 'O'],
    garmentType: 'CUSTOM',
  },
  {
    id: 'SHIRT',
    label: 'Shirt & Polo',
    codes: ['A', 'B', 'D', 'E', 'F', 'K', 'M', 'N'],
    garmentType: 'SHIRT',
  },
  {
    id: 'PANT',
    label: 'Trouser / Pant',
    codes: ['B', 'C', 'G', 'H', 'I', 'O'],
    garmentType: 'PANT',
  },
  {
    id: 'KURTA',
    label: 'Kurta & Ethnic',
    codes: ['A', 'B', 'C', 'D', 'E', 'F', 'J', 'M'],
    garmentType: 'KURTA',
  },
];

export const VisualMeasurementChartPage: React.FC<VisualMeasurementChartPageProps> = ({
  authToken,
  customers,
  onMeasurementSaved,
  onOpenAddCustomer,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('ALL');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [profileName, setProfileName] = useState('Standard Master Fit');
  const [fitPreference, setFitPreference] = useState<'REGULAR' | 'SLIM' | 'LOOSE'>('REGULAR');
  const [notes, setNotes] = useState('');

  // Values map: keyed by definition.key (e.g. { chest: 38.5, waist: 32 })
  const [values, setValues] = useState<Record<string, string | number>>({
    chest: 38.0,
    waist: 32.0,
    hips: 39.0,
    neck: 15.5,
    shoulder: 18.0,
    length: 17.5,
    inseam: 30.5,
    knee: 22.0,
    calf: 41.0,
    fullHeight: 68.0,
    acrossFront: 15.5,
    shoulderToUnderChest: 14.0,
    sleeveLength: 25.0,
    wrist: 7.0,
    waistToFloor: 41.5,
    // Aliases for legacy customer measurement objects
    shoulderToWaist: 17.5,
    thigh: 22.0,
    outseam: 41.0,
    height: 68.0,
    acrossChest: 15.5,
  });

  const [activeCode, setActiveCode] = useState<string | null>('A');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Auto-select first customer if available
  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Focus table input when active code changes
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const selectedDef = MEASUREMENT_DEFINITIONS.find(
    (d) =>
      activeCode &&
      (d.letter.toLowerCase() === activeCode.toLowerCase() ||
        d.code.toLowerCase() === activeCode.toLowerCase() ||
        d.key.toLowerCase() === activeCode.toLowerCase())
  );

  const handleSelectCode = (code: string) => {
    setActiveCode(code);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileSheetOpen(true);
    }
    const normalized = code.toLowerCase();
    const inputEl =
      inputRefs.current[normalized] ||
      inputRefs.current[code.toUpperCase()] ||
      inputRefs.current[code];
    if (inputEl) {
      inputEl.focus();
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handlePrevLandmark = () => {
    if (!selectedDef) return;
    const currentIndex = MEASUREMENT_DEFINITIONS.findIndex((d) => d.letter === selectedDef.letter);
    const prevIndex = (currentIndex - 1 + MEASUREMENT_DEFINITIONS.length) % MEASUREMENT_DEFINITIONS.length;
    handleSelectCode(MEASUREMENT_DEFINITIONS[prevIndex].letter);
  };

  const handleNextLandmark = () => {
    if (!selectedDef) return;
    const currentIndex = MEASUREMENT_DEFINITIONS.findIndex((d) => d.letter === selectedDef.letter);
    const nextIndex = (currentIndex + 1) % MEASUREMENT_DEFINITIONS.length;
    handleSelectCode(MEASUREMENT_DEFINITIONS[nextIndex].letter);
  };

  const handleAdjustValue = (delta: number) => {
    if (!selectedDef) return;
    const currentNum = Number(values[selectedDef.key]) || 0;
    const newNum = Math.max(0, +(currentNum + delta).toFixed(2));
    handleValueChange(selectedDef.key, newNum.toString());
  };

  const handleValueChange = (key: string, rawVal: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: rawVal,
    }));
  };

  const handleClearAll = () => {
    const empty: Record<string, string | number> = {};
    MEASUREMENT_DEFINITIONS.forEach((d) => {
      empty[d.key] = '';
    });
    setValues(empty);
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleSaveToVault = async () => {
    if (!selectedCustomerId) {
      setSaveError('Please select a customer to save these measurements');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const activePresetConfig = PRESETS.find((p) => p.id === selectedPreset);
      const garmentType = activePresetConfig?.garmentType ?? 'CUSTOM';

      // Format numeric values
      const formattedValues: Record<string, number> = {};
      MEASUREMENT_DEFINITIONS.forEach((def) => {
        const val = values[def.key];
        if (val !== undefined && val !== '' && !isNaN(Number(val))) {
          formattedValues[def.key] = Number(val);
        }
      });

      const payload = {
        name: profileName || `${selectedCustomer?.firstName ?? 'Customer'} - ${selectedPreset} Chart`,
        garmentType,
        unit: unit === 'in' ? 'INCHES' : 'CM',
        fitPreference,
        fitNotes: notes || undefined,
        values: formattedValues,
      };

      const res = await fetch(`/api/customers/${selectedCustomerId}/measurements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to save measurements (${res.status})`);
      }

      setSaveSuccess(true);
      if (onMeasurementSaved) onMeasurementSaved();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving measurement profile');
    } finally {
      setIsSaving(false);
    }
  };

  const currentPresetCodes = PRESETS.find((p) => p.id === selectedPreset)?.codes ?? [];

  return (
    <div className="space-y-6" id="visual-measurement-chart-root">
      {/* ── Top Bar: Customer Selector, Presets & Controls ── */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Customer Selection */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <User className="w-5 h-5" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary">
                  Customer Record
                </label>
                <span className="text-[11px] text-text-tertiary">
                  Measurements will link to this vault
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="flex-1 h-10 px-3.5 rounded-xl bg-surface-alt border border-border text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
                id="measurement-customer-picker"
              >
                {customers.length === 0 ? (
                  <option value="">No customers found</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone})
                    </option>
                  ))
                )}
              </select>

              {onOpenAddCustomer && (
                <button
                  type="button"
                  onClick={onOpenAddCustomer}
                  className="h-10 px-3 rounded-xl border border-dashed border-border hover:border-brand hover:text-brand text-text-secondary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Add New Customer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
              )}
            </div>
          </div>

          {/* Unit Switcher & Quick Actions */}
          <div className="flex items-center gap-2.5 self-end lg:self-center">
            {/* Unit Toggle */}
            <div className="inline-flex rounded-xl bg-surface-alt p-1 border border-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setUnit('in')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  unit === 'in'
                    ? 'bg-surface text-brand font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Inches (in)
              </button>
              <button
                type="button"
                onClick={() => setUnit('cm')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  unit === 'cm'
                    ? 'bg-surface text-brand font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Centimeters (cm)
              </button>
            </div>

            {/* Print Worksheet */}
            <button
              type="button"
              onClick={handlePrint}
              id="btn-print-measurement-sheet"
              className="h-10 px-3.5 rounded-xl border border-border bg-surface hover:bg-surface-alt text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Print Tailoring Worksheet"
            >
              <Printer className="w-4 h-4 text-text-tertiary" />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>

            {/* Clear All */}
            <button
              type="button"
              onClick={handleClearAll}
              className="h-10 px-3 rounded-xl border border-border hover:border-red-300 text-text-tertiary hover:text-red-600 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset all inputs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Garment Presets Bar */}
        <div className="pt-3 border-t border-border/60 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-text-secondary whitespace-nowrap mr-1">
            Garment Template:
          </span>
          {PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPreset(preset.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-surface-alt hover:bg-surface-alt/80 text-text-secondary border border-border/80'
                }`}
              >
                {preset.id === 'ALL' && <Ruler className="w-3 h-3" />}
                {preset.id === 'SUIT' && <Scissors className="w-3 h-3" />}
                {preset.id === 'SHIRT' && <FileText className="w-3 h-3" />}
                <span>{preset.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-border/60 text-text-tertiary'
                  }`}
                >
                  {preset.codes.length} pts
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Tablet Board Container (Styled exactly like the physical atelier chart) ── */}
      <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-xl max-w-7xl xl:max-w-[1440px] mx-auto">
        {/* Header Title from user's photo */}
        <div className="text-center pb-6 border-b border-slate-200">
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-[0.25em] text-slate-950 font-sans">
            MEASUREMENT CHART
          </h2>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mt-1">
            Standard Tailoring Anatomical Specification & Live Body Landmark Model
          </p>
        </div>

        {/* ── Side-by-Side 2-Column Responsive Workspace ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 items-start">
          {/* LEFT: Live Interactive Body Mannequin Diagram (User's pink reference sketch style) */}
          <div className="lg:col-span-6 xl:col-span-7 lg:sticky lg:top-4 space-y-4">
            <BodyMannequinDiagram
              activeCode={activeCode}
              onSelectCode={handleSelectCode}
              values={values}
              unit={unit}
              highlightedCodes={currentPresetCodes}
            />
          </div>

          {/* RIGHT: Main Measurement Table & Input Sheet */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col space-y-5">
            <div className="overflow-hidden rounded-xl border border-slate-900 shadow-sm">
              <table className="w-full border-collapse text-left text-sm font-sans">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-100 text-slate-900 text-xs uppercase font-extrabold tracking-wider">
                    <th className="py-2.5 px-3 w-14 text-center border-r border-slate-900">Mark</th>
                    <th className="py-2.5 px-4 border-r border-slate-900">Measurement Parameter</th>
                    <th className="py-2.5 px-3 w-36 text-center">Value ({unit})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {MEASUREMENT_DEFINITIONS.map((def) => {
                    const isSelected =
                      activeCode?.toLowerCase() === def.letter.toLowerCase() ||
                      activeCode?.toLowerCase() === def.code.toLowerCase() ||
                      activeCode?.toLowerCase() === def.key.toLowerCase();
                    const isPartOfPreset = currentPresetCodes.some(
                      (c) =>
                        c.toLowerCase() === def.letter.toLowerCase() ||
                        c.toLowerCase() === def.code.toLowerCase()
                    );
                    const val = values[def.key] ?? '';

                    return (
                      <tr
                        key={def.code}
                        onClick={() => handleSelectCode(def.letter)}
                        className={`transition-colors duration-150 cursor-pointer group ${
                          isSelected
                            ? 'bg-pink-50 font-semibold'
                            : isPartOfPreset
                            ? 'hover:bg-slate-50'
                            : 'opacity-40 hover:opacity-100'
                        }`}
                      >
                        {/* Letter & Code Badge */}
                        <td className="py-2 px-3 text-center border-r border-slate-900 font-bold text-sm">
                          <span
                            className={`w-7 h-7 rounded-full inline-flex items-center justify-center font-extrabold text-xs transition-all ${
                              isSelected
                                ? 'bg-pink-600 text-white shadow-sm ring-2 ring-pink-300'
                                : 'bg-slate-100 text-slate-800 group-hover:bg-pink-100 group-hover:text-pink-700'
                            }`}
                          >
                            {def.letter}
                          </span>
                        </td>

                        {/* Parameter Name & Category */}
                        <td className="py-2 px-4 border-r border-slate-900 text-slate-900">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-[13px] text-slate-950">{def.name}</span>
                              <p className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                                {def.hint}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] text-pink-700 bg-pink-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ml-2">
                                Active
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Value Input (both letter-based and code-based refs for test compatibility) */}
                        <td className="py-1 px-2 text-center">
                          <div className="relative flex items-center justify-center">
                            <input
                              ref={(el) => {
                                inputRefs.current[def.letter.toLowerCase()] = el;
                                inputRefs.current[def.letter.toUpperCase()] = el;
                                inputRefs.current[def.code] = el;
                                inputRefs.current[def.key] = el;
                              }}
                              type="number"
                              step="0.25"
                              min="0"
                              max="250"
                              placeholder="0.0"
                              value={val}
                              onFocus={() => setActiveCode(def.letter)}
                              onChange={(e) => handleValueChange(def.key, e.target.value)}
                              className={`w-full h-8 px-2 text-center font-mono font-bold text-sm rounded border transition-all focus:outline-none ${
                                isSelected
                                  ? 'border-pink-600 ring-2 ring-pink-200 bg-white text-pink-700'
                                  : 'border-slate-300 bg-slate-50/80 text-slate-900 focus:bg-white'
                              }`}
                              id={`input-measurement-${def.letter.toLowerCase()}`}
                              data-code={def.code}
                            />
                            <span className="absolute right-3 text-[10px] font-semibold text-slate-400 pointer-events-none">
                              {unit}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Profile Meta Options */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Profile Label / Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Wedding Sherwani Fit"
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fit Silhouette</label>
                  <div className="flex rounded-lg bg-slate-200 p-0.5">
                    {(['SLIM', 'REGULAR', 'LOOSE'] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => setFitPreference(fit)}
                        className={`flex-1 py-1 rounded text-[11px] font-bold transition-all ${
                          fitPreference === fit
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tailor Notes & Posture Adjustments
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Erect posture, slightly dropped right shoulder (-0.5 in)"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM METADATA (Customer Name, Date, and Save Button) */}
        <div className="mt-8 pt-6 border-t-2 border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="font-extrabold uppercase tracking-wide text-slate-950 text-sm">
                Name:
              </span>
              <span className="font-bold text-slate-900 text-base border-b-2 border-slate-400 pb-0.5 min-w-[200px]">
                {selectedCustomer
                  ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                  : '____________________'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-extrabold uppercase tracking-wide text-slate-950 text-sm">
                Date:
              </span>
              <span className="font-medium text-slate-700 text-sm border-b-2 border-slate-400 pb-0.5 min-w-[200px]">
                {new Date().toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Action Button & Status feedback */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Saved to Customer Vault!</span>
              </div>
            )}

            {saveError && (
              <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs bg-red-50 px-3.5 py-2 rounded-xl border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{saveError}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveToVault}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              id="save-measurement-chart-btn"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-pink-400" />
                  <span>Save Measurement Record</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Landmark Bottom Sheet (Rule 4) ── */}
      {selectedDef && (
        <MobileBottomSheet
          isOpen={isMobileSheetOpen}
          onClose={() => setIsMobileSheetOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-pink-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                {selectedDef.letter}
              </span>
              <span className="font-bold">{selectedDef.name}</span>
            </div>
          }
          subtitle={selectedDef.category}
          footer={
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevLandmark}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextLandmark}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="min-h-[44px] px-6 py-2 rounded-xl bg-brand text-white text-xs font-bold shadow-sm hover:bg-brand-dark transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-pink-50 dark:bg-pink-950/40 rounded-xl border border-pink-200 dark:border-pink-800 text-xs text-pink-900 dark:text-pink-200">
              <p className="font-semibold">{selectedDef.description}</p>
              <p className="text-[11px] text-pink-700 dark:text-pink-300 mt-1">Hint: {selectedDef.hint}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Measured Value ({unit})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.25"
                  value={values[selectedDef.key] ?? ''}
                  onChange={(e) => handleValueChange(selectedDef.key, e.target.value)}
                  placeholder="0.0"
                  className="w-full text-center text-2xl font-bold py-3 px-4 bg-surface border-2 border-border focus:border-brand rounded-2xl text-text-primary shadow-xs"
                />
                <span className="text-sm font-bold text-text-secondary">{unit}</span>
              </div>
            </div>

            {/* Quick Increment/Decrement Steppers */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleAdjustValue(-1)}
                className="min-h-[44px] py-2 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs font-bold text-text-primary transition-colors cursor-pointer"
              >
                -1.0
              </button>
              <button
                type="button"
                onClick={() => handleAdjustValue(-0.5)}
                className="min-h-[44px] py-2 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs font-bold text-text-primary transition-colors cursor-pointer"
              >
                -0.5
              </button>
              <button
                type="button"
                onClick={() => handleAdjustValue(0.5)}
                className="min-h-[44px] py-2 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs font-bold text-text-primary transition-colors cursor-pointer"
              >
                +0.5
              </button>
              <button
                type="button"
                onClick={() => handleAdjustValue(1)}
                className="min-h-[44px] py-2 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs font-bold text-text-primary transition-colors cursor-pointer"
              >
                +1.0
              </button>
            </div>
          </div>
        </MobileBottomSheet>
      )}

      {/* ── Print Measurement Sheet & Job Card Modal ────────────── */}
      <PrintMeasurementSheetModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        customer={selectedCustomer || null}
        customers={customers}
        onSelectCustomer={(c) => setSelectedCustomerId(c.id)}
        presetLabel={PRESETS.find((p) => p.id === selectedPreset)?.label || 'Bespoke Chart'}
        garmentType={PRESETS.find((p) => p.id === selectedPreset)?.garmentType || 'CUSTOM'}
        profileName={profileName}
        unit={unit}
        fitPreference={fitPreference}
        notes={notes}
        values={values}
      />

      {/* ── Dedicated Print Root (Always ready for window.print()) ── */}
      <div className="hidden print:block">
        <PrintableMeasurementSheet
          customer={selectedCustomer || null}
          garmentType={PRESETS.find((p) => p.id === selectedPreset)?.garmentType || 'CUSTOM'}
          presetLabel={PRESETS.find((p) => p.id === selectedPreset)?.label || 'Bespoke Chart'}
          profileName={profileName}
          unit={unit}
          fitPreference={fitPreference}
          notes={notes}
          values={values}
          includeBlueprint={true}
        />
      </div>
    </div>
  );
};
