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
  useOutletContext,
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
import { useSubscription } from './hooks/useSubscription';
import { LockedFeaturePaywall } from './components/common/LockedFeaturePaywall';
import { UpgradePlanModal } from './components/dashboard/UpgradePlanModal';

// ── Landing & Public Pages ───────────────────────────────────────────────────
import { LandingPage } from './components/landing/LandingPage';
import { ForOwnersPage } from './components/landing/ForOwnersPage';
import { ForCustomersPage } from './components/landing/ForCustomersPage';
import { FeaturesPage } from './components/landing/FeaturesPage';
import { PricingPage } from './components/landing/PricingPage';
import { AboutPage } from './components/landing/AboutPage';
import { PublicMarketplacePage } from './components/landing/PublicMarketplacePage';
import { PublicNavbar } from './components/landing/PublicNavbar';
import { PublicFooter } from './components/landing/PublicFooter';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginPage, getStoredAuth, setStoredAuth, clearStoredAuth, decodeJwtPayload } from './components/landing/LoginPage';

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
import { MeasurementsDirectoryView } from './components/dashboard/MeasurementsDirectoryView';
import { Drawer } from './components/common/Drawer';
import { OrderDetailView } from './components/dashboard/OrderDetailView';
import { StatusBadge } from './components/common/StatusBadge';

// ── Owner Views ──────────────────────────────────────────────────────────────
import { OwnerDashboardView } from './components/dashboard/OwnerDashboardView';
import { OwnerOrdersView } from './components/dashboard/OwnerOrdersView';
import { OwnerFabricView } from './components/dashboard/OwnerFabricView';
import { OwnerStaffView } from './components/dashboard/OwnerStaffView';
import { OwnerInvoicesView } from './components/invoices/OwnerInvoicesView';
import { ProductsAndServicesView } from './components/dashboard/ProductsAndServicesView';
import { OwnerSettingsView } from './components/dashboard/OwnerSettingsView';
import { OwnerReportsView } from './components/dashboard/OwnerReportsView';
import { NewOrderDrawer } from './components/dashboard/NewOrderDrawer';

// ── Marketplace & Administration Views ───────────────────────────────────────
import { MarketplaceDiscoveryView } from './components/marketplace/MarketplaceDiscoveryView';
import { PublicShopStorefrontView } from './components/marketplace/PublicShopStorefrontView';
import { OwnerMarketplaceSettingsView } from './components/marketplace/OwnerMarketplaceSettingsView';
import { SuperAdminModerationView } from './components/marketplace/SuperAdminModerationView';
import { SuperAdminTenantsView } from './components/admin/SuperAdminTenantsView';
import { SuperAdminRevenueView } from './components/admin/SuperAdminRevenueView';
import { SuperAdminPlansView } from './components/admin/SuperAdminPlansView';
import { SupportModeBanner } from './components/admin/SupportModeBanner';
import { SuperAdminDashboardView } from './components/admin/SuperAdminDashboardView';
import { SuperAdminSupportSessionsView } from './components/admin/SuperAdminSupportSessionsView';
import { SuperAdminAuditLogsView } from './components/admin/SuperAdminAuditLogsView';
import { SuperAdminFeatureFlagsView } from './components/admin/SuperAdminFeatureFlagsView';
import { SuperAdminOperationsView } from './components/admin/SuperAdminOperationsView';

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Check whether a JWT has passed its expiration timestamp */
function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return false;
  }
}

/**
 * Build a DemoUser from stored auth synchronously.
 * Called in useState initializer — no async, no useEffect needed.
 */
function buildUserFromStorage(): DemoUser | null {
  const stored = getStoredAuth();
  if (!stored?.token) return null;
  if (isTokenExpired(stored.token)) {
    clearStoredAuth();
    return null;
  }
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
 * Returns the enriched user on success.
 * ONLY returns null on explicit 401/403 credentials rejection or expired token.
 */
async function validateToken(user: DemoUser): Promise<DemoUser | null> {
  // 1. Immediate client-side expiration check
  if (isTokenExpired(user.token)) {
    return null;
  }

  try {
    // Choose appropriate validation endpoint by role
    const endpoint =
      user.role === 'CUSTOMER' ? '/api/portal/me' : '/api/users/me';

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${user.token}` },
    });

    // Explicit 401/403 means credentials rejected by server
    if (res.status === 401 || res.status === 403) {
      return null;
    }

    // For 429 (rate-limited) or 500 (server temporary error), do NOT log user out
    if (!res.ok) {
      return user;
    }

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
    // Network error — allow offline/slow connections: trust the stored token
    return user;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Map role → default redirect URL after login */
export function defaultRouteForRole(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return '/admin/dashboard';
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
  currentUser: DemoUser | null;
  demoUsers: DemoUser[];
  onUserChange: (u: DemoUser) => void;
  onLogout: () => void;
}

function OwnerHomeRouteWrapper({ authToken, currentUser }: { authToken: string; currentUser: DemoUser | null }) {
  const navigate = useNavigate();
  const context = useOutletContext<{
    subscription: any;
    openUpgradeModal: (plan?: string) => void;
  }>();

  if (!currentUser) return null;

  return (
    <OwnerDashboardView
      authToken={authToken}
      currentUser={currentUser}
      planName={context?.subscription?.plan?.name ?? 'Basic'}
      lockedCount={context?.subscription?.lockedFeatures?.length ?? 0}
      isTrial={context?.subscription?.isTrial}
      trialDaysRemaining={context?.subscription?.trialDaysRemaining}
      onOpenUpgrade={() => context?.openUpgradeModal?.('Pro')}
      onNavigate={(id) =>
        navigate(id.startsWith('/') ? id : `/dashboard/${id === 'dashboard' ? 'home' : id}`)
      }
    />
  );
}

function DashboardShell({ currentUser, demoUsers, onUserChange, onLogout }: DashboardShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const isOwner = currentUser.role === 'SHOP_OWNER';

  const {
    subscription,
    isFeatureLocked,
    upgradePlan,
    isUpgradeModalOpen,
    openUpgradeModal,
    closeUpgradeModal,
    targetUpgradePlan,
  } = useSubscription(currentUser?.token, isOwner);

  // Derive active nav id from the URL path segment
  const pathSegment = location.pathname.split('/dashboard/')[1]?.split('/')[0] ?? '';
  const activeNavId = (pathSegment === 'home' ? 'dashboard' : pathSegment) || (isOwner ? 'dashboard' : 'tasks');

  const isCurrentViewLocked = isOwner && isFeatureLocked(activeNavId);

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
    <>
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
        lockedFeatures={subscription?.lockedFeatures}
        planName={subscription?.plan.name}
        isTrial={subscription?.isTrial}
        trialDaysRemaining={subscription?.trialDaysRemaining}
        onOpenUpgrade={() => openUpgradeModal('Pro')}
      >
        {isCurrentViewLocked ? (
          <LockedFeaturePaywall
            featureId={activeNavId}
            onUpgrade={() => openUpgradeModal('Pro')}
          />
        ) : (
          <Outlet context={{ subscription, openUpgradeModal }} />
        )}
      </AppShell>

      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        currentPlanName={subscription?.plan.name ?? 'Basic'}
        initialSelectedPlan={targetUpgradePlan}
        onUpgrade={async (planName, billingCycle, paymentMethod) => {
          const res = await upgradePlan(planName, billingCycle, paymentMethod);
          return Boolean(res);
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff Work Queue page (used inside dashboard routes for STAFF role)
// ─────────────────────────────────────────────────────────────────────────────
function StaffTasksPage({ currentUser }: { currentUser: DemoUser | null }) {
  if (!currentUser) return null;

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [globalSearch, setGlobalSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
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
    if (!currentUser?.token) return;
    fetchOrders(currentUser.token, selectedStatus);
    fetchSummary(currentUser.token);
  }, [currentUser?.token, selectedStatus, refreshTrigger, fetchOrders, fetchSummary]);

  const handleOrderUpdated = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Tailoring Workshop</h2>
          <p className="text-xs text-slate-500 mt-0.5">Assigned work queue and order progress</p>
        </div>
        <button
          onClick={() => setIsNewOrderOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Order
        </button>
      </div>

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

      {/* New Order Drawer */}
      <NewOrderDrawer
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        onOrderCreated={() => {
          handleOrderUpdated();
          setIsNewOrderOpen(false);
        }}
        authToken={currentUser.token}
      />
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

  if (!currentUser) return null;

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

  if (!currentUser) return null;

  const pathSegment = location.pathname.split('/admin/')[1]?.split('/')[0] ?? '';
  const activeNavId = pathSegment
    ? (pathSegment === 'moderation' || pathSegment === 'marketplace' ? pathSegment : `admin-${pathSegment}`)
    : 'admin-tenants';

  const getPageTitle = () => {
    switch (activeNavId) {
      case 'admin-dashboard': return 'Platform Dashboard';
      case 'admin-tenants':  return 'Tenants & Shops';
      case 'admin-revenue':  return 'Revenue & Growth';
      case 'admin-plans':    return 'Subscription Plans';
      case 'admin-support-sessions': return 'Support Sessions';
      case 'admin-audit':    return 'Platform Audit Logs';
      case 'admin-feature-flags': return 'Feature Flags & Overrides';
      case 'admin-operations': return 'System Operations & Health';
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
      'admin-dashboard':  '/admin/dashboard',
      'admin-tenants':    '/admin/tenants',
      'admin-revenue':    '/admin/revenue',
      'admin-plans':      '/admin/plans',
      'admin-support-sessions': '/admin/support-sessions',
      'admin-audit':      '/admin/audit',
      'admin-feature-flags': '/admin/feature-flags',
      'admin-operations': '/admin/operations',
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
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboardView authToken={currentUser.token} onNavigate={handleNavigate} />} />
        <Route path="tenants" element={<SuperAdminTenantsView authToken={currentUser.token} />} />
        <Route path="revenue" element={<SuperAdminRevenueView authToken={currentUser.token} />} />
        <Route path="plans" element={<SuperAdminPlansView authToken={currentUser.token} />} />
        <Route path="support-sessions" element={<SuperAdminSupportSessionsView authToken={currentUser.token} />} />
        <Route path="audit" element={<SuperAdminAuditLogsView authToken={currentUser.token} />} />
        <Route path="feature-flags" element={<SuperAdminFeatureFlagsView authToken={currentUser.token} />} />
        <Route path="operations" element={<SuperAdminOperationsView authToken={currentUser.token} />} />
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
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Marketplace route (unauthenticated)
// ─────────────────────────────────────────────────────────────────────────────
function PublicMarketplaceStorefrontRoute() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  if (!shopId) return <Navigate to="/marketplace" replace />;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden flex flex-col justify-between">
      <PublicNavbar />
      <main className="flex-1 pt-28 pb-16 lg:pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <PublicShopStorefrontView
          shopId={shopId}
          onBack={() => navigate('/marketplace')}
          onStartOrder={(tenantId) => navigate(`/login?mode=register&shopId=${tenantId}`)}
        />
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicMarketplaceRoute() {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route
        index
        element={
          <PublicMarketplacePage
            onSelectShop={(shop) => navigate(`/marketplace/${shop.id}`)}
          />
        }
      />
      <Route
        path=":shopId"
        element={<PublicMarketplaceStorefrontRoute />}
      />
    </Routes>
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
        setCurrentUser({
          id: stored.userId,
          name: stored.name || match?.name || 'User',
          email: stored.email || match?.email || '',
          role: (stored.role || match?.role) as DemoUser['role'],
          token: stored.token,
        });
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
    currentUser: currentUser,
    demoUsers,
    onUserChange: handleUserChange,
    onLogout: handleLogout,
  };

  return (
    <ErrorBoundary>
      <SupportModeBanner />
      <ScrollToTop />
      <Routes>
        {/* ── Public routes ──────────────────────────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/for-owners" element={<ForOwnersPage />} />
        <Route path="/for-customers" element={<ForCustomersPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
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
          />
        }
      >
        <Route
          path="/dashboard"
          element={<DashboardShell {...shellProps} currentUser={currentUser} />}
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
                <OwnerHomeRouteWrapper
                  authToken={currentUser?.token ?? ''}
                  currentUser={currentUser}
                />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route
            path="orders"
            element={<OwnerOrdersView authToken={currentUser?.token ?? ''} />}
          />
          <Route path="customers" element={<CustomerDirectoryView authToken={currentUser?.token ?? ''} />} />
          <Route path="measurements" element={<MeasurementsDirectoryView authToken={currentUser?.token ?? ''} />} />
          <Route
            path="fabric"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerFabricView authToken={currentUser?.token ?? ''} />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route
            path="staff"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerStaffView authToken={currentUser?.token ?? ''} />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route
            path="billing"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerInvoicesView authToken={currentUser?.token ?? ''} />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route
            path="products"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <ProductsAndServicesView authToken={currentUser?.token ?? ''} />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route
            path="reports"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerReportsView authToken={currentUser?.token ?? ''} />
              ) : (
                <Navigate to="/dashboard/tasks" replace />
              )
            }
          />
          <Route path="settings" element={<OwnerSettingsView authToken={currentUser?.token ?? ''} />} />
          <Route
            path="marketplace-settings"
            element={
              currentUser?.role === 'SHOP_OWNER' ? (
                <OwnerMarketplaceSettingsView
                  authToken={currentUser?.token ?? ''}
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
          <Route path="tasks" element={<StaffTasksPage currentUser={currentUser} />} />
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
          />
        }
      >
        <Route
          path="/portal/*"
          element={<PortalShell {...shellProps} currentUser={currentUser} />}
        />
      </Route>

      {/* ── Super Admin ─────────────────────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute
            currentUser={currentUser}
            bootstrapping={bootstrapping}
            allowedRoles={['SUPER_ADMIN']}
          />
        }
      >
        <Route
          path="/admin/*"
          element={<AdminShell {...shellProps} currentUser={currentUser} />}
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
      <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
      <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
