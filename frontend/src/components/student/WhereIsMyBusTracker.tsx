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

// Distance between two GPS points in meters
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
  destinationLat,
  destinationLng,
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

    // If Evening Return trip, reverse order (College ➔ Terminus)
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

    // Find closest stop to bus
    let minDistance = Infinity;
    let closestIndex = 0;

    stops.forEach((s, idx) => {
      const d = getDistanceMeters(busLat, busLng, s.latitude, s.longitude);
      if (d < minDistance) {
        minDistance = d;
        closestIndex = idx;
      }
    });

    // If bus is within 350m of closest stop, it is "At Stop"
    // If bus is between stops, determine if passed or approaching
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
      const isCurrentNext = idx === closestIndex || (!isPassed && idx === closestIndex + 1);

      // Estimate travel time in mins assuming ~30 km/h average speed in town
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

  // Identify Student Stop Distance
  const studentStopTelemetry = useMemo(() => {
    return stopsWithTelemetry.find((s) => s.isStudentStop) || null;
  }, [stopsWithTelemetry]);

  const studentDistanceMeters = studentStopTelemetry?.distanceMeters ?? null;
  const isWithin2km = studentDistanceMeters !== null && studentDistanceMeters <= 2000 && !studentStopTelemetry?.isPassed;
  const isAtStop = studentDistanceMeters !== null && studentDistanceMeters <= 350;

  return (
    <div className="space-y-4">
      {/* "Where Is My Train" Top HUD Banner */}
      <div className="water-glass rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-slate-300 dark:border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-amber-500/25 shrink-0">
              🚉
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  Where Is My Bus • Live Station Radar
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  Bus #{busNumber}
                </span>
                {!studentStopTelemetry && studentBoardingPoint && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/40">
                    ❌ No Route to Your Stop
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {route?.name || 'Campus Transit Route'}
              </h2>
              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-0.5 font-semibold">
                <span>{tripType === 'EVENING_RETURN' ? '🌆 Evening Return Trip' : '🌅 Morning College Trip'}</span>
                <span>•</span>
                <span>{stops.length} Stops Total</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {onSwitchToMap && (
              <button
                type="button"
                onClick={onSwitchToMap}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition-all"
              >
                <span>🗺️ View on Map</span>
              </button>
            )}
          </div>
        </div>

        {/* Off-Route Notice Banner */}
        {!studentStopTelemetry && studentBoardingPoint && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-red-500/15 border-2 border-red-500/50 text-red-100 text-xs font-bold flex items-center gap-3 shadow-md">
            <span className="text-xl shrink-0">❌</span>
            <div className="flex-1">
              <span className="text-white font-black block text-sm">
                ❌ No Route Found – This bus does not travel through your boarding point.
              </span>
              <span className="text-red-200 font-semibold mt-0.5 block">
                Bus <strong className="text-white">#{busNumber}</strong> operates on <strong className="text-amber-300 underline">{route?.name || 'this route'}</strong> and does <strong className="text-rose-300 underline uppercase font-black">not</strong> contain your boarding stop (<strong className="text-cyan-300">{studentBoardingPoint.name}</strong>).
              </span>
            </div>
          </div>
        )}

        {/* 2 KM Readiness Alert Banner */}
        {isWithin2km && (
          <div className={`p-4 rounded-2xl border-2 flex items-center justify-between shadow-xl animate-pulse ${
            isAtStop
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-900 dark:text-emerald-100'
              : 'bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-100'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{isAtStop ? '🚌' : '⚡'}</span>
              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  {isAtStop ? 'BUS AT YOUR BOARDING STOP NOW!' : 'BUS APPROACHING (WITHIN 2 KM)'}
                </span>
                <p className="text-sm font-extrabold mt-0.5">
                  {isAtStop
                    ? `Bus ${busNumber} has arrived at ${studentStopTelemetry?.name || 'your stop'}. Board now!`
                    : `Bus is ${studentStopTelemetry?.distanceKm} away (~${studentStopTelemetry?.etaMinutes} mins). Please get ready at your stop!`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Telemetry Summary Chips */}
        {isLive && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Live Speed</span>
              <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                {busSpeed} km/h
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                {studentStopTelemetry ? 'Your Stop Distance' : 'Stop Status'}
              </span>
              <span className={`text-base font-black mt-0.5 block truncate ${studentStopTelemetry ? 'text-blue-700 dark:text-cyan-300' : 'text-red-400'}`}>
                {studentStopTelemetry ? studentStopTelemetry.distanceKm : '❌ No Route'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Estimated Time</span>
              <span className="text-base font-black text-amber-700 dark:text-amber-400 mt-0.5 block">
                {studentStopTelemetry?.etaMinutes !== null ? `~${studentStopTelemetry?.etaMinutes} mins` : `~${displayEta} mins`}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Destination</span>
              <span className="text-xs font-black text-slate-900 dark:text-white mt-1 block truncate">
                {destinationName || (college?.name ? `${college.name} Gate` : 'Campus Gate')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stop Progression Timeline (Vertical Rail like Where Is My Train) */}
      <div className="water-glass rounded-3xl p-5 sm:p-7 shadow-2xl border-2 border-slate-300 dark:border-white/10 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Live Stop-by-Stop Progression
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono font-bold">
            {isLive ? '🟢 GPS BROADCAST ACTIVE' : '⚪ BUS OFFLINE'}
          </span>
        </div>

        {/* Rail List */}
        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-1 before:bg-slate-200 dark:before:bg-slate-800">
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
                {/* Station Node Badge on the rail */}
                <div
                  className={`absolute -left-6 sm:-left-8 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all shadow-md ${
                    stop.isPassed
                      ? 'bg-emerald-500 text-white border-2 border-white ring-4 ring-emerald-500/25'
                      : stop.isCurrentNext
                      ? 'bg-amber-500 text-slate-950 border-2 border-white ring-4 ring-amber-500/35 animate-bounce'
                      : stop.isStudentStop
                      ? 'bg-blue-600 text-white border-2 border-white ring-4 ring-blue-500/35'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {stop.isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : stop.isCurrentNext ? (
                    <BusIcon className="w-4 h-4 text-slate-950" />
                  ) : (
                    <span>{stop.sequence}</span>
                  )}
                </div>

                {/* Stop Card Surface */}
                <div
                  className={`p-4 rounded-2xl border transition-all shadow-sm ${
                    stop.isStudentStop
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-2 border-blue-500 shadow-lg shadow-blue-500/10'
                      : stop.isCurrentNext
                      ? 'bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-400'
                      : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 hover:border-blue-400/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-base text-slate-900 dark:text-white">
                          {stop.name}
                        </span>

                        {isFirst && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                            Origin
                          </span>
                        )}

                        {isLast && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                            Terminus / Gate
                          </span>
                        )}

                        {stop.isStudentStop && (
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            YOUR BOARDING STOP
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        GPS: {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                      </div>
                    </div>

                    {/* Live Stop Telemetry Status */}
                    <div className="text-left sm:text-right">
                      {stop.isPassed ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Departed / Passed</span>
                        </div>
                      ) : stop.distanceMeters !== null ? (
                        <div>
                          <div className="text-sm font-black text-slate-900 dark:text-white">
                            {stop.distanceKm} away
                          </div>
                          {stop.etaMinutes !== null && stop.etaMinutes > 0 && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                              (~{stop.etaMinutes} mins)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold">Scheduled Stop</span>
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
