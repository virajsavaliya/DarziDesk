import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Customer, GarmentType, MeasurementProfile } from '../../types/dashboard';
import { SearchInput } from '../common/SearchInput';
import { AddMeasurementDrawer } from './AddMeasurementDrawer';
import { AddCustomerDrawer } from './AddCustomerDrawer';
import { VisualMeasurementChartPage } from '../measurements/VisualMeasurementChartPage';
import {
  Ruler,
  Users,
  Plus,
  Layers,
  Sparkles,
  User,
  History,
  AlertCircle,
  Clock,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { PrintMeasurementSheetModal } from '../measurements/PrintMeasurementSheetModal';

interface MeasurementsDirectoryViewProps {
  authToken: string;
  onNavigateToNewOrder?: (customerId?: string, profileId?: string) => void;
}

const GARMENT_OPTIONS: { type: GarmentType | 'ALL'; label: string; color: string }[] = [
  { type: 'ALL', label: 'All Garments', color: 'bg-brand/10 text-brand border-brand/20' },
  { type: 'SHIRT', label: 'Shirts', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { type: 'PANT', label: 'Trousers & Pants', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { type: 'KURTA', label: 'Kurtas & Ethnic', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { type: 'TSHIRT', label: 'T-Shirts & Polos', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { type: 'CUSTOM', label: 'Custom & Bespoke', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
];

export const MeasurementsDirectoryView: React.FC<MeasurementsDirectoryViewProps> = ({
  authToken,
  onNavigateToNewOrder,
}) => {
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Interactive Visual Chart vs Directory Archive
  const [viewTab, setViewTab] = useState<'CHART' | 'DIRECTORY'>('CHART');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGarment, setSelectedGarment] = useState<GarmentType | 'ALL'>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<'ALL' | 'INCHES' | 'CENTIMETERS'>('ALL');

  // Drawers
  const [isAddMeasurementOpen, setIsAddMeasurementOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [preselectedCustomer, setPreselectedCustomer] = useState<Customer | null>(null);
  const [printingProfile, setPrintingProfile] = useState<MeasurementProfile | null>(null);

  // Load profiles from backend
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/measurements', {
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

  // Load customers for selection in drawer
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers?limit=100', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setCustomers(json.data || []);
      }
    } catch {
      // Non-blocking
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      fetchProfiles();
      fetchCustomers();
    }
  }, [authToken, fetchProfiles, fetchCustomers]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Garment filter
      if (selectedGarment !== 'ALL' && p.garmentType !== selectedGarment) {
        return false;
      }

      // Unit filter
      const currentUnit = p.currentVersion?.unit || p.versions?.[0]?.unit;
      if (selectedUnit !== 'ALL' && currentUnit) {
        if (selectedUnit === 'INCHES' && currentUnit !== 'INCHES') return false;
        if (selectedUnit === 'CENTIMETERS' && currentUnit !== 'CENTIMETERS') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = p.name.toLowerCase().includes(q);
        const garmentMatch = p.garmentType.toLowerCase().includes(q);
        const custNameMatch = p.customer
          ? `${p.customer.firstName} ${p.customer.lastName}`.toLowerCase().includes(q)
          : false;
        const phoneMatch = p.customer?.phone ? p.customer.phone.includes(q) : false;
        const notesMatch = p.notes ? p.notes.toLowerCase().includes(q) : false;

        if (!nameMatch && !garmentMatch && !custNameMatch && !phoneMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [profiles, selectedGarment, selectedUnit, searchQuery]);

  // Metrics calculation
  const stats = useMemo(() => {
    const total = profiles.length;
    const uniqueCustomers = new Set(profiles.map((p) => p.customerId || p.customer?.id).filter(Boolean)).size;
    const withNotes = profiles.filter(
      (p) => p.currentVersion?.fitNotes || p.currentVersion?.fitPreference || p.notes,
    ).length;
    const multiVersion = profiles.filter((p) => (p.versions?.length || 1) > 1).length;

    return { total, uniqueCustomers, withNotes, multiVersion };
  }, [profiles]);

  const handleProfileCreated = (newProfile: MeasurementProfile) => {
    setProfiles((prev) => {
      const idx = prev.findIndex((p) => p.id === newProfile.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newProfile;
        return updated;
      }
      return [newProfile, ...prev];
    });
    fetchProfiles(); // Refresh to ensure full relations are joined
  };

  const handleRecordNewForCustomer = (customer?: Customer) => {
    setPreselectedCustomer(customer || null);
    setIsAddMeasurementOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Hero Summary ── */}
      <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider">
              <Ruler className="w-3.5 h-3.5" />
              <span>Tailoring Specification Archive</span>
            </div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight" id="measurements-registry-title">
              Measurement Profiles & Fitting Registry
            </h1>
            <p className="text-xs text-text-secondary">
              Bespoke dimensions, garment specs, and immutable sizing versions across all registered clients.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-surface-muted p-1 border border-border shadow-xs">
              <button
                type="button"
                onClick={() => setViewTab('CHART')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewTab === 'CHART'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                id="tab-visual-body-chart"
              >
                <Ruler className="w-4 h-4" />
                <span>Visual Body Chart</span>
              </button>
              <button
                type="button"
                onClick={() => setViewTab('DIRECTORY')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewTab === 'DIRECTORY'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                id="tab-measurements-directory"
              >
                <Layers className="w-4 h-4" />
                <span>All Profiles ({profiles.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRecordNewForCustomer()}
              className="min-h-[44px] px-4 py-2.5 bg-surface-alt border border-border text-text-primary font-bold text-xs rounded-xl hover:bg-surface-muted transition-all flex items-center gap-1.5 shadow-sm"
              id="btn-record-measurements"
            >
              <Plus className="w-4 h-4 text-accent" />
              <span>Quick Form</span>
            </button>
          </div>
        </div>

        {/* ── KPI Summary Cards (Only in Directory Mode) ── */}
        {viewTab === 'DIRECTORY' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 bg-background rounded-xl border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Profiles</p>
              <p className="text-xl font-extrabold text-text-primary mt-0.5">{stats.total}</p>
            </div>
          </div>

          <div className="p-3.5 bg-background rounded-xl border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Fitted Clients</p>
              <p className="text-xl font-extrabold text-text-primary mt-0.5">{stats.uniqueCustomers}</p>
            </div>
          </div>

          <div className="p-3.5 bg-background rounded-xl border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">With Fit Notes</p>
              <p className="text-xl font-extrabold text-text-primary mt-0.5">{stats.withNotes}</p>
            </div>
          </div>

          <div className="p-3.5 bg-background rounded-xl border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Multi-Version</p>
              <p className="text-xl font-extrabold text-text-primary mt-0.5">{stats.multiVersion}</p>
            </div>
          </div>
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="pt-2 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by profile name, client name, phone, or garment..."
                id="measurements-search-input"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedUnit}
                aria-label="Filter by measurement unit"
                onChange={(e) => setSelectedUnit(e.target.value as any)}
                className="min-h-[44px] px-3.5 py-2 bg-surface-muted border border-border rounded-xl text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="ALL">All Units</option>
                <option value="INCHES">Inches (in)</option>
                <option value="CENTIMETERS">Centimeters (cm)</option>
              </select>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>

          {/* Garment Type Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {GARMENT_OPTIONS.map((g) => {
              const isActive = selectedGarment === g.type;
              const count =
                g.type === 'ALL'
                  ? profiles.length
                  : profiles.filter((p) => p.garmentType === g.type).length;

              return (
                <button
                  key={g.type}
                  type="button"
                  onClick={() => setSelectedGarment(g.type)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
                    isActive
                      ? 'bg-text-primary text-background border-text-primary shadow-sm'
                      : 'bg-surface-muted border-border text-text-secondary hover:text-text-primary hover:bg-border/60'
                  }`}
                >
                  <span>{g.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-background/20 text-background' : 'bg-border text-text-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        </>
        )}

        {error && (
          <div className="p-3 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ── Main Workspace: Visual Chart vs Directory Listing ── */}
      {viewTab === 'CHART' ? (
        <VisualMeasurementChartPage
          authToken={authToken}
          customers={customers}
          onMeasurementSaved={fetchProfiles}
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-surface rounded-2xl p-5 border border-border animate-pulse space-y-3">
              <div className="h-4 bg-surface-muted rounded w-1/3" />
              <div className="h-3 bg-surface-muted rounded w-1/2" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="h-12 bg-surface-muted rounded-lg" />
                <div className="h-12 bg-surface-muted rounded-lg" />
                <div className="h-12 bg-surface-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-surface-muted border border-border text-text-muted flex items-center justify-center mx-auto">
            <Ruler className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-primary">No measurement profiles found</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              {searchQuery || selectedGarment !== 'ALL'
                ? 'Try broadening your search query or selecting a different garment filter category.'
                : 'Start logging bespoke fitting specifications for your clients to build an accurate measurement registry.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleRecordNewForCustomer()}
            className="px-5 py-2.5 bg-accent text-white font-bold text-xs rounded-xl hover:bg-accent-dark transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Record First Profile</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProfiles.map((profile) => {
            const currentVer = profile.currentVersion || profile.versions?.find((v) => v.isCurrent) || profile.versions?.[0];
            const vals = currentVer?.values || {};
            const dimensions = Object.entries(vals);
            const customerName = profile.customer
              ? `${profile.customer.firstName} ${profile.customer.lastName}`
              : 'Unknown Client';
            const customerPhone = profile.customer?.phone || '';
            const matchingCustomer = customers.find((c) => c.id === profile.customerId || c.id === profile.customer?.id);

            return (
              <div
                key={profile.id}
                className="bg-surface rounded-2xl p-5 border border-border shadow-sm hover:border-accent/40 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Top: Profile Title & Garment Badge */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h3 className="font-extrabold text-base text-text-primary tracking-tight">
                        {profile.name}
                      </h3>
                      {profile.notes && (
                        <p className="text-xs text-text-secondary line-clamp-1">{profile.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent/10 text-accent border border-accent/20">
                        {profile.garmentType}
                      </span>
                      {currentVer && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-surface-muted text-text-muted border border-border">
                          v{currentVer.versionNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Information Badge */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-muted/70 border border-border/70">
                    <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text-primary truncate">{customerName}</p>
                      {customerPhone && (
                        <p className="text-[11px] font-mono text-text-muted">{customerPhone}</p>
                      )}
                    </div>
                    {currentVer?.unit && (
                      <span className="text-[10px] font-semibold text-text-muted uppercase px-2 py-0.5 rounded bg-background border border-border shrink-0">
                        {currentVer.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Fit Preference & Dimension Tiles */}
                <div className="space-y-3">
                  {currentVer?.fitPreference && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="font-bold text-text-primary">Fit:</span>
                      <span className="px-2 py-0.5 rounded-md bg-background border border-border font-semibold text-text-primary text-[11px]">
                        {currentVer.fitPreference}
                      </span>
                      {currentVer.fitNotes && (
                        <span className="text-xs text-text-muted truncate">({currentVer.fitNotes})</span>
                      )}
                    </div>
                  )}

                  {/* Dimension Tiles */}
                  {dimensions.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {dimensions.slice(0, 9).map(([k, v]) => (
                        <div
                          key={k}
                          className="bg-background p-2.5 rounded-xl border border-border/80 flex flex-col justify-between"
                        >
                          <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider truncate">
                            {k}
                          </span>
                          <span className="text-sm font-extrabold font-mono text-text-primary mt-0.5">
                            {String(v)}{' '}
                            <span className="text-[10px] font-normal text-text-muted">
                              {currentVer?.unit === 'CENTIMETERS' ? 'cm' : 'in'}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic py-1">No dimension values recorded.</p>
                  )}

                  {dimensions.length > 9 && (
                    <p className="text-[11px] text-text-muted text-right font-medium">
                      +{dimensions.length - 9} additional measurement points
                    </p>
                  )}
                </div>

                {/* Bottom: Version info & Quick Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-text-muted/60" />
                    <span>
                      {profile.versions && profile.versions.length > 1
                        ? `${profile.versions.length} versions logged`
                        : 'Initial version (v1)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintingProfile(profile)}
                      className="px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Print Measurement Sheet"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRecordNewForCustomer(matchingCustomer || (profile.customer as any))}
                      className="px-3 py-1.5 rounded-lg border border-border bg-surface-muted hover:bg-border text-text-primary font-bold text-xs transition-colors cursor-pointer"
                      title="Update measurements with a new version"
                    >
                      + New Version
                    </button>

                    {onNavigateToNewOrder && (
                      <button
                        type="button"
                        onClick={() => onNavigateToNewOrder(profile.customerId, profile.id)}
                        className="px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-dark font-bold text-xs transition-colors flex items-center gap-1"
                        title="Start an order using this profile"
                      >
                        <span>Order</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Measurement Drawer ── */}
      <AddMeasurementDrawer
        isOpen={isAddMeasurementOpen}
        onClose={() => setIsAddMeasurementOpen(false)}
        authToken={authToken}
        customers={customers}
        selectedCustomer={preselectedCustomer}
        onProfileCreated={handleProfileCreated}
      />

      {/* ── Add Customer Drawer ── */}
      <AddCustomerDrawer
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        authToken={authToken}
        onCustomerCreated={(newCust) => {
          setCustomers((prev) => [newCust, ...prev]);
          setPreselectedCustomer(newCust);
          setIsAddMeasurementOpen(true);
        }}
      />

      {/* ── Print Measurement Sheet Modal for Saved Profiles ── */}
      {printingProfile && (
        <PrintMeasurementSheetModal
          isOpen={!!printingProfile}
          onClose={() => setPrintingProfile(null)}
          customer={
            customers.find((c) => c.id === printingProfile.customerId) ||
            (printingProfile.customer as Customer) ||
            null
          }
          customers={customers}
          presetLabel={printingProfile.name}
          garmentType={printingProfile.garmentType}
          profileName={printingProfile.name}
          unit={
            (printingProfile.currentVersion?.unit || printingProfile.versions?.[0]?.unit) ===
            'CENTIMETERS'
              ? 'cm'
              : 'in'
          }
          fitPreference={
            printingProfile.currentVersion?.fitPreference ||
            printingProfile.versions?.[0]?.fitPreference ||
            'REGULAR'
          }
          notes={printingProfile.notes || printingProfile.currentVersion?.fitNotes || ''}
          values={
            (printingProfile.currentVersion?.values ||
              printingProfile.versions?.[0]?.values ||
              {}) as Record<string, string | number>
          }
        />
      )}
    </div>
  );
};
