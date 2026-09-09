import React, { useState, useEffect } from 'react';
import {
  Store,
  MapPin,
  Star,
  Clock,
  ArrowLeft,
  Scissors,
  CheckCircle2,
  Flag,
  AlertCircle,
  X,
} from 'lucide-react';
import type { PublicShop } from '../../types/dashboard';

interface PublicShopStorefrontViewProps {
  shopId: string;
  onBack: () => void;
  onStartOrder: (tenantId: string) => void;
}

export const PublicShopStorefrontView: React.FC<PublicShopStorefrontViewProps> = ({
  shopId,
  onBack,
  onStartOrder,
}) => {
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flag review modal state
  const [flaggingReviewId, setFlaggingReviewId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState<string>('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagSuccessMsg, setFlagSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/marketplace/shops/${shopId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Shop storefront not found (${res.status})`);
        return res.json();
      })
      .then((json) => {
        setShop(json.data);
      })
      .catch((err) => setError(err.message || 'Failed to load shop details'))
      .finally(() => setLoading(false));
  }, [shopId]);

  const handleFlagReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flaggingReviewId || !flagReason.trim()) return;
    setFlagSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/reviews/${flaggingReviewId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: flagReason.trim() }),
      });
      if (!res.ok) throw new Error('Failed to flag review');
      setFlagSuccessMsg('Review has been flagged for moderation.');
      setTimeout(() => {
        setFlaggingReviewId(null);
        setFlagReason('');
        setFlagSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Error flagging review');
    } finally {
      setFlagSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-12 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Atelier Unavailable</h2>
        <p className="text-xs text-text-muted">{error || 'This storefront is not available.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-dark transition-colors"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* ── Back Navigation ────────────────────────────────────────── */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Discovery</span>
      </button>

      {/* ── Storefront Banner ──────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-border shadow-md">
        <div className="h-64 sm:h-80 w-full relative">
          {shop.coverPhotoUrl ? (
            <img
              src={shop.coverPhotoUrl}
              alt={shop.name}
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-brand to-slate-900 flex items-center justify-center text-white/20">
              <Store className="w-24 h-24" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        {/* Overlay Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2 text-white">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/80 border border-white/20 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              <span>Verified DarziDesk Atelier</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{shop.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              {shop.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-accent" />
                  <span>{shop.city}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                <span className="font-bold text-white font-mono">
                  {shop.avgRating ? shop.avgRating.toFixed(1) : 'New'}
                </span>
                <span className="text-slate-400 font-normal">
                  ({shop.reviewCount} {shop.reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            </div>
          </div>

          {/* Direct CTA */}
          <button
            onClick={() => onStartOrder(shop.id)}
            className="px-6 py-3 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Scissors className="w-4 h-4" />
            <span>Start an Order</span>
          </button>
        </div>
      </div>

      {/* ── Main Details & Hours Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Specialties & Portfolio */}
        <div className="lg:col-span-2 space-y-8">
          {/* Specialty Crafts */}
          {shop.specialtyTags && shop.specialtyTags.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-3 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                <Scissors className="w-4 h-4 text-brand" />
                <span>Specialty Craftsmanship</span>
              </h2>
              <div className="flex flex-wrap gap-2 pt-1">
                {shop.specialtyTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-lg bg-brand/5 border border-brand/10 text-brand text-xs font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio Showcase */}
          {shop.portfolioPhotoUrls && shop.portfolioPhotoUrls.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                Atelier Portfolio & Creations
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {shop.portfolioPhotoUrls.map((photo, i) => (
                  <div
                    key={i}
                    className="h-40 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-border group"
                  >
                    <img
                      src={photo}
                      alt={`Portfolio piece ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified Customer Reviews */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                  Verified Client Reviews
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Reviews left strictly by clients with delivered garments.
                </p>
              </div>
              <div className="flex items-center gap-1 bg-background border border-border px-3 py-1 rounded-full text-xs">
                <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                <span className="font-bold text-text-primary font-mono">
                  {shop.avgRating ? shop.avgRating.toFixed(1) : '—'}
                </span>
                <span className="text-text-muted">/ 5.0</span>
              </div>
            </div>

            {shop.reviews && shop.reviews.length > 0 ? (
              <div className="space-y-4 divide-y divide-border">
                {shop.reviews.map((rev) => (
                  <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-accent">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= rev.rating ? 'fill-accent' : 'text-slate-300 dark:text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-text-primary">{rev.customerName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-text-muted font-mono">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <button
                          onClick={() => setFlaggingReviewId(rev.id)}
                          title="Report review"
                          className="text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {rev.comment && (
                      <p className="text-xs text-text-secondary leading-relaxed bg-background p-3 rounded-xl border border-border/60">
                        "{rev.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-text-muted">
                No customer reviews yet. Be the first to order and review this master atelier!
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Hours & Workshop Info */}
        <div className="space-y-6">
          {/* Working Hours */}
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand" />
              <span>Workshop Hours</span>
            </h2>
            {shop.workingHours && Object.keys(shop.workingHours).length > 0 ? (
              <div className="space-y-2 text-xs divide-y divide-border/60">
                {Object.entries(shop.workingHours).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between pt-2 first:pt-0">
                    <span className="text-text-secondary capitalize">
                      {key.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-text-primary font-mono">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">Hours available upon inquiry.</p>
            )}
          </div>

          {/* Bespoke Ordering Card */}
          <div className="bg-gradient-to-br from-brand/5 to-accent/5 border border-brand/15 rounded-2xl p-6 space-y-3 text-center">
            <h3 className="text-sm font-bold text-text-primary">Ready to Commission?</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Explore available bespoke cloths, configure custom measurements, and track your tailored garment in real time.
            </p>
            <button
              onClick={() => onStartOrder(shop.id)}
              className="w-full py-2.5 px-4 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow transition-colors cursor-pointer"
            >
              Browse Fabric Catalog & Order →
            </button>
          </div>
        </div>
      </div>

      {/* ── Flag Review Modal ───────────────────────────────────────── */}
      {flaggingReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Flag className="w-4 h-4" />
                <h3 className="text-sm font-bold text-text-primary">Flag Review for Moderation</h3>
              </div>
              <button
                onClick={() => setFlaggingReviewId(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {flagSuccessMsg ? (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium text-center">
                {flagSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleFlagReview} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary">Reason for flag</label>
                  <textarea
                    required
                    rows={3}
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Describe why this review violates community guidelines (e.g. spam, abusive language)..."
                    className="w-full p-2.5 bg-background border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFlaggingReviewId(null)}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={flagSubmitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                  >
                    {flagSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
