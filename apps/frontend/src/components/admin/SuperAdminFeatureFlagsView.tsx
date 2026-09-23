import React, { useState, useEffect } from 'react';
import {
  ToggleLeft,
  ToggleRight,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Sliders,
} from 'lucide-react';

interface TenantOverride {
  id: string;
  tenantId: string;
  enabled: boolean;
  reason?: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

interface PlatformFeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  globalEnabled: boolean;
  overrides?: TenantOverride[];
  createdAt: string;
  updatedAt: string;
}

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

interface SuperAdminFeatureFlagsViewProps {
  authToken: string;
}

export const SuperAdminFeatureFlagsView: React.FC<SuperAdminFeatureFlagsViewProps> = ({
  authToken,
}) => {
  const [flags, setFlags] = useState<PlatformFeatureFlag[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Flag Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newGlobal, setNewGlobal] = useState(false);
  const [savingFlag, setSavingFlag] = useState(false);

  // Add Override Modal
  const [overrideModalFlag, setOverrideModalFlag] = useState<PlatformFeatureFlag | null>(null);
  const [overrideTenantId, setOverrideTenantId] = useState('');
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const [flagsRes, tenantsRes] = await Promise.all([
        fetch('/api/admin/feature-flags', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch('/api/admin/tenants?limit=100', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (flagsRes.ok) {
        const json = await flagsRes.json();
        setFlags(json.data || []);
      }

      if (tenantsRes.ok) {
        const json = await tenantsRes.json();
        setTenants(json.tenants || json.data?.tenants || []);
      }
    } catch (err) {
      console.error('Failed to load feature flags:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [authToken]);

  const handleToggleGlobal = async (flag: PlatformFeatureFlag) => {
    const nextVal = !flag.globalEnabled;
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          key: flag.key,
          name: flag.name,
          description: flag.description,
          globalEnabled: nextVal,
        }),
      });

      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) => (f.key === flag.key ? { ...f, globalEnabled: nextVal } : f)),
        );
      }
    } catch (err) {
      console.error('Error toggling feature flag:', err);
    }
  };

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingFlag(true);
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          key: newKey.trim(),
          name: newName.trim(),
          description: newDesc.trim() || undefined,
          globalEnabled: newGlobal,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewKey('');
        setNewName('');
        setNewDesc('');
        setNewGlobal(false);
        fetchFlags();
      }
    } catch (err) {
      console.error('Error creating flag:', err);
    } finally {
      setSavingFlag(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalFlag || !overrideTenantId) return;

    try {
      setSavingOverride(true);
      const res = await fetch(`/api/admin/feature-flags/${overrideModalFlag.key}/tenant-override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tenantId: overrideTenantId,
          enabled: overrideEnabled,
          reason: overrideReason.trim() || undefined,
        }),
      });

      if (res.ok) {
        setOverrideModalFlag(null);
        setOverrideTenantId('');
        setOverrideReason('');
        fetchFlags();
      }
    } catch (err) {
      console.error('Error setting override:', err);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleRemoveOverride = async (flagKey: string, tenantId: string) => {
    if (!window.confirm('Remove this tenant override? The tenant will inherit the global flag state.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/feature-flags/${flagKey}/tenant-override/${tenantId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        fetchFlags();
      }
    } catch (err) {
      console.error('Error deleting override:', err);
    }
  };

  const filteredFlags = flags.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Feature Flags & Overrides</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              Gradual Rollout
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Dynamic platform capability toggles with relational, per-tenant override rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFlags}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-lg transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Feature Flag
          </button>
        </div>
      </div>

      {/* ── Search Bar ────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter flags by name, key, or description..."
          className="w-full text-xs bg-transparent focus:outline-none text-stone-800 placeholder:text-stone-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-stone-400 hover:text-stone-600">
            Clear
          </button>
        )}
      </div>

      {/* ── Flags List ────────────────────────────────────────────── */}
      <div className="space-y-4">
        {filteredFlags.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500 shadow-xs">
            <ToggleLeft className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-stone-900 mb-1">No Feature Flags Configured</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
              Add feature flags to control release gates, beta capabilities, or tenant entitlements dynamically.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-lg cursor-pointer transition"
            >
              Create First Flag
            </button>
          </div>
        ) : (
          filteredFlags.map((flag) => {
            const overrides = flag.overrides || [];

            return (
              <div
                key={flag.id}
                className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4 hover:border-stone-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-stone-900">{flag.name}</h3>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                        {flag.key}
                      </span>
                    </div>
                    {flag.description && (
                      <p className="text-xs text-stone-500">{flag.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <button
                      onClick={() => handleToggleGlobal(flag)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        flag.globalEnabled
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-stone-50 border-stone-300 text-stone-600'
                      }`}
                    >
                      {flag.globalEnabled ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-600" />
                          <span>Globally Enabled</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-stone-400" />
                          <span>Globally Disabled</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setOverrideModalFlag(flag);
                        setOverrideTenantId('');
                        setOverrideEnabled(true);
                        setOverrideReason('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-brand/10 text-stone-700 hover:text-brand rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Add Override
                    </button>
                  </div>
                </div>

                {/* Tenant Overrides Section */}
                {overrides.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                    <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Tenant Specific Overrides ({overrides.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {overrides.map((ov) => (
                        <div
                          key={ov.id}
                          className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs"
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold text-stone-800 block truncate">
                              {ov.tenant.name}
                            </span>
                            <span
                              className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                                ov.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {ov.enabled ? 'Override: Enabled' : 'Override: Disabled'}
                            </span>
                          </div>

                          <button
                            onClick={() => handleRemoveOverride(flag.key, ov.tenantId)}
                            className="p-1 text-stone-400 hover:text-rose-600 transition rounded hover:bg-stone-200/60 cursor-pointer"
                            title="Remove Override"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Create Flag Modal ──────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-4">Create Platform Feature Flag</h3>

            <form onSubmit={handleCreateFlag} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Unique Key (Identifier)
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g., ai_smart_measurements, export_excel"
                  className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., AI Smart Measurement Extraction"
                  className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Summary of capability and rollout intent..."
                  className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 min-h-[60px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newGlobalCheck"
                  checked={newGlobal}
                  onChange={(e) => setNewGlobal(e.target.checked)}
                  className="rounded text-brand"
                />
                <label htmlFor="newGlobalCheck" className="text-xs font-medium text-stone-800 cursor-pointer">
                  Enable globally for all tenants upon creation
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-semibold text-stone-600 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFlag}
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl cursor-pointer"
                >
                  {savingFlag ? 'Saving...' : 'Create Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Set Tenant Override Modal ──────────────────────────────── */}
      {overrideModalFlag && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Add Tenant Override: <span className="font-mono text-sm text-brand">{overrideModalFlag.key}</span>
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Explicit override takes precedence over the global flag value for the selected tenant.
            </p>

            <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Target Tenant
                </label>
                <select
                  value={overrideTenantId}
                  onChange={(e) => setOverrideTenantId(e.target.value)}
                  className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
                  required
                >
                  <option value="">-- Choose Tenant --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Override State
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                      overrideEnabled ? 'border-emerald-600 bg-emerald-50/50' : 'border-stone-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ovState"
                      checked={overrideEnabled}
                      onChange={() => setOverrideEnabled(true)}
                    />
                    <span className="font-semibold text-emerald-900">Force Enabled</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                      !overrideEnabled ? 'border-rose-600 bg-rose-50/50' : 'border-stone-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ovState"
                      checked={!overrideEnabled}
                      onChange={() => setOverrideEnabled(false)}
                    />
                    <span className="font-semibold text-rose-900">Force Disabled</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Reason for Override (Optional)
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Early adopter beta trial customer"
                  className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setOverrideModalFlag(null)}
                  className="px-4 py-2 font-semibold text-stone-600 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOverride}
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl cursor-pointer"
                >
                  {savingOverride ? 'Saving...' : 'Set Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
