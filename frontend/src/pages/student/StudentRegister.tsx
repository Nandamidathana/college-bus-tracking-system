import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { MobileHeader } from '../../components/common/MobileHeader';
import { CollegeBusLogo } from '../../components/common/CollegeBusLogo';
import { LocationInput } from '../../components/common/LocationInput';
import {
  User,
  School,
  Lock,
  ArrowRight,
  AlertCircle,
  Hash,
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

  const handleLocationSelect = (loc: { address: string; lat: number; lng: number }) => {
    setBoardingLocation(loc.address);
    setBoardingLat(loc.lat);
    setBoardingLng(loc.lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        collegeId: selectedCollegeId,
        boardingPointName: boardingLocation.trim(),
        password,
      };

      if (boardingLat !== '' && boardingLng !== '') {
        payload.boardingLatitude = Number(boardingLat);
        payload.boardingLongitude = Number(boardingLng);
      }

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
    <MobileAppLayout showBottomNav={false}>
      <div className="flex-1 flex flex-col justify-between">
        <MobileHeader title="Create Account" showBack={true} />

        <div className="px-5 py-4 space-y-4">
          {/* Logo & Subtitle */}
          <div className="text-center pt-1">
            <CollegeBusLogo size="sm" showSubtitle={false} />
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
              Join CollegeBus Live
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set up your student profile and boarding stop
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Roll Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Roll Number / Student ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 22CSE0123"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* College Info */}
            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
              <School className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold truncate">{selectedCollegeObj.name}</span>
            </div>

            {/* Boarding Stop Location */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Your Boarding Stop / Village
              </label>
              <LocationInput
                placeholder="Search boarding stop (e.g. Gudivada, Benz Circle)..."
                value={boardingLocation}
                latitude={boardingLat}
                longitude={boardingLng}
                onChange={(locName, lat, lng) => {
                  setBoardingLocation(locName);
                  setBoardingLat(lat);
                  setBoardingLng(lng);
                }}
                required
              />
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 4 chars"
                    className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Confirm
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat"
                  className="w-full px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 pb-4">
            Already have an account?{' '}
            <Link to="/student/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Login
            </Link>
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
};
