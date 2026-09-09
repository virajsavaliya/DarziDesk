import React, { useState, useRef } from 'react';
import logoForDark from '../../assets/logo_for_dark.png';
import {
  LayoutDashboard,
  ClipboardList,
  Ruler,
  Package,
  Scissors,
  Users,
  CreditCard,
  BarChart2,
  Settings,
  Search,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const Hero3DDashboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 3, y: -4 });
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'weekly'>('all');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle 3D tilt response to cursor
    const rX = ((y - centerY) / centerY) * -7 + 3;
    const rY = ((x - centerX) / centerX) * 8 - 4;

    setRotation({ x: rX, y: rY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 3, y: -4 });
  };

  return (
    <div className="w-full flex justify-center items-center py-2 sm:py-4 lg:py-6 overflow-visible">
      {/* Responsive frame container to maintain perfect aspect ratio & zero clipping on all screen sizes */}
      <div className="w-[330px] h-[225px] sm:w-[500px] sm:h-[340px] md:w-[600px] md:h-[400px] lg:w-[690px] lg:h-[445px] relative flex items-center justify-center shrink-0">
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          className="absolute w-[690px] h-[445px] scale-[0.47] sm:scale-[0.72] md:scale-[0.86] lg:scale-100 origin-center select-none"
          style={{ perspective: '1400px' }}
        >
          {/* ── 3D Ambient Glow ────────────────────────────────────────── */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-accent/20 via-orange-500/15 to-blue-500/10 rounded-3xl blur-2xl -z-10 opacity-70 transition-opacity duration-500" />

          {/* ── Main Perspective Mockup ───────────────────────────────── */}
          <div
            className="relative w-full h-full bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden transition-transform duration-200 ease-out will-change-transform flex flex-col"
            style={{
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(0.6deg) ${
                isHovered ? 'scale3d(1.02, 1.02, 1.02)' : 'scale3d(1, 1, 1)'
              }`,
              transformStyle: 'preserve-3d',
              boxShadow: isHovered
                ? '0 35px 60px -15px rgba(241, 90, 36, 0.2), 0 20px 30px -10px rgba(15, 23, 42, 0.25)'
                : '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            }}
          >
            {/* Browser Mockup Window Bar */}
            <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                <span className="text-[11px] font-mono text-slate-400 ml-2">app.darzidesk.com/dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live System
                </span>
              </div>
            </div>

            {/* Dashboard Interface Container */}
            <div className="flex flex-1 bg-slate-50/50 overflow-hidden">
              {/* Mini Sidebar */}
              <div className="w-38 bg-slate-900 text-slate-300 p-3 flex flex-col justify-between border-r border-slate-800 shrink-0">
                <div>
                  {/* Logo in Sidebar Header */}
                  <div className="flex items-center gap-2 px-1.5 py-1 mb-2.5 border-b border-slate-800/80">
                    <img src={logoForDark} alt="DarziDesk" className="h-5.5 w-auto object-contain" />
                  </div>

                  {/* Navigation items */}
                  <div className="space-y-1 text-xs">
                    {[
                      { icon: <LayoutDashboard className="w-3.5 h-3.5" />, label: 'Dashboard', active: true },
                      { icon: <ClipboardList className="w-3.5 h-3.5" />, label: 'Orders', count: '18' },
                      { icon: <Ruler className="w-3.5 h-3.5" />, label: 'Measurements' },
                      { icon: <Package className="w-3.5 h-3.5" />, label: 'Fabrics', count: '14' },
                      { icon: <Scissors className="w-3.5 h-3.5" />, label: 'Services' },
                      { icon: <Users className="w-3.5 h-3.5" />, label: 'Staff' },
                      { icon: <CreditCard className="w-3.5 h-3.5" />, label: 'Invoices' },
                      { icon: <BarChart2 className="w-3.5 h-3.5" />, label: 'Reports' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg font-medium transition-colors ${
                          item.active
                            ? 'bg-orange-500 text-white shadow-sm font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {item.icon}
                          <span className="truncate text-[11px]">{item.label}</span>
                        </div>
                        {item.count && (
                          <span className="text-[9px] font-mono bg-slate-800 text-slate-300 px-1 rounded">
                            {item.count}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400 px-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </div>
              </div>

              {/* Main Dashboard Canvas */}
              <div className="flex-1 p-3.5 overflow-hidden flex flex-col justify-between">
                {/* Topbar inside dashboard */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Shree Ganesh Tailors</span>
                      <span>•</span>
                      <span>Surat</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Welcome back, Ramesh!</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        readOnly
                        placeholder="Search orders, fabrics..."
                        className="pl-6 pr-2 py-1 text-[10px] bg-white border border-slate-200 rounded-lg w-36 text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                      Fri, 12 Sept 2025
                    </div>
                  </div>
                </div>

                {/* 4 Metric KPI Cards */}
                <div className="grid grid-cols-4 gap-2.5 mb-2.5">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10.5px] text-slate-500 font-semibold tracking-tight block">Orders</span>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5">
                      <span className="text-base font-extrabold text-slate-900">48</span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">+12%</span>
                    </div>
                    <span className="text-[8.5px] text-slate-400 mt-0.5">vs last month</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10.5px] text-slate-500 font-semibold tracking-tight block">Customers</span>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5">
                      <span className="text-base font-extrabold text-slate-900">236</span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">+8%</span>
                    </div>
                    <span className="text-[8.5px] text-slate-400 mt-0.5">18 new this week</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10.5px] text-slate-500 font-semibold tracking-tight block">Fabric Stock</span>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5">
                      <span className="text-base font-extrabold text-slate-900">128</span>
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded">14 low</span>
                    </div>
                    <span className="text-[8.5px] text-slate-400 mt-0.5">42m reserved</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10.5px] text-slate-500 font-semibold tracking-tight block">Revenue</span>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5">
                      <span className="text-base font-extrabold text-slate-900">₹92,480</span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">+15%</span>
                    </div>
                    <span className="text-[8.5px] text-slate-400 mt-0.5">₹14.2k pending</span>
                  </div>
                </div>

                {/* Bottom Row: 2 Visual Charts */}
                <div className="grid grid-cols-12 gap-2.5 flex-1">
                  {/* Left Chart: Orders This Month */}
                  <div className="col-span-6 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-800">Orders This Month</span>
                      <div className="flex gap-1 text-[9px]">
                        <button
                          onClick={() => setActiveTab('all')}
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            activeTab === 'all' ? 'bg-orange-50 text-orange-600' : 'text-slate-400'
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          onClick={() => setActiveTab('weekly')}
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            activeTab === 'weekly' ? 'bg-orange-50 text-orange-600' : 'text-slate-400'
                          }`}
                        >
                          Weekly
                        </button>
                      </div>
                    </div>

                    {/* Vertical Bar chart */}
                    <div className="h-28 flex items-end justify-between gap-1.5 pt-2 pb-1 px-1">
                      {[
                        { day: 'Mon', h: 55, count: 6 },
                        { day: 'Tue', h: 80, count: 9 },
                        { day: 'Wed', h: 45, count: 5 },
                        { day: 'Thu', h: 95, count: 11 },
                        { day: 'Fri', h: 70, count: 8 },
                        { day: 'Sat', h: 100, count: 12 },
                        { day: 'Sun', h: 60, count: 7 },
                      ].map((bar) => (
                        <div key={bar.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                          <div
                            className="w-full max-w-[16px] bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-md transition-all duration-300 group-hover:brightness-110 relative"
                            style={{ height: `${bar.h}%` }}
                          >
                            {/* Tooltip on bar hover */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {bar.count} orders
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-400 font-medium">{bar.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Chart: Order Status Overview */}
                  <div className="col-span-6 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-800 block mb-1">Order Status Overview</span>

                    <div className="flex items-center gap-2.5 my-auto">
                      {/* CSS Donut Chart */}
                      <div className="relative w-19 h-19 shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          {/* Background circle */}
                          <path
                            className="text-slate-100"
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          {/* Cutting (indigo - 25%) */}
                          <path
                            className="text-indigo-500"
                            strokeDasharray="25, 100"
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          {/* Stitching (amber - 20%) */}
                          <path
                            className="text-amber-500"
                            strokeDasharray="20, 100"
                            strokeDashoffset="-25"
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          {/* Ready (emerald - 18%) */}
                          <path
                            className="text-emerald-500"
                            strokeDasharray="18, 100"
                            strokeDashoffset="-45"
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          {/* Under Thread (blue - 17%) */}
                          <path
                            className="text-blue-500"
                            strokeDasharray="17, 100"
                            strokeDashoffset="-63"
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          {/* Measurement (cyan - 12%) */}
                          <path
                            className="text-cyan-400"
                            strokeDasharray="12, 100"
                            strokeDashoffset="-80"
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          {/* Delivered (purple - 8%) */}
                          <path
                            className="text-purple-500"
                            strokeDasharray="8, 100"
                            strokeDashoffset="-92"
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xs font-black text-slate-900">48</span>
                          <span className="text-[7px] uppercase font-bold text-slate-400">Total</span>
                        </div>
                      </div>

                      {/* Status Breakdown Legend */}
                      <div className="space-y-0.5 text-[9.5px] min-w-0 flex-1 pl-1">
                        <div className="flex items-center justify-between text-slate-600 pr-0.5">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate">Under Thread</span>
                          </span>
                          <span className="font-bold text-slate-700 tabular-nums ml-1">8</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 pr-0.5">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                            <span className="truncate">Measurement</span>
                          </span>
                          <span className="font-bold text-slate-700 tabular-nums ml-1">7</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 pr-0.5">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span className="truncate">Cutting</span>
                          </span>
                          <span className="font-bold text-slate-700 tabular-nums ml-1">12</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 pr-0.5">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="truncate">Stitching</span>
                          </span>
                          <span className="font-bold text-slate-700 tabular-nums ml-1">9</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 pr-0.5">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">Ready</span>
                          </span>
                          <span className="font-bold text-slate-700 tabular-nums ml-1">8</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 pr-0.5">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <span className="truncate">Delivered</span>
                          </span>
                          <span className="font-bold text-slate-700 tabular-nums ml-1">4</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Floating 3D Badge 1: Top Right (Order Completed) ────────── */}
          <div
            className="absolute -top-3.5 -right-2.5 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 transition-transform duration-300 pointer-events-none z-20"
            style={{
              transform: `translateZ(50px) translateY(${isHovered ? '-6px' : '0px'}) rotate(-2deg)`,
              boxShadow: '0 20px 30px -8px rgba(15, 23, 42, 0.15)',
            }}
          >
            <div className="w-8.5 h-8.5 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-900">Order #DZ-1048 Ready</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.2 rounded-full">
                  ₹4,500
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Bespoke 3-Piece Italian Wool Suit</p>
            </div>
          </div>

          {/* ── Floating 3D Badge 2: Bottom Left (Fabric Stock Alert) ─────── */}
          <div
            className="absolute -bottom-3.5 -left-2.5 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 transition-transform duration-300 pointer-events-none z-20"
            style={{
              transform: `translateZ(40px) translateY(${isHovered ? '6px' : '0px'}) rotate(2deg)`,
              boxShadow: '0 20px 30px -8px rgba(15, 23, 42, 0.15)',
            }}
          >
            <div className="w-8.5 h-8.5 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4.5 h-4.5 text-orange-500" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-900 block">Inventory Synchronized</span>
              <p className="text-[10px] text-slate-500">128 Fabrics • Zero Overbooking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
