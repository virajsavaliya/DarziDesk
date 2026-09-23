import React from 'react';
import type { Customer } from '../../types/dashboard';
import { MEASUREMENT_DEFINITIONS, type MeasurementDefinition } from './BodyMannequinDiagram';

interface PrintableMeasurementSheetProps {
  customer: Customer | null;
  garmentType?: string;
  presetLabel?: string;
  profileName?: string;
  unit: 'in' | 'cm';
  fitPreference?: string;
  notes?: string;
  values: Record<string, string | number>;
  definitions?: MeasurementDefinition[];
  includeBlueprint?: boolean;
  shopName?: string;
  jobCardNumber?: string;
}

export const PrintableMeasurementSheet: React.FC<PrintableMeasurementSheetProps> = ({
  customer,
  garmentType = 'SHIRT',
  presetLabel = 'Bespoke Measurement Chart',
  profileName = 'Master Fit Profile',
  unit,
  fitPreference = 'REGULAR',
  notes = '',
  values,
  definitions = MEASUREMENT_DEFINITIONS,
  includeBlueprint = false,
  shopName = 'Shree Ganesh Bespoke Tailors',
  jobCardNumber,
}) => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const generatedId =
    jobCardNumber ||
    `JC-${customer?.lastName?.toUpperCase() || 'CLIENT'}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`;

  // Filter definitions that have values or are relevant
  const activeDefinitions = definitions.filter((def) => {
    const val = values[def.key];
    return val !== undefined && val !== '' && val !== null;
  });

  const displayList = activeDefinitions.length > 0 ? activeDefinitions : definitions;

  // Split into 2 columns for a balanced A4 sheet layout
  const midPoint = Math.ceil(displayList.length / 2);
  const leftColumn = displayList.slice(0, midPoint);
  const rightColumn = displayList.slice(midPoint);

  return (
    <div
      id="printable-measurement-sheet"
      className="bg-white text-slate-900 font-sans p-6 max-w-[210mm] mx-auto text-xs"
      style={{ minHeight: '297mm' }}
    >
      {/* ── Atelier Header ────────────────────────────────────── */}
      <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-wider uppercase text-slate-900">
              {shopName}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-slate-900 text-white rounded">
              ATELIER JOB CARD
            </span>
          </div>
          <p className="text-[11px] font-semibold tracking-wide text-slate-600 mt-0.5">
            DARZIDESK BESPOKE TAILORING WORKBOOK & CUTTING SPECIFICATION
          </p>
        </div>

        <div className="text-right">
          <div className="text-sm font-mono font-black text-slate-900">
            {generatedId}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Printed: {currentDate}
          </div>
        </div>
      </div>

      {/* ── Client & Garment Specification Card ──────────────── */}
      <div className="mt-3 border border-slate-900 rounded-lg overflow-hidden bg-slate-50 print-avoid-break">
        <div className="bg-slate-900 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider flex justify-between items-center">
          <span>Client & Order Details</span>
          <span className="font-mono">UNIT: {unit === 'in' ? 'INCHES (in)' : 'CENTIMETERS (cm)'}</span>
        </div>

        <div className="grid grid-cols-4 divide-x divide-slate-300 p-2.5 text-[11px]">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Customer Name</span>
            <span className="font-extrabold text-slate-900 text-sm">
              {customer ? `${customer.firstName} ${customer.lastName}` : 'Walk-in Customer'}
            </span>
          </div>

          <div className="pl-3">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Contact Phone</span>
            <span className="font-mono font-bold text-slate-900">
              {customer?.phone || 'Not recorded'}
            </span>
          </div>

          <div className="pl-3">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Garment / Template</span>
            <span className="font-bold text-slate-900">
              {garmentType} • {presetLabel}
            </span>
          </div>

          <div className="pl-3">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Fit Preference</span>
            <span className="font-extrabold text-slate-900">
              {fitPreference} FIT
            </span>
          </div>
        </div>
      </div>

      {/* ── Optional Blueprint / Sizing Notice ────────────────── */}
      {includeBlueprint && (
        <div className="mt-3 p-2 bg-slate-100 border border-slate-300 rounded text-[10px] text-slate-700 flex items-center justify-between print-avoid-break">
          <span>
            📐 <strong>Master Cutter Reference:</strong> Landmark codes (A–O) map to standard atelier drafting points. Check seam allowances before cutting.
          </span>
          <span className="font-bold font-mono text-[11px] text-slate-900">
            Profile: {profileName}
          </span>
        </div>
      )}

      {/* ── 2-Column Measurement Table ────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-4 print-avoid-break">
        {/* Left Column Table */}
        <div className="border border-slate-900 rounded-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-900 text-[10px] uppercase font-black text-slate-800 tracking-wider">
                <th className="py-1.5 px-2 w-10 text-center border-r border-slate-900">Mark</th>
                <th className="py-1.5 px-2 border-r border-slate-900">Landmark Parameter</th>
                <th className="py-1.5 px-2 w-20 text-center border-r border-slate-900">Body ({unit})</th>
                <th className="py-1.5 px-2 w-24 text-center">Cutter Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {leftColumn.map((def) => {
                const val = values[def.key];
                const displayVal = val !== undefined && val !== '' ? `${val} ${unit}` : '—';

                return (
                  <tr key={def.code} className="hover:bg-slate-50">
                    <td className="py-1 px-1 text-center font-bold font-mono border-r border-slate-900 bg-slate-100 text-[11px]">
                      {def.letter}
                    </td>
                    <td className="py-1 px-2 font-semibold text-slate-900 border-r border-slate-900 text-[11px]">
                      {def.name}
                    </td>
                    <td className="py-1 px-2 text-center font-mono font-black text-slate-900 border-r border-slate-900 text-xs">
                      {displayVal}
                    </td>
                    <td className="py-1 px-2 border-b border-dotted border-slate-300">
                      &nbsp;
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Column Table */}
        <div className="border border-slate-900 rounded-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-900 text-[10px] uppercase font-black text-slate-800 tracking-wider">
                <th className="py-1.5 px-2 w-10 text-center border-r border-slate-900">Mark</th>
                <th className="py-1.5 px-2 border-r border-slate-900">Landmark Parameter</th>
                <th className="py-1.5 px-2 w-20 text-center border-r border-slate-900">Body ({unit})</th>
                <th className="py-1.5 px-2 w-24 text-center">Cutter Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {rightColumn.map((def) => {
                const val = values[def.key];
                const displayVal = val !== undefined && val !== '' ? `${val} ${unit}` : '—';

                return (
                  <tr key={def.code} className="hover:bg-slate-50">
                    <td className="py-1 px-1 text-center font-bold font-mono border-r border-slate-900 bg-slate-100 text-[11px]">
                      {def.letter}
                    </td>
                    <td className="py-1 px-2 font-semibold text-slate-900 border-r border-slate-900 text-[11px]">
                      {def.name}
                    </td>
                    <td className="py-1 px-2 text-center font-mono font-black text-slate-900 border-r border-slate-900 text-xs">
                      {displayVal}
                    </td>
                    <td className="py-1 px-2 border-b border-dotted border-slate-300">
                      &nbsp;
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Workshop Cutter Instructions & Special Allowances ── */}
      <div className="mt-4 border border-slate-900 rounded-md overflow-hidden print-avoid-break">
        <div className="bg-slate-100 px-3 py-1 border-b border-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-800">
          Master Cutter Notes & Workshop Stitching Instructions
        </div>
        <div className="p-2.5 min-h-[50px] text-[11px] text-slate-800 font-medium">
          {notes ? (
            <p className="whitespace-pre-wrap">{notes}</p>
          ) : (
            <div className="space-y-2 text-slate-400 italic">
              <div className="border-b border-dashed border-slate-300 pb-1">
                Collar/Neck style, sleeve cuff type, pocket position, ease allowance:
              </div>
              <div className="border-b border-dashed border-slate-300 pb-1">&nbsp;</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Physical Atelier Sign-Off Block ───────────────────── */}
      <div className="mt-5 pt-3 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-[10px] print-avoid-break">
        <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
          <span className="font-bold text-slate-700 uppercase tracking-wider block mb-4">
            1. Measured By (Master Tailor)
          </span>
          <div className="border-t border-dashed border-slate-400 pt-1 flex justify-between text-slate-500">
            <span>Signature:</span>
            <span>Date:</span>
          </div>
        </div>

        <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
          <span className="font-bold text-slate-700 uppercase tracking-wider block mb-4">
            2. Checked & Cut By (Cutter)
          </span>
          <div className="border-t border-dashed border-slate-400 pt-1 flex justify-between text-slate-500">
            <span>Signature:</span>
            <span>Fabric Meterage:</span>
          </div>
        </div>

        <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
          <span className="font-bold text-slate-700 uppercase tracking-wider block mb-4">
            3. Final Quality & Pressing
          </span>
          <div className="border-t border-dashed border-slate-400 pt-1 flex justify-between text-slate-500">
            <span>Signature:</span>
            <span>Status: PASSED</span>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between text-[9px] text-slate-400 print-avoid-break">
        <span>DarziDesk Cloud Tailoring OS • Confidential Atelier Production Document</span>
        <span>Page 1 of 1 • Attach to physical garment cutting bundle</span>
      </div>
    </div>
  );
};
