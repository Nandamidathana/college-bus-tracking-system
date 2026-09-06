import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bus, BoardingPoint, College } from '../../types';
import { fetchRoadRoute, RouteNavigationData } from '../../services/routing';
import { Layers, Map as MapIcon, Globe, Navigation, Compass, Route as RouteIcon } from 'lucide-react';

// Fix default leaflet marker icon assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Auto-Fit Bounds to show both Bus, Student, and Road route in full view
const AutoFitBounds: React.FC<{
  busLocation?: { latitude: number; longitude: number } | null;
  boardingPoint?: { latitude: number; longitude: number } | null;
  userLiveLocation?: { latitude: number; longitude: number } | null;
  customDestination?: { latitude: number; longitude: number } | null;
  roadCoordinates?: [number, number][];
}> = ({ busLocation, boardingPoint, userLiveLocation, customDestination, roadCoordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (roadCoordinates && roadCoordinates.length > 1) {
      const bounds = L.latLngBounds(roadCoordinates);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else {
      const pts: [number, number][] = [];
      if (busLocation?.latitude && busLocation?.longitude) pts.push([busLocation.latitude, busLocation.longitude]);
      if (boardingPoint?.latitude && boardingPoint?.longitude) pts.push([boardingPoint.latitude, boardingPoint.longitude]);
      if (userLiveLocation?.latitude && userLiveLocation?.longitude) pts.push([userLiveLocation.latitude, userLiveLocation.longitude]);
      if (customDestination?.latitude && customDestination?.longitude) pts.push([customDestination.latitude, customDestination.longitude]);

      if (pts.length > 1) {
        const bounds = L.latLngBounds(pts);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      }
    }
  }, [
    busLocation?.latitude,
    busLocation?.longitude,
    boardingPoint?.latitude,
    boardingPoint?.longitude,
    userLiveLocation?.latitude,
    userLiveLocation?.longitude,
    customDestination?.latitude,
    customDestination?.longitude,
    roadCoordinates?.length,
  ]);

  return null;
};

// Calculate bearing angle between two GPS coordinates
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// Create Realistic Horizontal Moving College Bus Symbol with Dynamic Rotation and Headlight Beams
export function createBusIcon(
  busNumber: string,
  heading: number = 90,
  status: 'LIVE' | 'APPROACHING' | 'NEARBY' | 'LOCATION_DELAYED' | 'OFFLINE' = 'LIVE'
) {
  const isLive = status === 'LIVE' || status === 'APPROACHING' || status === 'NEARBY';
  const pulseRing = isLive
    ? '<div class="absolute -inset-4 bg-amber-400/25 rounded-full animate-ping pointer-events-none"></div>'
    : '';

  // Horizontal College Bus SVG (Oriented facing East/Right by default, rotated smoothly by heading - 90deg)
  const rotationAngle = (heading - 90 + 360) % 360;

  const html = `
    <div class="relative w-16 h-16 flex items-center justify-center pointer-events-auto cursor-pointer group">
      ${pulseRing}

      <!-- Rotated Vehicle Body along road direction -->
      <div style="transform: rotate(${rotationAngle}deg); transform-origin: center center;" class="transition-transform duration-300 ease-out relative flex items-center justify-center filter drop-shadow-[0_10px_16px_rgba(0,0,0,0.65)]">
        
        <!-- Forward Headlight Beams (Shooting forward to the right) -->
        ${isLive ? `
          <div class="absolute -right-7 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-amber-300/40 via-yellow-200/20 to-transparent pointer-events-none blur-[2px] rounded-r-full"></div>
        ` : ''}

        <!-- Realistic Horizontal Bus SVG -->
        <svg width="60" height="30" viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg" class="overflow-visible">
          <!-- 4 Rubber Wheels / Tires -->
          <rect x="8" y="0.5" width="10" height="3.5" rx="1.5" fill="#0f172a" stroke="#334155" stroke-width="0.75" />
          <rect x="42" y="0.5" width="10" height="3.5" rx="1.5" fill="#0f172a" stroke="#334155" stroke-width="0.75" />
          <rect x="8" y="26" width="10" height="3.5" rx="1.5" fill="#0f172a" stroke="#334155" stroke-width="0.75" />
          <rect x="42" y="26" width="10" height="3.5" rx="1.5" fill="#0f172a" stroke="#334155" stroke-width="0.75" />

          <!-- Main Bus Chassis & Body -->
          <rect x="3" y="3" width="54" height="24" rx="7" fill="url(#busBodyGrad)" stroke="#78350f" stroke-width="1.5" />

          <!-- Roof Accent Stripes (College Transport Look) -->
          <line x1="12" y1="6" x2="48" y2="6" stroke="#b45309" stroke-width="1" stroke-dasharray="2 2" />
          <line x1="12" y1="24" x2="48" y2="24" stroke="#b45309" stroke-width="1" stroke-dasharray="2 2" />

          <!-- Center Roof AC Ventilation Unit -->
          <rect x="23" y="10" width="14" height="10" rx="2" fill="#d97706" stroke="#92400e" stroke-width="1" />
          <line x1="26" y1="12.5" x2="34" y2="12.5" stroke="#78350f" stroke-width="1" />
          <line x1="26" y1="15" x2="34" y2="15" stroke="#78350f" stroke-width="1" />
          <line x1="26" y1="17.5" x2="34" y2="17.5" stroke="#78350f" stroke-width="1" />

          <!-- Side Tinted Passenger Windows (Left to Right) -->
          <rect x="10" y="5.5" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x="16" y="5.5" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x="39" y="5.5" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x="45" y="5.5" width="4.5" height="4.5" rx="1" fill="#0f172a" />

          <rect x="10" y="20" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x="16" y="20" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x="39" y="20" width="4.5" height="4.5" rx="1" fill="#0f172a" />
          <rect x="45" y="20" width="4.5" height="4.5" rx="1" fill="#0f172a" />

          <!-- Rear Windshield Glass -->
          <rect x="4" y="8" width="3" height="14" rx="1" fill="#38bdf8" />

          <!-- Front Panoramic Windshield Glass -->
          <path d="M51 6.5C53.5 8.5 54.5 11 54.5 15C54.5 19 53.5 21.5 51 23.5V6.5Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.75" />
          <line x1="51.5" y1="8" x2="53.5" y2="15" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.8" />

          <!-- Dual Xenon Front Headlights -->
          <circle cx="56" cy="7" r="1.75" fill="#ffffff" stroke="#fde047" stroke-width="0.75" />
          <circle cx="56" cy="23" r="1.75" fill="#ffffff" stroke="#fde047" stroke-width="0.75" />

          <!-- Dual Red Rear Tail / Brake Lights -->
          <rect x="2" y="6" width="2" height="3.5" rx="0.75" fill="#ef4444" shadow="0 0 6px #ef4444" />
          <rect x="2" y="20.5" width="2" height="3.5" rx="0.75" fill="#ef4444" shadow="0 0 6px #ef4444" />

          <defs>
            <linearGradient id="busBodyGrad" x1="3" y1="3" x2="3" y2="27" gradientUnits="userSpaceOnUse">
              <stop stop-color="#fbbf24" />
              <stop offset="0.5" stop-color="#f59e0b" />
              <stop offset="1" stop-color="#d97706" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <!-- Upright Bus Number Badge (Non-rotated for crisp readability) -->
      <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-950/95 text-amber-300 border-2 border-amber-400 text-[10px] font-black rounded-lg shadow-2xl whitespace-nowrap font-mono tracking-wider flex items-center gap-1 z-20">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        ${busNumber}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-horizontal-bus-marker',
    iconSize: [64, 64],
    iconAnchor: [32, 32],
  });
}


// Student Boarding Point Icon (Exact Center Anchored)
export function createBoardingPointIcon(name: string) {
  const html = `
    <div class="relative w-10 h-10 flex flex-col items-center justify-center">
      <div class="w-9 h-9 rounded-full bg-blue-600 shadow-2xl flex items-center justify-center text-white border-2 border-white ring-4 ring-blue-500/40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
      <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-950/95 text-blue-100 border border-blue-500 text-[10px] font-bold rounded shadow-xl whitespace-nowrap z-10">
        📍 ${name}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-boarding-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// Student Live Device GPS Location Icon (Cyan Pulse Dot)
export function createLiveUserIcon() {
  const html = `
    <div class="relative w-8 h-8 flex items-center justify-center">
      <div class="absolute -inset-1.5 bg-cyan-400/35 rounded-full animate-ping"></div>
      <div class="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white shadow-xl flex items-center justify-center ring-4 ring-cyan-400/40">
        <div class="w-2 h-2 rounded-full bg-white"></div>
      </div>
      <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-cyan-950/95 text-cyan-200 border border-cyan-500 text-[9px] font-bold rounded shadow whitespace-nowrap z-10">
        📱 You (Live GPS)
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-user-live-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// College Campus Icon (Exact Center Anchored)
export function createCollegeIcon(name: string) {
  const html = `
    <div class="relative w-10 h-10 flex flex-col items-center justify-center">
      <div class="w-9 h-9 rounded-2xl bg-amber-600 shadow-2xl flex items-center justify-center text-white border-2 border-white ring-4 ring-amber-500/40">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
          <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
        </svg>
      </div>
      <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-950/95 text-amber-200 border border-amber-500 text-[10px] font-bold rounded shadow-xl whitespace-nowrap z-10">
        🏛️ ${name}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-college-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// Terminus / Final Village Destination Icon
export function createTerminusIcon(name: string) {
  const html = `
    <div class="relative w-10 h-10 flex flex-col items-center justify-center">
      <div class="w-9 h-9 rounded-2xl bg-emerald-600 shadow-2xl flex items-center justify-center text-white border-2 border-white ring-4 ring-emerald-500/40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
          <line x1="4" y1="22" x2="4" y2="15"></line>
        </svg>
      </div>
      <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-950/95 text-emerald-200 border border-emerald-500 text-[10px] font-bold rounded shadow-xl whitespace-nowrap z-10">
        🏁 ${name}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-terminus-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// Route Stop Icon (Exact Center Anchored with crisp readable pill badge)
export function createStopIcon(sequence: number, name: string) {
  const html = `
    <div class="relative w-8 h-8 flex flex-col items-center justify-center">
      <div class="w-7 h-7 rounded-full bg-slate-900 border-2 border-indigo-400 text-white text-xs font-black flex items-center justify-center shadow-2xl ring-2 ring-indigo-500/30">
        ${sequence}
      </div>
      <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-950/95 text-indigo-200 border border-indigo-500/50 text-[10px] font-extrabold rounded-md shadow-2xl whitespace-nowrap z-10 pointer-events-none">
        ${sequence}. ${name}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-stop-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Live Smooth-Gliding and Angle-Cutting Animated Bus Marker for Real-Time Movement
export const LiveAnimatedBusMarker: React.FC<{
  position: [number, number];
  heading?: number;
  busNumber: string;
  speed?: number;
  accuracy?: number;
  status?: 'LIVE' | 'APPROACHING' | 'NEARBY' | 'LOCATION_DELAYED' | 'OFFLINE';
  driverName?: string;
  routeName?: string;
  onClick?: () => void;
}> = ({
  position,
  heading = 90,
  busNumber,
  speed = 0,
  accuracy = 5,
  status = 'LIVE',
  driverName,
  routeName,
  onClick,
}) => {
  const [currentPos, setCurrentPos] = useState<[number, number]>(position);
  const [currentHeading, setCurrentHeading] = useState<number>(heading || 90);
  const animRef = useRef<number | null>(null);
  const prevPosRef = useRef<[number, number]>(position);
  const startTimeRef = useRef<number>(0);
  const targetPosRef = useRef<[number, number]>(position);
  const targetHeadingRef = useRef<number>(heading || 90);
  const startPosRef = useRef<[number, number]>(position);
  const startHeadingRef = useRef<number>(heading || 90);

  useEffect(() => {
    const [targetLat, targetLng] = position;
    const [prevLat, prevLng] = prevPosRef.current;

    // Check if coordinates changed
    const coordsChanged =
      Math.abs(targetLat - prevLat) > 0.000001 ||
      Math.abs(targetLng - prevLng) > 0.000001;

    let computedHeading = heading;
    if (coordsChanged && (!heading || heading === 0 || heading === 90)) {
      computedHeading = calculateBearing(prevLat, prevLng, targetLat, targetLng);
    }

    if (coordsChanged || Math.abs(computedHeading - currentHeading) > 1) {
      targetPosRef.current = [targetLat, targetLng];
      targetHeadingRef.current = computedHeading;
      startPosRef.current = [currentPos[0], currentPos[1]];
      startHeadingRef.current = currentHeading;
      startTimeRef.current = performance.now();
      const duration = 1200; // 1.2s smooth glide and curve cutting

      if (animRef.current) cancelAnimationFrame(animRef.current);

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(1, elapsed / duration);
        // Ease-out cubic for realistic vehicle deceleration
        const ease = 1 - Math.pow(1 - progress, 3);

        const lat =
          startPosRef.current[0] +
          (targetPosRef.current[0] - startPosRef.current[0]) * ease;
        const lng =
          startPosRef.current[1] +
          (targetPosRef.current[1] - startPosRef.current[1]) * ease;

        // Shortest arc rotation interpolation for smooth vehicle turns
        let diff = (targetHeadingRef.current - startHeadingRef.current) % 360;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        const h = (startHeadingRef.current + diff * ease + 360) % 360;

        setCurrentPos([lat, lng]);
        setCurrentHeading(h);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          prevPosRef.current = targetPosRef.current;
        }
      };

      animRef.current = requestAnimationFrame(animate);
    } else {
      prevPosRef.current = [targetLat, targetLng];
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [position[0], position[1], heading]);

  return (
    <Marker
      position={currentPos}
      icon={createBusIcon(busNumber, currentHeading, status)}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup>
        <div className="p-1 space-y-1.5 min-w-[180px]">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-full ${
                status === 'LIVE'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}
            >
              {status}
            </span>
            <span className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded font-mono font-bold">
              {busNumber}
            </span>
          </div>
          {driverName && (
            <div className="text-xs text-slate-700 dark:text-slate-300">
              Driver: <span className="font-bold text-slate-950 dark:text-white">{driverName}</span>
            </div>
          )}
          {routeName && (
            <div className="text-xs text-slate-700 dark:text-slate-300">
              Route: <span className="font-bold text-indigo-600 dark:text-indigo-300">{routeName}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
            <span>Speed: {Math.round(speed)} km/h</span>
            <span>Accuracy: &plusmn;{Math.round(accuracy)}m</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export type MapMode = 'street' | 'satellite' | 'transit';

interface BusMapProps {
  busLocation?: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    busNumber?: string;
    status?: 'LIVE' | 'APPROACHING' | 'NEARBY' | 'LOCATION_DELAYED' | 'OFFLINE';
  } | null;
  boardingPoint?: {
    name: string;
    latitude: number;
    longitude: number;
  } | null;
  userLiveLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  college?: College | { name: string; latitude: number; longitude: number } | null;
  customDestination?: {
    name: string;
    latitude: number;
    longitude: number;
    isTerminus?: boolean;
  } | null;
  routeStops?: BoardingPoint[];
  busesList?: Array<{
    busId: string;
    busNumber: string;
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    driverName?: string;
    routeName?: string;
    status: 'LIVE' | 'APPROACHING' | 'NEARBY' | 'LOCATION_DELAYED' | 'OFFLINE';
  }>;
  onBusClick?: (busId: string) => void;
  onRoadRouteCalculated?: (nav: RouteNavigationData) => void;
  destinationTarget?: 'BOARDING_POINT' | 'COLLEGE' | 'TRIP_DESTINATION';
  className?: string;
  zoom?: number;
  show2kmCircle?: boolean;
}

export const BusMap: React.FC<BusMapProps> = ({
  busLocation,
  boardingPoint,
  userLiveLocation,
  college,
  customDestination,
  routeStops = [],
  busesList = [],
  onBusClick,
  onRoadRouteCalculated,
  destinationTarget = 'BOARDING_POINT',
  className = 'h-[500px] w-full',
  zoom = 14,
  show2kmCircle = true,
}) => {
  const [mapMode, setMapMode] = useState<MapMode>('street');
  const [roadRoute, setRoadRoute] = useState<RouteNavigationData | null>(null);
  const lastCoordsRef = useRef<string>('');

  // Determine target navigation destination strictly based on boarding point, custom destination, or college
  const targetDestination = useMemo(() => {
    if (destinationTarget === 'TRIP_DESTINATION' && customDestination && customDestination.latitude && customDestination.longitude) {
      return {
        name: customDestination.name,
        latitude: customDestination.latitude,
        longitude: customDestination.longitude,
      };
    }
    if (destinationTarget === 'COLLEGE' && college && college.latitude && college.longitude) {
      return {
        name: college.name,
        latitude: college.latitude,
        longitude: college.longitude,
      };
    }
    if (boardingPoint && boardingPoint.latitude && boardingPoint.longitude) {
      return {
        name: boardingPoint.name,
        latitude: boardingPoint.latitude,
        longitude: boardingPoint.longitude,
      };
    }
    if (customDestination && customDestination.latitude && customDestination.longitude) {
      return {
        name: customDestination.name,
        latitude: customDestination.latitude,
        longitude: customDestination.longitude,
      };
    }
    if (college && college.latitude && college.longitude) {
      return {
        name: college.name,
        latitude: college.latitude,
        longitude: college.longitude,
      };
    }
    return null;
  }, [destinationTarget, college, boardingPoint, customDestination]);

  // Determine initial center
  let defaultCenter: [number, number] = [16.35068, 81.04273]; // default SRGEC coords

  if (busLocation && busLocation.latitude && busLocation.longitude) {
    defaultCenter = [busLocation.latitude, busLocation.longitude];
  } else if (targetDestination && targetDestination.latitude && targetDestination.longitude) {
    defaultCenter = [targetDestination.latitude, targetDestination.longitude];
  } else if (college && college.latitude && college.longitude) {
    defaultCenter = [college.latitude, college.longitude];
  }

  // 1. Compute real turn-by-turn road route between Bus and Target Destination via OSRM
  useEffect(() => {
    if (
      busLocation &&
      busLocation.latitude &&
      busLocation.longitude &&
      targetDestination &&
      targetDestination.latitude &&
      targetDestination.longitude
    ) {
      const coordKey = `${destinationTarget}_${busLocation.latitude.toFixed(4)},${busLocation.longitude.toFixed(4)}_${targetDestination.latitude.toFixed(4)},${targetDestination.longitude.toFixed(4)}`;
      if (coordKey === lastCoordsRef.current) return;
      lastCoordsRef.current = coordKey;

      fetchRoadRoute(
        busLocation.latitude,
        busLocation.longitude,
        targetDestination.latitude,
        targetDestination.longitude
      ).then((nav) => {
        if (nav) {
          setRoadRoute(nav);
          if (onRoadRouteCalculated) {
            onRoadRouteCalculated(nav);
          }
        }
      });
    } else {
      setRoadRoute(null);
    }
  }, [
    destinationTarget,
    busLocation?.latitude,
    busLocation?.longitude,
    targetDestination?.latitude,
    targetDestination?.longitude,
  ]);

  // Static route stops polyline fallback
  const polylineCoords: [number, number][] = routeStops
    .sort((a, b) => a.sequence - b.sequence)
    .map((s) => [s.latitude, s.longitude]);

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 ${className}`}>
      {/* Sleek Floating Map Mode Switcher */}
      <div className="absolute top-3 right-3 z-20 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-2xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMapMode('street')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mapMode === 'street'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Street</span>
        </button>

        <button
          type="button"
          onClick={() => setMapMode('satellite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mapMode === 'satellite'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>🛰️ Satellite</span>
        </button>

        <button
          type="button"
          onClick={() => setMapMode('transit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mapMode === 'transit'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Transit</span>
        </button>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        maxZoom={20}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <AutoFitBounds
          busLocation={busLocation ? { latitude: busLocation.latitude, longitude: busLocation.longitude } : null}
          boardingPoint={boardingPoint ? { latitude: boardingPoint.latitude, longitude: boardingPoint.longitude } : null}
          userLiveLocation={userLiveLocation ? { latitude: userLiveLocation.latitude, longitude: userLiveLocation.longitude } : null}
          customDestination={customDestination ? { latitude: customDestination.latitude, longitude: customDestination.longitude } : null}
          roadCoordinates={roadRoute?.roadCoordinates}
        />

        {/* High-Resolution Map Tile Providers */}
        {mapMode === 'street' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={20}
            maxNativeZoom={19}
          />
        )}

        {mapMode === 'satellite' && (
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            maxZoom={20}
            maxNativeZoom={20}
          />
        )}

        {mapMode === 'transit' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            maxZoom={20}
            maxNativeZoom={19}
          />
        )}


        {/* 1. Real Road Driving Polyline between Bus and Target (Uber / Rapido Style) */}
        {roadRoute && roadRoute.roadCoordinates.length > 1 && (
          <>
            {/* Dark Outline glow */}
            <Polyline
              positions={roadRoute.roadCoordinates}
              pathOptions={{
                color: '#0891b2',
                weight: 8,
                opacity: 0.6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Core vibrant path */}
            <Polyline
              positions={roadRoute.roadCoordinates}
              pathOptions={{
                color: '#22d3ee',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* 2. Static Route Stops Polyline (if road route not loaded) */}
        {!roadRoute && polylineCoords.length > 1 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: mapMode === 'satellite' ? '#38bdf8' : '#6366f1',
              weight: 5,
              opacity: 0.8,
              dashArray: '8, 8',
            }}
          />
        )}

        {/* Student Static Boarding Point Marker */}
        {boardingPoint && (
          <>
            <Marker
              position={[boardingPoint.latitude, boardingPoint.longitude]}
              icon={createBoardingPointIcon(boardingPoint.name)}
            >
              <Popup>
                <div className="p-1">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Your Boarding Point</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{boardingPoint.name}</h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {boardingPoint.latitude.toFixed(6)}, {boardingPoint.longitude.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* 2 KM Warning Radius Circle */}
            {show2kmCircle && (
              <Circle
                center={[boardingPoint.latitude, boardingPoint.longitude]}
                radius={2000}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: mapMode === 'satellite' ? 0.15 : 0.08,
                  weight: 2,
                  dashArray: '6, 6',
                }}
              />
            )}
          </>
        )}

        {/* Student Live Device GPS Location Marker (if tracking live device) */}
        {userLiveLocation && (
          <>
            <Marker
              position={[userLiveLocation.latitude, userLiveLocation.longitude]}
              icon={createLiveUserIcon()}
            >
              <Popup>
                <div className="p-1">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Your Live Device Location</span>
                  <p className="text-xs text-slate-300 font-mono mt-1">
                    GPS: {userLiveLocation.latitude.toFixed(6)}, {userLiveLocation.longitude.toFixed(6)}
                  </p>
                  {userLiveLocation.accuracy && (
                    <p className="text-[11px] text-cyan-300 mt-0.5">
                      Accuracy: &plusmn;{Math.round(userLiveLocation.accuracy)}m
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>

            {userLiveLocation.accuracy && userLiveLocation.accuracy > 1 && (
              <Circle
                center={[userLiveLocation.latitude, userLiveLocation.longitude]}
                radius={userLiveLocation.accuracy}
                pathOptions={{
                  color: '#06b6d4',
                  fillColor: '#06b6d4',
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: '3, 3',
                }}
              />
            )}
          </>
        )}

        {/* College Campus Marker */}
        {college && (
          <Marker
            position={[college.latitude, college.longitude]}
            icon={createCollegeIcon(college.name)}
          >
            <Popup>
              <div className="p-1">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {customDestination?.isTerminus ? 'College Gate (Origin)' : 'College Campus Gate'}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">{college.name}</h4>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Custom Dynamic Trip Destination / Terminus Marker */}
        {customDestination && (
          <Marker
            position={[customDestination.latitude, customDestination.longitude]}
            icon={createTerminusIcon(customDestination.name)}
          >
            <Popup>
              <div className="p-1">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {customDestination.isTerminus ? 'Village Terminus (Destination)' : 'Trip Destination'}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">{customDestination.name}</h4>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  {customDestination.latitude.toFixed(6)}, {customDestination.longitude.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* All Route Stops along the transit corridor */}
        {routeStops.map((stop) => {
          const isStudentStop =
            boardingPoint &&
            Math.abs(boardingPoint.latitude - stop.latitude) < 0.0002 &&
            Math.abs(boardingPoint.longitude - stop.longitude) < 0.0002;
          if (isStudentStop) return null; // Avoid duplicate marker over student's main boarding point
          if (
            college &&
            Math.abs(college.latitude - stop.latitude) < 0.0002 &&
            Math.abs(college.longitude - stop.longitude) < 0.0002
          )
            return null; // Avoid duplicate marker over college campus

          return (
            <Marker
              key={stop.id || `stop_${stop.sequence}`}
              position={[stop.latitude, stop.longitude]}
              icon={createStopIcon(stop.sequence, stop.name)}
            >
              <Popup>
                <div className="p-1.5 space-y-1 min-w-[160px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                      #{stop.sequence}
                    </span>
                    <span className="text-xs font-black text-white uppercase tracking-wider">Route Stop</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">{stop.name}</h4>
                  <p className="text-xs text-slate-300 font-mono">
                    {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Single Selected Tracked Bus Marker (Live Smooth-Gliding and Corner-Cutting) */}
        {busLocation && busLocation.latitude && busLocation.longitude && (
          <>
            <LiveAnimatedBusMarker
              position={[busLocation.latitude, busLocation.longitude]}
              heading={busLocation.heading}
              busNumber={busLocation.busNumber || 'BUS'}
              speed={busLocation.speed}
              accuracy={busLocation.accuracy}
              status={busLocation.status}
            />

            {/* Bus Accuracy Halo Circle */}
            {busLocation.accuracy && busLocation.accuracy > 1 && (
              <Circle
                center={[busLocation.latitude, busLocation.longitude]}
                radius={busLocation.accuracy}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.1,
                  weight: 1,
                  dashArray: '4, 4',
                }}
              />
            )}
          </>
        )}

        {/* Multi-Bus Fleet Markers (Admin View - Live Smooth Animated) */}
        {busesList.map((bus) => (
          <LiveAnimatedBusMarker
            key={bus.busId}
            position={[bus.latitude, bus.longitude]}
            heading={bus.heading}
            busNumber={bus.busNumber}
            speed={bus.speed}
            accuracy={bus.heading}
            status={bus.status}
            driverName={bus.driverName}
            routeName={bus.routeName}
            onClick={() => onBusClick && onBusClick(bus.busId)}
          />
        ))}
      </MapContainer>
    </div>
  );
};
