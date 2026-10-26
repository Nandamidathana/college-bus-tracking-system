import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { BusMap } from '../../components/maps/BusMap';
import {
  Bus as BusIcon,
  Users,
  Navigation,
  Radio,
  GraduationCap,
  RefreshCw,
  Clock,
  Gauge,
  MapPin,
  AlertTriangle,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({
    totalBuses: 0,
    activeBuses: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    activeTrips: 0,
    totalStudents: 0,
  });
  const [liveBuses, setLiveBuses] = useState<any[]>([]);
  const [college, setCollege] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBusDetail, setSelectedBusDetail] = useState<any | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDashboard();
      if (res.data.success) {
        setStats(res.data.stats);
        setCollege(res.data.college);
        setLiveBuses(res.data.liveBuses);
      }
    } catch (e) {
      console.error('Failed to load admin dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const socket = getSocket();
    if (!socket) return;

    // Listen for real-time location updates across the college
    const handleLocationUpdate = (payload: any) => {
      setLiveBuses((prev) => {
        const idx = prev.findIndex((b) => b.busId === payload.busId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            latitude: payload.latitude,
            longitude: payload.longitude,
            speed: payload.speed,
            heading: payload.heading,
            accuracy: payload.accuracy,
            isStale: payload.isStale,
            status: payload.status,
            lastUpdate: payload.timestamp,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              tripId: payload.tripId,
              busId: payload.busId,
              busNumber: payload.busNumber,
              driverName: payload.driverName,
              latitude: payload.latitude,
              longitude: payload.longitude,
              speed: payload.speed,
              heading: payload.heading,
              accuracy: payload.accuracy,
              isStale: payload.isStale,
              status: payload.status,
              lastUpdate: payload.timestamp,
            },
          ];
        }
      });
    };

    const handleTripEvents = () => {
      fetchDashboard();
    };

    socket.on('bus:location:update', handleLocationUpdate);
    socket.on('bus:trip:started', handleTripEvents);
    socket.on('bus:trip:ended', handleTripEvents);
    socket.on('bus:status:changed', handleTripEvents);

    return () => {
      socket.off('bus:location:update', handleLocationUpdate);
      socket.off('bus:trip:started', handleTripEvents);
      socket.off('bus:trip:ended', handleTripEvents);
      socket.off('bus:status:changed', handleTripEvents);
    };
  }, []);

  const statCards = [
    { title: 'Total Buses', value: stats.totalBuses, active: stats.activeBuses, icon: BusIcon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Total Drivers', value: stats.totalDrivers, active: stats.activeDrivers, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Active Trips', value: stats.activeTrips, highlight: true, icon: Radio, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'Registered Students', value: stats.totalStudents, icon: GraduationCap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Admin Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Real-time fleet monitoring and transport statistics for {college?.name || 'SRGEC'}.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{card.value}</span>
                  {card.active !== undefined && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      {card.active} Active
                    </span>
                  )}
                </div>
              </div>
              <div className={`w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Live Fleet Radar Map */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Live Fleet Map ({liveBuses.filter((b) => b.latitude).length} Tracking)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
            Campus HQ: {college?.latitude?.toFixed(4)}, {college?.longitude?.toFixed(4)}
          </span>
        </div>

        <div className="h-[480px] w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
          <BusMap
            college={college}
            busesList={liveBuses
              .filter((b) => b.latitude && b.longitude)
              .map((b) => ({
                busId: b.busId,
                busNumber: b.busNumber,
                latitude: b.latitude,
                longitude: b.longitude,
                heading: b.heading || 0,
                speed: b.speed || 0,
                driverName: b.driverName,
                routeName: b.routeName,
                status: b.status || 'LIVE',
              }))}
            onBusClick={(busId) => {
              const found = liveBuses.find((b) => b.busId === busId);
              if (found) setSelectedBusDetail(found);
            }}
            className="h-full w-full"
            zoom={12}
            show2kmCircle={false}
          />
        </div>

        {/* Live Active Buses Roster Table */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Active Trips Stream
          </h3>

          {liveBuses.length === 0 ? (
            <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs font-normal">
              No buses currently on an active trip. When a driver clicks [ START TRIP ], their bus will appear here in real time.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveBuses.map((bus) => (
                <div
                  key={bus.busId}
                  className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3.5 space-y-2 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <BusIcon className="w-4 h-4 text-blue-600" />
                      <span>Bus #{bus.busNumber}</span>
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        bus.status === 'LIVE'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {bus.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-0.5 text-slate-600 dark:text-slate-300">
                    <div>
                      Driver: <span className="font-semibold text-slate-800 dark:text-slate-200">{bus.driverName}</span>
                    </div>
                    <div>
                      Route: <span className="font-semibold text-blue-600 dark:text-blue-400">{bus.routeName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-700/60 font-mono font-medium">
                    <span>Speed: {Math.round(bus.speed || 0)} km/h</span>
                    <span>Accuracy: &plusmn;{Math.round(bus.accuracy || 5)}m</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
