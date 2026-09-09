import React from 'react';
import type { MeasurementProfile } from '../../types/dashboard';

interface MeasurementCardProps {
  profile: MeasurementProfile;
}

export const MeasurementCard: React.FC<MeasurementCardProps> = ({ profile }) => {
  const currentVer = profile.versions?.find((v) => v.isCurrent) || profile.versions?.[0];
  const vals = currentVer?.values || {};

  return (
    <div className="bg-surface rounded-xl p-5 border border-border space-y-3.5 shadow-sm">
      {/* ── Header: Profile Name & Garment Badge ─────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-base text-text-primary">
            {profile.name}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand/10 text-brand">
            {profile.garmentType}
          </span>
        </div>

        {currentVer && (
          <span className="text-xs font-mono text-text-muted bg-surface-muted px-2.5 py-0.5 rounded-md border border-border">
            v{currentVer.versionNumber} ({currentVer.unit || 'in'})
          </span>
        )}
      </div>

      {/* ── Fit Preference & Notes ───────────────────────────── */}
      {currentVer?.fitPreference && (
        <div className="text-xs text-text-secondary bg-surface-muted p-2.5 rounded-lg border border-border/60">
          <span className="font-semibold text-text-primary">Fit: </span>
          {currentVer.fitPreference}
          {currentVer.fitNotes && <span> ({currentVer.fitNotes})</span>}
        </div>
      )}

      {/* ── Measurement Tiles Grid ───────────────────────────── */}
      {Object.keys(vals).length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {Object.entries(vals).map(([k, v]) => (
            <div
              key={k}
              className="bg-background p-3 rounded-xl border border-border/80 flex flex-col justify-between"
            >
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                {k}
              </span>
              <span className="text-base font-bold font-mono text-text-primary mt-1">
                {String(v)}{' '}
                <span className="text-xs font-normal text-text-muted">
                  {currentVer?.unit || 'in'}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-muted italic">No measurement values logged.</p>
      )}

      {/* ── Version Count Indicator ──────────────────────────── */}
      {profile.versions && profile.versions.length > 1 && (
        <div className="text-[11px] text-text-muted pt-1 flex justify-end border-t border-border/40">
          <span>{profile.versions.length} historical versions on file</span>
        </div>
      )}
    </div>
  );
};
