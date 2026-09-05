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
  Sparkles,
  Crosshair,
  Satellite,
} from 'lucide-react';

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
  const [gpsStatus, setGpsStatus] = useState<string>('ACQUIRING'); // IDLE, ACQUIRING, ACTIVE, ERROR
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string>('');
  
  // Smart Trip Type selection state (Auto-selects based on IST time: <13:00 Morning, >=13:00 Evening Return)
  const defaultTripType = new Date().getHours() >= 13 ? 'EVENING_RETURN' : 'MORNING_PICKUP';
  const [selectedTripType, setSelectedTripType] = useState<'MORNING_PICKUP' | 'EVENING_RETURN'>(defaultTripType);

  // Live GPS telemetry state
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

  // Change bus modal state
  const [isChangeBusOpen, setIsChangeBusOpen] = useState<boolean>(false);
  const [newBusIdToAssign, setNewBusIdToAssign] = useState<string>('');

  // Watch position ID ref
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const simIntervalRef = useRef<any>(null);
  const [isSimulatingRoute, setIsSimulatingRoute] = useState<boolean>(false);
  const smoothedRef = useRef<{ lat: number; lng: number; accuracy: number } | null>(null);

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

  // 1. Transmit GPS update over Socket.IO
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
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      speed: coords.speed || 0,
      heading: coords.heading || 0,
      lastSent: new Date().toLocaleTimeString(),
      updateCount: prev.updateCount + 1,
    }));
  };

  // 2. High-Accuracy Continuous GPS Watcher (Runs automatically)
  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser/device.');
      setGpsStatus('ERROR');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        setErrorMessage('');

        const currentAcc = accuracy || 5;
        const currentSpeedKmh = speed ? Math.round(speed * 3.6) : 0;

        // Discard low-accuracy coarse cell-tower jumps (> 150m) if we already have a solid satellite lock (< 25m)
        if (smoothedRef.current && currentAcc > 150 && smoothedRef.current.accuracy < 25) {
          return;
        }

        const finalLat = Number(latitude.toFixed(6));
        const finalLng = Number(longitude.toFixed(6));

        smoothedRef.current = {
          lat: finalLat,
          lng: finalLng,
          accuracy: currentAcc,
        };

        sendGpsUpdate({
          latitude: finalLat,
          longitude: finalLng,
          accuracy: currentAcc,
          speed: currentSpeedKmh,
          heading: heading || 0,
        });
      },
      (error) => {
        console.warn('Driver GPS Error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage('Location permission denied. Please enable Location in browser settings.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage('Device GPS unavailable. Please turn ON high-accuracy location in phone settings.');
        }
        setGpsStatus('ERROR');
      },
      options
    );
  };


  // 3. Load driver profile & start tracking on mount
  useEffect(() => {
    const loadDriverData = async () => {
      try {
        setLoading(true);
        const [profileRes, busesRes] = await Promise.all([
          driverApi.getProfile(),
          driverApi.getBuses(),
        ]);

        if (profileRes.data.success) {
          const d = profileRes.data.driver;
          if (d.activeTrip) {
            setActiveTrip(d.activeTrip);
            setIsTracking(true);
            setSelectedBusId(d.activeTrip.busId);
            setSelectedBus(d.activeTrip.bus);
          } else if (d.assignedBus) {
            setSelectedBusId(d.assignedBus.id);
            setSelectedBus(d.assignedBus);
          }
        }

        if (busesRes.data.success) {
          setBuses(busesRes.data.buses);
          if (!selectedBusId && busesRes.data.buses.length > 0) {
            setSelectedBusId(busesRes.data.buses[0].id);
            setSelectedBus(busesRes.data.buses[0]);
          }
        }
      } catch (e) {
        console.error('Error loading driver data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadDriverData();
    startGpsTracking();

    return () => {
      releaseWakeLock();
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  // 4. Force GPS Re-lock
  const handleForceGpsLock = () => {
    setGpsStatus('ACQUIRING');
    setLocationSuccessMsg('');
    startGpsTracking();
    setTimeout(() => {
      if (telemetry.latitude !== 0) {
        setLocationSuccessMsg(`📍 Live GPS Locked (±${Math.round(telemetry.accuracy || 5)}m)!`);
        setTimeout(() => setLocationSuccessMsg(''), 4000);
      }
    }, 1500);
  };

  // 5. Handle Start Trip Button
  const handleStartTrip = async () => {
    setErrorMessage('');
    setActionLoading(true);

    let latToSend = telemetry.latitude !== 0 ? telemetry.latitude : undefined;
    let lngToSend = telemetry.longitude !== 0 ? telemetry.longitude : undefined;
    let accToSend = telemetry.accuracy !== 0 ? telemetry.accuracy : undefined;

    // If telemetry hasn't updated yet, capture instant high-accuracy GNSS fix
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
        console.warn('Immediate GPS capture on start trip warning:', e);
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


  // 6. Handle End Trip Button
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

  // 7. Handle Change Bus
  const handleChangeBusConfirm = async () => {
    if (!newBusIdToAssign) return;
    setActionLoading(true);

    try {
      const res = await driverApi.changeBus({
        newBusId: newBusIdToAssign,
      });

      if (res.data.success) {
        setSelectedBusId(newBusIdToAssign);
        const newB = buses.find((b) => b.id === newBusIdToAssign);
        if (newB) setSelectedBus(newB);
        setIsChangeBusOpen(false);
        refreshUser();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to change bus.');
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Smart Dynamic Route Simulator (Supports Morning & Evening Return Trips)
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
        { lat: 16.3580, lng: 81.0520, speed: 40, heading: 220 }, // Outer village
        { lat: 16.3542, lng: 81.0485, speed: 30, heading: 215 }, // Himaja Boys Hostel
        { lat: 16.3520, lng: 81.0460, speed: 25, heading: 210 }, // Intermediate junction
        { lat: 16.35068, lng: 81.04273, speed: 10, heading: 200 }, // SRGEC College Gate (<=100m Geofence trigger)
      ];

      const returnWaypoints = [
        { lat: 16.35068, lng: 81.04273, speed: 15, heading: 35 }, // Departing SRGEC Campus
        { lat: 16.3520, lng: 81.0460, speed: 35, heading: 40 }, // Approaching Hostel
        { lat: 16.3542, lng: 81.0485, speed: 30, heading: 45 }, // Himaja Boys Hostel Drop-off
        { lat: 16.3580, lng: 81.0520, speed: 38, heading: 45 }, // Final Village Terminus (<=100m Geofence trigger)
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

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Alerts & Messages */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm flex items-start gap-3 shadow-xl">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <span className="font-bold block">GPS Alert</span>
              <span className="text-red-300/90">{errorMessage}</span>
            </div>
          </div>
        )}

        {locationSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-3 shadow-xl">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{locationSuccessMsg}</span>
          </div>
        )}

        {/* Driver Control Box */}
        <div className="water-glass rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Driver & Bus Info Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Driver Navigation Console
              </span>
              <h2 className="text-2xl font-black mt-1 drop-shadow-sm card-title">
                {driver?.driverName || user?.name || 'Driver'}
              </h2>
              <span className="text-xs font-bold block mt-0.5 subtext-muted">
                {user?.college?.name}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleForceGpsLock}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-600/25"
                title="Refresh device GPS lock"
              >
                <Crosshair className="w-4 h-4 animate-pulse" />
                <span>Re-lock GPS</span>
              </button>

              {isTracking ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 text-white border-2 border-emerald-400 text-sm font-black shadow-lg shadow-emerald-600/30">
                  <Radio className="w-4 h-4 animate-pulse text-white" />
                  <span>TRIP ACTIVE</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-slate-100 text-sm font-extrabold shadow-sm">
                  <span>🟢 READY</span>
                </div>
              )}
            </div>
          </div>

          {/* Bus Assignment Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider form-label">
              Assigned Bus
            </label>
            {isTracking ? (
              <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/70 border-2 border-slate-300 dark:border-white/10 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs block font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Active Tracking Bus</span>
                  <span className="text-3xl font-black font-mono text-slate-950 dark:text-white mt-0.5 block">
                    {selectedBus?.busNumber || 'BUS'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewBusIdToAssign(selectedBusId);
                    setIsChangeBusOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-black flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  CHANGE BUS
                </button>
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
                  className="w-full water-glass-input rounded-2xl px-4 py-3.5 text-base font-black focus:outline-none cursor-pointer appearance-none pr-10 font-mono"
                >
                  {buses.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                      {b.busNumber} {b.route ? `(${b.route.name})` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  ▼
                </div>
              </div>
            )}
          </div>

          {/* Smart Trip Direction Selector (Before Trip Starts) */}
          {!isTracking && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider form-label">
                  Smart Trip Schedule
                </label>
                <span className="text-[11px] text-cyan-400 font-bold">
                  {new Date().getHours() < 13 ? '🌅 Morning Auto-Detected' : '🌆 Evening Return Auto-Detected'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTripType('MORNING_PICKUP')}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                    selectedTripType === 'MORNING_PICKUP'
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                      : 'bg-white/50 dark:bg-slate-900/40 border-slate-300 dark:border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-2xl">🌅</span>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block text-amber-300">
                      Morning Pickup Trip
                    </span>
                    <span className="text-sm font-bold block text-white mt-0.5">
                      To College Gate (SRGEC)
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Village stops ➔ College Gate (&le;100m geofence)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTripType('EVENING_RETURN')}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                    selectedTripType === 'EVENING_RETURN'
                      ? 'bg-purple-500/20 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-white/50 dark:bg-slate-900/40 border-slate-300 dark:border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-2xl">🌆</span>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block text-purple-300">
                      Evening Return Trip
                    </span>
                    <span className="text-sm font-bold block text-white mt-0.5">
                      To Village Terminus / Depot
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      College Gate ➔ Village drop-offs (&le;100m geofence)
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Active Trip Banner (When Trip is Active) */}
          {isTracking && activeTrip && (
            <div className={`p-4 rounded-2xl border shadow-lg ${
              activeTrip.tripType === 'EVENING_RETURN'
                ? 'bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/60 border-purple-500/40'
                : 'bg-gradient-to-r from-amber-900/40 via-yellow-900/40 to-slate-900/60 border-amber-500/40'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">
                    {activeTrip.tripType === 'EVENING_RETURN' ? '🌆' : '🌅'}
                  </span>
                  <div>
                    <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      activeTrip.tripType === 'EVENING_RETURN' ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {activeTrip.tripType === 'EVENING_RETURN' ? 'Evening Return Route' : 'Morning College Route'}
                    </span>
                    <div className="text-sm font-black text-white mt-1 flex items-center gap-2">
                      <span className="text-slate-300">{activeTrip.originName || 'Origin'}</span>
                      <span className="text-cyan-400">➔</span>
                      <span className="text-cyan-300">{activeTrip.destinationName || 'Destination'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[11px] font-bold text-emerald-400 block">
                    📍 Geofence Active
                  </span>
                  <span className="text-[10px] text-slate-400">
                    &le; 100m auto-completion
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Main Action Button (Start / End Trip) */}
          <div className="pt-2">
            {!isTracking ? (
              <button
                type="button"
                onClick={handleStartTrip}
                disabled={actionLoading || !selectedBusId}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-slate-950 font-black text-2xl py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/30 transition-all uppercase tracking-wider disabled:opacity-50"
              >
                <Play className="w-8 h-8 fill-slate-950" />
                <span>START {selectedTripType === 'EVENING_RETURN' ? 'RETURN TRIP' : 'MORNING TRIP'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEndTrip}
                disabled={actionLoading}
                className="w-full bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 active:scale-[0.98] text-white font-black text-2xl py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-red-600/30 transition-all uppercase tracking-wider disabled:opacity-50"
              >
                <Square className="w-8 h-8 fill-white" />
                END TRIP
              </button>
            )}
          </div>

          {/* Real-time GPS Diagnostics */}
          <div className="p-5 rounded-2xl bg-white/95 dark:bg-slate-900/60 border-2 border-slate-300 dark:border-white/10 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Hardware GPS Status: {telemetry.accuracy > 0 ? `Active (±${Math.round(telemetry.accuracy)}m)` : 'Acquiring...'}
                </span>
              </div>
              <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-300">
                Updates: #{telemetry.updateCount}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-300 dark:border-white/10 shadow-sm">
                <span className="text-[11px] font-extrabold uppercase block text-slate-700 dark:text-slate-300">Speed</span>
                <span className="text-lg font-black text-slate-950 dark:text-white">{telemetry.speed} km/h</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-300 dark:border-white/10 shadow-sm">
                <span className="text-[11px] font-extrabold uppercase block text-slate-700 dark:text-slate-300">Accuracy</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">&plusmn;{telemetry.accuracy || 5} m</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-300 dark:border-white/10 shadow-sm">
                <span className="text-[11px] font-extrabold uppercase block text-slate-700 dark:text-slate-300">Heading</span>
                <span className="text-lg font-black text-slate-950 dark:text-white">{telemetry.heading}&deg;</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-300 dark:border-white/10 shadow-sm">
                <span className="text-[11px] font-extrabold uppercase block text-slate-700 dark:text-slate-300">Last Sync</span>
                <span className="text-xs font-black text-blue-700 dark:text-cyan-300 font-mono mt-0.5 block truncate">
                  {telemetry.lastSent || 'Live'}
                </span>
              </div>
            </div>

            {telemetry.latitude !== 0 && (
              <div className="text-xs text-blue-900 dark:text-cyan-300 font-mono text-center font-black truncate bg-blue-50 dark:bg-blue-950/40 p-2 rounded-xl border border-blue-200 dark:border-blue-500/20">
                📍 Live Real GPS: {telemetry.latitude.toFixed(6)}, {telemetry.longitude.toFixed(6)}
              </div>
            )}
          </div>
        </div>

        {/* Live Driver Map View */}
        <div className="water-glass rounded-3xl p-4 sm:p-6 shadow-2xl space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Driver Live Map Radar
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleRouteSimulation}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                  isSimulatingRoute
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                    : 'bg-white/10 dark:bg-slate-800/80 border-white/15 text-slate-300 hover:text-white'
                }`}
              >
                {isSimulatingRoute ? '⏹ Stop Demo Route' : '▶ Simulate Demo Route'}
              </button>
              <span className="text-[11px] text-cyan-300 font-mono font-bold">
                {telemetry.latitude !== 0 ? `${telemetry.latitude.toFixed(5)}, ${telemetry.longitude.toFixed(5)}` : 'Acquiring GPS...'}
              </span>
            </div>
          </div>

          <div className="h-[420px] rounded-2xl overflow-hidden">
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
              customDestination={
                activeTrip?.destinationLat && activeTrip?.destinationLng
                  ? {
                      name: activeTrip.destinationName || 'Destination',
                      latitude: activeTrip.destinationLat,
                      longitude: activeTrip.destinationLng,
                      isTerminus: activeTrip.tripType === 'EVENING_RETURN',
                    }
                  : null
              }
              destinationTarget={activeTrip?.tripType === 'EVENING_RETURN' ? 'TRIP_DESTINATION' : 'COLLEGE'}
              routeStops={selectedBus?.route?.boardingPoints || []}
              className="h-full w-full"
              zoom={15}
              show2kmCircle={false}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
