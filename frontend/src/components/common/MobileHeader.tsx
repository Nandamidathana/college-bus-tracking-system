import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, RefreshCw, MoreVertical, ShieldAlert } from 'lucide-react';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: 'bell' | 'refresh' | 'more' | 'sos' | 'none';
  onRightAction?: () => void;
  unreadCount?: number;
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBack = true,
  onBack,
  rightAction = 'none',
  onRightAction,
  unreadCount = 0,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={`sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between transition-colors ${className}`}>
      {/* Left: Back button or placeholder */}
      <div className="w-9 flex items-center">
        {showBack ? (
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* Center: Title */}
      <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[200px] text-center">
        {title}
      </h1>

      {/* Right: Optional Action */}
      <div className="w-9 flex items-center justify-end">
        {rightAction === 'bell' && (
          <button
            onClick={onRightAction || (() => navigate('/student/notifications'))}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
        )}

        {rightAction === 'refresh' && (
          <button
            onClick={onRightAction}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {rightAction === 'sos' && (
          <button
            onClick={onRightAction || (() => navigate('/student/sos'))}
            className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors"
            aria-label="Emergency SOS"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
        )}

        {rightAction === 'more' && (
          <button
            onClick={onRightAction}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}

        {rightAction === 'none' && <div className="w-9" />}
      </div>
    </header>
  );
};
