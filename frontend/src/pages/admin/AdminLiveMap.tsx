import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { BusMap } from '../../components/maps/BusMap';
import { Radio, RefreshCw, Filter, Navigation, Gauge, Clock, Shield } from 'lucide-react';

export const AdminLiveMap: React.FC = () => {
  const [searchParams] = useSearchParams();
  const focusBusId = searchParams.get('focusBusId');

  const [liveBuses, setLiveBuses] = useState<any[]>([]);
  const [college, setCollege] = useState<any>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(focusBusId || null);
  const [loading, setLoading] = useState(true);

  const fetchLiveFleet = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDashboard();
      if (res.data.success) {
        setCollege(res.data.college);
        setLiveBuses(res.data.liveBuses);
      }
    } catch (e) {
      console.error('Failed to load fleet map data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveFleet();

    const socket = getSocket();
    if (!socket) return;

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
          return [...prev, payload];
        }
      });
    };

    const handleTripEvents = () => {
      fetchLiveFleet();
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

  const activeBusesList = liveBuses.filter((b) => b.latitude && b.longitude);
  const selectedBus = liveBuses.find((b) => b.busId === selectedBusId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Live Fleet Command Radar
            </h1>
            <p className="text-xs text-slate-400">
              {activeBusesList.length} active buses streaming real-time GPS coordinates.
            </p>
          </div>
        </div>

        <button
          onClick={fetchLiveFleet}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Radar
        </button>
      </div>

      {/* Main Map + Side Fleet Panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Full Interactive Live Map */}
        <div className="lg:col-span-3 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900">
          <BusMap
            college={college}
            busesList={activeBusesList.map((b) => ({
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
            onBusClick={(id) => setSelectedBusId(id)}
            className="h-full w-full"
            zoom={12}
            show2kmCircle={false}
          />
        </div>

        {/* Side Active Buses Selector & Inspector */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Fleet ({activeBusesList.length})
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>

            <div className="mt-3 space-y-2.5">
              {activeBusesList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No active trips detected.
                </div>
              ) : (
                activeBusesList.map((bus) => {
                  const isSelected = bus.busId === selectedBusId;
                  return (
                    <button
                      key={bus.busId}
                      onClick={() => setSelectedBusId(bus.busId)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm font-mono text-white">
                          🚌 {bus.busNumber}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {bus.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 truncate">
                        Driver: <span className="text-slate-200">{bus.driverName}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                        <span>Speed: {Math.round(bus.speed)} km/h</span>
                        <span>Acc: &plusmn;{Math.round(bus.accuracy)}m</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Bus Telemetry Card */}
          {selectedBus && (
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Selected Bus Details
              </span>
              <h4 className="text-base font-black text-white font-mono">{selectedBus.busNumber}</h4>
              <div className="text-xs text-slate-300 space-y-1">
                <div>Route: <span className="text-white font-semibold">{selectedBus.routeName}</span></div>
                <div>Driver: <span className="text-white font-semibold">{selectedBus.driverName}</span></div>
                <div>Driver Phone: <span className="text-white font-mono">{selectedBus.driverPhone || 'N/A'}</span></div>
                <div>Last GPS: <span className="text-slate-400 font-mono">{new Date(selectedBus.lastUpdate).toLocaleTimeString()}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
