/**
 * Login redirect tests — Phase 13.
 *
 * Tests:
 *  [L1] Business login with SHOP_OWNER token → redirected to /dashboard
 *  [L2] Business login with STAFF token → redirected to /dashboard
 *  [L3] Business login with SUPER_ADMIN token → redirected to /admin
 *  [L4] Customer login → redirected to /portal
 *  [L5] Login with 401 → shows inline error, no redirect
 *  [L6] Login with 429 → shows rate-limit message, no redirect
 *  [L7] getStoredAuth / setStoredAuth / clearStoredAuth round-trip
 *  [L8] decodeJwtPayload via role redirect (SUPER_ADMIN payload → /admin)
 *
 * Architecture note:
 *  The frontend redirect is CONVENIENCE ONLY. Backend RBAC (Phases 1–12)
 *  still rejects every unauthorized API call with 403. These tests verify
 *  only the UX routing layer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage, getStoredAuth, setStoredAuth, clearStoredAuth, AUTH_STORAGE_KEY } from '../components/landing/LoginPage';

// ─────────────────────────────────────────────────────────────────────────────
// Mock react-router-dom's useNavigate so we can assert navigated paths
// ─────────────────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// JWT helpers — build minimal valid base64url JWTs
// ─────────────────────────────────────────────────────────────────────────────

function makeJwtWithRole(role: string, userId = 'test-user-id'): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({ sub: userId, role, iat: 1000000 }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  // Signature doesn't matter for client-side decode (server validates it)
  return `${header}.${payload}.fakesig`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Render helper
// ─────────────────────────────────────────────────────────────────────────────
function renderLoginPage(searchParams = '') {
  return render(
    <MemoryRouter initialEntries={[`/login${searchParams}`]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-test cleanup
// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  mockNavigate.mockClear();
  clearStoredAuth();
  vi.restoreAllMocks();
});

afterEach(() => {
  clearStoredAuth();
});

// ─────────────────────────────────────────────────────────────────────────────
// [L7] Auth storage round-trip (pure unit test, no DOM needed)
// ─────────────────────────────────────────────────────────────────────────────
describe('[L7] Auth storage helpers', () => {
  it('setStoredAuth → getStoredAuth round-trips correctly', () => {
    const auth = { token: 'tok123', role: 'SHOP_OWNER', userId: 'user-abc', name: 'Priya' };
    setStoredAuth(auth);
    const read = getStoredAuth();
    expect(read).toEqual(auth);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeTruthy();
  });

  it('clearStoredAuth removes the item', () => {
    setStoredAuth({ token: 'tok', role: 'STAFF', userId: 'u1' });
    clearStoredAuth();
    expect(getStoredAuth()).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('getStoredAuth returns null when nothing is stored', () => {
    expect(getStoredAuth()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [L1] SHOP_OWNER login → /dashboard
// ─────────────────────────────────────────────────────────────────────────────
describe('[L1] Business login — SHOP_OWNER redirects to /dashboard', () => {
  it('calls navigate("/dashboard") after successful SHOP_OWNER login', async () => {
    const token = makeJwtWithRole('SHOP_OWNER');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { token, user: { firstName: 'Priya', lastName: 'Sharma' } } }),
    } as Response);

    renderLoginPage();

    // Fill business login form
    fireEvent.change(screen.getByPlaceholderText('your-shop-slug'), { target: { value: 'my-shop' } });
    fireEvent.change(screen.getByPlaceholderText('you@yourshop.com'), { target: { value: 'priya@shop.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Sign in to your workspace'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    // Verify token was stored with correct role
    const stored = getStoredAuth();
    expect(stored?.role).toBe('SHOP_OWNER');
    expect(stored?.token).toBe(token);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [L2] STAFF login → /dashboard
// ─────────────────────────────────────────────────────────────────────────────
describe('[L2] Business login — STAFF redirects to /dashboard', () => {
  it('calls navigate("/dashboard") after successful STAFF login', async () => {
    const token = makeJwtWithRole('STAFF');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { token } }),
    } as Response);

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('your-shop-slug'), { target: { value: 'my-shop' } });
    fireEvent.change(screen.getByPlaceholderText('you@yourshop.com'), { target: { value: 'staff@shop.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Sign in to your workspace'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [L3] SUPER_ADMIN login → /admin
// ─────────────────────────────────────────────────────────────────────────────
describe('[L3] Business login — SUPER_ADMIN redirects to /admin', () => {
  it('calls navigate("/admin") after successful SUPER_ADMIN login', async () => {
    const token = makeJwtWithRole('SUPER_ADMIN');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { token } }),
    } as Response);

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('your-shop-slug'), { target: { value: 'platform' } });
    fireEvent.change(screen.getByPlaceholderText('you@yourshop.com'), { target: { value: 'admin@darzi.app' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'adminpass' } });
    fireEvent.click(screen.getByText('Sign in to your workspace'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [L4] Customer login → /portal
// ─────────────────────────────────────────────────────────────────────────────
describe('[L4] Customer login → /portal', () => {
  it('calls navigate("/portal") after successful customer login', async () => {
    const token = makeJwtWithRole('CUSTOMER');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { token } }),
    } as Response);

    renderLoginPage();

    // Switch to Customer tab
    fireEvent.click(screen.getByText('Customer'));

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'customer@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'customerpass' } });
    fireEvent.click(screen.getByText('Access my portal'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/portal');
    });

    const stored = getStoredAuth();
    expect(stored?.role).toBe('CUSTOMER');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [L5] 401 response → inline error, no redirect
// ─────────────────────────────────────────────────────────────────────────────
describe('[L5] Login 401 — shows error, no redirect', () => {
  it('renders error message and does NOT call navigate on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid credentials' } }),
    } as Response);

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('your-shop-slug'), { target: { value: 'my-shop' } });
    fireEvent.change(screen.getByPlaceholderText('you@yourshop.com'), { target: { value: 'wrong@shop.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByText('Sign in to your workspace'));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(getStoredAuth()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// [L6] 429 response → rate-limit message, no redirect
// ─────────────────────────────────────────────────────────────────────────────
describe('[L6] Login 429 — shows rate-limit message, no redirect', () => {
  it('renders rate-limit alert and does NOT call navigate on 429', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Too many requests' } }),
    } as Response);

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('your-shop-slug'), { target: { value: 'my-shop' } });
    fireEvent.change(screen.getByPlaceholderText('you@yourshop.com'), { target: { value: 'brute@shop.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'badpass' } });
    fireEvent.click(screen.getByText('Sign in to your workspace'));

    await waitFor(() => {
      expect(screen.getByText('Too many attempts')).toBeTruthy();
    });

    // Rate-limit message includes wait instruction
    expect(screen.getByText(/temporarily rate-limited/i)).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
