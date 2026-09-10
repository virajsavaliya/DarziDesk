import React, { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, TrendingDown, Plus, PlusCircle } from 'lucide-react';
import type { FabricItem } from '../../types/dashboard';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';
import { AddFabricDrawer } from './AddFabricDrawer';
import { AddStockDrawer } from './AddStockDrawer';

interface OwnerFabricViewProps {
  authToken: string;
}

function MeterBar({ available, reserved, total }: { available: number; reserved: number; total: number }) {
  const safeTotal = Math.max(total, 0.001);
  const availablePct = Math.min((available / safeTotal) * 100, 100);
  const reservedPct = Math.min((reserved / safeTotal) * 100, 100 - availablePct);
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-border overflow-hidden flex">
      <div
        className="h-full bg-success transition-all duration-500"
        style={{ width: `${availablePct}%` }}
      />
      <div
        className="h-full bg-warning transition-all duration-500"
        style={{ width: `${reservedPct}%` }}
      />
    </div>
  );
}

export const OwnerFabricView: React.FC<OwnerFabricViewProps> = ({ authToken }) => {
  const [fabrics, setFabrics] = useState<FabricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Drawer states
  const [isAddFabricOpen, setIsAddFabricOpen] = useState(false);
  const [selectedFabricForStock, setSelectedFabricForStock] = useState<FabricItem | null>(null);

  const fetchFabrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fabrics?limit=100', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      setFabrics(json.data ?? []);
    } catch {
      setFabrics([]);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchFabrics();
  }, [fetchFabrics]);

  const filtered = fabrics.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.color.toLowerCase().includes(q) || f.type.toLowerCase().includes(q);
  });

  const lowStockCount = fabrics.filter(
    (f) => parseFloat(f.availableMeters) <= parseFloat(f.lowStockThreshold),
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      {!loading && lowStockCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-warning-light border border-warning/30 rounded-xl text-sm">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <span className="text-warning font-medium">
            {lowStockCount} fabric{lowStockCount > 1 ? 's' : ''} are running low on stock
          </span>
        </div>
      )}

      <SectionCard
        title={`Fabric Inventory ${filtered.length > 0 ? `(${filtered.length})` : ''}`}
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-add-fabric"
              onClick={() => setIsAddFabricOpen(true)}
              className="min-h-[38px] px-3.5 py-1.5 bg-brand text-white font-bold text-xs rounded-xl hover:bg-brand-dark active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Fabric</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted">
              <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" /> Available
              <span className="ml-1.5 w-2.5 h-2.5 rounded-full bg-warning inline-block" /> Reserved
            </div>
          </div>
        }
      >
        {/* Search */}
        <div className="mb-4">
          <input
            id="search-fabric-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, color, or type…"
            className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[44px]"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-surface-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="No fabrics found"
            description="Add fabrics to your inventory to start tracking stock."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((fabric) => {
              const available = parseFloat(fabric.availableMeters);
              const reserved = parseFloat(fabric.reservedMeters);
              const threshold = parseFloat(fabric.lowStockThreshold);
              const total = available + reserved;
              const isLowStock = available <= threshold;

              return (
                <div
                  key={fabric.id}
                  className={`bg-surface border rounded-xl p-4 space-y-3 transition-shadow hover:shadow-sm ${
                    isLowStock ? 'border-warning/50 bg-warning-light/30' : 'border-border'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary leading-tight">{fabric.name}</h3>
                      <p className="text-xs text-text-muted mt-0.5 capitalize">
                        {fabric.color} · {fabric.type}
                      </p>
                    </div>
                    {isLowStock && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full shrink-0">
                        <TrendingDown className="w-3 h-3" /> Low
                      </span>
                    )}
                  </div>

                  {/* Meters */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-text-muted">Available</p>
                      <p className="font-semibold text-success">{available.toFixed(2)} m</p>
                    </div>
                    <div>
                      <p className="text-text-muted">Reserved</p>
                      <p className="font-semibold text-warning">{reserved.toFixed(2)} m</p>
                    </div>
                  </div>

                  {/* Stock bar */}
                  <MeterBar available={available} reserved={reserved} total={total} />

                  {/* Footer: Price + Add Stock action */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/60">
                    <p className="text-[11px] text-text-muted">
                      ₹{parseFloat(fabric.pricePerMeter).toFixed(0)}/m
                      {isLowStock && (
                        <span className="text-warning ml-1.5">
                          · alert ≤ {threshold.toFixed(1)}m
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      id={`btn-add-stock-${fabric.id}`}
                      onClick={() => setSelectedFabricForStock(fabric)}
                      className="px-2.5 py-1 bg-surface-muted hover:bg-surface border border-border text-text-primary text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs hover:border-success/40"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-success" />
                      <span>Add Stock</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Drawers ────────────────────────────────────────── */}
      <AddFabricDrawer
        isOpen={isAddFabricOpen}
        onClose={() => setIsAddFabricOpen(false)}
        authToken={authToken}
        onFabricCreated={fetchFabrics}
      />

      <AddStockDrawer
        isOpen={Boolean(selectedFabricForStock)}
        onClose={() => setSelectedFabricForStock(null)}
        authToken={authToken}
        fabric={selectedFabricForStock}
        onStockAdded={fetchFabrics}
      />
    </div>
  );
};
