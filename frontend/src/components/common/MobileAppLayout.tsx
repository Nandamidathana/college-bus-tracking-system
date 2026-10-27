import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MobileBottomNav } from './MobileBottomNav';
import {
  MapPin,
  Armchair,
  BellRing,
  Users,
  Bell,
  Smartphone,
  LayoutGrid,
  Check,
  Wifi,
  Battery,
  Bus,
} from 'lucide-react';
import { PwaBanner } from './PwaBanner';

interface MobileAppLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  unreadNotificationsCount?: number;
  activeScreenIndex?: number; // 1 to 12
}

export const ALL_SCREENS = [
  { index: 1, name: '1. Splash Screen', path: '/splash', icon: Bus },
  { index: 2, name: '2. Login Screen', path: '/student/login', icon: Users },
  { index: 3, name: '3. Dashboard', path: '/student/dashboard', icon: Bus },
  { index: 4, name: '4. Live Tracking', path: '/student/live-tracking', icon: MapPin },
  { index: 5, name: '5. Routes', path: '/student/routes', icon: MapPin },
  { index: 6, name: '6. Seat Availability', path: '/student/seat-availability', icon: Armchair },
  { index: 7, name: '7. Notifications', path: '/student/notifications', icon: Bell },
  { index: 8, name: '8. SOS / Emergency', path: '/student/sos', icon: BellRing },
  { index: 9, name: '9. Parent Tracking', path: '/student/parent-tracking', icon: Users },
  { index: 10, name: '10. Profile', path: '/student/profile', icon: Users },
  { index: 11, name: '11. Settings', path: '/student/settings', icon: Smartphone },
  { index: 12, name: '12. Bus Details', path: '/student/bus-details', icon: Bus },
];

export const MobileAppLayout: React.FC<MobileAppLayoutProps> = ({
  children,
  showBottomNav = true,
  unreadNotificationsCount = 0,
  activeScreenIndex,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showScreenPicker, setShowScreenPicker] = useState(false);

  // Quick module pills from top right of reference banner
  const quickModules = [
    { label: 'Live Tracking', icon: MapPin, color: 'bg-blue-50 text-blue-600 border-blue-200', path: '/student/live-tracking' },
    { label: 'Seat Availability', icon: Armchair, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', path: '/student/seat-availability' },
    { label: 'SOS Alerts', icon: BellRing, color: 'bg-rose-50 text-rose-600 border-rose-200', path: '/student/sos' },
    { label: 'Parent Tracking', icon: Users, color: 'bg-indigo-50 text-indigo-600 border-indigo-200', path: '/student/parent-tracking' },
    { label: 'Notifications', icon: Bell, color: 'bg-sky-50 text-sky-600 border-sky-200', path: '/student/notifications' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      <PwaBanner />

      {/* Desktop Presentation Header (Matching Reference Top Banner) */}
      <header className="hidden lg:block bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs px-6 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Brand & Tagline */}
          <div className="flex items-center gap-4">
            <Link to="/splash" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight flex items-center gap-1">
                  <span className="text-slate-900 dark:text-white">CollegeBus</span>
                  <span className="text-emerald-500">Live</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Track &bull; Travel &bull; Stay Safe
                </div>
              </div>
            </Link>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Smart Tracking <span className="text-slate-300 mx-1">|</span> Safer Journeys <span className="text-slate-300 mx-1">|</span> Connected Campus
            </div>
          </div>

          {/* Right: Reference Feature Pills & 12-Screen Switcher */}
          <div className="flex items-center gap-2">
            <div className="hidden xl:flex items-center gap-2">
              {quickModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.label}
                    onClick={() => navigate(mod.path)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105 ${mod.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{mod.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => navigate('/student/gallery')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs hover:opacity-90 transition-all ml-2"
              title="View all 12 screens side-by-side"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>12-Screen Overview</span>
            </button>
          </div>
        </div>
      </header>

      {/* Screen Selection Pills Bar (for easy previewing of all 12 screens on Desktop) */}
      <div className="hidden lg:block bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 py-2 px-4 overflow-x-auto">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">
            Screens:
          </span>
          {ALL_SCREENS.map((sc) => {
            const isCurrent = location.pathname === sc.path || activeScreenIndex === sc.index;
            return (
              <button
                key={sc.index}
                onClick={() => navigate(sc.path)}
                className={`px-2.5 py-1 rounded-full transition-all text-[11px] whitespace-nowrap ${
                  isCurrent
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {sc.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start py-0 lg:py-6 px-0 sm:px-4 w-full">
        {/* Smartphone Mockup Container (Responsive: Edge-to-edge on mobile, iPhone frame on desktop) */}
        <div className="w-full max-w-md bg-white dark:bg-slate-900 sm:rounded-[36px] sm:shadow-2xl sm:border-[7px] sm:border-slate-800/90 dark:sm:border-slate-700 flex flex-col min-h-screen sm:min-h-[780px] sm:max-h-[860px] overflow-hidden relative">
          {/* iOS Style Status Bar (Visual parity with reference) */}
          <div className="w-full bg-transparent px-6 pt-3 pb-1 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 select-none z-30 shrink-0">
            <span>9:41</span>
            {/* Dynamic Island Pill */}
            <div className="w-24 h-4 bg-slate-900 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-950 dark:bg-slate-900 ring-1 ring-slate-800 ml-auto mr-2" />
            </div>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />
              <Battery className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          {/* Screen Content Body */}
          <div className={`flex-1 flex flex-col overflow-y-auto no-scrollbar relative ${showBottomNav ? 'pb-16' : ''}`}>
            {children}
          </div>

          {/* Bottom Nav */}
          {showBottomNav && (
            <MobileBottomNav unreadNotificationsCount={unreadNotificationsCount} />
          )}
        </div>
      </main>

      {/* Desktop Presentation Footer (Matching Reference Slogan) */}
      <footer className="hidden lg:block bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white text-center py-2.5 text-xs font-medium tracking-wide">
        Safe Rides <span className="text-emerald-400 mx-2">&bull;</span> Smart Tracking <span className="text-emerald-400 mx-2">&bull;</span> A Better Campus Experience
      </footer>
    </div>
  );
};
