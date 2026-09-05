import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Trip } from '../../types';
import { History, Bus, Radio, Clock, Bell, User, CheckCircle2 } from 'lucide-react';

export const AdminTrips: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getTrips();
      if (res.data.success) {
        setTrips(res.data.trips);
      }
    } catch (e) {
      console.error('Failed to load trips:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const formatDuration = (start: string, end?: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diffMins = Math.round((endTime - startTime) / 60000);
    if (diffMins < 60) return `${diffMins} mins`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Trip History & Audit Logs</h1>
        <p className="text-xs text-slate-400">
          Chronological record of all past and active college bus trips, drivers, and proximity alerts.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Bus</th>
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4">Start Time</th>
                <th className="px-6 py-4">End Time / Duration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">2 KM Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {trips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-xs">
                    No trips recorded yet.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => {
                  const isActive = trip.status === 'ACTIVE';
                  return (
                    <tr key={trip.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-white flex items-center gap-2">
                        <Bus className="w-4 h-4 text-blue-400" />
                        {trip.bus?.busNumber}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-200">
                        {trip.driver?.driverName}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {new Date(trip.startTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {trip.endTime ? (
                          <span>
                            {new Date(trip.endTime).toLocaleTimeString()} ({formatDuration(trip.startTime, trip.endTime)})
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">
                            Ongoing ({formatDuration(trip.startTime)})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 w-fit">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            ACTIVE
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full text-xs font-bold w-fit">
                            COMPLETED
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <Bell className="w-3 h-3 text-amber-400" />
                          {trip.notifications?.length || 0} Alerts Sent
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
