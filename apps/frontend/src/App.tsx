/**
 * App.tsx — DarziDesk root router
 *
 * Auth boot strategy:
 *   1. `currentUser` is initialised synchronously from localStorage so
 *      there is NO null flash on page refresh (eliminates redirect race).
 *   2. `bootstrapping` is `true` on mount. While true, a loading spinner
 *      is shown instead of routes — this covers the async `GET /api/users/me`
 *      validation call that verifies the stored token hasn't expired.
 *   3. Once bootstrapping completes, `currentUser` is either populated (valid
 *      token) or null (expired / absent). Protected routes then evaluate.
 *
 * Routing:
 *   /                       → LandingPage (public)
 *   /login                  → LoginPage (public)
 *   /marketplace            → PublicMarketplaceRoute (public)
 *   /dashboard/*            → Owner / Staff shell + nested section routes
 *   /portal/*               → Customer shell + nested section routes
 *   /admin/*                → SuperAdmin shell + nested section routes
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import type {
  Order,
  DailySummary,
  OrderStatus,
  DemoUser,
  DemoSessionData,
  CustomerPortalOrder,
} from './types/dashboard';
import { AppShell } from './components/layout/AppShell';

// ── Landing Page ──────────────────────────────────────────────────────────────
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage, getStoredAuth, setStoredAuth, clearStoredAuth } from './components/landing/LoginPage';

// ── Customer Portal Views ───────────────────────────────────────────────────
import { CustomerOrdersView } from './components/portal/CustomerOrdersView';
import { CustomerOrderDetailView } from './components/portal/CustomerOrderDetailView';
import { ShopCatalogView } from './components/portal/ShopCatalogView';
import { CustomerInvoicesView } from './components/portal/CustomerInvoicesView';
import { CustomerMeasurementsView } from './components/portal/CustomerMeasurementsView';

// ── Staff Views ──────────────────────────────────────────────────────────────
import { StaffKpiCards } from './components/dashboard/StaffKpiCards';
import { StaffWorkQueue } from './components/dashboard/StaffWorkQueue';
import { CustomerDirectoryView } from './components/dashboard/CustomerDirectoryView';
import { Drawer } from './components/common/Drawer';
import { OrderDetailView } from './components/dashboard/OrderDetailView';
import { StatusBadge } from './components/common/StatusBadge';

// ── Owner Views ──────────────────────────────────────────────────────────────
import { OwnerDashboardView } from './components/dashboard/OwnerDashboardView';
import { OwnerOrdersView } from './components/dashboard/OwnerOrdersView';
import { OwnerFabricView } from './components/dashboard/OwnerFabricView';
import { OwnerStaffView } from './components/dashboard/OwnerStaffView';
import { OwnerInvoicesView } from './components/invoices/OwnerInvoicesView';
import { PlaceholderView } from './components/dashboard/PlaceholderView';

// ── Marketplace & Administration Views ───────────────────────────────────────
import { MarketplaceDiscoveryView } from './components/marketplace/MarketplaceDiscoveryView';
import { PublicShopStorefrontView } from './components/marketplace/PublicShopStorefrontView';
import { OwnerMarketplaceSettingsView } from './components/marketplace/OwnerMarketplaceSettingsView';
import { SuperAdminModerationView } from './components/marketplace/SuperAdminModerationView';
import { SuperAdminTenantsView } from './components/admin/SuperAdminTenantsView';
import { SuperAdminRevenueView } from './components/admin/SuperAdminRevenueView';
import { SuperAdminPlansView } from './components/admin/SuperAdminPlansView';

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a DemoUser from stored auth synchronously.
 * Called in useState initializer — no async, no useEffect needed.
 */
function buildUserFromStorage(): DemoUser | null {
  const stored = getStoredAuth();
  if (!stored?.token) return null;
  return {
    id: stored.userId,
    name: stored.name || 'User',
    email: stored.email || '',
    role: stored.role as DemoUser['role'],
    token: stored.token,
  };
}

/**
 * Validate stored token against the server.
 * Uses GET /api/users/me (exists for STAFF / SHOP_OWNER / SUPER_ADMIN roles).
 * For CUSTOMER role, uses GET /api/portal/me (customer self-profile).
 * Returns the enriched user on success, null on 401/403/network error.
 */
async function validateToken(user: DemoUser): Promise<DemoUser | null> {
  try {
    // Choose appropriate validation endpoint by role
    const endpoint =
      user.role === 'CUSTOMER' ? '/api/portal/me' : '/api/users/me';

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${user.token}` },
    });

    if (!res.ok) return null; // 401 expired, 403 wrong role, etc.

    const json = await res.json();
    const serverUser = json.data;

    if (!serverUser) return user; // endpoint returned 200 but no body — trust stored data

    // Enrich stored user with fresh server data
    return {
      ...user,
      name: serverUser.firstName
        ? `${serverUser.firstName} ${serverUser.lastName}`.trim()
        : user.name,
      email: serverUser.email || user.email,
    };
  } catch {
    // Network error — allow offline-ish use: trust the stored token
    return user;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Map role → default redirect URL after login */
export function defaultRouteForRole(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return '/admin/tenants';
    case 'SHOP_OWNER':  return '/dashboard/home';
    case 'STAFF':       return '/dashboard/tasks';
    case 'CUSTOMER':    return '/portal/marketplace';
    default:            return '/dashboard/home';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Full-screen loading spinner (shown during bootstrap)
// ─────────────────────────────────────────────────────────────────────────────
function BootLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        <p className="text-sm text-text-muted">Loading your workspace…</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute — guards any subtree that requires authentication.
// Renders children when authenticated; redirects to /login when not.
// ─────────────────────────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  currentUser: DemoUser | null;
  bootstrapping: boolean;
  /** Optional role check — redirects away if the user's role isn't in the list */
  allowedRoles?: DemoUser['role'][];
  /** Where to redirect if role check fails (default: role's home) */
  redirectTo?: string;
}

function ProtectedRoute({
  currentUser,
  bootstrapping,
  allowedRoles,
  redirectTo,
}: ProtectedRouteProps) {
  if (bootstrapping) return <BootLoader />;
  if (!currentUser) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    const target = redirectTo ?? defaultRouteForRole(currentUser.role);
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Marketplace Storefront sub-route (handles /marketplace/:shopId)
// ─────────────────────────────────────────────────────────────────────────────
function MarketplaceStorefrontRoute({ onStartOrder }: { onStartOrder?: (tenantId: string) => void }) {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  if (!shopId) return <Navigate to=".." replace />;
  return (
    <PublicShopStorefrontView
      shopId={shopId}
      onBack={() => navigate(-1)}
      onStartOrder={onStartOrder ?? (() => {})}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Owner Dashboard Shell — layout + sidebar nav for SHOP_OWNER / STAFF
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardShellProps {
  currentUser: DemoUser;
  demoUsers: DemoUser[];
  onUserChange: (u: DemoUser) => void;
  onLogout: () => void;
}

function DashboardShell({ currentUser, demoUsers, onUserChange, onLogout }: DashboardShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isOwner = currentUser.role === 'SHOP_OWNER';

  // Derive active nav id from the URL path segment
  const pathSegment = location.pathname.split('/dashboard/')[1]?.split('/')[0] ?? '';
  const activeNavId = (pathSegment === 'home' ? 'dashboard' : pathSegment) || (isOwner ? 'dashboard' : 'tasks');

  const getPageTitle = () => {
    switch (activeNavId) {
      case 'home':
      case 'dashboard':   return 'Dashboard';
      case 'orders':      return 'All Orders';
      case 'customers':   return 'Customers';
      case 'measurements':return 'Measurements';
      case 'fabric':      return 'Fabric Inventory';
      case 'staff':       return 'Staff';
      case 'products':    return 'Products & Services';
      case 'billing':     return 'Billing & Invoices';
      case 'reports':     return 'Reports';
      case 'marketplace-settings': return 'Marketplace Profile Settings';
      case 'marketplace': return 'Marketplace Directory';
      case 'settings':    return 'Settings';
      case 'tasks':       return 'My Work & Tasks';
      default:            return 'Dashboard';
    }
  };

  const handleNavigate = (target: string) => {
    // If target is already a full URL path (e.g. '/dashboard/home'), navigate directly
    if (target.startsWith('/')) {
      navigate(target);
      return;
    }
    // Map nav IDs to URL paths
    const idToPath: Record<string, string> = {
      dashboard: '/dashboard/home',
      home: '/dashboard/home',
      orders: '/dashboard/orders',
      customers: '/dashboard/customers',
      measurements: '/dashboard/measurements',
      fabric: '/dashboard/fabric',
      staff: '/dashboard/staff',
      products: '/dashboard/products',
      billing: '/dashboard/billing',
      reports: '/dashboard/reports',
      'marketplace-settings': '/dashboard/marketplace-settings',
      marketplace: '/dashboard/marketplace',
      settings: '/dashboard/settings',
      tasks: '/dashboard/tasks',
    };
    navigate(idToPath[target] ?? `/dashboard/${target}`);
  };

  return (
    <AppShell
      pageTitle={getPageTitle()}
      breadcrumb={isOwner ? 'DarziDesk Owner' : 'DarziDesk Workshop'}
      activeNavId={activeNavId}
      onNavigate={handleNavigate}
      currentUser={currentUser}
      onSelectPersona={(u) => {
        onUserChange(u);
        navigate(defaultRouteForRole(u.role));
      }}
      demoUsers={demoUsers}
      onLogout={onLogout}
    >
      <Outlet />
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff Work Queue page (used inside dashboard routes for STAFF role)
// ─────────────────────────────────────────────────────────────────────────────
function StaffTasksPage({ currentUser }: { currentUser: DemoUser }) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [globalSearch, setGlobalSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchOrders = useCallback(async (token: string, status: OrderStatus | 'ALL') => {
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      let url = '/api/staff/me/orders?sort=estimatedDeliveryDate&order=asc&limit=50';
      if (status !== 'ALL') url += `&status=${status}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Failed to load orders (${res.status})`);
      const json = await res.json();
      setOrders(json.data || []);
    } catch (err: any) {
      setOrdersError(err.message || 'Error loading orders queue');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchSummary = useCallback(async (token: string) => {
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/staff/me/summary', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setSummary(json.data);
      }
    } catch (err) {
      console.warn('Error loading daily summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(currentUser.token, selectedStatus);
    fetchSummary(currentUser.token);
  }, [currentUser.token, selectedStatus, refreshTrigger, fetchOrders, fetchSummary]);

  const handleOrderUpdated = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div className="space-y-6">
      <StaffKpiCards
        orders={orders}
        summary={summary}
        currentUser={currentUser}
        loading={loadingSummary}
      />
      {ordersError ? (
        <div className="p-4 bg-error-light border border-error/30 rounded-xl text-error text-sm font-medium">
          {ordersError}
        </div>
      ) : (
        <StaffWorkQueue
          orders={orders}
          loading={loadingOrders}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          onSelectOrder={setSelectedOrder}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
        />
      )}

      {/* Order detail drawer */}
      <Drawer
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        title={
          selectedOrder && (
            <div className="flex items-center gap-2.5">
              <span>ORDER #{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
              <StatusBadge status={selectedOrder.status} size="sm" />
            </div>
          )
        }
        subtitle={
          selectedOrder &&
          `${selectedOrder.garmentType} for ${
            selectedOrder.customer
              ? `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName}`
              : 'Customer'
          }`
        }
      >
        {selectedOrder && (
          <OrderDetailView
            orderId={selectedOrder.id}
            authToken={currentUser.token}
            onOrderUpdated={handleOrderUpdated}
          />
        )}
      </Drawer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer Portal Shell
// ─────────────────────────────────────────────────────────────────────────────
function PortalShell({ currentUser, demoUsers, onUserChange, onLogout }: DashboardShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPortalOrder, setSelectedPortalOrder] = useState<CustomerPortalOrder | null>(null);
  const [selectedCatalogTenantId, setSelectedCatalogTenantId] = useState<string | null>(null);

  const pathSegment = location.pathname.split('/portal/')[1]?.split('/')[0] ?? 'marketplace';
  const activeNavId = pathSegment || 'marketplace';

  const getPageTitle = () => {
    switch (activeNavId) {
      case 'marketplace':  return 'Explore Bespoke Ateliers';
      case 'orders':       return selectedPortalOrder ? `Order #${selectedPortalOrder.id.slice(0, 8).toUpperCase()}` : 'My Orders';
      case 'catalog':      return 'Shop Catalog & Order';
      case 'measurements': return 'My Measurements';
      case 'invoices':     return 'My Invoices';
      default:             return 'Customer Portal';
    }
  };

  const handleNavigate = (target: string) => {
    if (target.startsWith('/')) {
      navigate(target);
      setSelectedPortalOrder(null);
      return;
    }
    const idToPath: Record<string, string> = {
      marketplace: '/portal/marketplace',
      orders: '/portal/orders',
      catalog: '/portal/catalog',
      measurements: '/portal/measurements',
      invoices: '/portal/invoices',
    };
    navigate(idToPath[target] ?? `/portal/${target}`);
    setSelectedPortalOrder(null);
  };

  return (
    <AppShell
      pageTitle={getPageTitle()}
      breadcrumb="DarziDesk Bespoke Portal"
      activeNavId={activeNavId}
      onNavigate={handleNavigate}
      currentUser={currentUser}
      onSelectPersona={(u) => { onUserChange(u); navigate(defaultRouteForRole(u.role)); }}
      demoUsers={demoUsers}
      onLogout={onLogout}
    >
      <Routes>
        <Route index element={<Navigate to="/portal/marketplace" replace />} />
        <Route
          path="marketplace"
          element={
            <MarketplaceDiscoveryView
              onSelectShop={(shop) => navigate(`/portal/marketplace/${shop.id}`)}
            />
          }
        />
        <Route
          path="marketplace/:shopId"
          element={
            <MarketplaceStorefrontRoute
              onStartOrder={(tenantId) => {
                setSelectedCatalogTenantId(tenantId);
                navigate('/portal/catalog');
              }}
            />
          }
        />
        <Route
          path="orders"
          element={
            !selectedPortalOrder ? (
              <CustomerOrdersView
                authToken={currentUser.token}
                onSelectOrder={setSelectedPortalOrder}
                onNavigateToCatalog={() => navigate('/portal/catalog')}
              />
            ) : (
              <CustomerOrderDetailView
                orderId={selectedPortalOrder.id}
                authToken={currentUser.token}
                onBack={() => setSelectedPortalOrder(null)}
              />
            )
          }
        />
        <Route
          path="catalog"
          element={
            <ShopCatalogView
              authToken={currentUser.token}
              defaultTenantId={selectedCatalogTenantId || undefined}
              onOrderCreated={() => {
                navigate('/portal/orders');
                setSelectedPortalOrder(null);
              }}
            />
          }
        />
        <Route
          path="measurements"
          element={
            <CustomerMeasurementsView
              authToken={currentUser.token}
              onNavigateToCatalog={() => navigate('/portal/catalog')}
            />
          }
        />
        <Route path="invoices" element={<CustomerInvoicesView authToken={currentUser.token} />} />
        <Route path="*" element={<Navigate to="/portal/marketplace" replace />} />
      </Routes>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Super Admin Shell
// ─────────────────────────────────────────────────────────────────────────────
function AdminShell({ currentUser, demoUsers, onUserChange, onLogout }: DashboardShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedMarketplaceShopId, setSelectedMarketplaceShopId] = useState<string | null>(null);

  const pathSegment = location.pathname.split('/admin/')[1]?.split('/')[0] ?? '';
  const activeNavId = pathSegment
    ? (pathSegment === 'moderation' || pathSegment === 'marketplace' ? pathSegment : `admin-${pathSegment}`)
    : 'admin-tenants';

  const getPageTitle = () => {
    switch (activeNavId) {
      case 'admin-tenants':  return 'Tenants & Shops';
      case 'admin-revenue':  return 'Revenue & Growth';
      case 'admin-plans':    return 'Subscription Plans';
      case 'admin-moderation': return 'Marketplace Moderation';
      case 'admin-marketplace': return selectedMarketplaceShopId ? 'Shop Storefront' : 'Public Directory';
      default:               return 'Platform Administration';
    }
  };

  const handleNavigate = (target: string) => {
    if (target.startsWith('/')) {
      navigate(target);
      setSelectedMarketplaceShopId(null);
      return;
    }
    const path = target.startsWith('admin-') ? `/admin/${target.slice(6)}` : `/admin/${target}`;
    const idToPath: Record<string, string> = {
      'admin-tenants':    '/admin/tenants',
      'admin-revenue':    '/admin/revenue',
      'admin-plans':      '/admin/plans',
      'moderation':       '/admin/moderation',
      'marketplace':      '/admin/marketplace',
    };
    navigate(idToPath[target] ?? path);
    setSelectedMarketplaceShopId(null);
  };

  return (
    <AppShell
      pageTitle={getPageTitle()}
      breadcrumb="DarziDesk Platform Admin"
      activeNavId={activeNavId}
      onNavigate={handleNavigate}
      currentUser={currentUser}
      onSelectPersona={(u) => { onUserChange(u); navigate(defaultRouteForRole(u.role)); }}
      demoUsers={demoUsers}
      onLogout={onLogout}
    >
      <Routes>
        <Route index element={<Navigate to="/admin/tenants" replace />} />
        <Route path="tenants" element={<SuperAdminTenantsView authToken={currentUser.token} />} />
        <Route path="revenue" element={<SuperAdminRevenueView authToken={currentUser.token} />} />
        <Route path="plans" element={<SuperAdminPlansView authToken={currentUser.token} />} />
        <Route
          path="moderation"
          element={
            <SuperAdminModerationView
              authToken={currentUser.token}
              onPreviewStorefront={(tenantId) => {
                setSelectedMarketplaceShopId(tenantId);
                navigate('/admin/marketplace');
              }}
            />
          }
        />
        <Route
          path="marketplace"
          element={
            !selectedMarketplaceShopId ? (
              <MarketplaceDiscoveryView onSelectShop={(shop) => setSelectedMarketplaceShopId(shop.id)} />
            ) : (
              <PublicShopStorefrontView
                shopId={selectedMarketplaceShopId}
                onBack={() => setSelectedMarketplaceShopId(null)}
                onStartOrder={() => { alert('Switch to Customer persona to test placing a bespoke order.'); }}
              />
            )
          }
        />
        <Route path="*" element={<Navigate to="/admin/tenants" replace />} />
      </Routes>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Marketplace route (unauthenticated)
// ─────────────────────────────────────────────────────────────────────────────
function PublicMarketplaceRoute() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-16">
        <Routes>
          <Route
            index
            element={
              <MarketplaceDiscoveryView
                onSelectShop={(shop) => navigate(`/marketplace/${shop.id}`)}
              />
            }
          />
          <Route
            path=":shopId"
            element={
              <MarketplaceStorefrontRoute
                onStartOrder={() => { window.location.href = '/login'; }}
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();

  // ── 1. Synchronous init — eliminates the null-flash race on page refresh ──
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(buildUserFromStorage);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);

  // ── 2. Bootstrapping gate — true while token is being validated ──────────
  //    Protected routes show <BootLoader /> instead of redirecting
  const [bootstrapping, setBootstrapping] = useState(true);

  // ── 3. Boot: validate stored token + optionally load dev personas ─────────
  useEffect(() => {
    const boot = async () => {
      // Validate any stored token against the server
      if (currentUser) {
        const validated = await validateToken(currentUser);
        if (!validated) {
          // Token is expired or revoked — clear and force login
          clearStoredAuth();
          setCurrentUser(null);
        } else {
          setCurrentUser(validated);
        }
      }
      setBootstrapping(false);
    };

    // In DEV: also load demo personas for the switcher
    if (import.meta.env.DEV) {
      fetch('/api/dev/demo-session')
        .then((res) => res.json())
        .then((json: any) => {
          const payload: DemoSessionData = json.data || json;
          if (payload.users?.length > 0) {
            setDemoUsers(payload.users);
          }
        })
        .catch((err) => console.warn('Could not fetch dev demo sessions:', err))
        .finally(() => boot());
    } else {
      boot();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount only

  // ── 4. Sync auth from storage (cross-tab + LoginPage callback) ────────────
  useEffect(() => {
    const syncFromStorage = () => {
      const stored = getStoredAuth();
      if (stored?.token) {
        // Try to match to a richer demo persona if available
        const match = demoUsers.find(
          (u) =>
            u.id === stored.userId ||
            (stored.email && u.email.toLowerCase() === stored.email.toLowerCase()),
        );
        setCurrentUser(
          match ?? {
            id: stored.userId,
            name: stored.name || 'User',
            email: stored.email || '',
            role: stored.role as DemoUser['role'],
            token: stored.token,
          },
        );
      } else {
        setCurrentUser(null);
      }
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('darzi-auth-change', syncFromStorage);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('darzi-auth-change', syncFromStorage);
    };
  }, [demoUsers]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUserChange = (newUser: DemoUser) => {
    setCurrentUser(newUser);
    setStoredAuth({
      token: newUser.token,
      role: newUser.role,
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
    });
  };

  const handleLogout = () => {
    clearStoredAuth();
    setCurrentUser(null);
    navigate('/login');
  };

  // ── Shared shell props ────────────────────────────────────────────────────
  const shellProps = {
    currentUser: currentUser!,
    demoUsers,
    onUserChange: handleUserChange,
    onLogout: handleLogout,
  };

  return (
    <Routes>
      {/* ── Public routes ──────────────────────────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <LoginPage
            onLogin={(user) => {
              setCurrentUser(user);
            }}
          />
        }
      />
      <Route path="/marketplace/*" element={<PublicMarketplaceRoute />} />

      {/* ── Dashboard (Owner + Staff) ────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute
            currentUser={currentUser}
            bootstrapping={bootstrapping}
            allowedRoles={['SHOP_OWNER', 'STAFF']}
            redirectTo="/login"
          />
        }
      >
        <Route
          path="/dashboard"
          element={<DashboardShell {...shellProps} currentUser={currentUser!} />}
        >
          {/* Owner routes */}
          <Route index element={
            currentUser?.role === 'SHOP_OWNER'
              ? <Navigate to="/dashboard/home" replace />
              : <Navigate to="/dashboard/tasks" replace />
          } />
          <Route
            path="home"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerDashboardView
                  authToken={currentUser.token}
                  currentUser={currentUser}
                  onNavigate={(id) => navigate(id.startsWith('/') ? id : `/dashboard/${id === 'dashboard' ? 'home' : id}`)}
                />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route
            path="orders"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerOrdersView authToken={currentUser!.token} />
              ) : (
                <StaffTasksPage currentUser={currentUser!} />
              )
            }
          />
          <Route path="customers" element={<CustomerDirectoryView authToken={currentUser?.token ?? ''} />} />
          <Route path="measurements" element={<CustomerDirectoryView authToken={currentUser?.token ?? ''} />} />
          <Route
            path="fabric"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerFabricView authToken={currentUser.token} />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route
            path="staff"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerStaffView authToken={currentUser.token} />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route
            path="billing"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerInvoicesView authToken={currentUser.token} />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route path="products" element={<PlaceholderView viewId="products" />} />
          <Route path="reports" element={<PlaceholderView viewId="reports" />} />
          <Route path="settings" element={<PlaceholderView viewId="settings" />} />
          <Route
            path="marketplace-settings"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerMarketplaceSettingsView
                  authToken={currentUser.token}
                  onPreviewStorefront={(tenantId) => navigate(`/dashboard/marketplace/${tenantId}`)}
                />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route
            path="marketplace"
            element={
              <MarketplaceDiscoveryView
                onSelectShop={(shop) => navigate(`/dashboard/marketplace/${shop.id}`)}
              />
            }
          />
          <Route
            path="marketplace/:shopId"
            element={
              <MarketplaceStorefrontRoute
                onStartOrder={() => { alert('Switch to Customer persona to test placing a bespoke order.'); }}
              />
            }
          />
          {/* Staff tasks (default Staff landing) */}
          <Route path="tasks" element={<StaffTasksPage currentUser={currentUser!} />} />
          <Route path="*" element={<Navigate to={currentUser?.role === 'SHOP_OWNER' ? '/dashboard/home' : '/dashboard/tasks'} replace />} />
        </Route>
      </Route>

      {/* ── Customer Portal ─────────────────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute
            currentUser={currentUser}
            bootstrapping={bootstrapping}
            allowedRoles={['CUSTOMER']}
            redirectTo="/login"
          />
        }
      >
        <Route
          path="/portal/*"
          element={<PortalShell {...shellProps} currentUser={currentUser!} />}
        />
      </Route>

      {/* ── Super Admin ─────────────────────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute
            currentUser={currentUser}
            bootstrapping={bootstrapping}
            allowedRoles={['SUPER_ADMIN']}
            redirectTo={currentUser ? defaultRouteForRole(currentUser.role) : '/login'}
          />
        }
      >
        <Route
          path="/admin/*"
          element={<AdminShell {...shellProps} currentUser={currentUser!} />}
        />
      </Route>

      {/* ── Top-Level Route Aliases (Direct URL convenience) ────────────────── */}
      <Route path="/orders" element={<Navigate to={currentUser?.role === 'CUSTOMER' ? '/portal/orders' : '/dashboard/orders'} replace />} />
      <Route path="/customers" element={<Navigate to="/dashboard/customers" replace />} />
      <Route path="/measurements" element={<Navigate to={currentUser?.role === 'CUSTOMER' ? '/portal/measurements' : '/dashboard/measurements'} replace />} />
      <Route path="/fabric" element={<Navigate to="/dashboard/fabric" replace />} />
      <Route path="/fabric-inventory" element={<Navigate to="/dashboard/fabric" replace />} />
      <Route path="/staff" element={<Navigate to="/dashboard/staff" replace />} />
      <Route path="/billing" element={<Navigate to={currentUser?.role === 'CUSTOMER' ? '/portal/invoices' : '/dashboard/billing'} replace />} />
      <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
