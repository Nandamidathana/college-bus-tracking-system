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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Admin Overview</h1>
          <p className="text-xs subtext-muted font-medium mt-0.5">
            Real-time fleet monitoring and transport statistics for {college?.name || 'College'}.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors self-start sm:self-auto shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </button>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="glass-card p-5 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider subtext-muted">
                  {card.title}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black">{card.value}</span>
                  {card.active !== undefined && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {card.active} Active
                    </span>
                  )}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Live Fleet Radar Map */}
      <div className="glass-panel rounded-3xl p-5 shadow-2xl space-y-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider">
              Live Fleet Tracking Map ({liveBuses.filter((b) => b.latitude).length} Tracking)
            </h2>
          </div>
          <span className="text-xs subtext-muted font-mono font-bold">
            College HQ: {college?.latitude?.toFixed(4)}, {college?.longitude?.toFixed(4)}
          </span>
        </div>

        <div className="h-[480px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
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
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider subtext-muted mb-3">
            Active Trips Stream
          </h3>

          {liveBuses.length === 0 ? (
            <div className="text-center py-6 subtext-muted text-xs font-medium">
              No buses currently on an active trip. When a driver clicks [ START TRIP ], their bus will appear here in real time.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveBuses.map((bus) => (
                <div
                  key={bus.busId}
                  className="glass-card rounded-2xl p-3.5 space-y-2 border border-white/10 hover:border-blue-500/40 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black font-mono">
                      🚌 {bus.busNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        bus.status === 'LIVE'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                          : 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/40'
                      }`}
                    >
                      {bus.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-0.5 subtext-muted">
                    <div>
                      Driver: <span className="font-bold">{bus.driverName}</span>
                    </div>
                    <div>
                      Route: <span className="text-indigo-600 dark:text-indigo-300 font-bold">{bus.routeName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] subtext-muted pt-1.5 border-t border-slate-200 dark:border-slate-800/80 font-mono font-medium">
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
