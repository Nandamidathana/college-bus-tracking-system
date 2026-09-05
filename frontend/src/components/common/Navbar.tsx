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
        return <span className="role-badge-admin px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-sm"><Shield className="w-3.5 h-3.5" /> Admin</span>;
      case 'DRIVER':
        return <span className="role-badge-driver px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-sm"><Navigation className="w-3.5 h-3.5" /> Driver</span>;
      case 'STUDENT':
        return <span className="role-badge-student px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-sm"><Compass className="w-3.5 h-3.5" /> Student</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3 pb-2">
        <div className="max-w-7xl mx-auto water-glass rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between shadow-2xl">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black brand-title tracking-tight block">
                CollegeBus Live
              </span>
              {user?.college?.name && (
                <span className="block text-[11px] font-bold truncate max-w-[180px] sm:max-w-xs subtext-muted">
                  {user.college.name}
                </span>
              )}
            </div>
          </Link>


          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold theme-toggle-btn shadow-md"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden md:inline text-slate-800 font-extrabold">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span className="hidden md:inline text-amber-200 font-extrabold">Light</span>
                </>
              )}
            </button>

            {user ? (
              <>
                {getRoleBadge(user.role)}
                
                {user.role === 'STUDENT' ? (
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-2 nav-user-btn border px-3 py-1.5 rounded-xl text-sm transition-all shadow-md group font-bold"
                    title="Click to view/edit profile & boarding point"
                  >
                    <User className="w-4 h-4 text-cyan-500 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span>{user.name}</span>
                    {user.student?.rollNumber && (
                      <span className="text-xs text-cyan-600 dark:text-cyan-300 font-mono">({user.student.rollNumber})</span>
                    )}
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center gap-2 nav-user-btn border px-3 py-1.5 rounded-xl text-sm font-bold">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{user.name}</span>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 nav-logout-btn border px-3 py-1.5 rounded-xl text-sm font-bold transition-all shadow-md"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/"
                className="text-sm bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>


      {/* Student Profile & Boarding Point Modal */}
      {user?.role === 'STUDENT' && (
        <StudentProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  );
};
