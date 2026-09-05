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

  const handleLocationSelect = (locName: string, lat?: number, lng?: number) => {
    setBoardingLocation(locName);
    if (lat !== undefined) setBoardingLat(lat);
    if (lng !== undefined) setBoardingLng(lng);
  };

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
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />
      <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 border border-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-xl shadow-cyan-500/25">
              <Compass className="w-7 h-7" />
            </div>
          </Link>
          <h2 className="text-3xl font-black tracking-tight drop-shadow-sm card-title">Student Registration</h2>
          <p className="text-sm font-semibold subtext-muted">
            Select your college and boarding area to track your college bus in real time.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="water-glass py-8 px-6 sm:px-10 rounded-3xl shadow-2xl space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-700 dark:text-red-200 text-sm flex items-start gap-3 shadow-lg font-bold">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name & Roll Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5 form-label">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full water-glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5 form-label">
                    Roll Number / Student ID
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 21B91A0501"
                    className="w-full water-glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none font-bold tracking-wider uppercase"
                    required
                  />
                </div>
              </div>

              {/* College Selector */}
              {/* College Card Display */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 flex items-center justify-between form-label">
                  <span>College</span>
                  <span className="text-[10px] text-blue-600 dark:text-cyan-300 font-extrabold">Autonomous Institution</span>
                </label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-400/20 text-slate-800 dark:text-cyan-200">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                    <School className="w-4 h-4 text-blue-500 dark:text-cyan-400" />
                  </div>
                  <div className="text-xs font-bold leading-tight">
                    <div className="text-slate-900 dark:text-white font-black">Seshadri Rao Gudlavalleru Engineering College</div>
                    <div className="text-[10px] text-blue-600 dark:text-cyan-400 font-bold">SRGEC, Gudlavalleru - 521356</div>
                  </div>
                </div>
              </div>

              {/* Location Input for Boarding Point */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 flex items-center justify-between form-label">
                  <span>Boarding Stop / Hostel Location</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-extrabold">Instant GPS Detection</span>
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
                  placeholder="e.g. Himaja Boys Hostel, Gudlavalleru Bus Stand..."
                  className="w-full"
                />
              </div>

              {/* Password & Confirm Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5 form-label">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full water-glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5 form-label">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full water-glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none font-bold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 transition-all disabled:opacity-50 mt-4 text-sm"
              >
                {loading ? 'Creating Your Account...' : 'Register & Start Tracking'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center text-xs font-bold subtext-muted">
              Already registered?{' '}
              <Link to="/student/login" className="link-primary underline ml-1">
                Sign In to Your Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
