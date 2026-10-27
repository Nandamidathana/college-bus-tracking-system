import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Bus, BusLocationUpdate, ProximityAlertPayload } from '../../types';
import { BusMap } from '../../components/maps/BusMap';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import {
  Bus as BusIcon,
  Bell,
  MapPin,
  Clock,
  Armchair,
  ShieldAlert,
  Share2,
  ChevronRight,
  Info,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  User,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [busData, setBusData] = useState<any>(null);
  const [liveLocation, setLiveLocation] = useState<BusLocationUpdate | any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeIncident, setActiveIncident] = useState<any | null>(null);

  // Fetch student profile, buses, notifications on mount
  useEffect(() => {
    refreshUser?.();

    // 1. Fetch Buses
    studentApi
      .getBuses()
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.buses)) {
          setBuses(res.data.buses);
          // Auto-select student's assigned bus, or the first active bus
          const assigned = res.data.buses.find(
            (b: any) =>
              b.id === user?.busId ||
              (user?.routeId && b.routeId === user?.routeId)
          );
          if (assigned) {
            setSelectedBusId(assigned.id);
          } else if (res.data.buses.length > 0) {
            setSelectedBusId(res.data.buses[0].id);
          }
        }
      })
      .catch((err) => console.warn('Buses fetch error:', err))
      .finally(() => setLoading(false));

    // 2. Fetch Notifications
    studentApi
      .getNotifications()
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.notifications)) {
          setNotifications(res.data.notifications);
          const unread = res.data.notifications.filter((n: any) => !n.readAt).length;
          setUnreadCount(unread);
        }
      })
      .catch((err) => console.warn('Notifications fetch error:', err));
  }, []);

  // Poll / Listen to selected bus live location & occupancy
  useEffect(() => {
    if (!selectedBusId) return;

    let isMounted = true;
    const fetchBusDetails = () => {
      studentApi
        .getBusDetails(selectedBusId)
        .then((res) => {
          if (isMounted && res.data.success) {
            setBusData(res.data.bus);
          }
        })
        .catch((err) => console.warn('Bus details error:', err));

      studentApi
        .getBusLiveLocation(selectedBusId)
        .then((res) => {
          if (isMounted && res.data.success) {
            setLiveLocation(res.data);
          }
        })
        .catch((err) => console.warn('Live location error:', err));
    };

    fetchBusDetails();
    const interval = setInterval(fetchBusDetails, 8000);

    // Socket listeners for real-time updates
    const socket = getSocket();
    if (socket) {
      socket.emit('bus:subscribe', { busId: selectedBusId });

      socket.on('bus:location_updated', (data: any) => {
        if (data.busId === selectedBusId) {
          setLiveLocation((prev: any) => ({ ...prev, ...data }));
        }
      });

      socket.on('bus:occupancy_updated', (data: any) => {
        if (data.busId === selectedBusId) {
          setBusData((prev: any) => prev ? { ...prev, currentOccupancy: data.currentOccupancy, occupancyStatus: data.occupancyStatus } : prev);
        }
      });

      socket.on('bus:incident:alert', (incident: any) => {
        if (incident.busId === selectedBusId) {
          setActiveIncident(incident);
        }
      });
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (socket) {
        socket.emit('bus:unsubscribe', { busId: selectedBusId });
        socket.off('bus:location_updated');
        socket.off('bus:occupancy_updated');
        socket.off('bus:incident:alert');
      }
    };
  }, [selectedBusId]);

  // Derived Bus Details
  const activeBus = useMemo(() => {
    return buses.find((b) => b.id === selectedBusId) || buses[0] || null;
  }, [buses, selectedBusId]);

  const busNumberDisplay = activeBus ? activeBus.busNumber : (user?.busNumber || 'BUS-12');
  const routeNameDisplay = activeBus?.route?.name || user?.routeName || 'Engineering Route';
  const capacity = activeBus?.capacity || 50;
  const currentOccupancy = activeBus?.currentOccupancy ?? busData?.currentOccupancy ?? 32;
  const seatsAvailable = Math.max(0, capacity - currentOccupancy);
  const occupancyPercent = Math.min(100, Math.round((currentOccupancy / capacity) * 100));

  // Boarding Stop & Next Stop calculations
  const studentStop = user?.boardingPoint || 'Main Gate';
  const isBusActive = liveLocation && liveLocation.isServingStudent !== false;
  const distanceFormatted = liveLocation?.displayDistance || '2 stops away • 5 min';
  const lastUpdatedDisplay = liveLocation?.lastUpdatedText || 'Last updated 2 min ago';

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const studentFirstName = user?.name ? user.name.split(' ')[0] : 'Alex';

  return (
    <MobileAppLayout
      showBottomNav={true}
      unreadNotificationsCount={unreadCount}
      activeScreenIndex={3}
    >
      <div className="flex-1 px-4 py-3 space-y-4">
        {/* Top Header: Student Greeting & Profile Avatar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            {/* Student Avatar */}
            <Link
              to="/student/profile"
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white dark:ring-slate-800 hover:scale-105 transition-all overflow-hidden"
            >
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80"
                alt="Student Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-xs uppercase">{studentFirstName.slice(0, 2)}</span>
            </Link>

            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {getGreeting()}
              </p>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                {studentFirstName}
              </h2>
            </div>
          </div>

          {/* Notification Bell */}
          <Link
            to="/student/notifications"
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </Link>
        </div>

        {/* Emergency SOS Banner (if open incident exists) */}
        {activeIncident && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between shadow-xs animate-pulse">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">{activeIncident.type}: Alert Reported</p>
                <p className="text-[11px] opacity-80 truncate max-w-[200px]">{activeIncident.description}</p>
              </div>
            </div>
            <Link to="/student/sos" className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px]">
              View
            </Link>
          </div>
        )}

        {/* 1. Vivid Blue Gradient Hero Card (Screen 3 Reference Design) */}
        <div className="rounded-3xl p-5 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              {/* White Squircle Bus Icon */}
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
                <BusIcon className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-blue-100">
                  Your Bus
                </span>
                <h3 className="text-2xl font-black tracking-tight leading-tight">
                  {busNumberDisplay.startsWith('BUS-') || busNumberDisplay.startsWith('Bus ') ? busNumberDisplay : `BUS-${busNumberDisplay}`}
                </h3>
                <p className="text-xs font-medium text-blue-50">
                  {routeNameDisplay}
                </p>
              </div>
            </div>

            {/* Live Green Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Live</span>
            </div>
          </div>

          {/* Quick Bus Selector if multiple buses available */}
          {buses.length > 1 && (
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-blue-50">
              <span>Switch Bus:</span>
              <select
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                className="bg-white/20 text-white text-xs rounded-xl px-2.5 py-1 border border-white/30 focus:outline-hidden cursor-pointer"
              >
                {buses.map((b) => (
                  <option key={b.id} value={b.id} className="text-slate-900">
                    Bus #{b.busNumber} {b.route?.name ? `(${b.route.name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 2. Small Live Map Preview Card with Telemetry Overlay */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs relative">
          <div className="h-44 sm:h-48 relative">
            <BusMap
              busLocation={
                liveLocation?.location
                  ? {
                      latitude: liveLocation.location.latitude,
                      longitude: liveLocation.location.longitude,
                      heading: liveLocation.location.heading || 0,
                      speed: liveLocation.location.speed || 0,
                    }
                  : { latitude: 16.4321, longitude: 80.9976 }
              }
              routeStops={activeBus?.route?.boardingPoints || []}
              boardingPoint={activeBus?.route?.boardingPoints?.find((p: any) => p.name === studentStop)}
              className="h-full w-full"
            />

            {/* Floating Telemetry Pill Banner matching reference */}
            <div className="absolute top-3 left-3 right-3 z-1000 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-2.5 shadow-md border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {distanceFormatted}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {lastUpdatedDisplay}
                  </p>
                </div>
              </div>

              <Link
                to="/student/live-tracking"
                className="px-3 py-1.5 rounded-full bg-blue-600 text-white font-bold text-[11px] shadow-xs hover:bg-blue-700 transition-all flex items-center gap-1 shrink-0"
              >
                <span>Track</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Occupancy Section Card */}
        <Link
          to="/student/seat-availability"
          className="block bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Occupancy
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {currentOccupancy} / {capacity}
                </span>
                <span className="text-xs text-slate-500 font-medium">passengers</span>
              </div>
            </div>

            {/* Pill Badge matching reference */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{seatsAvailable} seats available</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                occupancyPercent > 85
                  ? 'bg-rose-500'
                  : occupancyPercent > 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </Link>

        {/* 4. Next Stop Section Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Next Stop
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {studentStop}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
              ETA 5 min
            </span>
          </div>
        </div>

        {/* Quick Access Module Buttons */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <Link
            to="/student/seat-availability"
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs hover:scale-105 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
              <Armchair className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Seats</span>
          </Link>

          <Link
            to="/student/parent-tracking"
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs hover:scale-105 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
              <Share2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Parents</span>
          </Link>

          <Link
            to="/student/sos"
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs hover:scale-105 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">SOS</span>
          </Link>

          <Link
            to="/student/bus-details"
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs hover:scale-105 transition-all text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
              <Info className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Details</span>
          </Link>
        </div>
      </div>
    </MobileAppLayout>
  );
};
