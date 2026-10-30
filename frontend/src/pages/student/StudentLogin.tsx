import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { CollegeBusLogo } from '../../components/common/CollegeBusLogo';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Navigation,
  Shield,
  KeyRound,
  User,
} from 'lucide-react';

const DEFAULT_AP_COLLEGES = [
  { id: 'cmtlrqxgq0000v620e5otz0gg', name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)', code: 'SRGEC' },
];

interface LoginScreenProps {
  initialRole?: 'STUDENT' | 'DRIVER' | 'ADMIN';
}

export const StudentLogin: React.FC<LoginScreenProps> = ({ initialRole }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Determine initial role from props or URL
  const getInitialRole = (): 'STUDENT' | 'DRIVER' | 'ADMIN' => {
    if (initialRole) return initialRole;
    if (location.pathname.includes('/driver')) return 'DRIVER';
    if (location.pathname.includes('/admin')) return 'ADMIN';
    return 'STUDENT';
  };

  const [activeRole, setActiveRole] = useState<'STUDENT' | 'DRIVER' | 'ADMIN'>(getInitialRole());
  const [identifier, setIdentifier] = useState('22CSE0123');
  const [password, setPassword] = useState('student123');
  const [showPassword, setShowPassword] = useState(false);
  const [collegeId, setCollegeId] = useState('');
  const [colleges, setColleges] = useState<any[]>(DEFAULT_AP_COLLEGES);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password / PIN Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Switch presets when changing role
  const handleRoleChange = (newRole: 'STUDENT' | 'DRIVER' | 'ADMIN') => {
    setActiveRole(newRole);
    setError('');
    setShowPassword(false);

    if (newRole === 'STUDENT') {
      setIdentifier('22CSE0123');
      setPassword('student123');
    } else if (newRole === 'DRIVER') {
      setIdentifier('Ramesh');
      setPassword('driver123');
    } else if (newRole === 'ADMIN') {
      setIdentifier('admin@srgec.edu');
      setPassword('Admin@123');
    }
  };

  useEffect(() => {
    authApi.getColleges()
      .then((res) => {
        if (res.data.success && res.data.colleges.length > 0) {
          setColleges(res.data.colleges);
          setCollegeId(res.data.colleges[0].id);
        }
      })
      .catch(() => {
        setCollegeId(DEFAULT_AP_COLLEGES[0].id);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeRole === 'STUDENT') {
        const res = await authApi.studentLogin({
          rollNumber: identifier.trim().toUpperCase(),
          password,
          collegeId: collegeId || colleges[0]?.id || undefined,
        });

        if (res.data.success) {
          login(res.data.token, res.data.user);
          navigate('/student/dashboard');
        }
      } else if (activeRole === 'DRIVER') {
        const res = await authApi.driverLogin({
          identifier: identifier.trim(),
          password,
          collegeId: collegeId || colleges[0]?.id || undefined,
        });

        if (res.data.success) {
          login(res.data.token, res.data.user);
          navigate('/driver/dashboard');
        }
      } else if (activeRole === 'ADMIN') {
        const res = await authApi.adminLogin({
          email: identifier.trim().toLowerCase(),
          password,
        });

        if (res.data.success) {
          login(res.data.token, res.data.user);
          navigate('/admin/dashboard');
        }
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      if (activeRole === 'STUDENT') {
        setError(serverMsg || 'Invalid Roll Number or Password.');
      } else if (activeRole === 'DRIVER') {
        setError(serverMsg || 'Invalid Driver Name or Security PIN.');
      } else {
        setError(serverMsg || 'Invalid Administrator credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');

    if (newPin.length < 4) {
      setForgotError('Password must be at least 4 characters.');
      return;
    }
    if (newPin !== confirmPin) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      if (activeRole === 'STUDENT') {
        const res = await authApi.studentRecoverPin({
          rollNumber: forgotInput.trim().toUpperCase(),
          newPassword: newPin,
          collegeId: collegeId || colleges[0]?.id || undefined,
        });
        if (res.data.success) {
          setForgotMsg('Student password updated successfully!');
        }
      } else if (activeRole === 'DRIVER') {
        const res = await authApi.driverRecoverPin({
          identifier: forgotInput.trim(),
          newPassword: newPin,
          collegeId: collegeId || colleges[0]?.id || undefined,
        });
        if (res.data.success) {
          setForgotMsg('Driver PIN updated successfully!');
        }
      } else {
        const res = await authApi.adminRecoverPassword({
          email: forgotInput.trim().toLowerCase(),
          newPassword: newPin,
        });
        if (res.data.success) {
          setForgotMsg('Admin password updated successfully!');
        }
      }

      setTimeout(() => {
        setShowForgotModal(false);
        setPassword(newPin);
        setIdentifier(forgotInput);
      }, 1500);
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Failed to update credentials.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Helper strings per role
  const roleLabels = {
    STUDENT: {
      title: 'Student Portal',
      subtitle: 'Track bus, seats & route arrival in real time',
      idLabel: 'Email / Roll Number',
      idPlaceholder: 'e.g. 22CSE0123',
      passLabel: 'Password',
      passPlaceholder: 'Student Password',
      btnLabel: 'Login as Student',
      btnColor: 'bg-blue-600 hover:bg-blue-700',
    },
    DRIVER: {
      title: 'Driver Console',
      subtitle: 'Broadcast GPS telemetry & live passenger counts',
      idLabel: 'Driver Name or Phone',
      idPlaceholder: 'e.g. Ramesh or 9876543210',
      passLabel: 'Security PIN',
      passPlaceholder: '4-digit PIN',
      btnLabel: 'Sign In to Driver Console',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
    },
    ADMIN: {
      title: 'Transport Admin',
      subtitle: 'Fleet management, arrivals & emergency dispatch',
      idLabel: 'Administrator Email',
      idPlaceholder: 'e.g. admin@srgec.edu',
      passLabel: 'Admin Password',
      passPlaceholder: 'Master Password',
      btnLabel: 'Sign In to Admin Portal',
      btnColor: 'bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900',
    },
  }[activeRole];

  return (
    <MobileAppLayout showBottomNav={false}>
      <div className="flex-1 flex flex-col justify-between px-6 py-4">
        {/* Top Brand Logo */}
        <div className="pt-2">
          <CollegeBusLogo size="md" showSubtitle={true} />
        </div>

        {/* 3-Role Segmented Switcher */}
        <div className="mt-4 mb-3">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleRoleChange('STUDENT')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeRole === 'STUDENT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('DRIVER')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeRole === 'DRIVER'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Driver</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('ADMIN')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeRole === 'ADMIN'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Headings */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {roleLabels.title}
            </h2>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                activeRole === 'STUDENT'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200'
                  : activeRole === 'DRIVER'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200'
              }`}
            >
              {activeRole}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {roleLabels.subtitle}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email / Identifier Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {roleLabels.idLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {activeRole === 'ADMIN' ? (
                  <Mail className="w-4 h-4" />
                ) : activeRole === 'DRIVER' ? (
                  <Navigation className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={roleLabels.idPlaceholder}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {roleLabels.passLabel}
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotInput(identifier);
                  setShowForgotModal(true);
                }}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={roleLabels.passPlaceholder}
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-full ${roleLabels.btnColor} text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{roleLabels.btnLabel}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Fill */}
        <div className="my-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
            Quick One-Tap Demo Fill
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleRoleChange('STUDENT')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                activeRole === 'STUDENT'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Student (22CSE0123)
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('DRIVER')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                activeRole === 'DRIVER'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Driver (Ramesh)
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('ADMIN')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                activeRole === 'ADMIN'
                  ? 'bg-slate-100 text-slate-900 border-slate-400'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Admin (SRGEC)
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1 pb-1">
          {activeRole === 'STUDENT' ? (
            <>
              Don't have an account?{' '}
              <Link
                to="/student/register"
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign Up
              </Link>
            </>
          ) : activeRole === 'DRIVER' ? (
            <>
              New Driver?{' '}
              <Link
                to="/driver/register"
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Register as Driver
              </Link>
            </>
          ) : (
            <>
              College Bus Tracker System &bull; Campus Transit Portal
            </>
          )}
        </div>

        {/* Forgot Password / PIN Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Reset {activeRole} Password / PIN
              </h3>

              {forgotMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{forgotMsg}</span>
                </div>
              )}

              {forgotError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder={roleLabels.idPlaceholder}
                  value={forgotInput}
                  onChange={(e) => setForgotInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <input
                  type="password"
                  required
                  placeholder="New Password (min 4 chars)"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <input
                  type="password"
                  required
                  placeholder="Confirm New Password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs"
                  >
                    {forgotLoading ? 'Updating...' : 'Update Password'}
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
