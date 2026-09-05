import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { Navbar } from '../../components/common/Navbar';
import { Shield, KeyRound, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [collegeCode, setCollegeCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.adminLogin({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.data.success) {
        login(res.data.token, res.data.user);
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid Admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');

    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('New Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authApi.adminRecoverPassword({
        email: forgotEmail.trim().toLowerCase(),
        collegeCode: collegeCode ? collegeCode.trim().toUpperCase() : undefined,
        newPassword,
      });

      if (res.data.success) {
        setForgotMsg(res.data.message || 'Admin Password reset successfully!');
        // Pre-fill main form
        setEmail(forgotEmail.trim());
        setPassword(newPassword);
        setTimeout(() => {
          setShowForgotModal(false);
        }, 1500);
      }
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Failed to reset Admin password. Please check your credentials.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />
      <div className="flex-1 flex flex-col justify-center py-8 sm:px-6 lg:px-8 px-4">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 border border-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-xl shadow-purple-500/25">
              <Shield className="w-7 h-7" />
            </div>
          </Link>
          <h2 className="text-3xl font-black tracking-tight drop-shadow-sm card-title">Admin Console</h2>
          <p className="text-sm font-semibold subtext-muted">
            Sign in to manage college fleet, drivers, routes, and live tracking radar.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="water-glass py-8 px-6 sm:px-10 rounded-3xl shadow-2xl">
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-700 dark:text-red-200 text-sm flex items-start gap-3 shadow-lg font-bold">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Username */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 form-label">
                  Admin Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@srgec.edu or admin"
                    className="w-full water-glass-input rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none font-bold"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider form-label">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                      setForgotMsg('');
                      setForgotError('');
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold transition-colors underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full water-glass-input rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none font-bold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 transition-all disabled:opacity-50 mt-4 text-sm"
              >
                {loading ? 'Authenticating...' : 'Sign In as Administrator'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 text-center text-xs font-bold subtext-muted">
              Need to manage student or driver accounts?{' '}
              <Link to="/" className="link-purple underline ml-1">
                Home Portal
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="water-glass max-w-md w-full p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/20 space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  🔐
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Reset Admin Password</h3>
                  <span className="text-[11px] text-slate-400">College Admin Account Recovery</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {forgotError && (
              <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-start gap-2">
                <span>✅ {forgotMsg}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1 form-label">
                  Admin Email / Username
                </label>
                <input
                  type="text"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. admin@srgec.edu or admin"
                  className="w-full water-glass-input rounded-xl px-4 py-2.5 text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1 form-label">
                  College Code (Optional / Verification)
                </label>
                <input
                  type="text"
                  value={collegeCode}
                  onChange={(e) => setCollegeCode(e.target.value)}
                  placeholder="e.g. SRGEC"
                  className="w-full water-glass-input rounded-xl px-4 py-2.5 text-sm font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1 form-label">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new admin password"
                  className="w-full water-glass-input rounded-xl px-4 py-2.5 text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1 form-label">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new admin password"
                  className="w-full water-glass-input rounded-xl px-4 py-2.5 text-sm font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-xs shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
                >
                  {forgotLoading ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
