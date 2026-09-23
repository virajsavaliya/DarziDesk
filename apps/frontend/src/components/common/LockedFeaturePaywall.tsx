import React from 'react';
import {
  Lock,
  Sparkles,
  CheckCircle2,
  BarChart2,
  Package,
  Tag,
  Store,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface LockedFeaturePaywallProps {
  featureId: 'reports' | 'fabric' | 'products' | 'marketplace-settings' | string;
  onUpgrade: () => void;
}

interface FeatureMeta {
  title: string;
  badge: string;
  subtitle: string;
  icon: React.ReactNode;
  highlights: string[];
  requiredPlan: string;
}

const FEATURE_METAS: Record<string, FeatureMeta> = {
  reports: {
    title: 'Business Analytics & Revenue Reports',
    badge: 'Confidential Business Intelligence',
    subtitle:
      'Gain complete financial transparency with automated revenue forecasting, outstanding balance registers, and tailor turnaround tracking.',
    icon: <BarChart2 className="w-8 h-8 text-orange-500" />,
    highlights: [
      'Daily, weekly & monthly revenue trend charts',
      'Fabric cost vs labor margin vs GST breakdown',
      'Uncollected customer balance tracking register',
      'Staff productivity & SLA turnaround benchmarks',
    ],
    requiredPlan: 'Pro Plan',
  },
  fabric: {
    title: 'Fabric Roll Ledger & Inventory Tracking',
    badge: 'Material Stock Control',
    subtitle:
      'Track every meter of cotton, silk, and suiting fabric. Receive automated low-stock reorder alerts and monitor scrap utilization.',
    icon: <Package className="w-8 h-8 text-orange-500" />,
    highlights: [
      'Real-time available vs reserved meters calculation',
      'Automated low-stock threshold warning banners',
      'Full stock transaction audit history',
      'Scrap cloth management for pocket squares & trims',
    ],
    requiredPlan: 'Pro Plan',
  },
  products: {
    title: 'Products, Services & Tailoring Catalog',
    badge: 'Service & Pricing Catalog',
    subtitle:
      'Standardize your atelier’s garment pricing, styling add-ons, and alteration fee structure for one-click order creation.',
    icon: <Tag className="w-8 h-8 text-orange-500" />,
    highlights: [
      'Standard garment templates (Suits, Sherwanis, Kurtas, Shirts)',
      'Custom addon charges (Embroidery, Piping, Premium buttons)',
      'Fast invoice line-item integration',
      'Direct synchronization with customer catalog',
    ],
    requiredPlan: 'Pro Plan',
  },
  'marketplace-settings': {
    title: 'Public Marketplace Storefront & Discovery',
    badge: 'Customer Acquisition Engine',
    subtitle:
      'List your bespoke tailoring studio on DarziDesk Marketplace to receive direct client inquiries and show off your portfolio.',
    icon: <Store className="w-8 h-8 text-orange-500" />,
    highlights: [
      'Verified storefront listing in our public tailor directory',
      'High-resolution portfolio gallery & studio photos',
      'Specialty tags (Bespoke Suits, Wedding Sherwanis, Kurtas)',
      'Direct order requests from nearby clients in your city',
    ],
    requiredPlan: 'Pro Plan',
  },
};

export const LockedFeaturePaywall: React.FC<LockedFeaturePaywallProps> = ({
  featureId,
  onUpgrade,
}) => {
  const meta = FEATURE_METAS[featureId] ?? {
    title: 'Advanced Feature',
    badge: 'Premium Capability',
    subtitle: 'This feature requires an active Pro or Enterprise subscription plan.',
    icon: <Sparkles className="w-8 h-8 text-orange-500" />,
    highlights: [
      'Full automated workflows and integrations',
      'Extended storage and operational limits',
      'Priority platform performance and features',
    ],
    requiredPlan: 'Pro Plan',
  };

  return (
    <div className="relative min-h-[560px] flex items-center justify-center p-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface via-surface-muted/30 to-surface">
      {/* Decorative background grid and ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Main Paywall Card */}
      <div className="relative z-10 max-w-2xl w-full text-center space-y-6 py-8 px-6 sm:px-10">
        {/* Floating Lock + Feature Icon Header */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-surface border-2 border-border shadow-xl flex items-center justify-center">
              {meta.icon}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-lg ring-4 ring-surface">
              <Lock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Feature Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{meta.badge} • Requires {meta.requiredPlan}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
            {meta.title}
          </h2>

          <p className="text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            {meta.subtitle}
          </p>
        </div>

        {/* What you'll unlock checklist */}
        <div className="p-5 bg-surface/80 backdrop-blur border border-border/80 rounded-2xl text-left shadow-sm space-y-3 max-w-lg mx-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Included when you unlock {meta.requiredPlan}:
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {meta.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-text-primary font-medium leading-snug">{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            id={`btn-unlock-${featureId}`}
            onClick={onUpgrade}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span>Unlock with {meta.requiredPlan}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onUpgrade}
            className="w-full sm:w-auto px-5 py-3 bg-surface hover:bg-surface-muted border border-border text-text-secondary hover:text-text-primary font-semibold text-sm rounded-xl transition-all min-h-[44px]"
          >
            View All Plans & Pricing
          </button>
        </div>

        <p className="text-[11px] text-text-muted">
          Cancel or change plans anytime. All existing orders and customer profiles are always preserved.
        </p>
      </div>
    </div>
  );
};
