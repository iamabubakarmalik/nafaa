import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Lock, Unlock, Shield, HelpCircle, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { usePrivacyStore } from '../stores/privacy.store';
import { ForgotPinModal } from './HiddenValue';

/* ═════════════════════════════════════════════════════════════
   PAGE LOCK — malik jo safha chahe, band kar de
   ─────────────────────────────────────────────────────────────
   Pehle sirf khata ka safha lock ho sakta tha, aur wo bhi ek
   alag localStorage wale PIN se. Malik chahta tha ke reports,
   kharch, profit — jo bhi wo samjhe — us par bhi PIN lage.

   Ab malik Settings me se safhe chunta hai. Wohi EK PIN (jo
   server par hai) unhein kholta hai. Ek dafa PIN daalne par
   muqarrar der tak sab lock safhe khule rehte hain — har safhe
   par baar baar PIN nahi maanga jata.
   ═════════════════════════════════════════════════════════════ */

/** Kya ye raasta malik ne lock kiya hua hai */
function isLocked(pathname: string, lockedRoutes: string[]) {
  return lockedRoutes.some((r) => {
    if (!r) return false;
    // "/reports" lock karne par "/reports/profit" bhi lock —
    // warna andar ka safha seedha khul jata aur lock be-maani hota.
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

  // Waqt khatam hote hi safha khud dobara band ho jaye
  useEffect(() => {
    if (!store.unlockedUntil || store.unlockedUntil <= Date.now()) return;
    const t = setTimeout(() => tick((n) => n + 1), store.unlockedUntil - Date.now() + 100);
    return () => clearTimeout(t);
  }, [store.unlockedUntil]);

  // Naya safha khulte hi purani ghalti ka paighaam saaf
  useEffect(() => { setPin(''); setError(''); }, [location.pathname]);

  if (!locked) return <>{children}</>;

  const submit = async () => {
    if (pin.length < 4) return setError('PIN kam se kam 4 hindson ka hai');
    setBusy(true);
    setError('');
    try {
      const ok = await store.verifyPin(pin);
      if (!ok) {
        setError('Ghalat PIN');
        setPin('');
        return;
      }
      store.unlock();
      toast.success('🔓 Khul gaya');
    } finally {
      setBusy(false);
    }
  };

  if (forgot) {
    return <ForgotPinModal onClose={() => setForgot(false)} onDone={() => setForgot(false)} />;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="relative bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white p-6 sm:p-8 text-center overflow-hidden">
          <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-sky-400/25 blur-3xl" />
          <div className="relative">
            <div className="h-20 w-20 rounded-3xl bg-white/15 backdrop-blur mx-auto flex items-center justify-center border-2 border-white/25 shadow-xl">
              <Lock className="h-10 w-10" />
            </div>
            <h2 className="mt-4 text-2xl font-black">🔒 Ye Safha Lock Hai</h2>
            <p className="mt-1 text-sm font-bold text-white/85">
              Malik ne is safhe par PIN laga rakha hai
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold border border-white/25">
              <Shield className="h-3 w-3 text-emerald-300" />
              <span className="font-mono">{location.pathname}</span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <input
            autoFocus type="password" inputMode="numeric" maxLength={8} value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="••••"
            className="h-16 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 text-3xl font-extrabold text-center tracking-[0.4em] tabular-nums focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-200 dark:focus:ring-sky-500/30"
          />
          {error && <p className="text-xs font-extrabold text-rose-600 text-center">{error}</p>}

          <button onClick={submit} disabled={busy || pin.length < 4}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 active:scale-[0.98] text-white font-black text-lg shadow-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Unlock className="h-5 w-5" />} Kholein
          </button>

          <p className="text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Ek dafa PIN daalne par {store.unlockMinutes} minute tak saray lock safhe khule rahenge
          </p>

          <div className="flex items-center gap-2">
            <button onClick={() => window.history.back()}
              className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition">
              <ArrowLeft className="h-3.5 w-3.5" /> Wapas
            </button>
            <button onClick={() => setForgot(true)}
              className="flex-1 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition">
              <HelpCircle className="h-3.5 w-3.5" /> PIN bhool gaye?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
