import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileBottomNav } from '../common/responsive/MobileBottomNav';
import type { DemoUser } from '../../types/dashboard';

interface AppShellProps {
  pageTitle: string;
  breadcrumb?: string;
  activeNavId: string;
  onNavigate: (id: string) => void;
  currentUser: DemoUser | null;
  onSelectPersona?: (user: DemoUser) => void;
  demoUsers?: DemoUser[];
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  /** Called when the user clicks logout in the sidebar */
  onLogout?: () => void;
  lockedFeatures?: string[];
  planName?: string;
  isTrial?: boolean;
  trialDaysRemaining?: number | null;
  onOpenUpgrade?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  pageTitle,
  breadcrumb = 'DarziDesk',
  activeNavId,
  onNavigate,
  currentUser,
  onSelectPersona,
  demoUsers = [],
  searchValue = '',
  onSearchChange,
  onLogout,
  lockedFeatures = [],
  planName = 'Basic',
  isTrial = false,
  trialDaysRemaining = null,
  onOpenUpgrade,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-text-primary flex">
      {/* ── Left Persistent / Tablet Rail / Mobile Drawer Sidebar ── */}
      <Sidebar
        activeNavId={activeNavId}
        onNavigate={onNavigate}
        currentUser={currentUser}
        onSelectPersona={onSelectPersona}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        demoUsers={demoUsers}
        onLogout={onLogout}
        lockedFeatures={lockedFeatures}
        planName={planName}
        isTrial={isTrial}
        trialDaysRemaining={trialDaysRemaining}
        onOpenUpgrade={onOpenUpgrade}
      />

      {/* ── Main Layout Column ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <Topbar
          pageTitle={pageTitle}
          breadcrumb={breadcrumb}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          currentUser={currentUser}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
        />

        {/* Scrollable Page Body (with mobile safe bottom clearance for bottom nav) */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* ── Fixed Mobile Bottom Navigation (< 768px) ───────────── */}
      <MobileBottomNav
        activeNavId={activeNavId}
        onNavigate={onNavigate}
        onOpenMore={() => setMobileMenuOpen(true)}
        currentUser={currentUser}
      />
    </div>
  );
};

