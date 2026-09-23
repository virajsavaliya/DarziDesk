import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { ThreeCanvas } from './ThreeCanvas';
import { ThreeDCard } from './ThreeDCard';
import tailorOwnerImg from '../../assets/tailor_owner.jpg';
import avatarRameshImg from '../../assets/avatar_ramesh.jpg';
import avatarKaranImg from '../../assets/avatar_karan.jpg';

import {
  Ruler,
  Scissors,
  Layers,
  Users,
  MessageSquare,
  Receipt,
  Store,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  Calculator,
  ArrowRight,
  Sparkles,
  Play,
  RotateCcw,
  Check,
} from 'lucide-react';

interface WorkflowStep {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  description: string;
  actionText: string;
  icon: React.ElementType;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 1,
    title: 'Client Intake & Style Selection',
    subtitle: 'Step 1 • Front Desk',
    badge: 'Intake',
    color: 'from-blue-500 to-sky-500',
    description:
      'Customer walks in or books online. Capture design choices (collar, cuffs, vents, lapel, pleats) and delivery deadline.',
    actionText: 'Auto-generates unique Order ID #DD-4921 with scheduled trial date.',
    icon: Store,
  },
  {
    id: 2,
    title: 'Digital Measurement Passport',
    subtitle: 'Step 2 • Fitting Room',
    badge: 'Measurements',
    color: 'from-amber-500 to-orange-500',
    description:
      'Record 20+ precise parameters on smartphone or tablet. Historical versions preserved so returning customers take 30 seconds.',
    actionText: 'Instant body fit comparison against previous order records.',
    icon: Ruler,
  },
  {
    id: 3,
    title: 'Fabric Allocation & Stock Ledger',
    subtitle: 'Step 3 • Cutting Table',
    badge: 'Inventory',
    color: 'from-emerald-500 to-teal-500',
    description:
      'System reserves 2.75 meters of Italian Wool from Roll #W-104 with row-level locking. Scrap remnants logged for pocketing & lining.',
    actionText: 'Prevents double-booking and alerts owner if fabric stock drops below 10m.',
    icon: Layers,
  },
  {
    id: 4,
    title: 'Karigar Assignment & Work Queue',
    subtitle: 'Step 4 • Workshop Station',
    badge: 'Crafting',
    color: 'from-indigo-500 to-purple-500',
    description:
      'Assign pattern cutting to Master Salim and stitching to Karigar Dilip. Tracks piece-rate wage automatically upon task completion.',
    actionText: 'Karigars view their own dedicated task list on mobile without seeing shop financials.',
    icon: Scissors,
  },
  {
    id: 5,
    title: 'Trial Fitting & Automated Alert',
    subtitle: 'Step 5 • Quality Control',
    badge: 'Trial Ready',
    color: 'from-orange-500 to-rose-500',
    description:
      'Quality checklist verifies measurements. 1-click WhatsApp & SMS ping notifies the client: "Your bespoke suit is ready for trial fitting!"',
    actionText: 'Cuts trial no-shows by 85% with automatic appointment reminders.',
    icon: MessageSquare,
  },
  {
    id: 6,
    title: 'Final Delivery & GST Invoicing',
    subtitle: 'Step 6 • Counter & Ledger',
    badge: 'Completed',
    color: 'from-emerald-600 to-green-600',
    description:
      'Collect balance payment via dynamic UPI QR code. Issue branded GST PDF bill with tax breakdown and update monthly revenue ledger.',
    actionText: 'Full audit history logged and order archived into customer lifetime records.',
    icon: Receipt,
  },
];

const OWNER_FEATURES = [
  {
    icon: Ruler,
    title: '360° Digital Measurement Register',
    tag: 'Zero Misplaced Slips',
    desc: 'Record suit, sherwani, lehenga, and shirt measurements with visual anatomy guides. Revisions are versioned with timestamps so previous alterations are never forgotten.',
    bullets: ['Version history & fit comparison', 'Custom measurements for 15+ garments', 'Customer self-access via secure portal'],
    color: 'orange',
  },
  {
    icon: Layers,
    title: 'Fabric Rolls & Scrap Inventory',
    tag: 'Live Meterage',
    desc: 'Keep accurate counts of fabric rolls, lining materials, and buttons. Real-time reservation prevents selling cloth that was already promised to another customer.',
    bullets: ['Roll-level barcode & scrap logging', 'Automated low-stock WhatsApp warnings', 'Cost-per-meter profit tracking'],
    color: 'emerald',
  },
  {
    icon: Users,
    title: 'Karigar Piece-Rate & Staff Hub',
    tag: 'Staff Harmony',
    desc: 'Keep track of cutters, tailors, and hand-embroidery karigars. Assign work orders with piece-rate labor pricing and generate weekly payroll summaries in one tap.',
    bullets: ['Role-based mobile access (Tailor view)', 'Piece-rate commission ledger', 'Daily production velocity metrics'],
    color: 'blue',
  },
  {
    icon: MessageSquare,
    title: 'Automated WhatsApp & SMS Updates',
    tag: 'No More "Is It Ready?" Calls',
    desc: 'Send automated status alerts when an order is booked, cutting is completed, ready for trial, and packed for pickup. Elevate customer trust effortlessly.',
    bullets: ['WhatsApp template integration', 'Trial appointment booking links', 'Digital receipt attached as PDF'],
    color: 'purple',
  },
  {
    icon: Receipt,
    title: 'GST Billing & Dynamic UPI Invoices',
    tag: 'Tax & Khata Ready',
    desc: 'Create professional GST-compliant estimates and tax bills. Accept advance deposits, show pending balances, and generate instant UPI QR codes for instant counter payment.',
    bullets: ['Statewise CGST / SGST split', 'Advance deposit & balance tracker', 'Print on thermal receipt or A4 paper'],
    color: 'amber',
  },
  {
    icon: Store,
    title: 'City Marketplace Storefront',
    tag: 'Customer Acquisition',
    desc: 'Publish your workshop portfolio to the DarziDesk marketplace. Gain new walk-ins and bespoke orders from customers looking for rated tailor shops in your city.',
    bullets: ['Public gallery of past stitch work', 'Verified customer ratings & reviews', 'Direct bespoke inquiry routing'],
    color: 'rose',
  },
];

export const ForOwnersPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ROI Calculator state
  const [ordersPerMonth, setOrdersPerMonth] = useState(80);
  const [tailorCount, setTailorCount] = useState(4);
  const [avgTicket, setAvgTicket] = useState(2500);

  // Auto step through workflow if playing
  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % WORKFLOW_STEPS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Derived ROI calculations
  const hoursSavedPerMonth = Math.round((ordersPerMonth * 25) / 60 + tailorCount * 6);
  const extraRevenueCapacity = Math.round(ordersPerMonth * 0.22 * avgTicket);
  const alterationSavings = Math.round(ordersPerMonth * 0.18 * 450);

  // FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const FAQS = [
    {
      q: 'Do I need a computer in my shop, or can I use my smartphone?',
      a: 'DarziDesk is 100% mobile responsive. You and your staff can run every aspect of your workshop — measurements, orders, fabric stock, and billing — directly from an Android smartphone, iPhone, tablet, or desktop counter PC.',
    },
    {
      q: 'Can my karigars and cutters see my profit margins and shop finances?',
      a: 'No. DarziDesk features strict role-based access control. Staff and karigar accounts only see their assigned tailoring tasks, garment measurement cards, and piece-rate milestones. Financial analytics, supplier costs, and invoice summaries remain strictly visible to the shop owner only.',
    },
    {
      q: 'Can I import my existing customer and measurement records from paper notebooks?',
      a: 'Yes! Our onboarding team provides a quick CSV import template, and you can also photograph legacy notebook measurement slips to attach them directly to customer profiles as digital references.',
    },
    {
      q: 'How does the fabric inventory prevent double-allocation?',
      a: 'Whenever an order is confirmed, the exact meters required are reserved using PostgreSQL database-level isolation. Even if two staff members try to allocate the same fabric roll simultaneously, the system prevents overdrafts and notifies you immediately.',
    },
    {
      q: 'Is GST mandatory to use DarziDesk?',
      a: 'Not at all. You can easily toggle between Non-GST and GST modes in Shop Settings. If you are unregistered, you can generate clean standard bills without tax numbers.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      <PublicNavbar />

      {/* ── 1. HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-white">
        <ThreeCanvas className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-70" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-extrabold uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                <span>Shop Owner Operating Suite</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-slate-900 leading-[1.15]">
                Run Your Tailoring Atelier with <br />
                <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Zero Chaos & Maximum Profit
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Transform manual khata registers, misplaced measurements, and delayed customer deliveries into a smooth,
                high-efficiency digital atelier. Built specifically for independent tailor masters, boutiques, and multi-branch houses.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/login?mode=register"
                  className="px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <a
                  href="#workflow"
                  className="px-6 py-4 text-base font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all flex items-center gap-2"
                >
                  <span>See How It Works</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </a>
              </div>

              {/* Trust Metric Badges */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-100 text-left">
                <div>
                  <div className="text-2xl font-black text-slate-900">45+ hrs</div>
                  <div className="text-xs text-slate-500 font-medium">Saved per month</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">0%</div>
                  <div className="text-xs text-slate-500 font-medium">Lost measurements</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">100%</div>
                  <div className="text-xs text-slate-500 font-medium">Data privacy (RLS)</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Visual Card */}
            <div className="lg:col-span-5 flex justify-center">
              <ThreeDCard
                maxTilt={6}
                className="w-full max-w-md bg-gradient-to-br from-white via-orange-50/30 to-amber-50/50 rounded-3xl p-6 sm:p-7 border border-orange-200/80 shadow-2xl relative overflow-hidden"
              >
                <div className="flex items-center justify-between pb-4 border-b border-orange-100">
                  <div className="flex items-center gap-3">
                    <img
                      src={tailorOwnerImg}
                      alt="Master Tailor"
                      className="w-12 h-12 rounded-full object-cover border-2 border-orange-400"
                    />
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">Ramesh Tailoring Atelier</h4>
                      <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live Shop Operations
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold">
                    Pro Plan
                  </span>
                </div>

                {/* Mini Quick Stats */}
                <div className="grid grid-cols-2 gap-3 py-4">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-medium">Active Orders</span>
                    <p className="text-xl font-extrabold text-slate-900 mt-0.5">38 Suits</p>
                    <span className="text-[10px] text-emerald-600 font-bold">6 Ready for Trial Today</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-medium">Fabric Rolls</span>
                    <p className="text-xl font-extrabold text-slate-900 mt-0.5">142 m</p>
                    <span className="text-[10px] text-amber-600 font-bold">2 Low-Stock Alerts</span>
                  </div>
                </div>

                {/* Sample Live Order Flow Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Order #DD-8812 • 3-Piece Tuxedo</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                      Stitching
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full w-2/3 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Customer: Vikram Singhania</span>
                    <span className="font-bold text-slate-700">Trial: Tomorrow 4 PM</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold">WhatsApp Alert sent</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Delivered
                  </span>
                </div>
              </ThreeDCard>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. INTERACTIVE WORKSHOP PIPELINE SIMULATOR ─────────────────── */}
      <section id="workflow" className="py-24 bg-slate-100/80 border-y border-slate-200/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Interactive Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              From Intake to Delivery: The Complete DarziDesk Lifecycle
            </h2>
            <p className="text-slate-600 text-base">
              Click any milestone below to see how DarziDesk replaces chaotic paper khata with automated precision.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isPlaying
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isPlaying ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>Pause Auto-Tour</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Interactive Tour</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setActiveStep(0)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                title="Restart flow"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Stepper Buttons Horizontal */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-8">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isCurrent = activeStep === idx;
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    setActiveStep(idx);
                    setIsPlaying(false);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isCurrent
                      ? 'bg-white border-orange-500 shadow-lg ring-2 ring-orange-500/20 translate-y-[-2px]'
                      : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                        isCurrent ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {step.id}
                    </span>
                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-orange-500' : 'text-slate-400'}`} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{step.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{step.subtitle}</p>
                </button>
              );
            })}
          </div>

          {/* Active Step Deep-Dive Card */}
          {(() => {
            const current = WORKFLOW_STEPS[activeStep];
            const Icon = current.icon;
            return (
              <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center transition-all">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>{current.subtitle}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{current.title}</h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{current.description}</p>

                  <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200/80 text-orange-950 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm font-semibold">{current.actionText}</span>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => setActiveStep((prev) => (prev + 1) % WORKFLOW_STEPS.length)}
                      className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    >
                      <span>Next: {WORKFLOW_STEPS[(activeStep + 1) % WORKFLOW_STEPS.length].title.split('&')[0]}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-slate-400">
                      Step {activeStep + 1} of {WORKFLOW_STEPS.length}
                    </span>
                  </div>
                </div>

                {/* Right Interactive Mock View */}
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">{current.badge} Simulator</div>
                        <div className="text-[10px] text-slate-400">DarziDesk Live Engine</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                      SYNCHRONIZED
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase">Active Workstation</div>
                      <div className="text-amber-300 font-bold">{current.title}</div>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase">Postgres RLS Context</div>
                      <div className="text-emerald-400 truncate">TENANT_ID: shop_atelier_9021</div>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase">Customer Communication</div>
                      <div className="text-sky-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp Webhook dispatched</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── 3. 6 CORE SHOP OWNER PILLARS ──────────────────────────────── */}
      <section className="py-24 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Complete Feature Arsenal
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Engineered Specifically for the Needs of Indian Tailors
            </h2>
            <p className="text-slate-600 text-base">
              Generic billing software fails in tailoring because it doesn't understand fabric meters, sleeve alterations,
              and karigar piece-rate wages. DarziDesk is built around the real craft.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {OWNER_FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <ThreeDCard
                  key={idx}
                  maxTilt={5}
                  className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        {feat.tag}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{feat.desc}</p>

                    <ul className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-700 font-medium">
                      {feat.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <Link
                      to="/login?mode=register"
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
                    >
                      <span>Explore this tool</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </ThreeDCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. INTERACTIVE ROI CALCULATOR ────────────────────────────── */}
      <section id="roi" className="py-24 bg-gradient-to-br from-slate-900 via-[#102C44] to-slate-900 text-white relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Calculator Left: Sliders */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-sm">
                <Calculator className="w-3.5 h-3.5" />
                <span>Interactive ROI Calculator</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Calculate How Much Time & Money DarziDesk Saves You
              </h2>

              <p className="text-slate-300 text-sm leading-relaxed">
                Adjust your shop's numbers below to see the estimated time saved, alteration rework reductions, and extra
                business capacity unlocked each month.
              </p>

              {/* Slider 1: Monthly Orders */}
              <div className="space-y-2 bg-white/5 p-5 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-200">Monthly Garments Stitched:</span>
                  <span className="font-mono font-bold text-orange-400 text-base">{ordersPerMonth} orders</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={400}
                  step={10}
                  value={ordersPerMonth}
                  onChange={(e) => setOrdersPerMonth(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>20 orders (Boutique)</span>
                  <span>400+ orders (Large Atelier)</span>
                </div>
              </div>

              {/* Slider 2: Number of Tailors/Karigars */}
              <div className="space-y-2 bg-white/5 p-5 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-200">Staff / Karigars:</span>
                  <span className="font-mono font-bold text-orange-400 text-base">{tailorCount} workers</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={25}
                  step={1}
                  value={tailorCount}
                  onChange={(e) => setTailorCount(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>1 master craftsman</span>
                  <span>25 tailoring stations</span>
                </div>
              </div>

              {/* Slider 3: Average Ticket Size */}
              <div className="space-y-2 bg-white/5 p-5 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-200">Average Stitching Charge:</span>
                  <span className="font-mono font-bold text-orange-400 text-base">
                    ₹{avgTicket.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  type="range"
                  min={600}
                  max={8000}
                  step={200}
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>₹600 (Shirt / Kurti)</span>
                  <span>₹8,000 (Bridal / Heavy Suit)</span>
                </div>
              </div>
            </div>

            {/* Calculator Right: Output Metrics */}
            <div className="lg:col-span-6">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl space-y-6">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span>Your Estimated Monthly Return</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                    <span className="text-xs text-slate-300 font-medium">Monthly Time Reclaimed</span>
                    <div className="text-3xl font-black text-amber-300 mt-1">~{hoursSavedPerMonth} hrs</div>
                    <p className="text-[11px] text-slate-300 mt-1">Eliminates notebook searches & status phone calls</p>
                  </div>

                  <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                    <span className="text-xs text-slate-300 font-medium">Fabric & Alteration Savings</span>
                    <div className="text-3xl font-black text-emerald-400 mt-1">
                      ₹{alterationSavings.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">Saved from incorrect measurements & scrap waste</p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-500/30 to-amber-500/30 border border-orange-400/40">
                  <div className="text-xs text-orange-200 uppercase font-bold tracking-wider">
                    Extra Revenue Capacity / Month
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                    ₹{extraRevenueCapacity.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-slate-200 mt-1">
                    By taking 20% more bespoke orders without needing extra administrative staff.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    to="/login?mode=register"
                    className="w-full py-4 text-center block rounded-xl font-black text-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/30 transition-all"
                  >
                    Claim Your 14-Day Free Workshop Trial
                  </Link>
                  <p className="text-center text-[11px] text-slate-400 mt-2">
                    No credit card required • Instant setup in under 3 minutes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. TESTIMONIALS FROM ATELIER MASTERS ───────────────────────── */}
      <section className="py-24 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Voices of the Craft
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Loved by Tailor Masters Across Gujarat, Maharashtra & Rajasthan
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ThreeDCard className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={avatarRameshImg}
                  alt="Ramesh Patel"
                  className="w-14 h-14 rounded-full object-cover border-2 border-orange-400"
                />
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Ramesh Patel</h4>
                  <p className="text-xs text-slate-500">Founder, Shree Ganesh Tailors (Surat)</p>
                  <div className="flex items-center gap-1 text-amber-500 text-xs mt-1">★★★★★ 4.9 Rating</div>
                </div>
              </div>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                "For 28 years, my shop ran on 6 thick paper registers. When a customer returned after two years asking for the same fit, we would spend 20 minutes digging through dust. With DarziDesk, I search their phone number and their exact lehenga & suit measurements appear in 2 seconds. My customers are amazed."
              </p>
              <div className="pt-2 text-xs font-bold text-orange-600">Growth: +45% Order Capacity in 5 Months</div>
            </ThreeDCard>

            <ThreeDCard className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={avatarKaranImg}
                  alt="Karan Mehta"
                  className="w-14 h-14 rounded-full object-cover border-2 border-orange-400"
                />
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Karan Mehta</h4>
                  <p className="text-xs text-slate-500">Master Cutter, Modern Fit Atelier (Ahmedabad)</p>
                  <div className="flex items-center gap-1 text-amber-500 text-xs mt-1">★★★★★ 5.0 Rating</div>
                </div>
              </div>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                "The fabric roll tracking and low-stock alerts alone saved us from disastrous wedding season delays. We never run out of lining or canvas anymore, and our karigars know exactly what piece-rate wage they earned every Saturday without arguments."
              </p>
              <div className="pt-2 text-xs font-bold text-orange-600">Impact: 0 Missed Delivery Deadlines in 2024</div>
            </ThreeDCard>
          </div>
        </div>
      </section>

      {/* ── 6. SHOP OWNER FAQ ACCORDION ───────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-t border-slate-200/80 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Questions & Answers
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Shop Owner FAQs</h2>
            <p className="text-slate-600 text-sm">Everything you need to know about switching your workshop to DarziDesk.</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-orange-600 transition-colors"
                  >
                    <span className="text-sm sm:text-base">{faq.q}</span>
                    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-sm font-bold">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. BOTTOM CALL TO ACTION ─────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Ready to Modernize Your Tailor Shop Today?
          </h2>
          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
            Join 500+ ateliers and master tailors who have eliminated paper confusion and unlocked record customer satisfaction.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/login?mode=register"
              className="px-8 py-4 text-base font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-full shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-5 h-5 text-orange-600" />
            </Link>
            <Link
              to="/pricing"
              className="px-7 py-4 text-base font-bold text-white border-2 border-white/80 hover:bg-white/10 rounded-full transition-all"
            >
              View Pricing Plans
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-8 text-xs sm:text-sm font-bold text-white/90">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Full WhatsApp integration included</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Easy smartphone setup</span>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};
