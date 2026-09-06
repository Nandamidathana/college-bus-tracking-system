import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Bus, Compass, Navigation, Shield, CheckCircle, Radio, Clock, ShieldCheck, MapPin, Sparkles, Sun, Moon } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col justify-between relative">
      {/* Floating Theme Toggle in Top Corner */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <button
          onClick={toggleTheme}
          className="p-2.5 sm:px-3.5 sm:py-2 rounded-2xl border transition-all flex items-center gap-2 text-xs font-black theme-toggle-btn shadow-lg backdrop-blur-md"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-900 font-extrabold">Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-300" />
              <span className="text-amber-200 font-extrabold">Light Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full hero-status-pill text-xs font-black uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500 shrink-0" />
            <span>Live GPS Campus Transport System</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight drop-shadow-sm text-slate-900 dark:text-white">
            Track Your College Bus{' '}
            <span className="hero-gradient-text block sm:inline mt-1 sm:mt-0">
              In Real Time
            </span>
          </h1>
        </div>

        {/* 3 User Role Gateway Cards (iPhone Water UI Frosted Glass) */}
        <div className="max-w-6xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Student Card */}
          <div className="water-glass hover:water-glass-glow rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 group">
            <div>
              <div className="w-14 h-14 rounded-2xl card-icon-blue flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black mt-5 tracking-tight card-title">Student Portal</h3>
              <p className="text-sm mt-2 leading-relaxed font-semibold card-desc">
                Live bus tracking, road distance to your boarding stop, and automated 2 km arrival alerts.
              </p>

              <div className="mt-6 space-y-2.5 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="feature-item-text">Live GPS Bus Radar & Map</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="feature-item-text">Exact Stop Distance & ETA</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="feature-item-text">2 KM Arrival Notification</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-2.5">
              <Link
                to="/student/login"
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 transition-all text-sm"
              >
                Student Sign In
              </Link>
              <Link
                to="/student/register"
                className="w-full btn-secondary-blue py-2.5 px-4 rounded-2xl flex items-center justify-center text-xs transition-colors shadow-sm"
              >
                New Student Registration
              </Link>
            </div>
          </div>

          {/* Driver Card */}
          <div className="water-glass hover:water-glass-glow rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 group">
            <div>
              <div className="w-14 h-14 rounded-2xl card-icon-emerald flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Navigation className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black mt-5 tracking-tight card-title">Driver Portal</h3>
              <p className="text-sm mt-2 leading-relaxed font-semibold card-desc">
                Broadcast real-time bus GPS coordinates. One-touch trip controls and live navigation.
              </p>

              <div className="mt-6 space-y-2.5 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="feature-item-text">One-Touch Start / End Trip</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="feature-item-text">High-Accuracy GPS Broadcast</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="feature-item-text">Driver Navigation Map</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-2.5">
              <Link
                to="/driver/login"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all text-sm"
              >
                Driver Sign In
              </Link>
              <Link
                to="/driver/register"
                className="w-full btn-secondary-emerald py-2.5 px-4 rounded-2xl flex items-center justify-center text-xs transition-colors shadow-sm"
              >
                Driver Registration
              </Link>
            </div>
          </div>

          {/* Admin Card */}
          <div className="water-glass hover:water-glass-glow rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 group">
            <div>
              <div className="w-14 h-14 rounded-2xl card-icon-purple flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black mt-5 tracking-tight card-title">Admin Console</h3>
              <p className="text-sm mt-2 leading-relaxed font-semibold card-desc">
                Centralized fleet management. Live multi-bus radar, driver approvals, and route creator.
              </p>

              <div className="mt-6 space-y-2.5 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="feature-item-text">Live Multi-Bus Fleet Radar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="feature-item-text">Driver Approvals & Assignments</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="feature-item-text">Routes & Boarding Stop Setup</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-2.5">
              <Link
                to="/admin/login"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 transition-all text-sm"
              >
                Admin Sign In
              </Link>
              <div className="text-center py-2 text-[11px] font-bold subtext-muted">
                Transport Management
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-xs font-bold subtext-muted">
        &copy; {new Date().getFullYear()} College Bus Tracking System &bull; SRGEC
      </footer>
    </div>
  );
};
