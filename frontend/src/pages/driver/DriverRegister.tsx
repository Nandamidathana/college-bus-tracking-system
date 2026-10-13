import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { College } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { Navigation, School, Bus, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';

const DEFAULT_AP_COLLEGES = [
  { id: 'cmtlrqxgq0000v620e5otz0gg', name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)', code: 'SRGEC' },
];

export const DriverRegister: React.FC = () => {
  const [driverName, setDriverName] = useState('');
  const [collegeId, setCollegeId] = useState(DEFAULT_AP_COLLEGES[0].id);
  const [busNumber, setBusNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [colleges, setColleges] = useState<any[]>(DEFAULT_AP_COLLEGES);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      .catch((err) => console.warn('Backend colleges fetch fallback:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 4) {
      setError('Password / PIN must be at least 4 characters.');
      return;
    }

    setLoading(true);

    try {
      const finalCollege = collegeId || colleges[0]?.id || DEFAULT_AP_COLLEGES[0].id;
      const payload: any = {
        driverName: driverName.trim(),
        busNumber: (busNumber || '01').trim().toUpperCase(),
        phone: phone.trim(),
        password,
        collegeId: finalCollege,
      };

      const res = await authApi.driverRegister(payload);
      if (res.data.success) {
        login(res.data.token, res.data.user);
        navigate('/driver/dashboard');
      }
    } catch (err: any) {
      console.error('Driver registration failed:', err);
      const serverErr = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(serverErr || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
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
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Driver Registration</h2>
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

              {/* Driver Name */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Ramesh"
                  className="w-full water-glass-input rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold"
                  required
                />
              </div>

              {/* Bus Number */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                  Bus Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600">
                    <Bus className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={busNumber}
                    onChange={(e) => setBusNumber(e.target.value)}
                    placeholder="e.g. AP 16 TJ 1234 or BUS-05"
                    className="w-full water-glass-input rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm uppercase font-bold"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                  Mobile Number (For Login Identifier)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full water-glass-input rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                  Password / PIN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full water-glass-input rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-pill-yellow w-full text-xs sm:text-sm py-3.5 gap-2 mt-4"
              >
                {loading ? 'Creating Driver Profile...' : 'Complete Registration'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-5 text-center text-xs font-bold subtext-muted">
              Already registered?{' '}
              <Link to="/driver/login" className="text-brand-700 dark:text-pastel-yellow underline ml-1">
                Login here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
