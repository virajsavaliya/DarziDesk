import React, { useState, useEffect, useCallback } from 'react';
import { Ruler, Store } from 'lucide-react';
import type { CustomerPortalMeasurementProfile } from '../../types/dashboard';

interface CustomerMeasurementsViewProps {
  authToken: string;
  onNavigateToCatalog?: () => void;
}

export const CustomerMeasurementsView: React.FC<CustomerMeasurementsViewProps> = ({
  authToken,
  onNavigateToCatalog,
}) => {
  const [profiles, setProfiles] = useState<CustomerPortalMeasurementProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/measurement-profiles', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load measurements (${res.status})`);
      const json = await res.json();
      setProfiles(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching measurement profiles');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Group profiles by shop
  const groupedByShop: Record<string, { shopName: string; profiles: CustomerPortalMeasurementProfile[] }> =
    {};

  profiles.forEach((p) => {
    const shopId = p.tenant?.id || 'unknown';
    const shopName = p.tenant?.name || 'Unknown Workshop';
    if (!groupedByShop[shopId]) {
      groupedByShop[shopId] = { shopName, profiles: [] };
    }
    groupedByShop[shopId].profiles.push(p);
  });

  const shopIds = Object.keys(groupedByShop);

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider">
              <Ruler className="w-3.5 h-3.5" />
              <span>Bespoke Fitting Profiles</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              My Measurements
            </h1>
            <p className="text-xs text-text-secondary">
              Garment measurement specifications grouped by your bespoke tailoring partners.
            </p>
          </div>
        </div>
      </div>

      {/* ── Measurements Grouped by Workshop ───────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="p-6 bg-surface border border-border rounded-2xl animate-pulse space-y-3"
            >
              <div className="h-4 bg-surface-muted rounded w-1/4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="h-28 bg-surface-muted rounded-xl" />
                <div className="h-28 bg-surface-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-error-light border border-error/30 rounded-2xl text-error text-sm">
          <p className="font-semibold">Unable to load measurement profiles</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      ) : shopIds.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl space-y-3">
          <Ruler className="w-8 h-8 text-text-muted mx-auto" />
          <h3 className="text-base font-bold text-text-primary">No measurement profiles yet</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            When you visit or place an order with a partner atelier, your tailored measurement specifications will appear here.
          </p>
          {onNavigateToCatalog && (
            <button
              onClick={onNavigateToCatalog}
              className="mt-2 px-4 py-2 bg-brand text-white font-semibold text-xs rounded-xl shadow-sm inline-flex items-center gap-2"
            >
              <Store className="w-4 h-4" />
              <span>Explore Workshop Catalog</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {shopIds.map((sId) => {
            const group = groupedByShop[sId];

            return (
              <div
                key={sId}
                className="p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-4"
              >
                {/* Shop group header */}
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand/5 border border-brand/10 text-brand flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-text-primary">{group.shopName}</h2>
                      <span className="text-[11px] text-text-muted">
                        {group.profiles.length} garment {group.profiles.length === 1 ? 'profile' : 'profiles'} on record
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profiles grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.profiles.map((profile) => {
                    const currentVersion = profile.versions?.[0];
                    const values = currentVersion?.values || {};
                    const isInStorePending =
                      profile.name === 'In-Store Fitting' || values['fitting'] === 'PENDING_IN_STORE';

                    return (
                      <div
                        key={profile.id}
                        className="p-4 rounded-xl border border-border/70 bg-surface-muted/40 hover:bg-surface transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-text-primary block">
                              {profile.name}
                            </span>
                            <span className="text-[11px] font-semibold text-text-secondary capitalize">
                              Garment: {profile.garmentType.toLowerCase()}
                            </span>
                          </div>

                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand font-mono font-bold">
                            v{currentVersion?.versionNumber || 1}
                          </span>
                        </div>

                        {isInStorePending ? (
                          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-xs border border-amber-200 dark:border-amber-900/50">
                            <strong>In-Person Fitting Pending:</strong> Measurements will be captured during your in-store workshop visit.
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40 text-xs">
                            {Object.entries(values).map(([key, val]) => (
                              <div key={key} className="p-1.5 rounded-lg bg-surface border border-border/50 text-center">
                                <span className="text-[10px] text-text-muted uppercase tracking-wider block truncate">
                                  {key}
                                </span>
                                <span className="font-bold text-brand font-mono text-xs">
                                  {String(val)}"
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
