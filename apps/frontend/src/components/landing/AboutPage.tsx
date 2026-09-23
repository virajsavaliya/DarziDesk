import React from 'react';
import { Link } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { ThreeCanvas } from './ThreeCanvas';
import { ThreeDCard } from './ThreeDCard';
import tailorOwnerImg from '../../assets/tailor_owner.jpg';
import avatarRameshImg from '../../assets/avatar_ramesh.jpg';
import avatarKaranImg from '../../assets/avatar_karan.jpg';

import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Target,
  Compass,
  Scissors,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const VALUES = [
    {
      icon: Scissors,
      title: 'Craftsmanship First',
      desc: 'We revere the master darzi. Our software adapts to the tailor’s real physical workflow at the cutting table, not the other way around.',
      color: 'orange',
    },
    {
      icon: Target,
      title: 'Zero Tech Friction',
      desc: 'Built to run smoothly on any smartphone with zero IT training. If a master cutter can use WhatsApp, they can run DarziDesk in 5 minutes.',
      color: 'blue',
    },
    {
      icon: ShieldCheck,
      title: 'Sacred Data Isolation',
      desc: 'Customer measurement books and shop finances are protected by dual-layer PostgreSQL Row-Level Security. We will never sell or share your records.',
      color: 'emerald',
    },
    {
      icon: Compass,
      title: 'Dual-Sided Empowerment',
      desc: 'We empower shop owners with operational superpowers while connecting customers with verified bespoke artisans for guaranteed fit.',
      color: 'purple',
    },
  ];

  const MILESTONES = [
    {
      year: '2024 Q1',
      title: 'The Seed in Surat Textile Bazaars',
      desc: 'Spent 3 months inside 150+ generational tailoring shops across Surat, Ahmedabad, and Mumbai. Discovered that 70% of customer disputes came from illegible paper registers.',
    },
    {
      year: '2024 Q3',
      title: 'Alpha: Digital Measurement Book',
      desc: 'Built the first version with 20 master tailors in Gujarat. For the first time, measurement revisions had automated audit timestamps and instant search.',
    },
    {
      year: '2025 Q1',
      title: 'Fabric Ledger & WhatsApp Webhooks',
      desc: 'Added roll meterage tracking with database reservation locks and automated WhatsApp notifications for trial fittings, reducing customer no-shows by 85%.',
    },
    {
      year: '2025 Q4',
      title: 'The DarziDesk City Marketplace',
      desc: 'Launched the public marketplace allowing verified ateliers to showcase photo portfolios, accept bespoke inquiries, and acquire new urban customers.',
    },
    {
      year: '2026 Today',
      title: 'Powering 500+ Ateliers Across India',
      desc: 'Over 100,000 bespoke suits, sherwanis, and lehengas managed, saving over 22,000 collective workshop hours every month.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      <PublicNavbar />

      {/* ── 1. HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-white">
        <ThreeCanvas className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-70" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-extrabold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Our Story & Mission</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-slate-900 leading-[1.15]">
              Honoring Generational Craft, <br />
              <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                Powering the Future of Bespoke
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              India is home to the world's most gifted master tailors and embroiderers. At DarziDesk, we build modern
              cloud software to ensure their artisanal legacy thrives in a digital world.
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. OUR ORIGIN STORY ────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-t border-slate-200/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Photo Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <ThreeDCard
                maxTilt={5}
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white max-w-md w-full"
              >
                <img
                  src={tailorOwnerImg}
                  alt="Master Tailor in his workshop"
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Where It Began</span>
                  <h4 className="text-lg font-black mt-0.5">Shree Ganesh Atelier • Surat, Gujarat</h4>
                  <p className="text-xs text-slate-300">A 30-year legacy transformed into a paperless digital powerhouse.</p>
                </div>
              </ThreeDCard>
            </div>

            {/* Right Story Text */}
            <div className="lg:col-span-7 space-y-5 text-left">
              <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600">The Problem We Saw</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Born Out of a Deep Respect for the Cutting Table
              </h2>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                In late 2023, while visiting historic tailoring bazaars across western India, we watched a master cutter
                search frantically through four damp, dog-eared khata registers for a bridegroom’s sherwani measurements
                from two seasons ago. The wedding was 48 hours away.
              </p>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Despite possessing encyclopedic knowledge of body drape and fabric movement, this master artisan was losing
                precious hours to clerical chaos. Generic software built for Western accounting firms did not understand
                chest allowances, karigar piece-rate wages, or cloth roll shrinkage.
              </p>

              <p className="text-slate-800 text-sm sm:text-base font-semibold leading-relaxed">
                We founded DarziDesk to solve this exact gap: an operating system built from the chalk line up, celebrating
                the master darzi and elevating their business with cutting-edge cloud technology.
              </p>

              <div className="pt-2 flex items-center gap-3">
                <Link
                  to="/for-owners"
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>Explore What We Built</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. CORE VALUES ─────────────────────────────────────────────── */}
      <section className="py-24 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Guiding Principles
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">What We Stand For</h2>
            <p className="text-slate-600 text-base">The non-negotiable values behind every line of code we write.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((val, idx) => {
              const Icon = val.icon;
              return (
                <ThreeDCard
                  key={idx}
                  maxTilt={6}
                  className="bg-slate-50 rounded-3xl p-7 border border-slate-200/80 shadow-md hover:shadow-xl transition-all space-y-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">{val.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{val.desc}</p>
                </ThreeDCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. BY THE NUMBERS / IMPACT ─────────────────────────────────── */}
      <section className="py-20 bg-[#0B132B] text-white relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="inline-block px-3 py-1 bg-white/10 text-amber-300 text-xs font-bold uppercase tracking-wider rounded-md">
              Measurable Progress
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Our Impact in Numbers</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="text-4xl sm:text-5xl font-black text-orange-400">500+</div>
              <div className="text-xs sm:text-sm text-slate-300 font-semibold mt-2">Active Tailor Ateliers</div>
            </div>

            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="text-4xl sm:text-5xl font-black text-amber-400">100,000+</div>
              <div className="text-xs sm:text-sm text-slate-300 font-semibold mt-2">Garments Stitched</div>
            </div>

            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="text-4xl sm:text-5xl font-black text-emerald-400">₹5 Cr+</div>
              <div className="text-xs sm:text-sm text-slate-300 font-semibold mt-2">Tailoring Volume Transacted</div>
            </div>

            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="text-4xl sm:text-5xl font-black text-sky-400">99.8%</div>
              <div className="text-xs sm:text-sm text-slate-300 font-semibold mt-2">On-Time Delivery Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. MILESTONE JOURNEY TIMELINE ──────────────────────────────── */}
      <section id="milestones" className="py-24 bg-white relative z-10 border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Our Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Milestones Along the Way</h2>
          </div>

          <div className="space-y-6 relative before:absolute before:inset-0 before:left-6 sm:before:left-1/2 before:w-0.5 before:bg-slate-200 before:pointer-events-none">
            {MILESTONES.map((item, idx) => (
              <div
                key={idx}
                className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 group"
              >
                {/* Node marker */}
                <div className="w-12 h-12 rounded-full bg-white border-4 border-orange-500 text-orange-600 flex items-center justify-center font-bold text-xs shadow-md shrink-0 sm:mx-auto z-10">
                  {idx + 1}
                </div>

                {/* Content Box */}
                <div
                  className={`w-full sm:w-[calc(50%-3rem)] bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 ${
                    idx % 2 === 0 ? 'sm:order-first sm:text-right' : 'sm:order-last sm:text-left'
                  }`}
                >
                  <span className="text-xs font-mono font-bold text-orange-600 block">{item.year}</span>
                  <h4 className="text-base font-extrabold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. CRAFT ADVISORY COUNCIL & TEAM ──────────────────────────── */}
      <section className="py-24 bg-slate-50 border-t border-slate-200/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-extrabold uppercase tracking-wider rounded-md">
              Advisors & Builders
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Guided by Master Craftsmen
            </h2>
            <p className="text-slate-600 text-base">
              Every feature in DarziDesk is designed with direct feedback from tailoring masters with decades of workshop experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <ThreeDCard className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md flex items-center gap-5">
              <img
                src={avatarRameshImg}
                alt="Ramesh Patel"
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-orange-400 shrink-0"
              />
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">Ramesh Patel</h4>
                <p className="text-xs font-bold text-orange-600">Master Craftsman & Advisory Board</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  30 years running bespoke ateliers in Surat. Advises on measurement templates, fit diagnostics, and pattern cutter workflows.
                </p>
              </div>
            </ThreeDCard>

            <ThreeDCard className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md flex items-center gap-5">
              <img
                src={avatarKaranImg}
                alt="Karan Mehta"
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-orange-400 shrink-0"
              />
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">Karan Mehta</h4>
                <p className="text-xs font-bold text-orange-600">Product Lead & Textile Engineer</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Passionate about traditional handlooms and modern cloud architecture. Oversees fabric ledger algorithms and marketplace discovery.
                </p>
              </div>
            </ThreeDCard>
          </div>
        </div>
      </section>

      {/* ── 7. BOTTOM CALL TO ACTION ─────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Join the Modern Tailoring Movement
          </h2>
          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
            Whether you run a heritage atelier or you are a customer seeking the ultimate bespoke fit, welcome to DarziDesk.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/login?mode=register"
              className="px-8 py-4 text-base font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-full shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>Start Free Atelier Trial</span>
              <ArrowRight className="w-5 h-5 text-orange-600" />
            </Link>
            <Link
              to="/marketplace"
              className="px-7 py-4 text-base font-bold text-white border-2 border-white/80 hover:bg-white/10 rounded-full transition-all"
            >
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};
