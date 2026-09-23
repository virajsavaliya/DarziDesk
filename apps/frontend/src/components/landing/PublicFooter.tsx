import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logoForLight from '../../assets/logo_for_light.png';
import { ArrowRight, CheckCircle2, Heart, Mail, ShieldCheck, Sparkles } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-white border-t border-slate-200/80 pt-16 pb-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Newsletter & Highlight Strip */}
        <div className="mb-14 p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-[#163B5C] to-slate-900 text-white relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_right,rgba(242,140,40,0.15),transparent_70%)] pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Modernizing India's Tailoring Industry</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Stay updated with atelier trends & software releases
              </h3>
              <p className="text-slate-300 text-sm max-w-xl">
                Join 2,500+ tailor shop owners and bespoke designers receiving our monthly guide on business growth, fabric trends, and software tips.
              </p>
            </div>

            <div className="lg:col-span-5">
              {subscribed ? (
                <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Thank you! You're subscribed to DarziDesk insights.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex sm:flex-row flex-col gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-bold text-white text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>Subscribe</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Main Footer Links Columns */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <img src={logoForLight} alt="DarziDesk" className="h-10 w-auto object-contain" />
            </Link>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
              Tailor Shop Operating System & Marketplace
            </p>
            <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
              Empowering master tailors across India with intelligent digital books, real-time fabric stock ledgers, karigar piece-rate tracking, and customer discovery storefronts.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Dual-Layer RLS Tenant Isolation & GST Compliant</span>
            </div>
          </div>

          {/* Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Solutions</h4>
            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li>
                <Link to="/for-owners" className="hover:text-orange-600 transition-colors">
                  For Shop Owners
                </Link>
              </li>
              <li>
                <Link to="/for-customers" className="hover:text-orange-600 transition-colors">
                  For Customers
                </Link>
              </li>
              <li>
                <Link to="/marketplace" className="hover:text-orange-600 transition-colors">
                  Marketplace Discovery
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-orange-600 transition-colors">
                  All Platform Features
                </Link>
              </li>
              <li>
                <Link to="/for-owners#roi" className="hover:text-orange-600 transition-colors">
                  ROI Savings Calculator
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Company</h4>
            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li>
                <Link to="/about" className="hover:text-orange-600 transition-colors">
                  About Us & Story
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-orange-600 transition-colors">
                  Subscription Plans
                </Link>
              </li>
              <li>
                <Link to="/about#milestones" className="hover:text-orange-600 transition-colors">
                  Our Journey & Impact
                </Link>
              </li>
              <li>
                <a href="mailto:contact@darzidesk.com" className="hover:text-orange-600 transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <Link to="/login?mode=register" className="text-orange-600 font-bold hover:underline">
                  Start Free 14-Day Trial →
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Assurance & Trust</h4>
            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li>
                <span className="text-slate-500">256-Bit Data Isolation</span>
              </li>
              <li>
                <span className="text-slate-500">No Credit Card Needed for Trial</span>
              </li>
              <li>
                <span className="text-slate-500">Full Cloud Backup & Export</span>
              </li>
              <li>
                <span className="text-slate-500">Privacy & Terms Protected</span>
              </li>
              <li>
                <span className="text-slate-500">Local Indian Language Ready</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Subfooter */}
        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div>© {new Date().getFullYear()} DarziDesk Technologies India Pvt. Ltd. All rights reserved.</div>
          <div className="flex items-center gap-1.5">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            <span>for Master Artisans & Tailoring Houses across India</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
