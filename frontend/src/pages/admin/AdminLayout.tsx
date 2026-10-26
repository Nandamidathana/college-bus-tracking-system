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
  Menu,
  X,
} from 'lucide-react';
import { PwaBanner } from '../../components/common/PwaBanner';

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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <PwaBanner />
      {/* Floating Late Bus Alert Toast */}
      {delayAlerts.length > 0 && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-auto animate-fadeIn">
          {delayAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-red-300 dark:border-red-900/60 shadow-lg text-slate-900 dark:text-slate-100 space-y-2 relative"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>BUS DELAY ALERT (+{alert.delayMinutes}m)</span>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Bus #{alert.busNumber} &bull; {alert.routeName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>Driver: {alert.driverName}</span>
                  <span className="font-mono text-[11px] text-red-600 dark:text-red-400">{alert.timestamp}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    navigate(`/admin/live-map?focusBusId=${alert.busId}`);
                    dismissAlert(alert.id);
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Track on Map</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">Admin Console</h2>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate block max-w-[150px]">
              {user?.college?.name || 'SRGEC Fleet'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            aria-label="Toggle navigation drawer"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Sidebar: Slide-out drawer on Mobile, Fixed column on Desktop */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col justify-between shrink-0 shadow-xs transition-transform duration-200 ease-in-out ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo & College Banner */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                  Admin Console
                </h2>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate block">
                  {user?.college?.name || 'SRGEC Fleet'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="hidden md:inline-flex p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin/dashboard'}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold">
              {user?.name ? user.name[0] : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen p-4 md:p-6 pb-20">
        <Outlet />
      </main>
    </div>
  );
};
