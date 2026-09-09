import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoForLight from '../../assets/logo_for_light.png';
import tailorOwnerImg from '../../assets/tailor_owner.jpg';
import customerWomanImg from '../../assets/customer_woman.jpg';
import shopGaneshImg from '../../assets/shop_shree_ganesh.jpg';
import shopRoyalImg from '../../assets/shop_royal_stitch.jpg';
import shopModernImg from '../../assets/shop_modern_fit.jpg';
import avatarRameshImg from '../../assets/avatar_ramesh.jpg';
import avatarPriyaImg from '../../assets/avatar_priya.jpg';
import avatarKaranImg from '../../assets/avatar_karan.jpg';

import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Heart,
  MapPin,
  Play,
  Star,
  Shield,
  Clock,
  TrendingUp,
  Tag,
  Zap,
  Building2,
  Users,
  FileText,
  Package,
  Ruler,
  Menu,
  X,
} from 'lucide-react';
import { ThreeCanvas } from './ThreeCanvas';
import { ThreeDCard } from './ThreeDCard';
import { Hero3DDashboard } from './Hero3DDashboard';

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

export const LandingPage: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [isYearly, setIsYearly] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    'shree-ganesh': true,
    'royal-stitch': false,
    'modern-fit': false,
  });

  // Track scroll for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch plans from backend API
  useEffect(() => {
    fetch('/api/public/plans')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch((err) => {
        console.warn('Could not fetch public plans, using fallback data', err);
        setPlans([
          {
            id: 'plan-starter',
            name: 'Solo Craftsman',
            priceMonthly: 499,
            priceYearly: 4990,
            maxStaffAccounts: 2,
            maxOrdersPerMonth: 50,
            features: ['Digital Measurement Book', 'Basic Order Pipeline', 'Fabric Inventory', 'Customer SMS Notifications'],
            isDefault: false,
          },
          {
            id: 'plan-growth',
            name: 'Boutique Studio',
            priceMonthly: 1299,
            priceYearly: 12990,
            maxStaffAccounts: 6,
            maxOrdersPerMonth: 200,
            features: [
              'Everything in Solo',
              'Marketplace Storefront & Discovery',
              'Advanced Fabric Ledger & Alerts',
              'PDF Invoicing with GST calculation',
              'Customer Self-Service Portal',
            ],
            isDefault: true,
          },
          {
            id: 'plan-enterprise',
            name: 'Multi-Branch Enterprise',
            priceMonthly: 2999,
            priceYearly: 29990,
            maxStaffAccounts: 20,
            maxOrdersPerMonth: 1000,
            features: [
              'Everything in Boutique',
              'Unlimited Branches & Locations',
              'Custom Tailoring Add-on Pricing',
              'Dedicated Relationship Manager',
              'Priority 24/7 Phone Support',
            ],
            isDefault: false,
          },
        ]);
      });
  }, []);

  const toggleFavorite = (shopId: string) => {
    setFavorites((prev) => ({ ...prev, [shopId]: !prev[shopId] }));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      {/* ── 1. NAVBAR ──────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm py-3 border-b border-slate-100'
            : 'bg-white/80 backdrop-blur-sm py-4.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src={logoForLight}
              alt="DarziDesk"
              className="h-9 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#hero" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              Home
            </a>
            <a href="#for-owners" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              For Shop Owners
            </a>
            <a href="#for-customers" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              For Customers
            </a>
            <a href="#features" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              About
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3.5">
            <Link
              to="/login"
              className="px-5 py-2 text-sm font-bold text-slate-700 hover:text-orange-600 border border-slate-300 hover:border-orange-500 rounded-xl transition-all"
            >
              Login
            </Link>
            <Link
              to="/login?mode=register"
              className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-md hover:shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-slate-700 hover:text-orange-600 rounded-lg focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3 shadow-xl animate-in slide-in-from-top-4 duration-200">
            <a
              href="#hero"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-800"
            >
              Home
            </a>
            <a
              href="#for-owners"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-800"
            >
              For Shop Owners
            </a>
            <a
              href="#for-customers"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-800"
            >
              For Customers
            </a>
            <a
              href="#features"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-800"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-800"
            >
              Pricing
            </a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full text-center py-2.5 text-sm font-bold border border-slate-300 rounded-xl text-slate-700"
              >
                Login
              </Link>
              <Link
                to="/login?mode=register"
                className="w-full text-center py-2.5 text-sm font-bold bg-orange-500 text-white rounded-xl shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── 2. HERO SECTION ────────────────────────────────────────── */}
      <section id="hero" className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
        {/* Interactive Three.js 3D Background */}
        <ThreeCanvas className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
            {/* Left Hero Copy */}
            <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-bold tracking-wide shadow-sm">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                Modern Software for Modern Tailors
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Run Your Tailor Shop <br />
                <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Smarter, Not Harder
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                DarziDesk helps tailor shops manage customers, measurements, orders, inventory, and billing — all in one
                simple, high-performance system.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/login?mode=register"
                  className="px-7 py-3.5 text-base font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-full shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 transition-all transform hover:-translate-y-0.5 flex items-center gap-2.5"
                >
                  <span>Get Started for Free</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </Link>

                <button
                  onClick={() => setShowDemoModal(true)}
                  className="px-6 py-3.5 text-base font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-full shadow-sm transition-all flex items-center gap-2.5 transform hover:-translate-y-0.5"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                    <Play className="w-3 h-3 text-slate-800 fill-slate-800 ml-0.5" />
                  </div>
                  <span>Watch Demo</span>
                </button>
              </div>

              {/* 3 Value Checks */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs sm:text-sm font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Easy to use</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Save time</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Grow your business</span>
                </div>
              </div>
            </div>

            {/* Right Hero: 3D Interactive Perspective Dashboard */}
            <div className="lg:col-span-7 flex justify-center lg:justify-end w-full">
              <Hero3DDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. KEY CAPABILITIES QUICK BAR (4 Circular Cards) ────────── */}
      <section className="py-8 bg-slate-50/70 border-y border-slate-100 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <ThreeDCard className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-center flex flex-col items-center">
              <div className="w-13 h-13 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3 shadow-inner">
                <ClipboardList className="w-6 h-6 text-orange-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-0.5">Manage Orders</h4>
              <p className="text-xs text-slate-500">From measurement to delivery</p>
            </ThreeDCard>

            <ThreeDCard className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-center flex flex-col items-center">
              <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-inner">
                <Package className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-0.5">Track Fabric Stock</h4>
              <p className="text-xs text-slate-500">Never run out of stock</p>
            </ThreeDCard>

            <ThreeDCard className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-center flex flex-col items-center">
              <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
                <Ruler className="w-6 h-6 text-blue-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-0.5">Save Customer Measurements</h4>
              <p className="text-xs text-slate-500">Lifetime records</p>
            </ThreeDCard>

            <ThreeDCard className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-center flex flex-col items-center">
              <div className="w-13 h-13 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 shadow-inner">
                <FileText className="w-6 h-6 text-purple-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-0.5">Generate Bills & Reports</h4>
              <p className="text-xs text-slate-500">Grow your business better</p>
            </ThreeDCard>
          </div>
        </div>
      </section>

      {/* ── 4. DUAL AUDIENCE SPLIT SECTION ──────────────────────────── */}
      <section id="for-owners" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Card: For Tailor Shop Owners */}
            <ThreeDCard
              maxTilt={4}
              className="bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white rounded-3xl p-8 sm:p-10 border border-orange-100/80 shadow-lg relative overflow-hidden flex flex-col justify-between"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                <div className="sm:col-span-7 space-y-4">
                  <span className="inline-block px-3 py-1 bg-orange-100/90 text-orange-800 text-xs font-bold uppercase tracking-wider rounded-md">
                    For Tailor Shop Owners
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                    Manage Your Shop with Ease
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Get all the tools you need to run and grow your tailoring business efficiently in one unified platform.
                  </p>

                  <ul className="space-y-2.5 pt-2">
                    {[
                      'Manage customers & measurements',
                      'Track orders and delivery status',
                      'Maintain fabric inventory',
                      'Generate invoices and reports',
                      'Manage staff and multiple branches',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                        <div className="w-4.5 h-4.5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4 flex items-center gap-4">
                    <Link
                      to="/login?mode=register"
                      className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-md transition-all"
                    >
                      Start Free Trial
                    </Link>
                    <a
                      href="#features"
                      className="text-sm font-bold text-slate-700 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
                    >
                      <span>See All Features</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Master Tailor Photo */}
                <div className="sm:col-span-5 flex justify-center">
                  <div className="relative w-48 sm:w-56 h-64 sm:h-72 rounded-2xl overflow-hidden shadow-md border-2 border-white">
                    <img
                      src={tailorOwnerImg}
                      alt="Tailor Shop Owner"
                      className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-40" />
                  </div>
                </div>
              </div>
            </ThreeDCard>

            {/* Right Card: For Customers */}
            <ThreeDCard
              id="for-customers"
              maxTilt={4}
              className="bg-gradient-to-br from-blue-50/70 via-sky-50/40 to-white rounded-3xl p-8 sm:p-10 border border-blue-100/80 shadow-lg relative overflow-hidden flex flex-col justify-between"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                <div className="sm:col-span-7 space-y-4">
                  <span className="inline-block px-3 py-1 bg-blue-100/90 text-blue-800 text-xs font-bold uppercase tracking-wider rounded-md">
                    For Customers
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                    Find the Best Tailors Near You
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Discover trusted tailor shops, view their work portfolios, and book your custom garments easily.
                  </p>

                  <ul className="space-y-2.5 pt-2">
                    {[
                      'Search tailor shops in your city',
                      'View ratings and reviews',
                      'Browse portfolios and specialties',
                      'Book measurement appointments',
                      'Track your order status live',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                        <div className="w-4.5 h-4.5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4">
                    <Link
                      to="/marketplace"
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all"
                    >
                      <span>Find Tailors Near You</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Customer Woman Photo */}
                <div className="sm:col-span-5 flex justify-center">
                  <div className="relative w-48 sm:w-56 h-64 sm:h-72 rounded-2xl overflow-hidden shadow-md border-2 border-white">
                    <img
                      src={customerWomanImg}
                      alt="Customer ordering custom tailoring"
                      className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-40" />
                  </div>
                </div>
              </div>
            </ThreeDCard>
          </div>
        </div>
      </section>

      {/* ── 5. MARKETPLACE SHOWCASE SECTION ────────────────────────── */}
      <section className="py-20 bg-slate-50/80 border-y border-slate-100 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info */}
            <div className="lg:col-span-4 space-y-4 text-center lg:text-left">
              <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider rounded-md">
                Marketplace
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                Find Trusted Tailors in Your City
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Explore verified tailor shops, compare authentic ratings, view designer portfolios, and connect directly
                with master craftsmen for your bespoke needs.
              </p>
              <div className="pt-2">
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-orange-500/25 transition-all"
                >
                  <span>Explore Marketplace</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Carousel navigation controls */}
              <div className="hidden lg:flex items-center gap-2 pt-4">
                <button
                  aria-label="Previous shops"
                  className="p-2.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  aria-label="Next shops"
                  className="p-2.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: 3 Tailor Shop Cards */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Shop Card 1: Shree Ganesh Tailors */}
              <ThreeDCard
                maxTilt={6}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={shopGaneshImg}
                      alt="Shree Ganesh Tailors"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      onClick={() => toggleFavorite('shree-ganesh')}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-colors"
                      aria-label="Favorite Shree Ganesh Tailors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites['shree-ganesh'] ? 'fill-red-500 text-red-500' : 'text-slate-500'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="text-base font-bold text-slate-900">Shree Ganesh Tailors</h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        4.8
                      </span>
                      <span className="text-slate-400">(125 reviews)</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Vesu, Surat • 2.5 km</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        Suits
                      </span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        Shirts
                      </span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        Kurti
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <Link
                    to="/marketplace"
                    className="w-full py-2 block text-center bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    View Shop
                  </Link>
                </div>
              </ThreeDCard>

              {/* Shop Card 2: Royal Stitch */}
              <ThreeDCard
                maxTilt={6}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={shopRoyalImg}
                      alt="Royal Stitch Atelier"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      onClick={() => toggleFavorite('royal-stitch')}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-colors"
                      aria-label="Favorite Royal Stitch"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites['royal-stitch'] ? 'fill-red-500 text-red-500' : 'text-slate-500'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="text-base font-bold text-slate-900">Royal Stitch</h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        4.6
                      </span>
                      <span className="text-slate-400">(98 reviews)</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Adajan, Surat • 3.1 km</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        Men's Wear
                      </span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        Blazers
                      </span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        Alterations
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <Link
                    to="/marketplace"
                    className="w-full py-2 block text-center bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    View Shop
                  </Link>
                </div>
              </ThreeDCard>

              {/* Shop Card 3: Modern Fit Tailors */}
              <ThreeDCard
                maxTilt={6}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={shopModernImg}
                      alt="Modern Fit Tailors"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      onClick={() => toggleFavorite('modern-fit')}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-colors"
                      aria-label="Favorite Modern Fit Tailors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites['modern-fit'] ? 'fill-red-500 text-red-500' : 'text-slate-500'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="text-base font-bold text-slate-900">Modern Fit Tailors</h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        4.9
                      </span>
                      <span className="text-slate-400">(170 reviews)</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">City Light, Surat • 4.2 km</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        Suits
                      </span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        Sherwani
                      </span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        Custom Design
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <Link
                    to="/marketplace"
                    className="w-full py-2 block text-center bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    View Shop
                  </Link>
                </div>
              </ThreeDCard>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. WHY CHOOSE DARZIDESK ─────────────────────────────────── */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider rounded-md">
              Why Choose DarziDesk
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Built for Tailors. Designed for Growth.
            </h2>
            <p className="text-slate-600 text-base">
              We understand the real everyday challenges of tailor shops and their valued customers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Benefit 1 */}
            <ThreeDCard className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md hover:shadow-lg transition-all text-center flex flex-col items-center">
              <div className="w-13 h-13 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Simple & Easy to Use</h3>
              <p className="text-xs text-slate-500">No technical knowledge required to get started.</p>
            </ThreeDCard>

            {/* Benefit 2 */}
            <ThreeDCard className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md hover:shadow-lg transition-all text-center flex flex-col items-center">
              <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Save Time</h3>
              <p className="text-xs text-slate-500">Automate daily tasks, measurements, and notifications.</p>
            </ThreeDCard>

            {/* Benefit 3 */}
            <ThreeDCard className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md hover:shadow-lg transition-all text-center flex flex-col items-center">
              <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Grow Your Business</h3>
              <p className="text-xs text-slate-500">Get discovered by more customers through the marketplace.</p>
            </ThreeDCard>

            {/* Benefit 4 */}
            <ThreeDCard className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md hover:shadow-lg transition-all text-center flex flex-col items-center">
              <div className="w-13 h-13 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Secure & Reliable</h3>
              <p className="text-xs text-slate-500">Your customer data and records are always safely isolated.</p>
            </ThreeDCard>

            {/* Benefit 5 */}
            <ThreeDCard className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md hover:shadow-lg transition-all text-center flex flex-col items-center sm:col-span-2 lg:col-span-1">
              <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Affordable Plans</h3>
              <p className="text-xs text-slate-500">Transparent pricing tailored for every workshop size.</p>
            </ThreeDCard>
          </div>
        </div>
      </section>

      {/* ── 7. SOCIAL PROOF / METRICS BANNER (Deep Navy) ────────────── */}
      <section className="py-14 bg-[#0B132B] text-white relative z-10 overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {/* Stat 1 */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">500+</div>
                <div className="text-xs text-slate-300 font-medium">Tailor Shops</div>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">50,000+</div>
                <div className="text-xs text-slate-300 font-medium">Happy Customers</div>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">1L+</div>
                <div className="text-xs text-slate-300 font-medium">Orders Managed</div>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 fill-amber-400" />
              </div>
              <div className="text-left">
                <div className="text-2xl sm:text-3xl font-extrabold text-white">4.8/5</div>
                <div className="text-xs text-slate-300 font-medium">Average Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. TESTIMONIALS SECTION ─────────────────────────────────── */}
      <section className="py-24 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider rounded-md">
              What Our Users Say
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Trusted by Tailors Across India
            </h2>
            <p className="text-slate-600 text-base">Real experiences from craftsmen and customers who rely on DarziDesk.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Testimonial 1 */}
            <ThreeDCard className="bg-white rounded-2xl p-7 border border-slate-100 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={avatarRameshImg}
                    alt="Ramesh Patel"
                    className="w-12 h-12 rounded-full object-cover border-2 border-orange-200"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Ramesh Patel</h4>
                    <p className="text-xs text-slate-500">Shree Ganesh Tailors, Surat</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 italic leading-relaxed">
                  "DarziDesk has made my shop completely digital. I can now track all my orders and customer measurements
                  easily without flipping through old paper registers."
                </p>
              </div>

              <div className="pt-4 flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
            </ThreeDCard>

            {/* Testimonial 2 */}
            <ThreeDCard className="bg-white rounded-2xl p-7 border border-slate-100 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={avatarPriyaImg}
                    alt="Priya Shah"
                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Priya Shah</h4>
                    <p className="text-xs text-slate-500">Verified Customer</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 italic leading-relaxed">
                  "The marketplace helped me find a great tailor near my home. The process was smooth and simple, and getting
                  SMS updates for trial and delivery was fantastic."
                </p>
              </div>

              <div className="pt-4 flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
            </ThreeDCard>

            {/* Testimonial 3 */}
            <ThreeDCard className="bg-white rounded-2xl p-7 border border-slate-100 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={avatarKaranImg}
                    alt="Karan Mehta"
                    className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Karan Mehta</h4>
                    <p className="text-xs text-slate-500">Modern Fit Tailors, Ahmedabad</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 italic leading-relaxed">
                  "Inventory and billing features are excellent. It saves me a lot of time and helps me run my business
                  better. The fabric low-stock alerts alone paid for the software."
                </p>
              </div>

              <div className="pt-4 flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
            </ThreeDCard>
          </div>
        </div>
      </section>

      {/* ── 9. SUBSCRIPTION PLANS SECTION (API Integrated) ─────────── */}
      <section id="pricing" className="py-20 bg-slate-50 border-t border-slate-100 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto space-y-3 mb-12">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider rounded-md">
              Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Simple Plans for Every Shop Size
            </h2>
            <p className="text-slate-600 text-base">No hidden charges. Scale seamlessly as your tailoring orders grow.</p>

            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <span className={`text-sm font-bold ${!isYearly ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className="w-12 h-6 bg-slate-300 rounded-full p-1 transition-colors relative"
                aria-label="Toggle billing interval"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isYearly ? 'translate-x-6 bg-orange-500' : 'translate-x-0'
                  }`}
                />
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-bold ${isYearly ? 'text-slate-900' : 'text-slate-400'}`}>Yearly</span>
                <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
            {plans.map((plan) => {
              const price = isYearly ? plan.priceYearly : plan.priceMonthly;
              return (
                <ThreeDCard
                  key={plan.id}
                  className={`bg-white rounded-3xl p-8 border transition-all flex flex-col justify-between ${
                    plan.isDefault
                      ? 'border-2 border-orange-500 shadow-xl relative'
                      : 'border-slate-200/80 shadow-md hover:shadow-lg'
                  }`}
                >
                  {plan.isDefault && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">
                          ₹{Number(price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-500">/{isYearly ? 'year' : 'month'}</span>
                      </div>
                    </div>

                    <div className="py-2 border-y border-slate-100 text-xs font-semibold text-slate-600 space-y-1">
                      <div>Up to {plan.maxStaffAccounts} staff accounts</div>
                      <div>Up to {plan.maxOrdersPerMonth} orders / month</div>
                    </div>

                    <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 font-medium">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <Link
                      to={`/login?mode=register&plan=${encodeURIComponent(plan.name)}`}
                      className={`w-full py-3 block text-center rounded-xl font-bold text-sm transition-all ${
                        plan.isDefault
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {plan.isDefault ? 'Start Free 14-Day Trial' : 'Select Plan'}
                    </Link>
                  </div>
                </ThreeDCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 10. BOTTOM CTA BANNER ───────────────────────────────────── */}
      <section id="about" className="py-20 relative overflow-hidden z-10 bg-gradient-to-b from-orange-50/50 via-amber-50/70 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Ready to Take Your Tailor Business Online?
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Join hundreds of tailor shops already digitizing their craft and growing with DarziDesk.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/login?mode=register"
              className="px-8 py-3.5 text-base font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-full shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>Get Started for Free</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </Link>
            <a
              href="mailto:contact@darzidesk.com"
              className="px-7 py-3.5 text-base font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-full shadow-sm transition-all"
            >
              Talk to Our Team
            </a>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-8 text-xs sm:text-sm font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span>Setup in minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span>Full support</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-100 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* Brand column */}
            <div className="md:col-span-2 space-y-4">
              <Link to="/" className="inline-block">
                <img src={logoForLight} alt="DarziDesk" className="h-10 w-auto object-contain" />
              </Link>
              <p className="text-xs text-slate-500 max-w-sm">Tailor Shop Management & Marketplace</p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Empowering master tailors across India with intelligent digital books, fabric stock tracking, and public
                storefront discovery.
              </p>
            </div>

            {/* Product */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Product</h4>
              <ul className="space-y-2 text-xs text-slate-600 font-medium">
                <li>
                  <a href="#features" className="hover:text-orange-600">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-orange-600">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#for-owners" className="hover:text-orange-600">
                    For Shop Owners
                  </a>
                </li>
                <li>
                  <a href="#for-customers" className="hover:text-orange-600">
                    For Customers
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Company</h4>
              <ul className="space-y-2 text-xs text-slate-600 font-medium">
                <li>
                  <a href="#about" className="hover:text-orange-600">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@darzidesk.com" className="hover:text-orange-600">
                    Contact Us
                  </a>
                </li>
                <li>
                  <span className="text-slate-400">Careers (Hiring!)</span>
                </li>
                <li>
                  <span className="text-slate-400">Blog</span>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Support</h4>
              <ul className="space-y-2 text-xs text-slate-600 font-medium">
                <li>
                  <span className="text-slate-400">Help Center</span>
                </li>
                <li>
                  <span className="text-slate-400">Privacy Policy</span>
                </li>
                <li>
                  <span className="text-slate-400">Terms of Service</span>
                </li>
                <li>
                  <span className="text-slate-400">Refund Policy</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
            <div>© 2025 DarziDesk. All rights reserved.</div>
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <span className="text-red-500">❤️</span>
              <span>in India</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── 12. INTERACTIVE 3D DEMO MODAL ──────────────────────────── */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <img src={logoForLight} alt="DarziDesk" className="h-7 w-auto object-contain" />
              <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full">
                Interactive 3D Product Tour
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">Experience the DarziDesk Suite</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Explore how DarziDesk unites order intake, multi-version measurement records, fabric ledgering, and public
              marketplace customer discovery.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Step 1: Digital Measurement Book</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Input neck, chest, waist, sleeve, and inseam measurements per customer. Automatically versions with
                    audit timestamps.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Step 2: Fabric Inventory & Stock Reservation</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Reserve fabric meters in real-time with row-level PostgreSQL locking to prevent overbooking on
                    high-demand textiles.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Step 3: Marketplace Client Discovery</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Get listed on the public city marketplace so nearby customers can find your atelier, review ratings,
                    and book orders online.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDemoModal(false)}
                className="px-5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Close
              </button>
              <Link
                to="/login"
                className="px-6 py-2.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-md transition-all"
              >
                Sign In to Test Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
