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
  Route as RouteIcon,
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
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
              <RouteIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Stop Progression Timeline
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Bus #{busNumber}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {route?.name || 'Campus Transit Route'}
              </h2>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
                <span>{tripType === 'EVENING_RETURN' ? 'Evening Return' : 'Morning College Pickup'}</span>
                <span>&bull;</span>
                <span>{stops.length} Stops Total</span>
              </div>
            </div>
          </div>

          {onSwitchToMap && (
            <button
              type="button"
              onClick={onSwitchToMap}
              className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors shadow-xs"
            >
              <span>View on Map</span>
            </button>
          )}
        </div>

        {/* 2 KM Readiness Alert Banner */}
        {isWithin2km && (
          <div className={`p-4 rounded-lg border flex items-center justify-between ${
            isAtStop
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
          }`}>
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">
                  {isAtStop ? 'Bus at your boarding stop now' : 'Bus approaching (Within 2 KM)'}
                </span>
                <p className="text-xs sm:text-sm font-medium mt-0.5">
                  {isAtStop
                    ? `Bus #${busNumber} has arrived at ${studentStopTelemetry?.name || 'your stop'}. Board now!`
                    : `Bus is ${studentStopTelemetry?.distanceKm} away (~${studentStopTelemetry?.etaMinutes} mins). Please get ready at your stop!`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Telemetry Chips */}
        {isLive && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 block">Live Speed</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {busSpeed} km/h
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 block">Stop Distance</span>
              <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                {studentStopTelemetry ? studentStopTelemetry.distanceKm : 'Off-Route'}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 block">Arrival ETA</span>
              <span className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                {studentStopTelemetry?.etaMinutes !== null ? `~${studentStopTelemetry?.etaMinutes} mins` : `~${displayEta} mins`}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 block">Terminus</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 block truncate">
                {destinationName || (college?.name ? `${college.name} Gate` : 'Campus Gate')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Progression Rail */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Stop-by-Stop Progression Rail
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
            {isLive ? 'GPS BROADCAST ACTIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* The Rail */}
        <div className="relative pl-7 sm:pl-8 space-y-5 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
          {stopsWithTelemetry.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === stopsWithTelemetry.length - 1;

            return (
              <div
                key={stop.id || idx}
                onClick={() => onSelectStop && onSelectStop(stop)}
                className="relative group cursor-pointer transition-all"
              >
                {/* Node badge on rail */}
                <div
                  className={`absolute -left-7 sm:-left-8 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                    stop.isPassed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-400'
                      : stop.isCurrentNext
                      ? 'bg-blue-600 text-white border-2 border-white ring-2 ring-blue-400'
                      : stop.isStudentStop
                      ? 'bg-blue-500 text-white border-2 border-white ring-2 ring-blue-300'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {stop.isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : stop.isCurrentNext ? (
                    <BusIcon className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <span>{stop.sequence}</span>
                  )}
                </div>

                {/* Stop Card */}
                <div
                  className={`p-3.5 rounded-lg border transition-colors ${
                    stop.isStudentStop
                      ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400'
                      : stop.isCurrentNext
                      ? 'bg-slate-50 dark:bg-slate-750 border-blue-300 dark:border-blue-700'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {stop.name}
                        </span>

                        {isFirst && (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Origin
                          </span>
                        )}

                        {isLast && (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Terminus
                          </span>
                        )}

                        {stop.isStudentStop && (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Your Stop
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        GPS: {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      {stop.isPassed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Passed</span>
                        </span>
                      ) : stop.distanceMeters !== null ? (
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {stop.distanceKm} away
                          </div>
                          {stop.etaMinutes !== null && stop.etaMinutes > 0 && (
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                              (~{stop.etaMinutes} mins)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Scheduled</span>
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
