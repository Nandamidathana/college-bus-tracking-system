import React from 'react';
import { Bus } from 'lucide-react';

interface CollegeBusLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const CollegeBusLogo: React.FC<CollegeBusLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const iconSizes = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-16 h-16 rounded-3xl',
  };

  const busSizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Blue Rounded Squircle Bus Icon */}
      <div
        className={`${iconSizes[size]} bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 mb-2 border border-blue-400/30`}
      >
        <Bus className={`${busSizes[size]} text-white`} strokeWidth={2.2} />
      </div>

      {/* Brand Title */}
      <div className={`font-bold tracking-tight ${titleSizes[size]} flex items-center gap-1`}>
        <span className="text-slate-900 dark:text-white">CollegeBus</span>
        <span className="text-emerald-500 font-extrabold">Live</span>
      </div>

      {/* Subtitle */}
      {showSubtitle && (
        <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wider mt-0.5">
          Track <span className="text-slate-400">&bull;</span> Travel <span className="text-slate-400">&bull;</span> Stay Safe
        </p>
      )}
    </div>
  );
};
