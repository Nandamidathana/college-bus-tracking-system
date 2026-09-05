import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { College } from '../../types';
import { Settings, School, MapPin, Save, CheckCircle2, AlertCircle, Crosshair } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [college, setCollege] = useState<College | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | string>('');
  const [longitude, setLongitude] = useState<number | string>('');
  const [reportingTime, setReportingTime] = useState<string>('09:00');
  const [geofenceRadius, setGeofenceRadius] = useState<number | string>(100);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchCollege = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDashboard();
      if (res.data.success && res.data.college) {
        const c = res.data.college;
        setCollege(c);
        setName(c.name);
        setAddress(c.address);
        setLatitude(c.latitude);
        setLongitude(c.longitude);
        if (c.reportingTime) setReportingTime(c.reportingTime);
        if (c.geofenceRadius) setGeofenceRadius(c.geofenceRadius);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollege();
  }, []);

  const handleAutoDetectGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setMessage('Detecting live campus GPS coordinates...');
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        setLatitude(Number(lat.toFixed(6)));
        setLongitude(Number(lng.toFixed(6)));
        setMessage(`📍 Detected live GPS coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${Math.round(accuracy)}m). Click 'Save' to apply.`);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setError('Could not access device GPS. Please check browser location permissions.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    try {
      const res = await adminApi.updateCollegeLocation({
        name: name.trim(),
        address: address.trim(),
        latitude: parseFloat(String(latitude)),
        longitude: parseFloat(String(longitude)),
        reportingTime: reportingTime.trim(),
        geofenceRadius: parseFloat(String(geofenceRadius)),
      });

      if (res.data.success) {
        setMessage('College details, Gate Geofencing, and Reporting Cutoff updated successfully.');
        setCollege(res.data.college);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">College Settings</h1>
        <p className="text-xs text-slate-400">
          Manage institutional details and precise GPS terminal destination coordinates.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {message && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              College Institution Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Campus Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                Terminal GPS Coordinates (College Campus Pin)
              </div>
              <button
                type="button"
                onClick={handleAutoDetectGPS}
                className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5" />
                Auto-Detect My Campus GPS
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Automated GPS Geofencing & Reporting Compliance Rules */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-500/20 space-y-4">
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Automated Campus Gate Geofence & Reporting Rules
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-semibold">
                  Official Reporting Cutoff Time
                </label>
                <input
                  type="text"
                  value={reportingTime}
                  onChange={(e) => setReportingTime(e.target.value)}
                  placeholder="09:00"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:border-purple-500"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Buses arriving after this time are automatically flagged as "Delayed".
                </span>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 font-semibold">
                  Gate Geofence Detection Radius (Meters)
                </label>
                <input
                  type="number"
                  min={20}
                  max={500}
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(e.target.value)}
                  placeholder="100"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:border-purple-500"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Radius around college GPS to trigger "Arrived at College" (e.g. 50–100m).
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save College Coordinates'}
          </button>
        </form>
      </div>
    </div>
  );
};
