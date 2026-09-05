import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Driver, Bus } from '../../types';
import { Users, Search, Check, X, ShieldCheck, ShieldAlert, Bus as BusIcon, Phone } from 'lucide-react';

export const AdminDrivers: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [driversRes, busesRes] = await Promise.all([
        adminApi.getDrivers(),
        adminApi.getBuses(),
      ]);

      if (driversRes.data.success) setDrivers(driversRes.data.drivers);
      if (busesRes.data.success) setBuses(busesRes.data.buses);
    } catch (e) {
      console.error('Failed to load drivers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateApproval = async (driverId: string, approvalStatus: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    try {
      await adminApi.updateDriver(driverId, { approvalStatus });
      fetchData();
    } catch (e) {
      console.error('Failed to update driver approval:', e);
    }
  };

  const handleAssignBus = async (driverId: string, busId: string) => {
    try {
      await adminApi.updateDriver(driverId, {
        assignedBusId: busId || null,
      });
      fetchData();
    } catch (e) {
      console.error('Failed to update bus assignment:', e);
    }
  };

  const filteredDrivers = drivers.filter((d) =>
    d.driverName.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone && d.phone.includes(search))
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Driver Management</h1>
          <p className="text-xs text-slate-400">
            Review driver registrations, grant permissions, and link buses.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drivers by name or phone..."
          className="w-full bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500"
        />
      </div>

      {/* Drivers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Driver Name</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Approval Status</th>
                <th className="px-6 py-4">Assigned Bus</th>
                <th className="px-6 py-4">Trip State</th>
                <th className="px-6 py-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-xs">
                    No drivers found.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => {
                  const hasActiveTrip = driver.trips && driver.trips.length > 0;
                  return (
                    <tr key={driver.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        {driver.driverName}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">
                        {driver.phone || <span className="text-slate-500 italic">No phone</span>}
                      </td>
                      <td className="px-6 py-4">
                        {driver.approvalStatus === 'APPROVED' ? (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            APPROVED
                          </span>
                        ) : driver.approvalStatus === 'REJECTED' ? (
                          <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            REJECTED
                          </span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                            PENDING
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={driver.assignedBusId || ''}
                          onChange={(e) => handleAssignBus(driver.id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono"
                        >
                          <option value="">-- None --</option>
                          {buses.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.busNumber}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        {hasActiveTrip ? (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 w-fit animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            ON ACTIVE TRIP
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">AVAILABLE</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {driver.approvalStatus !== 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateApproval(driver.id, 'APPROVED')}
                            className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            title="Approve Driver"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}
                        {driver.approvalStatus !== 'REJECTED' && (
                          <button
                            onClick={() => handleUpdateApproval(driver.id, 'REJECTED')}
                            className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            title="Reject/Disable Driver"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}
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
