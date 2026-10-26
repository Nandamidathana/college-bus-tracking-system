import React, { useState, useEffect } from 'react';
import { studentApi } from '../../services/api';
import { usePWA } from '../../hooks/usePWA';
import {
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Smartphone,
  Radio,
  Clock,
  Check,
} from 'lucide-react';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ isOpen, onClose }) => {
  const { isSubscribedToPush, subscribeToPush, unsubscribeFromPush, pushLoading } = usePWA();

  const [activeTab, setActiveTab] = useState<'PREFERENCES' | 'HISTORY'>('PREFERENCES');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Preference fields
  const [busArrivalAlerts, setBusArrivalAlerts] = useState(true);
  const [thresholdType, setThresholdType] = useState<'DISTANCE_2KM' | 'STOPS_2' | 'BOTH'>('BOTH');
  const [enableWebPush, setEnableWebPush] = useState(true);
  const [enableSms, setEnableSms] = useState(false);
  const [enableWhatsApp, setEnableWhatsApp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Notification history
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
      loadHistory();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const res = await studentApi.getPreferences();
      if (res.data.success && res.data.preferences) {
        const p = res.data.preferences;
        setBusArrivalAlerts(p.busArrivalAlerts ?? true);
        setThresholdType(p.thresholdType || 'BOTH');
        setEnableWebPush(p.enableWebPush ?? true);
        setEnableSms(p.enableSms ?? false);
        setEnableWhatsApp(p.enableWhatsApp ?? false);
        setPhoneNumber(p.phoneNumber || '');
      }
    } catch (err: any) {
      console.error('Error fetching preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await studentApi.getNotifications();
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notification history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMessage('');
      setSaveSuccess(false);

      // If Web Push is checked but browser not subscribed, prompt browser subscription
      if (enableWebPush && !isSubscribedToPush) {
        const subResult = await subscribeToPush();
        if (!subResult.success && subResult.error) {
          setErrorMessage(`Browser notification notice: ${subResult.error}`);
        }
      } else if (!enableWebPush && isSubscribedToPush) {
        await unsubscribeFromPush();
      }

      await studentApi.updatePreferences({
        busArrivalAlerts,
        thresholdType,
        enableWebPush,
        enableSms,
        enableWhatsApp,
        phoneNumber: phoneNumber.trim() || null,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await studentApi.markAllNotificationsRead();
      loadHistory();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden my-8">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Notification Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Bus arrival alerts and alert preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-5 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('PREFERENCES')}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === 'PREFERENCES'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Alert Preferences
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Recent History ({notifications.length})
          </button>
        </div>

        {activeTab === 'PREFERENCES' ? (
          <form onSubmit={handleSavePreferences} className="p-5 space-y-4">
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Notification preferences saved successfully!
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded-xl flex items-center gap-2 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            {/* Master Arrival Alerts Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">Bus Arrival Alerts</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Notify me when the bus approaches my boarding stop
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={busArrivalAlerts}
                  onChange={(e) => setBusArrivalAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Arrival Threshold Options */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Arrival Alert Trigger Threshold
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'DISTANCE_2KM', title: '2 KM Away', desc: 'Within 2 kilometers' },
                  { id: 'STOPS_2', title: '2 Stops Away', desc: 'Two route stops ahead' },
                  { id: 'BOTH', title: 'Both (Recommended)', desc: 'Whichever occurs first' },
                ].map((thresh) => (
                  <button
                    key={thresh.id}
                    type="button"
                    onClick={() => setThresholdType(thresh.id as any)}
                    className={`p-2.5 rounded-xl text-left border transition-all text-xs ${
                      thresholdType === thresh.id
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-semibold">{thresh.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-normal leading-tight">{thresh.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Channel Options */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Notification Delivery Channels
              </label>

              {/* Web Push */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Web Push Notifications</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Browser background alerts even when app is closed
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableWebPush}
                  onChange={(e) => setEnableWebPush(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* SMS Alert */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">SMS Mobile Alerts</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Direct mobile text message</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableSms}
                  onChange={(e) => setEnableSms(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* WhatsApp Alert */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">WhatsApp Alerts</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Instant transit message updates</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableWhatsApp}
                  onChange={(e) => setEnableWhatsApp(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Phone Number Input (if SMS or WhatsApp is enabled) */}
              {(enableSms || enableWhatsApp) && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Target Mobile Number (with country code)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Required to deliver SMS and WhatsApp transit notifications.</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || pushLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving || pushLoading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">Recent arrival and transit alerts</span>
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading alerts history...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent notifications recorded yet. Alerts will appear here when your bus is approaching.
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                      item.readAt
                        ? 'bg-slate-50/70 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-slate-800 dark:text-slate-200 font-medium'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.busNumber ? `Bus #${item.busNumber}` : 'Campus Transit'}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettingsModal;
