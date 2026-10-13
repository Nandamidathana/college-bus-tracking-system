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
          <span className="role-badge-admin px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm">
            <Shield className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" /> Admin
          </span>
        );
      case 'DRIVER':
        return (
          <span className="role-badge-driver px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm">
            <Navigation className="w-3.5 h-3.5 text-teal-800 dark:text-teal-200" /> Driver
          </span>
        );
      case 'STUDENT':
        return (
          <span className="role-badge-student px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm">
            <Compass className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" /> Student
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3 pb-2 transition-all">
        <div className="max-w-7xl mx-auto water-glass rounded-full sm:rounded-3xl px-4 sm:px-6 h-16 flex items-center justify-between shadow-glass">
          {/* Logo & College Title */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-pill-teal group-hover:scale-105 transition-transform shrink-0">
              <Bus className="w-5 h-5 text-pastel-yellow" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight block text-pastel-darkText dark:text-white">
                CollegeBus Live
              </span>
              {user?.college?.code && (
                <span className="block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-pastel-softTeal">
                  {user.college.code} • Campus Transit
                </span>
              )}
            </div>
          </Link>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:px-3 sm:py-1.5 rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 hover:bg-white transition-all flex items-center gap-1.5 text-xs font-extrabold shadow-sm"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-brand-600" />
                  <span className="hidden md:inline text-pastel-darkText font-extrabold">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-pastel-yellow" />
                  <span className="hidden md:inline text-amber-200 font-extrabold">Light</span>
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
                    className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-pastel-mint/50 dark:bg-brand-800/50 hover:bg-pastel-mint text-xs sm:text-sm font-extrabold text-brand-900 dark:text-white transition-all shadow-sm"
                    title="View & Edit Boarding Point"
                  >
                    <div className="w-5 h-5 rounded-full bg-brand-600 text-pastel-yellow flex items-center justify-center text-[10px]">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[80px] sm:max-w-none truncate">{user.name}</span>
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/10 text-xs sm:text-sm font-bold">
                    <User className="w-4 h-4 text-brand-600" />
                    <span>{user.name}</span>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-full border border-red-500/20 bg-red-50/80 dark:bg-red-950/40 hover:bg-red-100 text-red-700 dark:text-red-300 flex items-center gap-1 text-xs sm:text-sm font-extrabold transition-all shadow-sm"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
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
