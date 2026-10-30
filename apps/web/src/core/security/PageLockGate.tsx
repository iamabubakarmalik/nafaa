import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Lock, Unlock, Shield, HelpCircle, ArrowLeft } from 'lucide-react';
import { Button, controlClass } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { toast } from 'sonner';
import { usePrivacyStore } from '../stores/privacy.store';
import { ForgotPinModal } from './HiddenValue';
import { t as tr } from '@core/i18n';

/* Page lock: the owner picks which pages need the PIN.
   The owner selects pages in Settings; the shop's single server-side PIN
   opens them. After one correct PIN every locked page stays open for the
   configured number of minutes, so the PIN is not asked on each page. */

/** Whether the owner has locked this path. */
function isLocked(pathname: string, lockedRoutes: string[]) {
  return lockedRoutes.some((r) => {
    if (!r) return false;
    // Locking "/reports" also locks "/reports/profit"; otherwise a nested
    // page would open directly and the lock would mean nothing.
    return pathname === r || pathname.startsWith(r.endsWith('/') ? r : `${r}/`);
  });
}

export function PageLockGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const store = usePrivacyStore();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);
  const [, tick] = useState(0);

  const locked =
    store.hasPin &&
    isLocked(location.pathname, store.lockedRoutes) &&
    !store.isUnlocked();

  // Re-lock the page as soon as the unlock window ends.
  useEffect(() => {
    if (!store.unlockedUntil || store.unlockedUntil <= Date.now()) return;
    const t = setTimeout(() => tick((n) => n + 1), store.unlockedUntil - Date.now() + 100);
    return () => clearTimeout(t);
  }, [store.unlockedUntil]);

  // Clear the previous error when another page opens.
  useEffect(() => { setPin(''); setError(''); }, [location.pathname]);

  if (!locked) return <>{children}</>;

  const submit = async () => {
    if (pin.length < 4) return setError(tr('PIN kam se kam 4 hindson ka hai'));
    setBusy(true);
    setError('');
    try {
      const ok = await store.verifyPin(pin);
      if (!ok) {
        setError(tr('Ghalat PIN'));
        setPin('');
        return;
      }
      store.unlock();
      toast.success(tr('🔓 Khul gaya'));
    } finally {
      setBusy(false);
    }
  };

  if (forgot) {
    return <ForgotPinModal onClose={() => setForgot(false)} onDone={() => setForgot(false)} />;
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-center text-white sm:p-8">
          <div className="absolute -end-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-bold">{tr('Ye safha lock hai')}</h2>
            <p className="mt-1 text-[0.8125rem] text-white/80">{tr('Malik ne is safhe par PIN laga rakha hai')}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[0.6875rem] font-medium ring-1 ring-white/20">
              <Shield className="h-3 w-3" />
              <span className="font-mono">{location.pathname}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <input
            autoFocus type="password" inputMode="numeric" maxLength={8} value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="••••"
            aria-label={tr('PIN')}
            className={cn(controlClass(Boolean(error)), 'h-14 px-4 text-center text-2xl font-bold tabular-nums tracking-[0.4em]')}
          />
          {error && <p role="alert" className="text-center text-xs font-medium text-rose-600">{error}</p>}

          <Button size="xl" fullWidth onClick={submit} loading={busy} disabled={pin.length < 4} leftIcon={<Unlock className="h-5 w-5" />}>
            {tr('Kholein')}
          </Button>

          <p className="text-center text-[0.75rem] text-slate-500">
            {tr('Ek dafa PIN daalne par {{unlockMinutes}} minute tak saray lock safhe khule rahenge', { unlockMinutes: store.unlockMinutes })}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => window.history.back()} leftIcon={<ArrowLeft className="h-4 w-4 rtl-flip" />}>{tr('Wapas')}</Button>
            <Button variant="ghost" className="text-amber-700" onClick={() => setForgot(true)} leftIcon={<HelpCircle className="h-4 w-4" />}>{tr('PIN bhool gaye?')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
