import React, { useState, useEffect, useCallback } from 'react';
import { Drawer } from '../common/Drawer';
import type { Customer, Fabric, GarmentType, MeasurementProfile, Order } from '../../types/dashboard';
import { AddCustomerDrawer } from './AddCustomerDrawer';
import { AddMeasurementDrawer } from './AddMeasurementDrawer';
import {
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  User,
  Package,
  Ruler,
  Calendar,
  UserPlus,
  Search,
  Check,
  UserCheck,
} from 'lucide-react';

interface NewOrderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onOrderCreated: (order: Order) => void;
}

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const GARMENT_TYPES: { type: GarmentType; label: string }[] = [
  { type: 'SHIRT', label: 'Bespoke Shirt' },
  { type: 'PANT', label: 'Formal Trousers / Pant' },
  { type: 'KURTA', label: 'Traditional Kurta' },
  { type: 'TSHIRT', label: 'Tailored T-Shirt' },
  { type: 'CUSTOM', label: 'Custom Garment' },
];

export const NewOrderDrawer: React.FC<NewOrderDrawerProps> = ({
  isOpen,
  onClose,
  authToken,
  onOrderCreated,
}) => {
  // Master data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loadingFabrics, setLoadingFabrics] = useState(false);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Form selections
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerProfiles, setCustomerProfiles] = useState<MeasurementProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const [selectedFabricId, setSelectedFabricId] = useState<string>('');
  const [garmentType, setGarmentType] = useState<GarmentType>('SHIRT');
  const [metersUsed, setMetersUsed] = useState<string>('2.5');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState<string>('');

  // Search queries for selects
  const [customerSearch, setCustomerSearch] = useState('');

  // Inline child drawers
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddMeasurementOpen, setIsAddMeasurementOpen] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. Fetch Customers
  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const res = await fetch('/api/customers?limit=100', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      setCustomers(json.data || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, [authToken]);

  // 2. Fetch Fabrics
  const fetchFabrics = useCallback(async () => {
    setLoadingFabrics(true);
    try {
      const res = await fetch('/api/fabrics?isActive=true', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      setFabrics(json.data || []);
    } catch {
      setFabrics([]);
    } finally {
      setLoadingFabrics(false);
    }
  }, [authToken]);

  // 3. Fetch Staff Members for Craftsman assignment
  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setStaffList(json.data || []);
      }
    } catch {
      setStaffList([]);
    } finally {
      setLoadingStaff(false);
    }
  }, [authToken]);

  // 3. Fetch Measurements when customer changes
  const fetchCustomerProfiles = useCallback(
    async (customerId: string) => {
      if (!customerId) {
        setCustomerProfiles([]);
        return;
      }
      setLoadingProfiles(true);
      try {
        const res = await fetch(`/api/customers/${customerId}/measurements`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const json = await res.json();
        const profiles: MeasurementProfile[] = json.data || [];
        setCustomerProfiles(profiles);

        // Auto-select profile matching garmentType if available
        const match = profiles.find((p) => p.garmentType === garmentType);
        if (match) {
          setSelectedProfileId(match.id);
        } else if (profiles.length > 0) {
          setSelectedProfileId(profiles[0].id);
        } else {
          setSelectedProfileId('');
        }
      } catch {
        setCustomerProfiles([]);
        setSelectedProfileId('');
      } finally {
        setLoadingProfiles(false);
      }
    },
    [authToken, garmentType],
  );

  useEffect(() => {
    if (isOpen && authToken) {
      fetchCustomers();
      fetchFabrics();
      fetchStaff();
      setError(null);
      setSuccess(null);
      setSelectedStaffId('');
    }
  }, [isOpen, authToken, fetchCustomers, fetchFabrics, fetchStaff]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerProfiles(selectedCustomerId);
    } else {
      setCustomerProfiles([]);
      setSelectedProfileId('');
    }
  }, [selectedCustomerId, fetchCustomerProfiles]);

  // Auto-pick profile when garmentType changes
  useEffect(() => {
    if (customerProfiles.length > 0) {
      const match = customerProfiles.find((p) => p.garmentType === garmentType);
      if (match) setSelectedProfileId(match.id);
    }
  }, [garmentType, customerProfiles]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedFabric = fabrics.find((f) => f.id === selectedFabricId);

  // Filtered customer list for search
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    return fullName.includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q));
  });

  // Client-side stock warning
  const availableMetersNum = selectedFabric ? parseFloat(selectedFabric.availableMeters || '0') : 0;
  const metersUsedNum = parseFloat(metersUsed) || 0;
  const isInsufficientStock = selectedFabric && metersUsedNum > availableMetersNum;

  // Handler for creating order
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedCustomerId) {
      setError('Please select or create a customer.');
      return;
    }
    if (!selectedFabricId) {
      setError('Please select a fabric from the inventory.');
      return;
    }
    if (!selectedProfileId) {
      setError('Please select or create a measurement profile for this customer.');
      return;
    }
    if (isNaN(metersUsedNum) || metersUsedNum <= 0) {
      setError('Meters used must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        measurementProfileId: selectedProfileId,
        fabricId: selectedFabricId,
        garmentType,
        metersUsed: metersUsed.trim(),
        assignedStaffId: selectedStaffId || undefined,
        estimatedDeliveryDate: estimatedDeliveryDate
          ? new Date(estimatedDeliveryDate).toISOString()
          : null,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error?.message ||
            json.message ||
            `Failed to create order (${res.status}). Check fabric stock or entitlement limits.`,
        );
      }

      const createdOrder: Order = json.data;
      setSuccess(`Order #${createdOrder.id.slice(0, 8).toUpperCase()} created successfully!`);

      // Refresh inventory in background
      fetchFabrics();

      // Notify parent
      setTimeout(() => {
        onOrderCreated(createdOrder);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while placing the order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Create New Bespoke Order"
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-surface hover:bg-surface-muted border border-border text-text-primary font-semibold text-xs sm:text-sm rounded-xl transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="submit-order-btn"
              disabled={submitting}
              onClick={handleSubmit}
              className="flex-[2] py-2.5 px-4 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submitting ? 'Placing Order…' : 'Confirm & Place Order'}</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6 pb-2">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-error-light border border-error/30 rounded-xl text-error text-xs font-semibold flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="p-3.5 bg-success-light border border-success/30 rounded-xl text-success text-xs font-semibold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}


          {/* ── STEP 1: CUSTOMER SELECTION ─────────────────────────────────── */}
          <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-brand" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  1. Customer
                </h3>
              </div>
              <button
                type="button"
                data-testid="quick-add-customer-btn"
                onClick={() => setIsAddCustomerOpen(true)}
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 min-h-[32px] px-2"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + Quick Add Customer
              </button>
            </div>

            {selectedCustomer ? (
              <div className="p-3 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-between" data-testid="selected-customer-banner">
                <div>
                  <div className="font-semibold text-sm text-text-primary flex items-center gap-1.5">
                    <span>{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                    <span className="text-[10px] bg-accent/20 text-accent font-mono px-1.5 py-0.5 rounded">
                      Selected
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {selectedCustomer.phone} {selectedCustomer.email ? `• ${selectedCustomer.email}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId('')}
                  className="text-xs text-text-muted hover:text-text-primary underline px-2 py-1"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search existing customer by name or phone…"
                    className="w-full pl-9 pr-3 py-2 bg-surface-muted border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent min-h-[40px]"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-border rounded-xl divide-y divide-border/60 bg-surface-muted/30">
                  {loadingCustomers ? (
                    <div className="p-3 text-xs text-center text-text-muted">Loading customers…</div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="p-3 text-xs text-center text-text-muted">
                      No matching customers found. Click "+ Quick Add Customer" above.
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        data-testid={`select-customer-${c.id}`}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearch('');
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 flex items-center justify-between transition-colors min-h-[38px]"
                      >
                        <div>
                          <span className="font-semibold text-text-primary">{c.firstName} {c.lastName}</span>
                          <span className="text-text-muted ml-2 font-mono text-[11px]">{c.phone}</span>
                        </div>
                        <span className="text-[11px] text-accent font-semibold">Select →</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── STEP 2: FABRIC SELECTION (LIVE INVENTORY) ───────────────────── */}
          <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-brand" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  2. Fabric Selection
                </h3>
              </div>
              <span className="text-[11px] text-text-muted">From Live Stock</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-xl p-1 bg-surface-muted/30">
              {loadingFabrics ? (
                <div className="p-3 text-xs text-center text-text-muted">Loading fabric stock…</div>
              ) : fabrics.length === 0 ? (
                <div className="p-3 text-xs text-center text-text-muted">
                  No fabrics found in inventory. Add fabric under Fabric Inventory.
                </div>
              ) : (
                fabrics.map((f) => {
                  const isSelected = selectedFabricId === f.id;
                  const available = parseFloat(f.availableMeters || '0');
                  const isLow = available <= parseFloat(f.lowStockThreshold || '5');
                  const isOut = available <= 0;

                  return (
                    <div
                      key={f.id}
                      data-testid={`select-fabric-${f.id}`}
                      onClick={() => !isOut && setSelectedFabricId(f.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/10 ring-1 ring-accent'
                          : isOut
                          ? 'border-border/40 opacity-50 cursor-not-allowed bg-surface-muted'
                          : 'border-border hover:border-accent/40 bg-surface'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-text-primary truncate">
                            {f.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-muted text-text-secondary border border-border/60 shrink-0">
                            {f.color} • {f.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          ₹{Number(f.pricePerMeter).toFixed(2)}/meter
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-mono font-bold ${
                            isOut
                              ? 'text-error'
                              : isLow
                              ? 'text-warning'
                              : 'text-success'
                          }`}
                        >
                          {available.toFixed(2)}m available
                        </div>
                        <div className="text-[10px] text-text-muted">
                          ({parseFloat(f.reservedMeters || '0').toFixed(2)}m reserved)
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── STEP 3: GARMENT & MEASUREMENT PROFILE ───────────────────────── */}
          <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-brand" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  3. Garment & Measurements
                </h3>
              </div>
              {selectedCustomer && (
                <button
                  type="button"
                  data-testid="add-measurement-profile-btn"
                  onClick={() => setIsAddMeasurementOpen(true)}
                  className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 min-h-[32px] px-2"
                >
                  + New Measurement Profile
                </button>
              )}
            </div>

            {/* Garment Type Radio Buttons */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Garment Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GARMENT_TYPES.map(({ type, label }) => (
                  <button
                    key={type}
                    type="button"
                    data-testid={`select-garment-${type}`}
                    onClick={() => setGarmentType(type)}
                    className={`p-2 rounded-xl text-left border text-xs transition-all ${
                      garmentType === type
                        ? 'border-accent bg-accent text-white font-semibold shadow-sm'
                        : 'border-border bg-surface hover:bg-surface-muted text-text-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Measurement Profile Picker */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Measurement Profile for this Customer
              </label>
              {!selectedCustomerId ? (
                <div className="text-xs text-text-muted italic p-2 bg-surface-muted rounded-lg">
                  Please select a customer first to load measurement profiles.
                </div>
              ) : loadingProfiles ? (
                <div className="text-xs text-text-muted p-2 bg-surface-muted rounded-lg">
                  Loading customer profiles…
                </div>
              ) : customerProfiles.length === 0 ? (
                <div className="p-3 bg-surface-muted border border-border rounded-xl text-xs space-y-2">
                  <p className="text-text-muted">
                    No measurement profiles saved for {selectedCustomer?.firstName}.
                  </p>
                  <button
                    type="button"
                    data-testid="record-measurements-now-btn"
                    onClick={() => setIsAddMeasurementOpen(true)}
                    className="w-full py-2 px-3 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-hover min-h-[36px]"
                  >
                    + Record Measurements Now
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5" data-testid="measurement-profiles-list">
                  {customerProfiles.map((p) => {
                    const isSelected = selectedProfileId === p.id;
                    const matchesType = p.garmentType === garmentType;
                    return (
                      <div
                        key={p.id}
                        data-testid={`select-profile-${p.id}`}
                        onClick={() => {
                          setSelectedProfileId(p.id);
                          if (p.garmentType) setGarmentType(p.garmentType as GarmentType);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-accent bg-accent/10 ring-1 ring-accent'
                            : 'border-border hover:border-accent/40 bg-surface'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {matchesType && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-success-light text-success rounded font-semibold">
                                Matches {garmentType}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-text-muted mt-0.5">
                            Garment: {p.garmentType} {p.versions?.length ? `• v${p.versions.length}` : ''}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 4: METERS & DELIVERY DATE ─────────────────────────────── */}
          <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                4. Order Parameters & Timeline
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Meters Used */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Meters Required
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1000"
                    data-testid="meters-used-input"
                    value={metersUsed}
                    onChange={(e) => setMetersUsed(e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 text-sm bg-surface-muted border rounded-xl font-mono text-text-primary focus:outline-none focus:ring-2 min-h-[44px] ${
                      isInsufficientStock
                        ? 'border-error focus:ring-error'
                        : 'border-border focus:ring-accent'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-medium">
                    meters
                  </span>
                </div>
                {isInsufficientStock && (
                  <p className="text-[11px] text-error font-medium mt-1 flex items-center gap-1" data-testid="insufficient-stock-warning">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Exceeds available stock ({availableMetersNum.toFixed(2)}m)
                  </p>
                )}
              </div>

              {/* Delivery Date */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Estimated Delivery Date
                </label>
                <input
                  type="date"
                  data-testid="delivery-date-input"
                  value={estimatedDeliveryDate}
                  onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-surface-muted border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
                />
              </div>
            </div>

            {/* Craftsman Assignment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-brand" />
                  <span>Assign Workshop Craftsman (Optional)</span>
                </label>
                <span className="text-[11px] text-text-muted">Can assign or change later</span>
              </div>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                disabled={loadingStaff}
                data-testid="assign-craftsman-select"
                className="w-full px-3 py-2.5 text-xs bg-surface-muted border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
              >
                <option value="">Unassigned (Assign later in workshop)</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.role === 'STAFF' ? 'Craftsman' : s.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Design / Tailoring Notes (Optional)
              </label>
              <textarea
                value={notes}
                data-testid="order-notes-input"
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. French cuffs, spread collar, double slit at back…"
                className="w-full px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </form>
      </Drawer>

      {/* Inline Add Customer Drawer */}
      <AddCustomerDrawer
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        authToken={authToken}
        onCustomerCreated={(newCust) => {
          setCustomers((prev) => [newCust, ...prev]);
          setSelectedCustomerId(newCust.id);
          setIsAddCustomerOpen(false);
        }}
      />

      {/* Inline Add Measurement Drawer */}
      <AddMeasurementDrawer
        isOpen={isAddMeasurementOpen}
        onClose={() => setIsAddMeasurementOpen(false)}
        authToken={authToken}
        customers={customers}
        selectedCustomer={selectedCustomer ?? null}
        onProfileCreated={(newProf) => {
          setCustomerProfiles((prev) => [newProf, ...prev]);
          setSelectedProfileId(newProf.id);
          setIsAddMeasurementOpen(false);
        }}
      />
    </>
  );
};
