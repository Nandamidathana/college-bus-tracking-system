import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { studentApi } from '../../services/api';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { MobileHeader } from '../../components/common/MobileHeader';
import {
  Sun,
  Moon,
  Globe,
  MapPin,
  Bell,
  MessageSquare,
  Smartphone,
  Trash2,
  Info,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Notification toggles
  const [busAlerts, setBusAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [whatsAppAlerts, setWhatsAppAlerts] = useState(false);
  const [locationPerm, setLocationPerm] = useState<'Enabled' | 'Prompt' | 'Denied'>('Enabled');
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    // Check geolocation permission state
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((res) => {
        if (res.state === 'granted') setLocationPerm('Enabled');
        else if (res.state === 'denied') setLocationPerm('Denied');
        else setLocationPerm('Prompt');
      }).catch(() => {});
    }

    // Load saved preferences
    studentApi
      .getPreferences()
      .then((res) => {
        if (res.data.success && res.data.preferences) {
          const p = res.data.preferences;
          setBusAlerts(p.busArrivalAlerts ?? true);
          setSmsAlerts(p.enableSms ?? false);
          setWhatsAppAlerts(p.enableWhatsApp ?? false);
        }
      })
      .catch(() => {});
  }, []);

  const savePreferences = (bus: boolean, sms: boolean, wa: boolean) => {
    studentApi.updatePreferences({
      busArrivalAlerts: bus,
      enableSms: sms,
      enableWhatsApp: wa,
    }).catch(() => {});
  };

  const handleToggleBusAlerts = () => {
    const next = !busAlerts;
    setBusAlerts(next);
    savePreferences(next, smsAlerts, whatsAppAlerts);
  };

  const handleToggleSmsAlerts = () => {
    const next = !smsAlerts;
    setSmsAlerts(next);
    savePreferences(busAlerts, next, whatsAppAlerts);
  };

  const handleToggleWhatsAppAlerts = () => {
    const next = !whatsAppAlerts;
    setWhatsAppAlerts(next);
    savePreferences(busAlerts, smsAlerts, next);
  };

  const handleRequestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationPerm('Enabled'),
        () => setLocationPerm('Denied')
      );
    }
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem('bus_tracker_fav_routes');
      sessionStorage.clear();
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2500);
    } catch {}
  };

  return (
    <MobileAppLayout showBottomNav={true} activeScreenIndex={11}>
      <div className="flex-1 flex flex-col justify-between">
        {/* Header */}
        <MobileHeader title="Settings" showBack={true} />

        <div className="px-5 py-3 space-y-5">
          {/* Section 1: App Settings (Screen 11 Reference Design) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              App Settings
            </h4>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-2 shadow-xs divide-y divide-slate-100 dark:divide-slate-700/60">
              {/* Theme */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Theme
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {/* Language */}
              <div className="w-full flex items-center justify-between p-3 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Language
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <span>English</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Location Permission */}
              <button
                onClick={handleRequestLocation}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Location Permission
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <span className={locationPerm === 'Enabled' ? 'text-emerald-600 font-bold' : ''}>
                    {locationPerm}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Notification Settings with iOS-Style Switches */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Notification Settings
            </h4>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-2 shadow-xs divide-y divide-slate-100 dark:divide-slate-700/60">
              {/* Bus Alerts */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Bus Alerts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBusAlerts}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                    busAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      busAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* SMS Alerts */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    SMS Alerts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSmsAlerts}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                    smsAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      smsAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* WhatsApp Alerts */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    WhatsApp Alerts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleWhatsAppAlerts}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                    whatsAppAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      whatsAppAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Other */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Other
            </h4>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-2 shadow-xs divide-y divide-slate-100 dark:divide-slate-700/60">
              {/* Clear Cache */}
              <button
                onClick={handleClearCache}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Clear Cache
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <span>{cacheCleared ? 'Cleared!' : '12.5 MB'}</span>
                </div>
              </button>

              {/* About App */}
              <div className="w-full flex items-center justify-between p-3 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    About App
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
};
