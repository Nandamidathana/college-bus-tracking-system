import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { College } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { Navigation, School, Bus, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';

export const DriverRegister: React.FC = () => {
  const [driverName, setDriverName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [colleges, setColleges] = useState<College[]>([]);
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
      .catch((err) => console.error('Failed to load colleges:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        driverName: driverName.trim(),
        busNumber: busNumber.trim().toUpperCase(),
        phone: phone.trim(),
        password,
        collegeId: collegeId || colleges[0]?.id,
      };

      const res = await authApi.driverRegister(payload);
      if (res.data.success) {
        login(res.data.token, res.data.user);
        navigate('/driver/dashboard');
      }
    } catch (err: any) {
      console.error('Driver registration failed:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />
      <div className="flex-1 flex flex-col justify-center py-8 sm:px-6 lg:px-8 px-4">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 border border-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-xl shadow-emerald-500/25">
              <Navigation className="w-7 h-7" />
            </div>
          </Link>
          <h2 className="text-3xl font-black tracking-tight drop-shadow-sm card-title">Driver Registration</h2>
          <p className="text-sm font-semibold subtext-muted">
            Register to broadcast live GPS location for SRGEC college buses.
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
              {/* College Card Display */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 form-label">
                  College
                </label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-slate-800 dark:text-emerald-200">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center shrink-0">
                    <School className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold leading-tight">
                    <div className="text-slate-900 dark:text-white font-black">Seshadri Rao Gudlavalleru Engineering College</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">SRGEC, Gudlavalleru</div>
                  </div>
                </div>
              </div>

              {/* Driver Name */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 form-label">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Ramesh"
                  className="w-full water-glass-input rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none"
                  required
                />
              </div>

              {/* Bus Number */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 form-label">
                  Bus Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Bus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    value={busNumber}
                    onChange={(e) => setBusNumber(e.target.value)}
                    placeholder="e.g. AP 16 TJ 1234 or BUS-05"
                    className="w-full water-glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm uppercase font-bold focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 form-label">
                  Mobile Number (For Login Identifier)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full water-glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none font-bold"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 form-label">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full water-glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all disabled:opacity-50 mt-4 text-sm"
              >
                {loading ? 'Creating Driver Profile...' : 'Complete Registration'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 text-center text-xs font-bold subtext-muted">
              Already registered?{' '}
              <Link to="/driver/login" className="link-emerald underline ml-1">
                Login here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
