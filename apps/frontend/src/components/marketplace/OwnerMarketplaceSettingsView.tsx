import React, { useState, useEffect } from 'react';
import {
  Store,
  MapPin,
  Clock,
  Image as ImageIcon,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock3,
  XCircle,
  Plus,
  Trash2,
  ExternalLink,
  Save,
  Navigation,
} from 'lucide-react';
import type { MarketplaceSettings } from '../../types/dashboard';

interface OwnerMarketplaceSettingsViewProps {
  authToken: string;
  onPreviewStorefront?: (tenantId: string) => void;
}

const POPULAR_SPECIALTY_TAGS = [
  'Bridal Lehengas',
  'Bespoke Sherwanis',
  'Suits & Blazers',
  'Kurtas & Pajamas',
  'Designer Blouses',
  'Zardozi Embroidery',
  'Formalwear',
  'Alterations & Fitting',
  'Indo-Western',
  'Silk Sarees',
];

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const OwnerMarketplaceSettingsView: React.FC<OwnerMarketplaceSettingsViewProps> = ({
  authToken,
  onPreviewStorefront,
}) => {
  const [settings, setSettings] = useState<MarketplaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [isListed, setIsListed] = useState(false);
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [specialtyTags, setSpecialtyTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [newPortfolioInput, setNewPortfolioInput] = useState('');
  const [workingHours, setWorkingHours] = useState<Record<string, string>>({
    Monday: '10:00 AM - 8:00 PM',
    Tuesday: '10:00 AM - 8:00 PM',
    Wednesday: '10:00 AM - 8:00 PM',
    Thursday: '10:00 AM - 8:00 PM',
    Friday: '10:00 AM - 8:00 PM',
    Saturday: '10:00 AM - 8:00 PM',
    Sunday: 'Closed',
  });

  // Fetch current marketplace settings
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/shop/marketplace-settings', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load marketplace settings (${res.status})`);
        return res.json();
      })
      .then((json) => {
        const data: MarketplaceSettings = json.data;
        setSettings(data);
        setIsListed(data.isListedOnMarketplace ?? false);
        setCity(data.city ?? '');
        setLatitude(data.latitude != null ? String(data.latitude) : '');
        setLongitude(data.longitude != null ? String(data.longitude) : '');
        setSpecialtyTags(data.specialtyTags ?? []);
        setCoverPhotoUrl(data.coverPhotoUrl ?? '');
        setPortfolioUrls(data.portfolioPhotoUrls ?? []);
        if (data.workingHours && typeof data.workingHours === 'object') {
          setWorkingHours({
            ...workingHours,
            ...data.workingHours,
          });
        }
      })
      .catch((err) => setError(err.message || 'Failed to fetch settings'))
      .finally(() => setLoading(false));
  }, [authToken]);

  // Handle Add Tag
  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed || specialtyTags.includes(trimmed)) return;
    setSpecialtyTags([...specialtyTags, trimmed]);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSpecialtyTags(specialtyTags.filter((t) => t !== tagToRemove));
  };

  // Handle Portfolio photos
  const handleAddPortfolioPhoto = () => {
    const trimmed = newPortfolioInput.trim();
    if (!trimmed || portfolioUrls.includes(trimmed)) return;
    setPortfolioUrls([...portfolioUrls, trimmed]);
    setNewPortfolioInput('');
  };

  const handleRemovePortfolioPhoto = (idx: number) => {
    setPortfolioUrls(portfolioUrls.filter((_, i) => i !== idx));
  };

  // Quick preset coordinates
  const setCityPreset = (cityName: string, lat: number, lng: number) => {
    setCity(cityName);
    setLatitude(String(lat));
    setLongitude(String(lng));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const latNum = latitude.trim() ? parseFloat(latitude) : null;
    const lngNum = longitude.trim() ? parseFloat(longitude) : null;

    if (latNum !== null && (isNaN(latNum) || latNum < -90 || latNum > 90)) {
      setError('Latitude must be a valid number between -90 and 90');
      setSaving(false);
      return;
    }
    if (lngNum !== null && (isNaN(lngNum) || lngNum < -180 || lngNum > 180)) {
      setError('Longitude must be a valid number between -180 and 180');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/shop/marketplace-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          isListedOnMarketplace: isListed,
          city: city.trim() || null,
          latitude: latNum,
          longitude: lngNum,
          specialtyTags,
          coverPhotoUrl: coverPhotoUrl.trim() || null,
          portfolioPhotoUrls: portfolioUrls,
          workingHours,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `Failed to save settings (${res.status})`);
      }

      const updatedJson = await res.json();
      setSettings(updatedJson.data);
      setSuccessMsg('Marketplace settings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error saving marketplace settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted animate-pulse">
        <Store className="w-8 h-8 mx-auto mb-2 text-text-muted/50" />
        Loading marketplace storefront settings...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <Store className="w-6 h-6 text-accent" />
            Marketplace Storefront Profile
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Configure how your tailoring atelier appears to bespoke clients discovering shops on DarziDesk.
          </p>
        </div>

        {settings && (
          <div className="flex items-center gap-2">
            {settings.isListedOnMarketplace && settings.listingStatus === 'APPROVED' && onPreviewStorefront && (
              <button
                type="button"
                onClick={() => onPreviewStorefront(settings.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-surface-muted hover:bg-border text-text-primary transition-colors border border-border"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Public Storefront
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-error-light border border-error/30 text-error text-sm font-medium flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Opt-in Toggle & Status Banner ────────────────────────────── */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-base font-bold text-text-primary flex items-center gap-2">
                Marketplace Visibility
              </span>
              <p className="text-xs text-text-muted">
                Toggle whether your shop is listed for public discovery. When turned on, new or updated listings are reviewed by administrators.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isListed}
                onChange={(e) => setIsListed(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-accent"></div>
              <span className="ml-3 text-sm font-semibold text-text-primary">
                {isListed ? 'Listed' : 'Unlisted'}
              </span>
            </label>
          </div>

          {/* Status Display Card */}
          <div className="pt-3 border-t border-border/60">
            {!isListed ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <Store className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Storefront is Currently Unlisted
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    Your shop is not visible on the marketplace. Existing client links and direct orders continue to function normally.
                  </p>
                </div>
              </div>
            ) : settings?.listingStatus === 'PENDING_REVIEW' ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
                <Clock3 className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Listing Status: Under Admin Review
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                    Your shop profile was submitted and is queued for verification by platform moderators. Once approved, your storefront will be publicly searchable.
                  </p>
                </div>
              </div>
            ) : settings?.listingStatus === 'APPROVED' ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Listing Status: Approved & Live
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300/90 mt-0.5">
                    Your storefront is active and discoverable on the marketplace. Verified clients who have completed orders can leave verified ratings.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    Listing Status: Changes Requested / Rejected
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300/90 mt-0.5">
                    Admin feedback: {settings?.rejectionReason || 'Please verify shop details and portfolio photos before resubmitting.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Location & Coordinates ───────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            Location & Discovery Geolocation
          </h2>
          <p className="text-xs text-text-muted">
            Clients can filter shops by city and sort by proximity (distance in kilometers).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                City / Region
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Surat, Jaipur"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Latitude
              </label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 19.0760"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-accent text-text-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Longitude
              </label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 72.8777"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-accent text-text-primary font-mono"
              />
            </div>
          </div>

          {/* Quick city coordinates presets */}
          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
              <Navigation className="w-3 h-3" /> Quick Presets:
            </span>
            <button
              type="button"
              onClick={() => setCityPreset('Mumbai', 19.076, 72.8777)}
              className="text-xs px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-border text-text-secondary transition-colors"
            >
              Mumbai
            </button>
            <button
              type="button"
              onClick={() => setCityPreset('New Delhi', 28.6139, 77.209)}
              className="text-xs px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-border text-text-secondary transition-colors"
            >
              New Delhi
            </button>
            <button
              type="button"
              onClick={() => setCityPreset('Surat', 21.1702, 72.8311)}
              className="text-xs px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-border text-text-secondary transition-colors"
            >
              Surat
            </button>
            <button
              type="button"
              onClick={() => setCityPreset('Jaipur', 26.9124, 75.7873)}
              className="text-xs px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-border text-text-secondary transition-colors"
            >
              Jaipur
            </button>
          </div>
        </div>

        {/* ── Specialty Tags ───────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Tag className="w-4 h-4 text-accent" />
            Specialty Craft Tags
          </h2>
          <p className="text-xs text-text-muted">
            Highlight garments and bespoke tailoring disciplines you excel in.
          </p>

          {/* Current tags */}
          <div className="flex flex-wrap gap-2 min-h-[36px] p-3 rounded-xl bg-surface-muted/60 border border-border">
            {specialtyTags.length === 0 ? (
              <span className="text-xs text-text-muted italic">No specialty tags selected yet.</span>
            ) : (
              specialtyTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/20"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-error transition-colors"
                    title={`Remove ${tag}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Add custom tag */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(newTagInput);
                }
              }}
              placeholder="Add custom specialty (e.g. Bandhgala Suits)"
              className="flex-1 px-3.5 py-2 rounded-xl text-sm bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
            />
            <button
              type="button"
              onClick={() => handleAddTag(newTagInput)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-muted hover:bg-border text-text-primary transition-colors border border-border flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Tag
            </button>
          </div>

          {/* Popular suggestions */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-text-muted">Popular Suggestions:</span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SPECIALTY_TAGS.map((tag) => {
                const isSelected = specialtyTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => (!isSelected ? handleAddTag(tag) : handleRemoveTag(tag))}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors border ${
                      isSelected
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface-muted hover:bg-border text-text-secondary border-border'
                    }`}
                  >
                    {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Photos (Cover & Portfolio) ───────────────────────────────── */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-accent" />
            Storefront Imagery
          </h2>

          {/* Cover Photo */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Cover Hero Photo URL
            </label>
            <input
              type="url"
              value={coverPhotoUrl}
              onChange={(e) => setCoverPhotoUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-accent text-text-primary font-mono"
            />
            {coverPhotoUrl && (
              <div className="mt-2 relative h-36 rounded-xl overflow-hidden border border-border bg-surface-muted max-w-md">
                <img
                  src={coverPhotoUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Portfolio Photos */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-text-primary">
              Portfolio Gallery (Showcase Past Creations)
            </label>

            <div className="flex gap-2">
              <input
                type="url"
                value={newPortfolioInput}
                onChange={(e) => setNewPortfolioInput(e.target.value)}
                placeholder="Paste garment photo URL"
                className="flex-1 px-3.5 py-2 rounded-xl text-sm bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-accent text-text-primary font-mono"
              />
              <button
                type="button"
                onClick={handleAddPortfolioPhoto}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-muted hover:bg-border text-text-primary transition-colors border border-border flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Photo
              </button>
            </div>

            {/* Thumbnails grid */}
            {portfolioUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {portfolioUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-border bg-surface-muted aspect-[4/3]"
                  >
                    <img
                      src={url}
                      alt={`Portfolio ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePortfolioPhoto(idx)}
                        className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Working Hours ────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            Operating Hours
          </h2>
          <p className="text-xs text-text-muted">
            Let bespoke clients know when your studio or workshop is open for visits and consultations.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-muted/60 border border-border">
                <span className="text-xs font-semibold text-text-primary w-24">{day}</span>
                <input
                  type="text"
                  value={workingHours[day] || ''}
                  onChange={(e) =>
                    setWorkingHours({
                      ...workingHours,
                      [day]: e.target.value,
                    })
                  }
                  placeholder="e.g. 10:00 AM - 8:00 PM"
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Submit Button ────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-colors shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Settings...' : 'Save & Update Storefront'}
          </button>
        </div>
      </form>
    </div>
  );
};
