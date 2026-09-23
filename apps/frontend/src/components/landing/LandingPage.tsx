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
  X,
  Navigation,
  Globe,
  RefreshCw,
  Sparkles,
  Store,
} from 'lucide-react';
import type { PublicShop } from '../../types/dashboard';
import { ThreeCanvas } from './ThreeCanvas';
import { ThreeDCard } from './ThreeDCard';
import { Hero3DDashboard } from './Hero3DDashboard';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

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
    maxOrdersPerMonth: 20,
    features: [
      'Up to 2 Staff Accounts',
      '20 Orders / month',
      'Digital Measurement Book',
      'Fabric Inventory Ledger',
      'Standard PDF Invoices',
      'Customer SMS Notifications',
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
      'Automated SMS & WhatsApp Alerts',
      'GST Compliant PDF Invoicing',
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
      'Multi-Branch Inventory Sync',
      'Priority Marketplace Placement',
      'Dedicated Account Manager',
      'Custom Domain & Branding',
      '24/7 Priority Support',
    ],
    isDefault: false,
  },
];

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

const DEFAULT_FALLBACK_SHOPS: PublicShop[] = [
  {
    id: 'shree-ganesh',
    name: 'Shree Ganesh Bespoke Tailors',
    slug: 'demo',
    city: 'Surat',
    latitude: 21.1702,
    longitude: 72.8311,
    specialtyTags: ['Bespoke Suits', 'Wedding Sherwanis', 'Handloom Kurtas', 'Formal Shirts'],
    coverPhotoUrl: shopGaneshImg,
    portfolioPhotoUrls: [],
    workingHours: null,
    avgRating: 4.9,
    reviewCount: 125,
  },
  {
    id: 'royal-stitch',
    name: 'Royal Stitch Atelier',
    slug: 'royal-stitch-surat',
    city: 'Surat',
    latitude: 21.1959,
    longitude: 72.7933,
    specialtyTags: ["Men's Wear", 'Blazers', 'Alterations', 'Tuxedos'],
    coverPhotoUrl: shopRoyalImg,
    portfolioPhotoUrls: [],
    workingHours: null,
    avgRating: 4.8,
    reviewCount: 98,
  },
  {
    id: 'modern-fit',
    name: 'Modern Fit Tailors',
    slug: 'modern-fit-surat',
    city: 'Surat',
    latitude: 21.161,
    longitude: 72.771,
    specialtyTags: ['Suits', 'Sherwani', 'Custom Design', 'Safari Suits'],
    coverPhotoUrl: shopModernImg,
    portfolioPhotoUrls: [],
    workingHours: null,
    avgRating: 4.7,
    reviewCount: 170,
  },
  {
    id: 'imperial-bespoke',
    name: 'Imperial Bespoke Atelier',
    slug: 'imperial-bespoke-mumbai',
    city: 'Mumbai',
    latitude: 18.922,
    longitude: 72.834,
    specialtyTags: ['Italian Wool Suits', 'Tuxedos', 'Silk Bandhgalas'],
    coverPhotoUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=80',
    portfolioPhotoUrls: [],
    workingHours: null,
    avgRating: 5.0,
    reviewCount: 42,
  },
];

export const LandingPage: React.FC = () => {
  const [plans, setPlans] = useState<PublicPlan[]>(DEFAULT_PLANS);
  const [isYearly, setIsYearly] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    'shree-ganesh': true,
    'royal-stitch': false,
    'modern-fit': false,
  });

  // Nearest Tailors Marketplace Showcase State
  const [nearestShops, setNearestShops] = useState<PublicShop[]>([]);
  const [loadingShops, setLoadingShops] = useState<boolean>(true);
  const [locationSource, setLocationSource] = useState<'detecting' | 'gps' | 'ip'>('detecting');
  const [userLocation, setUserLocation] = useState<{
    city: string;
    latitude: number;
    longitude: number;
    isFallback?: boolean;
  } | null>(null);
  const [carouselPage, setCarouselPage] = useState<number>(0);
  const [requestingGps, setRequestingGps] = useState<boolean>(false);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('All');

  // Load shops from backend using coordinates, with distance calculation & fallback
  const loadShopsForCoordinates = async (lat: number, lng: number, _cityHint?: string) => {
    setLoadingShops(true);
    try {
      const res = await fetch(`/api/marketplace/shops?lat=${lat}&lng=${lng}&limit=12`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const shopList: PublicShop[] = Array.isArray(json?.data) ? json.data : [];
      if (shopList.length > 0) {
        setNearestShops(shopList);
      } else {
        // Compute distance from fallback shops
        const computed = DEFAULT_FALLBACK_SHOPS.map((s) => ({
          ...s,
          distanceKm:
            s.latitude !== null && s.longitude !== null
              ? calculateDistanceKm(lat, lng, s.latitude, s.longitude)
              : null,
        })).sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
        setNearestShops(computed);
      }
    } catch (_err) {
      // Offline / API error fallback with distance calculation
      const computed = DEFAULT_FALLBACK_SHOPS.map((s) => ({
        ...s,
        distanceKm:
          s.latitude !== null && s.longitude !== null
            ? calculateDistanceKm(lat, lng, s.latitude, s.longitude)
            : null,
      })).sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
      setNearestShops(computed);
    } finally {
      setLoadingShops(false);
    }
  };

  // Fallback to IP address location detection
  const detectLocationByIp = async () => {
    setLocationSource('detecting');
    try {
      const res = await fetch('/api/marketplace/detect-location');
      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          setUserLocation({
            city: data.city || 'Surat',
            latitude: data.latitude,
            longitude: data.longitude,
            isFallback: data.isFallback,
          });
          setLocationSource('ip');
          await loadShopsForCoordinates(data.latitude, data.longitude, data.city);
          return;
        }
      }

      // Direct client fallback to ipwho.is if backend /detect-location was unreachable
      const ipRes = await fetch('https://ipwho.is/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData && ipData.success !== false && ipData.latitude && ipData.longitude) {
          setUserLocation({
            city: ipData.city || 'Surat',
            latitude: Number(ipData.latitude),
            longitude: Number(ipData.longitude),
          });
          setLocationSource('ip');
          await loadShopsForCoordinates(Number(ipData.latitude), Number(ipData.longitude), ipData.city);
          return;
        }
      }
    } catch (_e) {
      // Silent error fallback
    }

    // Default to Surat if all detection fails
    const defaultCoords = { city: 'Surat', latitude: 21.1702, longitude: 72.8311, isFallback: true };
    setUserLocation(defaultCoords);
    setLocationSource('ip');
    await loadShopsForCoordinates(defaultCoords.latitude, defaultCoords.longitude, defaultCoords.city);
  };

  // Explicit user trigger to re-request GPS location
  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      detectLocationByIp();
      return;
    }
    setRequestingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRequestingGps(false);
        const coords = {
          city: 'Your GPS Location',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setUserLocation(coords);
        setLocationSource('gps');
        setCarouselPage(0);
        loadShopsForCoordinates(coords.latitude, coords.longitude);
      },
      (_err) => {
        setRequestingGps(false);
        // User denied or failed -> Fall back to IP detection
        detectLocationByIp();
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Initial detection: Attempt GPS first, fall back seamlessly to IP detection
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            city: 'Your GPS Location',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserLocation(coords);
          setLocationSource('gps');
          loadShopsForCoordinates(coords.latitude, coords.longitude);
        },
        (_err) => {
          // User denied permission or error -> Fall back to IP address detection!
          detectLocationByIp();
        },
        { timeout: 5000 }
      );
    } else {
      detectLocationByIp();
    }
  }, []);

  // Filter shops by selected city if applicable
  const displayedCityShops = selectedCityFilter === 'All'
    ? nearestShops
    : nearestShops.filter((s) => s.city?.toLowerCase() === selectedCityFilter.toLowerCase());

  const currentShops = displayedCityShops.length > 0 ? displayedCityShops : nearestShops;
  const pageSize = 3;
  const totalPages = Math.max(1, Math.ceil(currentShops.length / pageSize));
  const visibleShops = currentShops.slice(carouselPage * pageSize, (carouselPage + 1) * pageSize);

  const handlePrevPage = () => {
    setCarouselPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const handleNextPage = () => {
    setCarouselPage((prev) => (prev + 1) % totalPages);
  };

  // Fetch plans from backend API
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
        console.warn('Could not fetch public plans, using default data', err);
      });
  }, []);

  const toggleFavorite = (shopId: string) => {
    setFavorites((prev) => ({ ...prev, [shopId]: !prev[shopId] }));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      {/* ── 1. NAVBAR ──────────────────────────────────────────────── */}
      <PublicNavbar />

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

                  <div className="pt-4 flex flex-wrap items-center gap-3">
                    <Link
                      to="/login?mode=register"
                      className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-md transition-all"
                    >
                      Start Free Trial
                    </Link>
                    <Link
                      to="/for-owners"
                      className="text-sm font-bold text-slate-700 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Explore Shop Owner Suite</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
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

                  <div className="pt-4 flex flex-wrap items-center gap-3">
                    <Link
                      to="/marketplace"
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all"
                    >
                      <span>Find Tailors</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/for-customers"
                      className="text-sm font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Customer Tracking & Guide</span>
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

          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-8">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider rounded-md">
                Marketplace
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                Nearest Tailors<br className="hidden sm:block" />{' '}
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  Just for You
                </span>
              </h3>
            </div>

            {/* Location Source Badge + GPS CTA */}
            <div className="flex flex-col gap-2 items-start sm:items-end shrink-0">
              {locationSource === 'detecting' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-500 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Detecting your location…</span>
                </div>
              )}
              {locationSource === 'gps' && userLocation && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700">
                  <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                  <span>GPS — Precise Location</span>
                </div>
              )}
              {locationSource === 'ip' && userLocation && (
                <div className="flex flex-col items-start sm:items-end gap-1.5">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-700">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      {userLocation.isFallback
                        ? 'Estimated — Surat, India'
                        : `Detected — ${userLocation.city}`}
                    </span>
                  </div>
                  <button
                    onClick={requestGpsLocation}
                    disabled={requestingGps}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors disabled:opacity-60"
                  >
                    {requestingGps ? (
                      <><RefreshCw className="w-3 h-3 animate-spin" /> Requesting GPS…</>
                    ) : (
                      <><Navigation className="w-3 h-3" /> Enable GPS for exact distance</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* City Filter Tabs */}
          {!loadingShops && nearestShops.length > 0 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {['All', ...Array.from(new Set(nearestShops.map((s) => s.city).filter(Boolean) as string[]))].map(
                (city) => (
                  <button
                    key={city}
                    onClick={() => { setSelectedCityFilter(city); setCarouselPage(0); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                      selectedCityFilter === city
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600'
                    }`}
                  >
                    {city === 'All' ? 'All Cities' : city}
                  </button>
                )
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Info Panel */}
            <div className="lg:col-span-4 space-y-5 text-center lg:text-left lg:sticky lg:top-24">
              <p className="text-sm text-slate-600 leading-relaxed">
                Explore verified tailor studios sorted nearest to you. Compare authentic ratings,
                view portfolios, and connect directly with master craftsmen.
              </p>

              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Explore Full Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Carousel navigation controls */}
              {!loadingShops && totalPages > 1 && (
                <div className="flex items-center gap-3 pt-2 justify-center lg:justify-start">
                  <button
                    onClick={handlePrevPage}
                    aria-label="Previous shops"
                    className="p-2.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition-colors shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1.5">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselPage(i)}
                        className={`rounded-full transition-all ${
                          i === carouselPage
                            ? 'w-5 h-2 bg-orange-500'
                            : 'w-2 h-2 bg-slate-300 hover:bg-orange-300'
                        }`}
                        aria-label={`Go to page ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleNextPage}
                    aria-label="Next shops"
                    className="p-2.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition-colors shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400 font-medium ml-1">
                    {carouselPage + 1} / {totalPages}
                  </span>
                </div>
              )}

              <Link
                to="/marketplace"
                className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
              >
                <Store className="w-3.5 h-3.5" />
                View all verified tailors →
              </Link>
            </div>

            {/* Right: Dynamic Shop Cards */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Shimmer loading skeleton */}
              {loadingShops &&
                [1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden animate-pulse"
                  >
                    <div className="h-44 bg-slate-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                      <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
                      <div className="flex gap-1 pt-1">
                        <div className="h-5 w-14 bg-slate-100 rounded-md" />
                        <div className="h-5 w-12 bg-slate-100 rounded-md" />
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="h-8 bg-slate-200 rounded-xl" />
                    </div>
                  </div>
                ))}

              {/* Real dynamic shop cards */}
              {!loadingShops &&
                visibleShops.map((shop) => (
                  <ThreeDCard
                    key={shop.id}
                    maxTilt={6}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={
                            shop.coverPhotoUrl && !shop.coverPhotoUrl.startsWith('data:')
                              ? shop.coverPhotoUrl
                              : shopGaneshImg
                          }
                          alt={shop.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = shopGaneshImg;
                          }}
                        />

                        {/* Distance badge */}
                        {shop.distanceKm !== null && shop.distanceKm !== undefined && (
                          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Navigation className="w-2.5 h-2.5" />
                            {shop.distanceKm < 1
                              ? `${Math.round(shop.distanceKm * 1000)}m`
                              : `${shop.distanceKm} km`}
                          </div>
                        )}

                        {/* Verified badge */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span>Verified</span>
                        </div>

                        <button
                          onClick={() => toggleFavorite(shop.id)}
                          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-colors"
                          aria-label={`Favorite ${shop.name}`}
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              favorites[shop.id] ? 'fill-red-500 text-red-500' : 'text-slate-500'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="p-4 space-y-2">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                          {shop.name}
                        </h4>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 font-bold text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            {shop.avgRating !== null && shop.avgRating !== undefined
                              ? shop.avgRating.toFixed(1)
                              : '—'}
                          </span>
                          {shop.reviewCount > 0 && (
                            <span className="text-slate-400">({shop.reviewCount} reviews)</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{shop.city}</span>
                        </div>

                        {shop.specialtyTags && shop.specialtyTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {shop.specialtyTags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <Link
                        to={`/marketplace/${shop.id}`}
                        className="w-full py-2 block text-center bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        View Shop
                      </Link>
                    </div>
                  </ThreeDCard>
                ))}

              {/* Empty state (no shops returned for city filter) */}
              {!loadingShops && visibleShops.length === 0 && (
                <div className="sm:col-span-3 flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Store className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm font-semibold">
                    No tailors found in {selectedCityFilter}.
                  </p>
                  <button
                    onClick={() => setSelectedCityFilter('All')}
                    className="text-orange-500 hover:text-orange-600 text-xs font-bold underline underline-offset-2"
                  >
                    Show all cities
                  </button>
                </div>
              )}
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

          {/* Deep-dive link to /features */}
          <div className="mt-12 text-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 hover:border-orange-500 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 hover:text-orange-600 shadow-sm transition-all"
            >
              <span>Explore All 9 Modules & Feature Comparison Matrix</span>
              <ArrowRight className="w-4 h-4 text-orange-500" />
            </Link>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto items-stretch">
            {plans.map((plan) => {
              const price = isYearly ? plan.priceYearly : plan.priceMonthly;
              const isPopular = plan.name.toLowerCase() === 'pro';
              const isEnterprise = plan.name.toLowerCase().includes('enterprise');

              return (
                <ThreeDCard
                  key={plan.id}
                  className={`bg-white rounded-3xl p-8 border transition-all flex flex-col justify-between ${
                    isPopular
                      ? 'border-2 border-orange-500 shadow-xl relative ring-4 ring-orange-500/10 scale-[1.02] md:-translate-y-1'
                      : 'border-slate-200/80 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-extrabold px-3.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <span>★</span>
                      <span>Most Popular</span>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">
                          ₹{Number(price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">/{isYearly ? 'year' : 'month'}</span>
                      </div>
                    </div>

                    <div className="py-2.5 border-y border-slate-100 text-xs font-semibold text-slate-600 space-y-1 bg-slate-50/50 -mx-4 px-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span>Staff Accounts:</span>
                        <span className="font-bold text-slate-900">Up to {plan.maxStaffAccounts}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Monthly Orders:</span>
                        <span className="font-bold text-slate-900">Up to {plan.maxOrdersPerMonth}</span>
                      </div>
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
                      id={`btn-plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                      to={`/login?mode=register&plan=${encodeURIComponent(plan.name)}`}
                      className={`w-full py-3 block text-center rounded-xl font-bold text-sm transition-all ${
                        isPopular
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md hover:shadow-orange-500/30'
                          : isEnterprise
                          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold'
                      }`}
                    >
                      {isPopular ? 'Start Free 14-Day Trial' : isEnterprise ? 'Contact Enterprise' : 'Get Started Free'}
                    </Link>
                  </div>
                </ThreeDCard>
              );
            })}
          </div>

          {/* Deep-dive link to /pricing */}
          <div className="mt-12 text-center">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white border border-slate-300 hover:border-orange-500 text-slate-800 hover:text-orange-600 font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all"
            >
              <span>View Full 30+ Feature Comparison Matrix & Plan Finder</span>
              <ArrowRight className="w-4 h-4 text-orange-500" />
            </Link>
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
            <Link
              to="/about"
              className="px-7 py-3.5 text-base font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-full shadow-sm transition-all flex items-center gap-2"
            >
              <span>Read Our Full Story</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
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
      <PublicFooter />

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
