import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Ruler,
  LogOut,
  ChevronDown,
  X,
  Package,
  Tag,
  UserCheck,
  CreditCard,
  BarChart2,
  Store,
  Settings,
  Shield,
  Compass,
  Building2,
  TrendingUp,
  Layers,
} from 'lucide-react';
import type { DemoUser } from '../../types/dashboard';
import logoForDark from '../../assets/logo_for_dark.png';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  /** URL path for this nav item — e.g. '/dashboard/orders' */
  path?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  activeNavId: string;
  onNavigate: (id: string) => void;
  currentUser: DemoUser | null;
  onSelectPersona?: (user: DemoUser) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  demoUsers?: DemoUser[];
  /** Called when the user clicks the logout button */
  onLogout?: () => void;
}

// ── Super Admin Nav ────────────────────────────────────────────────────────
const SUPER_ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Platform Overview',
    items: [
      { id: 'admin-tenants', label: 'Tenants & Shops', icon: <Building2 className="w-5 h-5" />, path: '/admin/tenants' },
      { id: 'admin-revenue', label: 'Revenue & Growth', icon: <TrendingUp className="w-5 h-5" />, path: '/admin/revenue' },
      { id: 'admin-plans', label: 'Subscription Plans', icon: <Layers className="w-5 h-5" />, path: '/admin/plans' },
    ],
  },
  {
    label: 'Marketplace & Discovery',
    items: [
      { id: 'moderation', label: 'Marketplace Moderation', icon: <Shield className="w-5 h-5" />, path: '/admin/moderation' },
      { id: 'marketplace', label: 'Public Directory', icon: <Compass className="w-5 h-5" />, path: '/admin/marketplace' },
    ],
  },
];

// ── Owner Nav (11 items, 3 groups) ─────────────────────────────────────────
const OWNER_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard/home' },
      { id: 'orders', label: 'Orders', icon: <ClipboardList className="w-5 h-5" />, path: '/dashboard/orders' },
      { id: 'customers', label: 'Customers', icon: <Users className="w-5 h-5" />, path: '/dashboard/customers' },
      { id: 'measurements', label: 'Measurements', icon: <Ruler className="w-5 h-5" />, path: '/dashboard/measurements' },
      { id: 'fabric', label: 'Fabric Inventory', icon: <Package className="w-5 h-5" />, path: '/dashboard/fabric' },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'products', label: 'Products & Services', icon: <Tag className="w-5 h-5" />, path: '/dashboard/products' },
      { id: 'staff', label: 'Staff', icon: <UserCheck className="w-5 h-5" />, path: '/dashboard/staff' },
      { id: 'billing', label: 'Billing & Invoices', icon: <CreditCard className="w-5 h-5" />, path: '/dashboard/billing' },
      { id: 'reports', label: 'Reports', icon: <BarChart2 className="w-5 h-5" />, path: '/dashboard/reports' },
    ],
  },
  {
    label: 'Marketplace & Growth',
    items: [
      { id: 'marketplace-settings', label: 'Marketplace Profile', icon: <Store className="w-5 h-5" />, path: '/dashboard/marketplace-settings' },
      { id: 'marketplace', label: 'Explore Directory', icon: <Compass className="w-5 h-5" />, path: '/dashboard/marketplace' },
      { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/dashboard/settings' },
    ],
  },
];

// ── Staff Nav (4 items, 1 group) ────────────────────────────────────────────
const STAFF_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Tailoring Workspace',
    items: [
      { id: 'tasks', label: 'My Work', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard/tasks' },
      { id: 'orders', label: 'Orders', icon: <ClipboardList className="w-5 h-5" />, path: '/dashboard/orders' },
      { id: 'customers', label: 'Customers', icon: <Users className="w-5 h-5" />, path: '/dashboard/customers' },
      { id: 'measurements', label: 'Measurements', icon: <Ruler className="w-5 h-5" />, path: '/dashboard/measurements' },
    ],
  },
];

// ── Customer Nav (5 items, 1 group) ─────────────────────────────────────────
const CUSTOMER_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Customer Bespoke Portal',
    items: [
      { id: 'marketplace', label: 'Explore Marketplace', icon: <Compass className="w-5 h-5" />, path: '/portal/marketplace' },
      { id: 'orders', label: 'My Orders', icon: <ClipboardList className="w-5 h-5" />, path: '/portal/orders' },
      { id: 'catalog', label: 'Shop Catalog & Order', icon: <Store className="w-5 h-5" />, path: '/portal/catalog' },
      { id: 'measurements', label: 'My Measurements', icon: <Ruler className="w-5 h-5" />, path: '/portal/measurements' },
      { id: 'invoices', label: 'My Invoices', icon: <CreditCard className="w-5 h-5" />, path: '/portal/invoices' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeNavId,
  onNavigate,
  currentUser,
  onSelectPersona,
  isOpenMobile = false,
  onCloseMobile,
  demoUsers = [],
  onLogout,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = React.useState(false);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isOwner = currentUser?.role === 'SHOP_OWNER';
  const isCustomer = currentUser?.role === 'CUSTOMER';
  const navGroups = isSuperAdmin
    ? SUPER_ADMIN_NAV_GROUPS
    : isCustomer
    ? CUSTOMER_NAV_GROUPS
    : isOwner
    ? OWNER_NAV_GROUPS
    : STAFF_NAV_GROUPS;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-brand text-white w-64 select-none">
      {/* ── Brand Header ──────────────────────────────────────────── */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <img src={logoForDark} alt="DarziDesk" className="h-8 w-auto object-contain" />
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-white/70 hover:text-white rounded-lg focus:outline-none"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation Links ──────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeNavId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      // Use path if available, otherwise fall back to id-based handler
                      onNavigate(item.path ?? item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-accent text-white font-semibold shadow-sm'
                        : 'text-[#B8C7D6] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-[#B8C7D6]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white/10 text-white/80'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User & Dev Persona Footer ─────────────────────────────── */}
      <div className="p-3 border-t border-white/10 shrink-0 bg-brand-dark/50">
        {/* Dev Persona Switcher (strictly guarded in development) */}
        {import.meta.env.DEV && demoUsers.length > 0 && onSelectPersona && (
          <div className="mb-2 relative">
            <button
              type="button"
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center justify-between transition-colors min-h-[36px]"
              title="Dev mode persona switcher"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                <span className="truncate text-[11px] font-mono">
                  DEV: {currentUser?.name.split(' ')[0]} ({isSuperAdmin ? 'ADMIN' : isCustomer ? 'CLIENT' : isOwner ? 'OWNER' : 'STAFF'})
                </span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/60 shrink-0" />
            </button>

            {showPersonaMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1.5 p-1 bg-surface text-text-primary rounded-xl shadow-xl border border-border z-50 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border/50">
                  Switch Dev Persona
                </div>
                {demoUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectPersona(u);
                      setShowPersonaMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between ${
                      currentUser?.id === u.id
                        ? 'bg-accent/15 text-accent font-bold'
                        : 'hover:bg-surface-muted text-text-primary'
                    }`}
                  >
                    <span className="truncate">{u.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-secondary font-mono">
                      {u.role === 'CUSTOMER'
                        ? 'CLIENT'
                        : u.role === 'SHOP_OWNER'
                        ? 'OWNER'
                        : u.role === 'SUPER_ADMIN'
                        ? 'ADMIN'
                        : 'STAFF'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Card */}
        {currentUser && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-accent text-white font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-white/60 truncate">
                  {currentUser.role === 'SUPER_ADMIN'
                    ? 'Platform Super Admin'
                    : currentUser.role === 'CUSTOMER'
                    ? 'Bespoke Client'
                    : currentUser.role === 'SHOP_OWNER'
                    ? 'Shop Owner'
                    : 'Craftsman / Tailor'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  // Fallback: clear storage and reload
                  localStorage.removeItem('darzi_auth');
                  window.location.href = '/login';
                }
              }}
              className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: persistent */}
      <aside className="hidden md:flex shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
