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
  Map as MapViewIcon,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [busData, setBusData] = useState<any>(null);
  const [liveLocation, setLiveLocation] = useState<BusLocationUpdate | any | null>(null);
  const [activeAlert, setActiveAlert] = useState<ProximityAlertPayload | null>(null);
  const [busSearch, setBusSearch] = useState<string>('');
  const [roadNavData, setRoadNavData] = useState<RouteNavigationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [updatingLocation, setUpdatingLocation] = useState<boolean>(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string>('');

  // Real-time Live Device GPS of the Student
  const [userLiveGps, setUserLiveGps] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);

  // Dynamic Navigation Phase ('BOARDING_POINT' vs 'COLLEGE')
  const [navigationTarget, setNavigationTarget] = useState<'BOARDING_POINT' | 'COLLEGE'>('BOARDING_POINT');
  const [hasManuallyToggled, setHasManuallyToggled] = useState<boolean>(false);
  const autoSwitchedRef = useRef<boolean>(false);

  // Active View Mode: 'SPLIT' (Map + Timeline) | 'MAP' (Map Focus) | 'TIMELINE' (Where Is My Train Station Radar)
  const [viewMode, setViewMode] = useState<'SPLIT' | 'MAP' | 'TIMELINE'>('SPLIT');

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

  // Helper: Check if a bus serves the student's designated boarding point
  const checkBusServesBoardingStop = (bus?: Bus | null, studentBp?: BoardingPoint | null): boolean => {
    if (!bus || !studentBp) return true;
    const stops = bus.route?.boardingPoints || [];
    if (stops.length === 0) return true;

    const bpName = (studentBp.name || '').toLowerCase().trim();
    const bpLat = studentBp.latitude;
    const bpLng = studentBp.longitude;

    return stops.some((s) => {
      if (s.id && studentBp.id && s.id === studentBp.id) return true;

      const sName = (s.name || '').toLowerCase().trim();
      if (sName && bpName) {
        if (sName === bpName || sName.includes(bpName) || bpName.includes(sName)) return true;
        const sWords = sName.split(/[\s,/-]+/);
        const bpWords = bpName.split(/[\s,/-]+/);
        if (sWords.some((w) => w.length >= 4 && bpWords.includes(w))) return true;
      }

      if (bpLat && bpLng && s.latitude && s.longitude) {
        // Approximate Haversine in meters
        const R = 6371e3;
        const φ1 = (bpLat * Math.PI) / 180;
        const φ2 = (s.latitude * Math.PI) / 180;
        const Δφ = ((s.latitude - bpLat) * Math.PI) / 180;
        const Δλ = ((s.longitude - bpLng) * Math.PI) / 180;
        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (R * c <= 900) return true;
      }
      return false;
    });
  };

  const selectedBus = useMemo(
    () => buses.find((b) => b.id === selectedBusId) || buses[0] || null,
    [buses, selectedBusId]
  );

  // Check whether the currently selected bus serves the student's stop
  const isBusServingStudentStop = useMemo(
    () => checkBusServesBoardingStop(selectedBus, boardingPoint),
    [selectedBus, boardingPoint]
  );

  // Find all buses in the fleet that DO pass through this student's boarding point
  const preferredBuses = useMemo(
    () => buses.filter((b) => checkBusServesBoardingStop(b, boardingPoint)),
    [buses, boardingPoint]
  );

  // 1. Continuous Watch for Student's Own Live Hardware GPS (Real-time GNSS)
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
        console.warn('Student continuous GPS watcher warning:', err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);


  // 2. Fetch all available buses in college & select student's matching bus by default
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        setLoading(true);
        const res = await studentApi.getBuses();
        if (res.data.success && res.data.buses.length > 0) {
          setBuses(res.data.buses);
          if (!selectedBusId) {
            // Pick a bus that serves the student's boarding stop first
            const matchingBus = res.data.buses.find((b: Bus) =>
              checkBusServesBoardingStop(b, boardingPoint)
            );
            setSelectedBusId(matchingBus ? matchingBus.id : res.data.buses[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load buses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBuses();
  }, [boardingPoint]);

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

  // 4. Socket.IO Real-time Subscriptions with Payload Handling
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
      // Handle both raw payload and nested location structure
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

  // Volunteer GPS Continuous Broadcast Watcher
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

  // 5. Intelligent Dual-Phase Real Road Route Switching
  // Route distance is strictly calculated between Bus and Saved Boarding Stop (not user live device)
  const busLat = liveLocation?.latitude || busData?.location?.latitude || busData?.liveLocation?.latitude;
  const busLng = liveLocation?.longitude || busData?.location?.longitude || busData?.liveLocation?.longitude;
  const bpLat = boardingPoint?.latitude;
  const bpLng = boardingPoint?.longitude;

  const distanceBusToBoardingMeters = useMemo(() => {
    if (!isBusServingStudentStop || !busLat || !busLng || !bpLat || !bpLng) return null;
    const R = 6371e3; // metres
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

  // Check if student device is near boarding stop (<= 450m)
  const isStudentAtBoarding = useMemo(() => {
    if (!userLiveGps || !bpLat || !bpLng) return true;
    const R = 6371e3;
    const φ1 = (userLiveGps.latitude * Math.PI) / 180;
    const φ2 = (bpLat * Math.PI) / 180;
    const Δφ = ((bpLat - userLiveGps.latitude) * Math.PI) / 180;
    const Δλ = ((bpLng - userLiveGps.longitude) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c <= 450;
  }, [userLiveGps, bpLat, bpLng]);

  // When bus arrives at boarding stop (<= 350m), auto-switch road route to College!
  useEffect(() => {
    if (!hasManuallyToggled && distanceBusToBoardingMeters !== null && distanceBusToBoardingMeters <= 350 && !autoSwitchedRef.current) {
      autoSwitchedRef.current = true;
      setNavigationTarget('COLLEGE');
      setLocationSuccessMsg(
        isStudentAtBoarding
          ? '🚌 Bus reached your boarding stop! Route navigation now switched towards College Campus.'
          : '🚌 Bus reached the boarding stop! Switched tracking towards College Campus.'
      );
      setTimeout(() => setLocationSuccessMsg(''), 7000);
    }
  }, [distanceBusToBoardingMeters, hasManuallyToggled, isStudentAtBoarding]);

  // 6. Sync Boarding Point to Current Device Live High-Precision GPS Lock
  const saveBoardingLocation = async (coords: { latitude: number; longitude: number; accuracy: number }) => {
    try {
      const existingName = student?.boardingPoint?.name;
      const targetName = existingName && !existingName.includes('My Live Location')
        ? existingName
        : 'Himaja Boys Hostel, Gudlavalleru';

      const res = await studentApi.updateBoardingPoint({
        name: targetName,
        latitude: Number(coords.latitude.toFixed(6)),
        longitude: Number(coords.longitude.toFixed(6)),
      });

      if (res.data.success) {
        await refreshUser();
        setLocationSuccessMsg(`📍 Boarding point synced to your high-precision GPS (±${Math.round(coords.accuracy)}m)!`);
        if (selectedBusId) {
          fetchBusStatus(selectedBusId);
        }
        setTimeout(() => setLocationSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Failed to update boarding point:', err);
      alert('Failed to update boarding point coordinates.');
    } finally {
      setUpdatingLocation(false);
    }
  };


  const handleSyncLiveLocationAsBoarding = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setUpdatingLocation(true);
    setLocationSuccessMsg('');

    let bestFix: { latitude: number; longitude: number; accuracy: number } | null = null;
    let samples = 0;
    let isFinished = false;

    const finishWithFix = async (fix: { latitude: number; longitude: number; accuracy: number } | null) => {
      if (isFinished) return;
      isFinished = true;
      if (fix) {
        setUserLiveGps(fix);
        await saveBoardingLocation(fix);
      } else {
        setUpdatingLocation(false);
        alert('Could not acquire device GPS. Please verify location permissions.');
      }
    };

    const warmUpWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        samples++;
        const acc = pos.coords.accuracy || 50;
        if (!bestFix || acc < bestFix.accuracy) {
          bestFix = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: acc,
          };
          setUserLiveGps(bestFix);
        }

        if (acc <= 10 || samples >= 4) {
          navigator.geolocation.clearWatch(warmUpWatchId);
          finishWithFix(bestFix);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );

    setTimeout(() => {
      navigator.geolocation.clearWatch(warmUpWatchId);
      finishWithFix(bestFix);
    }, 2800);
  };

  const filteredBuses = useMemo(() => {
    if (!busSearch) return buses;
    return buses.filter(
      (b) =>
        b.busNumber.toLowerCase().includes(busSearch.toLowerCase()) ||
        (b.route && b.route.name.toLowerCase().includes(busSearch.toLowerCase()))
    );
  }, [buses, busSearch]);

  const isLiveState =
    liveLocation !== null ||
    busData?.status === 'LIVE' ||
    busData?.status === 'APPROACHING' ||
    busData?.status === 'NEARBY' ||
    busData?.active === true;

  const displayDistance =
    roadNavData?.formattedDistance || busData?.distance?.formatted || '---';

  const displayEta =
    roadNavData?.estimatedMinutes || busData?.distance?.estimatedMinutes || 0;

  // Dynamic Trip Type and Smart Trip Metadata
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

  const routeBoardingPoints = selectedBus?.route?.boardingPoints || (isBusServingStudentStop && student?.boardingPoint ? [student.boardingPoint] : []);
  const villageStops = routeBoardingPoints.filter(
    (s) =>
      !s.name.toLowerCase().includes('college') &&
      !s.name.toLowerCase().includes('campus') &&
      !s.name.toLowerCase().includes('gate')
  );
  const lastVillageStop = villageStops.length > 0 ? villageStops[villageStops.length - 1] : (routeBoardingPoints.length > 0 ? routeBoardingPoints[routeBoardingPoints.length - 1] : null);

  const destinationName =
    (isReturnTrip && liveLocation?.destinationName && !liveLocation.destinationName.toLowerCase().includes('college') && !liveLocation.destinationName.toLowerCase().includes('gate') && !liveLocation.destinationName.toLowerCase().includes('final depot'))
      ? liveLocation.destinationName
      : (activeTrip?.destinationName && !activeTrip.destinationName.toLowerCase().includes('college') && !activeTrip.destinationName.toLowerCase().includes('final depot'))
      ? activeTrip.destinationName
      : (isReturnTrip
          ? (lastVillageStop ? `${lastVillageStop.name} (Terminus)` : (isBusServingStudentStop && student?.boardingPoint?.name ? `${student.boardingPoint.name} (Terminus)` : 'Route Terminus'))
          : (user?.college?.name ? `${user.college.name} Gate` : 'SRGEC College Gate'));

  const isCoordInAP = (lat?: number, lng?: number) => {
    return lat !== undefined && lng !== undefined && lat >= 13.0 && lat <= 19.5 && lng >= 76.5 && lng <= 85.0;
  };

  const rawDestLat =
    (isReturnTrip && liveLocation?.destinationLat && Math.abs(liveLocation.destinationLat - (user?.college?.latitude || 16.35068)) > 0.005)
      ? liveLocation.destinationLat
      : (activeTrip?.destinationLat && Math.abs(activeTrip.destinationLat - (user?.college?.latitude || 16.35068)) > 0.005)
      ? activeTrip.destinationLat
      : (isReturnTrip
          ? (lastVillageStop?.latitude || (isBusServingStudentStop ? student?.boardingPoint?.latitude : null) || 16.431025)
          : (user?.college?.latitude || 16.35068));

  const rawDestLng =
    (isReturnTrip && liveLocation?.destinationLng && Math.abs(liveLocation.destinationLng - (user?.college?.longitude || 81.04273)) > 0.005)
      ? liveLocation.destinationLng
      : (activeTrip?.destinationLng && Math.abs(activeTrip.destinationLng - (user?.college?.longitude || 81.04273)) > 0.005)
      ? activeTrip.destinationLng
      : (isReturnTrip
          ? (lastVillageStop?.longitude || (isBusServingStudentStop ? student?.boardingPoint?.longitude : null) || 80.997348)
          : (user?.college?.longitude || 81.04273));

  const destinationLat = isCoordInAP(rawDestLat, rawDestLng) ? rawDestLat : (user?.college?.latitude || 16.35068);
  const destinationLng = isCoordInAP(rawDestLat, rawDestLng) ? rawDestLng : (user?.college?.longitude || 81.04273);

  const nextStopName = liveLocation?.nextStopName || busData?.nextStopName || null;
  const destinationDistance = liveLocation?.destinationDistance || busData?.destinationDistance || null;

  const getStatusBadge = (status?: string) => {
    if (isLiveState) {
      if (navigationTarget === 'COLLEGE') {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-400/50 animate-pulse shadow-sm">
            {isReturnTrip ? <MapPin className="w-3.5 h-3.5" /> : <School className="w-3.5 h-3.5" />}
            {isReturnTrip ? 'EN ROUTE TO TERMINUS' : 'EN ROUTE TO COLLEGE'}
          </span>
        );
      }
      if (status === 'APPROACHING') {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50 animate-pulse shadow-sm">
            <Radio className="w-3.5 h-3.5" />
            APPROACHING (&le; 2 KM)
          </span>
        );
      }
      if (status === 'NEARBY') {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50 shadow-sm">
            <Radio className="w-3.5 h-3.5" />
            BUS NEARBY (&le; 500M)
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping"></span>
          {isReturnTrip ? 'RETURN TRIP ACTIVE' : 'MORNING TRIP ACTIVE'}
        </span>
      );
    }

    if (status === 'LOCATION_DELAYED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-400/50">
          <AlertTriangle className="w-3.5 h-3.5" />
          LOCATION DELAYED
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800/90 dark:text-slate-400 dark:border-slate-700">
        ⚪ OFFLINE / NOT ON TRIP
      </span>
    );
  };


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
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      {/* Arrival / Trip Completed Celebration Toast */}
      {arrivalAlert && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border-2 border-emerald-400 text-emerald-100 flex items-center justify-between shadow-2xl backdrop-blur-xl animate-bounce">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 text-xl font-bold">
                {arrivalAlert.type === 'BUS_ARRIVED' ? '🎓' : '🏁'}
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 block">
                  {arrivalAlert.type === 'BUS_ARRIVED' ? 'College Gate Arrival Recorded' : 'Return Trip Completed'}
                </span>
                <p className="text-sm font-bold text-white mt-0.5">{arrivalAlert.message}</p>
                {arrivalAlert.status && (
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-black rounded-md ${
                    arrivalAlert.status === 'ON_TIME' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {arrivalAlert.status} {arrivalAlert.delayMinutes ? `(+${arrivalAlert.delayMinutes}m delay)` : ''}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setArrivalAlert(null)}
              className="p-2 text-emerald-300 hover:text-white rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Proximity Alert Toast */}
      {activeAlert && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50 text-amber-200 flex items-center justify-between shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/30 flex items-center justify-center text-amber-300 shrink-0 animate-pulse">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                  Bus Approaching (&le; 2 KM)
                </span>
                <p className="text-sm font-bold text-white mt-0.5">{activeAlert.message}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveAlert(null)}
              className="p-2 text-amber-300 hover:text-white rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <StudentProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileUpdated={async () => {
          await refreshUser();
          if (selectedBusId) {
            fetchBusStatus(selectedBusId);
          }
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Instant Bus Search & Fast Switcher Bar (iPhone Water Glass) */}
        <div className="water-glass p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Quick Title & Boarding Info */}
            <div className="flex items-center gap-3.5 w-full md:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/25 to-blue-600/35 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 shadow-lg shadow-cyan-500/20">
                <BusIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight drop-shadow-sm">Live College Bus Radar</h2>
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  <span>Your Stop:</span>
                  <span className="text-cyan-300 font-bold">
                    {boardingPoint?.name || 'Not Configured'}
                  </span>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="text-cyan-300 hover:text-cyan-200 underline font-semibold ml-1"
                  >
                    (Change)
                  </button>
                </div>
              </div>
            </div>

            {/* Bus Search Box */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <input
                  type="text"
                  value={busSearch}
                  onChange={(e) => setBusSearch(e.target.value)}
                  placeholder="🔍 Search Bus Number (e.g. 1234, 5678)..."
                  className="w-full water-glass-input text-white rounded-xl px-4 py-2.5 pl-10 text-sm font-semibold focus:outline-none placeholder:text-slate-400"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>

              <button
                type="button"
                onClick={() => setShowVolunteerModal(true)}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shrink-0 border ${
                  isVolunteerMode
                    ? 'bg-amber-600 text-white animate-pulse border-amber-400 shadow-amber-500/25'
                    : 'bg-white/90 dark:bg-slate-800/90 text-amber-700 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-750 border-amber-400/40'
                }`}
                title="Volunteer on-board GPS broadcast"
              >
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isVolunteerMode ? 'VOLUNTEERING' : 'VOLUNTEER'}</span>
              </button>

              <button
                onClick={() => fetchBusStatus(selectedBusId)}
                className="p-2.5 water-glass hover:bg-slate-700/80 text-cyan-200 border border-white/15 rounded-xl transition-colors shrink-0 shadow-md"
                title="Refresh Live GPS"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Bus Selection Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider shrink-0 mr-1">
              Buses:
            </span>
            {filteredBuses.map((b) => {
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
                  onClick={() => setSelectedBusId(b.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/30'
                      : isServesMyStop
                      ? 'bg-blue-950/40 border-blue-500/40 text-cyan-200 hover:bg-blue-900/50'
                      : 'chip-inactive opacity-80'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                    }`}
                  ></span>
                  <span>{b.busNumber}</span>
                  {isServesMyStop ? (
                    <span className="text-[9px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded font-black">
                      Your Stop
                    </span>
                  ) : b.route ? (
                    <span className="text-[10px] opacity-75 font-normal">
                      ({b.route.name.split('-')[0].trim()})
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Off-Route Notice & Recommended Buses Suggestion Banner */}
        {!isBusServingStudentStop && boardingPoint && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-slate-900/80 border-2 border-amber-500/50 text-amber-200 shadow-2xl space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/25 border border-amber-400/40 text-amber-300 flex items-center justify-center text-2xl shrink-0 font-bold shadow-md">
                ⚠️
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                    Off-Route Notice
                  </span>
                  <span className="text-xs text-slate-300 font-bold">
                    Bus #{selectedBus?.busNumber} &bull; Route: <strong className="text-white font-extrabold">{selectedBus?.route?.name || 'Different Route'}</strong>
                  </span>
                </div>
                <p className="text-sm font-bold text-white mt-1.5 leading-snug">
                  Bus <span className="text-amber-300 font-extrabold">#{selectedBus?.busNumber}</span> does <span className="text-rose-400 underline uppercase font-black">not</span> travel via your boarding stop (<strong className="text-cyan-300">{boardingPoint.name}</strong>).
                </p>
              </div>
            </div>

            {preferredBuses.length > 0 && (
              <div className="pt-3 border-t border-amber-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                  <span>👉 Recommended buses that serve <strong className="text-white underline">{boardingPoint.name}</strong>:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {preferredBuses.map((pb) => (
                    <button
                      key={pb.id}
                      type="button"
                      onClick={() => setSelectedBusId(pb.id)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition-all transform active:scale-95"
                    >
                      <span>🚌 Switch to Bus {pb.busNumber}</span>
                      {((pb as any).status === 'LIVE' || pb.status === 'ACTIVE') && (
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback toast */}
        {locationSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{locationSuccessMsg}</span>
          </div>
        )}

        {/* Smart Trip Direction Banner */}
        {isLiveState && (
          <div className={`p-4 rounded-3xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isReturnTrip
              ? 'bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/50 border-purple-500/40'
              : 'bg-gradient-to-r from-amber-900/40 via-yellow-900/40 to-slate-900/50 border-amber-500/40'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                isReturnTrip ? 'bg-purple-500/30 text-purple-200' : 'bg-amber-500/30 text-amber-200'
              }`}>
                {isReturnTrip ? '🌆' : '🌅'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isReturnTrip ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {isReturnTrip ? 'Evening Return Trip' : 'Morning College Trip'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Auto-Geofence: &le;100m
                  </span>
                </div>
                <div className="text-sm font-extrabold text-white mt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-300">{originName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-cyan-300">{destinationName}</span>
                </div>
              </div>
            </div>

            {nextStopName && (
              <div className="px-3.5 py-2 rounded-2xl bg-white/10 dark:bg-slate-900/70 border border-white/15 text-xs flex items-center gap-2 shrink-0">
                <span className="text-slate-300 font-medium">Next Stop:</span>
                <span className="font-bold text-white text-cyan-300">{nextStopName}</span>
              </div>
            )}
          </div>
        )}

        {/* Modern 3-Way View Switcher (Split Radar / Map Focus / Station Timeline) */}
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-white/50 dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={() => setViewMode('SPLIT')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                viewMode === 'SPLIT'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25 border border-cyan-400/40'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Split Radar</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('MAP')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                viewMode === 'MAP'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25 border border-cyan-400/40'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5'
              }`}
            >
              <MapViewIcon className="w-4 h-4" />
              <span>Map Focus</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('TIMELINE')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                viewMode === 'TIMELINE'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-amber-500/25 border border-amber-400/40'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5'
              }`}
            >
              <span className="text-sm">🚉</span>
              <span>Station Timeline</span>
            </button>
          </div>
        </div>

        {/* View Mode: TIMELINE ONLY ("Where Is My Train" Radar) */}
        {viewMode === 'TIMELINE' && (
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
            onSwitchToMap={() => setViewMode('MAP')}
          />
        )}

        {/* View Mode: MAP ONLY or SPLIT VIEW */}
        {(viewMode === 'SPLIT' || viewMode === 'MAP') && (
          <div className={`grid grid-cols-1 ${viewMode === 'SPLIT' ? 'lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
            {/* Main Column: Live Interactive Map with Real Road Routing */}
            <div className={`order-1 ${viewMode === 'SPLIT' ? 'lg:order-2 lg:col-span-2' : ''}`}>
              <div className="water-glass rounded-3xl p-3 sm:p-5 shadow-2xl h-full flex flex-col relative">
                <div className="flex items-center justify-between mb-2.5 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      Live GPS Radar & Satellite Map
                    </span>
                  </div>
                  {resolvedBusLocation && (
                    <span className="text-[11px] text-cyan-300 font-mono font-bold">
                      {new Date(liveLocation?.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Mobile Quick-Stats Overlay Card (Shows on mobile above map) */}
                <div className="lg:hidden mb-2.5 p-3 rounded-2xl bg-slate-900/80 border border-white/15 backdrop-blur-xl flex items-center justify-between gap-2 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-cyan-300 shrink-0 font-black text-xs">
                      {resolvedBusLocation?.busNumber || selectedBus?.busNumber || 'BUS'}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{displayDistance}</span>
                        {displayEta > 0 && <span className="text-cyan-300 font-bold">(~{displayEta}m)</span>}
                      </div>
                      <div className="text-[10px] subtext-muted font-bold">
                        {navigationTarget === 'COLLEGE'
                          ? (isReturnTrip ? `To ${destinationName}` : 'To SRGEC Campus')
                          : (isReturnTrip ? 'To Drop-off Stop' : 'To Boarding Stop')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNavigationTarget(navigationTarget === 'BOARDING_POINT' ? 'COLLEGE' : 'BOARDING_POINT');
                        setHasManuallyToggled(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black tracking-wide shadow-sm flex items-center gap-1 transition-transform active:scale-95"
                    >
                      <Repeat className="w-3 h-3" />
                      <span>Switch</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-[380px] sm:min-h-[460px] lg:min-h-[520px] rounded-2xl overflow-hidden relative">
                  <BusMap
                    busLocation={resolvedBusLocation}
                    boardingPoint={
                      isBusServingStudentStop && boardingPoint
                        ? {
                            name: boardingPoint.name,
                            latitude: boardingPoint.latitude,
                            longitude: boardingPoint.longitude,
                          }
                        : null
                    }
                    userLiveLocation={userLiveGps}
                    college={user?.college || null}
                    customDestination={
                      destinationLat && destinationLng
                        ? {
                            name: destinationName,
                            latitude: destinationLat,
                            longitude: destinationLng,
                            isTerminus: isReturnTrip,
                          }
                        : null
                    }
                    destinationTarget={
                      !isBusServingStudentStop
                        ? (isReturnTrip ? 'TRIP_DESTINATION' : 'COLLEGE')
                        : (navigationTarget === 'COLLEGE'
                            ? (isReturnTrip ? 'TRIP_DESTINATION' : 'COLLEGE')
                            : 'BOARDING_POINT')
                    }
                    routeStops={selectedBus?.route?.boardingPoints || []}
                    onRoadRouteCalculated={(nav) => setRoadNavData(nav)}
                    className="h-[380px] sm:h-[460px] lg:h-[520px] w-full"
                    zoom={14}
                    show2kmCircle={isBusServingStudentStop && navigationTarget === 'BOARDING_POINT'}
                  />
                </div>
              </div>
            </div>

            {/* Secondary Column: Uber-Style Status Card & Telemetry Details */}
            <div className={`order-2 ${viewMode === 'SPLIT' ? 'lg:order-1' : ''} space-y-6`}>
              {/* Primary Live Distance Card */}
              <div className="water-glass rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider subtext-muted">
                      Tracked Bus
                    </span>
                    <h3 className="text-2xl font-black mt-0.5 drop-shadow-sm card-title">
                      {resolvedBusLocation?.busNumber || selectedBus?.busNumber || busData?.busNumber || '---'}
                    </h3>
                  </div>
                  <div>{getStatusBadge(busData?.status)}</div>
                </div>

                {/* Interactive Route Phase Switcher */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNavigationTarget('BOARDING_POINT');
                      setHasManuallyToggled(true);
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all border shadow-sm ${
                      navigationTarget === 'BOARDING_POINT'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/25'
                        : 'bg-white/90 dark:bg-slate-900/60 border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MapPin className={`w-4 h-4 shrink-0 ${navigationTarget === 'BOARDING_POINT' ? 'text-white' : 'text-blue-600 dark:text-cyan-400'}`} />
                    <span>{isReturnTrip ? 'To Drop-off Stop' : 'To Boarding Stop'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNavigationTarget('COLLEGE');
                      setHasManuallyToggled(true);
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all border shadow-sm ${
                      navigationTarget === 'COLLEGE'
                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-cyan-500/25'
                        : 'bg-white/90 dark:bg-slate-900/60 border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isReturnTrip ? (
                      <MapPin className={`w-4 h-4 shrink-0 ${navigationTarget === 'COLLEGE' ? 'text-white' : 'text-cyan-600 dark:text-cyan-400'}`} />
                    ) : (
                      <School className={`w-4 h-4 shrink-0 ${navigationTarget === 'COLLEGE' ? 'text-white' : 'text-cyan-600 dark:text-cyan-400'}`} />
                    )}
                    <span>{isReturnTrip ? 'To Final Destination' : 'En Route to College'}</span>
                  </button>
                </div>

                {/* Huge Distance Metric */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300 flex items-center gap-1.5">
                    <RouteIcon className="w-4 h-4" />
                    {!isBusServingStudentStop
                      ? (isReturnTrip ? `Real Road Distance on Bus Route (To ${destinationName})` : 'Real Road Distance on Bus Route (To College Gate)')
                      : (navigationTarget === 'COLLEGE'
                          ? (isReturnTrip ? `Real Road Distance to ${destinationName}` : 'Real Road Distance to College Campus')
                          : (isReturnTrip ? 'Real Road Distance to Your Drop-off Stop' : 'Real Road Distance to Your Pickup Stop'))}
                  </span>

                  {isLiveState ? (
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tight hero-gradient-text drop-shadow-md">
                        {displayDistance}
                      </span>
                      {displayEta > 0 && (
                        <span className="text-xs font-bold subtext-muted">
                          (~{displayEta} mins driving time)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs font-semibold subtext-muted">
                      {busData?.message || `Bus ${selectedBus?.busNumber || ''} is currently not on an active trip.`}
                    </div>
                  )}
                </div>

                {/* Boarding Point Info with Live GPS Sync Button */}
                <div className="mt-6 p-4 rounded-2xl bg-cyan-50/90 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-400/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-300 font-extrabold text-xs uppercase tracking-wider">
                      <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      Your Boarding Point
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSyncLiveLocationAsBoarding}
                        disabled={updatingLocation}
                        className="text-xs font-black bg-cyan-600 text-white hover:bg-cyan-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Sync current device coordinates"
                      >
                        <Crosshair className="w-3.5 h-3.5 animate-pulse" />
                        {updatingLocation ? 'Detecting...' : 'Live GPS'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowProfileModal(true)}
                        className="text-xs font-bold bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/15 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {boardingPoint?.name || 'Not Configured'}
                  </div>

                  {boardingPoint && (
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-mono font-bold">
                      GPS: {boardingPoint.latitude.toFixed(4)}, {boardingPoint.longitude.toFixed(4)}
                    </div>
                  )}
                </div>

                {/* Live Student Device Indicator */}
                {userLiveGps && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
                      <span className="text-cyan-300 font-bold">Your Device GPS Active</span>
                    </div>
                    <span className="text-slate-300 font-mono">
                      &plusmn;{Math.round(userLiveGps.accuracy)}m
                    </span>
                  </div>
                )}

                {/* Driver & Telemetry Info */}
                {isLiveState && (
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10">
                      <span className="text-slate-300 block font-medium">Live Speed</span>
                      <span className="text-white font-black text-base mt-0.5 block">
                        {Math.round(resolvedBusLocation?.speed || 0)} km/h
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10">
                      <span className="text-slate-300 block font-medium">GPS Accuracy</span>
                      <span className="text-cyan-300 font-black text-base mt-0.5 block">
                        &plusmn;{Math.round(resolvedBusLocation?.accuracy || 5)} m
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Mode: SPLIT VIEW Station Progression Timeline under map */}
        {viewMode === 'SPLIT' && (
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
            onSwitchToMap={() => setViewMode('MAP')}
          />
        )}
      </main>

      {/* Volunteer Mode Modal */}
      {showVolunteerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="water-glass max-w-md w-full p-6 sm:p-7 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-white/20 space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xl shadow-inner">
                  📡
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Volunteer GPS Broadcast</h3>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">On-Board Emergency Backup</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVolunteerModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
              Are you currently riding inside <strong className="text-slate-900 dark:text-white">Bus {selectedBus?.busNumber}</strong>?
              If the driver's phone is offline or battery died, you can broadcast your live smartphone GPS to keep the bus visible for all students and admins.
            </p>

            {volunteerMsg && (
              <div className="p-3.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{volunteerMsg}</span>
              </div>
            )}

            {isVolunteerMode && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border-2 border-emerald-500/50 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Broadcasting Live Bus GPS
                  </span>
                  <span className="text-xs font-mono text-slate-800 dark:text-slate-200 font-black">
                    Updates: #{volunteerUpdateCount}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-normal">
                  Driver-priority active: If the driver's phone connects, driver GPS automatically takes precedence with a single bus marker.
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2.5">
              {!isVolunteerMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsVolunteerMode(true);
                    setVolunteerMsg('');
                  }}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>START BROADCASTING</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsVolunteerMode(false);
                    setVolunteerMsg('');
                  }}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl shadow-red-600/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>STOP BROADCASTING</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowVolunteerModal(false)}
                className="px-4 py-3.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-300 dark:hover:text-white font-extrabold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
