import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Package,
  Scissors,
  Check,
  Ruler,
  AlertCircle,
  X,
} from 'lucide-react';
import type {
  FabricItem,
  GarmentType,
  CustomerPortalShop,
  MeasurementProfile,
} from '../../types/dashboard';

interface ShopCatalogViewProps {
  authToken: string;
  defaultTenantId?: string;
  onOrderCreated?: (order: any) => void;
}

const DEFAULT_METERS: Record<GarmentType, string> = {
  SHIRT: '2.500',
  PANT: '1.500',
  KURTA: '3.000',
  TSHIRT: '1.800',
  CUSTOM: '2.000',
};

export const ShopCatalogView: React.FC<ShopCatalogViewProps> = ({
  authToken,
  defaultTenantId,
  onOrderCreated,
}) => {
  const [shop, setShop] = useState<CustomerPortalShop | null>(null);
  const [fabrics, setFabrics] = useState<FabricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shop ID for catalog
  const [tenantId, setTenantId] = useState<string>(defaultTenantId || '');

  // Order modal state
  const [selectedFabric, setSelectedFabric] = useState<FabricItem | null>(null);
  const [garmentType, setGarmentType] = useState<GarmentType>('SHIRT');
  const [metersUsed, setMetersUsed] = useState<string>('2.500');
  const [fittingType, setFittingType] = useState<'IN_STORE' | 'EXISTING' | 'SELF'>('IN_STORE');
  const [existingProfiles, setExistingProfiles] = useState<MeasurementProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selfValues, setSelfValues] = useState<Record<string, string>>({
    chest: '40',
    waist: '34',
    length: '30',
  });
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [orderErrorMsg, setOrderErrorMsg] = useState<string | null>(null);

  // Load shop on mount if defaultTenantId is not set
  useEffect(() => {
    if (defaultTenantId) {
      setTenantId(defaultTenantId);
      return;
    }
    fetch('/api/dev/demo-session')
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.tenant) {
          if (!tenantId) {
            setTenantId(json.data.tenant.id);
          }
        }
      })
      .catch(() => {});
  }, [defaultTenantId]);

  // Fetch catalog whenever tenantId changes
  const fetchCatalog = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/shops/${tenantId}/fabrics`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load shop catalog (${res.status})`);
      const json = await res.json();
      setShop(json.shop);
      setFabrics(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading shop fabrics');
    } finally {
      setLoading(false);
    }
  }, [tenantId, authToken]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Fetch existing customer profiles for this shop
  useEffect(() => {
    if (!tenantId) return;
    fetch('/api/portal/measurement-profiles', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((json) => {
        const allProfiles: any[] = json.data || [];
        const shopProfiles = allProfiles.filter((p) => p.tenantId === tenantId);
        setExistingProfiles(shopProfiles);
        if (shopProfiles.length > 0) {
          setSelectedProfileId(shopProfiles[0].id);
        }
      })
      .catch(() => {});
  }, [tenantId, authToken]);

  const handleOpenOrderModal = (fabric: FabricItem) => {
    setSelectedFabric(fabric);
    setGarmentType('SHIRT');
    setMetersUsed(DEFAULT_METERS.SHIRT);
    setFittingType('IN_STORE');
    setOrderSuccessMsg(null);
    setOrderErrorMsg(null);
  };

  const handleGarmentChange = (gt: GarmentType) => {
    setGarmentType(gt);
    setMetersUsed(DEFAULT_METERS[gt] || '2.500');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFabric || !tenantId) return;

    setSubmittingOrder(true);
    setOrderErrorMsg(null);
    setOrderSuccessMsg(null);

    try {
      let finalProfileId: string | undefined = undefined;
      let inStoreFitting = false;

      if (fittingType === 'IN_STORE') {
        inStoreFitting = true;
      } else if (fittingType === 'EXISTING') {
        if (!selectedProfileId) {
          throw new Error('Please select an existing measurement profile');
        }
        finalProfileId = selectedProfileId;
      } else if (fittingType === 'SELF') {
        // Create self measurement profile first
        const profileRes = await fetch(`/api/portal/shops/${tenantId}/measurement-profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            name: `Self Measurement - ${garmentType}`,
            garmentType,
            values: selfValues,
            unit: 'INCHES',
          }),
        });
        if (!profileRes.ok) {
          const errJson = await profileRes.json();
          throw new Error(errJson.error?.message || 'Failed to record self measurements');
        }
        const profileJson = await profileRes.json();
        finalProfileId = profileJson.data.id;
      }

      // Submit order via shared Phase 4 order creation service endpoint
      const orderPayload: any = {
        fabricId: selectedFabric.id,
        garmentType,
        metersUsed,
        estimatedDeliveryDate: new Date(deliveryDate).toISOString(),
        notes: orderNotes || undefined,
        inStoreFitting,
        measurementProfileId: finalProfileId,
      };

      const res = await fetch(`/api/portal/shops/${tenantId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || `Failed to create order (${res.status})`);
      }

      const json = await res.json();
      setOrderSuccessMsg('Order placed successfully! Fabric reserved and tailoring order logged.');

      // Refresh catalog stock
      fetchCatalog();

      if (onOrderCreated) {
        onOrderCreated(json.data);
      }

      setTimeout(() => {
        setSelectedFabric(null);
      }, 1500);
    } catch (err: any) {
      setOrderErrorMsg(err.message || 'Error creating order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Price estimate calculation
  const estFabricCost = selectedFabric
    ? Number(metersUsed || 0) * Number(selectedFabric.pricePerMeter)
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Shop Header & Policy Banner ────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider">
              <Store className="w-3.5 h-3.5" />
              <span>Partner Atelier</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {shop?.name || 'Tailor Workshop Catalog'}
            </h1>
            <p className="text-xs text-text-secondary">
              Browse available bespoke cloth and place custom tailoring orders.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {shop?.allowsSelfMeasurement ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-xs font-semibold">
                <Check className="w-4 h-4" />
                <span>Self-Measurement Accepted</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand/5 text-brand border border-brand/15 text-xs font-semibold">
                <Ruler className="w-4 h-4" />
                <span>In-Store Fitting Available</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Fabric Grid ────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 bg-surface border border-border rounded-2xl animate-pulse space-y-4"
            >
              <div className="h-32 bg-surface-muted rounded-xl" />
              <div className="h-4 bg-surface-muted rounded w-2/3" />
              <div className="h-4 bg-surface-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-error-light border border-error/30 rounded-2xl text-error text-sm">
          <p className="font-semibold">Unable to load fabrics</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      ) : fabrics.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl space-y-3">
          <Package className="w-8 h-8 text-text-muted mx-auto" />
          <h3 className="text-base font-bold text-text-primary">No fabric in stock</h3>
          <p className="text-xs text-text-muted">
            This atelier currently has no fabric available for custom orders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {fabrics.map((fabric) => {
            const avail = Number(fabric.availableMeters);

            return (
              <div
                key={fabric.id}
                className="group bg-surface hover:bg-surface-muted/40 border border-border hover:border-brand/40 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Fabric Swatch Banner */}
                  <div className="h-28 rounded-xl bg-gradient-to-tr from-brand/10 via-surface-muted to-accent/10 border border-border flex items-center justify-center relative overflow-hidden">
                    <Scissors className="w-8 h-8 text-brand/30" />
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-surface text-text-primary text-[11px] font-bold shadow-xs border border-border">
                      {avail.toFixed(1)}m in stock
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-text-primary group-hover:text-brand transition-colors">
                      {fabric.name}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {fabric.color} • {fabric.type}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted block">
                      Price / Meter
                    </span>
                    <span className="text-base font-extrabold text-brand font-mono">
                      ₹{fabric.pricePerMeter}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenOrderModal(fabric)}
                    className="px-3.5 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Order Garment</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Order Placement Modal ──────────────────────────────────── */}
      {selectedFabric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Order Custom Tailored Garment
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Fabric: {selectedFabric.name} ({selectedFabric.color})
                </p>
              </div>
              <button
                onClick={() => setSelectedFabric(null)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error or Success feedback */}
            {orderErrorMsg && (
              <div className="p-3 bg-error-light border border-error/30 rounded-xl text-error text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{orderErrorMsg}</span>
              </div>
            )}
            {orderSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{orderSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Garment Type selection */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Select Garment Type
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(['SHIRT', 'PANT', 'KURTA', 'TSHIRT', 'CUSTOM'] as GarmentType[]).map((gt) => (
                    <button
                      type="button"
                      key={gt}
                      onClick={() => handleGarmentChange(gt)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        garmentType === gt
                          ? 'bg-brand text-white border-brand shadow-xs'
                          : 'bg-surface-muted text-text-secondary border-border hover:bg-surface'
                      }`}
                    >
                      {gt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meters to Use */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Fabric Length (Meters)
                  </label>
                  <input
                    type="text"
                    required
                    value={metersUsed}
                    onChange={(e) => setMetersUsed(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 font-mono"
                  />
                  <span className="text-[10px] text-text-muted mt-0.5 block">
                    Avail: {selectedFabric.availableMeters}m
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Estimated Delivery
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {/* Measurement Profile Options */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="block text-xs font-semibold text-text-secondary">
                  Measurement & Fitting Option
                </label>

                <div className="space-y-2">
                  {/* Option 1: In-Store Fitting (Default) */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      fittingType === 'IN_STORE'
                        ? 'bg-brand/5 border-brand'
                        : 'bg-surface border-border hover:bg-surface-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fittingType"
                      checked={fittingType === 'IN_STORE'}
                      onChange={() => setFittingType('IN_STORE')}
                      className="mt-0.5"
                    />
                    <div className="text-xs">
                      <strong className="text-text-primary font-semibold block">
                        In-Store Measurement Fitting (Recommended)
                      </strong>
                      <span className="text-text-muted text-[11px]">
                        The tailor will take your bespoke measurements in person at the workshop.
                      </span>
                    </div>
                  </label>

                  {/* Option 2: Existing Profile */}
                  {existingProfiles.length > 0 && (
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        fittingType === 'EXISTING'
                          ? 'bg-brand/5 border-brand'
                          : 'bg-surface border-border hover:bg-surface-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fittingType"
                        checked={fittingType === 'EXISTING'}
                        onChange={() => setFittingType('EXISTING')}
                        className="mt-0.5"
                      />
                      <div className="text-xs flex-1">
                        <strong className="text-text-primary font-semibold block">
                          Use Existing Profile on File
                        </strong>
                        {fittingType === 'EXISTING' && (
                          <select
                            value={selectedProfileId}
                            onChange={(e) => setSelectedProfileId(e.target.value)}
                            className="mt-1.5 w-full p-1.5 text-xs bg-surface border border-border rounded-lg"
                          >
                            {existingProfiles.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.garmentType})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </label>
                  )}

                  {/* Option 3: Self-Measurement (if allowed) */}
                  {shop?.allowsSelfMeasurement && (
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        fittingType === 'SELF'
                          ? 'bg-brand/5 border-brand'
                          : 'bg-surface border-border hover:bg-surface-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fittingType"
                        checked={fittingType === 'SELF'}
                        onChange={() => setFittingType('SELF')}
                        className="mt-0.5"
                      />
                      <div className="text-xs flex-1">
                        <strong className="text-text-primary font-semibold block">
                          Enter Measurements Manually
                        </strong>
                        {fittingType === 'SELF' && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {['chest', 'waist', 'length'].map((field) => (
                              <div key={field}>
                                <span className="text-[10px] text-text-muted capitalize block">
                                  {field} (in)
                                </span>
                                <input
                                  type="number"
                                  value={selfValues[field] || ''}
                                  onChange={(e) =>
                                    setSelfValues({ ...selfValues, [field]: e.target.value })
                                  }
                                  className="w-full p-1 text-xs border border-border rounded"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Special Tailoring Notes / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Slim fit cut, french cuffs, special collar style"
                  className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* Price Breakdown */}
              <div className="p-3 bg-surface-muted rounded-xl border border-border flex items-center justify-between text-xs">
                <span className="text-text-secondary">Estimated Fabric Cost:</span>
                <span className="font-extrabold text-brand font-mono text-sm">
                  ₹{estFabricCost.toFixed(2)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFabric(null)}
                  className="px-4 py-2 bg-surface hover:bg-surface-muted border border-border rounded-xl text-xs font-semibold text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  {submittingOrder ? 'Placing Order...' : 'Confirm & Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
