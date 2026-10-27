import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { MobileHeader } from '../../components/common/MobileHeader';
import {
  Bus as BusIcon,
  Clock,
  MapPin,
  ChevronRight,
  Search,
  Star,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const RoutesScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filterTab, setFilterTab] = useState<'ALL' | 'MY_ROUTE' | 'FAVORITES'>('ALL');
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bus_tracker_fav_routes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    studentApi
      .getBuses()
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.buses)) {
          setBuses(res.data.buses);
        }
      })
      .catch((err) => console.warn('Buses fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('bus_tracker_fav_routes', JSON.stringify(next));
      return next;
    });
  };

  // Mock schedule / fallback data matching reference if real buses lack schedules
  const routeColorPalettes = [
    { iconBg: 'bg-blue-600', badge: 'Live', badgeColor: 'bg-emerald-500 text-white' },
    { iconBg: 'bg-cyan-600', badge: 'On Time', badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    { iconBg: 'bg-emerald-600', badge: 'On Time', badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    { iconBg: 'bg-purple-600', badge: 'Delayed', badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200' },
  ];

  const filteredBuses = buses.filter((b) => {
    if (filterTab === 'MY_ROUTE') {
      return (
        b.id === user?.busId ||
        (user?.routeId && b.routeId === user?.routeId) ||
        b.busNumber === user?.busNumber
      );
    }
    if (filterTab === 'FAVORITES') {
      return favorites.includes(b.id);
    }
    return true;
  });

  return (
    <MobileAppLayout showBottomNav={true} activeScreenIndex={5}>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader title="Bus Routes" showBack={true} />

        <div className="px-4 py-3 space-y-3.5">
          {/* Filter Tabs (Screen 5 Reference Design) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              All Routes
            </button>

            <button
              onClick={() => setFilterTab('MY_ROUTE')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterTab === 'MY_ROUTE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              My Route
            </button>

            <button
              onClick={() => setFilterTab('FAVORITES')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                filterTab === 'FAVORITES'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Favorites</span>
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-12 text-center text-slate-400">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading campus routes...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredBuses.length === 0 && (
            <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 p-6">
              <BusIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Routes Found</p>
              <p className="text-xs mt-1">Try switching to 'All Routes' to view campus corridors.</p>
            </div>
          )}

          {/* Route Cards List */}
          <div className="space-y-3">
            {filteredBuses.map((bus, idx) => {
              const palette = routeColorPalettes[idx % routeColorPalettes.length];
              const isFav = favorites.includes(bus.id);
              const routeName = bus.route?.name || `Route ${bus.busNumber}`;
              const busNumber = bus.busNumber.startsWith('BUS-') || bus.busNumber.startsWith('Bus ') ? bus.busNumber : `BUS-${bus.busNumber}`;

              return (
                <div
                  key={bus.id}
                  onClick={() => navigate(`/student/bus/${bus.id}`)}
                  className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Colorful Bus Squircle Icon */}
                    <div
                      className={`w-12 h-12 rounded-2xl ${palette.iconBg} text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/10 shrink-0`}
                    >
                      <BusIcon className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {routeName}
                      </h4>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        {busNumber}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>8:00 AM - 4:30 PM</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${palette.badgeColor}`}
                    >
                      {palette.badge}
                    </span>

                    {/* Favorite Star */}
                    <button
                      onClick={(e) => toggleFavorite(bus.id, e)}
                      className={`p-1 rounded-full transition-colors ${
                        isFav ? 'text-amber-400' : 'text-slate-300 hover:text-slate-500'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
};
