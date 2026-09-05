import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Bus, Route, Driver } from '../../types';
import { Bus as BusIcon, Plus, Search, Edit2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const AdminBuses: React.FC = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [busNumber, setBusNumber] = useState('');
  const [capacity, setCapacity] = useState(40);
  const [routeId, setRouteId] = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'>('INACTIVE');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [busesRes, routesRes, driversRes] = await Promise.all([
        adminApi.getBuses(),
        adminApi.getRoutes(),
        adminApi.getDrivers(),
      ]);

      if (busesRes.data.success) setBuses(busesRes.data.buses);
      if (routesRes.data.success) setRoutes(routesRes.data.routes);
      if (driversRes.data.success) setDrivers(driversRes.data.drivers);
    } catch (e) {
      console.error('Failed to load buses data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingBus(null);
    setBusNumber('');
    setCapacity(40);
    setRouteId(routes.length > 0 ? routes[0].id : '');
    setAssignedDriverId('');
    setStatus('INACTIVE');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Bus) => {
    setEditingBus(b);
    setBusNumber(b.busNumber);
    setCapacity(b.capacity);
    setRouteId(b.routeId || '');
    setAssignedDriverId(b.assignedDriverId || '');
    setStatus(b.status);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      if (editingBus) {
        await adminApi.updateBus(editingBus.id, {
          busNumber: busNumber.trim().toUpperCase(),
          capacity,
          routeId: routeId || null,
          assignedDriverId: assignedDriverId || null,
          status,
        });
      } else {
        await adminApi.createBus({
          busNumber: busNumber.trim().toUpperCase(),
          capacity,
          routeId: routeId || null,
          assignedDriverId: assignedDriverId || null,
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save bus.');
    } finally {
      setSaving(false);
    }
  };

  const filteredBuses = buses.filter((b) =>
    b.busNumber.toLowerCase().includes(search.toLowerCase()) ||
    b.route?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Bus Fleet Management</h1>
          <p className="text-xs text-slate-400">
            Configure college buses, assign routes, and link drivers.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-purple-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Bus
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by bus number or route name..."
          className="w-full bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500"
        />
      </div>

      {/* Buses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Bus Number</th>
                <th className="px-6 py-4">Capacity</th>
                <th className="px-6 py-4">Assigned Route</th>
                <th className="px-6 py-4">Assigned Driver</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredBuses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-xs">
                    No buses found matching your search.
                  </td>
                </tr>
              ) : (
                filteredBuses.map((bus) => {
                  const activeTrip = bus.trips && bus.trips.length > 0;
                  return (
                    <tr key={bus.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-white flex items-center gap-2">
                        <BusIcon className="w-4 h-4 text-blue-400" />
                        {bus.busNumber}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{bus.capacity} seats</td>
                      <td className="px-6 py-4">
                        {bus.route ? (
                          <span className="text-indigo-300 font-medium">{bus.route.name}</span>
                        ) : (
                          <span className="text-slate-500 italic">No route assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {bus.assignedDriver ? (
                          <span className="text-emerald-300 font-medium">
                            {bus.assignedDriver.driverName}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {activeTrip ? (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 w-fit">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            LIVE TRIP
                          </span>
                        ) : bus.status === 'MAINTENANCE' ? (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-full text-xs font-bold w-fit">
                            MAINTENANCE
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full text-xs font-bold w-fit">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(bus)}
                          className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Bus Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-xl font-bold text-white">
              {editingBus ? 'Edit Bus Details' : 'Add New Bus'}
            </h3>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Bus Number
                </label>
                <input
                  type="text"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  placeholder="e.g. AP16AB1234"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Capacity (Seats)
                </label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Assign Route
                </label>
                <select
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm"
                >
                  <option value="">-- No Route Assigned --</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.routeNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Assign Driver
                </label>
                <select
                  value={assignedDriverId}
                  onChange={(e) => setAssignedDriverId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm"
                >
                  <option value="">-- No Driver Assigned --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.driverName} ({d.phone || 'No phone'}) - {d.approvalStatus}
                    </option>
                  ))}
                </select>
              </div>

              {editingBus && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingBus ? 'Update Bus' : 'Create Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
