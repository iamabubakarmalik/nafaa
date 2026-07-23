import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@shared/ui/Button';

const DISMISSED_KEY = 'nafaa_install_dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const days = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (days < 7) return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 5000); // show after 5s
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  if (!showBanner || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto animate-slide-up">
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 text-white p-4 shadow-soft-xl border border-white/20 relative">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm">Install Nafaa Bazaar</div>
            <div className="text-xs text-white/80 mt-0.5">
              Home screen pe add karein — fast access + offline support
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 bg-white text-brand-700 hover:bg-slate-100"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={install}
            >
              Install App
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
