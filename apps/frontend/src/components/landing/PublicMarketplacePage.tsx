import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { ThreeCanvas } from './ThreeCanvas';
import { ThreeDCard } from './ThreeDCard';

import shopGaneshImg from '../../assets/shop_shree_ganesh.jpg';
import shopRoyalImg from '../../assets/shop_royal_stitch.jpg';
import shopModernImg from '../../assets/shop_modern_fit.jpg';

import {
  Search,
  MapPin,
  Star,
  Store,
  SlidersHorizontal,
  ArrowRight,
  Compass,
  Navigation,
  Globe,
  RefreshCw,
  Heart,
  Sparkles,
  Scissors,
  ShieldCheck,
  Award,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { PublicShop } from '../../types/dashboard';

const COMMON_SPECIALTIES = [
  'All Specialties',
  'Bespoke Suits',
  'Wedding Sherwanis',
  'Handloom Kurtas',
  'Tuxedos',
  'Italian Wool',
  'Pure Silk',
  'Linen Shirts',
  'Alterations',
  'Blazers',
  'Safari Suits',
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
    specialtyTags: ['Italian Wool Suits', 'Tuxedos', 'Silk Bandhgalas', 'Bespoke Suits'],
    coverPhotoUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=80',
    portfolioPhotoUrls: [],
    workingHours: null,
    avgRating: 5.0,
    reviewCount: 42,
  },
  {
    id: 'bombay-cutters',
    name: 'Bombay Master Cutters',
    slug: 'bombay-master-cutters',
    city: 'Mumbai',
    latitude: 19.0178,
    longitude: 72.8478,
    specialtyTags: ['Linen Shirts', 'Alterations', 'Blazers', 'Italian Wool'],
    coverPhotoUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80',
    portfolioPhotoUrls: [],
    workingHours: null,
    avgRating: 4.9,
    reviewCount: 88,
  },
  {
    id: 'gujarat-handloom',
    name: 'Gujarat Handloom & Bandhej Studio',
    slug: 'gujarat-handloom-surat',
    city: 'Surat',
    latitude: 21.185,
    longitude: 72.825,
    specialtyTags: ['Handloom Kurtas', 'Pure Silk', 'Wedding Sherwanis'],
    coverPhotoUrl: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=1200&q=80',
    portfolioPhotoUrls: [],
    workingHours: null,
    avgRating: 4.8,
    reviewCount: 64,
  },
];

interface PublicMarketplacePageProps {
  onSelectShop?: (shop: PublicShop) => void;
}

export const PublicMarketplacePage: React.FC<PublicMarketplacePageProps> = ({ onSelectShop }) => {
  const navigate = useNavigate();

  // Shop data state
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All Specialties');

  // Location State
  const [locationSource, setLocationSource] = useState<'detecting' | 'gps' | 'ip'>('detecting');
  const [userLocation, setUserLocation] = useState<{
    city: string;
    latitude: number;
    longitude: number;
    isFallback?: boolean;
  } | null>(null);
  const [requestingGps, setRequestingGps] = useState<boolean>(false);

  // Favorites state with local storage
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('darzi_marketplace_favorites');
      return stored ? JSON.parse(stored) : { 'shree-ganesh': true };
    } catch {
      return { 'shree-ganesh': true };
    }
  });

  const toggleFavorite = (shopId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites((prev) => {
      const next = { ...prev, [shopId]: !prev[shopId] };
      try {
        localStorage.setItem('darzi_marketplace_favorites', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Fetch shops with coordinates & filters
  const fetchShops = useCallback(
    async (coords?: { lat: number; lng: number } | null) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (coords) {
          params.append('lat', coords.lat.toString());
          params.append('lng', coords.lng.toString());
        }
        if (selectedCity !== 'All') {
          params.append('city', selectedCity);
        }
        if (selectedSpecialty !== 'All Specialties') {
          params.append('specialty', selectedSpecialty);
        }
        params.append('limit', '50');

        const res = await fetch(`/api/marketplace/shops?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list: PublicShop[] = Array.isArray(json?.data) ? json.data : [];

        if (list.length > 0) {
          setShops(list);
        } else {
          // Compute distance for fallback mock data
          const userLat = coords?.lat ?? 21.1702;
          const userLng = coords?.lng ?? 72.8311;
          const computed = DEFAULT_FALLBACK_SHOPS.map((s) => ({
            ...s,
            distanceKm:
              s.latitude !== null && s.longitude !== null
                ? calculateDistanceKm(userLat, userLng, s.latitude, s.longitude)
                : null,
          })).sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
          setShops(computed);
        }
      } catch (_err) {
        // Fallback with computed distance
        const userLat = coords?.lat ?? 21.1702;
        const userLng = coords?.lng ?? 72.8311;
        const computed = DEFAULT_FALLBACK_SHOPS.map((s) => ({
          ...s,
          distanceKm:
            s.latitude !== null && s.longitude !== null
              ? calculateDistanceKm(userLat, userLng, s.latitude, s.longitude)
              : null,
        })).sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
        setShops(computed);
      } finally {
        setLoading(false);
      }
    },
    [selectedCity, selectedSpecialty]
  );

  // IP fallback detection
  const detectLocationByIp = useCallback(async () => {
    setLocationSource('detecting');
    try {
      const res = await fetch('/api/marketplace/detect-location');
      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const loc = {
            city: data.city || 'Surat',
            latitude: data.latitude,
            longitude: data.longitude,
            isFallback: data.isFallback,
          };
          setUserLocation(loc);
          setLocationSource('ip');
          await fetchShops({ lat: loc.latitude, lng: loc.longitude });
          return;
        }
      }

      // Direct client fallback to ipwho.is
      const ipRes = await fetch('https://ipwho.is/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData && ipData.success !== false && ipData.latitude && ipData.longitude) {
          const loc = {
            city: ipData.city || 'Surat',
            latitude: Number(ipData.latitude),
            longitude: Number(ipData.longitude),
          };
          setUserLocation(loc);
          setLocationSource('ip');
          await fetchShops({ lat: loc.latitude, lng: loc.longitude });
          return;
        }
      }
    } catch {
      // ignore
    }

    // Default Surat
    const defaultCoords = { city: 'Surat', latitude: 21.1702, longitude: 72.8311, isFallback: true };
    setUserLocation(defaultCoords);
    setLocationSource('ip');
    await fetchShops({ lat: defaultCoords.latitude, lng: defaultCoords.longitude });
  }, [fetchShops]);

  // Request GPS
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
        fetchShops({ lat: coords.latitude, lng: coords.longitude });
      },
      () => {
        setRequestingGps(false);
        detectLocationByIp();
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Initial detection: GPS first, fall back to IP
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
          fetchShops({ lat: coords.latitude, lng: coords.longitude });
        },
        () => {
          detectLocationByIp();
        },
        { timeout: 5000 }
      );
    } else {
      detectLocationByIp();
    }
  }, []); // Run on mount

  // When city or specialty filter changes, re-fetch with active coordinates
  useEffect(() => {
    if (userLocation) {
      fetchShops({ lat: userLocation.latitude, lng: userLocation.longitude });
    }
  }, [selectedCity, selectedSpecialty]);

  // Client-side text search filtering
  const filteredShops = shops.filter((shop) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = shop.name.toLowerCase().includes(q);
    const cityMatch = shop.city ? shop.city.toLowerCase().includes(q) : false;
    const tagMatch = shop.specialtyTags ? shop.specialtyTags.some((t) => t.toLowerCase().includes(q)) : false;
    return nameMatch || cityMatch || tagMatch;
  });

  // Extract available unique cities
  const availableCities = ['All', ...Array.from(new Set(shops.map((s) => s.city).filter(Boolean) as string[]))];

  const handleCardClick = (shop: PublicShop) => {
    if (onSelectShop) {
      onSelectShop(shop);
    } else {
      navigate(`/marketplace/${shop.id}`);
    }
  };

  const getCardImage = (shop: PublicShop) => {
    if (shop.coverPhotoUrl && !shop.coverPhotoUrl.startsWith('data:')) {
      return shop.coverPhotoUrl;
    }
    if (shop.id === 'royal-stitch') return shopRoyalImg;
    if (shop.id === 'modern-fit') return shopModernImg;
    return shopGaneshImg;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden flex flex-col justify-between">
      {/* ── 1. NAVBAR ────────────────────────────────────────────── */}
      <PublicNavbar />

      <main className="flex-1">
        {/* ── 2. HERO SECTION ──────────────────────────────────────── */}
        <section className="relative pt-28 pb-12 lg:pt-36 lg:pb-16 overflow-hidden bg-gradient-to-b from-orange-50/40 via-white to-white border-b border-slate-100">
          {/* Subtle 3D Ambient Background */}
          <ThreeCanvas className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-60" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-5">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-bold tracking-wide shadow-xs">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                <Compass className="w-3.5 h-3.5 text-orange-600" />
                <span>Verified Artisan Directory</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-black tracking-tight text-slate-900 leading-[1.12]">
                Discover Nearest Bespoke Tailors <br />
                <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                  & Master Ateliers
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Connect directly with verified tailoring studios sorted closest to you. Review genuine ratings,
                explore portfolio craftwork, and commission bespoke garments.
              </p>

              {/* Location Badge + GPS CTA */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {locationSource === 'detecting' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-semibold text-slate-500 animate-pulse border border-slate-200">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    <span>Detecting your location…</span>
                  </div>
                )}
                {locationSource === 'gps' && userLocation && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700 shadow-xs">
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    <span>GPS Active — Showing Studios Nearest You</span>
                  </div>
                )}
                {locationSource === 'ip' && userLocation && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-700 shadow-xs">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {userLocation.isFallback
                          ? 'Estimated — Surat, India'
                          : `Detected Location — ${userLocation.city}`}
                      </span>
                    </div>
                    <button
                      onClick={requestGpsLocation}
                      disabled={requestingGps}
                      className="px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
                    >
                      {requestingGps ? (
                        <><RefreshCw className="w-3 h-3 animate-spin" /> Fetching GPS…</>
                      ) : (
                        <><Navigation className="w-3 h-3 text-orange-600" /> Use Exact GPS</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. SEARCH & FILTERS CONTROLS ─────────────────────────── */}
        <section className="py-8 bg-slate-50/80 border-b border-slate-200/80 sticky top-16 z-30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by atelier name, craft specialty, or city..."
                  className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick City Filters */}
              {availableCities.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  {availableCities.map((city) => (
                    <button
                      key={city}
                      onClick={() => setSelectedCity(city)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer inline-flex items-center gap-1.5 ${
                        selectedCity === city
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:text-orange-600'
                      }`}
                    >
                      {city === 'All' ? (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span>All Cities</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{city}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Specialty Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-slate-500 shrink-0 font-bold flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                <span>Specialty:</span>
              </span>
              {COMMON_SPECIALTIES.map((spec) => {
                const isSelected = selectedSpecialty === spec;
                return (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpecialty(spec)}
                    className={`px-3.5 py-1.5 rounded-full shrink-0 font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600'
                    }`}
                  >
                    {spec}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 4. ATELIERS DIRECTORY GRID ────────────────────────────── */}
        <section className="py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header info */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {selectedCity !== 'All' ? `Tailor Ateliers in ${selectedCity}` : 'All Verified Ateliers'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Showing {filteredShops.length} verified bespoke studios sorted by proximity
                </p>
              </div>

              {(searchQuery || selectedCity !== 'All' || selectedSpecialty !== 'All Specialties') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCity('All');
                    setSelectedSpecialty('All Specialties');
                  }}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 underline underline-offset-2 cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>

            {/* Loading Shimmer Skeletons */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-pulse"
                  >
                    <div className="h-48 bg-slate-200" />
                    <div className="p-5 space-y-3">
                      <div className="h-5 bg-slate-200 rounded-lg w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                      <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
                      <div className="flex gap-1.5 pt-2">
                        <div className="h-6 w-16 bg-slate-100 rounded-md" />
                        <div className="h-6 w-14 bg-slate-100 rounded-md" />
                      </div>
                    </div>
                    <div className="p-5 pt-0">
                      <div className="h-10 bg-slate-200 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-16 text-center space-y-4 max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                  <Store className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No ateliers match your search</h3>
                <p className="text-sm text-slate-600">
                  We couldn't find any tailor shops matching your current filters. Try searching for another city, clearing
                  your specialty filter, or using broader search terms.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCity('All');
                      setSelectedSpecialty('All Specialties');
                    }}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredShops.map((shop) => (
                  <ThreeDCard
                    key={shop.id}
                    maxTilt={6}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between group cursor-pointer"
                  >
                    <div onClick={() => handleCardClick(shop)}>
                      {/* Cover Photo */}
                      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                        <img
                          src={getCardImage(shop)}
                          alt={shop.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = shopGaneshImg;
                          }}
                        />

                        {/* Verified badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified Atelier</span>
                        </div>

                        {/* Distance badge */}
                        {shop.distanceKm !== null && shop.distanceKm !== undefined && (
                          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                            <Navigation className="w-3 h-3 text-orange-400" />
                            <span>
                              {shop.distanceKm < 1
                                ? `${Math.round(shop.distanceKm * 1000)}m away`
                                : `${shop.distanceKm} km away`}
                            </span>
                          </div>
                        )}

                        {/* Favorite button */}
                        <button
                          onClick={(e) => toggleFavorite(shop.id, e)}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-colors cursor-pointer"
                          aria-label={`Favorite ${shop.name}`}
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              favorites[shop.id] ? 'fill-red-500 text-red-500' : 'text-slate-500'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Studio Details */}
                      <div className="p-5 space-y-2.5">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                          {shop.name}
                        </h3>

                        {/* Rating & City */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 font-bold text-amber-500">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {shop.avgRating !== null && shop.avgRating !== undefined
                                ? shop.avgRating.toFixed(1)
                                : 'New'}
                            </span>
                            {shop.reviewCount > 0 && (
                              <span className="text-slate-400">({shop.reviewCount} reviews)</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium truncate">{shop.city || 'India'}</span>
                          </div>
                        </div>

                        {/* Specialty tags */}
                        {shop.specialtyTags && shop.specialtyTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {shop.specialtyTags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md"
                              >
                                {tag}
                              </span>
                            ))}
                            {shop.specialtyTags.length > 3 && (
                              <span className="text-[10px] font-medium text-slate-400 py-1">
                                +{shop.specialtyTags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-5 pt-0 grid grid-cols-2 gap-2">
                      <Link
                        to={`/marketplace/${shop.id}`}
                        className="py-2.5 px-3 text-center bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        <span>View Atelier</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      <Link
                        to={`/login?mode=register&shopId=${shop.id}`}
                        className="py-2.5 px-3 text-center bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <Scissors className="w-3 h-3" />
                        <span>Book Fit</span>
                      </Link>
                    </div>
                  </ThreeDCard>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 5. VALUE PILLARS SECTION ─────────────────────────────── */}
        <section className="py-20 bg-slate-50/80 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
              <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider rounded-md">
                Why DarziDesk Marketplace
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                The Heritage Bespoke Standard
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                We combine generations of sartorial artistry with modern digital precision.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Verified Master Ateliers</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every tailor studio on our marketplace passes a rigorous vetting audit for garment cutting precision,
                  fabric authenticity, and delivered finish.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Guaranteed Bespoke Fit</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your digital measurement records stay attached to your account. Enjoy free trial adjustments and
                  exact historical pattern replication across orders.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Direct Artisan Pricing</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Connect straight to the cutting table. No brand retail markups or department store overheads — pay
                  fair piece rates directly to master karigars.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. BOTTOM CALL TO ACTION ─────────────────────────────── */}
        <section className="py-20 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white relative z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Are You a Master Tailor? List Your Atelier
            </h2>
            <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
              Join DarziDesk Marketplace to showcase your craftsmanship, attract high-value bespoke clients, and manage
              measurements and billing in one seamless app.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                to="/login?mode=register"
                className="px-8 py-4 text-base font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-full shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span>List Your Tailor Studio Free</span>
                <ArrowRight className="w-5 h-5 text-orange-600" />
              </Link>
              <Link
                to="/for-owners"
                className="px-7 py-4 text-base font-bold text-white border-2 border-white/80 hover:bg-white/10 rounded-full transition-all"
              >
                Learn How It Works
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── 7. FOOTER ────────────────────────────────────────────── */}
      <PublicFooter />
    </div>
  );
};
