import React, { useState } from 'react';
import {
  X,
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CreditCard,
  Smartphone,
  Building,
  CheckCircle2,
} from 'lucide-react';
import type { SubscriptionBillingCycle } from '../../hooks/useSubscription';

interface PlanOption {
  name: string;
  badge?: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  features: string[];
  unlockedKeys: string[];
}

const PLANS: PlanOption[] = [
  {
    name: 'Basic',
    description: 'Perfect for single tailors and boutique testing.',
    monthlyPrice: 1999,
    yearlyPrice: 19999,
    features: [
      'Up to 2 staff accounts',
      '20 orders / month',
      'Standard customer & measurement vault',
      'Basic invoices & receipts',
    ],
    unlockedKeys: ['orders', 'customers', 'measurements', 'billing', 'staff'],
  },
  {
    name: 'Pro',
    popular: true,
    badge: 'MOST POPULAR',
    description: 'For growing tailoring businesses & bespoke designer studios.',
    monthlyPrice: 4999,
    yearlyPrice: 49999,
    features: [
      'Fabric Inventory & roll tracking',
      'In-depth Revenue & Order Reports',
      'Custom Product & Services catalog pricing',
      'Marketplace public studio listing',
      'Up to 10 staff accounts',
      '250 orders / month',
      'WhatsApp order status updates',
    ],
    unlockedKeys: [
      'orders',
      'customers',
      'measurements',
      'fabric',
      'reports',
      'products',
      'marketplace-settings',
      'billing',
      'staff',
    ],
  },
  {
    name: 'Enterprise',
    badge: 'HIGH VOLUME',
    description: 'For multi-branch ateliers, uniform manufacturers & luxury houses.',
    monthlyPrice: 12999,
    yearlyPrice: 129999,
    features: [
      'Everything in Pro unlocked',
      'Up to 50 staff accounts',
      '2,000 orders / month',
      'Priority SuperAdmin support',
      'Custom invoice branding & barcodes',
      'Dedicated account onboarding',
    ],
    unlockedKeys: [
      'orders',
      'customers',
      'measurements',
      'fabric',
      'reports',
      'products',
      'marketplace-settings',
      'billing',
      'staff',
    ],
  },
];

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanName?: string;
  initialSelectedPlan?: string;
  onUpgrade: (
    planName: string,
    billingCycle: SubscriptionBillingCycle,
    paymentMethod: string
  ) => Promise<boolean>;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  currentPlanName = 'Basic',
  initialSelectedPlan = 'Pro',
  onUpgrade,
}) => {
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>('MONTHLY');
  const [selectedPlan, setSelectedPlan] = useState<string>(
    initialSelectedPlan || (currentPlanName === 'Basic' ? 'Pro' : 'Enterprise')
  );
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetPlan = PLANS.find((p) => p.name === selectedPlan) || PLANS[1];
  const priceToPay =
    billingCycle === 'MONTHLY' ? targetPlan.monthlyPrice : targetPlan.yearlyPrice;

  const handleConfirmUpgrade = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const ok = await onUpgrade(selectedPlan, billingCycle, paymentMethod);
      if (ok) {
        setUpgradeSuccess(true);
        setTimeout(() => {
          setUpgradeSuccess(false);
          onClose();
        }, 1800);
      } else {
        setErrorMessage('Failed to upgrade subscription. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error processing upgrade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden my-auto text-text-primary">
        {/* Modal Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-brand via-brand-dark to-slate-900 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              DarziDesk Subscription Plans
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Unlock Advanced Tailoring & Growth Tools
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Choose the right tier for your workshop. Instantly unlock Fabric Inventory,
              Reports, and Marketplace Storefront with real-time provisioning.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {upgradeSuccess ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-text-primary">
              Subscription Successfully Upgraded!
            </h3>
            <p className="text-sm text-text-muted max-w-md mx-auto">
              Your workshop is now on the <strong className="text-accent">{selectedPlan}</strong> plan.
              All locked features have been provisioned and unlocked immediately.
            </p>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Billing Toggle */}
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center p-1 bg-surface-muted border border-border rounded-xl">
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    billingCycle === 'YEARLY'
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Yearly Billing
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">
                    SAVE ~20%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isCurrent = currentPlanName?.toLowerCase() === plan.name.toLowerCase();
                const isSelected = selectedPlan.toLowerCase() === plan.name.toLowerCase();
                const price =
                  billingCycle === 'MONTHLY' ? plan.monthlyPrice : plan.yearlyPrice;
                const formattedPrice = new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(price);

                return (
                  <div
                    key={plan.name}
                    onClick={() => setSelectedPlan(plan.name)}
                    className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-accent ring-2 ring-accent/30 bg-accent/[0.03]'
                        : 'border-border bg-surface hover:border-text-muted/40'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-accent text-white text-[10px] font-extrabold tracking-wider uppercase shadow-sm">
                        {plan.badge}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-text-primary">
                          {plan.name}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-muted text-text-muted text-[10px] font-bold border border-border">
                            Current
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-muted min-h-[32px]">
                        {plan.description}
                      </p>

                      <div className="pt-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-text-primary">
                            {formattedPrice}
                          </span>
                          <span className="text-xs text-text-muted">
                            /{billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/60 space-y-2">
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-text-secondary">
                            <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-4">
                      <div
                        className={`w-full py-2 rounded-xl text-xs font-bold text-center transition-all ${
                          isSelected
                            ? 'bg-accent text-white shadow-sm'
                            : 'bg-surface-muted text-text-secondary hover:bg-surface-muted/80'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Choose ' + plan.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment & Checkout Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-muted/60 border border-border space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Select Payment Method
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    Secure sandbox test payment or instant mock settlement
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      paymentMethod === 'UPI'
                        ? 'border-accent bg-accent/10 text-accent font-bold'
                        : 'border-border bg-surface text-text-secondary hover:bg-surface-muted'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      paymentMethod === 'CARD'
                        ? 'border-accent bg-accent/10 text-accent font-bold'
                        : 'border-border bg-surface text-text-secondary hover:bg-surface-muted'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('NETBANKING')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      paymentMethod === 'NETBANKING'
                        ? 'border-accent bg-accent/10 text-accent font-bold'
                        : 'border-border bg-surface text-text-secondary hover:bg-surface-muted'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    Net Banking
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs">
                  {errorMessage}
                </div>
              )}

              <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Instant activation • 30-day money-back guarantee • Cancel anytime</span>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmUpgrade}
                  disabled={isSubmitting || selectedPlan.toLowerCase() === currentPlanName.toLowerCase()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-accent hover:bg-accent/90 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Processing Upgrade...
                    </>
                  ) : selectedPlan.toLowerCase() === currentPlanName.toLowerCase() ? (
                    'Already on ' + selectedPlan
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Activate {selectedPlan} & Unlock Features (
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0,
                      }).format(priceToPay)}
                      )
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
