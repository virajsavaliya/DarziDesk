import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { ThreeCanvas } from './ThreeCanvas';
import { ThreeDCard } from './ThreeDCard';

import {
  ClipboardList,
  Ruler,
  Package,
  Users,
  MessageSquare,
  Receipt,
  Store,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react';

interface FeatureItem {
  id: string;
  category: 'orders' | 'measurements' | 'inventory' | 'karigars' | 'billing' | 'marketplace';
  title: string;
  badge: string;
  color: string;
  icon: React.ElementType;
  headline: string;
  description: string;
  capabilities: string[];
}

const ALL_FEATURES: FeatureItem[] = [
  {
    id: 'orders-pipeline',
    category: 'orders',
    title: 'Smart Order Pipeline & Kanban',
    badge: 'Core Engine',
    color: 'orange',
    icon: ClipboardList,
    headline: 'Track every garment from initial chalk marks to final steam press',
    description:
      'A visual, drag-and-drop workflow built around tailoring milestones: Placed → Measurement Confirmed → Cloth Cutting → Master Stitching → Quality Check → Trial Ready → Delivered.',
    capabilities: [
      'Urgent / Wedding Season delivery prioritization tags',
      'Automated trial fitting date scheduling with customer reminders',
      'Multi-garment orders (e.g. 3 suits + 2 shirts) tracked individually',
      'Complete audit trail of which karigar worked on which garment',
    ],
  },
  {
    id: 'digital-measurements',
    category: 'measurements',
    title: '360° Digital Measurement Book',
    badge: 'Never Lose A Fit',
    color: 'blue',
    icon: Ruler,
    headline: 'Eliminate forgotten paper slips and incorrect alterations forever',
    description:
      'Store 25+ precise dimensions per customer across 15 garment categories. Every fitting change creates a timestamped version history so you can track weight fluctuations over the years.',
    capabilities: [
      'Pre-configured templates for Suits, Sherwanis, Kurtis, Lehengas & Pants',
      'Attach customer fitting photos & special tailoring notes (e.g. sloped right shoulder)',
      '1-click export to printable cutter slips for cutting table masters',
      'Customer self-viewing via secure portal link',
    ],
  },
  {
    id: 'fabric-inventory',
    category: 'inventory',
    title: 'Fabric Roll & Scrap Ledger',
    badge: 'Stop Meter Leakage',
    color: 'emerald',
    icon: Package,
    headline: 'Real-time fabric meterage tracking with row-level reservation locks',
    description:
      'Keep meticulous counts of imported wool rolls, pure silks, canvas, and linings. When an order is booked, fabric is reserved in database transactions to prevent selling the same roll twice.',
    capabilities: [
      'Roll-by-roll barcode tagging, supplier cost, and GSM recording',
      'Automatic shrinkage and seam allowance calculations',
      'Scrap fabric remnant logging for pockets, contrast cuffs & collars',
      'Low-stock threshold alerts sent directly to owner WhatsApp',
    ],
  },
  {
    id: 'karigar-management',
    category: 'karigars',
    title: 'Karigar Piece-Rate & Task Station',
    badge: 'Staff Productivity',
    color: 'purple',
    icon: Users,
    headline: 'Manage cutter, stitcher, and hand-embroidery staff effortlessly',
    description:
      'Tailor staff receive their own restricted mobile view showing only assigned garment tasks and measurement specs — without access to sensitive shop revenue or customer phone numbers.',
    capabilities: [
      'Custom piece-rate wages per garment type (e.g. ₹650 / Coat stitching)',
      'Automated weekly Saturday payroll calculations with advance deductions',
      'Worker turnaround velocity & rework percentage analytics',
      'Multi-branch staff assignments for expanding ateliers',
    ],
  },
  {
    id: 'whatsapp-sms-alerts',
    category: 'orders',
    title: 'Automated WhatsApp & SMS Notifications',
    badge: 'Customer Delight',
    color: 'amber',
    icon: MessageSquare,
    headline: 'Keep customers informed automatically at every step of crafting',
    description:
      'Customers love transparency. Automatically dispatch WhatsApp alerts when an order is booked, cloth is cut, trial is ready, or when the final suit is pressed and packed.',
    capabilities: [
      'Pre-approved WhatsApp business message templates',
      '1-tap trial rescheduling links for busy customers',
      'Attach digital PDF receipts directly to WhatsApp confirmations',
      'Cuts incoming phone calls by over 75%',
    ],
  },
  {
    id: 'gst-invoicing',
    category: 'billing',
    title: 'GST Invoicing & Dynamic UPI QR Receipts',
    badge: 'Tax & Khata Ready',
    color: 'emerald',
    icon: Receipt,
    headline: 'Professional bills, advance deposits, and instant counter payments',
    description:
      'Generate compliant GST tax invoices or clean non-GST retail bills. Track advance deposits, pending balances, and print on standard thermal paper or A4 sheets in seconds.',
    capabilities: [
      'Dynamic UPI QR codes printed directly on bills for instant scan & pay',
      'Automatic CGST / SGST breakdown based on customer state',
      'Advance deposit receipts with remaining balance reminders',
      'Monthly GSTR-1 ready sales register exports in CSV / Excel',
    ],
  },
  {
    id: 'marketplace-storefront',
    category: 'marketplace',
    title: 'Marketplace Storefront & Local Discovery',
    badge: 'New Customers',
    color: 'rose',
    icon: Store,
    headline: 'Put your tailor shop on the map for thousands of local customers',
    description:
      'Claim your verified public atelier storefront on DarziDesk. Showcase photos of past bridal and formal creations, display genuine verified reviews, and receive online bespoke inquiries.',
    capabilities: [
      'Public SEO-optimized profile URL for your tailor shop',
      'Customer rating badge & verified artisan certification',
      'Direct WhatsApp inquiry button for new wedding party bookings',
      'Portfolio gallery categorized by garment specialty',
    ],
  },
  {
    id: 'security-rls',
    category: 'billing',
    title: 'Dual-Layer RLS Data Security',
    badge: 'Enterprise Privacy',
    color: 'blue',
    icon: ShieldCheck,
    headline: 'Your customer lists and pricing are 100% isolated and confidential',
    description:
      'DarziDesk enforces strict PostgreSQL Row-Level Security (RLS). No competing shop can ever access your customer measurements, suppliers, or revenue figures.',
    capabilities: [
      'Encrypted cloud backups hosted in secure Indian data centers',
      'Multi-branch security: keep branch inventory isolated or synced',
      'Role-based staff permissions (Owner, Manager, Tailor, Front Desk)',
      'One-click full data export anytime you want',
    ],
  },
  {
    id: 'analytics-reports',
    category: 'orders',
    title: 'Daily Khata & Revenue Analytics',
    badge: 'Business Intelligence',
    color: 'orange',
    icon: TrendingUp,
    headline: 'Real-time visibility into shop revenue, pending orders, and profit',
    description:
      'Know your daily cash collections, weekly karigar payouts, top-selling fabrics, and busiest delivery weeks with clean, intuitive visual reports.',
    capabilities: [
      'Daily morning briefing with orders due for trial or delivery today',
      'Fabric margin analytics: see which roll weaves yield highest profit',
      'Customer lifetime spending and repeat order frequency metrics',
      'Year-over-year wedding season growth comparison',
    ],
  },
];

const COMPARISON_ROWS = [
  {
    criterion: 'Measurement Storage',
    traditional: 'Thick paper notebooks; slips get torn, lost, or misplaced over time.',
    darzidesk: 'Cloud Digital Passport with unlimited versions, photos, and instant search.',
  },
  {
    criterion: 'Fabric Stock Accuracy',
    traditional: 'Manual eyeballing; cloth rolls get double-promised or run short mid-cutting.',
    darzidesk: 'Row-level reservation locks, scrap logging, and low-meterage alerts.',
  },
  {
    criterion: 'Customer Communication',
    traditional: 'Customers repeatedly call shop to ask if their garment is ready for trial.',
    darzidesk: 'Automated WhatsApp & SMS alerts sent at each milestone stage.',
  },
  {
    criterion: 'Karigar Piece-Rate Pay',
    traditional: 'Manual notebook tallies on Saturday evening; constant wage disputes.',
    darzidesk: 'Automated commission ledger per garment; 1-click weekly payroll sheet.',
  },
  {
    criterion: 'Tax & Invoicing',
    traditional: 'Carbon-copy receipt books; manual GST calculations prone to errors.',
    darzidesk: '1-click GST & UPI QR bills; export ready for your accountant.',
  },
  {
    criterion: 'Customer Acquisition',
    traditional: 'Relies solely on word-of-mouth and foot traffic on your street.',
    darzidesk: 'Public marketplace listing with portfolio photos, ratings & city discovery.',
  },
];

export const FeaturesPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Interactive Kanban preview state
  const [kanbanItems, setKanbanItems] = useState([
    { id: 1, title: 'Bespoke Tuxedo #DD-412', stage: 'Cutting', tag: 'Wedding' },
    { id: 2, title: 'Banarasi Kurti #DD-413', stage: 'Stitching', tag: 'Urgent' },
    { id: 3, title: '2-Piece Suit #DD-414', stage: 'Trial Ready', tag: 'Regular' },
  ]);

  const moveKanbanItem = (id: number) => {
    setKanbanItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const stages = ['Cutting', 'Stitching', 'Trial Ready', 'Delivered'];
          const nextIndex = (stages.indexOf(item.stage) + 1) % stages.length;
          return { ...item, stage: stages[nextIndex] };
        }
        return item;
      })
    );
  };

  const filteredFeatures = ALL_FEATURES.filter((feat) => {
    const matchesCategory = activeCategory === 'all' || feat.category === activeCategory;
    const matchesSearch =
      feat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feat.headline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      <PublicNavbar />

      {/* ── 1. HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-white">
        <ThreeCanvas className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-70" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-extrabold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Full Platform Capabilities</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-slate-900 leading-[1.15]">
              Everything You Need to Run & Scale <br />
              <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                Your Modern Tailoring Atelier
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Explore the comprehensive suite of purpose-built tools that replace manual khata books with digital
              precision, automated customer messaging, and streamlined workshop production.
            </p>

            {/* Quick Search & Category Filter */}
            <div className="pt-4 max-w-xl mx-auto">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search features (e.g. measurements, fabric, WhatsApp, GST)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white shadow-sm transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. CATEGORY TABS & FEATURE GRID ────────────────────────────── */}
      <section className="py-16 bg-slate-50 relative z-10 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'orders', label: 'Order Workflows' },
              { id: 'measurements', label: 'Measurements' },
              { id: 'inventory', label: 'Fabric Inventory' },
              { id: 'karigars', label: 'Staff & Karigars' },
              { id: 'billing', label: 'Invoicing & GST' },
              { id: 'marketplace', label: 'Marketplace' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <ThreeDCard
                  key={feat.id}
                  maxTilt={5}
                  className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        {feat.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-extrabold text-slate-900">{feat.title}</h3>
                    <p className="text-xs font-bold text-orange-700">{feat.headline}</p>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{feat.description}</p>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Core Capabilities
                      </span>
                      {feat.capabilities.map((cap, cIdx) => (
                        <div key={cIdx} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6">
                    <Link
                      to="/login?mode=register"
                      className="w-full py-2.5 block text-center rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-800 hover:text-orange-600 text-xs font-bold transition-all border border-slate-200 hover:border-orange-300"
                    >
                      Try this module free →
                    </Link>
                  </div>
                </ThreeDCard>
              );
            })}
          </div>

          {filteredFeatures.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
              <p className="text-slate-500 font-semibold text-sm">No features found matching "{searchQuery}".</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-3 text-xs font-bold text-orange-600 hover:underline"
              >
                Reset Search Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. INTERACTIVE LIVE KANBAN BOARD PREVIEW ──────────────────── */}
      <section className="py-24 bg-white border-y border-slate-200/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Live Production Queue
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Interactive Order Pipeline Simulation
            </h2>
            <p className="text-slate-600 text-base">
              Click the cards below to simulate advancing a garment through your workshop stations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {['Cutting', 'Stitching', 'Trial Ready', 'Delivered'].map((stage) => {
              const itemsInStage = kanbanItems.filter((item) => item.stage === stage);
              return (
                <div key={stage} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700">{stage}</span>
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                      {itemsInStage.length}
                    </span>
                  </div>

                  <div className="space-y-3 min-h-[160px]">
                    {itemsInStage.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => moveKanbanItem(item.id)}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all transform hover:-translate-y-1 space-y-2"
                        title="Click to advance stage"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold">
                            {item.tag}
                          </span>
                          <span className="text-slate-400 font-bold">Click to advance →</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                        <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Status: {item.stage}</span>
                        </div>
                      </div>
                    ))}

                    {itemsInStage.length === 0 && (
                      <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-8">
                        No orders in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. TRADITIONAL KHATA VS DARZIDESK COMPARISON TABLE ─────────── */}
      <section className="py-24 bg-slate-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              The Clear Difference
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Traditional Khata Register vs. DarziDesk
            </h2>
            <p className="text-slate-600 text-base">
              See how modernizing your workshop eliminates daily headaches and pays for itself within the first 7 days.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-5xl mx-auto">
            <div className="grid grid-cols-12 bg-slate-900 text-white font-extrabold text-xs sm:text-sm p-5 uppercase tracking-wider">
              <div className="col-span-4">Tailoring Operations</div>
              <div className="col-span-4 text-slate-400">Old Way (Paper Register)</div>
              <div className="col-span-4 text-orange-400">The DarziDesk Way</div>
            </div>

            <div className="divide-y divide-slate-100">
              {COMPARISON_ROWS.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 p-5 sm:p-6 text-xs sm:text-sm items-start gap-4">
                  <div className="col-span-4 font-black text-slate-900">{row.criterion}</div>
                  <div className="col-span-4 text-slate-500 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{row.traditional}</span>
                  </div>
                  <div className="col-span-4 text-slate-900 font-semibold flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{row.darzidesk}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. BOTTOM CTA BANNER ─────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Ready to Upgrade Your Atelier?
          </h2>
          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
            Start your 14-day free trial today. Test out all features with your real workshop orders — no credit card required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/login?mode=register"
              className="px-8 py-4 text-base font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-full shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>Start Free 14-Day Trial</span>
              <ArrowRight className="w-5 h-5 text-orange-600" />
            </Link>
            <Link
              to="/pricing"
              className="px-7 py-4 text-base font-bold text-white border-2 border-white/80 hover:bg-white/10 rounded-full transition-all"
            >
              Compare Plans
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};
