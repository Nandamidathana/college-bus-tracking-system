import React, { useMemo } from 'react';
import { BoardingPoint, Route, College } from '../../types';
import { extractDistinctiveTokens } from '../../utils/routeMatching';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Radio,
  School,
  Bus as BusIcon,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Gauge,
  Flag,
  Navigation,
} from 'lucide-react';

interface WhereIsMyBusTrackerProps {
  busNumber: string;
  route: Route | null;
  liveLocation: any | null;
  studentBoardingPoint: BoardingPoint | null;
  college: College | null;
  tripType: 'MORNING_PICKUP' | 'EVENING_RETURN';
  destinationName: string;
  destinationLat?: number;
  destinationLng?: number;
  displayDistance: string;
  displayEta: number;
  onSelectStop?: (stop: BoardingPoint) => void;
  onSwitchToMap?: () => void;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const WhereIsMyBusTracker: React.FC<WhereIsMyBusTrackerProps> = ({
  busNumber,
  route,
  liveLocation,
  studentBoardingPoint,
  college,
  tripType,
  destinationName,
  displayDistance,
  displayEta,
  onSelectStop,
  onSwitchToMap,
}) => {
  const isLive = liveLocation !== null;
  const busLat = liveLocation?.latitude;
  const busLng = liveLocation?.longitude;
  const busSpeed = Math.round(liveLocation?.speed || 0);

  // Ordered stops list from route or default campus stops
  const stops = useMemo(() => {
    let list: BoardingPoint[] = [];
    if (route?.boardingPoints && route.boardingPoints.length > 0) {
      list = [...route.boardingPoints].sort((a, b) => a.sequence - b.sequence);
    } else if (studentBoardingPoint) {
      list = [
        {
          id: 'origin_stop',
          name: 'Origin Transit Stop',
          latitude: studentBoardingPoint.latitude + 0.02,
          longitude: studentBoardingPoint.longitude + 0.02,
          sequence: 1,
        } as BoardingPoint,
        studentBoardingPoint,
        {
          id: 'campus_stop',
          name: college?.name || 'SRGEC College Gate',
          latitude: college?.latitude || 16.35068,
          longitude: college?.longitude || 81.04273,
          sequence: 3,
        } as BoardingPoint,
      ];
    } else {
      list = [
        {
          id: 'stop_1',
          name: 'Gudivada Bus Stand',
          latitude: 16.4321,
          longitude: 80.9976,
          sequence: 1,
        } as BoardingPoint,
        {
          id: 'stop_2',
          name: 'Himaja Boys Hostel',
          latitude: 16.3496,
          longitude: 81.0498,
          sequence: 2,
        } as BoardingPoint,
        {
          id: 'stop_3',
          name: college?.name || 'SRGEC College Gate',
          latitude: college?.latitude || 16.35068,
          longitude: college?.longitude || 81.04273,
          sequence: 3,
        } as BoardingPoint,
      ];
    }

    if (tripType === 'EVENING_RETURN') {
      return [...list].reverse().map((s, idx) => ({ ...s, sequence: idx + 1 }));
    }

    return list;
  }, [route, studentBoardingPoint, college, tripType]);

  // Compute live distance from bus to each stop
  const stopsWithTelemetry = useMemo(() => {
    if (!busLat || !busLng) {
      return stops.map((s, idx) => ({
        ...s,
        distanceMeters: null,
        distanceKm: '---',
        etaMinutes: null,
        isPassed: false,
        isCurrentNext: idx === 0,
        isStudentStop: studentBoardingPoint?.id === s.id || studentBoardingPoint?.name === s.name,
      }));
    }

    let minDistance = Infinity;
    let closestIndex = 0;

    stops.forEach((s, idx) => {
      const d = getDistanceMeters(busLat, busLng, s.latitude, s.longitude);
      if (d < minDistance) {
        minDistance = d;
        closestIndex = idx;
      }
    });

    return stops.map((s, idx) => {
      const d = getDistanceMeters(busLat, busLng, s.latitude, s.longitude);

      let isStudentStop = false;
      if (studentBoardingPoint) {
        if (studentBoardingPoint.id && s.id && studentBoardingPoint.id === s.id) {
          isStudentStop = true;
        } else {
          const bpName = (studentBoardingPoint.name || '').toLowerCase().trim();
          const sName = (s.name || '').toLowerCase().trim();
          const isCollegeStop =
            sName.includes('college') ||
            sName.includes('campus') ||
            sName.includes('srgec') ||
            sName.includes('gate');

          if (!isCollegeStop && bpName && sName) {
            if (bpName === sName) {
              isStudentStop = true;
            } else {
              const bpTokens = extractDistinctiveTokens(bpName);
              const sTokens = extractDistinctiveTokens(sName);
              if (bpTokens.length > 0 && sTokens.length > 0) {
                isStudentStop = bpTokens.some((bpToken) =>
                  sTokens.some(
                    (sToken) =>
                      sToken === bpToken ||
                      (bpToken.length >= 5 && sToken.includes(bpToken)) ||
                      (sToken.length >= 5 && bpToken.includes(sToken))
                  )
                );
              }
            }
          }
        }
      }

      const isPassed = idx < closestIndex || (idx === closestIndex && d <= 350 && closestIndex < stops.length - 1 && d < 100);
      const speedKmh = Math.max(25, busSpeed || 30);
      const etaMins = Math.round((d / 1000 / speedKmh) * 60);

      return {
        ...s,
        distanceMeters: d,
        distanceKm: d < 1000 ? `${d}m` : `${(d / 1000).toFixed(1)} km`,
        etaMinutes: etaMins,
        isPassed,
        isCurrentNext: !isPassed && (idx === closestIndex || (idx === closestIndex + 1 && minDistance <= 350)),
        isStudentStop,
      };
    });
  }, [stops, busLat, busLng, busSpeed, studentBoardingPoint]);

  const studentStopTelemetry = useMemo(() => {
    return stopsWithTelemetry.find((s) => s.isStudentStop) || null;
  }, [stopsWithTelemetry]);

  const studentDistanceMeters = studentStopTelemetry?.distanceMeters ?? null;
  const isWithin2km = studentDistanceMeters !== null && studentDistanceMeters <= 2000 && !studentStopTelemetry?.isPassed;
  const isAtStop = studentDistanceMeters !== null && studentDistanceMeters <= 350;

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="water-glass rounded-3xl p-5 sm:p-6 shadow-glass space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-pastel-yellow font-black text-xl shadow-pill-teal shrink-0">
              🚉
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-pastel-softTeal">
                  Station Progression Timeline
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-yellow text-pastel-darkText font-mono">
                  Bus #{busNumber}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-pastel-darkText dark:text-white mt-0.5">
                {route?.name || 'Campus Transit Route'}
              </h2>
              <div className="text-[11px] subtext-muted flex items-center gap-2 mt-0.5 font-bold">
                <span>{tripType === 'EVENING_RETURN' ? '🌆 Evening Return' : '🌅 Morning College Pickup'}</span>
                <span>•</span>
                <span>{stops.length} Stops Total</span>
              </div>
            </div>
          </div>

          {onSwitchToMap && (
            <button
              type="button"
              onClick={onSwitchToMap}
              className="btn-pill-primary text-xs py-2 px-4 gap-1.5 self-start sm:self-auto shadow-sm"
            >
              <span>🗺️ View on Map</span>
            </button>
          )}
        </div>

        {/* 2 KM Readiness Alert Banner */}
        {isWithin2km && (
          <div className={`p-4 rounded-2xl border-2 flex items-center justify-between shadow-glass animate-pulse ${
            isAtStop
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-900 dark:text-emerald-100'
              : 'bg-pastel-yellow/30 border-amber-400 text-amber-950 dark:text-amber-100'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{isAtStop ? '🚌' : '⚡'}</span>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider block">
                  {isAtStop ? 'BUS AT YOUR BOARDING STOP NOW!' : 'BUS APPROACHING (WITHIN 2 KM)'}
                </span>
                <p className="text-xs sm:text-sm font-extrabold mt-0.5">
                  {isAtStop
                    ? `Bus ${busNumber} has arrived at ${studentStopTelemetry?.name || 'your stop'}. Board now!`
                    : `Bus is ${studentStopTelemetry?.distanceKm} away (~${studentStopTelemetry?.etaMinutes} mins). Please get ready at your stop!`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Telemetry Chips */}
        {isLive && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 bg-white/70 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase subtext-muted block">Live Speed</span>
              <span className="text-sm sm:text-base font-black text-pastel-darkText dark:text-white mt-0.5 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                {busSpeed} km/h
              </span>
            </div>

            <div className="p-3 bg-white/70 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase subtext-muted block">Your Stop Dist</span>
              <span className="text-sm sm:text-base font-black text-brand-700 dark:text-pastel-softTeal mt-0.5 block truncate">
                {studentStopTelemetry ? studentStopTelemetry.distanceKm : '❌ Off-Route'}
              </span>
            </div>

            <div className="p-3 bg-white/70 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase subtext-muted block">Arrival ETA</span>
              <span className="text-sm sm:text-base font-black text-amber-700 dark:text-pastel-yellow mt-0.5 block">
                {studentStopTelemetry?.etaMinutes !== null ? `~${studentStopTelemetry?.etaMinutes} mins` : `~${displayEta} mins`}
              </span>
            </div>

            <div className="p-3 bg-white/70 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase subtext-muted block">Terminus</span>
              <span className="text-xs font-black text-pastel-darkText dark:text-white mt-1 block truncate">
                {destinationName || (college?.name ? `${college.name} Gate` : 'Campus Gate')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Vertical Progression Rail */}
      <div className="water-glass rounded-3xl p-5 sm:p-7 shadow-glass space-y-5">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-xs font-black uppercase tracking-wider text-pastel-darkText dark:text-white">
              Stop-by-Stop Progression Rail
            </h3>
          </div>
          <span className="text-[11px] text-brand-700 dark:text-pastel-softTeal font-mono font-extrabold">
            {isLive ? '🟢 GPS BROADCAST ACTIVE' : '⚪ OFFLINE'}
          </span>
        </div>

        {/* The Rail */}
        <div className="relative pl-7 sm:pl-8 space-y-7 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-1 before:bg-brand-100 dark:before:bg-brand-900 before:rounded-full">
          {stopsWithTelemetry.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === stopsWithTelemetry.length - 1;

            return (
              <div
                key={stop.id || idx}
                onClick={() => onSelectStop && onSelectStop(stop)}
                className={`relative group cursor-pointer transition-all ${
                  stop.isStudentStop ? 'scale-[1.01]' : ''
                }`}
              >
                {/* Node badge on rail */}
                <div
                  className={`absolute -left-7 sm:-left-8 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all shadow-sm ${
                    stop.isPassed
                      ? 'bg-pastel-mint text-brand-900 border-2 border-white ring-2 ring-emerald-400/40'
                      : stop.isCurrentNext
                      ? 'bg-pastel-yellow text-pastel-darkText border-2 border-white ring-4 ring-amber-400/40 animate-bounce'
                      : stop.isStudentStop
                      ? 'bg-brand-600 text-pastel-yellow border-2 border-white ring-4 ring-brand-500/40'
                      : 'bg-white dark:bg-brand-800 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-white/10'
                  }`}
                >
                  {stop.isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-brand-900" />
                  ) : stop.isCurrentNext ? (
                    <BusIcon className="w-4 h-4 text-pastel-darkText" />
                  ) : (
                    <span>{stop.sequence}</span>
                  )}
                </div>

                {/* Stop Card */}
                <div
                  className={`p-4 rounded-2xl border transition-all shadow-sm ${
                    stop.isStudentStop
                      ? 'bg-pastel-cream/70 dark:bg-brand-800/60 border-2 border-amber-400 shadow-pill-yellow'
                      : stop.isCurrentNext
                      ? 'bg-pastel-yellow/30 dark:bg-amber-950/40 border-2 border-pastel-yellow'
                      : 'bg-white/70 dark:bg-white/5 border-black/5 dark:border-white/10 hover:border-brand-400/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm sm:text-base text-pastel-darkText dark:text-white">
                          {stop.name}
                        </span>

                        {isFirst && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-900">
                            Origin
                          </span>
                        )}

                        {isLast && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-pastel-mint text-brand-900">
                            Terminus
                          </span>
                        )}

                        {stop.isStudentStop && (
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-brand-600 text-pastel-yellow shadow-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            YOUR STOP
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] subtext-muted font-mono mt-0.5">
                        GPS: {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      {stop.isPassed ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pastel-mint text-brand-900 text-[11px] font-black">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Passed</span>
                        </div>
                      ) : stop.distanceMeters !== null ? (
                        <div>
                          <div className="text-xs sm:text-sm font-black text-pastel-darkText dark:text-white">
                            {stop.distanceKm} away
                          </div>
                          {stop.etaMinutes !== null && stop.etaMinutes > 0 && (
                            <div className="text-[11px] text-amber-700 dark:text-pastel-yellow font-extrabold">
                              (~{stop.etaMinutes} mins)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Scheduled</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
