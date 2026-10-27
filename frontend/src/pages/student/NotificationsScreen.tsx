import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi } from '../../services/api';
import { MobileAppLayout } from '../../components/common/MobileAppLayout';
import { MobileHeader } from '../../components/common/MobileHeader';
import {
  Bus as BusIcon,
  Armchair,
  Route as RouteIcon,
  AlertTriangle,
  Bell,
  Clock,
  CheckCheck,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export const NotificationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState<'ALL' | 'ALERTS' | 'UPDATES'>('ALL');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Standard preset notifications matching reference visual mock with real dynamic fallbacks
  const mockNotifications = [
    {
      id: 'notif-1',
      title: 'Bus Approaching',
      message: 'Your bus is 2 stops away from your stop.',
      timeAgo: '3 min',
      type: 'APPROACHING',
      category: 'ALERT',
      icon: BusIcon,
      iconBg: 'bg-blue-600',
      badge: '3 min',
      badgeColor: 'bg-emerald-500 text-white',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Seat Availability Updated',
      message: 'BUS-12 has 18 seats available.',
      timeAgo: '12 min ago',
      type: 'OCCUPANCY',
      category: 'UPDATE',
      icon: Armchair,
      iconBg: 'bg-emerald-500',
      badge: null,
      read: false,
    },
    {
      id: 'notif-3',
      title: 'Route Update',
      message: 'Minor delay on Engineering Route.',
      timeAgo: '25 min ago',
      type: 'ROUTE',
      category: 'UPDATE',
      icon: RouteIcon,
      iconBg: 'bg-purple-600',
      badge: null,
      read: true,
    },
    {
      id: 'notif-4',
      title: 'Service Alert',
      message: 'BUS-07 is delayed by 10 minutes.',
      timeAgo: '1 hour ago',
      type: 'SERVICE',
      category: 'ALERT',
      icon: AlertTriangle,
      iconBg: 'bg-amber-500',
      badge: null,
      read: true,
    },
    {
      id: 'notif-5',
      title: 'New Announcement',
      message: 'College will remain closed tomorrow.',
      timeAgo: '2 hours ago',
      type: 'ANNOUNCEMENT',
      category: 'ALERT',
      icon: Bell,
      iconBg: 'bg-rose-500',
      badge: null,
      read: true,
    },
  ];

  useEffect(() => {
    studentApi
      .getNotifications()
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.notifications) && res.data.notifications.length > 0) {
          // Map backend notifications to UI cards
          const mapped = res.data.notifications.map((n: any) => ({
            id: n.id,
            title: n.title || (n.type.includes('APPROACH') ? 'Bus Approaching' : 'Campus Notification'),
            message: n.message,
            timeAgo: new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: n.type,
            category: n.type.includes('ALERT') || n.type.includes('DISRUPTION') ? 'ALERT' : 'UPDATE',
            icon: n.type.includes('APPROACH') ? BusIcon : Bell,
            iconBg: n.type.includes('APPROACH') ? 'bg-blue-600' : 'bg-rose-500',
            badge: n.type.includes('APPROACH') ? 'Soon' : null,
            badgeColor: 'bg-emerald-500 text-white',
            read: !!n.readAt,
          }));
          setNotifications(mapped);
        } else {
          setNotifications(mockNotifications);
        }
      })
      .catch(() => {
        setNotifications(mockNotifications);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAllRead = () => {
    studentApi.markAllNotificationsRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkRead = (id: string) => {
    studentApi.markNotificationRead(id).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const filtered = notifications.filter((n) => {
    if (filterTab === 'ALERTS') return n.category === 'ALERT';
    if (filterTab === 'UPDATES') return n.category === 'UPDATE';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <MobileAppLayout showBottomNav={true} unreadNotificationsCount={unreadCount} activeScreenIndex={7}>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader title="Notifications" showBack={true} />

        <div className="px-4 py-3 space-y-3.5">
          {/* Top Filter Chips and Mark All Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterTab === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                All
              </button>

              <button
                onClick={() => setFilterTab('ALERTS')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterTab === 'ALERTS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Alerts
              </button>

              <button
                onClick={() => setFilterTab('UPDATES')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterTab === 'UPDATES'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Updates
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark read</span>
              </button>
            )}
          </div>

          {/* Notifications List (Screen 7 Reference Design) */}
          <div className="space-y-2.5">
            {filtered.map((item) => {
              const Icon = item.icon || Bell;
              return (
                <div
                  key={item.id}
                  onClick={() => handleMarkRead(item.id)}
                  className={`p-3.5 rounded-3xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    item.read
                      ? 'bg-white/70 dark:bg-slate-800/70 border-slate-200/70 dark:border-slate-700/60'
                      : 'bg-white dark:bg-slate-800 border-blue-200/90 dark:border-blue-900/60 shadow-xs ring-1 ring-blue-500/10'
                  }`}
                >
                  {/* Colorful Rounded Icon */}
                  <div
                    className={`w-11 h-11 rounded-2xl ${item.iconBg} text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/10 mt-0.5`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{item.timeAgo}</span>
                    </div>
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
