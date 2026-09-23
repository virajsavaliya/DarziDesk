import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { ThreeCanvas } from './ThreeCanvas';
import { ThreeDCard } from './ThreeDCard';
import customerWomanImg from '../../assets/customer_woman.jpg';
import avatarPriyaImg from '../../assets/avatar_priya.jpg';

import {
  Sparkles,
  Search,
  Ruler,
  ArrowRight,
  Package,
  Scissors,
  Check,
  Shirt,
  Layers,
  Palette,
} from 'lucide-react';

interface SimulatedOrder {
  id: string;
  item: string;
  shopName: string;
  shopLocation: string;
  currentStep: number;
  stageName: string;
  trialDate: string;
  deliveryDate: string;
  masterTailor: string;
  steps: {
    title: string;
    date: string;
    completed: boolean;
    active: boolean;
  }[];
}

const SAMPLE_ORDERS: SimulatedOrder[] = [
  {
    id: 'DD-8821',
    item: 'Bespoke Italian Wool 2-Piece Suit',
    shopName: 'Royal Stitch Atelier',
    shopLocation: 'Adajan, Surat',
    currentStep: 4,
    stageName: 'Artisan Stitching & Canvas Padding',
    trialDate: 'Tomorrow at 4:30 PM',
    deliveryDate: 'Sep 22, 2026',
    masterTailor: 'Master Saleem (18 yrs experience)',
    steps: [
      { title: 'Order Booked & Fabric Inspected', date: 'Sep 14, 11:30 AM', completed: true, active: false },
      { title: 'Digital Measurement Passport Verified', date: 'Sep 14, 03:15 PM', completed: true, active: false },
      { title: 'Canvas & Pattern Hand-Cut', date: 'Sep 15, 10:00 AM', completed: true, active: false },
      { title: 'Master Stitching in Progress', date: 'Sep 15, 02:45 PM', completed: false, active: true },
      { title: 'Baste Fitting Trial', date: 'Sep 17, 04:30 PM (Scheduled)', completed: false, active: false },
      { title: 'Final Finishing & Pickup', date: 'Sep 22 (Estimated)', completed: false, active: false },
    ],
  },
  {
    id: 'DD-5190',
    item: 'Hand-Embroidered Raw Silk Sherwani',
    shopName: 'Shree Ganesh Bespoke',
    shopLocation: 'Vesu, Surat',
    currentStep: 5,
    stageName: 'Ready for Fitting Trial',
    trialDate: 'Today (Walk-in Available)',
    deliveryDate: 'Sep 20, 2026',
    masterTailor: 'Ramesh Patel (Master Draper)',
    steps: [
      { title: 'Fabric & Zari Selection', date: 'Sep 10, 02:00 PM', completed: true, active: false },
      { title: 'Custom 24-Point Measurement Logged', date: 'Sep 10, 02:40 PM', completed: true, active: false },
      { title: 'Silk Cutting & Lining Allocation', date: 'Sep 11, 11:00 AM', completed: true, active: false },
      { title: 'Intricate Hand Embroidery & Stitch', date: 'Sep 13, 06:00 PM', completed: true, active: false },
      { title: 'Trial Scheduled (Ready in Store)', date: 'Today, Available Now', completed: false, active: true },
      { title: 'Steam Press & Final Delivery', date: 'Sep 20, 05:00 PM', completed: false, active: false },
    ],
  },
  {
    id: 'DD-3304',
    item: 'Designer Chikankari Kurti & Pants',
    shopName: 'Modern Fit Boutique',
    shopLocation: 'City Light, Surat',
    currentStep: 3,
    stageName: 'Pattern Drafting & Cutting',
    trialDate: 'Thursday at 2:00 PM',
    deliveryDate: 'Sep 24, 2026',
    masterTailor: 'Karan Mehta',
    steps: [
      { title: 'Order Booked via Marketplace', date: 'Sep 15, 09:15 AM', completed: true, active: false },
      { title: 'Saved Passport Measurements Applied', date: 'Sep 15, 09:30 AM', completed: true, active: false },
      { title: 'Pattern Drafting in Progress', date: 'Sep 15, 11:00 AM', completed: false, active: true },
      { title: 'Fine Edge Stitching', date: 'Pending', completed: false, active: false },
      { title: 'Fitting Trial', date: 'Pending', completed: false, active: false },
      { title: 'Packed with Garment Bag', date: 'Pending', completed: false, active: false },
    ],
  },
];

interface GarmentEstimate {
  name: string;
  avgFabric: string;
  turnaround: string;
  fittingTrials: string;
  priceRange: string;
  icon: React.ReactNode;
}

const GARMENT_ESTIMATES: Record<string, GarmentEstimate> = {
  suit: {
    name: '2-Piece Bespoke Suit / Blazer',
    avgFabric: '3.0 - 3.25 meters',
    turnaround: '5 to 7 Days',
    fittingTrials: '1 to 2 Fitting Trials',
    priceRange: '₹3,500 – ₹8,500',
    icon: <Shirt className="w-5 h-5" />,
  },
  sherwani: {
    name: 'Wedding Sherwani / Indo-Western',
    avgFabric: '4.0 - 4.5 meters',
    turnaround: '7 to 12 Days',
    fittingTrials: '2 Precision Trials',
    priceRange: '₹5,000 – ₹15,000',
    icon: <Sparkles className="w-5 h-5" />,
  },
  lehenga: {
    name: 'Bridal or Festive Lehenga & Blouse',
    avgFabric: '5.0 - 6.5 meters',
    turnaround: '8 to 14 Days',
    fittingTrials: '2 Fitting Trials',
    priceRange: '₹4,000 – ₹12,000',
    icon: <Palette className="w-5 h-5" />,
  },
  shirt: {
    name: 'Custom Formal Shirt & Trousers',
    avgFabric: '1.6m (Shirt) + 1.25m (Pants)',
    turnaround: '3 to 4 Days',
    fittingTrials: '1 Optional Trial',
    priceRange: '₹900 – ₹2,200',
    icon: <Scissors className="w-5 h-5" />,
  },
  kurti: {
    name: 'Designer Anarkali / Kurti Suit',
    avgFabric: '2.5 - 3.5 meters',
    turnaround: '3 to 5 Days',
    fittingTrials: '1 Trial Session',
    priceRange: '₹800 – ₹2,500',
    icon: <Layers className="w-5 h-5" />,
  },
};

export const ForCustomersPage: React.FC = () => {
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [selectedGarmentKey, setSelectedGarmentKey] = useState('suit');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const currentOrder = SAMPLE_ORDERS[selectedOrderIndex];
  const currentEstimate = GARMENT_ESTIMATES[selectedGarmentKey];

  const CUSTOMER_FAQS = [
    {
      q: 'How does live order tracking work for my clothes?',
      a: 'When you place an order with any DarziDesk-powered tailor shop, you receive a direct SMS or WhatsApp message containing your unique tracking link. You can see real-time updates as the master tailor cuts, stitches, and finishes your garment.',
    },
    {
      q: 'What is the Digital Measurement Passport?',
      a: 'It is your personal cloud measurement profile. When you get measured once at a verified tailor, your exact 20+ body dimensions (neck, shoulder, chest, waist, inseam, sleeve) are saved securely. You can reuse this profile for future orders or share it with any tailor on DarziDesk without taking new tape measurements every time.',
    },
    {
      q: 'What if the garment doesn’t fit properly on the trial date?',
      a: 'All verified tailor shops on DarziDesk maintain a strict Trial & Alteration protocol. Your trial date is scheduled specifically to fine-tune the drape and fit before final pressing and delivery, with any adjustments recorded into your profile.',
    },
    {
      q: 'Can I provide my own fabric or buy directly from the tailor?',
      a: 'Both! You can bring your own fabric purchased from anywhere, or browse the tailor’s curated fabric roll inventory with certified meterage and material details.',
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
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs font-extrabold uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Customer Experience & Marketplace</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-slate-900 leading-[1.15]">
                Bespoke Clothing, <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
                  Tailored Effortlessly for You
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Never settle for ill-fitting off-the-rack garments again. Discover top-rated master tailors in your city,
                save your measurements in a digital passport, and watch your garment come to life with live stage tracking.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/marketplace"
                  className="px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Search className="w-4.5 h-4.5" />
                  <span>Find Master Tailors Near You</span>
                </Link>

                <a
                  href="#tracker"
                  className="px-6 py-4 text-base font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all flex items-center gap-2"
                >
                  <span>Track Live Order Demo</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </a>
              </div>

              {/* 3 Pillars */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-100 text-left">
                <div>
                  <div className="text-2xl font-black text-slate-900">500+</div>
                  <div className="text-xs text-slate-500 font-medium">Verified Ateliers</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">1-Tap</div>
                  <div className="text-xs text-slate-500 font-medium">Measurement Re-order</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">Live</div>
                  <div className="text-xs text-slate-500 font-medium">WhatsApp Updates</div>
                </div>
              </div>
            </div>

            {/* Right Customer Visual */}
            <div className="lg:col-span-5 flex justify-center">
              <ThreeDCard
                maxTilt={6}
                className="w-full max-w-md bg-gradient-to-br from-white via-blue-50/30 to-sky-50/50 rounded-3xl p-6 sm:p-7 border border-blue-200/80 shadow-2xl relative overflow-hidden"
              >
                <div className="relative h-60 rounded-2xl overflow-hidden mb-5 shadow-md">
                  <img
                    src={customerWomanImg}
                    alt="Customer enjoying bespoke tailoring"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold mb-0.5">
                      ★★★★★ 4.9 Verified Fit
                    </div>
                    <p className="text-xs font-medium">"My wedding lehenga fit like a glove on the first trial!"</p>
                  </div>
                </div>

                {/* Digital Passport Preview Badge */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-blue-600" />
                      Priya's Measurement Passport
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-slate-600">
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <span className="block text-[9px] text-slate-400 uppercase">Bust</span>
                      <span className="font-bold text-slate-900">36.5"</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <span className="block text-[9px] text-slate-400 uppercase">Waist</span>
                      <span className="font-bold text-slate-900">28.0"</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <span className="block text-[9px] text-slate-400 uppercase">Hip</span>
                      <span className="font-bold text-slate-900">38.0"</span>
                    </div>
                  </div>
                </div>
              </ThreeDCard>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. LIVE ORDER TRACKING SIMULATOR ───────────────────────────── */}
      <section id="tracker" className="py-24 bg-slate-100/80 border-y border-slate-200/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Live Order Transparency
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Interactive Order Tracking Simulator
            </h2>
            <p className="text-slate-600 text-base">
              Say goodbye to awkward calls asking "Bhau, is my suit ready?". Select a demo order below to see how customer
              tracking works in real time.
            </p>

            {/* Sample Order Selector Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
              {SAMPLE_ORDERS.map((order, idx) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderIndex(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    selectedOrderIndex === idx
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>
                    {order.id}: {order.item.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Order Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg">
                    {currentOrder.id}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-slate-500">{currentOrder.shopLocation}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{currentOrder.item}</h3>
                <p className="text-xs text-slate-600 mt-0.5">Crafted by: <span className="font-bold text-slate-800">{currentOrder.shopName}</span> ({currentOrder.masterTailor})</p>
              </div>

              <div className="sm:text-right bg-blue-50/80 p-4 rounded-2xl border border-blue-100">
                <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block">Fitting Trial</span>
                <span className="text-base font-extrabold text-blue-900">{currentOrder.trialDate}</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Est. Delivery: {currentOrder.deliveryDate}</span>
              </div>
            </div>

            {/* Current Stage Highlight Bar */}
            <div className="my-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Scissors className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Current Status</span>
                  <h4 className="text-sm sm:text-base font-black text-slate-900">{currentOrder.stageName}</h4>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-sm hidden sm:inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>On Schedule</span>
              </span>
            </div>

            {/* 6 Stage Vertical / Horizontal Stepper */}
            <div className="space-y-3 pt-2">
              {currentOrder.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    step.active
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                      : step.completed
                      ? 'bg-slate-50/50 border-slate-100 text-slate-700'
                      : 'bg-white border-dashed border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        step.completed
                          ? 'bg-emerald-500 text-white'
                          : step.active
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {step.completed ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </div>
                    <div>
                      <h5 className={`text-xs sm:text-sm font-bold ${step.active ? 'text-blue-900' : 'text-slate-900'}`}>
                        {step.title}
                      </h5>
                      <span className="text-[10px] text-slate-400">{step.date}</span>
                    </div>
                  </div>

                  {step.active && (
                    <span className="text-[11px] font-extrabold text-blue-700 bg-white px-3 py-1 rounded-full border border-blue-200">
                      Active Stage
                    </span>
                  )}
                  {step.completed && (
                    <span className="text-[11px] font-semibold text-emerald-600">Completed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. INTERACTIVE GARMENT ESTIMATOR ──────────────────────────── */}
      <section className="py-24 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Planning Your Wardrobe
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Interactive Stitching & Fabric Estimator
            </h2>
            <p className="text-slate-600 text-base">
              Wondering how much cloth you need to buy or how long tailor stitching takes? Select a garment below.
            </p>

            {/* Garment Selector Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              {Object.keys(GARMENT_ESTIMATES).map((key) => {
                const item = GARMENT_ESTIMATES[key];
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedGarmentKey(key)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                      selectedGarmentKey === key
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name.split('/')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estimator Card Display */}
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/40 rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                {currentEstimate.icon}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">{currentEstimate.name}</h3>
                <p className="text-xs text-slate-500">Benchmark metrics for custom bespoke tailoring</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-8">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Fabric Needed</span>
                <p className="text-lg sm:text-xl font-black text-slate-900">{currentEstimate.avgFabric}</p>
                <span className="text-[10px] text-slate-400 block">Standard 58" or 44" width</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Turnaround Time</span>
                <p className="text-lg sm:text-xl font-black text-blue-600">{currentEstimate.turnaround}</p>
                <span className="text-[10px] text-slate-400 block">Express available on request</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Fitting Protocol</span>
                <p className="text-lg sm:text-xl font-black text-amber-600">{currentEstimate.fittingTrials}</p>
                <span className="text-[10px] text-slate-400 block">Ensures immaculate drape</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Estimated Stitching</span>
                <p className="text-lg sm:text-xl font-black text-emerald-600">{currentEstimate.priceRange}</p>
                <span className="text-[10px] text-slate-400 block">Depends on atelier & canvas</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs sm:text-sm font-semibold">
                Want to connect with a verified master craftsman for this garment in your city?
              </div>
              <Link
                to="/marketplace"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>Browse Ateliers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS FOR CUSTOMERS (4-Step Journey) ─────────────── */}
      <section className="py-24 bg-slate-900 text-white relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-white/10 text-sky-300 text-xs font-bold uppercase tracking-wider rounded-md">
              Seamless Experience
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">The 4-Step Bespoke Journey</h2>
            <p className="text-slate-300 text-sm">How DarziDesk re-engineers tailoring from stressful to delightful.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg">
                1
              </div>
              <h4 className="text-base font-bold text-white">Find & Compare Ateliers</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Search verified tailor shops by garment specialty (suits, bridal, kurtis), view photo galleries, and read genuine customer reviews.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg">
                2
              </div>
              <h4 className="text-base font-bold text-white">Digital Fitting & Styling</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Visit the workshop or book doorstep measurements. Your exact profile is saved in your digital passport for life.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-lg">
                3
              </div>
              <h4 className="text-base font-bold text-white">Live Status Notifications</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Receive friendly WhatsApp updates when your cloth is cut, basted, and ready for trial. No guesswork, no chasing.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg">
                4
              </div>
              <h4 className="text-base font-bold text-white">Pick Up & Easy Re-orders</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Collect your perfectly pressed garment. Next time you need bespoke clothes, order with 1 click using your saved passport fit!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. CUSTOMER REVIEWS & STORIES ──────────────────────────────── */}
      <section className="py-24 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Customer Love
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Real Experiences from Everyday Customers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ThreeDCard className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={avatarPriyaImg}
                  alt="Priya Shah"
                  className="w-14 h-14 rounded-full object-cover border-2 border-blue-400"
                />
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Priya Shah</h4>
                  <p className="text-xs text-slate-500">Bespoke Lehenga Customer • Surat</p>
                  <div className="flex items-center gap-1 text-amber-500 text-xs mt-1">★★★★★ 5.0 Rating</div>
                </div>
              </div>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                "Getting wedding clothes stitched used to be the most stressful part of the year. With DarziDesk, I found Shree Ganesh Tailors, got WhatsApp updates whenever my lehenga moved from cutting to embroidery, and the trial was ready right on the promised day!"
              </p>
            </ThreeDCard>

            <ThreeDCard className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-lg border-2 border-blue-300">
                  AK
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Amit Kothari</h4>
                  <p className="text-xs text-slate-500">Corporate Wardrobe Customer • Ahmedabad</p>
                  <div className="flex items-center gap-1 text-amber-500 text-xs mt-1">★★★★★ 5.0 Rating</div>
                </div>
              </div>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                "The Digital Measurement Passport is pure magic. I got measured once in January. Last week I bought Italian wool online, shipped it to Royal Stitch, and they tailored 3 suits without me having to visit the shop for remeasurement. Fits like a glove."
              </p>
            </ThreeDCard>
          </div>
        </div>
      </section>

      {/* ── 6. CUSTOMER FAQ ACCORDION ──────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-t border-slate-200/80 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Help Center
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Customer FAQs</h2>
          </div>

          <div className="space-y-3">
            {CUSTOMER_FAQS.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-blue-600 transition-colors"
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

      {/* ── 7. BOTTOM CTA ─────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Discover Verified Master Tailors in Your City
          </h2>
          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
            Browse verified workshops, compare ratings, and book bespoke craftsmanship with guaranteed fit.
          </p>

          <div className="pt-2 flex justify-center">
            <Link
              to="/marketplace"
              className="px-8 py-4 text-base font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-full shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>Explore Marketplace Now</span>
              <ArrowRight className="w-5 h-5 text-blue-600" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};
