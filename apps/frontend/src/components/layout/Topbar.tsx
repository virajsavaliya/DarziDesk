import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { SearchInput } from '../common/SearchInput';
import type { DemoUser } from '../../types/dashboard';

interface TopbarProps {
  pageTitle: string;
  breadcrumb?: string;
  onOpenMobileMenu?: () => void;
  currentUser: DemoUser | null;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  pageTitle,
  breadcrumb = 'DarziDesk',
  onOpenMobileMenu,
  currentUser,
  searchValue = '',
  onSearchChange,
}) => {
  return (
    <header className="h-16 bg-surface border-b border-border sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* ── Left: Mobile Toggle & Breadcrumb/Page Title ────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="truncate">{breadcrumb}</span>
            <span>/</span>
            <span className="text-text-secondary font-medium truncate">
              {pageTitle}
            </span>
          </div>
          <h1 className="text-lg font-bold text-text-primary leading-tight truncate">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* ── Right: Search, Notifications & Profile Menu ──────── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick global search bar if handler provided */}
        {onSearchChange && (
          <div className="hidden lg:block w-64">
            <SearchInput
              value={searchValue}
              onChange={onSearchChange}
              placeholder="Quick search orders..."
              id="topbar-search"
            />
          </div>
        )}

        {/* Notifications Bell */}
        <button
          className="relative p-2.5 min-h-[44px] min-w-[44px] text-text-secondary hover:text-text-primary hover:bg-surface-muted rounded-xl transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent ring-2 ring-surface" />
        </button>

        {/* Profile Pill */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand font-bold text-sm flex items-center justify-center">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left text-xs leading-tight">
              <div className="font-semibold text-text-primary truncate max-w-[130px]">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-text-muted">
                {currentUser.role === 'SHOP_OWNER' ? 'Shop Owner' : 'Tailor / Staff'}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
