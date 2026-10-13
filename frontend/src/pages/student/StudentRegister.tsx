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
    <div className="min-h-screen flex flex-col justify-between text-pastel-darkText dark:text-white">
      <Navbar />
      <div className="flex-1 flex flex-col justify-center py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 border border-pastel-yellow/60 flex items-center justify-center text-pastel-yellow group-hover:scale-105 transition-transform shadow-pill-teal">
              <Compass className="w-7 h-7" />
            </div>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Student Registration</h2>
          <p className="text-xs font-semibold subtext-muted">
            SRGEC Campus Transit System
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="water-glass py-7 px-5 sm:px-8 rounded-3xl sm:rounded-4xl shadow-glass border border-white/80 space-y-6">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-900 dark:text-red-200 text-xs flex items-start gap-2.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name & Roll Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full water-glass-input rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                    Roll Number / Student ID
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 21B91A0501"
                    className="w-full water-glass-input rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold tracking-wider uppercase"
                    required
                  />
                </div>
              </div>

              {/* College Card Display */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 flex items-center justify-between subtext-muted">
                  <span>College</span>
                  <span className="text-[10px] text-brand-700 dark:text-pastel-yellow font-extrabold">Autonomous Institution</span>
                </label>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-pastel-cream/70 dark:bg-brand-900/40 border border-amber-300 dark:border-white/10">
                  <div className="w-8 h-8 rounded-full bg-brand-600 text-pastel-yellow flex items-center justify-center shrink-0">
                    <School className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold leading-tight">
                    <div className="text-slate-900 dark:text-white font-black">Seshadri Rao Gudlavalleru Engineering College</div>
                    <div className="text-[10px] text-brand-700 dark:text-pastel-yellow font-bold">SRGEC, Gudlavalleru - 521356</div>
                  </div>
                </div>
              </div>

              {/* Location Input for Boarding Point */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 flex items-center justify-between subtext-muted">
                  <span>Boarding Stop / Hostel Location</span>
                  <span className="text-[10px] text-brand-700 dark:text-pastel-yellow font-extrabold">Instant GPS Detection</span>
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
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                    Password
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

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 subtext-muted">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full water-glass-input rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-pill-yellow w-full text-xs sm:text-sm py-3.5 gap-2 mt-4"
              >
                {loading ? 'Creating Your Account...' : 'Register & Start Tracking'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center text-xs font-bold subtext-muted">
              Already registered?{' '}
              <Link to="/student/login" className="text-brand-700 dark:text-pastel-yellow underline ml-1">
                Sign In to Your Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
