import React from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import { PwaBanner } from './PwaBanner';

interface MobileAppLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  unreadNotificationsCount?: number;
  activeScreenIndex?: number;
}

export const MobileAppLayout: React.FC<MobileAppLayoutProps> = ({
  children,
  showBottomNav = true,
  unreadNotificationsCount = 0,
}) => {
  return (
    <div className="min-h-screen w-full bg-slate-100 dark:bg-slate-950 flex justify-center overscroll-none select-none sm:select-auto">
      <PwaBanner />

      {/* Pure Portrait Mobile Application Viewport (9:16 portrait on desktop, edge-to-edge full width on mobile) */}
      <div className="w-full max-w-md min-h-screen bg-slate-50 dark:bg-slate-900 shadow-xl flex flex-col relative overflow-x-hidden">
        {/* Screen Content Viewport */}
        <main className={`flex-1 flex flex-col w-full ${showBottomNav ? 'pb-20' : ''}`}>
          {children}
        </main>

        {/* Floating Mobile Bottom Navigation Bar (where applicable) */}
        {showBottomNav && (
          <MobileBottomNav unreadNotificationsCount={unreadNotificationsCount} />
        )}
      </div>
    </div>
  );
};
