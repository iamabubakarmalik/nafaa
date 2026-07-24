import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Zap, Bell, Wifi } from 'lucide-react';
import { Button, Card } from '@/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed-at';
const DISMISS_DAYS = 7;

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if ((window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone) {
      setInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 15 seconds of engagement
      setTimeout(() => setShow(true), 15000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShow(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShow(false);
    } else {
      dismiss();
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  if (installed || !show || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:max-w-sm z-40 animate-slide-up">
      <Card className="p-4 bg-gradient-brand text-white border-0 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <button
            onClick={dismiss}
            className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-black text-base">Install Nafaa Bazaar</div>
              <div className="text-xs opacity-90 mt-0.5">
                Faster access, works offline, no app store needed
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[
              { icon: Zap, label: 'Fast' },
              { icon: Wifi, label: 'Offline' },
              { icon: Bell, label: 'Notifications' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="p-2 rounded-xl bg-white/15 backdrop-blur text-center">
                  <Icon className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  <div className="text-2xs font-bold">{f.label}</div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={dismiss}
              className="flex-1 h-10 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold transition"
            >
              Not now
            </button>
            <button
              onClick={install}
              className="flex-1 h-10 rounded-xl bg-white text-brand-700 hover:bg-brand-50 text-sm font-black transition flex items-center justify-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              Install
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
