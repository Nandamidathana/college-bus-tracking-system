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
  const [activeNavTab, setActiveNavTab] = useState<StudentNavTab>('HOME');
  const [routeSearch, setRouteSearch] = useState<string>('');
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

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

  // Aggregated list of routes for the Routes screen
  const routesList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; routeNumber: string; destination?: string; buses: Bus[]; stops: BoardingPoint[] }>();
    buses.forEach((b) => {
      if (b.route) {
        const existing: { id: string; name: string; routeNumber: string; destination?: string; buses: Bus[]; stops: BoardingPoint[] } = map.get(b.route.id) || {
          id: b.route.id,
          name: b.route.name,
          routeNumber: b.route.routeNumber || '',
          destination: (b.route as any).destination || '',
          buses: [],
          stops: b.route.boardingPoints || [],
        };
        if (!existing.buses.some((item) => item.id === b.id)) {
          existing.buses.push(b);
        }
        map.set(b.route.id, existing);
      }
    });

    if (student?.route && !map.has(student.route.id)) {
      map.set(student.route.id, {
        id: student.route.id,
        name: student.route.name,
        routeNumber: student.route.routeNumber || '',
        destination: (student.route as any).destination || '',
        buses: buses.filter((b) => b.routeId === student.route?.id),
        stops: student.route.boardingPoints || [],
      });
    }

    return Array.from(map.values());
  }, [buses, student?.route]);

  const filteredRoutes = useMemo(() => {
    if (!routeSearch.trim()) return routesList;
    const q = routeSearch.toLowerCase();
    return routesList.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.buses.some((b) => b.busNumber.toLowerCase().includes(q)) ||
        r.stops.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [routesList, routeSearch]);

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
    <div className="min-h-screen flex flex-col relative bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      {/* Arrival Toast */}
      {arrivalAlert && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-3 w-full animate-fadeIn">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                {arrivalAlert.type === 'BUS_ARRIVED' ? <School className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  {arrivalAlert.type === 'BUS_ARRIVED' ? 'College Gate Arrival' : 'Trip Completed'}
                </span>
                <p className="text-xs sm:text-sm font-semibold">{arrivalAlert.message}</p>
              </div>
            </div>
            <button
              onClick={() => setArrivalAlert(null)}
              className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Proximity 2 KM Alert Toast */}
      {activeAlert && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-3 w-full animate-fadeIn">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
                  Bus Approaching (Within 2 KM)
                </span>
                <p className="text-xs sm:text-sm font-semibold">{activeAlert.message}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveAlert(null)}
              className="p-1.5 rounded-lg text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
              aria-label="Dismiss proximity alert"
            >
              <X className="w-4 h-4" />
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

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-4 space-y-4 pb-24 sm:pb-16">
        {/* TAB 1: HOME */}
        {activeNavTab === 'HOME' && (
          <div className="space-y-4 animate-fadeIn">
            {/* 1. Compact Header */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white block leading-tight">
                    College Bus Live
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {user?.college?.code || 'SRGEC'} Campus Transit
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowVolunteerModal(true)}
                  className={`p-2 rounded-lg border transition-colors ${
                    isVolunteerMode
                      ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Volunteer GPS Broadcast"
                  aria-label="Volunteer GPS Broadcast"
                >
                  <Radio className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs hover:bg-blue-700 transition-colors"
                  title="Profile & Settings"
                  aria-label="Profile and Settings"
                >
                  {user?.name ? user.name[0].toUpperCase() : 'S'}
                </button>
              </div>
            </div>

            {/* 2. Greeting */}
            <div className="space-y-0.5 pt-0.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {greeting}, {user?.name || 'Student'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Roll: <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{student?.rollNumber || 'Enrolled'}</span> &bull; {user?.college?.name || 'SRGEC Campus'}
              </p>
            </div>

            {/* 3. Main Bus Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                    #{selectedBus?.busNumber || '—'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {selectedBus ? `Bus #${selectedBus.busNumber}` : 'Select a Bus'}
                      </h2>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isLiveState
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isLiveState ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {isLiveState ? 'LIVE EN ROUTE' : 'IDLE / READY'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                      Route: <span className="text-slate-800 dark:text-slate-200 font-semibold">{selectedBus?.route?.name || 'Transit Route'}</span>
                    </p>
                  </div>
                </div>

                {/* Quick Bus Selector Dropdown */}
                <select
                  value={selectedBusId}
                  onChange={(e) => {
                    setSelectedBusId(e.target.value);
                    autoSwitchedRef.current = false;
                  }}
                  className="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer max-w-[125px] sm:max-w-[160px] truncate shrink-0 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  aria-label="Switch tracked bus"
                >
                  <option value="">Switch Bus</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bus {b.busNumber} {checkBusServesBoardingStop(b, boardingPoint) ? '• Preferred' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Telemetry Row (Live ETA, Distance, Speed) */}
              {isLiveState ? (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Arrival ETA</span>
                    <span className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">~{displayEta} mins</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Distance</span>
                    <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">{displayDistance}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Speed</span>
                    <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                      {liveLocation?.speed ? Math.round(liveLocation.speed) : 0} km/h
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Driver: {selectedBus?.assignedDriver?.driverName || 'Designated Driver'}</span>
                  <span>Trip starts on schedule</span>
                </div>
              )}

              {/* Route mismatch notice if applicable */}
              {selectedBusId && !isBusServingStudentStop && boardingPoint && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>This bus does not stop at {boardingPoint.name}</span>
                  </div>
                  {preferredBuses[0] && (
                    <button
                      type="button"
                      onClick={() => setSelectedBusId(preferredBuses[0].id)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                    >
                      Switch to Bus #{preferredBuses[0].busNumber}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 4. Boarding Stop Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Boarding Stop
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate block">
                    {boardingPoint?.name || 'Not Configured'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Destination: {user?.college?.name || 'SRGEC Campus'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors shrink-0 shadow-xs"
              >
                Edit
              </button>
            </div>

            {/* 5. Small Map Preview */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Live Location Preview
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                  {isLiveState ? 'Broadcasting GPS' : 'Idle'}
                </span>
              </div>

              <div className="h-48 sm:h-56 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative">
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

              <button
                type="button"
                onClick={() => setActiveNavTab('MAP')}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <span>Track Bus on Live Map</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE MAP */}
        {activeNavTab === 'MAP' && (
          <div className="space-y-3 animate-fadeIn">
            {/* Compact Top Bar */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveNavTab('HOME')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>&larr; Home</span>
              </button>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isLiveState ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedBus ? `Bus #${selectedBus.busNumber}` : 'Live Map'} &bull; {isLiveState ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => selectedBusId && fetchBusStatus(selectedBusId)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Refresh GPS"
                aria-label="Refresh GPS"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Map Canvas with Floating Telemetry Sheet */}
            <div className="h-[calc(100vh-230px)] min-h-[460px] rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700 shadow-xs">
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

              {/* Floating Bottom Telemetry Card */}
              <div className="absolute bottom-3 left-3 right-3 z-[1000] pointer-events-auto">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Bus #{selectedBus?.busNumber || '—'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                        {selectedBus?.route?.name || 'Route'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {isLiveState ? `ETA: ~${displayEta}m` : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Speed: {liveLocation?.speed ? Math.round(liveLocation.speed) : 0} km/h</span>
                    <span>Distance: {displayDistance}</span>
                    <span>Stop: {boardingPoint?.name || 'Assigned'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ROUTES */}
        {activeNavTab === 'ROUTES' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">College Bus Routes</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Search routes and stop sequence</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  placeholder="Search route or stop..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredRoutes.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-medium">
                  No matching routes found. Try searching by village or station name.
                </div>
              ) : (
                filteredRoutes.map((r) => {
                  const isExpanded = expandedRouteId === r.id;
                  const servesMyStop = r.stops.some(
                    (s) => s.id === boardingPoint?.id || s.name.toLowerCase() === (boardingPoint?.name || '').toLowerCase()
                  );

                  return (
                    <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                              {r.name}
                            </h3>
                            {servesMyStop && (
                              <span className="text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                Serves your stop
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            {r.stops.length} Stops &bull; Destination: {r.destination || user?.college?.name || 'Campus'}
                          </p>
                        </div>

                        {/* Bus Track Button(s) */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.buses.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setSelectedBusId(b.id);
                                setActiveNavTab('HOME');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                b.id === selectedBusId
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              Track #{b.busNumber}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Expand/Collapse Stops Sequence */}
                      <button
                        type="button"
                        onClick={() => setExpandedRouteId(isExpanded ? null : r.id)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline pt-1"
                      >
                        <span>{isExpanded ? 'Hide Stop Sequence ▲' : `View ${r.stops.length} Stops Sequence ▼`}</span>
                      </button>

                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                          {r.stops.map((stop, idx) => {
                            const isStudentStop =
                              stop.id === boardingPoint?.id ||
                              stop.name.toLowerCase() === (boardingPoint?.name || '').toLowerCase();

                            return (
                              <div key={stop.id || idx} className="flex items-center gap-2.5 text-xs">
                                <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className={`font-medium ${isStudentStop ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {stop.name} {isStudentStop ? '(Your Boarding Stop)' : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MY STOP */}
        {activeNavTab === 'MY_STOP' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-5 sm:p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Assigned Boarding Stop
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      {boardingPoint?.name || 'Not Configured'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Route: {selectedBus?.route?.name || student?.route?.name || 'Campus Transit Route'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors shadow-xs"
                >
                  Edit Stop
                </button>
              </div>

              {/* Proximity 2 KM Radar Details */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    2 KM Proximity Alert Radar
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
                  When your bus arrives within 2 km of {boardingPoint?.name || 'your stop'}, automated arrival alerts trigger so you can walk to the boarding point on time.
                </p>
              </div>

              {/* Station Map Preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Station Map & 2KM Radar Radius
                </span>
                <div className="h-56 sm:h-64 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
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
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <FloatingBottomNav
        activeTab={activeNavTab}
        onTabChange={(tab) => setActiveNavTab(tab)}
        isLive={isLiveState}
      />

      {/* Volunteer Modal */}
      {showVolunteerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Volunteer GPS Stream</h3>
              </div>
              <button
                onClick={() => setShowVolunteerModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Are you currently on board <strong>Bus #{selectedBus?.busNumber}</strong>? You can broadcast live GPS coordinates from your smartphone so classmates can track the bus even if the driver's phone is discharged or offline.
            </p>
            {volunteerMsg && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-xs font-medium border border-blue-200 dark:border-blue-800">
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
                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors shadow-xs ${
                  isVolunteerMode
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
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
