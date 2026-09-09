import React, { useState } from 'react';
import type { Customer, MeasurementProfile } from '../../types/dashboard';
import { CustomerCard } from './CustomerCard';
import { MeasurementCard } from './MeasurementCard';
import { SearchInput } from '../common/SearchInput';
import { SectionCard } from '../common/SectionCard';
import { Users, Ruler, AlertCircle } from 'lucide-react';

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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setSelectedCustomer(null);
    setProfiles([]);

    try {
      const res = await fetch(
        `/api/customers/search?query=${encodeURIComponent(searchQuery.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const json = await res.json();
      setCustomers(json.data || []);
    } catch (err: any) {
      setSearchError(err.message || 'Error searching customers');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoadingProfiles(true);
    setProfilesError(null);

    try {
      const res = await fetch(`/api/customers/${customer.id}/measurements`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load measurements (${res.status})`);
      }

      const json = await res.json();
      setProfiles(json.data || []);
    } catch (err: any) {
      setProfilesError(err.message || 'Error loading measurement profiles');
    } finally {
      setLoadingProfiles(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Search Bar SectionCard ────────────────────────────── */}
      <SectionCard
        title="Customer & Measurement Directory"
        subtitle="Search all customers in your shop to view profiles and measurement records"
      >
        <form onSubmit={handleSearch} className="flex gap-2.5">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by customer name or phone number..."
              id="directory-search-input"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="min-h-[44px] px-5 py-2.5 bg-brand text-white font-bold text-sm rounded-xl hover:bg-brand-dark active:scale-[0.98] transition-all disabled:opacity-50 shrink-0"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchError && (
          <div className="mt-3 p-3 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </SectionCard>

      {/* ── Split Pane: Customer Results vs. Measurement Profiles ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customer Results */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Customer Results ({customers.length})
            </h3>
          </div>

          {customers.length === 0 && hasSearched && !searching && (
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-muted text-sm">
              No customers found matching "{searchQuery}".
            </div>
          )}

          {!hasSearched && (
            <div className="bg-surface border border-border border-dashed rounded-xl p-8 text-center text-text-muted text-sm flex flex-col items-center justify-center">
              <Users className="w-8 h-8 text-text-muted/60 mb-2" />
              <span>Enter a customer name or phone number to look up records.</span>
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
            <SectionCard
              title={`${selectedCustomer.firstName} ${selectedCustomer.lastName}'s Profiles`}
              subtitle={`Phone: ${selectedCustomer.phone} • Tenant-scoped measurement records`}
            >
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
                <div className="p-8 text-center text-text-muted text-sm bg-background rounded-xl border border-dashed border-border">
                  No measurement profiles recorded for this customer yet.
                </div>
              )}

              <div className="space-y-4">
                {profiles.map((prof) => (
                  <MeasurementCard key={prof.id} profile={prof} />
                ))}
              </div>
            </SectionCard>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-muted text-sm flex flex-col items-center justify-center min-h-[340px]">
              <Ruler className="w-10 h-10 text-text-muted/40 mb-3" />
              <span className="font-medium text-text-primary">No Customer Selected</span>
              <span className="text-xs text-text-secondary mt-1">
                Select a customer from the left to view their measurement specifications.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
