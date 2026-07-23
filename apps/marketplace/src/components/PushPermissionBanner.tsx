import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@shared/ui/Button';
import { isPushSupported, getNotificationPermission, requestPushPermission } from '@lib/push/webPush';
import { useCustomerAuthStore } from '@stores/customerAuth.store';

const DISMISSED_KEY = 'nafaa_push_dismissed';

export function PushPermissionBanner() {
  const isAuth = useCustomerAuthStore((s) => s.isAuthenticated);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isAuth) return;
    (async () => {
      const supported = await isPushSupported();
      if (!supported) return;
      const perm = await getNotificationPermission();
      if (perm !== 'default') return;

      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) {
        const days = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
        if (days < 3) return;
      }

      setTimeout(() => setShow(true), 15_000); // show after 15s of activity
    })();
  }, [isAuth]);

  const enable = async () => {
    const ok = await requestPushPermission();
    if (ok) {
      toast.success('Notifications enable ho gaye 🔔');
      setShow(false);
    } else {
      toast.error('Permission nahi mili');
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  if (!show) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-40 max-w-md mx-auto animate-slide-down">
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-800 shadow-soft-lg p-4 relative">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center justify-center"
        >
          <X className="h-4 w-4 text-slate-400" />
        </button>
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm text-slate-900 dark:text-white">
              Notifications enable karein
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Order updates, deals, aur bargain replies fauran mile
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" variant="gradient" onClick={enable}>
                Enable
              </Button>
              <button
                onClick={dismiss}
                className="text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Baad mein
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
