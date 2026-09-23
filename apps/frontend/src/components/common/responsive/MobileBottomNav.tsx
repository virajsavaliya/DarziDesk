import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Menu,
  Building2,
  Activity,
  Layers,
} from 'lucide-react';
import type { DemoUser } from '../../../types/dashboard';

interface MobileBottomNavProps {
  activeNavId: string;
  onNavigate: (id: string) => void;
  onOpenMore: () => void;
  currentUser: DemoUser | null;
  unreadNotifications?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeNavId,
  onNavigate,
  onOpenMore,
  currentUser,
  unreadNotifications,
}) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCustomer = currentUser?.role === 'CUSTOMER';

  // Define 4 primary thumb-friendly destinations per role
  const navItems = isSuperAdmin
    ? [
        {
          id: 'admin-dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          path: '/admin/dashboard',
        },
        {
          id: 'admin-tenants',
          label: 'Tenants',
          icon: Building2,
          path: '/admin/tenants',
        },
        {
          id: 'admin-operations',
          label: 'Operations',
          icon: Activity,
          path: '/admin/operations',
        },
      ]
    : isCustomer
    ? [
        {
          id: 'portal-orders',
          label: 'My Orders',
          icon: ClipboardList,
          path: '/portal/orders',
        },
        {
          id: 'portal-measurements',
          label: 'Sizes',
          icon: Layers,
          path: '/portal/measurements',
        },
        {
          id: 'portal-invoices',
          label: 'Invoices',
          icon: ClipboardList,
          path: '/portal/invoices',
        },
      ]
    : [
        {
          id: 'dashboard',
          label: 'Home',
          icon: LayoutDashboard,
          path: '/dashboard',
        },
        {
          id: 'orders',
          label: 'Orders',
          icon: ClipboardList,
          path: '/dashboard/orders',
        },
        {
          id: 'customers',
          label: 'Clients',
          icon: Users,
          path: '/dashboard/customers',
        },
      ];

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile primary navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeNavId === item.id ||
            (item.path && window.location.pathname.startsWith(item.path));

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center h-full min-h-[48px] px-1 transition-all relative ${
                isActive
                  ? 'text-accent font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {isActive && (
                <span className="absolute top-1 w-8 h-1 bg-accent rounded-full animate-in fade-in duration-200" />
              )}
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 text-accent' : ''
                }`}
              />
              <span className="text-[10px] mt-1 tracking-tight leading-none truncate max-w-[70px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 4th Item is ALWAYS "More" / Full Menu Trigger */}
        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Open full studio menu"
          aria-haspopup="dialog"
          className="flex-1 flex flex-col items-center justify-center h-full min-h-[48px] px-1 text-text-secondary hover:text-text-primary transition-all relative"
        >
          {unreadNotifications && unreadNotifications > 0 ? (
            <span className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-accent ring-2 ring-surface" />
          ) : null}
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight leading-none">More</span>
        </button>
      </div>
    </nav>
  );
};
