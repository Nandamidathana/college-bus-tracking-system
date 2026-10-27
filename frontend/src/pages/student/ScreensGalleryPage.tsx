import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bus,
  MapPin,
  Armchair,
  BellRing,
  Users,
  Bell,
  ArrowRight,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import { ALL_SCREENS } from '../../components/common/MobileAppLayout';

export const ScreensGalleryPage: React.FC = () => {
  const navigate = useNavigate();

  const quickModules = [
    { label: 'Live Tracking', icon: MapPin, color: 'bg-blue-50 text-blue-600 border-blue-200', path: '/student/live-tracking' },
    { label: 'Seat Availability', icon: Armchair, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', path: '/student/seat-availability' },
    { label: 'SOS Alerts', icon: BellRing, color: 'bg-rose-50 text-rose-600 border-rose-200', path: '/student/sos' },
    { label: 'Parent Tracking', icon: Users, color: 'bg-indigo-50 text-indigo-600 border-indigo-200', path: '/student/parent-tracking' },
    { label: 'Notifications', icon: Bell, color: 'bg-sky-50 text-sky-600 border-sky-200', path: '/student/notifications' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-between">
      {/* Top Header Banner matching reference */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/splash" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight flex items-center gap-1">
                  <span className="text-slate-900 dark:text-white">CollegeBus</span>
                  <span className="text-emerald-500">Live</span>
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Track &bull; Travel &bull; Stay Safe
                </div>
              </div>
            </Link>

            <div className="hidden lg:block h-7 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

            <div className="hidden lg:block text-xs font-bold text-slate-600 dark:text-slate-300">
              Smart Tracking <span className="text-slate-300 mx-1.5">|</span> Safer Journeys <span className="text-slate-300 mx-1.5">|</span> Connected Campus
            </div>
          </div>

          {/* Quick Module Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {quickModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.label}
                  onClick={() => navigate(mod.path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 ${mod.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{mod.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main 12-Screen Grid Display */}
      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            12-Screen Production UI System
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl mx-auto">
            Click on any screen below to enter the live interactive view with real-time GPS, routes, occupancy, and push alerts.
          </p>
        </div>

        {/* 12 Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {ALL_SCREENS.map((sc) => {
            const Icon = sc.icon;
            return (
              <div
                key={sc.index}
                onClick={() => navigate(sc.path)}
                className="group cursor-pointer flex flex-col items-center bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-blue-500 hover:-translate-y-1 transition-all"
              >
                {/* Simulated Phone Frame Preview */}
                <div className="w-full aspect-[9/18] rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-700/80 p-2 flex flex-col items-center justify-between overflow-hidden relative shadow-inner">
                  {/* Notch */}
                  <div className="w-12 h-2.5 bg-slate-800 rounded-full mb-2" />

                  {/* Center Content Placeholder */}
                  <div className="my-auto flex flex-col items-center text-center p-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold mb-2 shadow-sm group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight">
                      {sc.name.split('. ')[1]}
                    </span>
                  </div>

                  {/* Bottom bar */}
                  <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mt-auto" />
                </div>

                {/* Card Label */}
                <div className="w-full pt-2.5 text-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 flex items-center justify-center gap-1">
                    <span>{sc.name}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer Slogan */}
      <footer className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white text-center py-3 text-xs font-semibold tracking-wide">
        Safe Rides <span className="text-emerald-400 mx-2">&bull;</span> Smart Tracking <span className="text-emerald-400 mx-2">&bull;</span> A Better Campus Experience
      </footer>
    </div>
  );
};
