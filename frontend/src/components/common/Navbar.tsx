import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Bus, LogOut, User, Shield, Compass, Navigation, Sun, Moon } from 'lucide-react';
import { StudentProfileModal } from '../student/StudentProfileModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="role-badge-admin px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" /> Admin
          </span>
        );
      case 'DRIVER':
        return (
          <span className="role-badge-driver px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Driver
          </span>
        );
      case 'STUDENT':
        return (
          <span className="role-badge-student px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Student
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & College Title */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors shrink-0">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight block text-slate-900 dark:text-white leading-tight">
                CollegeBus Live
              </span>
              {user?.college?.code ? (
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {user.college.code} • Campus Transit
                </span>
              ) : (
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Campus Transit System
                </span>
              )}
            </div>
          </Link>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-slate-600" />
                  <span className="hidden md:inline font-medium">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline font-medium">Light</span>
                </>
              )}
            </button>

            {user ? (
              <>
                <div className="hidden sm:block">
                  {getRoleBadge(user.role)}
                </div>

                {user.role === 'STUDENT' ? (
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                    title="View & Edit Boarding Point"
                  >
                    <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[85px] sm:max-w-none truncate">{user.name}</span>
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{user.name}</span>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      {user?.role === 'STUDENT' && (
        <StudentProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  );
};
