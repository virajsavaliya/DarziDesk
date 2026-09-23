import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { ThreeCanvas } from './ThreeCanvas';
import { ThreeDCard } from './ThreeDCard';

import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  Calculator,
} from 'lucide-react';

interface PublicPlan {
  id: string;
  name: string;
  priceMonthly: string | number;
  priceYearly: string | number;
  maxStaffAccounts: number;
  maxOrdersPerMonth: number;
  features: string[];
  isDefault: boolean;
}

const DEFAULT_PLANS: PublicPlan[] = [
  {
    id: 'plan-basic',
    name: 'Basic',
    priceMonthly: '1999',
    priceYearly: '19999',
    maxStaffAccounts: 2,
    maxOrdersPerMonth: 25,
    features: [
      'Up to 2 Staff Accounts',
      '25 Orders / month',
      'Digital Measurement Book',
      'Basic Fabric Inventory Ledger',
      'Standard PDF Invoices',
      'Customer SMS Notifications',
      'Community Email Support',
    ],
    isDefault: false,
  },
  {
    id: 'plan-pro',
    name: 'Pro',
    priceMonthly: '4999',
    priceYearly: '49999',
    maxStaffAccounts: 10,
    maxOrdersPerMonth: 250,
    features: [
      'Up to 10 Staff Accounts',
      '250 Orders / month',
      'Full Fabric Roll & Scrap Tracking',
      'Marketplace Discovery & Public Storefront',
      'Customer Portal with Self-Tracking',
      'Automated WhatsApp & SMS Alerts',
      'GST Compliant PDF Invoicing + UPI QR',
      'Karigar Piece-Rate Wage Tracker',
      'Priority Phone & WhatsApp Support',
    ],
    isDefault: true,
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise',
    priceMonthly: '12999',
    priceYearly: '129999',
    maxStaffAccounts: 50,
    maxOrdersPerMonth: 2000,
    features: [
      'Unlimited Tailoring Stations',
      '2,000+ Orders / month',
      'Multi-Branch Inventory & Order Sync',
      'Priority City Marketplace Placement',
      'Dedicated Account & Onboarding Manager',
      'Custom Domain & Brand White-Labeling',
      'Full API Access & Custom Integrations',
      '24/7 Dedicated Concierge Support',
    ],
    isDefault: false,
  },
];

interface ComparisonCategory {
  category: string;
  features: {
    name: string;
    basic: boolean | string;
    pro: boolean | string;
    enterprise: boolean | string;
  }[];
}

const DETAILED_COMPARISON: ComparisonCategory[] = [
  {
    category: 'Orders & Production Workflow',
    features: [
      { name: 'Monthly Order Capacity', basic: '25 Orders', pro: '250 Orders', enterprise: 'Unlimited (2,000+)' },
      { name: 'Visual Production Pipeline / Kanban', basic: true, pro: true, enterprise: true },
      { name: 'Urgent / Wedding Season Priority Tags', basic: false, pro: true, enterprise: true },
      { name: 'Multi-Garment Grouped Orders', basic: true, pro: true, enterprise: true },
      { name: 'Tailor Station Task Queue', basic: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Digital Measurement Book',
    features: [
      { name: 'Measurement Profiles per Customer', basic: 'Up to 50', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Measurement Version History', basic: false, pro: true, enterprise: true },
      { name: 'Customer Fitting Photo Attachments', basic: false, pro: true, enterprise: true },
      { name: 'Printable Master Cutter Slips', basic: true, pro: true, enterprise: true },
      { name: 'Customer Self-Access Portal', basic: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Fabric & Materials Inventory',
    features: [
      { name: 'Fabric Meterage Ledger', basic: 'Basic', pro: 'Advanced', enterprise: 'Multi-Branch Sync' },
      { name: 'Roll-by-Roll Barcode / Tagging', basic: false, pro: true, enterprise: true },
      { name: 'Scrap Fabric Remnant Logging', basic: false, pro: true, enterprise: true },
      { name: 'Row-Level Reservation Locks', basic: true, pro: true, enterprise: true },
      { name: 'Low Stock WhatsApp Warnings', basic: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Staff & Karigars',
    features: [
      { name: 'Staff Logins Included', basic: '2 Staff', pro: 'Up to 10', enterprise: '50+ Staff' },
      { name: 'Karigar Restricted Mobile View', basic: false, pro: true, enterprise: true },
      { name: 'Piece-Rate Wage Commission Ledger', basic: false, pro: true, enterprise: true },
      { name: 'Weekly Saturday Payroll Sheet', basic: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Invoicing, Billing & GST',
    features: [
      { name: 'Professional Tax Invoices', basic: true, pro: true, enterprise: true },
      { name: 'GST Compliant CGST / SGST Breakup', basic: false, pro: true, enterprise: true },
      { name: 'Dynamic UPI QR Code on Receipts', basic: false, pro: true, enterprise: true },
      { name: 'Advance Deposit & Balance Tracking', basic: true, pro: true, enterprise: true },
      { name: 'GSTR-1 Ready Excel Export', basic: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Marketplace & Customer Growth',
    features: [
      { name: 'Public City Marketplace Listing', basic: false, pro: true, enterprise: true },
      { name: 'Verified Atelier Badge', basic: false, pro: true, enterprise: true },
      { name: 'Photo Work Portfolio Gallery', basic: false, pro: true, enterprise: true },
      { name: 'Featured City Banner Placement', basic: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Security & Customer Support',
    features: [
      { name: 'PostgreSQL RLS Tenant Isolation', basic: true, pro: true, enterprise: true },
      { name: 'Encrypted Daily Cloud Backups', basic: true, pro: true, enterprise: true },
      { name: 'Support Channel', basic: 'Email (48 hr)', pro: 'WhatsApp & Phone (4 hr)', enterprise: '24/7 Dedicated Lead' },
      { name: 'Dedicated Onboarding Specialist', basic: false, pro: false, enterprise: true },
    ],
  },
];

export const PricingPage: React.FC = () => {
  const [plans, setPlans] = useState<PublicPlan[]>(DEFAULT_PLANS);
  const [isYearly, setIsYearly] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Plan finder slider
  const [estimatedMonthlyOrders, setEstimatedMonthlyOrders] = useState(75);

  useEffect(() => {
    fetch('/api/public/plans')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((resJson) => {
        const list = Array.isArray(resJson)
          ? resJson
          : Array.isArray(resJson?.data)
          ? resJson.data
          : [];
        if (list.length > 0) {
          setPlans(list);
        }
      })
      .catch((err) => {
        console.warn('Using default pricing plans', err);
      });
  }, []);

  const recommendedPlanName =
    estimatedMonthlyOrders <= 25 ? 'Basic' : estimatedMonthlyOrders <= 250 ? 'Pro' : 'Enterprise';

  const PRICING_FAQS = [
    {
      q: 'How does the 14-day free trial work?',
      a: 'You get full, unrestricted access to the Pro plan for 14 days without entering any credit card or UPI details. You can test digital measurements, add your fabric rolls, and print real invoices for your customers.',
    },
    {
      q: 'What happens if I exceed my monthly order limit?',
      a: 'We never stop your workshop operations mid-month. If you cross your plan limit, we gently notify you to upgrade to the next tier before your next billing cycle starts. Your existing orders and customer records remain completely safe and accessible.',
    },
    {
      q: 'Can I pay using UPI, Netbanking, or Debit Cards?',
      a: 'Yes! We support all Indian payment options including PhonePe, Google Pay, Paytm, BHIM UPI, Netbanking, Rupay, and Visa/Mastercard credit and debit cards with automated GST tax invoices issued immediately.',
    },
    {
      q: 'Do I need a GST number to subscribe to DarziDesk?',
      a: 'No, a GST number is not required. If your shop is registered, you can provide your GSTIN at checkout to claim full Input Tax Credit (ITC) on your subscription bill.',
    },
    {
      q: 'Can I cancel or switch my plan later?',
      a: 'Absolutely. You can upgrade, downgrade, or cancel your plan at any time with a single click in your Shop Settings. If you cancel, your data remains accessible in read-only format and you can export your records anytime.',
    },
    {
      q: 'Is our shop data and customer measurement book private?',
      a: '100% yes. DarziDesk uses enterprise-grade dual-layer PostgreSQL Row-Level Security (RLS). Your data is cryptographically isolated so no other shop, staff member, or competitor can ever view your records or client numbers.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      <PublicNavbar />

      {/* ── 1. HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-24 overflow-hidden bg-white">
        <ThreeCanvas className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-70" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-extrabold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Transparent Tailor Shop Pricing</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-slate-900 leading-[1.15]">
              Simple, Predictable Plans <br />
              <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                For Workshops of Every Scale
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              No hidden fees, no complicated setup charges. Start with our 14-day free trial and scale seamlessly as your
              garment order book expands.
            </p>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-sm font-bold ${!isYearly ? 'text-slate-900' : 'text-slate-400'}`}>
                Monthly Billing
              </span>

              <button
                onClick={() => setIsYearly(!isYearly)}
                className="w-14 h-7 bg-slate-200 rounded-full p-1 transition-colors relative focus:outline-none"
                aria-label="Toggle billing duration"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-orange-500 transition-transform shadow-md ${
                    isYearly ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>

              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isYearly ? 'text-slate-900' : 'text-slate-400'}`}>
                  Annual Billing
                </span>
                <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Save 20%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. PLAN CARDS GRID ─────────────────────────────────────────── */}
      <section className="py-16 bg-slate-50 relative z-10 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {plans.map((plan) => {
              const price = isYearly ? plan.priceYearly : plan.priceMonthly;
              const isPopular = plan.name.toLowerCase() === 'pro';
              const isEnterprise = plan.name.toLowerCase().includes('enterprise');

              return (
                <ThreeDCard
                  key={plan.id}
                  className={`bg-white rounded-3xl p-8 sm:p-9 border transition-all flex flex-col justify-between ${
                    isPopular
                      ? 'border-2 border-orange-500 shadow-2xl relative ring-4 ring-orange-500/10 scale-[1.03] md:-translate-y-2'
                      : 'border-slate-200 shadow-md hover:shadow-xl'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                      <span>★</span>
                      <span>Most Popular for Ateliers</span>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
                        {isEnterprise && (
                          <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            Bespoke
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1 mt-3">
                        <span className="text-4xl sm:text-5xl font-black text-slate-900">
                          ₹{Number(price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">/{isYearly ? 'year' : 'month'}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {isYearly ? 'Billed annually (includes 2 months free)' : 'Billed on a flexible monthly basis'}
                      </p>
                    </div>

                    {/* Quick Capacity Badges */}
                    <div className="py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs font-semibold text-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Staff Accounts:</span>
                        <span className="font-extrabold text-slate-900">Up to {plan.maxStaffAccounts}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Orders per Month:</span>
                        <span className="font-extrabold text-slate-900">Up to {plan.maxOrdersPerMonth}</span>
                      </div>
                    </div>

                    {/* Features Checklist */}
                    <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Included in this plan:
                      </span>
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <Link
                      to={`/login?mode=register&plan=${encodeURIComponent(plan.name)}`}
                      className={`w-full py-3.5 block text-center rounded-2xl font-black text-sm transition-all ${
                        isPopular
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/30'
                          : isEnterprise
                          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold'
                      }`}
                    >
                      {isPopular ? 'Start 14-Day Free Trial' : isEnterprise ? 'Contact Enterprise Sales' : 'Get Started Free'}
                    </Link>
                    <span className="block text-center text-[11px] text-slate-400 mt-2">
                      No credit card needed • Cancel anytime
                    </span>
                  </div>
                </ThreeDCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. INTERACTIVE PLAN FINDER SLIDER ──────────────────────────── */}
      <section className="py-20 bg-white border-y border-slate-200/80 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-50/40 rounded-3xl p-8 sm:p-10 border border-orange-200/80 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Not Sure Which Plan Fits Your Workshop?</h3>
                <p className="text-xs text-slate-600">Slide your estimated monthly volume to see our recommendation.</p>
              </div>
            </div>

            <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Estimated Monthly Garments:</span>
                <span className="text-orange-600 font-mono text-lg">{estimatedMonthlyOrders} orders / mo</span>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={5}
                value={estimatedMonthlyOrders}
                onChange={(e) => setEstimatedMonthlyOrders(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>10 orders (Small Boutique)</span>
                <span>250 orders (Busy Atelier)</span>
                <span>500+ orders (Multi-Branch)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-orange-800 font-bold uppercase tracking-wider block">
                  Recommended For You:
                </span>
                <span className="text-xl font-black text-slate-900">DarziDesk {recommendedPlanName} Plan</span>
                <p className="text-xs text-slate-600 mt-0.5">
                  {recommendedPlanName === 'Basic'
                    ? 'Perfect for independent single-master shops handling up to 25 monthly orders.'
                    : recommendedPlanName === 'Pro'
                    ? 'Best value for active tailor shops with multiple karigars and up to 250 monthly orders.'
                    : 'Designed for high-volume ateliers and multi-branch tailoring houses.'}
                </p>
              </div>

              <Link
                to={`/login?mode=register&plan=${recommendedPlanName}`}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>Select {recommendedPlanName}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. COMPLETE FEATURE COMPARISON MATRIX ──────────────────────── */}
      <section className="py-24 bg-slate-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Detailed Breakdown
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Compare All Plan Features Side by Side
            </h2>
            <p className="text-slate-600 text-base">
              A transparent look at every feature included in Basic, Pro, and Enterprise tiers.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-5xl mx-auto">
            {/* Header */}
            <div className="grid grid-cols-12 bg-slate-900 text-white font-extrabold text-xs sm:text-sm p-5 uppercase tracking-wider sticky top-0 z-20">
              <div className="col-span-6 sm:col-span-5">Feature Capability</div>
              <div className="col-span-2 sm:col-span-2 text-center text-slate-300">Basic</div>
              <div className="col-span-2 sm:col-span-2 text-center text-orange-400 font-black">Pro</div>
              <div className="col-span-2 sm:col-span-3 text-center text-slate-300">Enterprise</div>
            </div>

            {/* Comparison Categories */}
            <div className="divide-y divide-slate-100">
              {DETAILED_COMPARISON.map((cat, catIdx) => (
                <div key={catIdx}>
                  <div className="bg-slate-100/80 px-5 sm:px-6 py-3 text-xs font-black text-slate-800 uppercase tracking-wider">
                    {cat.category}
                  </div>
                  <div className="divide-y divide-slate-50">
                    {cat.features.map((feat, fIdx) => (
                      <div
                        key={fIdx}
                        className="grid grid-cols-12 p-4 sm:p-5 text-xs sm:text-sm items-center hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="col-span-6 sm:col-span-5 font-bold text-slate-900">{feat.name}</div>

                        {/* Basic column */}
                        <div className="col-span-2 sm:col-span-2 text-center">
                          {typeof feat.basic === 'boolean' ? (
                            feat.basic ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            <span className="font-semibold text-slate-700 text-xs">{feat.basic}</span>
                          )}
                        </div>

                        {/* Pro column */}
                        <div className="col-span-2 sm:col-span-2 text-center bg-orange-50/40 py-1 rounded-lg">
                          {typeof feat.pro === 'boolean' ? (
                            feat.pro ? (
                              <Check className="w-4 h-4 text-orange-600 font-bold mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            <span className="font-bold text-orange-900 text-xs">{feat.pro}</span>
                          )}
                        </div>

                        {/* Enterprise column */}
                        <div className="col-span-2 sm:col-span-3 text-center">
                          {typeof feat.enterprise === 'boolean' ? (
                            feat.enterprise ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            <span className="font-semibold text-slate-700 text-xs">{feat.enterprise}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PRICING FAQ ACCORDION ──────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-200/80 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Billing Answers
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Frequently Asked Pricing Questions</h2>
          </div>

          <div className="space-y-3">
            {PRICING_FAQS.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-orange-600 transition-colors"
                  >
                    <span className="text-sm sm:text-base">{faq.q}</span>
                    <span className="w-7 h-7 rounded-full bg-white text-slate-600 flex items-center justify-center shrink-0 text-sm font-bold shadow-sm">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. BOTTOM CTA ─────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Start Your 14-Day Free Workshop Trial
          </h2>
          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
            Experience the peace of mind of digital measurements, real-time fabric inventory, and automated WhatsApp alerts.
          </p>

          <div className="pt-2 flex justify-center">
            <Link
              to="/login?mode=register&plan=Pro"
              className="px-8 py-4 text-base font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-full shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>Get Started Free on Pro</span>
              <ArrowRight className="w-5 h-5 text-orange-600" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};
