import { useEffect, useState } from 'react';
import { Cookie, X, Check, Settings } from 'lucide-react';
import { Button, Card } from '@/ui';
import { analytics } from '@/lib/analytics';

interface CookiePrefs {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = 'cookie-consent';

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setTimeout(() => setShow(true), 2000);
    } else {
      try {
        const saved = JSON.parse(stored) as CookiePrefs;
        setPrefs(saved);
        if (saved.analytics) {
          analytics.init({
            gaId: import.meta.env.VITE_GA_ID,
            fbPixelId: saved.marketing ? import.meta.env.VITE_FB_PIXEL_ID : undefined,
          });
        }
      } catch {}
    }
  }, []);

  const acceptAll = () => {
    const all = { essential: true, analytics: true, marketing: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    analytics.init({
      gaId: import.meta.env.VITE_GA_ID,
      fbPixelId: import.meta.env.VITE_FB_PIXEL_ID,
    });
    setShow(false);
  };

  const rejectNonEssential = () => {
    const min = { essential: true, analytics: false, marketing: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(min));
    setShow(false);
  };

  const savePrefs = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    if (prefs.analytics) {
      analytics.init({
        gaId: import.meta.env.VITE_GA_ID,
        fbPixelId: prefs.marketing ? import.meta.env.VITE_FB_PIXEL_ID : undefined,
      });
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 lg:bottom-6 inset-x-0 lg:right-6 lg:left-auto lg:max-w-md z-40 p-4 lg:p-0 animate-slide-up">
      <Card className="p-4 shadow-2xl border-2 border-brand-500/30">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Cookie className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-black text-sm">We use cookies 🍪</div>
            <p className="text-2xs text-content-muted mt-1">
              We use cookies to improve your experience, analyze traffic, and personalize content.
              You can choose which to allow.
            </p>
          </div>
        </div>

        {showSettings && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {[
              { key: 'essential', label: 'Essential', desc: 'Required for login and cart', disabled: true },
              { key: 'analytics', label: 'Analytics', desc: 'Help us improve the platform' },
              { key: 'marketing', label: 'Marketing', desc: 'Personalized ads and offers' },
            ].map((c) => (
              <label
                key={c.key}
                className="flex items-start gap-3 p-3 rounded-xl bg-surface-muted cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(prefs as any)[c.key]}
                  onChange={(e) => setPrefs({ ...prefs, [c.key]: e.target.checked })}
                  disabled={c.disabled}
                  className="h-4 w-4 mt-0.5 accent-brand-600"
                />
                <div className="flex-1">
                  <div className="font-black text-xs">{c.label}</div>
                  <div className="text-2xs text-content-muted mt-0.5">{c.desc}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {!showSettings ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                leftIcon={<Settings className="h-3.5 w-3.5" />}
              >
                Customize
              </Button>
              <Button variant="secondary" size="sm" onClick={rejectNonEssential}>
                Essential only
              </Button>
              <Button variant="gradient" size="sm" onClick={acceptAll} leftIcon={<Check className="h-3.5 w-3.5" />}>
                Accept all
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button variant="gradient" size="sm" fullWidth onClick={savePrefs}>
                Save preferences
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
