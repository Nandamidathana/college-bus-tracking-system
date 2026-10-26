import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { Navbar } from '../../components/common/Navbar';
import { LocationInput } from '../../components/common/LocationInput';
import {
  Compass,
  User,
  School,
  KeyRound,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

const DEFAULT_AP_COLLEGES = [
  { id: 'cmtlrqxgq0000v620e5otz0gg', name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)', code: 'SRGEC', latitude: 16.35068, longitude: 81.04273 },
];

export const StudentRegister: React.FC = () => {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [selectedCollegeId, setSelectedCollegeId] = useState(DEFAULT_AP_COLLEGES[0].id);
  const [boardingLocation, setBoardingLocation] = useState('');
  const [boardingLat, setBoardingLat] = useState<number | string>('');
  const [boardingLng, setBoardingLng] = useState<number | string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
          setSelectedCollegeId(res.data.colleges[0].id);
        }
      })
      .catch((err) => console.warn('Backend colleges fetch fallback:', err));
  }, []);

  const selectedCollegeObj = useMemo(
    () => colleges.find((c) => c.id === selectedCollegeId) || colleges[0] || DEFAULT_AP_COLLEGES[0],
    [colleges, selectedCollegeId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (password.length < 4) {
      setError('Password / PIN must be at least 4 characters.');
      return;
    }

    setLoading(true);

    try {
      const finalCollege = selectedCollegeId || colleges[0]?.id || DEFAULT_AP_COLLEGES[0].id;
      const payload: any = {
        name: name.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        collegeId: finalCollege,
        village: boardingLocation.trim() || 'Gudivada Bus Stand',
        boardingPointName: boardingLocation.trim() || 'Gudivada Bus Stand',
        latitude: boardingLat !== '' ? parseFloat(String(boardingLat)) : (selectedCollegeObj?.latitude || 16.35068),
        longitude: boardingLng !== '' ? parseFloat(String(boardingLng)) : (selectedCollegeObj?.longitude || 81.04273),
        password,
      };

      const res = await authApi.studentRegister(payload);
      if (res.data.success) {
        login(res.data.token, res.data.user);
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      const serverErr = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(serverErr || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <div className="flex-1 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-1.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Compass className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Student Registration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Register your student account for campus transit
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="bg-white dark:bg-slate-800 py-7 px-6 sm:px-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name & Roll Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-2 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Roll Number / Student ID
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 21B91A0501"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm font-medium tracking-wide uppercase text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              {/* College Card Display */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Institution
                </label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <School className="w-4 h-4" />
                  </div>
                  <div className="text-xs leading-tight">
                    <div className="font-semibold text-slate-900 dark:text-white">Seshadri Rao Gudlavalleru Engineering College</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">SRGEC, Gudlavalleru - 521356</div>
                  </div>
                </div>
              </div>

              {/* Location Input for Boarding Point */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Boarding Stop / Pick-up Location
                </label>
                <LocationInput
                  value={boardingLocation}
                  latitude={boardingLat}
                  longitude={boardingLng}
                  onChange={(name, lat, lng) => {
                    setBoardingLocation(name);
                    if (lat !== undefined) setBoardingLat(lat);
                    if (lng !== undefined) setBoardingLng(lng);
                  }}
                  placeholder="e.g. Gudivada Bus Stand, Vijayawada Benz Circle..."
                  className="w-full"
                />
              </div>

              {/* Password & Confirm Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Password / PIN
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-2 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-xs mt-3 disabled:opacity-60"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
              Already have an account?{' '}
              <Link to="/student/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-1">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
