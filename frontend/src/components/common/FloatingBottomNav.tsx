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
      className="floating-bottom-nav"
      aria-label="Mobile Bottom Navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`nav-pill-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="relative flex items-center justify-center">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
              {tab.badge && !isActive && (
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-white"></span>
              )}
            </div>
            <span className="mt-0.5 tracking-tight text-[11px] leading-tight font-extrabold">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
