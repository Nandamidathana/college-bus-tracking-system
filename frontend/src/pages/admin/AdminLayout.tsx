import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getSocket } from '../../services/socket';
import {
  LayoutDashboard,
  Radio,
  Bus,
  Users,
  Route as RouteIcon,
  GraduationCap,
  History,
  Settings,
  LogOut,
  Shield,
  Sun,
  Moon,
  FileSpreadsheet,
  AlertTriangle,
  X,
  MapPin,
  ChevronRight,
  Phone,
} from 'lucide-react';

interface DelayAlert {
  id: string;
  busId: string;
  busNumber: string;
  routeName: string;
  driverName: string;
  driverPhone?: string;
  delayMinutes: number;
  message: string;
  timestamp: string;
}

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [delayAlerts, setDelayAlerts] = useState<DelayAlert[]>([]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleDelayAlert = (payload: any) => {
      const newAlert: DelayAlert = {
        id: `${payload.busId}_${Date.now()}`,
        busId: payload.busId,
        busNumber: payload.busNumber || 'Bus',
        routeName: payload.routeName || 'General Route',
        driverName: payload.driverName || 'Driver',
        driverPhone: payload.driverPhone,
        delayMinutes: payload.delayMinutes || 0,
        message: payload.message || `Bus ${payload.busNumber} is delayed!`,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      };

      setDelayAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
    };

    socket.on('admin:bus:delayed', handleDelayAlert);

    return () => {
      socket.off('admin:bus:delayed', handleDelayAlert);
    };
  }, []);

  const dismissAlert = (id: string) => {
    setDelayAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/live-map', label: 'Live Tracking', icon: Radio, highlight: true },
    { to: '/admin/arrivals', label: 'Arrivals & Reports', icon: FileSpreadsheet, badge: 'New' },
    { to: '/admin/buses', label: 'Buses', icon: Bus },
    { to: '/admin/drivers', label: 'Drivers', icon: Users },
    { to: '/admin/routes', label: 'Routes & Stops', icon: RouteIcon },
    { to: '/admin/students', label: 'Students', icon: GraduationCap },
    { to: '/admin/trips', label: 'Trips History', icon: History },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* Real-time Delayed Bus Floating Alert Toaster */}
      {delayAlerts.length > 0 && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-auto animate-slideDown">
          {delayAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-2xl bg-gradient-to-r from-red-950/90 to-slate-900/95 border-2 border-red-500/50 shadow-2xl backdrop-blur-xl text-white space-y-2 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-red-400 font-extrabold text-sm">
                  <AlertTriangle className="w-5 h-5 animate-bounce text-red-400 shrink-0" />
                  <span>🚨 LATE BUS ALERT (+{alert.delayMinutes}m)</span>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <div className="font-bold text-base text-white">
                  Bus {alert.busNumber} • {alert.routeName}
                </div>
                <div className="text-xs text-slate-300 mt-0.5 flex items-center justify-between">
                  <span>Driver: {alert.driverName}</span>
                  <span className="font-mono text-[11px] text-red-300">{alert.timestamp}</span>
                </div>
                {alert.driverPhone && alert.driverPhone !== 'N/A' && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    <span>{alert.driverPhone}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    navigate(`/admin/live-map?focusBusId=${alert.busId}`);
                    dismissAlert(alert.id);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/40 transition-all"
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  Track Live Radar
                </button>

                <button
                  onClick={() => {
                    navigate('/admin/arrivals');
                    dismissAlert(alert.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center gap-1"
                >
                  Reports
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sidebar (iPhone Water UI Glass) */}
      <aside className="w-full md:w-64 water-glass border-r border-white/10 flex flex-col justify-between shrink-0 shadow-2xl m-3 rounded-3xl">
        <div>
          {/* Logo & College Banner + Theme Toggle */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-base tracking-tight truncate drop-shadow-sm card-title">
                  Admin Console
                </h2>
                <span className="text-xs text-purple-600 dark:text-purple-300 truncate block font-bold">
                  {user?.college?.name || 'College Admin'}
                </span>
              </div>
            </div>

            {/* Compact Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border transition-all theme-toggle-btn shadow-md shrink-0"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-indigo-600" />
              ) : (
                <Sun className="w-4 h-4 text-amber-300" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin/dashboard'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-600/30'
                        : 'text-slate-800 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white'
                    }`
                  }
                >
                  <Icon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-emerald-500 dark:text-emerald-400' : ''}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping"></span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/20 flex items-center justify-center text-xs font-black text-slate-800 dark:text-white">
              {user?.name ? user.name[0] : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate font-mono">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 nav-logout-btn py-2 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen p-3 md:p-6">
        <Outlet />
      </main>
    </div>
  );
};
