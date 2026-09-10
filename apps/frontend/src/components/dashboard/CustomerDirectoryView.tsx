import React, { useState, useEffect, useCallback } from 'react';
import type { Customer, MeasurementProfile } from '../../types/dashboard';
import { CustomerCard } from './CustomerCard';
import { MeasurementCard } from './MeasurementCard';
import { SearchInput } from '../common/SearchInput';
import { AddCustomerDrawer } from './AddCustomerDrawer';
import { AddMeasurementDrawer } from './AddMeasurementDrawer';
import { Users, Ruler, AlertCircle, UserPlus, Plus } from 'lucide-react';

interface CustomerDirectoryViewProps {
  authToken: string;
}

export const CustomerDirectoryView: React.FC<CustomerDirectoryViewProps> = ({
  authToken,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  // Drawer states
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddMeasurementOpen, setIsAddMeasurementOpen] = useState(false);

  const fetchProfilesForCustomer = useCallback(
    async (customerId: string) => {
      setLoadingProfiles(true);
      setProfilesError(null);
      try {
        const res = await fetch(`/api/customers/${customerId}/measurements`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) throw new Error(`Failed to load measurements (${res.status})`);
        const json = await res.json();
        setProfiles(json.data || []);
      } catch (err: any) {
        setProfilesError(err.message || 'Error loading measurement profiles');
      } finally {
        setLoadingProfiles(false);
      }
    },
    [authToken],
  );

  const fetchCustomers = useCallback(
    async (query?: string) => {
      setSearching(true);
      setSearchError(null);
      try {
        const trimmed = query?.trim() ?? '';
        const url = trimmed
          ? `/api/customers/search?query=${encodeURIComponent(trimmed)}`
          : '/api/customers?limit=100';

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!res.ok) throw new Error(`Failed to fetch customers (${res.status})`);
        const json = await res.json();
        const list: Customer[] = json.data || [];
        setCustomers(list);
        setHasSearched(true);

        // Auto-select first customer if none selected yet
        if (!trimmed && list.length > 0 && !selectedCustomer) {
          setSelectedCustomer(list[0]);
          fetchProfilesForCustomer(list[0].id);
        }
      } catch (err: any) {
        setSearchError(err.message || 'Error loading customers');
      } finally {
        setSearching(false);
      }
    },
    [authToken, selectedCustomer, fetchProfilesForCustomer],
  );

  // Initial load on mount
  useEffect(() => {
    if (authToken) {
      fetchCustomers();
    }
  }, [authToken, fetchCustomers]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchCustomers(searchQuery);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchProfilesForCustomer(customer.id);
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === newCustomer.id);
      return exists ? prev : [newCustomer, ...prev];
    });
    setSelectedCustomer(newCustomer);
    setProfiles([]);
  };

  const handleProfileCreated = (newProfile: MeasurementProfile) => {
    if (newProfile.customerId && (!selectedCustomer || selectedCustomer.id !== newProfile.customerId)) {
      const match = customers.find((c) => c.id === newProfile.customerId);
      if (match) {
        setSelectedCustomer(match);
      }
    }
    setProfiles((prev) => {
      const exists = prev.some((p) => p.id === newProfile.id);
      return exists ? prev.map((p) => (p.id === newProfile.id ? newProfile : p)) : [newProfile, ...prev];
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar: Search + Primary "Add Customer" & "Record Measurements" ── */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-text-primary">
              Customer & Measurement Directory
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Manage client records, body measurements, and bespoke garment specifications
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="min-h-[44px] px-4 py-2.5 bg-brand text-white font-bold text-sm rounded-xl hover:bg-brand-dark active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm"
              id="btn-add-customer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddMeasurementOpen(true)}
              className="min-h-[44px] px-4 py-2.5 bg-accent text-white font-bold text-sm rounded-xl hover:bg-accent-dark active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm"
              id="btn-record-measurements"
            >
              <Ruler className="w-4 h-4" />
              <span>Record Measurements</span>
            </button>
          </div>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2.5 pt-1">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search customers by name or phone number..."
              id="directory-search-input"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="min-h-[44px] px-5 py-2.5 bg-surface-muted border border-border text-text-primary font-bold text-sm rounded-xl hover:bg-border transition-all disabled:opacity-50 shrink-0"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchCustomers('');
              }}
              className="min-h-[44px] px-3.5 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
            >
              Clear
            </button>
          )}
        </form>

        {searchError && (
          <div className="p-3 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* ── Split Pane: Customer List vs. Measurement Records ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customer Results */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Customers ({customers.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="text-xs font-bold text-brand hover:text-brand-dark flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {customers.length === 0 && hasSearched && !searching && (
            <div className="bg-surface border border-border rounded-2xl p-8 text-center text-text-muted text-sm space-y-3">
              <Users className="w-10 h-10 text-text-muted/40 mx-auto" />
              <p>No customers found matching your criteria.</p>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="px-4 py-2 bg-brand text-white font-bold text-xs rounded-xl hover:bg-brand-dark transition-all inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add New Customer</span>
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {customers.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                isSelected={selectedCustomer?.id === c.id}
                onClick={() => handleSelectCustomer(c)}
              />
            ))}
          </div>
        </div>

        {/* Right: Selected Customer Profiles */}
        <div className="lg:col-span-7">
          {selectedCustomer ? (
            <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-5">
              {/* Customer Profile Header with Add Measurement Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-text-primary flex items-center gap-2">
                    <span>{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                    <span className="text-xs font-mono font-normal text-text-muted px-2.5 py-0.5 rounded-full bg-surface-muted border border-border">
                      {selectedCustomer.phone}
                    </span>
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {selectedCustomer.email || 'No email registered'} • Measurement history on file
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddMeasurementOpen(true)}
                  className="min-h-[40px] px-3.5 py-2 bg-accent text-white font-bold text-xs rounded-xl hover:bg-accent-dark active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  id="btn-add-measurement-for-customer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Measurement</span>
                </button>
              </div>

              {loadingProfiles && (
                <div className="py-16 text-center text-text-muted animate-pulse text-sm">
                  Loading measurement profiles...
                </div>
              )}

              {profilesError && (
                <div className="p-3 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profilesError}</span>
                </div>
              )}

              {!loadingProfiles && profiles.length === 0 && (
                <div className="p-8 text-center text-text-muted text-sm bg-background rounded-xl border border-dashed border-border space-y-3">
                  <Ruler className="w-10 h-10 text-text-muted/40 mx-auto" />
                  <p>No measurement profiles recorded for this customer yet.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddMeasurementOpen(true)}
                    className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-xl hover:bg-accent-dark transition-all inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record First Measurement</span>
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {profiles.map((prof) => (
                  <MeasurementCard key={prof.id} profile={prof} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center text-text-muted text-sm flex flex-col items-center justify-center min-h-[360px] space-y-3">
              <Ruler className="w-12 h-12 text-text-muted/30" />
              <span className="font-bold text-base text-text-primary">No Customer Selected</span>
              <p className="text-xs text-text-secondary max-w-sm">
                Select a customer from the list on the left to view their measurement history, or record a new profile.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="px-4 py-2 bg-brand text-white font-bold text-xs rounded-xl hover:bg-brand-dark transition-all"
                >
                  Add Customer
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddMeasurementOpen(true)}
                  className="px-4 py-2 bg-accent text-white font-bold text-xs rounded-xl hover:bg-accent-dark transition-all"
                >
                  Record Measurements
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Slide-Over Drawers ───────────────────────────────── */}
      <AddCustomerDrawer
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        authToken={authToken}
        onCustomerCreated={handleCustomerCreated}
      />

      <AddMeasurementDrawer
        isOpen={isAddMeasurementOpen}
        onClose={() => setIsAddMeasurementOpen(false)}
        authToken={authToken}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onProfileCreated={handleProfileCreated}
      />
    </div>
  );
};
