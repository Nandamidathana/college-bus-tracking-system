import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Bus, Compass, Navigation, Shield, CheckCircle, Radio, Sun, Moon, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight leading-tight block">
                CollegeBus Live
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                SRGEC Campus Transit
              </span>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>Real-time GPS Tracking System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Track your college bus,{' '}
            <span className="text-blue-600 dark:text-blue-400">anytime, anywhere</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto">
            Get accurate arrival times, live bus locations, route updates, and stop alerts for Seshadri Rao Gudlavalleru Engineering College.
          </p>
        </div>

        {/* 3 Role Gateway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Student Portal</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Track your assigned bus in real time, view route stops, and receive arrival alerts at your boarding stop.
                </p>
              </div>

              <div className="pt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Live interactive map & road route</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Accurate distance & estimated arrival time</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>2 km proximity alert notifications</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <Link
                to="/student/login"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-xs"
              >
                <span>Student Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/student/register"
                className="w-full inline-flex items-center justify-center py-2 px-4 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors"
              >
                Register as Student
              </Link>
            </div>
          </div>

          {/* Driver Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Driver Portal</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Start your daily morning and evening trips, broadcast high-accuracy GPS, and monitor route stops.
                </p>
              </div>

              <div className="pt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>One-click trip start and finish</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Reliable device GPS streaming</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Turn-by-turn stop sequencing</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <Link
                to="/driver/login"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-xs"
              >
                <span>Driver Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/driver/register"
                className="w-full inline-flex items-center justify-center py-2 px-4 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors"
              >
                Register as Driver
              </Link>
            </div>
          </div>

          {/* Admin Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between shadow-xs hover:border-slate-400 dark:hover:border-slate-600 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Console</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Institutional fleet control, live multi-bus monitoring, route management, and arrival time reports.
                </p>
              </div>

              <div className="pt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Live multi-bus fleet map</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Route builder with coordinates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Exportable attendance and arrival records</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <Link
                to="/admin/login"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold text-sm transition-colors shadow-xs"
              >
                <span>Admin Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="text-center py-1 text-xs text-slate-500 dark:text-slate-400">
                Restricted to college transport staff
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
        &copy; {new Date().getFullYear()} CollegeBus Live Tracking &bull; Seshadri Rao Gudlavalleru Engineering College
      </footer>
    </div>
  );
};
