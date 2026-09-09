import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle2,
  Users,
  ShoppingBag,
  MessageSquare,
  AlertCircle,
  X,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { SubscriptionPlanItem } from '../../types/dashboard';

interface SuperAdminPlansViewProps {
  authToken: string;
}

export const SuperAdminPlansView: React.FC<SuperAdminPlansViewProps> = ({ authToken }) => {
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [priceMonthly, setPriceMonthly] = useState('999');
  const [priceYearly, setPriceYearly] = useState('9999');
  const [maxStaffAccounts, setMaxStaffAccounts] = useState(3);
  const [maxOrdersPerMonth, setMaxOrdersPerMonth] = useState(50);
  const [maxSmsCredits, setMaxSmsCredits] = useState(100);
  const [featuresText, setFeaturesText] = useState('Order Management, Basic Invoicing, Customer Profiles');
  const [isActive, setIsActive] = useState(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/plans', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load plans (${res.status})`);
      const json = await res.json();
      setPlans(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching subscription tiers');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setPriceMonthly('999');
    setPriceYearly('9999');
    setMaxStaffAccounts(3);
    setMaxOrdersPerMonth(50);
    setMaxSmsCredits(100);
    setFeaturesText('Order Management, Basic Invoicing, Customer Directory');
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: SubscriptionPlanItem) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPriceMonthly(String(plan.priceMonthly));
    setPriceYearly(String(plan.priceYearly));
    setMaxStaffAccounts(plan.maxStaffAccounts);
    setMaxOrdersPerMonth(plan.maxOrdersPerMonth);
    setMaxSmsCredits(plan.maxSmsCredits);
    setFeaturesText(Array.isArray(plan.features) ? plan.features.join(', ') : '');
    setIsActive(plan.isActive);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      const featuresArray = featuresText
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        name,
        priceMonthly: parseFloat(priceMonthly),
        priceYearly: parseFloat(priceYearly),
        maxStaffAccounts: Number(maxStaffAccounts),
        maxOrdersPerMonth: Number(maxOrdersPerMonth),
        maxSmsCredits: Number(maxSmsCredits),
        features: featuresArray,
        isActive,
      };

      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || `Operation failed (${res.status})`);
      }

      setIsModalOpen(false);
      await fetchPlans();
    } catch (err: any) {
      setModalError(err.message || 'Error saving subscription plan');
    } finally {
      setModalLoading(false);
    }
  };

  const formatINR = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Tier Configuration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Subscription Plans & Quotas
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Define pricing packages, staff quotas, monthly order ceilings, and feature entitlements.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-brand-primary text-white rounded-xl hover:bg-brand-primary-dark transition-all shadow-sm hover:shadow self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Tier</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error-light border border-error/20 rounded-xl text-error text-sm font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div className="p-12 text-center text-text-muted bg-surface rounded-2xl border border-border animate-pulse flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-primary" />
          <span>Loading subscription tiers...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isEnterprise = plan.name.toLowerCase().includes('enterprise');
            const isPro = plan.name.toLowerCase().includes('pro');

            return (
              <div
                key={plan.id}
                className={`p-6 bg-surface rounded-2xl border transition-all flex flex-col justify-between relative shadow-sm hover:shadow-md ${
                  isEnterprise
                    ? 'border-purple-500/50 ring-1 ring-purple-500/20'
                    : isPro
                    ? 'border-brand-primary ring-2 ring-brand-primary/10'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                {isPro && (
                  <span className="absolute -top-3 right-6 bg-brand-accent text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                    Popular Choice
                  </span>
                )}
                {isEnterprise && (
                  <span className="absolute -top-3 right-6 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                    High Volume
                  </span>
                )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    {plan.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      plan.isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {plan.isActive ? 'Active Tier' : 'Archived'}
                  </span>
                </div>

                <p className="text-xs text-text-muted mt-1">
                  {plan._count?.subscriptions || 0} active atelier subscriptions
                </p>

                {/* Price Display */}
                <div className="mt-6 pb-6 border-b border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-text-primary tracking-tight">
                      {formatINR(plan.priceMonthly)}
                    </span>
                    <span className="text-xs text-text-muted font-medium">/ month</span>
                  </div>
                  <div className="text-xs text-text-muted mt-1 font-medium">
                    Or {formatINR(plan.priceYearly)} / year (billed annually)
                  </div>
                </div>

                {/* Entitlement Quotas */}
                <div className="py-5 space-y-3 border-b border-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-primary" /> Max Staff Accounts
                    </span>
                    <span className="font-bold text-text-primary">{plan.maxStaffAccounts} Staff</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-brand-primary" /> Monthly Order Ceiling
                    </span>
                    <span className="font-bold text-text-primary">
                      {plan.maxOrdersPerMonth} Orders / mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-brand-primary" /> SMS Alerts Credit
                    </span>
                    <span className="font-bold text-text-primary">{plan.maxSmsCredits} SMS</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="pt-5 space-y-2.5">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">
                    Included Capabilities
                  </span>
                  {(Array.isArray(plan.features) ? plan.features : []).map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-text-secondary">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="pt-6 mt-6 border-t border-border">
                <button
                  onClick={() => openEditModal(plan)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-surface-muted hover:bg-surface-muted/80 text-text-primary rounded-xl border border-border transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-text-secondary" />
                  <span>Configure Tier & Limits</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-base">
                    {editingPlan ? `Edit Tier: ${editingPlan.name}` : 'Create Subscription Tier'}
                  </h3>
                  <p className="text-xs text-text-muted">
                    Set platform pricing and hard entitlement limits
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPlan} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {modalError && (
                <div className="p-3 bg-error-light border border-error/20 rounded-xl text-error font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Plan Tier Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Master Atelier Pro"
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Monthly Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">
                    Yearly Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Max Staff *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={maxStaffAccounts}
                    onChange={(e) => setMaxStaffAccounts(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Max Orders/Mo *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={maxOrdersPerMonth}
                    onChange={(e) => setMaxOrdersPerMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">SMS Credits *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={maxSmsCredits}
                    onChange={(e) => setMaxSmsCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">
                  Features List (comma separated)
                </label>
                <textarea
                  rows={3}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="Order Management, SMS Notifications, Fabric Inventory, Customer Portal"
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none font-sans"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-text-primary select-none cursor-pointer">
                  Active Tier available for tenant subscriptions
                </label>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 font-semibold bg-brand-primary text-white rounded-xl hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : editingPlan ? 'Update Tier' : 'Create Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
