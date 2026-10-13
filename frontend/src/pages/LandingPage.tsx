import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Bus, Compass, Navigation, Shield, CheckCircle, Radio, Sun, Moon } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col justify-between relative text-pastel-darkText dark:text-white">
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <button
          onClick={toggleTheme}
          className="p-2.5 sm:px-4 sm:py-2 rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 hover:bg-white transition-all flex items-center gap-2 text-xs font-black shadow-sm backdrop-blur-md"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 text-brand-600" />
              <span className="font-extrabold">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-pastel-yellow" />
              <span className="font-extrabold text-amber-200">Light</span>
            </>
          )}
        </button>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden pt-12 pb-12 sm:pb-16 px-3 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full hero-status-pill text-xs font-extrabold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600 shrink-0" />
            <span>Smart College Transit Tracking</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Track Your College Bus{' '}
            <span className="hero-gradient-text block sm:inline mt-1 sm:mt-0">
              In Real Time
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm subtext-muted font-semibold leading-relaxed px-2">
            Eliminate unpredictable wait times with live sub-second GPS telemetry, strict corridor route matching, and station progression timeline.
          </p>
        </div>

        {/* 3 User Role Gateway Cards */}
        <div className="max-w-6xl mx-auto mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-7">
          {/* Student Card */}
          <div className="water-glass hover:water-glass-glow rounded-3xl sm:rounded-4xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 group shadow-glass">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-pastel-yellow/30 border border-pastel-yellow text-amber-900 dark:text-pastel-yellow flex items-center justify-center group-hover:scale-105 transition-transform shadow-pill-yellow">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black mt-4 tracking-tight">Student Portal</h3>
              <p className="text-xs sm:text-sm mt-1.5 leading-relaxed font-semibold subtext-muted">
                Live GPS radar, distance to your boarding stop, station progression, and 2 km push alerts.
              </p>

              <div className="mt-5 space-y-2 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 dark:text-pastel-softTeal shrink-0" />
                  <span>Live GPS Radar & Road Polyline</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 dark:text-pastel-softTeal shrink-0" />
                  <span>Exact Stop Distance & Dynamic ETA</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 dark:text-pastel-softTeal shrink-0" />
                  <span>2 KM Proximity Arrival Notification</span>
                </div>
              </div>
            </div>

            <div className="mt-7 space-y-2.5">
              <Link
                to="/student/login"
                className="btn-pill-yellow w-full text-xs sm:text-sm py-3"
              >
                Student Sign In
              </Link>
              <Link
                to="/student/register"
                className="btn-pill-secondary w-full text-xs py-2.5"
              >
                New Student Registration
              </Link>
            </div>
          </div>

          {/* Driver Card */}
          <div className="water-glass hover:water-glass-glow rounded-3xl sm:rounded-4xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 group shadow-glass">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-pastel-mint border border-brand-400 text-brand-900 dark:text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-pill-teal">
                <Navigation className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black mt-4 tracking-tight">Driver Portal</h3>
              <p className="text-xs sm:text-sm mt-1.5 leading-relaxed font-semibold subtext-muted">
                One-tap start trip, continuous GPS broadcasting, and live passenger pickup list.
              </p>

              <div className="mt-5 space-y-2 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 dark:text-pastel-softTeal shrink-0" />
                  <span>Single-Tap Live Trip Activation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 dark:text-pastel-softTeal shrink-0" />
                  <span>High-Accuracy GPS Broadcast</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 dark:text-pastel-softTeal shrink-0" />
                  <span>Automatic Geofencing at Stops</span>
                </div>
              </div>
            </div>

            <div className="mt-7 space-y-2.5">
              <Link
                to="/driver/login"
                className="btn-pill-primary w-full text-xs sm:text-sm py-3"
              >
                Driver Sign In
              </Link>
              <Link
                to="/driver/register"
                className="btn-pill-secondary w-full text-xs py-2.5"
              >
                Driver Registration
              </Link>
            </div>
          </div>

          {/* Admin Card */}
          <div className="water-glass hover:water-glass-glow rounded-3xl sm:rounded-4xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 group shadow-glass">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-brand-100 border border-brand-300 text-brand-800 dark:text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black mt-4 tracking-tight">Admin Console</h3>
              <p className="text-xs sm:text-sm mt-1.5 leading-relaxed font-semibold subtext-muted">
                Institutional fleet management, live multi-bus tracking, route stop builder, and trip reports.
              </p>

              <div className="mt-5 space-y-2 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 dark:text-pastel-softTeal shrink-0" />
                  <span>Live Multi-Bus Fleet Command</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 dark:text-pastel-softTeal shrink-0" />
                  <span>Corridor Route & Stops Builder</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-600 dark:text-pastel-softTeal shrink-0" />
                  <span>Student & Driver Management</span>
                </div>
              </div>
            </div>

            <div className="mt-7 space-y-2.5">
              <Link
                to="/admin/login"
                className="btn-pill-primary w-full text-xs sm:text-sm py-3"
              >
                Admin Sign In
              </Link>
              <div className="text-center py-2 text-[11px] font-bold subtext-muted">
                Transport Administration
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-xs font-bold subtext-muted border-t border-black/5 dark:border-white/5">
        &copy; {new Date().getFullYear()} CollegeBus Live Tracking System &bull; SRGEC
      </footer>
    </div>
  );
};
