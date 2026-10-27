import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { MobileHeader } from '../../components/common/MobileHeader';
import {
  ShieldAlert,
  Clock,
  Wrench,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  PhoneCall,
  X,
} from 'lucide-react';

export const SosEmergencyScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Reporting Modal for Delay / Breakdown
  const [activeModal, setActiveModal] = useState<'DELAY' | 'BREAKDOWN' | 'ASSISTANCE' | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [description, setDescription] = useState('');

  const handleSendSOS = async () => {
    if (!window.confirm('Are you sure you want to trigger an EMERGENCY SOS? This alerts the Transport Admin and college dispatch immediately.')) {
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Capture live GPS coordinates if allowed
      let lat: number | undefined;
      let lng: number | undefined;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Fallback without coordinates
        }
      }

      const res = await studentApi.reportIncident({
        type: 'SOS',
        severity: 'CRITICAL',
        description: `Emergency SOS triggered by ${user?.name || 'Student'} (${user?.rollNumber || 'College Transport'})`,
        latitude: lat,
        longitude: lng,
      });

      if (res.data.success) {
        setSuccessMsg('🚨 Emergency SOS dispatched! Transport Admin and local response have been alerted with your location.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to dispatch SOS. Please call the emergency transport helpline directly.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await studentApi.reportIncident({
        type: activeModal,
        severity: activeModal === 'BREAKDOWN' ? 'HIGH' : 'MEDIUM',
        delayMinutes: activeModal === 'DELAY' ? Number(delayMinutes) : 0,
        description: description || `${activeModal} reported by ${user?.name || 'student'}.`,
      });

      if (res.data.success) {
        setSuccessMsg(`Incident reported: ${activeModal}. Transport desk updated.`);
        setActiveModal(null);
        setDescription('');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to report incident.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileAppLayout showBottomNav={true} activeScreenIndex={8}>
      <div className="flex-1 flex flex-col justify-between">
        {/* Header */}
        <MobileHeader title="SOS / Emergency" showBack={true} />

        <div className="px-5 py-3 space-y-5">
          {/* Status Banners */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Urgent Emergency Banner (Screen 8 Reference Design) */}
          <div className="rounded-3xl p-6 bg-gradient-to-b from-rose-500 to-red-600 text-white text-center shadow-xl shadow-rose-500/25 relative overflow-hidden flex flex-col items-center">
            {/* Glowing SOS Shield Icon */}
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center p-2 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-white text-red-600 flex items-center justify-center font-black text-sm shadow-md">
                  SOS
                </div>
              </div>
            </div>

            <h3 className="text-xl font-black tracking-tight">
              Emergency Assistance
            </h3>

            <p className="text-xs text-rose-100 font-medium leading-relaxed max-w-xs mt-1.5 mb-5">
              Need immediate help?<br />
              Tap the SOS button to alert the Transport Admin with your location.
            </p>

            {/* Big Prominent Red SOS Button */}
            <button
              onClick={handleSendSOS}
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-white hover:bg-rose-50 text-red-600 font-extrabold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <ShieldAlert className="w-5 h-5" />
              <span>{loading ? 'Alerting Dispatch...' : '🚨 SOS Emergency Help'}</span>
            </button>
          </div>

          {/* Action Grid / Quick Action Cards */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Quick Incident Actions
            </h4>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Report Delay */}
              <button
                onClick={() => setActiveModal('DELAY')}
                className="w-full p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center gap-3.5 text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Report Delay
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Notify students & admin about traffic or route slowdowns
                  </p>
                </div>
              </button>

              {/* Report Breakdown */}
              <button
                onClick={() => setActiveModal('BREAKDOWN')}
                className="w-full p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center gap-3.5 text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Report Breakdown
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Request mechanic or replacement bus support
                  </p>
                </div>
              </button>

              {/* Request Assistance */}
              <button
                onClick={() => setActiveModal('ASSISTANCE')}
                className="w-full p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center gap-3.5 text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Request Assistance
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Direct line to campus safety and transport desk
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal for reporting Delay / Breakdown / Assistance */}
        {activeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Report {activeModal}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCustomReport} className="space-y-3.5">
                {activeModal === 'DELAY' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Estimated Delay (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={delayMinutes}
                      onChange={(e) => setDelayMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details (location, issue, etc.)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-60"
                  >
                    {loading ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MobileAppLayout>
  );
};
