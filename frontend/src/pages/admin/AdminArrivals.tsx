import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Bus,
  User,
  Phone,
  RefreshCw,
  TrendingUp,
  MapPin,
  Play,
  X,
  Award,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BusArrival {
  id: string;
  tripId: string;
  busId: string;
  driverId: string;
  collegeId: string;
  routeId?: string;
  date: string;
  arrivalTime: string;
  reportingTime: string;
  status: 'ON_TIME' | 'DELAYED';
  delayMinutes: number;
  distanceAtArrival: number;
  bus: {
    id: string;
    busNumber: string;
    route?: {
      id: string;
      name: string;
      routeNumber: string;
    };
  };
  driver: {
    id: string;
    driverName: string;
    phone?: string;
    user?: {
      phone?: string;
    };
  };
}

interface AnalyticsData {
  today: {
    date: string;
    totalArrivals: number;
    onTimeCount: number;
    delayedCount: number;
    onTimePercentage: number;
    avgDelayMinutes: number;
    arrivals: BusArrival[];
  };
  month: {
    period: string;
    totalArrivals: number;
    onTimeCount: number;
    delayedCount: number;
    onTimePercentage: number;
  };
  rankings: {
    drivers: Array<{
      driverName: string;
      total: number;
      onTime: number;
      delayed: number;
      onTimePct: number;
      avgDelay: number;
    }>;
    routes: Array<{
      routeName: string;
      total: number;
      onTime: number;
      delayed: number;
      onTimePct: number;
    }>;
  };
  activeEnrouteTripsCount: number;
  settings?: {
    reportingTime: string;
    geofenceRadius: number;
    latitude: number;
    longitude: number;
  };
}

export const AdminArrivals: React.FC = () => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON_TIME' | 'DELAYED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [arrivals, setArrivals] = useState<BusArrival[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'arrivals' | 'performance'>('arrivals');

  // Simulator Modal State
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [buses, setBuses] = useState<any[]>([]);
  const [simBusId, setSimBusId] = useState<string>('');
  const [simStatus, setSimStatus] = useState<'ON_TIME' | 'DELAYED'>('ON_TIME');
  const [simDelayMins, setSimDelayMins] = useState<number>(15);
  const [simulating, setSimulating] = useState<boolean>(false);

  const fetchArrivalsData = async () => {
    try {
      setLoading(true);
      const [arrivalsRes, analyticsRes, busesRes] = await Promise.all([
        adminApi.getArrivals({ date: selectedDate, status: statusFilter }),
        adminApi.getArrivalAnalytics({ date: selectedDate }),
        adminApi.getBuses(),
      ]);

      if (arrivalsRes.data.success) {
        setArrivals(arrivalsRes.data.arrivals);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data);
      }
      if (busesRes.data.success) {
        setBuses(busesRes.data.buses);
        if (busesRes.data.buses.length > 0 && !simBusId) {
          setSimBusId(busesRes.data.buses[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading arrivals data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArrivalsData();
  }, [selectedDate, statusFilter]);

  // Excel Download Handlers
  const handleDownloadDaily = async () => {
    try {
      setDownloading('daily');
      const response = await adminApi.exportDailyArrivals(selectedDate);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Daily_Bus_Arrivals_${selectedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download daily excel:', err);
      alert('Failed to generate daily Excel report.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadDelayed = async () => {
    try {
      setDownloading('delayed');
      const response = await adminApi.exportDelayedBuses(selectedDate);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Delayed_Buses_Report_${selectedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download delayed excel:', err);
      alert('Failed to generate delayed buses report.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadMonthly = async () => {
    try {
      setDownloading('monthly');
      const dateObj = new Date(selectedDate);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;
      const response = await adminApi.exportMonthlyPerformance(year, month);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Monthly_Performance_${year}_${month < 10 ? '0' + month : month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download monthly excel:', err);
      alert('Failed to generate monthly performance report.');
    } finally {
      setDownloading(null);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simBusId) return;
    try {
      setSimulating(true);
      const now = new Date();
      if (simStatus === 'DELAYED') {
        now.setHours(9, simDelayMins, 0, 0);
      } else {
        now.setHours(8, 48, 0, 0);
      }

      await adminApi.simulateArrival({
        busId: simBusId,
        status: simStatus,
        delayMinutes: simStatus === 'DELAYED' ? simDelayMins : 0,
        arrivalTime: now.toISOString(),
        date: selectedDate,
      });

      setShowSimModal(false);
      await fetchArrivalsData();
    } catch (err) {
      console.error('Simulation error:', err);
      alert('Failed to run arrival simulation.');
    } finally {
      setSimulating(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'N/A';
    }
  };

  const filteredArrivals = arrivals.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.bus.busNumber.toLowerCase().includes(q) ||
      a.driver.driverName.toLowerCase().includes(q) ||
      (a.bus.route?.name && a.bus.route.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/30 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                College Gate Arrivals & Reporting
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-extrabold uppercase tracking-wider">
                  Automated GPS Geofence
                </span>
              </h1>
              <p className="text-sm subtext-muted mt-1 font-medium">
                Zero manual intervention • 100m gate geofence radius • Official 9:00 AM reporting compliance
              </p>
            </div>
          </div>
        </div>

        {/* 1-Click Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadDaily}
            disabled={downloading !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            title="Download formatted daily Excel log for this date"
          >
            {downloading === 'daily' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Daily Excel (.xlsx)
          </button>

          <button
            onClick={handleDownloadDelayed}
            disabled={downloading !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            title="Download Excel report with only delayed buses"
          >
            {downloading === 'delayed' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            Delayed Report (.xlsx)
          </button>

          <button
            onClick={handleDownloadMonthly}
            disabled={downloading !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            title="Download comprehensive monthly performance workbook"
          >
            {downloading === 'monthly' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Award className="w-4 h-4" />
            )}
            Monthly Performance
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-sm font-black transition-all shadow-sm"
            title="Print sheet"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSimModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-950 dark:bg-purple-600/30 dark:hover:bg-purple-600/50 dark:text-purple-200 border-2 border-purple-400 dark:border-purple-400/50 text-sm font-black transition-all hover:scale-[1.02] shadow-md"
            title="Simulate a bus reaching gate to test delay engine"
          >
            <Play className="w-4 h-4 text-purple-700 dark:text-purple-300 fill-purple-700 dark:fill-purple-300" />
            <span>Test Simulation</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Arrivals */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider subtext-muted">
              Total Arrivals Today
            </span>
            <div className="p-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black">
              {analytics?.today.totalArrivals ?? 0}
            </span>
            <span className="text-xs subtext-muted font-medium">buses recorded</span>
          </div>
        </div>

        {/* On-Time Rate */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider subtext-muted">
              On-Time Punctuality
            </span>
            <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {analytics?.today.onTimePercentage ?? 100}%
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400/80 font-bold">
              ({analytics?.today.onTimeCount ?? 0} on time)
            </span>
          </div>
        </div>

        {/* Delayed Buses */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-red-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider subtext-muted">
              Delayed Buses
            </span>
            <div className="p-2 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${(analytics?.today.delayedCount ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
              {analytics?.today.delayedCount ?? 0}
            </span>
            <span className="text-xs subtext-muted font-medium">past 9:00 AM</span>
          </div>
        </div>

        {/* Average Delay */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider subtext-muted">
              Average Delay
            </span>
            <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {analytics?.today.avgDelayMinutes ?? 0}
            </span>
            <span className="text-xs subtext-muted font-medium">mins / delayed bus</span>
          </div>
        </div>

        {/* Gate Reporting Cutoff */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider subtext-muted">
              Gate Reporting Rule
            </span>
            <div className="p-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700 dark:text-purple-300">
              {analytics?.settings?.reportingTime || '09:00'} AM
            </span>
            <span className="text-xs subtext-muted font-medium">
              ({analytics?.settings?.geofenceRadius || 100}m radius)
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Arrivals List vs Monthly Breakdown */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('arrivals')}
          className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 border-2 shadow-sm ${
            activeTab === 'arrivals'
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/30'
              : 'bg-white/95 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-white/10'
          }`}
        >
          <Clock className="w-4 h-4" />
          Arrival Log Records ({arrivals.length})
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 border-2 shadow-sm ${
            activeTab === 'performance'
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/30'
              : 'bg-white/95 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-white/10'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Driver & Route Performance Breakdown
        </button>
      </div>

      {activeTab === 'arrivals' ? (
        <>
          {/* Filter Bar */}
          <div className="glass-panel p-4 rounded-2xl border-2 border-slate-300 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Date Picker */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900/60 border-2 border-slate-300 dark:border-white/10 px-3.5 py-2 rounded-xl text-sm shadow-sm">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent outline-none font-black text-sm cursor-pointer text-slate-900 dark:text-white"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center bg-white dark:bg-slate-900/60 p-1 rounded-xl border-2 border-slate-300 dark:border-white/10 shadow-sm">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    statusFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => setStatusFilter('ON_TIME')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    statusFilter === 'ON_TIME'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  On Time
                </button>
                <button
                  onClick={() => setStatusFilter('DELAYED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    statusFilter === 'DELAYED'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Delayed Only
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search bus, driver, or route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900/60 border-2 border-slate-300 dark:border-white/10 pl-10 pr-4 py-2 rounded-xl text-sm placeholder-slate-500 outline-none focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Main Arrivals Table */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-black tracking-wider uppercase">
                    <th className="py-4 px-4 text-center">#</th>
                    <th className="py-4 px-4">Bus Details</th>
                    <th className="py-4 px-4">Route</th>
                    <th className="py-4 px-4">Driver Details</th>
                    <th className="py-4 px-4 text-center">Reporting Cutoff</th>
                    <th className="py-4 px-4 text-center">Arrival Time</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-center">Delay Duration</th>
                    <th className="py-4 px-4 text-center">Gate Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center subtext-muted">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                          <span className="font-bold">Loading college gate arrivals...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredArrivals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center subtext-muted">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Bus className="w-8 h-8 opacity-40" />
                          <span className="text-base font-bold">
                            No arrivals recorded for {selectedDate}
                          </span>
                          <span className="text-xs subtext-muted">
                            Arrivals are logged automatically when a bus enters the 100m gate geofence.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredArrivals.map((arr, idx) => {
                      const isOnTime = arr.status === 'ON_TIME';
                      return (
                        <tr
                          key={arr.id}
                          className="hover:bg-blue-500/[0.05] transition-colors group"
                        >
                          <td className="py-4 px-4 text-center font-bold text-xs">
                            {idx + 1}
                          </td>

                          {/* Bus Number */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`p-2 rounded-lg shrink-0 ${
                                  isOnTime
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse'
                                }`}
                              >
                                <Bus className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-black group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {arr.bus.busNumber}
                                </span>
                                <div className="text-[11px] subtext-muted font-mono">
                                  ID: {arr.busId.slice(0, 6)}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Route */}
                          <td className="py-4 px-4">
                            <span className="font-bold">
                              {arr.bus.route?.name || 'General Route'}
                            </span>
                            {arr.bus.route?.routeNumber && (
                              <div className="text-[11px] subtext-muted font-semibold">
                                Route #{arr.bus.route.routeNumber}
                              </div>
                            )}
                          </td>

                          {/* Driver */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 opacity-60 shrink-0" />
                              <div>
                                <span className="font-bold">
                                  {arr.driver.driverName}
                                </span>
                                {(arr.driver.phone || arr.driver.user?.phone) && (
                                  <div className="text-xs subtext-muted flex items-center gap-1 mt-0.5 font-semibold">
                                    <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    {arr.driver.phone || arr.driver.user?.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Reporting Time */}
                          <td className="py-4 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-xs font-mono font-bold">
                              {arr.reportingTime} AM
                            </span>
                          </td>

                          {/* Arrival Time */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-mono font-black text-sm">
                                {formatTime(arr.arrivalTime)}
                              </span>
                              <span className="text-[10px] subtext-muted font-mono">
                                {arr.date}
                              </span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-4 text-center">
                            {isOnTime ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                ON TIME
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40 animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                DELAYED
                              </span>
                            )}
                          </td>

                          {/* Delay Duration */}
                          <td className="py-4 px-4 text-center">
                            {isOnTime ? (
                              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-extrabold">
                                0 mins
                              </span>
                            ) : (
                              <span className="text-xs font-black text-red-700 dark:text-red-400 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                                +{arr.delayMinutes} mins late
                              </span>
                            )}
                          </td>

                          {/* Gate Distance */}
                          <td className="py-4 px-4 text-center text-xs subtext-muted font-mono font-bold">
                            {Math.round(arr.distanceAtArrival)} m
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Performance Breakdown View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Driver Punctuality Ranking */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Driver Punctuality Ranking</h3>
                  <p className="text-xs subtext-muted font-medium">Monthly on-time performance & delay stats</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {analytics?.rankings.drivers.length === 0 ? (
                <p className="text-sm subtext-muted text-center py-6">No monthly driver records yet.</p>
              ) : (
                analytics?.rankings.drivers.map((drv, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 flex items-center justify-between hover:border-teal-500/30 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-sm">{drv.driverName}</div>
                        <div className="text-xs subtext-muted font-medium">
                          {drv.total} Trips • {drv.onTime} On-Time • {drv.delayed} Delayed
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-teal-600 dark:text-teal-400">
                        {drv.onTimePct}%
                      </div>
                      {drv.delayed > 0 && (
                        <div className="text-[11px] text-red-600 dark:text-red-400 font-bold">
                          Avg delay: {drv.avgDelay}m
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Route Performance Ranking */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Route Punctuality Analysis</h3>
                  <p className="text-xs subtext-muted font-medium">Route-wise on-time completion rates</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {analytics?.rankings.routes.length === 0 ? (
                <p className="text-sm subtext-muted text-center py-6">No route data recorded yet.</p>
              ) : (
                analytics?.rankings.routes.map((rt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 flex items-center justify-between hover:border-indigo-500/30 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-sm">{rt.routeName}</div>
                        <div className="text-xs subtext-muted font-medium">
                          {rt.total} total arrivals recorded
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        {rt.onTimePct}%
                      </div>
                      <div className="text-[11px] subtext-muted font-medium">
                        {rt.onTime} On-Time / {rt.delayed} Delayed
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Simulator Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-300 dark:border-white/20 max-w-md w-full space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-black text-lg">Simulate Gate Arrival</h3>
              </div>
              <button
                onClick={() => setShowSimModal(false)}
                className="opacity-60 hover:opacity-100 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs subtext-muted font-medium">
              Test automated 100m gate arrival detection & 9:00 AM delay calculation. This logs an arrival record for testing Excel downloads immediately.
            </p>

            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">
                  Select College Bus
                </label>
                <select
                  value={simBusId}
                  onChange={(e) => setSimBusId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 p-3 rounded-xl text-sm font-semibold outline-none focus:border-purple-500"
                  required
                >
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busNumber} — {b.route?.name || 'General Route'} ({b.assignedDriver?.driverName || 'Driver'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">
                  Arrival Status to Test
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimStatus('ON_TIME')}
                    className={`p-3 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 ${
                      simStatus === 'ON_TIME'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-md'
                        : 'bg-white/80 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 subtext-muted hover:opacity-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    On Time (8:48 AM)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimStatus('DELAYED')}
                    className={`p-3 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 ${
                      simStatus === 'DELAYED'
                        ? 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300 shadow-md'
                        : 'bg-white/80 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 subtext-muted hover:opacity-100'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    Delayed (&gt; 9:00 AM)
                  </button>
                </div>
              </div>

              {simStatus === 'DELAYED' && (
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Delay Duration (Minutes late past 9:00 AM)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={simDelayMins}
                    onChange={(e) => setSimDelayMins(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 p-3 rounded-xl text-sm font-mono font-bold outline-none focus:border-red-500"
                  />
                  <span className="text-[11px] subtext-muted mt-1 block font-medium">
                    Arrival will be simulated at 9:{simDelayMins < 10 ? '0' + simDelayMins : simDelayMins} AM
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="px-4 py-2 rounded-xl text-sm subtext-muted font-bold hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-sm shadow-lg shadow-purple-600/30 disabled:opacity-50 flex items-center gap-2"
                >
                  {simulating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Simulate & Log Arrival
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
