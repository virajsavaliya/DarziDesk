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
  Lock,
  KeyRound,
  FileText,
  ToggleLeft,
  Activity,
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
  /** List of feature IDs that are locked under current plan */
  lockedFeatures?: string[];
  /** Current subscription plan name (e.g. 'Basic', 'Pro') */
  planName?: string;
  /** Whether the subscription is currently in a free trial */
  isTrial?: boolean;
  /** Number of days left in the trial */
  trialDaysRemaining?: number | null;
  /** Callback to open upgrade plan modal */
  onOpenUpgrade?: () => void;
}

// ── Super Admin Nav ────────────────────────────────────────────────────────
const SUPER_ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Platform Overview',
    items: [
      { id: 'admin-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/admin/dashboard' },
      { id: 'admin-tenants', label: 'Tenants & Shops', icon: <Building2 className="w-5 h-5" />, path: '/admin/tenants' },
      { id: 'admin-revenue', label: 'Revenue & Growth', icon: <TrendingUp className="w-5 h-5" />, path: '/admin/revenue' },
      { id: 'admin-plans', label: 'Subscription Plans', icon: <Layers className="w-5 h-5" />, path: '/admin/plans' },
    ],
  },
  {
    label: 'Security & Governance',
    items: [
      { id: 'admin-support-sessions', label: 'Support Sessions', icon: <KeyRound className="w-5 h-5" />, path: '/admin/support-sessions' },
      { id: 'admin-audit', label: 'Audit Logs', icon: <FileText className="w-5 h-5" />, path: '/admin/audit' },
      { id: 'admin-feature-flags', label: 'Feature Flags', icon: <ToggleLeft className="w-5 h-5" />, path: '/admin/feature-flags' },
    ],
  },
  {
    label: 'Operations & Discovery',
    items: [
      { id: 'admin-operations', label: 'System Operations', icon: <Activity className="w-5 h-5" />, path: '/admin/operations' },
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
      { id: 'orders', label: 'All Orders', icon: <ClipboardList className="w-5 h-5" />, path: '/dashboard/orders' },
      { id: 'tasks', label: 'My Work & Tasks', icon: <Layers className="w-5 h-5" />, path: '/dashboard/tasks' },
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
      { id: 'tasks', label: 'My Work & Tasks', icon: <Layers className="w-5 h-5" />, path: '/dashboard/tasks' },
      { id: 'orders', label: 'All Orders', icon: <ClipboardList className="w-5 h-5" />, path: '/dashboard/orders' },
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
  lockedFeatures = [],
  planName = 'Basic',
  isTrial = false,
  trialDaysRemaining = null,
  onOpenUpgrade,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = React.useState(false);
  const [isTabletExpanded, setIsTabletExpanded] = React.useState(false);

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
      <nav
        className="flex-1 px-3 py-4 space-y-4 overflow-y-auto no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeNavId === item.id;
                const isLocked = isOwner && lockedFeatures.includes(item.id);

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
                        : isLocked
                        ? 'text-[#B8C7D6]/70 hover:bg-white/5 hover:text-white'
                        : 'text-[#B8C7D6] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : isLocked ? 'text-[#B8C7D6]/60' : 'text-[#B8C7D6]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isLocked && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-extrabold tracking-tight border border-amber-400/30"
                          title="Locked under Basic plan. Upgrade to Pro to unlock."
                        >
                          <Lock className="w-2.5 h-2.5" />
                          PRO
                        </span>
                      )}
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
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User & Dev Persona Footer ─────────────────────────────── */}
      <div className="p-3 border-t border-white/10 shrink-0 bg-brand-dark/50">
        {/* Subscription Plan Status Chip (for Shop Owners) */}
        {isOwner && (
          <div className="mb-2 p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                  {planName} {isTrial ? 'Trial' : 'Plan'}
                </span>
              </div>
              <div className="text-[10px] text-white/70 truncate font-medium">
                {isTrial && trialDaysRemaining !== null && trialDaysRemaining !== undefined
                  ? `⏳ ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left`
                  : lockedFeatures.length > 0
                  ? `${lockedFeatures.length} features locked`
                  : 'All features active'}
              </div>
            </div>
            {onOpenUpgrade && (
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="px-2.5 py-1 rounded-lg bg-accent hover:bg-accent/90 text-white text-[10px] font-extrabold shadow-sm transition-all shrink-0 cursor-pointer"
              >
                Upgrade
              </button>
            )}
          </div>
        )}
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
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border/50 flex items-center justify-between">
                  <span>Switch Dev Persona</span>
                  <span className="text-[9px] text-text-muted">1 Per Role</span>
                </div>
                {demoUsers.map((u) => {
                  const panelLabel =
                    u.role === 'SHOP_OWNER'
                      ? 'Shop Owner Admin Panel'
                      : u.role === 'STAFF'
                      ? 'Tailoring Workshop Panel'
                      : u.role === 'CUSTOMER'
                      ? 'Customer Bespoke Portal'
                      : 'Platform SuperAdmin Panel';

                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelectPersona(u);
                        setShowPersonaMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg flex flex-col gap-0.5 transition-colors ${
                        currentUser?.id === u.id
                          ? 'bg-accent/15 text-accent font-bold'
                          : 'hover:bg-surface-muted text-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate font-semibold">{u.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-secondary font-mono shrink-0 ml-1">
                          {u.role === 'CUSTOMER'
                            ? 'CLIENT'
                            : u.role === 'SHOP_OWNER'
                            ? 'OWNER'
                            : u.role === 'SUPER_ADMIN'
                            ? 'ADMIN'
                            : 'STAFF'}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted font-normal truncate">
                        {panelLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* User Card */}
        {currentUser && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-accent text-white font-bold text-xs flex items-center justify-center shrink-0">
                {(currentUser.name || 'User').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser.name || 'User'}
                </div>
                <div className="text-[10px] text-white/70 truncate flex items-center gap-1">
                  <span>
                    {currentUser.role === 'SUPER_ADMIN'
                      ? 'Admin Panel'
                      : currentUser.role === 'CUSTOMER'
                      ? 'Client Portal'
                      : currentUser.role === 'SHOP_OWNER'
                      ? 'Owner Admin Panel'
                      : 'Workshop Panel'}
                  </span>
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

  // Flatten nav items for compact tablet rail
  const allNavItems = navGroups.flatMap((g) => g.items);

  const tabletRailContent = (
    <div className="flex flex-col h-full bg-brand text-white w-16 select-none items-center py-3 justify-between border-r border-white/10">
      {/* Brand icon / Logo */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setIsTabletExpanded(true)}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          title="Expand studio menu"
          aria-label="Expand studio menu"
        >
          <img src={logoForDark} alt="DarziDesk" className="h-6 w-auto object-contain" />
        </button>
      </div>

      {/* Nav Icon List */}
      <nav
        className="flex-1 my-4 space-y-1.5 overflow-y-auto no-scrollbar flex flex-col items-center w-full px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allNavItems.map((item) => {
          const isActive = activeNavId === item.id;
          const isLocked = isOwner && lockedFeatures.includes(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.path ?? item.id)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all min-h-[44px] min-w-[44px] ${
                isActive
                  ? 'bg-accent text-white font-bold shadow-sm'
                  : isLocked
                  ? 'text-[#B8C7D6]/50 hover:bg-white/10 hover:text-white'
                  : 'text-[#B8C7D6] hover:bg-white/10 hover:text-white'
              }`}
              title={`${item.label}${isLocked ? ' (Pro Only)' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              {isLocked && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
              {item.badge !== undefined && !isLocked && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent ring-2 ring-brand" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Avatar & Logout */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/10 shrink-0 w-full px-2">
        {currentUser && (
          <div
            className="w-9 h-9 rounded-xl bg-accent text-white font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer"
            title={`${currentUser.name} (${currentUser.role})`}
            onClick={() => setIsTabletExpanded(true)}
          >
            {(currentUser.name || 'User').slice(0, 2).toUpperCase()}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (onLogout) {
              onLogout();
            } else {
              localStorage.removeItem('darzi_auth');
              window.location.href = '/login';
            }
          }}
          className="w-9 h-9 text-white/60 hover:text-white rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (>= 1024px): Full 256px persistent */}
      <aside id="desktop-sidebar" className="hidden lg:flex shrink-0 h-screen sticky top-0 z-30" data-sidebar="desktop">
        {sidebarContent}
      </aside>

      {/* Tablet Compact Rail (768px – 1023px): 64px icon-only bar */}
      <aside id="tablet-icon-rail" className="hidden md:flex lg:hidden shrink-0 h-screen sticky top-0 z-30" data-sidebar="tablet-rail">
        {tabletRailContent}
      </aside>

      {/* Tablet Expandable Slide-over Drawer (when expanded from tablet rail) */}
      {isTabletExpanded && (
        <div className="fixed inset-0 z-50 hidden md:flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsTabletExpanded(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Mobile Drawer Sidebar (< 768px) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" data-sidebar="mobile">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
