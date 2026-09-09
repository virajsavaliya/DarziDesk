import React, { useState, useEffect } from 'react';
import {
  Shield,
  Store,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  MapPin,
  Eye,
  Trash2,
  Check,
  X,
  MessageSquare,
  Building2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { FlaggedReviewItem } from '../../types/dashboard';

interface SuperAdminModerationViewProps {
  authToken: string;
  onPreviewStorefront?: (tenantId: string) => void;
}

export const SuperAdminModerationView: React.FC<SuperAdminModerationViewProps> = ({
  authToken,
  onPreviewStorefront,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'flagged'>('pending');
  const [pendingShops, setPendingShops] = useState<any[]>([]);
  const [flaggedReviews, setFlaggedReviews] = useState<FlaggedReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  // Reject modal state
  const [rejectingShopId, setRejectingShopId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Selected shop for detail preview modal
  const [inspectingShop, setInspectingShop] = useState<any | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const fetchPendingShops = async () => {
    try {
      const res = await fetch('/api/admin/marketplace/pending', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load pending shops (${res.status})`);
      const json = await res.json();
      setPendingShops(json.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching pending listings');
    }
  };

  const fetchFlaggedReviews = async () => {
    try {
      const res = await fetch('/api/admin/marketplace/flagged-reviews', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load flagged reviews (${res.status})`);
      const json = await res.json();
      setFlaggedReviews(json.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching flagged reviews');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchPendingShops(), fetchFlaggedReviews()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [authToken]);

  // Handle Approve Shop Listing
  const handleApproveShop = async (tenantId: string) => {
    setActionLoading(tenantId);
    try {
      const res = await fetch(`/api/admin/marketplace/shops/${tenantId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) throw new Error(`Approval failed (${res.status})`);
      showToast('success', 'Shop listing approved and published live to marketplace!');
      setPendingShops((prev) => prev.filter((s) => s.id !== tenantId));
      if (inspectingShop?.id === tenantId) setInspectingShop(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to approve shop');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reject Shop Listing
  const handleRejectShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingShopId) return;
    setActionLoading(rejectingShopId);
    try {
      const res = await fetch(`/api/admin/marketplace/shops/${rejectingShopId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ reason: rejectionReason.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`Rejection failed (${res.status})`);
      showToast('success', 'Shop listing marked as rejected with feedback sent to owner.');
      setPendingShops((prev) => prev.filter((s) => s.id !== rejectingShopId));
      setRejectingShopId(null);
      setRejectionReason('');
      if (inspectingShop?.id === rejectingShopId) setInspectingShop(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reject shop');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Resolve Flagged Review
  const handleResolveReview = async (reviewId: string, action: 'DISMISS' | 'REMOVE') => {
    setActionLoading(reviewId);
    try {
      const res = await fetch(`/api/admin/marketplace/reviews/${reviewId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Failed to resolve review (${res.status})`);
      showToast(
        'success',
        action === 'REMOVE'
          ? 'Flagged review deleted permanently.'
          : 'Flag dismissed; review restored to public display.',
      );
      setFlaggedReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err: any) {
      showToast('error', err.message || 'Failed to resolve review');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wide">
              Super Admin Control Plane
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-accent" />
            Marketplace Trust & Moderation
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">
            Review shop storefront submissions, verify artisan portfolios, and moderate flagged reviews.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-muted hover:bg-border text-text-secondary transition-colors border border-border shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* ── Toasts ──────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-2.5 shadow-sm transition-all ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{toastMsg.message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-error-light border border-error/30 text-error text-sm font-medium flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Metric Summary Tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-border">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2.5 border-b-2 transition-all ${
            activeTab === 'pending'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Store className="w-4 h-4" />
          Pending Shop Submissions
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              pendingShops.length > 0
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                : 'bg-surface-muted text-text-muted'
            }`}
          >
            {pendingShops.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('flagged')}
          className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2.5 border-b-2 transition-all ${
            activeTab === 'flagged'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Flagged Reviews
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              flaggedReviews.length > 0
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                : 'bg-surface-muted text-text-muted'
            }`}
          >
            {flaggedReviews.length}
          </span>
        </button>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-text-muted animate-pulse">
          <Shield className="w-8 h-8 mx-auto mb-2 text-text-muted/50" />
          Loading moderation queues...
        </div>
      ) : activeTab === 'pending' ? (
        // ── PENDING SHOPS TAB ───────────────────────────────────────────
        <div className="space-y-4">
          {pendingShops.length === 0 ? (
            <div className="p-12 text-center bg-surface rounded-2xl border border-border">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/80 mb-3" />
              <h3 className="text-base font-bold text-text-primary">No pending listings</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                All submitted shop storefronts have been reviewed. New opt-ins will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingShops.map((shop) => (
                <div
                  key={shop.id}
                  className="bg-surface border border-border hover:border-border-focus rounded-2xl p-5 shadow-sm space-y-4 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Shop basic info */}
                    <div className="flex items-start gap-4">
                      {shop.coverPhotoUrl ? (
                        <img
                          src={shop.coverPhotoUrl}
                          alt={shop.name}
                          className="w-16 h-16 rounded-xl object-cover border border-border shrink-0 bg-surface-muted"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 text-accent">
                          <Store className="w-8 h-8" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-text-primary">{shop.name}</h3>
                          <span className="text-xs font-mono text-text-muted">
                            @{shop.slug || 'no-slug'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Pending Review
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                          {shop.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-accent" />
                              {shop.city}
                            </span>
                          )}
                          {shop.latitude && shop.longitude && (
                            <span className="font-mono text-[11px]">
                              [{shop.latitude.toFixed(4)}, {shop.longitude.toFixed(4)}]
                            </span>
                          )}
                          <span className="text-[11px]">
                            Updated: {new Date(shop.updatedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Specialty tags */}
                        {shop.specialtyTags && shop.specialtyTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {shop.specialtyTags.map((tag: string) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-muted text-text-secondary border border-border"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                      <button
                        onClick={() => setInspectingShop(shop)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-surface-muted hover:bg-border text-text-primary transition-colors border border-border flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Details
                      </button>

                      <button
                        onClick={() => handleApproveShop(shop.id)}
                        disabled={actionLoading === shop.id}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {actionLoading === shop.id ? 'Approving...' : 'Approve'}
                      </button>

                      <button
                        onClick={() => {
                          setRejectingShopId(shop.id);
                          setRejectionReason('');
                        }}
                        disabled={actionLoading === shop.id}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject...
                      </button>
                    </div>
                  </div>

                  {/* Portfolio preview thumbnail bar */}
                  {shop.portfolioPhotoUrls && shop.portfolioPhotoUrls.length > 0 && (
                    <div className="pt-3 border-t border-border/50">
                      <span className="text-[11px] font-semibold text-text-muted block mb-1.5">
                        Portfolio Preview ({shop.portfolioPhotoUrls.length} photos):
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {shop.portfolioPhotoUrls.map((url: string, idx: number) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Portfolio"
                            className="w-14 h-14 rounded-lg object-cover border border-border shrink-0 bg-surface-muted"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // ── FLAGGED REVIEWS TAB ─────────────────────────────────────────
        <div className="space-y-4">
          {flaggedReviews.length === 0 ? (
            <div className="p-12 text-center bg-surface rounded-2xl border border-border">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/80 mb-3" />
              <h3 className="text-base font-bold text-text-primary">No flagged reviews</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                Zero reviews are currently flagged for inappropriate content. Customer reviews are verified against delivered orders.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {flaggedReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-surface border border-rose-300 dark:border-rose-900/60 rounded-2xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-text-primary">
                          Shop: {review.tenant?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-text-muted">
                          by {review.customer?.firstName} {review.customer?.lastName}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full text-xs font-bold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{review.rating}/5</span>
                        </div>
                      </div>

                      {/* Review comment */}
                      <p className="text-sm text-text-primary bg-surface-muted p-3 rounded-xl border border-border italic">
                        "{review.comment || 'No comment text'}"
                      </p>

                      {/* Flag Details Alert */}
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs space-y-1">
                        <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Report Reason:
                        </div>
                        <p className="text-rose-700 dark:text-rose-300/90 pl-5">
                          {review.flagReason || 'Unspecified complaint'}
                        </p>
                        {review.flaggedBy && (
                          <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 pl-5 block">
                            Flagged by: {review.flaggedBy}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                      <button
                        onClick={() => handleResolveReview(review.id, 'DISMISS')}
                        disabled={actionLoading === review.id}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-muted hover:bg-border text-text-primary transition-colors border border-border flex items-center gap-1.5 disabled:opacity-50"
                        title="Dismiss flag and keep review public"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Dismiss Flag (Keep)
                      </button>

                      <button
                        onClick={() => {
                          if (
                            confirm(
                              'Are you sure you want to delete this review permanently from the database?',
                            )
                          ) {
                            handleResolveReview(review.id, 'REMOVE');
                          }
                        }}
                        disabled={actionLoading === review.id}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        title="Delete inappropriate review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Reject Modal ────────────────────────────────────────────────── */}
      {rejectingShopId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Reject Shop Listing
              </h3>
              <button
                onClick={() => setRejectingShopId(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Provide constructive feedback for the shop owner explaining why this listing cannot be approved in its current state.
            </p>

            <form onSubmit={handleRejectShop} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Rejection Reason / Required Changes
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Please upload higher-resolution portfolio photos of bespoke work and complete your studio address."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-rose-500 text-text-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingShopId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-muted hover:bg-border text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectingShopId}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm disabled:opacity-50"
                >
                  {actionLoading === rejectingShopId ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Inspect Shop Modal ──────────────────────────────────────────── */}
      {inspectingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                {inspectingShop.name} — Storefront Inspection
              </h3>
              <button
                onClick={() => setInspectingShop(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectingShop.coverPhotoUrl && (
              <div className="h-44 rounded-xl overflow-hidden border border-border bg-surface-muted">
                <img
                  src={inspectingShop.coverPhotoUrl}
                  alt={inspectingShop.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-text-muted block">City / Location:</span>
                <span className="text-text-primary font-medium">
                  {inspectingShop.city || 'Not specified'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-text-muted block">Coordinates:</span>
                <span className="text-text-primary font-mono">
                  {inspectingShop.latitude && inspectingShop.longitude
                    ? `${inspectingShop.latitude}, ${inspectingShop.longitude}`
                    : 'None provided'}
                </span>
              </div>
            </div>

            {inspectingShop.specialtyTags && inspectingShop.specialtyTags.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-text-muted block mb-1">
                  Specialties:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {inspectingShop.specialtyTags.map((t: string) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-md text-xs bg-accent/10 text-accent border border-accent/20"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {inspectingShop.workingHours && (
              <div>
                <span className="text-xs font-semibold text-text-muted block mb-1">
                  Operating Hours:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-surface-muted p-3 rounded-xl border border-border">
                  {Object.entries(inspectingShop.workingHours).map(([d, h]: any) => (
                    <div key={d} className="text-xs">
                      <span className="font-bold text-text-primary">{d}:</span>{' '}
                      <span className="text-text-muted">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inspectingShop.portfolioPhotoUrls && inspectingShop.portfolioPhotoUrls.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-text-muted block mb-1">
                  Portfolio Gallery:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {inspectingShop.portfolioPhotoUrls.map((u: string, i: number) => (
                    <img
                      key={i}
                      src={u}
                      alt="Portfolio detail"
                      className="rounded-lg object-cover h-24 w-full border border-border bg-surface-muted"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border flex-wrap">
              <div>
                {onPreviewStorefront && (
                  <button
                    type="button"
                    onClick={() => onPreviewStorefront(inspectingShop.id)}
                    className="flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview Live Public View
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingShop(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-muted hover:bg-border text-text-primary transition-colors"
                >
                  Close
                </button>
              <button
                type="button"
                onClick={() => {
                  setRejectingShopId(inspectingShop.id);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                Reject...
              </button>
              <button
                type="button"
                onClick={() => handleApproveShop(inspectingShop.id)}
                disabled={actionLoading === inspectingShop.id}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                {actionLoading === inspectingShop.id ? 'Approving...' : 'Approve Listing'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
