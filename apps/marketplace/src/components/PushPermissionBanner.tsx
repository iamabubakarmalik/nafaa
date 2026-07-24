import { useEffect, useState } from 'react';
import { Bell, X, Zap } from 'lucide-react';
import { Card } from '@/ui';
import { profileApi } from '@/features/profile/api/profile.api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

const DISMISSED_KEY = 'push-permission-dismissed-at';
const DISMISS_DAYS = 3;
const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
  return buffer;
}

export function PushPermissionBanner() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuth) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;

    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    const t = setTimeout(() => setShow(true), 30000);
    return () => clearTimeout(t);
  }, [isAuth]);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  const enable = async () => {
    if (!VAPID_KEY) {
      toast.error('Push notifications not configured');
      return;
    }
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.info('You can enable notifications later from settings');
        dismiss();
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      const sub = existingSub || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });

      const platform = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios'
        : /Android/i.test(navigator.userAgent) ? 'android' : 'web';

      await profileApi.registerPushToken({
        token: JSON.stringify(sub),
        platform,
        deviceInfo: { userAgent: navigator.userAgent },
      });

      toast.success('Notifications enabled! 🔔');
      setShow(false);
    } catch (e: any) {
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed top-20 left-4 right-4 lg:top-24 lg:left-auto lg:right-6 lg:max-w-sm z-40 animate-slide-down">
      <Card className="p-4 bg-gradient-to-br from-accent-500 to-orange-600 text-white border-0 shadow-2xl relative overflow-hidden">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 animate-bounce-soft">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-black text-base">Stay updated</div>
            <div className="text-xs opacity-90 mt-0.5">
              Get instant notifications for orders, deals, and messages
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={dismiss}
            className="flex-1 h-10 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold transition"
          >
            Later
          </button>
          <button
            onClick={enable}
            disabled={loading}
            className="flex-1 h-10 rounded-xl bg-white text-accent-700 hover:bg-accent-50 text-sm font-black transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            {loading ? 'Enabling...' : 'Enable'}
          </button>
        </div>
      </Card>
    </div>
  );
}
