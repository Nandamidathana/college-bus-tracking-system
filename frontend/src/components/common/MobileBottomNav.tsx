import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Route as RouteIcon, Map, Bell, User } from 'lucide-react';

interface MobileBottomNavProps {
  unreadNotificationsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  unreadNotificationsCount = 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/student/dashboard',
      isActive: currentPath === '/student/dashboard' || currentPath === '/dashboard',
    },
    {
      id: 'routes',
      label: 'Routes',
      icon: RouteIcon,
      path: '/student/routes',
      isActive: currentPath === '/student/routes',
    },
    {
      id: 'map',
      label: 'Map',
      icon: Map,
      path: '/student/live-tracking',
      isActive: currentPath === '/student/live-tracking',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      path: '/student/notifications',
      isActive: currentPath === '/student/notifications',
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/student/profile',
      isActive: currentPath === '/student/profile',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-lg px-2 py-1.5 transition-all">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                active
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${active ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${active ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {active && (
                <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
