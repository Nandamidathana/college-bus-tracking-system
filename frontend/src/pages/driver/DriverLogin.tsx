import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { Navbar } from '../../components/common/Navbar';
import { Navigation, KeyRound, User, School, ArrowRight, AlertCircle } from 'lucide-react';

const DEFAULT_AP_COLLEGES = [
  { id: 'cmtlrqxgq0000v620e5otz0gg', name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)', code: 'SRGEC' },
];

export const DriverLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [colleges, setColleges] = useState<any[]>(DEFAULT_AP_COLLEGES);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot PIN Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    authApi.getColleges()
      .then((res) => {
        if (res.data.success && res.data.colleges.length > 0) {
          setColleges(res.data.colleges);
          setCollegeId(res.data.colleges[0].id);
        }
      })
      .catch((err) => {
        console.warn('Backend colleges fetch failed, using fallback list:', err);
        setCollegeId(DEFAULT_AP_COLLEGES[0].id);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.driverLogin({
        identifier: identifier.trim(),
        password,
        collegeId: collegeId || colleges[0]?.id || undefined,
      });

      if (res.data.success) {
        login(res.data.token, res.data.user);
        navigate('/driver/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid Driver credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');

    if (newPin.length < 4) {
      setForgotError('PIN must be at least 4 characters.');
      return;
    }
    if (newPin !== confirmPin) {
      setForgotError('New PINs do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authApi.driverRecoverPin({
        identifier: forgotIdentifier.trim(),
        newPassword: newPin,
        collegeId: collegeId || colleges[0]?.id || undefined,
      });

      if (res.data.success) {
        setForgotMsg(res.data.message || 'Driver PIN updated successfully!');
        // Pre-fill login input
        setIdentifier(forgotIdentifier.trim());
        setPassword(newPin);
        setTimeout(() => {
          setShowForgotModal(false);
        }, 1500);
      }
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Failed to reset Driver PIN. Please check your Driver Name or Phone.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between text-pastel-darkText dark:text-white">
      <Navbar />
      <div className="flex-1 flex flex-col justify-center py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 border border-pastel-yellow/60 flex items-center justify-center text-pastel-yellow group-hover:scale-105 transition-transform shadow-pill-teal">
              <Navigation className="w-7 h-7" />
            </div>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Driver Login</h2>
          <p className="text-xs font-semibold subtext-muted">
            SRGEC Live GPS Broadcasting
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="water-glass py-7 px-5 sm:px-8 rounded-3xl sm:rounded-4xl shadow-glass border border-white/80">
            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-900 dark:text-red-200 text-xs flex items-start gap-2.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* College Card Display */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                  Institution
                </label>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-pastel-cream/70 dark:bg-brand-900/40 border border-amber-300 dark:border-white/10">
                  <div className="w-8 h-8 rounded-full bg-brand-600 text-pastel-yellow flex items-center justify-center shrink-0">
                    <School className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold leading-tight">
                    <div className="text-slate-900 dark:text-white font-black">Seshadri Rao Gudlavalleru Engineering College</div>
                    <div className="text-[10px] text-brand-700 dark:text-pastel-yellow font-bold">SRGEC, Gudlavalleru</div>
                  </div>
                </div>
              </div>

              {/* Phone or Driver ID */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                  Phone Number or Driver ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 9876543210 or DRV-01"
                    className="w-full water-glass-input rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm font-bold"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider subtext-muted">
                    Password / PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotIdentifier(identifier);
                      setShowForgotModal(true);
                      setForgotMsg('');
                      setForgotError('');
                    }}
                    className="text-xs text-brand-700 dark:text-pastel-yellow hover:underline font-bold"
                  >
                    Forgot PIN?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full water-glass-input rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm font-bold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-pill-yellow w-full text-xs sm:text-sm py-3.5 gap-2 mt-4"
              >
                {loading ? 'Signing in...' : 'Sign In as Driver'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-5 text-center text-xs font-bold subtext-muted">
              New Driver?{' '}
              <Link to="/driver/register" className="text-brand-700 dark:text-pastel-yellow underline ml-1">
                Register here
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot PIN / Password Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="water-glass max-w-md w-full p-6 sm:p-8 rounded-3xl sm:rounded-4xl shadow-glass border border-white/80 space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-pastel-yellow/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-brand-600 text-pastel-yellow flex items-center justify-center font-bold">
                  🔑
                </div>
                <div>
                  <h3 className="text-base font-black">Reset Driver PIN</h3>
                  <span className="text-[11px] subtext-muted">Instant Driver PIN Recovery</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 rounded-full hover:bg-black/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {forgotError && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotMsg && (
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-start gap-2">
                <span>✅ {forgotMsg}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                  Your Driver Name or Phone Number
                </label>
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="e.g. Ramesh or 7036349676"
                  className="w-full water-glass-input rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                  New Password / PIN (min 4 characters)
                </label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Enter new PIN or password"
                  className="w-full water-glass-input rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                  Confirm New Password / PIN
                </label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Re-enter new PIN or password"
                  className="w-full water-glass-input rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold subtext-muted hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-pill-yellow text-xs py-2.5 px-5"
                >
                  {forgotLoading ? 'Updating...' : 'Set New PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
