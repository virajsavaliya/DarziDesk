import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoForLight from '../../assets/logo_for_light.png';
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react';

interface NavLinkItem {
  name: string;
  href: string;
  badge?: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { name: 'Home', href: '/' },
  { name: 'Marketplace', href: '/marketplace', badge: 'Explore' },
  { name: 'For Shop Owners', href: '/for-owners', badge: 'Atelier' },
  { name: 'For Customers', href: '/for-customers' },
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'About', href: '/about' },
];


export const PublicNavbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm py-3 border-b border-slate-200/80'
          : 'bg-white/85 backdrop-blur-sm py-4 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src={logoForLight}
            alt="DarziDesk"
            className="h-9 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`relative text-sm font-semibold transition-all py-1.5 flex items-center gap-1.5 ${
                  active
                    ? 'text-orange-600 font-bold'
                    : 'text-slate-700 hover:text-orange-600'
                }`}
              >
                <span>{link.name}</span>
                {link.badge && (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    {link.badge}
                  </span>
                )}
                {active && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            to="/login"
            className="px-4.5 py-2 text-sm font-bold text-slate-700 hover:text-orange-600 border border-slate-300/80 hover:border-orange-500 rounded-xl transition-all"
          >
            Sign In
          </Link>
          <Link
            to="/login?mode=register"
            className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-md hover:shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
          >
            <span>Get Started</span>
            <Sparkles className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 text-slate-700 hover:text-orange-600 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-5 space-y-3 shadow-xl transition-all">
          <div className="space-y-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-orange-50 text-orange-600 font-bold'
                      : 'text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span>{link.name}</span>
                  {link.badge ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      {link.badge}
                    </span>
                  ) : (
                    active && <ArrowRight className="w-4 h-4 text-orange-500" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <Link
              to="/login"
              className="w-full text-center py-2.5 text-sm font-bold border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50"
            >
              Sign In
            </Link>
            <Link
              to="/login?mode=register"
              className="w-full text-center py-2.5 text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
