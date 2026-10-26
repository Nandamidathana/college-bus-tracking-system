import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { driverApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Bus, Trip } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { BusMap } from '../../components/maps/BusMap';
import {
  Navigation,
  Play,
  Square,
  Repeat,
  Radio,
  AlertTriangle,
  CheckCircle,
  Clock,
  Compass,
  Gauge,
  MapPin,
  RefreshCw,
  Crosshair,
  Satellite,
  X,
  Users,
  Minus,
  Plus,
  AlertOctagon,
  Wrench,
  Send,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react';
import { PwaBanner } from '../../components/common/PwaBanner';

export const DriverDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [gpsStatus, setGpsStatus] = useState<string>('ACQUIRING');
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string>('');
  
  const defaultTripType = new Date().getHours() >= 13 ? 'EVENING_RETURN' : 'MORNING_PICKUP';
  const [selectedTripType, setSelectedTripType] = useState<'MORNING_PICKUP' | 'EVENING_RETURN'>(defaultTripType);

  const [telemetry, setTelemetry] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number;
    heading: number;
    lastSent: string;
    updateCount: number;
  }>({
    latitude: 0,
    longitude: 0,
    accuracy: 0,
    speed: 0,
    heading: 0,
    lastSent: '',
    updateCount: 0,
  });

  const [isChangeBusOpen, setIsChangeBusOpen] = useState<boolean>(false);
  const [newBusIdToAssign, setNewBusIdToAssign] = useState<string>('');

  // Live Occupancy Management
  const [occupancyStatus, setOccupancyStatus] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'FULL' | 'UNKNOWN'>('LOW');
  const [occupancyCount, setOccupancyCount] = useState<number>(0);
  const [updatingOccupancy, setUpdatingOccupancy] = useState<boolean>(false);
  const [occupancySuccessMsg, setOccupancySuccessMsg] = useState<string>('');

  // Incident & SOS Reporting
  const [showIncidentModal, setShowIncidentModal] = useState<boolean>(false);
  const [incidentType, setIncidentType] = useState<'SOS' | 'BREAKDOWN' | 'DELAY' | 'ASSISTANCE'>('DELAY');
  const [incidentDelay, setIncidentDelay] = useState<number>(15);
  const [incidentDesc, setIncidentDesc] = useState<string>('');
  const [submittingIncident, setSubmittingIncident] = useState<boolean>(false);
  const [incidentSuccessMsg, setIncidentSuccessMsg] = useState<string>('');

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const simIntervalRef = useRef<any>(null);
  const [isSimulatingRoute, setIsSimulatingRoute] = useState<boolean>(false);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  const driver = user?.driver;

  const sendGpsUpdate = (coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number;
    heading: number;
  }) => {
    const socket = getSocket();
    if (!socket || !socket.connected) {
      setGpsStatus('RECONNECTING_SOCKET');
    } else {
      setGpsStatus('ACTIVE');
    }

    const payload = {
      latitude: Number(coords.latitude.toFixed(6)),
      longitude: Number(coords.longitude.toFixed(6)),
      accuracy: Math.max(1, Number((coords.accuracy || 5).toFixed(1))),
      speed: coords.speed || 0,
      heading: coords.heading || 0,
      timestamp: new Date().toISOString(),
    };

    if (socket && socket.connected) {
      socket.emit('driver:location:update', payload);
    }

    setTelemetry((prev) => ({
      ...prev,
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      speed: payload.speed,
      heading: payload.heading,
      lastSent: new Date().toLocaleTimeString(),
      updateCount: prev.updateCount + 1,
    }));
  };

  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      setGpsStatus('ERROR');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setGpsStatus('ACQUIRING');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        sendGpsUpdate({
          latitude,
          longitude,
          accuracy,
          speed: speed ? Math.round(speed * 3.6) : 0,
          heading: heading || 0,
        });
      },
      (err) => {
        console.warn('Geolocation watchPosition error:', err);
        setErrorMessage(`GPS Warning: ${err.message}. Retrying...`);
        setGpsStatus('ERROR');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    const initDriver = async () => {
      try {
        setLoading(true);
        const [busesRes, tripRes] = await Promise.all([
          driverApi.getBuses(),
          driverApi.getCurrentTrip(),
        ]);

        if (busesRes.data.success) {
          setBuses(busesRes.data.buses);
          const assignedId = driver?.assignedBusId || busesRes.data.buses[0]?.id;
          if (assignedId) {
            setSelectedBusId(assignedId);
            const b = busesRes.data.buses.find((item: Bus) => item.id === assignedId);
            if (b) setSelectedBus(b);
          }
        }

        if (tripRes.data.success && tripRes.data.active && tripRes.data.trip) {
          setActiveTrip(tripRes.data.trip);
          setIsTracking(true);
          startGpsTracking();
          requestWakeLock();
        }
      } catch (err: any) {
        console.error('Failed to init driver dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    initDriver();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simIntervalRef.current !== null) {
        clearInterval(simIntervalRef.current);
      }
      releaseWakeLock();
    };
  }, []);

  const handleForceGpsLock = () => {
    setLocationSuccessMsg('📡 Re-locking satellite GPS...');
    startGpsTracking();
    setTimeout(() => {
      if (telemetry.latitude !== 0) {
        setLocationSuccessMsg(`📍 Live GPS Locked (±${Math.round(telemetry.accuracy || 5)}m)!`);
        setTimeout(() => setLocationSuccessMsg(''), 4000);
      }
    }, 1500);
  };

  const handleStartTrip = async () => {
    setErrorMessage('');
    setActionLoading(true);

    let latToSend = telemetry.latitude !== 0 ? telemetry.latitude : undefined;
    let lngToSend = telemetry.longitude !== 0 ? telemetry.longitude : undefined;
    let accToSend = telemetry.accuracy !== 0 ? telemetry.accuracy : undefined;

    if (!latToSend && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000,
          });
        });
        latToSend = Number(pos.coords.latitude.toFixed(6));
        lngToSend = Number(pos.coords.longitude.toFixed(6));
        accToSend = Number((pos.coords.accuracy || 5).toFixed(1));
      } catch (e) {
        console.warn('Immediate GPS capture warning:', e);
      }
    }

    try {
      const payload: any = {
        busId: selectedBusId,
        tripType: selectedTripType,
        latitude: latToSend,
        longitude: lngToSend,
        accuracy: accToSend,
      };

      const res = await driverApi.startTrip(payload);

      if (res.data.success) {
        setActiveTrip(res.data.trip);
        setIsTracking(true);
        startGpsTracking();
        requestWakeLock();
        refreshUser();

        if (latToSend && lngToSend) {
          sendGpsUpdate({
            latitude: latToSend,
            longitude: lngToSend,
            accuracy: accToSend || 5,
            speed: 0,
            heading: 0,
          });
        }
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to start trip. Check bus assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndTrip = async () => {
    if (!window.confirm('Are you sure you want to end this trip? Real-time GPS broadcasting will stop.')) {
      return;
    }

    setErrorMessage('');
    setActionLoading(true);

    try {
      const res = await driverApi.endTrip();
      if (res.data.success) {
        setActiveTrip(null);
        setIsTracking(false);
        releaseWakeLock();
        refreshUser();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to end trip.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRouteSimulation = () => {
    if (isSimulatingRoute) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
      setIsSimulatingRoute(false);
      startGpsTracking();
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsSimulatingRoute(true);

      const isReturn = activeTrip?.tripType === 'EVENING_RETURN' || selectedTripType === 'EVENING_RETURN';
      
      const morningWaypoints = [
        { lat: 16.3580, lng: 81.0520, speed: 40, heading: 220 },
        { lat: 16.3542, lng: 81.0485, speed: 30, heading: 215 },
        { lat: 16.3520, lng: 81.0460, speed: 25, heading: 210 },
        { lat: 16.35068, lng: 81.04273, speed: 10, heading: 200 },
      ];

      const returnWaypoints = [
        { lat: 16.35068, lng: 81.04273, speed: 15, heading: 35 },
        { lat: 16.3520, lng: 81.0460, speed: 35, heading: 40 },
        { lat: 16.3542, lng: 81.0485, speed: 30, heading: 45 },
        { lat: 16.3580, lng: 81.0520, speed: 38, heading: 45 },
      ];

      const waypoints = isReturn ? returnWaypoints : morningWaypoints;

      let step = 0;
      simIntervalRef.current = setInterval(() => {
        const wp = waypoints[step % waypoints.length];
        sendGpsUpdate({
          latitude: wp.lat,
          longitude: wp.lng,
          accuracy: 4.0,
          speed: wp.speed,
          heading: wp.heading,
        });
        step++;
      }, 3500);
    }
  };

  // Sync initial occupancy when selected bus changes
  useEffect(() => {
    if (selectedBus) {
      setOccupancyStatus(((selectedBus as any).occupancyStatus as any) || 'LOW');
      setOccupancyCount((selectedBus as any).currentOccupancy || 0);
    }
  }, [selectedBus]);

  const handleUpdateOccupancy = async (newStatus?: string, newCount?: number) => {
    if (!selectedBusId) return;
    try {
      setUpdatingOccupancy(true);
      setOccupancySuccessMsg('');
      const statusToUse = newStatus || occupancyStatus;
      const countToUse = newCount !== undefined ? newCount : occupancyCount;

      const res = await driverApi.updateOccupancy(selectedBusId, {
        occupancyStatus: statusToUse,
        currentOccupancy: countToUse,
      });

      if (res.data.success) {
        setOccupancyStatus(res.data.bus.occupancyStatus);
        setOccupancyCount(res.data.bus.currentOccupancy);
        setOccupancySuccessMsg('Occupancy updated & broadcasted live!');
        setTimeout(() => setOccupancySuccessMsg(''), 3000);
      }
    } catch (err: any) {
      setErrorMessage('Failed to update occupancy.');
    } finally {
      setUpdatingOccupancy(false);
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusId) return;
    try {
      setSubmittingIncident(true);
      setIncidentSuccessMsg('');
      const res = await driverApi.reportIncident({
        type: incidentType,
        severity: incidentType === 'SOS' ? 'CRITICAL' : incidentType === 'BREAKDOWN' ? 'HIGH' : 'MEDIUM',
        delayMinutes: incidentType === 'DELAY' || incidentType === 'BREAKDOWN' ? Number(incidentDelay) : 0,
        description: incidentDesc.trim() || undefined,
        latitude: telemetry.latitude || undefined,
        longitude: telemetry.longitude || undefined,
        accuracy: telemetry.accuracy || undefined,
      });

      if (res.data.success) {
        setIncidentSuccessMsg(`Reported ${incidentType} alert to Admin & route students.`);
        setShowIncidentModal(false);
        setIncidentDesc('');
        setTimeout(() => setIncidentSuccessMsg(''), 6000);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to submit incident report.');
    } finally {
      setSubmittingIncident(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors pb-12">
      <PwaBanner />
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Messages */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <span className="font-bold block">GPS Alert</span>
              <span className="font-normal">{errorMessage}</span>
            </div>
          </div>
        )}

        {locationSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center gap-3 shadow-xs">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{locationSuccessMsg}</span>
          </div>
        )}

        {/* Incident Reporting Toast */}
        {incidentSuccessMsg && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 text-xs sm:text-sm flex items-center justify-between shadow-xs animate-fadeIn">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold">{incidentSuccessMsg}</span>
            </div>
            <button onClick={() => setIncidentSuccessMsg('')} className="p-1 text-blue-500 hover:text-blue-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Safety & Incident Actions Quick Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Driver Incident & Emergency Controls
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Immediate Admin Alert</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIncidentType('SOS');
                setShowIncidentModal(true);
              }}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1.5"
            >
              <AlertOctagon className="w-5 h-5 animate-pulse" />
              <span>SOS EMERGENCY</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIncidentType('BREAKDOWN');
                setShowIncidentModal(true);
              }}
              className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1.5"
            >
              <Wrench className="w-5 h-5" />
              <span>BREAKDOWN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIncidentType('DELAY');
                setShowIncidentModal(true);
              }}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1.5"
            >
              <Clock className="w-5 h-5" />
              <span>REPORT DELAY</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIncidentType('ASSISTANCE');
                setShowIncidentModal(true);
              }}
              className="p-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1.5"
            >
              <PhoneCall className="w-5 h-5" />
              <span>REQUEST HELP</span>
            </button>
          </div>
        </div>

        {/* Live Occupancy Management Console */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Live Bus Occupancy & Passenger Count
              </span>
            </div>
            {occupancySuccessMsg && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fadeIn">
                ✓ {occupancySuccessMsg}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
            {/* Passenger Count Stepper */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Passengers:</span>
              <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(0, occupancyCount - 1);
                    setOccupancyCount(next);
                    handleUpdateOccupancy(undefined, next);
                  }}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={occupancyCount}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setOccupancyCount(val);
                  }}
                  className="w-14 text-center font-bold text-sm bg-transparent border-x border-slate-200 dark:border-slate-700 focus:outline-hidden py-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = occupancyCount + 1;
                    setOccupancyCount(next);
                    handleUpdateOccupancy(undefined, next);
                  }}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-slate-400 font-mono">/ {selectedBus?.capacity || 40} capacity</span>
            </div>

            {/* Quick Preset Badges */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'LOW', label: 'Low', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                { id: 'MEDIUM', label: 'Medium', color: 'bg-sky-600 hover:bg-sky-700 text-white' },
                { id: 'HIGH', label: 'High', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
                { id: 'FULL', label: 'Full', color: 'bg-red-600 hover:bg-red-700 text-white' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={updatingOccupancy}
                  onClick={() => {
                    setOccupancyStatus(p.id as any);
                    handleUpdateOccupancy(p.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                    occupancyStatus === p.id ? `${p.color} ring-2 ring-offset-2 ring-blue-500` : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Driver Control Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-700/60">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Driver Navigation Console
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {driver?.driverName || user?.name || 'Driver'}
              </h1>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
                {user?.college?.name || 'SRGEC Transit'}
              </span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleForceGpsLock}
                className="py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Refresh device GPS lock"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Re-lock GPS</span>
              </button>

              {isTracking ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>TRIP ACTIVE</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>READY</span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Bus Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Assigned Vehicle
            </label>
            {isTracking ? (
              <div className="p-4 sm:p-5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Active Trip Bus
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5 block">
                    Bus #{selectedBus?.busNumber || 'BUS'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Broadcasting Live</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedBusId}
                  onChange={(e) => {
                    setSelectedBusId(e.target.value);
                    const b = buses.find((item) => item.id === e.target.value);
                    if (b) setSelectedBus(b);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer pr-10 focus:outline-none focus:border-blue-500"
                >
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bus #{b.busNumber} {b.route ? `(${b.route.name})` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            )}
          </div>

          {/* Trip Schedule Switcher */}
          {!isTracking && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Trip Direction
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTripType('MORNING_PICKUP')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-colors ${
                    selectedTripType === 'MORNING_PICKUP'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                      Morning Pickup Trip
                    </span>
                    <span className="text-sm font-bold block text-slate-900 dark:text-white mt-0.5">
                      To College Gate (SRGEC)
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
                      Village stops &rarr; College Gate (&le;100m geofence)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTripType('EVENING_RETURN')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-colors ${
                    selectedTripType === 'EVENING_RETURN'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Repeat className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                      Evening Return Trip
                    </span>
                    <span className="text-sm font-bold block text-slate-900 dark:text-white mt-0.5">
                      To Village Terminus / Depot
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
                      College Gate &rarr; Village drop-offs (&le;100m geofence)
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Start / End Trip Big Button */}
          <div className="pt-2">
            {!isTracking ? (
              <button
                type="button"
                onClick={handleStartTrip}
                disabled={actionLoading || !selectedBusId}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base sm:text-lg py-3.5 sm:py-4 rounded-xl flex items-center justify-center gap-2.5 transition-colors shadow-sm disabled:opacity-60"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START {selectedTripType === 'EVENING_RETURN' ? 'RETURN TRIP' : 'MORNING TRIP'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEndTrip}
                disabled={actionLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-base sm:text-lg py-3.5 sm:py-4 rounded-xl flex items-center justify-center gap-2.5 transition-colors shadow-sm"
              >
                <Square className="w-5 h-5 fill-white" />
                <span>END TRIP</span>
              </button>
            )}
          </div>

          {/* Live Telemetry Diagnostic Cards */}
          <div className="p-4 sm:p-5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  GPS Status: {telemetry.accuracy > 0 ? `Active (±${Math.round(telemetry.accuracy)}m)` : 'Acquiring...'}
                </span>
              </div>
              <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                Updates Sent: #{telemetry.updateCount}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 block">Speed</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{telemetry.speed} km/h</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 block">Accuracy</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">&plusmn;{telemetry.accuracy || 5} m</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 block">Heading</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{telemetry.heading}&deg;</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 block">Sync Time</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5 block truncate">
                  {telemetry.lastSent || 'Live'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Driver Map */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Driver Route Map
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleRouteSimulation}
                className="py-1 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {isSimulatingRoute ? 'Stop Simulation' : 'Simulate Route Demo'}
              </button>
            </div>
          </div>

          <div className="h-[360px] sm:h-[420px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <BusMap
              busLocation={
                telemetry.latitude !== 0
                  ? {
                      latitude: telemetry.latitude,
                      longitude: telemetry.longitude,
                      heading: telemetry.heading,
                      speed: telemetry.speed,
                      accuracy: telemetry.accuracy,
                      busNumber: selectedBus?.busNumber || 'BUS',
                      status: isTracking ? 'LIVE' : 'OFFLINE',
                    }
                  : null
              }
              college={user?.college || null}
              routeStops={selectedBus?.route?.boardingPoints || []}
              show2kmCircle={false}
            />
          </div>
        </div>
      </main>

      {/* Driver Incident & SOS Reporting Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Report {incidentType} Alert
                </h3>
              </div>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportIncident} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {incidentType === 'SOS'
                  ? 'High-priority emergency SOS. Alert will be instantly dispatched to campus security and transport admin.'
                  : incidentType === 'BREAKDOWN'
                  ? 'Log vehicle mechanical failure. Transport admin and waiting route students will receive a breakdown notice.'
                  : incidentType === 'DELAY'
                  ? 'Notify students along the route of traffic or journey delay.'
                  : 'Send assistance request to college transit control.'}
              </p>

              {(incidentType === 'DELAY' || incidentType === 'BREAKDOWN') && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Estimated Delay Minutes
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 15, 20, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setIncidentDelay(mins)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                          incidentDelay === mins
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        +{mins} mins
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Incident Notes / Details (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    incidentType === 'SOS'
                      ? 'Describe medical/safety emergency...'
                      : incidentType === 'BREAKDOWN'
                      ? 'e.g. Flat tire at highway junction, engine overheating...'
                      : 'e.g. Railway crossing gate closed, heavy rain traffic...'
                  }
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIncident}
                  className={`w-1/2 py-2.5 rounded-xl text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 ${
                    incidentType === 'SOS'
                      ? 'bg-red-600 hover:bg-red-700'
                      : incidentType === 'BREAKDOWN'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingIncident ? 'Broadcasting...' : `Confirm & Broadcast`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
