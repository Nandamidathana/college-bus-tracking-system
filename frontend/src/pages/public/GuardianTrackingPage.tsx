import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { publicApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { BusMap } from '../../components/maps/BusMap';
import {
  ShieldCheck,
  Clock,
  Users,
  MapPin,
  Compass,
  AlertTriangle,
  RefreshCw,
  Bus as BusIcon,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface BusData {
  id: string;
  busNumber: string;
  capacity: number;
  currentOccupancy: number;
  occupancyStatus: 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL' | 'UNKNOWN';
  occupancyUpdatedAt: string | null;
  status: 'LIVE' | 'LOCATION_DELAYED' | 'OFFLINE';
  college?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null;
  route?: {
    name: string;
    routeNumber: string;
    boardingPoints: Array<{
      id: string;
      name: string;
      sequence: number;
      latitude: number;
      longitude: number;
    }>;
  } | null;
  activeTrip?: {
    id: string;
    tripType: string;
    originName: string;
    destinationName: string;
    startTime: string;
  } | null;
  liveLocation?: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    accuracy: number;
    timestamp: string;
    isStale: boolean;
  } | null;
}

export const GuardianTrackingPage: React.FC = () => {
  const { busId } = useParams<{ busId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busData, setBusData] = useState<BusData | null>(null);
  const [label, setLabel] = useState<string>('Student Transit Link');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [lastLivePing, setLastLivePing] = useState<Date>(new Date());

  const fetchTrackingData = async () => {
    if (!busId || !token) {
      setError('Invalid tracking URL. Missing bus identifier or security token.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await publicApi.getGuardianTracking(busId, token);
      if (res.data.success && res.data.bus) {
        setBusData(res.data.bus);
        setLabel(res.data.label || 'Student Transit Link');
        setExpiresAt(res.data.expiresAt || null);
        setLastLivePing(new Date());
      } else {
        setError(res.data.error || 'Failed to load tracking data.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Unable to load bus tracking. The link may have expired.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, [busId, token]);

  // Realtime Socket.IO synchronization for guardian view
  useEffect(() => {
    if (!busId) return;

    const socket = getSocket();
    socket.emit('bus:subscribe', { busId });

    const handleLocationUpdate = (payload: any) => {
      if (payload.busId === busId) {
        setBusData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: payload.isStale ? 'LOCATION_DELAYED' : 'LIVE',
            liveLocation: {
              latitude: payload.latitude,
              longitude: payload.longitude,
              speed: payload.speed || 0,
              heading: payload.heading || 0,
              accuracy: payload.accuracy || 10,
              timestamp: payload.timestamp || new Date().toISOString(),
              isStale: !!payload.isStale,
            },
          };
        });
        setLastLivePing(new Date());
      }
    };

    const handleOccupancyUpdate = (payload: any) => {
      if (payload.busId === busId) {
        setBusData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            currentOccupancy: payload.currentOccupancy ?? prev.currentOccupancy,
            occupancyStatus: payload.occupancyStatus ?? prev.occupancyStatus,
            occupancyUpdatedAt: payload.updatedAt || new Date().toISOString(),
          };
        });
      }
    };

    socket.on('bus:location:update', handleLocationUpdate);
    socket.on('bus:occupancy:update', handleOccupancyUpdate);

    return () => {
      socket.off('bus:location:update', handleLocationUpdate);
      socket.off('bus:occupancy:update', handleOccupancyUpdate);
      socket.emit('bus:unsubscribe', { busId });
    };
  }, [busId]);

  // Occupancy badge styling helper
  const occupancyBadge = useMemo(() => {
    if (!busData) return null;
    const status = busData.occupancyStatus || 'UNKNOWN';
    const count = busData.currentOccupancy || 0;
    const capacity = busData.capacity || 40;

    switch (status) {
      case 'LOW':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          text: 'Seats Available',
          detail: `${count}/${capacity} passengers`,
        };
      case 'MEDIUM':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-500',
          text: 'Moderate Seats',
          detail: `${count}/${capacity} passengers`,
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          text: 'Standing Only',
          detail: `${count}/${capacity} passengers`,
        };
      case 'FULL':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-500',
          text: 'Bus Full',
          detail: `${count}/${capacity} capacity reached`,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          text: 'Occupancy Not Reported',
          detail: `${count}/${capacity} passengers`,
        };
    }
  }, [busData]);

  // Format time remaining for link expiration
  const expiryText = useMemo(() => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `Expires in ${hours}h ${mins}m`;
    return `Expires in ${mins}m`;
  }, [expiresAt]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Verifying Tracking Link</h2>
          <p className="text-sm text-slate-500">Connecting securely to college live transit servers...</p>
        </div>
      </div>
    );
  }

  if (error || !busData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Tracking Link Expired or Invalid</h2>
          <p className="text-sm text-slate-600 mb-6">{error || 'This link is no longer valid or has been revoked.'}</p>
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 text-left mb-6 space-y-1 border border-slate-100">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Security Notice
            </div>
            <div>Parent tracking links are cryptographically protected and automatically expire after a set time.</div>
            <div>Please ask the student to generate a fresh link from their dashboard.</div>
          </div>
          <button
            onClick={fetchTrackingData}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const live = busData.liveLocation;
  const isTripActive = busData.status === 'LIVE' || busData.status === 'LOCATION_DELAYED';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BusIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">College Bus Live</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Guardian View
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[240px] sm:max-w-sm">
                {label} • {busData.college?.name || 'College Campus'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {expiryText && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <Clock className="w-3.5 h-3.5" />
                {expiryText}
              </span>
            )}
            <button
              onClick={fetchTrackingData}
              title="Refresh tracking data"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-4">
        {/* Security & Privacy Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Privacy Protected:</span> This read-only link does not
              expose student names, personal numbers, or driver credentials.
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400 shrink-0">
            Live Feed: {lastLivePing.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Bus Status & Occupancy Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Bus Identifier */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Transit</span>
                <h2 className="text-2xl font-black text-slate-900 mt-0.5">{busData.busNumber}</h2>
                <p className="text-sm text-slate-600 font-medium">{busData.route?.name || 'Campus Transit Route'}</p>
              </div>
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  busData.status === 'LIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : busData.status === 'LOCATION_DELAYED'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    busData.status === 'LIVE'
                      ? 'bg-emerald-500 animate-pulse'
                      : busData.status === 'LOCATION_DELAYED'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
                {busData.status === 'LIVE'
                  ? 'Live Tracking'
                  : busData.status === 'LOCATION_DELAYED'
                  ? 'GPS Delayed'
                  : 'Bus Offline'}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Trip Type</span>
              <span className="font-semibold text-slate-700">
                {busData.activeTrip?.tripType === 'EVENING_RETURN' ? 'Evening Return' : 'Morning Pickup'}
              </span>
            </div>
          </div>

          {/* Real-time Occupancy Badge Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Bus Occupancy
                </span>
                {occupancyBadge && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${occupancyBadge.bg}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${occupancyBadge.dot}`} />
                    {occupancyBadge.text}
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-slate-900">{occupancyBadge?.detail}</div>
              <p className="text-xs text-slate-500 mt-1">
                {busData.occupancyUpdatedAt
                  ? `Reported ${new Date(busData.occupancyUpdatedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Based on automated boarding confirmations'}
              </p>
            </div>

            {/* Capacity Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    busData.occupancyStatus === 'FULL'
                      ? 'bg-red-500'
                      : busData.occupancyStatus === 'HIGH'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((busData.currentOccupancy || 0) / (busData.capacity || 40)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Current Telemetry */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <Compass className="w-3.5 h-3.5" /> Live Movement
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {live?.speed ? Math.round(live.speed) : 0}
                </span>
                <span className="text-xs font-semibold text-slate-500">km/h speed</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Accuracy: &plusmn;{live?.accuracy ? Math.round(live.accuracy) : 10}m
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Destination</span>
              <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                {busData.activeTrip?.destinationName || busData.college?.name || 'Campus Gate'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Interactive Map */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-slate-900">Live GPS Location Map</span>
            </div>
            {live?.timestamp && (
              <span className="text-xs text-slate-500">
                Last GPS Signal: {new Date(live.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="h-[420px] w-full relative">
            <BusMap
              busLocation={
                live
                  ? {
                      latitude: live.latitude,
                      longitude: live.longitude,
                      heading: live.heading,
                      speed: live.speed,
                      accuracy: live.accuracy,
                      busNumber: busData.busNumber,
                      status: busData.status,
                    }
                  : null
              }
              routeStops={busData.route?.boardingPoints as any}
              college={busData.college}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Route Stops Sequence */}
        {busData.route?.boardingPoints && busData.route.boardingPoints.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Route Stops Timeline
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {busData.route.boardingPoints.map((stop, idx) => (
                <div
                  key={stop.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-slate-800 truncate">{stop.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-400">
        College Bus Real-Time Tracking Platform • Secure Parent & Guardian Gateway
      </footer>
    </div>
  );
};

export default GuardianTrackingPage;
