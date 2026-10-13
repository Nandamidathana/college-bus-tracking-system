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
    <div className="min-h-screen flex flex-col md:flex-row relative text-pastel-darkText dark:text-white">
      {/* Floating Late Bus Alert Toast */}
      {delayAlerts.length > 0 && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-auto animate-fadeIn">
          {delayAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-3xl bg-red-950/90 border-2 border-red-500 shadow-2xl backdrop-blur-xl text-white space-y-2 relative"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-red-400 font-extrabold text-xs">
                  <AlertTriangle className="w-4 h-4 animate-bounce shrink-0" />
                  <span>LATE BUS ALERT (+{alert.delayMinutes}m)</span>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <div className="font-extrabold text-sm text-white">
                  Bus {alert.busNumber} • {alert.routeName}
                </div>
                <div className="text-xs text-slate-300 mt-0.5 flex items-center justify-between">
                  <span>Driver: {alert.driverName}</span>
                  <span className="font-mono text-[11px] text-red-300">{alert.timestamp}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    navigate(`/admin/live-map?focusBusId=${alert.busId}`);
                    dismissAlert(alert.id);
                  }}
                  className="btn-pill-primary text-xs py-1.5 px-3 flex-1"
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>Track Radar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sidebar with Frosted Glass Surface */}
      <aside className="w-full md:w-64 water-glass border-r border-black/5 dark:border-white/10 flex flex-col justify-between shrink-0 shadow-glass m-3 rounded-3xl">
        <div>
          {/* Logo & College Banner */}
          <div className="p-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-pastel-yellow shadow-pill-teal shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-sm tracking-tight truncate">
                  Admin Console
                </h2>
                <span className="text-[11px] font-bold text-brand-700 dark:text-pastel-softTeal truncate block">
                  {user?.college?.name || 'SRGEC Fleet'}
                </span>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 hover:bg-white transition-all shadow-sm shrink-0"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-brand-600" />
              ) : (
                <Sun className="w-4 h-4 text-pastel-yellow" />
              )}
            </button>
          </div>

          {/* Navigation Links with Yellow Active Pill */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin/dashboard'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-black transition-all ${
                      isActive
                        ? 'bg-pastel-yellow text-pastel-darkText shadow-pill-yellow scale-[1.02]'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-pastel-mint text-brand-900 font-extrabold">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-black/5 dark:border-white/10 space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-brand-600 text-pastel-yellow flex items-center justify-center text-xs font-black">
              {user?.name ? user.name[0] : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black truncate">{user?.name}</p>
              <p className="text-[10px] subtext-muted truncate font-mono">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-extrabold border border-red-500/20 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen p-3 md:p-6 pb-20">
        <Outlet />
      </main>
    </div>
  );
};
