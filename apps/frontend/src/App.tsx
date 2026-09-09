import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { LoginPage, getStoredAuth, clearStoredAuth } from './components/landing/LoginPage';

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
// Authenticated shell (OWNER / STAFF / SUPER_ADMIN / CUSTOMER)
// Receives the currentUser and demoUsers from App-level state.
// ─────────────────────────────────────────────────────────────────────────────

interface AuthenticatedShellProps {
  currentUser: DemoUser;
  demoUsers: DemoUser[];
  onUserChange: (u: DemoUser) => void;
  onLogout: () => void;
}

function AuthenticatedShell({ currentUser, demoUsers, onUserChange, onLogout: _onLogout }: AuthenticatedShellProps) {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isOwner = currentUser.role === 'SHOP_OWNER';
  const isCustomer = currentUser.role === 'CUSTOMER';

  const [activeNavId, setActiveNavId] = useState<string>(() => {
    if (isSuperAdmin) return 'admin-tenants';
    if (isOwner) return 'dashboard';
    if (isCustomer) return 'marketplace';
    return 'tasks';
  });

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [selectedPortalOrder, setSelectedPortalOrder] = useState<CustomerPortalOrder | null>(null);
  const [selectedCatalogTenantId, setSelectedCatalogTenantId] = useState<string | null>(null);
  const [selectedMarketplaceShopId, setSelectedMarketplaceShopId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Reset nav when user role changes
  useEffect(() => {
    if (isSuperAdmin) setActiveNavId('admin-tenants');
    else if (isOwner) setActiveNavId('dashboard');
    else if (isCustomer) setActiveNavId('marketplace');
    else setActiveNavId('tasks');
    setSelectedOrder(null);
    setSelectedPortalOrder(null);
    setSelectedMarketplaceShopId(null);
  }, [currentUser.id, currentUser.role, isSuperAdmin, isOwner, isCustomer]);

  const fetchOrders = useCallback(
    async (token: string, status: OrderStatus | 'ALL') => {
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
    },
    [],
  );

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
    if (!currentUser || isOwner || isCustomer || isSuperAdmin) return;
    fetchOrders(currentUser.token, selectedStatus);
    fetchSummary(currentUser.token);
  }, [currentUser, selectedStatus, refreshTrigger, isOwner, isCustomer, isSuperAdmin, fetchOrders, fetchSummary]);

  const handleOrderUpdated = () => setRefreshTrigger((prev) => prev + 1);

  const getPageTitle = () => {
    if (isSuperAdmin) {
      switch (activeNavId) {
        case 'moderation': return 'Marketplace Moderation';
        case 'marketplace': return selectedMarketplaceShopId ? 'Shop Storefront' : 'Marketplace Directory';
        default: return 'Platform Administration';
      }
    } else if (isCustomer) {
      switch (activeNavId) {
        case 'marketplace': return selectedMarketplaceShopId ? 'Shop Storefront' : 'Explore Bespoke Ateliers';
        case 'orders': return selectedPortalOrder ? `Order #${selectedPortalOrder.id.slice(0, 8).toUpperCase()}` : 'My Orders';
        case 'catalog': return 'Shop Catalog & Order';
        case 'measurements': return 'My Measurements';
        case 'invoices': return 'My Invoices';
        default: return 'Customer Portal';
      }
    } else if (isOwner) {
      switch (activeNavId) {
        case 'dashboard': return 'Dashboard';
        case 'orders': return 'All Orders';
        case 'customers': return 'Customers';
        case 'measurements': return 'Measurements';
        case 'fabric': return 'Fabric Inventory';
        case 'staff': return 'Staff';
        case 'products': return 'Products & Services';
        case 'billing': return 'Billing & Invoices';
        case 'reports': return 'Reports';
        case 'marketplace-settings': return 'Marketplace Profile Settings';
        case 'marketplace': return selectedMarketplaceShopId ? 'Shop Storefront' : 'Marketplace Directory';
        case 'settings': return 'Settings';
        default: return 'Dashboard';
      }
    } else {
      switch (activeNavId) {
        case 'orders': return 'All Shop Orders';
        case 'customers': return 'Customer Directory';
        case 'measurements': return 'Customer Measurements';
        case 'tasks':
        default: return 'My Work & Tasks';
      }
    }
  };

  return (
    <AppShell
      pageTitle={getPageTitle()}
      breadcrumb={
        isSuperAdmin
          ? 'DarziDesk Platform Admin'
          : isCustomer
          ? 'DarziDesk Bespoke Portal'
          : isOwner
          ? 'DarziDesk Owner'
          : 'DarziDesk Workshop'
      }
      activeNavId={activeNavId}
      onNavigate={(id) => {
        setActiveNavId(id);
        setSelectedOrder(null);
        setSelectedPortalOrder(null);
        setSelectedMarketplaceShopId(null);
      }}
      currentUser={currentUser}
      onSelectPersona={(u) => {
        onUserChange(u);
        setSelectedOrder(null);
        setSelectedPortalOrder(null);
        setSelectedMarketplaceShopId(null);
      }}
      demoUsers={demoUsers}
      searchValue={globalSearch}
      onSearchChange={setGlobalSearch}
    >
      {isSuperAdmin ? (
        // ── SUPER ADMIN VIEWS ────────────────────────────────────────────────
        <>
          {activeNavId === 'admin-tenants' && (
            <SuperAdminTenantsView authToken={currentUser.token} />
          )}
          {activeNavId === 'admin-revenue' && (
            <SuperAdminRevenueView authToken={currentUser.token} />
          )}
          {activeNavId === 'admin-plans' && (
            <SuperAdminPlansView authToken={currentUser.token} />
          )}
          {activeNavId === 'moderation' && (
            <SuperAdminModerationView
              authToken={currentUser.token}
              onPreviewStorefront={(tenantId) => {
                setSelectedMarketplaceShopId(tenantId);
                setActiveNavId('marketplace');
              }}
            />
          )}
          {activeNavId === 'marketplace' && !selectedMarketplaceShopId && (
            <MarketplaceDiscoveryView
              onSelectShop={(shop) => setSelectedMarketplaceShopId(shop.id)}
            />
          )}
          {activeNavId === 'marketplace' && selectedMarketplaceShopId && (
            <PublicShopStorefrontView
              shopId={selectedMarketplaceShopId}
              onBack={() => setSelectedMarketplaceShopId(null)}
              onStartOrder={() => { alert('Switch to Customer persona to test placing a bespoke order.'); }}
            />
          )}
        </>
      ) : isCustomer ? (
        // ── CUSTOMER PORTAL VIEWS ──────────────────────────────────────────
        <>
          {activeNavId === 'marketplace' && !selectedMarketplaceShopId && (
            <MarketplaceDiscoveryView
              onSelectShop={(shop) => setSelectedMarketplaceShopId(shop.id)}
            />
          )}
          {activeNavId === 'marketplace' && selectedMarketplaceShopId && (
            <PublicShopStorefrontView
              shopId={selectedMarketplaceShopId}
              onBack={() => setSelectedMarketplaceShopId(null)}
              onStartOrder={(tenantId) => {
                setSelectedCatalogTenantId(tenantId);
                setSelectedMarketplaceShopId(null);
                setActiveNavId('catalog');
              }}
            />
          )}
          {activeNavId === 'orders' && !selectedPortalOrder && (
            <CustomerOrdersView
              authToken={currentUser.token}
              onSelectOrder={(order) => setSelectedPortalOrder(order)}
              onNavigateToCatalog={() => setActiveNavId('catalog')}
            />
          )}
          {activeNavId === 'orders' && selectedPortalOrder && (
            <CustomerOrderDetailView
              orderId={selectedPortalOrder.id}
              authToken={currentUser.token}
              onBack={() => setSelectedPortalOrder(null)}
            />
          )}
          {activeNavId === 'catalog' && (
            <ShopCatalogView
              authToken={currentUser.token}
              defaultTenantId={selectedCatalogTenantId || undefined}
              onOrderCreated={() => {
                setActiveNavId('orders');
                setSelectedPortalOrder(null);
              }}
            />
          )}
          {activeNavId === 'measurements' && (
            <CustomerMeasurementsView
              authToken={currentUser.token}
              onNavigateToCatalog={() => setActiveNavId('catalog')}
            />
          )}
          {activeNavId === 'invoices' && (
            <CustomerInvoicesView authToken={currentUser.token} />
          )}
        </>
      ) : isOwner ? (
        // ── OWNER VIEWS ──────────────────────────────────────────────────────
        <>
          {activeNavId === 'dashboard' && (
            <OwnerDashboardView
              authToken={currentUser.token}
              currentUser={currentUser}
              onNavigate={setActiveNavId}
            />
          )}
          {activeNavId === 'marketplace-settings' && (
            <OwnerMarketplaceSettingsView
              authToken={currentUser.token}
              onPreviewStorefront={(tenantId) => {
                setSelectedMarketplaceShopId(tenantId);
                setActiveNavId('marketplace');
              }}
            />
          )}
          {activeNavId === 'marketplace' && !selectedMarketplaceShopId && (
            <MarketplaceDiscoveryView
              onSelectShop={(shop) => setSelectedMarketplaceShopId(shop.id)}
            />
          )}
          {activeNavId === 'marketplace' && selectedMarketplaceShopId && (
            <PublicShopStorefrontView
              shopId={selectedMarketplaceShopId}
              onBack={() => setSelectedMarketplaceShopId(null)}
              onStartOrder={() => { alert('Switch to Customer persona to test placing a bespoke order.'); }}
            />
          )}
          {activeNavId === 'orders' && <OwnerOrdersView authToken={currentUser.token} />}
          {(activeNavId === 'customers' || activeNavId === 'measurements') && (
            <CustomerDirectoryView authToken={currentUser.token} />
          )}
          {activeNavId === 'fabric' && <OwnerFabricView authToken={currentUser.token} />}
          {activeNavId === 'staff' && <OwnerStaffView authToken={currentUser.token} />}
          {activeNavId === 'billing' && <OwnerInvoicesView authToken={currentUser.token} />}
          {(activeNavId === 'reports' || activeNavId === 'products' || activeNavId === 'settings') && (
            <PlaceholderView viewId={activeNavId} />
          )}
        </>
      ) : (
        // ── STAFF VIEWS ──────────────────────────────────────────────────────
        <>
          {(activeNavId === 'tasks' || activeNavId === 'orders') && (
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
                  onSelectOrder={(order) => setSelectedOrder(order)}
                  searchQuery={globalSearch}
                  onSearchChange={setGlobalSearch}
                />
              )}
            </div>
          )}
          {(activeNavId === 'customers' || activeNavId === 'measurements') && (
            <CustomerDirectoryView authToken={currentUser.token} />
          )}
        </>
      )}

      {/* ── Canonical Drawer for Staff Order Details ─────────────────────── */}
      {currentUser && !isOwner && !isCustomer && (
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
      )}
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Marketplace route (unauthenticated, accessible from landing)
// ─────────────────────────────────────────────────────────────────────────────
function PublicMarketplaceRoute() {
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-16">
        {!selectedShopId ? (
          <MarketplaceDiscoveryView onSelectShop={(shop) => setSelectedShopId(shop.id)} />
        ) : (
          <PublicShopStorefrontView
            shopId={selectedShopId}
            onBack={() => setSelectedShopId(null)}
            onStartOrder={() => { window.location.href = '/login'; }}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root App — URL routing
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);

  // ── Boot: restore session or fall back to dev demo-session ────────────────
  useEffect(() => {
    // 1. Try localStorage auth (from real login via LoginPage)
    const stored = getStoredAuth();
    if (stored) {
      setCurrentUser({
        id: stored.userId,
        name: stored.name || 'User',
        email: '',
        role: stored.role as DemoUser['role'],
        token: stored.token,
      });
      return;
    }

    // 2. Fall back to dev demo session (DEV only)
    if (import.meta.env.DEV) {
      fetch('/api/dev/demo-session')
        .then((res) => res.json())
        .then((json: any) => {
          const payload: DemoSessionData = json.data || json;
          if (payload.users?.length > 0) {
            setDemoUsers(payload.users);
            setCurrentUser(payload.users[0]);
          }
        })
        .catch((err) => console.warn('Could not fetch dev demo sessions:', err));
    }
  }, []);

  const handleLogout = () => {
    clearStoredAuth();
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <Routes>
      {/* ── Public routes ────────────────────────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/marketplace" element={<PublicMarketplaceRoute />} />

      {/* ── Authenticated app routes ─────────────────────────────────────── */}
      {/*
        Security note: these routes render the AppShell UI. They do NOT enforce
        any client-side access control — that is intentional. The backend RBAC
        (Phases 1–12) rejects every API call from the wrong role with 403.
        The redirect from LoginPage to /admin, /dashboard, /portal is UX
        convenience only, not a security boundary.
      */}
      <Route
        path="/admin"
        element={
          currentUser ? (
            <AuthenticatedShell
              currentUser={currentUser}
              demoUsers={demoUsers}
              onUserChange={setCurrentUser}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          currentUser ? (
            <AuthenticatedShell
              currentUser={currentUser}
              demoUsers={demoUsers}
              onUserChange={setCurrentUser}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/portal"
        element={
          currentUser ? (
            <AuthenticatedShell
              currentUser={currentUser}
              demoUsers={demoUsers}
              onUserChange={setCurrentUser}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch-all → landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
