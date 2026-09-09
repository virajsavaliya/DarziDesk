import React, { useState } from 'react';
import type { Customer, MeasurementProfile } from '../../types/dashboard';

interface CustomerLookupProps {
  authToken: string;
}

export const CustomerLookup: React.FC<CustomerLookupProps> = ({ authToken }) => {
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
      {/* Search Header Bar */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-text-primary mb-1">
          Shop Customer & Measurement Directory
        </h2>
        <p className="text-xs text-text-secondary mb-4">
          Search all customers in your shop by phone number or name to view profiles and measurement history.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or phone number..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <svg
              className="w-4 h-4 text-text-muted absolute left-3.5 top-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2.5 bg-brand text-white font-medium text-sm rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {searchError && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          {searchError}
        </div>
      )}

      {/* Grid Layout: Customer List vs. Measurements View */}
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
            <div className="bg-surface border border-border border-dashed rounded-xl p-8 text-center text-text-muted text-sm">
              Enter a name or phone number to look up customer records.
            </div>
          )}

          <div className="space-y-2">
            {customers.map((c) => {
              const isSelected = selectedCustomer?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand/5 border-brand ring-1 ring-brand'
                      : 'bg-surface border-border hover:border-brand/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-text-primary text-sm">
                        {c.firstName} {c.lastName}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
                        <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{c.phone}</span>
                      </div>
                      {c.email && (
                        <span className="text-xs text-text-muted block mt-0.5">{c.email}</span>
                      )}
                    </div>
                    <span className="text-xs text-brand font-medium">
                      View Profiles →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Customer Measurement Profiles */}
        <div className="lg:col-span-7">
          {selectedCustomer ? (
            <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
              <div className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-text-primary">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}'s Profiles
                  </h3>
                  <span className="text-xs text-text-muted font-mono">{selectedCustomer.phone}</span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Measurement profiles and version history on file for this shop.
                </p>
              </div>

              {loadingProfiles && (
                <div className="py-12 text-center text-text-muted animate-pulse text-sm">
                  Loading measurement profiles...
                </div>
              )}

              {profilesError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-xs">
                  {profilesError}
                </div>
              )}

              {!loadingProfiles && profiles.length === 0 && (
                <div className="p-6 text-center text-text-muted text-sm bg-background rounded-lg border border-border/60">
                  No measurement profiles recorded for this customer yet.
                </div>
              )}

              <div className="space-y-4">
                {profiles.map((prof) => {
                  const currentVer = prof.versions?.find((v) => v.isCurrent) || prof.versions?.[0];
                  const vals = currentVer?.values || {};

                  return (
                    <div
                      key={prof.id}
                      className="bg-background rounded-xl p-4 border border-border space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-text-primary">{prof.name}</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand/10 text-brand">
                            {prof.garmentType}
                          </span>
                        </div>
                        {currentVer && (
                          <span className="text-xs font-mono text-text-muted">
                            v{currentVer.versionNumber} • {currentVer.unit || 'inches'}
                          </span>
                        )}
                      </div>

                      {currentVer?.fitPreference && (
                        <div className="text-xs text-text-secondary bg-surface p-2.5 rounded-lg border border-border/50">
                          <span className="font-semibold text-text-primary">Fit: </span>
                          {currentVer.fitPreference}
                          {currentVer.fitNotes && <span> ({currentVer.fitNotes})</span>}
                        </div>
                      )}

                      {/* Values Grid */}
                      {Object.keys(vals).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {Object.entries(vals).map(([k, v]) => (
                            <div key={k} className="bg-surface p-2.5 rounded-lg border border-border/60">
                              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                                {k}
                              </span>
                              <span className="text-sm font-bold font-mono text-text-primary">
                                {String(v)}{' '}
                                <span className="text-[10px] font-normal text-text-muted">
                                  {currentVer?.unit || 'in'}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted italic">No measurement values logged.</p>
                      )}

                      {/* Version count indicator */}
                      {prof.versions && prof.versions.length > 1 && (
                        <div className="text-[11px] text-text-muted pt-1 flex justify-end">
                          <span>{prof.versions.length} historical versions recorded</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-muted text-sm flex flex-col items-center justify-center min-h-[300px]">
              <svg className="w-10 h-10 text-text-muted/50 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Select a customer from the left to view their measurement records.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
