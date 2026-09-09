import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  MapPin,
  Star,
  Store,
  SlidersHorizontal,
  ArrowRight,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import type { PublicShop } from '../../types/dashboard';

interface MarketplaceDiscoveryViewProps {
  onSelectShop: (shop: PublicShop) => void;
  onStartOrder?: (tenantId: string) => void;
}

const COMMON_SPECIALTIES = [
  'All Specialties',
  'Bespoke Suits',
  'Wedding Sherwanis',
  'Handloom Kurtas',
  'Tuxedos',
  'Italian Wool',
  'Pure Silk',
  'Linen Shirts',
];

export const MarketplaceDiscoveryView: React.FC<MarketplaceDiscoveryViewProps> = ({
  onSelectShop,
  onStartOrder,
}) => {
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchCity, setSearchCity] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All Specialties');
  const [useLocation, setUseLocation] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchCity.trim()) {
        params.append('city', searchCity.trim());
      }
      if (selectedSpecialty !== 'All Specialties') {
        params.append('specialty', selectedSpecialty);
      }
      if (useLocation && userCoords) {
        params.append('lat', userCoords.lat.toString());
        params.append('lng', userCoords.lng.toString());
      }

      const res = await fetch(`/api/marketplace/shops?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load marketplace shops (${res.status})`);
      const json = await res.json();
      setShops(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error discovering tailor ateliers');
    } finally {
      setLoading(false);
    }
  }, [searchCity, selectedSpecialty, useLocation, userCoords]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const handleToggleLocation = () => {
    if (!useLocation) {
      // Default to Mumbai center or prompt geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setUseLocation(true);
          },
          () => {
            // Fallback to Mumbai coordinates for demo testing
            setUserCoords({ lat: 18.922, lng: 72.834 });
            setUseLocation(true);
          },
        );
      } else {
        setUserCoords({ lat: 18.922, lng: 72.834 });
        setUseLocation(true);
      }
    } else {
      setUseLocation(false);
      setUserCoords(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Hero Banner ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand via-brand-dark to-slate-900 text-white p-8 sm:p-12 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent-light text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-accent" />
            <span>Curated Artisan Network</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Discover Verified Bespoke Tailors & Master Ateliers
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Browse verified bespoke craft workshops, review real customer fits, and commission
            custom-tailored garments directly online.
          </p>
        </div>

        {/* Decorative background elements */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent pointer-events-none opacity-60" />
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* City / Location input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="Search by city (e.g. Mumbai, New Delhi, Bengaluru)..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Location Sort Button */}
          <button
            onClick={handleToggleLocation}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              useLocation
                ? 'bg-accent/15 border-accent text-accent-dark font-bold'
                : 'bg-background border-border text-text-secondary hover:text-text-primary hover:border-brand/40'
            }`}
          >
            <MapPin className={`w-4 h-4 ${useLocation ? 'text-accent' : 'text-text-muted'}`} />
            <span>{useLocation ? 'Near Me Active' : 'Sort by Distance'}</span>
          </button>
        </div>

        {/* Specialty Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <span className="text-text-muted shrink-0 font-medium flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Specialty:</span>
          </span>
          {COMMON_SPECIALTIES.map((spec) => {
            const isSelected = selectedSpecialty === spec;
            return (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-all ${
                  isSelected
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-background border border-border text-text-secondary hover:text-text-primary hover:border-brand/30'
                }`}
              >
                {spec}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Atelier Cards Grid ─────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5 h-72 animate-pulse space-y-4">
              <div className="w-full h-36 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-8 text-center text-rose-700 dark:text-rose-300">
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => fetchShops()}
            className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : shops.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text-primary">No ateliers found</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            No approved tailor workshops match your current city or specialty filter. Try clearing
            filters or searching another city.
          </p>
          <button
            onClick={() => {
              setSearchCity('');
              setSelectedSpecialty('All Specialties');
              setUseLocation(false);
            }}
            className="mt-2 text-xs font-bold text-brand hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => onSelectShop(shop)}
              className="bg-surface border border-border hover:border-brand/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer group"
            >
              {/* Cover Photo */}
              <div className="h-44 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                {shop.coverPhotoUrl ? (
                  <img
                    src={shop.coverPhotoUrl}
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/10 to-accent/10 text-brand">
                    <Store className="w-10 h-10 opacity-40" />
                  </div>
                )}

                {/* Rating Badge */}
                <div className="absolute top-3 right-3 bg-surface/90 backdrop-blur-sm border border-border/50 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                  <span className="text-xs font-bold text-text-primary font-mono">
                    {shop.avgRating ? shop.avgRating.toFixed(1) : 'New'}
                  </span>
                  {shop.reviewCount > 0 && (
                    <span className="text-[10px] text-text-muted font-normal">
                      ({shop.reviewCount})
                    </span>
                  )}
                </div>

                {/* City / Distance Badge */}
                {shop.city && (
                  <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>{shop.city}</span>
                    {shop.distanceKm !== undefined && shop.distanceKm !== null && (
                      <span className="text-slate-300 font-mono text-[10px]">
                        • {shop.distanceKm} km
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                      Verified Atelier
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-text-primary group-hover:text-brand transition-colors line-clamp-1">
                    {shop.name}
                  </h3>

                  {/* Specialty Tags */}
                  {shop.specialtyTags && shop.specialtyTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {shop.specialtyTags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-background border border-border text-[11px] text-text-secondary font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                      {shop.specialtyTags.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-text-muted font-medium">
                          +{shop.specialtyTags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-bold text-brand flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>View Storefront</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>

                  {onStartOrder && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartOrder(shop.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand text-brand hover:text-white text-xs font-semibold transition-colors"
                    >
                      Bespoke Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
