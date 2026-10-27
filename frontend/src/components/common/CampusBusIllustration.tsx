import React from 'react';

interface CampusBusIllustrationProps {
  className?: string;
  variant?: 'splash' | 'compact' | 'card';
}

export const CampusBusIllustration: React.FC<CampusBusIllustrationProps> = ({
  className = 'w-full h-48',
  variant = 'splash',
}) => {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50/60 p-2 ${className}`}>
      <svg
        viewBox="0 0 400 240"
        className="w-full h-full object-contain"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="70%" stopColor="#F0F9FF" />
            <stop offset="100%" stopColor="#DCFCE7" />
          </linearGradient>
          <linearGradient id="busBodyGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="35%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="busWindowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="buildingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>

        {/* Background Clouds */}
        <path d="M50 55 Q65 40 85 50 Q105 35 125 50 Q145 45 150 60 Q130 75 50 65 Z" fill="#FFFFFF" opacity="0.8" />
        <path d="M280 45 Q295 30 315 40 Q335 25 355 40 Q370 38 375 52 Q355 65 280 55 Z" fill="#FFFFFF" opacity="0.7" />

        {/* Campus Main Building with Clock Tower */}
        <g opacity="0.65">
          {/* Main Hall */}
          <rect x="140" y="80" width="120" height="90" fill="url(#buildingGrad)" rx="2" />
          {/* Wings */}
          <rect x="90" y="105" width="50" height="65" fill="#E2E8F0" rx="2" />
          <rect x="260" y="105" width="50" height="65" fill="#E2E8F0" rx="2" />
          {/* Center Tower */}
          <rect x="175" y="45" width="50" height="40" fill="#94A3B8" rx="2" />
          {/* Spire / Dome */}
          <polygon points="200,18 175,45 225,45" fill="#64748B" />
          {/* Clock circle */}
          <circle cx="200" cy="62" r="8" fill="#FFFFFF" stroke="#475569" strokeWidth="1.5" />
          <line x1="200" y1="62" x2="200" y2="57" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="200" y1="62" x2="204" y2="62" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />

          {/* Building Windows */}
          <g fill="#93C5FD" opacity="0.8">
            <rect x="155" y="95" width="10" height="15" rx="1" />
            <rect x="175" y="95" width="10" height="15" rx="1" />
            <rect x="215" y="95" width="10" height="15" rx="1" />
            <rect x="235" y="95" width="10" height="15" rx="1" />

            <rect x="155" y="125" width="10" height="15" rx="1" />
            <rect x="175" y="125" width="10" height="15" rx="1" />
            <rect x="215" y="125" width="10" height="15" rx="1" />
            <rect x="235" y="125" width="10" height="15" rx="1" />

            {/* Wing windows */}
            <rect x="105" y="120" width="8" height="12" rx="1" />
            <rect x="120" y="120" width="8" height="12" rx="1" />
            <rect x="272" y="120" width="8" height="12" rx="1" />
            <rect x="287" y="120" width="8" height="12" rx="1" />
          </g>

          {/* Pillars & Portal */}
          <rect x="185" y="140" width="30" height="30" fill="#334155" rx="15 15 0 0" />
        </g>

        {/* Trees */}
        <g>
          {/* Left Trees */}
          <path d="M40 180 Q45 130 65 140 Q85 125 95 150 Q105 140 105 180 Z" fill="#22C55E" opacity="0.9" />
          <path d="M20 180 Q30 145 45 155 Q60 145 65 180 Z" fill="#16A34A" opacity="0.95" />
          {/* Right Trees */}
          <path d="M305 180 Q315 135 330 145 Q350 130 365 155 Q380 145 385 180 Z" fill="#22C55E" opacity="0.9" />
          <path d="M340 180 Q350 150 365 158 Q380 150 390 180 Z" fill="#16A34A" opacity="0.95" />
        </g>

        {/* Road / Ground */}
        <rect x="0" y="175" width="400" height="65" fill="#E2E8F0" />
        <rect x="0" y="195" width="400" height="45" fill="#CBD5E1" />
        {/* Road Dash markings */}
        <line x1="20" y1="215" x2="60" y2="215" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="20 15" opacity="0.8" />
        <line x1="100" y1="215" x2="380" y2="215" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="20 15" opacity="0.8" />

        {/* Modern Blue College Bus */}
        <g id="college-bus" transform="translate(60, 115)">
          {/* Bus Shadow */}
          <ellipse cx="140" cy="88" rx="135" ry="8" fill="#64748B" opacity="0.35" />

          {/* Bus Main Chassis */}
          <rect x="15" y="15" width="250" height="65" rx="14" fill="url(#busBodyGrad)" />
          {/* White Accent Stripe */}
          <rect x="15" y="52" width="250" height="6" fill="#FFFFFF" opacity="0.9" />
          {/* Green Live Line */}
          <rect x="15" y="58" width="250" height="3" fill="#22C55E" />

          {/* Roof AC Unit */}
          <rect x="90" y="8" width="80" height="8" rx="4" fill="#1E3A8A" />

          {/* Front Windshield */}
          <path d="M225 22 L255 35 L255 52 L225 52 Z" fill="url(#busWindowGrad)" rx="2" />

          {/* Passenger Windows */}
          <g fill="url(#busWindowGrad)">
            <rect x="25" y="22" width="30" height="26" rx="4" />
            <rect x="62" y="22" width="30" height="26" rx="4" />
            <rect x="99" y="22" width="30" height="26" rx="4" />
            <rect x="136" y="22" width="30" height="26" rx="4" />
            <rect x="173" y="22" width="30" height="26" rx="4" />
            <rect x="210" y="22" width="12" height="26" rx="2" />
          </g>

          {/* Window Reflections */}
          <g fill="#FFFFFF" opacity="0.4">
            <polygon points="30,24 45,24 38,46 25,46" />
            <polygon points="67,24 82,24 75,46 62,46" />
            <polygon points="104,24 119,24 112,46 99,46" />
            <polygon points="141,24 156,24 149,46 136,46" />
            <polygon points="178,24 193,24 186,46 173,46" />
          </g>

          {/* Passenger Silhouettes */}
          <g fill="#0F172A" opacity="0.25">
            <circle cx="40" cy="33" r="5" />
            <path d="M33 46 C33 40 47 40 47 46 Z" />
            <circle cx="114" cy="33" r="5" />
            <path d="M107 46 C107 40 121 40 121 46 Z" />
            <circle cx="151" cy="33" r="5" />
            <path d="M144 46 C144 40 158 40 158 46 Z" />
          </g>

          {/* Headlights */}
          <path d="M263 56 Q266 58 263 64 Z" fill="#FDE047" />
          {/* Taillights */}
          <rect x="15" y="56" width="3" height="8" rx="1" fill="#EF4444" />

          {/* College Bus Text on Side */}
          <text x="140" y="70" fill="#FFFFFF" fontSize="9" fontWeight="bold" letterSpacing="1" textAnchor="middle" fontFamily="sans-serif">
            COLLEGEBUS LIVE
          </text>

          {/* Wheels */}
          <g>
            {/* Front Wheel */}
            <circle cx="215" cy="80" r="15" fill="#1E293B" />
            <circle cx="215" cy="80" r="10" fill="#475569" />
            <circle cx="215" cy="80" r="5" fill="#94A3B8" />

            {/* Rear Wheel */}
            <circle cx="65" cy="80" r="15" fill="#1E293B" />
            <circle cx="65" cy="80" r="10" fill="#475569" />
            <circle cx="65" cy="80" r="5" fill="#94A3B8" />
          </g>
        </g>
      </svg>
    </div>
  );
};
