import { useState, useEffect } from 'react';
import { publicApi, studentApi } from '../services/api';

// Helper to convert base64 url string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePWA() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isSubscribedToPush, setIsSubscribedToPush] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check existing push subscription if supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribedToPush(!!sub);
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const subscribeToPush = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setPushLoading(true);

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return { success: false, error: 'Push notifications are not supported in this browser.' };
      }

      // Check permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'Notification permission was denied.' };
      }

      // Get VAPID public key
      const keyRes = await publicApi.getVapidKey();
      const vapidKey = keyRes.data.publicKey;

      if (!vapidKey) {
        return { success: false, error: 'VAPID public key is not configured on the server.' };
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
        });
      }

      const raw = sub.toJSON();
      if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
        return { success: false, error: 'Failed to extract subscription keys.' };
      }

      // Register with student backend
      await studentApi.subscribePush({
        endpoint: raw.endpoint,
        keys: {
          p256dh: raw.keys.p256dh,
          auth: raw.keys.auth,
        },
        userAgent: navigator.userAgent,
      });

      setIsSubscribedToPush(true);
      return { success: true };
    } catch (err: any) {
      console.error('[PWA] Push subscription error:', err);
      return { success: false, error: err.message || 'Failed to subscribe to push notifications.' };
    } finally {
      setPushLoading(false);
    }
  };

  const unsubscribeFromPush = async (): Promise<{ success: boolean }> => {
    try {
      setPushLoading(true);
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          await studentApi.unsubscribePush({ endpoint });
        }
      }
      setIsSubscribedToPush(false);
      return { success: true };
    } catch (err) {
      console.error('[PWA] Push unsubscribe error:', err);
      return { success: false };
    } finally {
      setPushLoading(false);
    }
  };

  return {
    isOnline,
    isInstallable,
    promptInstall,
    isSubscribedToPush,
    subscribeToPush,
    unsubscribeFromPush,
    pushLoading,
  };
}
