import React from 'react';
import { Compass, Map, Route as RouteIcon, MapPin } from 'lucide-react';

export type StudentNavTab = 'HOME' | 'MAP' | 'ROUTES' | 'MY_STOP';

interface FloatingBottomNavProps {
  activeTab: StudentNavTab;
  onTabChange: (tab: StudentNavTab) => void;
  isLive?: boolean;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  activeTab,
  onTabChange,
  isLive = false,
}) => {
  const tabs = [
    {
      id: 'HOME' as StudentNavTab,
      label: 'Home',
      icon: Compass,
    },
    {
      id: 'MAP' as StudentNavTab,
      label: 'Live Map',
      icon: Map,
      badge: isLive ? 'LIVE' : undefined,
    },
    {
      id: 'ROUTES' as StudentNavTab,
      label: 'Routes',
      icon: RouteIcon,
    },
    {
      id: 'MY_STOP' as StudentNavTab,
      label: 'My Stop',
      icon: MapPin,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t sm:border border-slate-200 dark:border-slate-800 sm:rounded-xl sm:shadow-lg p-1.5 flex items-center justify-around transition-all"
      aria-label="Mobile Navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-1.5 px-2 rounded-lg flex flex-col items-center justify-center transition-colors min-h-[44px] ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="relative flex items-center justify-center">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              {tab.badge && !isActive && (
                <span className="absolute -top-0.5 -right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </div>
            <span className="mt-1 text-[11px] leading-tight tracking-tight">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
