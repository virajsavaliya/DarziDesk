/**
 * LoginPage — Unified authentication entry point for DarziDesk.
 *
 * Two tabs:
 *   - Business Login (SHOP_OWNER / STAFF / SUPER_ADMIN) → POST /api/auth/login/staff
 *   - Customer Login → POST /api/auth/login/customer
 *
 * On success, the JWT role is decoded client-side for REDIRECT CONVENIENCE ONLY.
 * This is NOT access control — every actual API call is enforced by backend RBAC.
 *   SUPER_ADMIN  → /admin
 *   SHOP_OWNER   → /dashboard
 *   STAFF        → /dashboard
 *   CUSTOMER     → /portal
 *
 * Auth state is stored in localStorage as { token, role, userId }.
 */

import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Building2, User, AlertCircle, ArrowLeft, Loader } from 'lucide-react';
import logoForDark from '../../assets/logo_for_dark.png';
import logoForLight from '../../assets/logo_for_light.png';
import type { DemoUser } from '../../types/dashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Auth state helpers
// ─────────────────────────────────────────────────────────────────────────────

export const AUTH_STORAGE_KEY = 'darzi_auth';

export interface StoredAuth {
  token: string;
  role: string;
  userId: string;
  name?: string;
  email?: string;
}

export interface LoginPageProps {
  onLogin?: (user: DemoUser) => void;
}

/** Read stored auth from localStorage. Returns null if absent or malformed. */
export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

/** Persist auth to localStorage. */
export function setStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

/** Clear stored auth (logout). */
export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * Decode the JWT payload for redirect routing ONLY.
 * Does NOT validate the signature — the server does that on every request.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Map role → redirect URL. Convenience redirect only — not access control.
 * Mirrors defaultRouteForRole in App.tsx (source of truth for URL structure).
 */
function redirectForRole(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return '/admin/tenants';
    case 'SHOP_OWNER':  return '/dashboard/home';
    case 'STAFF':       return '/dashboard/tasks';
    case 'CUSTOMER':    return '/portal/marketplace';
    default:            return '/dashboard/home';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage
// ─────────────────────────────────────────────────────────────────────────────
export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'business';

  const [tab, setTab] = useState<'business' | 'customer'>('business');
  const [showRegister, setShowRegister] = useState(initialMode === 'register');

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Business-specific
  const [slug, setSlug] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setSlug('');
    setFirstName('');
    setLastName('');
    setShopName('');
    setShopSlug('');
    setError(null);
    setRateLimited(false);
  };

  const switchTab = (newTab: 'business' | 'customer') => {
    setTab(newTab);
    setShowRegister(false);
    clearForm();
  };

  // ── Business Login ──────────────────────────────────────────────────────────
  const handleBusinessLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRateLimited(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          slug: slug.trim(),
        }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || 'Invalid credentials. Check your email, password, and shop URL.');
        return;
      }

      const token: string = json.data?.token || json.token;
      const payload = decodeJwtPayload(token);
      const role = (payload?.role as string) || 'STAFF';
      const userId = (payload?.sub as string) || '';
      const name = json.data?.user
        ? `${json.data.user.firstName} ${json.data.user.lastName}`.trim()
        : undefined;

      const userObj: DemoUser = {
        id: userId,
        name: name || (role === 'SHOP_OWNER' ? 'Shop Owner' : 'Staff Member'),
        email: email.trim(),
        role: role as DemoUser['role'],
        token,
      };

      setStoredAuth({ token, role, userId, name: userObj.name, email: userObj.email });
      window.dispatchEvent(new Event('darzi-auth-change'));
      if (onLogin) {
        onLogin(userObj);
      }
      navigate(redirectForRole(role));
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Business Register ───────────────────────────────────────────────────────
  const handleBusinessRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName,
          slug: shopSlug,
          shopSlug,
          firstName,
          lastName,
          ownerEmail: email,
          ownerPassword: password,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || 'Registration failed. Please check your details and try again.');
        return;
      }

      // Auto-login after registration
      const token: string = json.data?.token || json.token;
      if (token) {
        const payload = decodeJwtPayload(token);
        const role = (payload?.role as string) || 'SHOP_OWNER';
        const userId = (payload?.sub as string) || '';
        setStoredAuth({ token, role, userId });
        navigate(redirectForRole(role));
      } else {
        // Registration succeeded but no token returned — go to login
        setShowRegister(false);
        clearForm();
        setError(null);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Customer Login ──────────────────────────────────────────────────────────
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRateLimited(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || 'Invalid email or password.');
        return;
      }

      const token: string = json.data?.token || json.token;
      const payload = decodeJwtPayload(token);
      const userId = (payload?.sub as string) || '';
      const name = json.data?.customer
        ? `${json.data.customer.firstName} ${json.data.customer.lastName}`.trim()
        : undefined;

      const userObj: DemoUser = {
        id: userId,
        name: name || 'Customer',
        email: email.includes('@') ? email.trim() : '',
        role: 'CUSTOMER',
        token,
      };

      setStoredAuth({ token, role: 'CUSTOMER', userId, name: userObj.name, email: userObj.email });
      window.dispatchEvent(new Event('darzi-auth-change'));
      if (onLogin) {
        onLogin(userObj);
      }
      navigate('/portal');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="login-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 60 M 0 0 L 60 60" stroke="white" strokeWidth="0.5" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>
          <div className="absolute top-1/4 -right-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <img src={logoForDark} alt="DarziDesk" className="h-10 w-auto object-contain" />
        </div>

        {/* Copy */}
        <div className="relative space-y-6">
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Your workshop,<br />
            <span className="text-accent">perfectly managed.</span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            Orders, measurements, fabric, invoicing, and customer notifications — all in one place.
          </p>

          <div className="space-y-3 pt-2">
            {[
              'End-to-end order pipeline tracking',
              'Digital measurement book with version history',
              'Automated customer notifications',
              'Marketplace discovery for new clients',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                </div>
                <span className="text-white/80 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer link */}
        <div className="relative">
          <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white/80 text-sm transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-10">
            <img src={logoForLight} alt="DarziDesk" className="h-9 w-auto object-contain" />
          </div>

          {/* Tab selector */}
          <div className="flex bg-surface-muted border border-border rounded-xl p-1 gap-1 mb-8">
            <button
              onClick={() => switchTab('business')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'business'
                  ? 'bg-surface text-brand shadow-sm border border-border'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Business
            </button>
            <button
              onClick={() => switchTab('customer')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'customer'
                  ? 'bg-surface text-brand shadow-sm border border-border'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <User className="w-4 h-4" />
              Customer
            </button>
          </div>

          {/* Error / Rate limit alerts */}
          {rateLimited && (
            <div className="flex items-start gap-3 p-4 bg-error-light border border-error/25 rounded-xl mb-6">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-error font-semibold text-sm">Too many attempts</p>
                <p className="text-error/80 text-xs mt-1">You've been temporarily rate-limited. Please wait 15 minutes before trying again.</p>
              </div>
            </div>
          )}
          {error && !rateLimited && (
            <div className="flex items-start gap-3 p-4 bg-error-light border border-error/25 rounded-xl mb-6">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {/* ── BUSINESS TAB ────────────────────────────────────────────────── */}
          {tab === 'business' && !showRegister && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-1">Business sign in</h2>
                <p className="text-text-muted text-sm">For shop owners, staff, and platform administrators.</p>
              </div>

              <form onSubmit={handleBusinessLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Shop URL</label>
                  <div className="flex rounded-xl border border-border overflow-hidden focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand transition-all">
                    <span className="flex items-center px-3.5 bg-surface-muted text-text-muted text-sm border-r border-border">
                      darzi.app/
                    </span>
                    <input
                      id="business-slug"
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="your-shop-slug"
                      required
                      className="flex-1 px-3 py-3 bg-surface text-sm text-text-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Email address</label>
                  <input
                    id="business-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourshop.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      id="business-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-surface text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="business-login-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Signing in…' : 'Sign in to your workspace'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-border text-center">
                <p className="text-sm text-text-muted">
                  New to DarziDesk?{' '}
                  <button
                    onClick={() => { setShowRegister(true); setError(null); }}
                    className="text-brand font-semibold hover:underline"
                  >
                    Register your studio
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ── BUSINESS REGISTER ────────────────────────────────────────────── */}
          {tab === 'business' && showRegister && (
            <>
              <div className="mb-8">
                <button
                  onClick={() => { setShowRegister(false); clearForm(); }}
                  className="flex items-center gap-1.5 text-text-muted hover:text-brand text-sm font-medium mb-4 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </button>
                <h2 className="text-2xl font-bold text-text-primary mb-1">Register your studio</h2>
                <p className="text-text-muted text-sm">30-day free trial. No credit card required.</p>
              </div>

              <form onSubmit={handleBusinessRegister} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">First name</label>
                    <input
                      id="reg-first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Priya"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Last name</label>
                    <input
                      id="reg-last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Sharma"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Studio name</label>
                  <input
                    id="reg-shop-name"
                    type="text"
                    value={shopName}
                    onChange={(e) => {
                      setShopName(e.target.value);
                      setShopSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                    }}
                    placeholder="Sharma Bespoke Atelier"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Shop URL</label>
                  <div className="flex rounded-xl border border-border overflow-hidden focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand transition-all">
                    <span className="flex items-center px-3.5 bg-surface-muted text-text-muted text-sm border-r border-border">
                      darzi.app/
                    </span>
                    <input
                      id="reg-shop-slug"
                      type="text"
                      value={shopSlug}
                      onChange={(e) => setShopSlug(e.target.value)}
                      placeholder="sharma-bespoke"
                      required
                      className="flex-1 px-3 py-3 bg-surface text-sm text-text-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Email address</label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@studio.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-surface text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="register-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Creating your studio…' : 'Start 30-day free trial'}
                </button>
              </form>
            </>
          )}

          {/* ── CUSTOMER TAB ─────────────────────────────────────────────────── */}
          {tab === 'customer' && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-1">Customer sign in</h2>
                <p className="text-text-muted text-sm">Access your orders, measurements, and invoices.</p>
              </div>

              <form onSubmit={handleCustomerLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Email address</label>
                  <input
                    id="customer-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      id="customer-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-surface text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="customer-login-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Signing in…' : 'Access my portal'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-text-muted">
                New customer?{' '}
                <span className="text-text-secondary">
                  Ask your tailor to register you when placing your first order.
                </span>
              </p>
            </>
          )}

          {/* Back to landing on mobile */}
          <div className="lg:hidden mt-8 text-center">
            <Link to="/" className="text-xs text-text-muted hover:text-brand transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
