import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Route, BoardingPoint } from '../../types';
import { Route as RouteIcon, Plus, Trash2, Edit2, MapPin, AlertCircle, Save } from 'lucide-react';

export const AdminRoutes: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routeName, setRouteName] = useState('');
  const [routeNumber, setRouteNumber] = useState('');
  const [boardingPoints, setBoardingPoints] = useState<
    Array<{ name: string; latitude: number | string; longitude: number | string; sequence: number }>
  >([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getRoutes();
      if (res.data.success) {
        setRoutes(res.data.routes);
      }
    } catch (e) {
      console.error('Failed to load routes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleOpenAdd = () => {
    setEditingRoute(null);
    setRouteName('');
    setRouteNumber('');
    setBoardingPoints([
      { name: 'Start Bus Stand', latitude: 16.3502, longitude: 80.6210, sequence: 1 },
      { name: 'College Campus Main Gate', latitude: 16.3550, longitude: 80.6250, sequence: 2 },
    ]);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: Route) => {
    setEditingRoute(r);
    setRouteName(r.name);
    setRouteNumber(r.routeNumber);
    setBoardingPoints(
      (r.boardingPoints || []).map((bp) => ({
        name: bp.name,
        latitude: bp.latitude,
        longitude: bp.longitude,
        sequence: bp.sequence,
      }))
    );
    setFormError('');
    setIsModalOpen(true);
  };

  const handleAddStop = () => {
    setBoardingPoints([
      ...boardingPoints,
      {
        name: `Stop #${boardingPoints.length + 1}`,
        latitude: 16.35,
        longitude: 80.62,
        sequence: boardingPoints.length + 1,
      },
    ]);
  };

  const handleRemoveStop = (index: number) => {
    const updated = boardingPoints.filter((_, i) => i !== index);
    // Re-index sequences
    setBoardingPoints(updated.map((s, idx) => ({ ...s, sequence: idx + 1 })));
  };

  const handleStopChange = (index: number, field: string, value: any) => {
    const updated = [...boardingPoints];
    updated[index] = { ...updated[index], [field]: value };
    setBoardingPoints(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const payload = {
        name: routeName.trim(),
        routeNumber: routeNumber.trim().toUpperCase(),
        boardingPoints: boardingPoints.map((bp, i) => ({
          name: bp.name.trim(),
          latitude: parseFloat(String(bp.latitude)),
          longitude: parseFloat(String(bp.longitude)),
          sequence: i + 1,
        })),
      };

      if (editingRoute) {
        await adminApi.updateRoute(editingRoute.id, payload);
      } else {
        await adminApi.createRoute(payload);
      }

      setIsModalOpen(false);
      fetchRoutes();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save route.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Route & Boarding Points</h1>
          <p className="text-xs text-slate-400">
            Define transit corridors, ordered bus stops, and precise GPS pickup coordinates.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-purple-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Route
        </button>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {routes.map((route) => (
          <div
            key={route.id}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
                  {route.routeNumber}
                </span>
                <h3 className="text-lg font-bold text-white mt-2">{route.name}</h3>
              </div>
              <button
                onClick={() => handleOpenEdit(route)}
                className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>

            {/* Boarding Points Timeline */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Ordered Stops ({route.boardingPoints?.length || 0})
              </span>
              <div className="space-y-2 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {(route.boardingPoints || [])
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((stop) => (
                    <div key={stop.id} className="relative flex items-center justify-between text-xs">
                      <div className="absolute -left-4 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-indigo-400"></div>
                      <span className="text-slate-200 font-medium">{stop.name}</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <h3 className="text-xl font-bold text-white">
              {editingRoute ? 'Edit Route & Stops' : 'Create Route & Ordered Stops'}
            </h3>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Route Name
                  </label>
                  <input
                    type="text"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="e.g. Gudlavalleru Express Route"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Route Code / Number
                  </label>
                  <input
                    type="text"
                    value={routeNumber}
                    onChange={(e) => setRouteNumber(e.target.value)}
                    placeholder="e.g. ROUTE-01"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono uppercase"
                    required
                  />
                </div>
              </div>

              {/* Boarding Points Editor */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                    Ordered Boarding Points (GPS Coordinates)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStop}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Stop
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {boardingPoints.map((bp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center gap-2.5"
                    >
                      <span className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={bp.name}
                        onChange={(e) => handleStopChange(idx, 'name', e.target.value)}
                        placeholder="Stop Name"
                        className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs"
                        required
                      />
                      <input
                        type="number"
                        step="any"
                        value={bp.latitude}
                        onChange={(e) => handleStopChange(idx, 'latitude', e.target.value)}
                        placeholder="Latitude"
                        className="w-full sm:w-28 bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs font-mono"
                        required
                      />
                      <input
                        type="number"
                        step="any"
                        value={bp.longitude}
                        onChange={(e) => handleStopChange(idx, 'longitude', e.target.value)}
                        placeholder="Longitude"
                        className="w-full sm:w-28 bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs font-mono"
                        required
                      />
                      {boardingPoints.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(idx)}
                          className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

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
                  {saving ? 'Saving...' : editingRoute ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
