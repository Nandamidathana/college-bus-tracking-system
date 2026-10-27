import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { MobileHeader } from '../../components/common/MobileHeader';
import {
  User,
  Hash,
  Bus as BusIcon,
  Route as RouteIcon,
  MapPin,
  Bell,
  Users,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  Building,
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const studentName = user?.name || 'Alex';
  const rollNumber = user?.rollNumber || '22CSE0123';
  const branchDisplay = user?.collegeName ? `${user.collegeName}` : 'B.Tech CSE';
  const busDisplay = user?.busNumber ? (user.busNumber.startsWith('BUS-') || user.busNumber.startsWith('Bus ') ? user.busNumber : `BUS-${user.busNumber}`) : 'BUS-12';
  const routeDisplay = user?.routeName || 'Engineering Route';
  const stopDisplay = user?.boardingPoint || 'Main Gate';

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/student/login');
    }
  };

  return (
    <MobileAppLayout showBottomNav={true} activeScreenIndex={10}>
      <div className="flex-1 flex flex-col justify-between">
        {/* Header */}
        <MobileHeader title="Profile" showBack={false} />

        <div className="px-5 py-3 space-y-4">
          {/* Avatar Section (Screen 10 Reference Design) */}
          <div className="flex flex-col items-center justify-center pt-1 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-xl ring-4 ring-blue-50 dark:ring-slate-800 overflow-hidden mb-2">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
                alt={studentName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span>{studentName.slice(0, 2).toUpperCase()}</span>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {studentName}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 max-w-[240px] truncate">
              {branchDisplay}
            </p>
          </div>

          {/* Details Card (Icon + Label + Value rows) */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs divide-y divide-slate-100 dark:divide-slate-700/60">
            {/* Roll Number */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <Hash className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Roll Number</span>
              </div>
              <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">{rollNumber}</span>
            </div>

            {/* Bus Assigned */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <BusIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Bus Assigned</span>
              </div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">{busDisplay}</span>
            </div>

            {/* Route */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                  <RouteIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Route</span>
              </div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[140px] text-right">{routeDisplay}</span>
            </div>

            {/* Stop */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stop</span>
              </div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[140px] text-right">{stopDisplay}</span>
            </div>
          </div>

          {/* Navigation / Settings Menu List */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-2 shadow-xs divide-y divide-slate-100 dark:divide-slate-700/60">
            {/* Notification Settings */}
            <button
              onClick={() => navigate('/student/settings')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Notification Settings
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Parent Tracking */}
            <button
              onClick={() => navigate('/student/parent-tracking')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Parent Tracking
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Help & Support */}
            <button
              onClick={() => setShowSupportModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Help & Support
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* About App */}
            <button
              onClick={() => setShowAboutModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  About App
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Logout Button */}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-full border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Support Modal */}
        {showSupportModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Help & Support</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                For transit emergencies, lost items, or route queries, contact the SRGEC Campus Transportation Cell:
              </p>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <p><strong>Transport Desk:</strong> +91 8674 273737</p>
                <p><strong>Helpline:</strong> transport@srgec.edu.in</p>
                <p><strong>Control Room:</strong> Campus Main Gate Transit Office</p>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="w-full py-2.5 rounded-full bg-blue-600 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* About App Modal */}
        {showAboutModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold mx-auto shadow-md">
                <BusIcon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">CollegeBus Live</h3>
              <p className="text-xs text-slate-500">Version 1.0.0 (Production Release)</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Smart real-time GPS transit monitoring, live bus occupancy, and emergency campus communication for Seshadri Rao Gudlavalleru Engineering College.
              </p>
              <button
                onClick={() => setShowAboutModal(false)}
                className="w-full py-2.5 rounded-full bg-blue-600 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileAppLayout>
  );
};
