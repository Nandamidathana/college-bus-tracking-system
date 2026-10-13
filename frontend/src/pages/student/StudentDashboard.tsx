import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Bus, BoardingPoint, BusLocationUpdate, ProximityAlertPayload } from '../../types';
import { RouteNavigationData } from '../../services/routing';
import { BusMap } from '../../components/maps/BusMap';
import { Navbar } from '../../components/common/Navbar';
import { StudentProfileModal } from '../../components/student/StudentProfileModal';
import { WhereIsMyBusTracker } from '../../components/student/WhereIsMyBusTracker';
import { FloatingBottomNav, StudentNavTab } from '../../components/common/FloatingBottomNav';
import { checkBusServesBoardingStop } from '../../utils/routeMatching';
import {
  Compass,
  MapPin,
  Clock,
  Radio,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  Navigation,
  School,
  Bus as BusIcon,
  Route as RouteIcon,
  Crosshair,
  Sparkles,
  ArrowRight,
  UserCheck,
  X,
  Repeat,
  Play,
  Square,
  Layers,
  ChevronDown,
  Map as MapViewIcon,
  Gauge,
  Bell,
  ChevronRight,
  Users,
  Shield,
  Smartphone,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [busData, setBusData] = useState<any>(null);
  const [liveLocation, setLiveLocation] = useState<BusLocationUpdate | any | null>(null);
  const [activeAlert, setActiveAlert] = useState<ProximityAlertPayload | null>(null);
  const [roadNavData, setRoadNavData] = useState<RouteNavigationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string>('');

  // Active navigation tab for mobile floating bottom navigation
  const [activeNavTab, setActiveNavTab] = useState<StudentNavTab>('OVERVIEW');

  // Real-time Live Device GPS of the Student
  const [userLiveGps, setUserLiveGps] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);

  // Dynamic Navigation Phase ('BOARDING_POINT' vs 'COLLEGE')
  const [navigationTarget, setNavigationTarget] = useState<'BOARDING_POINT' | 'COLLEGE'>('BOARDING_POINT');
  const [hasManuallyToggled, setHasManuallyToggled] = useState<boolean>(false);
  const autoSwitchedRef = useRef<boolean>(false);

  // Arrival Alert State (Morning College Gate Arrival / Evening Terminus Completion)
  const [arrivalAlert, setArrivalAlert] = useState<{
    type: 'BUS_ARRIVED' | 'BUS_RETURN_COMPLETED';
    message: string;
    status?: string;
    delayMinutes?: number;
    destinationName?: string;
  } | null>(null);

  // Volunteer Broadcast Mode (For student on board if driver phone is unavailable)
  const [isVolunteerMode, setIsVolunteerMode] = useState<boolean>(false);
  const [volunteerMsg, setVolunteerMsg] = useState<string>('');
  const [volunteerUpdateCount, setVolunteerUpdateCount] = useState<number>(0);
  const [showVolunteerModal, setShowVolunteerModal] = useState<boolean>(false);
  const volunteerWatchIdRef = useRef<number | null>(null);

  const student = user?.student;
  const boardingPoint = student?.boardingPoint;

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const selectedBus = useMemo(() => {
    if (!selectedBusId) return null;
    const b = buses.find((item) => item.id === selectedBusId) || null;
    if (!b) return null;
    if (busData?.route && (!b.route || !b.route.boardingPoints || b.route.boardingPoints.length === 0)) {
      return { ...b, route: busData.route };
    }
    return b;
  }, [buses, selectedBusId, busData]);

  // Check whether the currently selected bus serves the student's stop
  const isBusServingStudentStop = useMemo(() => {
    if (!selectedBus) return true;
    if (busData && typeof busData.isServingStudent === 'boolean') {
      return busData.isServingStudent;
    }
    return checkBusServesBoardingStop(selectedBus, boardingPoint, student?.routeId);
  }, [selectedBus, boardingPoint, student?.routeId, busData]);

  // Find all buses in the fleet that DO pass through this student's boarding point
  const preferredBuses = useMemo(
    () => buses.filter((b) => checkBusServesBoardingStop(b, boardingPoint, student?.routeId)),
    [buses, boardingPoint, student?.routeId]
  );

  // 1. Continuous Watch for Student's Own Live Hardware GPS
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLiveGps({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.max(1, Number((pos.coords.accuracy || 5).toFixed(1))),
        });
      },
      (err) => {
        console.warn('Student GPS watcher warning:', err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 2. Fetch fresh user profile & available buses on mount
  useEffect(() => {
    refreshUser();
    const fetchBuses = async () => {
      try {
        setLoading(true);
        const res = await studentApi.getBuses();
        if (res.data.success && res.data.buses.length > 0) {
          setBuses(res.data.buses);
        }
      } catch (err) {
        console.error('Failed to load buses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBuses();
  }, []);

  // 3. Fetch live bus status & coordinates
  const fetchBusStatus = async (busId: string) => {
    if (!busId) return;
    try {
      const [locRes, detailsRes] = await Promise.all([
        studentApi.getBusLiveLocation(busId).catch(() => null),
        studentApi.getBusDetails(busId).catch(() => null),
      ]);

      if (locRes && locRes.data && locRes.data.success) {
        setBusData(locRes.data);
        if (locRes.data.location && locRes.data.active) {
          setLiveLocation(locRes.data.location);
        } else {
          setLiveLocation(null);
        }
      } else if (detailsRes && detailsRes.data && detailsRes.data.success) {
        const b = detailsRes.data.bus;
        setBusData(b);
        if (b.liveLocation && b.activeTrip) {
          setLiveLocation(b.liveLocation);
        } else {
          setLiveLocation(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch bus status:', err);
    }
  };

  useEffect(() => {
    if (selectedBusId) {
      fetchBusStatus(selectedBusId);
    }
  }, [selectedBusId]);

  // 4. Socket.IO Real-time Subscriptions
  useEffect(() => {
    if (!selectedBusId) return;

    const socket = getSocket();
    if (!socket) return;

    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('bus:subscribe', { busId: selectedBusId });

    const handleLocationUpdate = (data: any) => {
      if (!data) return;
      const loc = data.location || data;
      const targetBusId = data.busId || loc.busId;

      if (!selectedBusId || targetBusId === selectedBusId) {
        setLiveLocation(loc);
        setBusData((prev: any) => ({
          ...prev,
          active: true,
          status: loc.status || 'LIVE',
          location: loc,
          busNumber: loc.busNumber || prev?.busNumber,
          tripType: loc.tripType || prev?.tripType,
          originName: loc.originName || prev?.originName,
          destinationName: loc.destinationName || prev?.destinationName,
          destinationLat: loc.destinationLat || prev?.destinationLat,
          destinationLng: loc.destinationLng || prev?.destinationLng,
          nextStopName: loc.nextStopName || prev?.nextStopName,
          destinationDistance: loc.destinationDistance || prev?.destinationDistance,
        }));
      }
    };

    const handleTripStarted = (data: { busId: string }) => {
      if (data.busId === selectedBusId) {
        setArrivalAlert(null);
        fetchBusStatus(selectedBusId);
      }
    };

    const handleTripEnded = (data: { busId: string }) => {
      if (data.busId === selectedBusId) {
        setLiveLocation(null);
        fetchBusStatus(selectedBusId);
      }
    };

    const handleStatusChanged = (data: { busId: string; status: string }) => {
      if (data.busId === selectedBusId) {
        fetchBusStatus(selectedBusId);
      }
    };

    const handleProximityAlert = (alert: ProximityAlertPayload) => {
      setActiveAlert(alert);
    };

    const handleBusArrived = (data: any) => {
      if (!data) return;
      if (!selectedBusId || data.busId === selectedBusId) {
        setArrivalAlert({
          type: 'BUS_ARRIVED',
          message: data.message || '✅ Bus arrived at College Gate!',
          status: data.status,
          delayMinutes: data.delayMinutes,
          destinationName: data.destinationName,
        });
        setLiveLocation(null);
        fetchBusStatus(selectedBusId);
      }
    };

    const handleReturnCompleted = (data: any) => {
      if (!data) return;
      if (!selectedBusId || data.busId === selectedBusId) {
        setArrivalAlert({
          type: 'BUS_RETURN_COMPLETED',
          message: data.message || `🏁 Bus completed return trip to ${data.destinationName || 'terminus'}!`,
          destinationName: data.destinationName,
        });
        setLiveLocation(null);
        fetchBusStatus(selectedBusId);
      }
    };

    const handleVolunteerStatus = (data: any) => {
      if (data?.message) {
        setVolunteerMsg(data.message);
      }
    };

    const handleVolunteerAck = () => {
      setVolunteerUpdateCount((c) => c + 1);
    };

    socket.on('bus:location:update', handleLocationUpdate);
    socket.on('bus:trip:started', handleTripStarted);
    socket.on('bus:trip:ended', handleTripEnded);
    socket.on('bus:status:changed', handleStatusChanged);
    socket.on('bus:approaching', handleProximityAlert);
    socket.on('bus:arrived', handleBusArrived);
    socket.on('bus:return_completed', handleReturnCompleted);
    socket.on('volunteer:status', handleVolunteerStatus);
    socket.on('volunteer:location:ack', handleVolunteerAck);

    return () => {
      socket.emit('bus:unsubscribe', { busId: selectedBusId });
      socket.off('bus:location:update', handleLocationUpdate);
      socket.off('bus:trip:started', handleTripStarted);
      socket.off('bus:trip:ended', handleTripEnded);
      socket.off('bus:status:changed', handleStatusChanged);
      socket.off('bus:approaching', handleProximityAlert);
      socket.off('bus:arrived', handleBusArrived);
      socket.off('bus:return_completed', handleReturnCompleted);
      socket.off('volunteer:status', handleVolunteerStatus);
      socket.off('volunteer:location:ack', handleVolunteerAck);
    };
  }, [selectedBusId]);

  // Volunteer continuous GPS watcher
  useEffect(() => {
    if (!isVolunteerMode || !selectedBusId) {
      if (volunteerWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(volunteerWatchIdRef.current);
        volunteerWatchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setVolunteerMsg('Geolocation is not supported on this browser/device.');
      setIsVolunteerMode(false);
      return;
    }

    const socket = getSocket();
    if (!socket || !socket.connected) {
      socket?.connect();
    }

    volunteerWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const payload = {
          busId: selectedBusId,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.max(1, Number((pos.coords.accuracy || 5).toFixed(1))),
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          heading: pos.coords.heading || 0,
          timestamp: new Date().toISOString(),
        };
        socket?.emit('volunteer:location:update', payload);
      },
      (err) => {
        console.warn('Volunteer GPS error:', err);
        setVolunteerMsg('GPS error. Make sure High Accuracy location is enabled.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => {
      if (volunteerWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(volunteerWatchIdRef.current);
        volunteerWatchIdRef.current = null;
      }
    };
  }, [isVolunteerMode, selectedBusId]);

  // Calculations for distances & smart route switching
  const busLat = liveLocation?.latitude || busData?.location?.latitude || busData?.liveLocation?.latitude;
  const busLng = liveLocation?.longitude || busData?.location?.longitude || busData?.liveLocation?.longitude;
  const bpLat = boardingPoint?.latitude;
  const bpLng = boardingPoint?.longitude;

  const distanceBusToBoardingMeters = useMemo(() => {
    if (!isBusServingStudentStop || !busLat || !busLng || !bpLat || !bpLng) return null;
    const R = 6371e3;
    const φ1 = (busLat * Math.PI) / 180;
    const φ2 = (bpLat * Math.PI) / 180;
    const Δφ = ((bpLat - busLat) * Math.PI) / 180;
    const Δλ = ((bpLng - busLng) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }, [isBusServingStudentStop, busLat, busLng, bpLat, bpLng]);

  // Auto-switch route to College when bus arrives at stop (<= 350m)
  useEffect(() => {
    if (!hasManuallyToggled && distanceBusToBoardingMeters !== null && distanceBusToBoardingMeters <= 350 && !autoSwitchedRef.current) {
      autoSwitchedRef.current = true;
      setNavigationTarget('COLLEGE');
      setLocationSuccessMsg('🚌 Bus reached your boarding stop! Navigation switched towards College Campus.');
      setTimeout(() => setLocationSuccessMsg(''), 7000);
    }
  }, [distanceBusToBoardingMeters, hasManuallyToggled]);

  const isLiveState =
    liveLocation !== null ||
    busData?.status === 'LIVE' ||
    busData?.status === 'APPROACHING' ||
    busData?.status === 'NEARBY' ||
    busData?.active === true;

  const displayDistance = isBusServingStudentStop
    ? (roadNavData?.formattedDistance || busData?.distance?.formatted || '---')
    : '❌ No Route';

  const displayEta = isBusServingStudentStop
    ? (roadNavData?.estimatedMinutes || busData?.distance?.estimatedMinutes || 0)
    : 0;

  // Trip details
  const activeTrip = busData?.activeTrip || selectedBus?.activeTrip;
  const rawTripType = liveLocation?.tripType || busData?.tripType || activeTrip?.tripType;
  const isReturnTrip = rawTripType === 'EVENING_RETURN';
  const tripType: 'MORNING_PICKUP' | 'EVENING_RETURN' = isReturnTrip ? 'EVENING_RETURN' : 'MORNING_PICKUP';

  const originName =
    liveLocation?.originName ||
    busData?.originName ||
    activeTrip?.originName ||
    (isReturnTrip
      ? (user?.college?.name ? `${user.college.name} Gate` : 'SRGEC College Gate')
      : (selectedBus?.route?.boardingPoints?.[0]?.name || 'Origin Village / Depot'));

  const routeBoardingPoints = selectedBus?.route?.boardingPoints || [];
  const villageStops = routeBoardingPoints.filter(
    (s: any) =>
      !s.name.toLowerCase().includes('college') &&
      !s.name.toLowerCase().includes('campus') &&
      !s.name.toLowerCase().includes('gate') &&
      !s.name.toLowerCase().includes('srgec')
  );
  const lastVillageStop = villageStops.length > 0 ? villageStops[villageStops.length - 1] : (routeBoardingPoints.length > 0 ? routeBoardingPoints[routeBoardingPoints.length - 1] : null);

  const destinationName =
    (isReturnTrip && liveLocation?.destinationName && !liveLocation.destinationName.toLowerCase().includes('college') && !liveLocation.destinationName.toLowerCase().includes('gate'))
      ? liveLocation.destinationName
      : (activeTrip?.destinationName && !activeTrip.destinationName.toLowerCase().includes('college') && !activeTrip.destinationName.toLowerCase().includes('gate'))
      ? activeTrip.destinationName
      : (isReturnTrip
          ? (lastVillageStop ? `${lastVillageStop.name} (Terminus)` : (isBusServingStudentStop && student?.boardingPoint?.name ? `${student.boardingPoint.name} (Terminus)` : 'Route Terminus'))
          : (user?.college?.name ? `${user.college.name} Gate` : 'SRGEC College Gate'));

  const destinationLat = (isReturnTrip ? lastVillageStop?.latitude : user?.college?.latitude) || 16.35068;
  const destinationLng = (isReturnTrip ? lastVillageStop?.longitude : user?.college?.longitude) || 81.04273;

  const nextStopName = liveLocation?.nextStopName || busData?.nextStopName || null;

  // Resolved Bus Location Object
  const resolvedBusLocation = useMemo(() => {
    const lat = liveLocation?.latitude || busData?.location?.latitude || busData?.liveLocation?.latitude;
    const lng = liveLocation?.longitude || busData?.location?.longitude || busData?.liveLocation?.longitude;
    if (!lat || !lng) return null;

    return {
      latitude: lat,
      longitude: lng,
      heading: liveLocation?.heading || busData?.location?.heading || busData?.liveLocation?.heading || 0,
      speed: liveLocation?.speed || busData?.location?.speed || busData?.liveLocation?.speed || 0,
      accuracy: liveLocation?.accuracy || busData?.location?.accuracy || busData?.liveLocation?.accuracy || 5,
      busNumber: liveLocation?.busNumber || busData?.busNumber || selectedBus?.busNumber || 'BUS',
      status: (isLiveState ? 'LIVE' : 'OFFLINE') as any,
    };
  }, [liveLocation, busData, selectedBus, isLiveState]);

  return (
    <div className="min-h-screen flex flex-col relative text-pastel-darkText dark:text-white">
      <Navbar />

      {/* Arrival Toast */}
      {arrivalAlert && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 mt-3 w-full animate-fadeIn">
          <div className="p-4 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-900 dark:text-emerald-100 flex items-center justify-between shadow-glass backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/30 flex items-center justify-center text-xl font-bold">
                {arrivalAlert.type === 'BUS_ARRIVED' ? '🎓' : '🏁'}
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  {arrivalAlert.type === 'BUS_ARRIVED' ? 'College Gate Arrival' : 'Trip Completed'}
                </span>
                <p className="text-sm font-extrabold">{arrivalAlert.message}</p>
              </div>
            </div>
            <button onClick={() => setArrivalAlert(null)} className="p-2 text-emerald-700 dark:text-emerald-300 hover:opacity-75">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Proximity 2 KM Alert Toast */}
      {activeAlert && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 mt-3 w-full animate-fadeIn">
          <div className="p-4 rounded-3xl bg-amber-400/20 border-2 border-amber-400 text-amber-950 dark:text-amber-100 flex items-center justify-between shadow-glass backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/30 flex items-center justify-center text-amber-800 dark:text-amber-200">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
                  Bus Approaching (Within 2 KM)
                </span>
                <p className="text-sm font-extrabold">{activeAlert.message}</p>
              </div>
            </div>
            <button onClick={() => setActiveAlert(null)} className="p-2 text-amber-800 dark:text-amber-200 hover:opacity-75">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <StudentProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileUpdated={async () => {
          await refreshUser();
          if (selectedBusId) fetchBusStatus(selectedBusId);
        }}
      />

      {/* Main Container - Extra bottom padding for mobile floating nav */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-6 pb-28 sm:pb-12">
        {/* =========================================================================
            1. PERSONALIZED WELCOME HEADER
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 water-glass rounded-3xl sm:rounded-4xl shadow-glass">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 border-2 border-pastel-yellow/60 flex items-center justify-center text-white font-black text-xl shadow-pill-teal shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-pastel-darkText dark:text-white">
                  {greeting}, {user?.name || 'Student'} 👋
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pastel-mint text-brand-900 border border-brand-400/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  GPS Active
                </span>
              </div>
              <p className="text-xs font-semibold subtext-muted mt-0.5">
                {user?.college?.name || 'SRGEC Transit'} • Roll: <span className="font-mono font-bold text-brand-700 dark:text-pastel-softTeal">{student?.rollNumber || 'Enrolled'}</span>
              </p>
            </div>
          </div>

          {/* Destination & Boarding Quick Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/70 dark:bg-white/10 px-3.5 py-2 rounded-full border border-black/5 dark:border-white/10 shadow-sm">
            <MapPin className="w-4 h-4 text-brand-600 dark:text-pastel-softTeal shrink-0" />
            <div className="text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block leading-none">Your Boarding Stop</span>
              <span className="font-extrabold text-pastel-darkText dark:text-white truncate max-w-[160px] sm:max-w-xs block">
                {boardingPoint?.name || 'Not Configured'}
              </span>
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="text-[11px] font-black text-brand-600 dark:text-pastel-yellow underline ml-1"
            >
              Edit
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. QUICK-ACCESS CARDS (My Bus, Routes, Boarding Stop, 2km Radar)
            ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: My Bus */}
          <div className="water-glass-subtle p-4 rounded-3xl flex flex-col justify-between space-y-2 hover:shadow-glass transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider subtext-muted">My Bus</span>
              <div className="w-8 h-8 rounded-full bg-pastel-yellow/30 text-amber-900 dark:text-pastel-yellow flex items-center justify-center">
                <BusIcon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black text-pastel-darkText dark:text-white block">
                {selectedBus ? `Bus #${selectedBus.busNumber}` : 'Not Selected'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {selectedBus?.assignedDriver?.driverName ? `Driver: ${selectedBus.assignedDriver.driverName}` : 'Select below'}
              </span>
            </div>
          </div>

          {/* Card 2: Active Route */}
          <div className="water-glass-subtle p-4 rounded-3xl flex flex-col justify-between space-y-2 hover:shadow-glass transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider subtext-muted">Route Corridor</span>
              <div className="w-8 h-8 rounded-full bg-pastel-mint text-brand-900 flex items-center justify-center">
                <RouteIcon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black text-pastel-darkText dark:text-white block capitalize truncate">
                {selectedBus?.route?.name || student?.route?.name || 'Transit Route'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {selectedBus?.route?.boardingPoints?.length ? `${selectedBus.route.boardingPoints.length} Stops` : 'Official Transit'}
              </span>
            </div>
          </div>

          {/* Card 3: Boarding Stop */}
          <div className="water-glass-subtle p-4 rounded-3xl flex flex-col justify-between space-y-2 hover:shadow-glass transition-all cursor-pointer" onClick={() => setShowProfileModal(true)}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider subtext-muted">My Stop</span>
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black text-pastel-darkText dark:text-white block truncate">
                {boardingPoint?.name || 'Configure'}
              </span>
              <span className="text-[10px] font-bold text-brand-600 dark:text-pastel-softTeal">
                Tap to change stop 📍
              </span>
            </div>
          </div>

          {/* Card 4: 2KM Proximity Radar */}
          <div className="water-glass-subtle p-4 rounded-3xl flex flex-col justify-between space-y-2 hover:shadow-glass transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider subtext-muted">Proximity Radar</span>
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black text-pastel-darkText dark:text-white block">
                {isLiveState ? '2 KM Radar Active' : 'Waiting for Bus'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {isLiveState ? 'Automated push alerts' : 'Bus not on trip'}
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. BUS SELECTION & FAST SWITCHER BAR
            ========================================================================= */}
        <div className="water-glass p-5 rounded-3xl shadow-glass space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-pastel-softTeal">
                Select Your Bus:
              </span>
            </div>

            {/* Select Dropdown */}
            <div className="flex items-center gap-2 flex-1 sm:max-w-md">
              <div className="relative flex-1">
                <select
                  value={selectedBusId}
                  onChange={(e) => {
                    setSelectedBusId(e.target.value);
                    autoSwitchedRef.current = false;
                  }}
                  className="w-full water-glass-input text-pastel-darkText dark:text-white rounded-full px-4 py-2.5 pr-10 text-xs sm:text-sm font-extrabold appearance-none cursor-pointer focus:outline-none"
                >
                  <option value="" className="text-slate-400 font-bold">
                    -- 🚌 Select Bus --
                  </option>
                  {buses.map((b) => {
                    const isServesMyStop = checkBusServesBoardingStop(b, boardingPoint);
                    const routeName = b.route?.name ? b.route.name.split('-')[0].trim() : 'Route';
                    return (
                      <option
                        key={b.id}
                        value={b.id}
                        className={isServesMyStop ? 'font-bold text-brand-700' : ''}
                      >
                        Bus #{b.busNumber} ({routeName}) {isServesMyStop ? '⭐ [Your Stop]' : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-brand-600 dark:text-pastel-yellow">
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>

              {/* Volunteer Mode Pill Button */}
              <button
                type="button"
                onClick={() => setShowVolunteerModal(true)}
                disabled={!selectedBusId}
                className={`px-3.5 py-2.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm shrink-0 border ${
                  !selectedBusId
                    ? 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-500 border-transparent'
                    : isVolunteerMode
                    ? 'bg-amber-500 text-slate-900 animate-pulse border-amber-300 font-black'
                    : 'bg-white dark:bg-white/10 text-amber-700 dark:text-pastel-yellow hover:bg-amber-50 border-amber-300/50'
                }`}
                title="Volunteer GPS broadcast if driver device is offline"
              >
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isVolunteerMode ? 'Broadcasting' : 'Volunteer'}</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={() => selectedBusId && fetchBusStatus(selectedBusId)}
                disabled={!selectedBusId}
                className="p-2.5 rounded-full water-glass-subtle hover:bg-white text-brand-700 dark:text-pastel-yellow transition-all shrink-0 shadow-sm disabled:opacity-40"
                title="Refresh Live Status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Bus Selection Chips with Warm Yellow Active Indicator */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
            {buses.map((b) => {
              const isSelected = b.id === selectedBusId;
              const isServesMyStop = checkBusServesBoardingStop(b, boardingPoint);
              const isLive =
                (b as any).status === 'LIVE' ||
                (b as any).status === 'APPROACHING' ||
                (b as any).status === 'NEARBY' ||
                b.status === 'ACTIVE';

              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBusId(b.id);
                    autoSwitchedRef.current = false;
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-pastel-yellow text-pastel-darkText border-amber-400 shadow-pill-yellow font-black scale-105'
                      : isServesMyStop
                      ? 'bg-pastel-mint/70 border-brand-400 text-brand-900 hover:bg-pastel-mint'
                      : 'bg-white/60 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  ></span>
                  <span>Bus {b.busNumber}</span>
                  {isServesMyStop && (
                    <span className="text-[9px] bg-brand-600 text-white px-1.5 py-0.2 rounded-full font-black">
                      Your Stop
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* State 1: When no bus is selected yet */}
        {!selectedBusId && (
          <div className="water-glass rounded-3xl sm:rounded-4xl p-8 sm:p-12 text-center shadow-glass space-y-5 border-2 border-dashed border-brand-400/30 animate-fadeIn">
            <div className="w-20 h-20 mx-auto rounded-full bg-pastel-yellow/30 border border-pastel-yellow flex items-center justify-center text-4xl shadow-pill-yellow animate-bounce">
              🚌
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-pastel-darkText dark:text-white tracking-tight">
                Select Your College Bus
              </h3>
              <p className="text-xs sm:text-sm subtext-muted leading-relaxed font-semibold">
                Tap a bus above or pick from the dropdown to see live GPS location, road route, speed, and real-time arrival estimates.
              </p>
            </div>

            {boardingPoint && preferredBuses.length > 0 && (
              <div className="max-w-md mx-auto pt-5 border-t border-black/10 dark:border-white/10 space-y-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-pastel-softTeal block">
                  ⭐ Recommended for {boardingPoint.name}:
                </span>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {preferredBuses.map((pb) => (
                    <button
                      key={pb.id}
                      type="button"
                      onClick={() => {
                        setSelectedBusId(pb.id);
                        autoSwitchedRef.current = false;
                      }}
                      className="btn-pill-yellow text-xs gap-1.5 transform hover:scale-105 active:scale-95"
                    >
                      <span>🚌 Select Bus {pb.busNumber}</span>
                      <span className="text-[10px] opacity-75 font-normal">
                        ({pb.route?.name ? pb.route.name.split('-')[0].trim() : 'Route'})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* State 2: Off-Route Bus Mismatch Warning */}
        {selectedBusId && !isBusServingStudentStop && boardingPoint && (
          <div className="p-5 sm:p-6 rounded-3xl bg-red-500/10 border-2 border-red-500/50 text-red-900 dark:text-red-100 shadow-glass space-y-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-600 dark:text-red-300 flex items-center justify-center text-xl shrink-0 font-black">
                ⚠️
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-800 dark:text-red-200 bg-red-200 dark:bg-red-900/60 px-2.5 py-0.5 rounded-full">
                    Route Mismatch
                  </span>
                  <span className="text-xs font-bold text-red-800 dark:text-red-200">
                    Bus #{selectedBus?.busNumber} is on the {selectedBus?.route?.name || 'other'} corridor
                  </span>
                </div>
                <h3 className="text-base font-black text-red-900 dark:text-white mt-1">
                  This bus does not pass through your stop ({boardingPoint.name}).
                </h3>
              </div>
            </div>

            {preferredBuses.length > 0 && (
              <div className="pt-3 border-t border-red-300 dark:border-red-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-bold text-red-800 dark:text-red-200">
                  Switch to your route's verified bus:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {preferredBuses.map((pb) => (
                    <button
                      key={pb.id}
                      type="button"
                      onClick={() => {
                        setSelectedBusId(pb.id);
                        autoSwitchedRef.current = false;
                      }}
                      className="btn-pill-primary text-xs py-2 px-4 gap-1.5"
                    >
                      <span>🚌 Switch to Bus {pb.busNumber}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* State 3: Bus Selected - PROMINENT LIVE TRACKING CARD & CONTENT */}
        {selectedBusId && (
          <>
            {/* =========================================================================
                PROMINENT LIVE TRACKING CARD (Hero Glassmorphism Card)
                ========================================================================= */}
            <div className="water-glass rounded-3xl sm:rounded-4xl p-6 sm:p-8 shadow-glass space-y-6 relative overflow-hidden">
              {/* Background Ambient Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-pastel-yellow/20 rounded-full blur-3xl pointer-events-none"></div>

              {/* Top Row: Bus Identity & Live Telemetry Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-brand-600 text-pastel-yellow flex items-center justify-center font-black text-xl shadow-pill-teal shrink-0">
                    #{resolvedBusLocation?.busNumber || selectedBus?.busNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-pastel-darkText dark:text-white tracking-tight">
                        Bus {resolvedBusLocation?.busNumber || selectedBus?.busNumber}
                      </h2>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${
                        isLiveState
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isLiveState ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
                        {isLiveState ? (isReturnTrip ? 'RETURN EN ROUTE' : 'LIVE EN ROUTE') : 'IDLE / OFFLINE'}
                      </span>
                    </div>
                    <p className="text-xs font-bold subtext-muted mt-0.5">
                      Corridor: <span className="text-brand-700 dark:text-pastel-softTeal">{selectedBus?.route?.name || 'Active Route'}</span>
                    </p>
                  </div>
                </div>

                {/* Road Navigation Phase Toggle Button (To My Stop vs To Campus) */}
                <button
                  type="button"
                  onClick={() => {
                    setHasManuallyToggled(true);
                    setNavigationTarget(navigationTarget === 'BOARDING_POINT' ? 'COLLEGE' : 'BOARDING_POINT');
                  }}
                  className="btn-pill-secondary text-xs gap-1.5 self-start sm:self-auto shadow-sm"
                  title="Toggle road route focus"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>
                    Focus: {navigationTarget === 'BOARDING_POINT' ? 'My Boarding Stop 📍' : 'Campus Gate 🎓'}
                  </span>
                </button>
              </div>

              {/* Middle Row: Telemetry Metric Chips (Distance, ETA, Speed) */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2">
                {/* Distance Metric */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 text-center">
                  <div className="w-7 h-7 mx-auto rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider subtext-muted block">Road Dist</span>
                  <span className="text-base sm:text-xl font-black text-pastel-darkText dark:text-white mt-0.5 block truncate">
                    {displayDistance}
                  </span>
                </div>

                {/* ETA Metric */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 text-center">
                  <div className="w-7 h-7 mx-auto rounded-full bg-pastel-yellow/30 text-amber-800 dark:text-pastel-yellow flex items-center justify-center mb-1">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider subtext-muted block">Est. Arrival</span>
                  <span className="text-base sm:text-xl font-black text-pastel-darkText dark:text-white mt-0.5 block truncate">
                    {displayEta > 0 ? `~${displayEta} mins` : isLiveState ? 'Arriving' : '---'}
                  </span>
                </div>

                {/* Speed Metric */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 text-center">
                  <div className="w-7 h-7 mx-auto rounded-full bg-pastel-mint text-brand-800 flex items-center justify-center mb-1">
                    <Gauge className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider subtext-muted block">Live Speed</span>
                  <span className="text-base sm:text-xl font-black text-pastel-darkText dark:text-white mt-0.5 block truncate">
                    {resolvedBusLocation?.speed ? `${Math.round(resolvedBusLocation.speed)} km/h` : '0 km/h'}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Departure & Arrival Path Strip */}
              <div className="p-4 rounded-2xl bg-pastel-cream/40 dark:bg-white/5 border border-amber-200/50 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs font-extrabold flex-wrap">
                  <span className="text-slate-600 dark:text-slate-300">From: <strong className="text-pastel-darkText dark:text-white">{originName}</strong></span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-600 dark:text-pastel-yellow shrink-0" />
                  <span className="text-brand-800 dark:text-pastel-yellow">To: <strong className="text-pastel-darkText dark:text-white">{destinationName}</strong></span>
                </div>

                {nextStopName && (
                  <div className="text-xs font-bold text-brand-700 dark:text-pastel-softTeal">
                    Next Stop: <span className="font-extrabold text-pastel-darkText dark:text-white underline">{nextStopName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* =========================================================================
                VIEW TAB CONTENT (OVERVIEW, MAP, TIMELINE)
                ========================================================================= */}
            {/* If in TIMELINE tab: Show full Station Progression Timeline */}
            {activeNavTab === 'TIMELINE' ? (
              <WhereIsMyBusTracker
                busNumber={resolvedBusLocation?.busNumber || selectedBus?.busNumber || 'BUS'}
                route={selectedBus?.route || null}
                liveLocation={liveLocation || busData?.location || busData?.liveLocation || null}
                studentBoardingPoint={boardingPoint || null}
                college={user?.college || null}
                tripType={tripType}
                destinationName={destinationName}
                destinationLat={destinationLat}
                destinationLng={destinationLng}
                displayDistance={displayDistance}
                displayEta={displayEta}
                onSwitchToMap={() => setActiveNavTab('MAP')}
              />
            ) : activeNavTab === 'MAP' ? (
              /* If in MAP tab: Show full prominent interactive Leaflet map */
              <div className="water-glass rounded-3xl sm:rounded-4xl p-3 sm:p-5 shadow-glass space-y-3">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-wider text-pastel-darkText dark:text-white">
                      Live GPS Vector Map
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-brand-700 dark:text-pastel-yellow font-bold">
                    {new Date(liveLocation?.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>

                <div className="h-[460px] sm:h-[550px] rounded-3xl overflow-hidden shadow-inner border border-black/5 dark:border-white/10">
                  <BusMap
                    busLocation={resolvedBusLocation}
                    boardingPoint={boardingPoint || null}
                    userLiveLocation={userLiveGps}
                    customDestination={
                      destinationLat && destinationLng
                        ? {
                            name: selectedBus?.route?.destination || 'Destination',
                            latitude: destinationLat,
                            longitude: destinationLng,
                            isTerminus: true,
                          }
                        : null
                    }
                    college={user?.college || null}
                    routeStops={selectedBus?.route?.boardingPoints || []}
                    onRoadRouteCalculated={(data: any) => setRoadNavData(data)}
                    show2kmCircle={true}
                  />
                </div>
              </div>
            ) : (
              /* If in OVERVIEW (Default) tab: Show Map Preview + Station Timeline side-by-side or stacked */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left/Main Column: Live Map Preview */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="water-glass rounded-3xl sm:rounded-4xl p-3 sm:p-5 shadow-glass space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-black uppercase tracking-wider text-pastel-darkText dark:text-white">
                          Live Map Radar
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveNavTab('MAP')}
                        className="text-xs font-extrabold text-brand-700 dark:text-pastel-yellow underline hover:opacity-80"
                      >
                        Fullscreen Map ↗
                      </button>
                    </div>

                    <div className="h-[340px] sm:h-[400px] rounded-3xl overflow-hidden shadow-inner border border-black/5 dark:border-white/10">
                      <BusMap
                        busLocation={resolvedBusLocation}
                        boardingPoint={boardingPoint || null}
                        userLiveLocation={userLiveGps}
                        customDestination={
                          destinationLat && destinationLng
                            ? {
                                name: selectedBus?.route?.destination || 'Destination',
                                latitude: destinationLat,
                                longitude: destinationLng,
                                isTerminus: true,
                              }
                            : null
                        }
                        college={user?.college || null}
                        routeStops={selectedBus?.route?.boardingPoints || []}
                        onRoadRouteCalculated={(data: any) => setRoadNavData(data)}
                        show2kmCircle={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Station Progression Snippet */}
                <div className="space-y-4">
                  <WhereIsMyBusTracker
                    busNumber={resolvedBusLocation?.busNumber || selectedBus?.busNumber || 'BUS'}
                    route={selectedBus?.route || null}
                    liveLocation={liveLocation || busData?.location || busData?.liveLocation || null}
                    studentBoardingPoint={boardingPoint || null}
                    college={user?.college || null}
                    tripType={tripType}
                    destinationName={destinationName}
                    destinationLat={destinationLat}
                    destinationLng={destinationLng}
                    displayDistance={displayDistance}
                    displayEta={displayEta}
                    onSwitchToMap={() => setActiveNavTab('MAP')}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* =========================================================================
          4. FLOATING BOTTOM NAVIGATION (Mobile/Tablet Friendly Dock)
          ========================================================================= */}
      <FloatingBottomNav
        activeTab={activeNavTab}
        onTabChange={(tab) => {
          if (tab === 'PROFILE') {
            setShowProfileModal(true);
          } else {
            setActiveNavTab(tab);
          }
        }}
        isLive={isLiveState}
      />

      {/* Volunteer Modal */}
      {showVolunteerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="water-glass rounded-3xl sm:rounded-4xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-500 animate-pulse" />
                <h3 className="text-lg font-black text-pastel-darkText dark:text-white">Volunteer GPS Stream</h3>
              </div>
              <button onClick={() => setShowVolunteerModal(false)} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs subtext-muted leading-relaxed">
              Are you currently on board <strong>Bus #{selectedBus?.busNumber}</strong>? You can broadcast live GPS coordinates from your smartphone so classmates can track the bus even if the driver's phone is discharged or offline.
            </p>
            {volunteerMsg && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs font-bold border border-amber-300">
                {volunteerMsg}
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsVolunteerMode(!isVolunteerMode);
                  setShowVolunteerModal(false);
                }}
                className={isVolunteerMode ? 'btn-pill-primary w-full' : 'btn-pill-yellow w-full'}
              >
                {isVolunteerMode ? 'Stop Volunteering' : 'Start Live Broadcasting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
