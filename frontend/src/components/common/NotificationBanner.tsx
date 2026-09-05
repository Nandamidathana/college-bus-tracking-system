import React, { useEffect, useState } from 'react';
import { ProximityAlertPayload } from '../../types';
import { Bell, X, Navigation, AlertTriangle } from 'lucide-react';

interface NotificationBannerProps {
  alert: ProximityAlertPayload | null;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ alert, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  // Play synthetic pleasant sound via Web Audio API
  const playAlertChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.15);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio chime playback omitted:', e);
    }
  };

  useEffect(() => {
    if (alert) {
      setVisible(true);
      playAlertChime();

      // Show browser system notification if granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`🚌 Bus ${alert.busNumber} Approaching!`, {
          body: `Your bus is approximately ${alert.formattedDistance} from ${alert.boardingPointName}.`,
          icon: '/bus-icon.svg',
        });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, [alert]);

  if (!visible || !alert) return null;

  return (
    <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-bounce duration-500">
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 p-4 rounded-2xl shadow-2xl shadow-amber-500/30 border-2 border-amber-300 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
          <Bell className="w-6 h-6 text-slate-950 animate-wiggle" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-extrabold text-sm tracking-wide uppercase flex items-center gap-1.5 text-slate-950">
              <Navigation className="w-4 h-4 fill-slate-950" />
              Bus Approaching (&le; 2 KM)
            </span>
            <button
              onClick={() => {
                setVisible(false);
                onDismiss();
              }}
              className="text-slate-900/70 hover:text-slate-950 p-1 hover:bg-black/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-semibold mt-1 text-slate-900 leading-snug">
            {alert.message}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-900/80">
            <span className="bg-black/15 px-2 py-0.5 rounded-full">
              Distance: {alert.formattedDistance}
            </span>
            <span>•</span>
            <span className="truncate">{alert.boardingPointName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
