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
  AlertOctagon,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  Phone,
  Check,
  X,
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

  // Real-time Driver Incidents & SOS Management
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState<boolean>(false);
  const [activeEmergency, setActiveEmergency] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<string>('RESOLVED');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  const fetchIncidents = async () => {
    try {
      setLoadingIncidents(true);
      const res = await adminApi.getIncidents();
      if (res.data.success) {
        setIncidents(res.data.incidents || []);
        const openSos = res.data.incidents?.find(
          (inc: any) => (inc.type === 'SOS' || inc.severity === 'CRITICAL') && inc.status === 'OPEN'
        );
        setActiveEmergency(openSos || null);
      }
    } catch (e) {
      console.error('Failed to load incidents:', e);
    } finally {
      setLoadingIncidents(false);
    }
  };

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
      fetchIncidents();
    };

    fetchIncidents();

    const handleNewIncident = (incident: any) => {
      setIncidents((prev) => [incident, ...prev.filter((i) => i.id !== incident.id)]);
      if (incident.type === 'SOS' || incident.severity === 'CRITICAL') {
        setActiveEmergency(incident);
      }
    };

    const handleEmergencyAlert = (incident: any) => {
      setActiveEmergency(incident);
      setIncidents((prev) => [incident, ...prev.filter((i) => i.id !== incident.id)]);
    };

    const handleIncidentUpdated = (updated: any) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
      );
      if (activeEmergency?.id === updated.id && (updated.status === 'RESOLVED' || updated.status === 'CANCELLED')) {
        setActiveEmergency(null);
      }
    };

    socket.on('bus:location:update', handleLocationUpdate);
    socket.on('bus:trip:started', handleTripEvents);
    socket.on('bus:trip:ended', handleTripEvents);
    socket.on('bus:status:changed', handleTripEvents);
    socket.on('admin:incident:new', handleNewIncident);
    socket.on('admin:incident:emergency', handleEmergencyAlert);
    socket.on('admin:incident:updated', handleIncidentUpdated);

    return () => {
      socket.off('bus:location:update', handleLocationUpdate);
      socket.off('bus:trip:started', handleTripEvents);
      socket.off('bus:trip:ended', handleTripEvents);
      socket.off('bus:status:changed', handleTripEvents);
      socket.off('admin:incident:new', handleNewIncident);
      socket.off('admin:incident:emergency', handleEmergencyAlert);
      socket.off('admin:incident:updated', handleIncidentUpdated);
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: string, notes?: string) => {
    try {
      setUpdatingStatus(true);
      await adminApi.updateIncidentStatus(id, { status, resolutionNotes: notes });
      fetchIncidents();
      setSelectedIncident(null);
      setResolutionNotes('');
    } catch (e) {
      console.error('Failed to update incident status:', e);
    } finally {
      setUpdatingStatus(false);
    }
  };

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
          onClick={() => {
            fetchDashboard();
            fetchIncidents();
          }}
          className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Critical Emergency SOS Banner */}
      {activeEmergency && (
        <div className="p-4 rounded-xl bg-red-600 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-red-200">
                🚨 Critical Driver Emergency Alert
              </div>
              <div className="text-sm sm:text-base font-extrabold">
                Bus #{activeEmergency.busNumber} • Driver {activeEmergency.driverName} ({activeEmergency.driverPhone || 'No Phone'})
              </div>
              <div className="text-xs text-red-100">
                {activeEmergency.description || 'Emergency SOS triggered from driver navigation console.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => handleUpdateStatus(activeEmergency.id, 'ACKNOWLEDGED')}
              className="px-3.5 py-1.5 rounded-lg bg-white text-red-600 text-xs font-bold hover:bg-red-50 transition-colors shadow-xs"
            >
              Acknowledge
            </button>
            <button
              onClick={() => {
                setSelectedIncident(activeEmergency);
                setTargetStatus('RESOLVED');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold border border-red-400 transition-colors"
            >
              Dispatch & Resolve
            </button>
          </div>
        </div>
      )}

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

      {/* Driver Incidents, Delays & Breakdown Management Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Transit Incidents & Driver SOS Log
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time driver breakdown, delay, and emergency assistance dispatch board.
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg text-xs font-semibold">
            {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filterStatus === st
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loadingIncidents ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading transit incidents...</div>
        ) : incidents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No incidents reported. All campus transit routes are operating normally.
          </div>
        ) : (
          <div className="space-y-3">
            {incidents
              .filter((inc) => (filterStatus === 'ALL' ? true : inc.status === filterStatus))
              .map((inc) => (
                <div
                  key={inc.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    inc.status === 'OPEN'
                      ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                      : inc.status === 'ACKNOWLEDGED'
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        inc.type === 'SOS'
                          ? 'bg-red-600 text-white animate-pulse'
                          : inc.type === 'BREAKDOWN'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {inc.type === 'SOS' ? (
                        <AlertOctagon className="w-5 h-5" />
                      ) : inc.type === 'BREAKDOWN' ? (
                        <Wrench className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Bus #{inc.bus?.busNumber || inc.busNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            inc.type === 'SOS'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                              : inc.type === 'BREAKDOWN'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                          }`}
                        >
                          {inc.type}
                        </span>
                        {inc.delayMinutes > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                            +{inc.delayMinutes} mins delay
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            inc.status === 'OPEN'
                              ? 'bg-red-600 text-white'
                              : inc.status === 'ACKNOWLEDGED'
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {inc.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium">
                        {inc.description || 'No detailed note provided.'}
                      </p>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-4 flex-wrap">
                        <span>Driver: {inc.driver?.driverName || inc.driverName}</span>
                        {inc.driver?.phone && <span>Phone: {inc.driver.phone}</span>}
                        <span>Reported: {new Date(inc.reportedAt).toLocaleTimeString()}</span>
                        {inc.resolutionNotes && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Notes: {inc.resolutionNotes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {inc.status === 'OPEN' && (
                      <button
                        onClick={() => handleUpdateStatus(inc.id, 'ACKNOWLEDGED')}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        Acknowledge
                      </button>
                    )}
                    {inc.status !== 'RESOLVED' && inc.status !== 'CANCELLED' && (
                      <button
                        onClick={() => {
                          setSelectedIncident(inc);
                          setTargetStatus('RESOLVED');
                          setResolutionNotes(inc.resolutionNotes || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        Update / Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Incident Resolution Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Update Incident: Bus #{selectedIncident.bus?.busNumber || selectedIncident.busNumber}
              </h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Change Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-hidden"
                >
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                  <option value="DISPATCHED">DISPATCHED (Assistance En Route)</option>
                  <option value="RESOLVED">RESOLVED (Service Restored)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Resolution / Dispatch Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Dispatched backup bus #12, mechanic reached location, students transferred safely."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleUpdateStatus(selectedIncident.id, targetStatus, resolutionNotes)}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Save & Broadcast Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
