import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { MobileHeader } from '../../components/common/MobileHeader';
import {
  Bus as BusIcon,
  Armchair,
  CheckCircle2,
  Users,
  AlertCircle,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export const SeatAvailabilityScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bus, setBus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOnBoard, setIsOnBoard] = useState(false);
  const [boardingLoading, setBoardingLoading] = useState(false);

  useEffect(() => {
    studentApi
      .getBuses()
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.buses) && res.data.buses.length > 0) {
          const assigned = res.data.buses.find(
            (b: any) =>
              b.id === user?.busId ||
              (user?.routeId && b.routeId === user?.routeId)
          ) || res.data.buses[0];
          setBus(assigned);
        }
      })
      .catch((err) => console.warn('Buses fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  // Socket listener for real-time occupancy updates
  useEffect(() => {
    if (!bus?.id) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('bus:subscribe', { busId: bus.id });
      socket.on('bus:occupancy_updated', (data: any) => {
        if (data.busId === bus.id) {
          setBus((prev: any) => prev ? { ...prev, currentOccupancy: data.currentOccupancy, occupancyStatus: data.occupancyStatus } : prev);
        }
      });
    }

    return () => {
      if (socket && bus?.id) {
        socket.emit('bus:unsubscribe', { busId: bus.id });
        socket.off('bus:occupancy_updated');
      }
    };
  }, [bus?.id]);

  const capacity = bus?.capacity || 50;
  const currentOccupancy = bus?.currentOccupancy ?? 32;
  const seatsAvailable = Math.max(0, capacity - currentOccupancy);
  const percent = Math.min(100, Math.round((currentOccupancy / capacity) * 100));

  // Circular donut geometry
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const handleToggleBoarding = async () => {
    if (!bus?.id) return;
    setBoardingLoading(true);
    try {
      if (!isOnBoard) {
        setIsOnBoard(true);
        setBus((prev: any) => prev ? { ...prev, currentOccupancy: Math.min(capacity, prev.currentOccupancy + 1) } : prev);
      } else {
        setIsOnBoard(false);
        setBus((prev: any) => prev ? { ...prev, currentOccupancy: Math.max(0, prev.currentOccupancy - 1) } : prev);
      }
    } finally {
      setBoardingLoading(false);
    }
  };

  const busNumberDisplay = bus?.busNumber ? (bus.busNumber.startsWith('BUS-') || bus.busNumber.startsWith('Bus ') ? bus.busNumber : `BUS-${bus.busNumber}`) : 'BUS-12';
  const routeNameDisplay = bus?.route?.name || user?.routeName || 'Engineering Route';

  return (
    <MobileAppLayout showBottomNav={true} activeScreenIndex={6}>
      <div className="flex-1 flex flex-col justify-between">
        {/* Header */}
        <MobileHeader title="Seat Availability" showBack={true} />

        <div className="px-5 py-4 space-y-6">
          {/* Main Circular Donut Gauge (Screen 6 Reference Design) */}
          <div className="flex flex-col items-center justify-center pt-2">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="60%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>

                {/* Track background */}
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="14"
                  fill="transparent"
                  className="dark:stroke-slate-700"
                />

                {/* Progress Ring */}
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke="url(#gaugeGradient)"
                  strokeWidth="14"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Center Passengers Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentOccupancy} / {capacity}
                </span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                  Passengers
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Stats List with Colored Dots */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Seats Available</span>
              </div>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{seatsAvailable}</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Occupied</span>
              </div>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{currentOccupancy}</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total Capacity</span>
              </div>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">{capacity}</span>
            </div>
          </div>

          {/* Current Bus Card */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                <BusIcon className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Current Bus
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {busNumberDisplay}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{routeNameDisplay}</p>
              </div>
            </div>

            {/* Boarding Action Toggle */}
            <button
              onClick={handleToggleBoarding}
              disabled={boardingLoading}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                isOnBoard
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isOnBoard ? "On Board" : "I'm on board"}</span>
            </button>
          </div>
        </div>

        {/* Action Button: View Live Tracking */}
        <div className="p-5 pb-6">
          <button
            onClick={() => navigate('/student/live-tracking')}
            className="w-full py-3.5 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>View Live Tracking</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </MobileAppLayout>
  );
};
