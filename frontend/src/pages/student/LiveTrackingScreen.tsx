import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Bus, BusLocationUpdate } from '../../types';
import { BusMap } from '../../components/maps/BusMap';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { MobileHeader } from '../../components/common/MobileHeader';
import {
  Bus as BusIcon,
  MapPin,
  Clock,
  Layers,
  RefreshCw,
  Armchair,
  ShieldAlert,
  ChevronUp,
  Share2,
} from 'lucide-react';

export const LiveTrackingScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [liveLocation, setLiveLocation] = useState<BusLocationUpdate | any | null>(null);
  const [busData, setBusData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    studentApi
      .getBuses()
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.buses)) {
          setBuses(res.data.buses);
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
      .catch((err) => console.warn('Buses fetch error:', err));
  }, []);

  const loadLiveData = () => {
    if (!selectedBusId) return;
    setRefreshing(true);
    Promise.all([
      studentApi.getBusLiveLocation(selectedBusId),
      studentApi.getBusDetails(selectedBusId),
    ])
      .then(([locRes, detailsRes]) => {
        if (locRes.data.success) setLiveLocation(locRes.data);
        if (detailsRes.data.success) setBusData(detailsRes.data.bus);
      })
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    if (!selectedBusId) return;
    loadLiveData();
    const interval = setInterval(loadLiveData, 8000);

    const socket = getSocket();
    if (socket) {
      socket.emit('bus:subscribe', { busId: selectedBusId });
      socket.on('bus:location_updated', (data: any) => {
        if (data.busId === selectedBusId) {
          setLiveLocation((prev: any) => ({ ...prev, ...data }));
        }
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.emit('bus:unsubscribe', { busId: selectedBusId });
        socket.off('bus:location_updated');
      }
    };
  }, [selectedBusId]);

  const activeBus = useMemo(() => {
    return buses.find((b) => b.id === selectedBusId) || buses[0] || null;
  }, [buses, selectedBusId]);

  const busNumberDisplay = activeBus ? activeBus.busNumber : (user?.busNumber || 'BUS-12');
  const routeNameDisplay = activeBus?.route?.name || user?.routeName || 'Engineering Route';
  const distanceFormatted = liveLocation?.displayDistance || '2 stops away • 5 min';
  const lastUpdatedDisplay = liveLocation?.lastUpdatedText || 'Last updated 2 min ago';

  return (
    <MobileAppLayout showBottomNav={true} activeScreenIndex={4}>
      <div className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <MobileHeader
          title="Live Tracking"
          showBack={true}
          rightAction="refresh"
          onRightAction={loadLiveData}
        />

        {/* Full-view Map */}
        <div className="flex-1 w-full min-h-[460px] relative">
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
            boardingPoint={activeBus?.route?.boardingPoints?.find((p: any) => p.name === user?.boardingPoint)}
            className="h-full w-full"
          />

          {/* Floating Bottom Sheet Card over Map (Screen 4 Reference Design) */}
          <div className="absolute bottom-4 left-3 right-3 z-1000 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-4 shadow-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            {/* Bus Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                  <BusIcon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    {busNumberDisplay.startsWith('BUS-') || busNumberDisplay.startsWith('Bus ') ? busNumberDisplay : `BUS-${busNumberDisplay}`}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {routeNameDisplay}
                  </p>
                </div>
              </div>

              {/* Live Status Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Live</span>
              </div>
            </div>

            {/* ETA / Proximity Row */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold">{distanceFormatted}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>{lastUpdatedDisplay}</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => navigate('/student/seat-availability')}
                className="py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200/60 dark:border-slate-700"
              >
                <Armchair className="w-3.5 h-3.5 text-emerald-600" />
                <span>Seats</span>
              </button>

              <button
                onClick={() => navigate('/student/parent-tracking')}
                className="py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200/60 dark:border-slate-700"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Share</span>
              </button>

              <button
                onClick={() => navigate('/student/sos')}
                className="py-2 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-rose-200/60 dark:border-rose-900"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>SOS</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
};
