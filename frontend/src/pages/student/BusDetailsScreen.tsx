import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { CampusBusIllustration } from '../../components/common/CampusBusIllustration';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { MobileHeader } from '../../components/common/MobileHeader';
import {
  Bus as BusIcon,
  MapPin,
  Clock,
  Users,
  Armchair,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const BusDetailsScreen: React.FC = () => {
  const { busId: paramBusId } = useParams<{ busId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bus, setBus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fallback default stops matching reference
  const defaultStops = [
    { name: 'College Gate', eta: 'Now', isCurrent: true },
    { name: 'Main Gate', eta: '5 min', isCurrent: false },
    { name: 'Library', eta: '12 min', isCurrent: false },
    { name: 'Hostel', eta: '18 min', isCurrent: false },
  ];

  useEffect(() => {
    studentApi
      .getBuses()
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.buses)) {
          const target = paramBusId
            ? res.data.buses.find((b: any) => b.id === paramBusId)
            : res.data.buses.find((b: any) => b.id === user?.busId) || res.data.buses[0];
          setBus(target || null);
        }
      })
      .catch((err) => console.warn('Buses fetch error:', err))
      .finally(() => setLoading(false));
  }, [paramBusId, user?.busId]);

  const busNumberDisplay = bus?.busNumber ? (bus.busNumber.startsWith('BUS-') || bus.busNumber.startsWith('Bus ') ? bus.busNumber : `BUS-${bus.busNumber}`) : 'BUS-12';
  const routeNameDisplay = bus?.route?.name || user?.routeName || 'Engineering Route';
  const capacity = bus?.capacity || 50;
  const currentOccupancy = bus?.currentOccupancy ?? 32;
  const seatsAvailable = Math.max(0, capacity - currentOccupancy);

  const stops = bus?.route?.boardingPoints && bus.route.boardingPoints.length > 0
    ? bus.route.boardingPoints.map((bp: any, idx: number) => ({
        name: bp.name,
        eta: idx === 0 ? 'Now' : `${idx * 6} min`,
        isCurrent: idx === 0,
      }))
    : defaultStops;

  return (
    <MobileAppLayout showBottomNav={true} activeScreenIndex={12}>
      <div className="flex-1 flex flex-col justify-between">
        {/* Header */}
        <MobileHeader title="Bus Details" showBack={true} />

        <div className="px-5 py-3 space-y-4">
          {/* Header Banner / Illustration (Screen 12 Reference Design) */}
          <div className="w-full rounded-3xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-700/80">
            <CampusBusIllustration className="w-full h-36 sm:h-40" variant="card" />
          </div>

          {/* Title Row with Live Status Badge */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {busNumberDisplay}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {routeNameDisplay}
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Live</span>
            </div>
          </div>

          {/* 2x2 Grid of Stat Tiles */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Current Location */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Current Location
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                Near College Gate
              </p>
            </div>

            {/* Last Updated */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Last Updated
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                2 min ago
              </p>
            </div>

            {/* Occupancy */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Occupancy
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentOccupancy} / {capacity}
              </p>
            </div>

            {/* Seats Available */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Armchair className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Seats Available
              </span>
              <p className="text-xs font-extrabold text-emerald-600 truncate">
                {seatsAvailable}
              </p>
            </div>
          </div>

          {/* Route Stops Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Route Stops
            </h4>

            <div className="relative pl-6 space-y-4">
              {/* Vertical connecting line */}
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />

              {stops.map((st: any, idx: number) => (
                <div key={idx} className="relative flex items-center justify-between">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                      st.isCurrent
                        ? 'bg-blue-600 border-white ring-2 ring-blue-500 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {st.isCurrent && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>

                  <div>
                    <h5
                      className={`text-xs ${
                        st.isCurrent
                          ? 'font-extrabold text-slate-900 dark:text-white'
                          : 'font-semibold text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {st.name}
                    </h5>
                  </div>

                  <div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        st.isCurrent
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {st.eta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* View Live Tracking Button */}
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
