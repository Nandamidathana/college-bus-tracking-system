import React from 'react';
import { WifiOff, Download, X } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export const PwaBanner: React.FC = () => {
  const { isOnline, isInstallable, promptInstall } = usePWA();
  const [dismissedInstall, setDismissedInstall] = React.useState(false);

  return (
    <>
      {/* Offline Status Warning Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs sticky top-0 z-50">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              You are currently offline. Viewing cached route and stop schedules. Live bus GPS positions will resume once
              reconnected.
            </span>
          </div>
        </div>
      )}

      {/* PWA Install App Banner */}
      {isOnline && isInstallable && !dismissedInstall && (
        <aside aria-label="Install app banner" className="bg-slate-900 text-white px-4 py-2 text-xs border-b border-slate-800 shadow-sm sticky top-0 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="font-medium">Install College Bus Tracker for quick home screen access & instant alerts</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={promptInstall}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Install App
              </button>
              <button
                onClick={() => setDismissedInstall(true)}
                title="Dismiss"
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};

export default PwaBanner;
