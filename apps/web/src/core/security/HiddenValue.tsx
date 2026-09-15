import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Unlock, KeyRound, Shield, X, Trash2, Loader2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usePrivacyStore } from '../stores/privacy.store';

/* ═════════════════════════════════════════════════════════════
   COST / PROFIT CHHUPANA
   ─────────────────────────────────────────────────────────────
   Dukaan par mulazim kharid ka bhao nahi dekh sakta — bas bikri
   ka. Malik apna PIN daal kar thori der ke liye khol leta hai.

   PIN ab SERVER par hai, is device par nahi. Matlab malik apne
   ghar ke computer, dukaan ke laptop ya mobile — kahin se bhi
   wohi PIN daal kar dekh sakta hai. Aur agar kisi ko bata de,
   to wo bhi apne phone se dekh lega.

   "Khula hua hai" ki haalat jaan boojh kar har device par alag
   hai: malik ke phone par khulne se counter wale ke screen par
   cost nahi khulti.
   ═════════════════════════════════════════════════════════════ */

/**
 * Cost abhi chhupi hui hai ya nahi.
 *
 * Chhupi hai jab: chhupane ka switch ON ho, aur ya to PIN laga hi
 * na ho (to koi khol hi nahi sakta) ya PIN laga ho magar abhi is
 * device par khula na ho.
 */
export function useCostHidden() {
  const { hideCost, hasPin, unlockedUntil } = usePrivacyStore();
  const [, tick] = useState(0);

  // Unlock ka waqt khatam hote hi safha khud dobara chhup jaye
  useEffect(() => {
    if (unlockedUntil > Date.now()) {
      const t = setTimeout(() => tick((n) => n + 1), unlockedUntil - Date.now() + 100);
      return () => clearTimeout(t);
    }
  }, [unlockedUntil]);

  if (!hideCost) return false;
  if (!hasPin) return true;
  return Date.now() >= unlockedUntil;
}

interface HiddenValueProps {
  value: string | number;
  type?: 'cost' | 'sales' | 'always';
  className?: string;
  mask?: string;
}

export function HiddenValue({ value, type = 'cost', className = '', mask = '••••' }: HiddenValueProps) {
  const hideCost = useCostHidden();
  const { hideSales } = usePrivacyStore();
  const shouldHide = type === 'cost' ? hideCost : type === 'sales' ? hideSales : true;

  if (!shouldHide) return <span className={className}>{value}</span>;

  return (
    <span className={`${className} inline-flex items-center gap-1 select-none opacity-70`}>
      <Lock className="h-3 w-3" />
      <span className="tracking-wider">{mask}</span>
    </span>
  );
}

/**
 * PrivacyToggle — har safhe ke upar wala button.
 *  • PIN nahi laga: seedha chhupao/dikhao
 *  • PIN laga + band: PIN maangta hai
 *  • PIN laga + khula: dobara band karne ka button
 */
export function PrivacyToggle({ compact = false }: { compact?: boolean }) {
  const store = usePrivacyStore();
  const hideCost = useCostHidden();
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const hasPin = store.hasPin;
  const isUnlocked = store.isUnlocked();

  const onClick = () => {
    if (!hasPin) {
      if (!store.hideCost) setShowSetup(true);
      else store.toggleHideCost();
      return;
    }
    if (isUnlocked) {
      store.lock();
      toast.success('🔒 Cost dobara chhup gayi');
    } else {
      setShowPinPrompt(true);
    }
  };

  const label = !hasPin
    ? (store.hideCost ? 'Cost chhupi' : 'Cost khuli')
    : (isUnlocked ? 'Khula hai' : 'PIN Lock 🔒');

  const Icon = !hasPin
    ? (store.hideCost ? EyeOff : Eye)
    : (isUnlocked ? Unlock : Lock);

  return (
    <>
      <button
        onClick={onClick}
        title={hasPin
          ? (isUnlocked ? 'Dobara lock karein' : 'PIN daal kar cost dekhein')
          : (store.hideCost ? 'Cost dikhayein' : 'Cost chhupayein')}
        className={[
          'inline-flex items-center gap-1.5 rounded-xl border-2 font-extrabold text-xs transition',
          compact ? 'h-9 px-2.5' : 'h-11 px-4',
          hasPin && !isUnlocked
            ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
            : hasPin && isUnlocked
              ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
              : store.hideCost
                ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                : 'bg-[#ffffff] dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-sky-300 text-slate-700 dark:text-slate-200',
        ].join(' ')}
      >
        <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {!compact && label}
      </button>

      {showPinPrompt && (
        <PinPromptModal onClose={() => setShowPinPrompt(false)} onSuccess={() => setShowPinPrompt(false)} />
      )}
      {showSetup && <PinSetupModal onClose={() => setShowSetup(false)} />}
    </>
  );
}

/* ─────────────────── PIN maangne wala ─────────────────── */

export function PinPromptModal({
  onClose, onSuccess, title = 'Cost dekhne ke liye PIN', subtitle = 'Sirf malik ko dikhega',
}: {
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}) {
  const store = usePrivacyStore();
  const [pin, setPin] = useState('');
  const [duration, setDuration] = useState(store.unlockMinutes || 15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);

  const submit = async () => {
    if (pin.length < 4) return setError('PIN kam se kam 4 hindson ka hai');
    setBusy(true);
    setError('');
    try {
      const ok = await store.verifyPin(pin);
      if (!ok) {
        setError('Ghalat PIN');
        return;
      }
      store.unlock(duration);
      toast.success(`🔓 ${duration} minute ke liye cost khul gayi`);
      onSuccess();
    } finally {
      setBusy(false);
    }
  };

  if (forgot) {
    return <ForgotPinModal onClose={onClose} onDone={() => { setForgot(false); onSuccess(); }} />;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#ffffff] dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold">
              <Shield className="h-3 w-3 text-emerald-300" /> Sirf Malik
            </div>
            <h3 className="font-extrabold text-lg mt-1.5">{title}</h3>
            <p className="text-xs text-white/70 font-semibold">{subtitle}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">PIN</label>
            <input
              autoFocus type="password" inputMode="numeric" maxLength={8} value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="••••"
              className="h-14 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 text-center text-3xl font-extrabold tabular-nums tracking-[0.5em] focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/30"
            />
            {error && <p className="mt-2 text-xs font-extrabold text-rose-600 text-center">{error}</p>}
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1.5">
              Kitni der ke liye khula rahe?
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 15, 30, 60].map((m) => (
                <button key={m} onClick={() => setDuration(m)}
                  className={[
                    'py-2 rounded-lg text-xs font-extrabold transition',
                    duration === m ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200',
                  ].join(' ')}>
                  {m < 60 ? `${m}m` : '1h'}
                </button>
              ))}
            </div>
          </div>

          <button onClick={submit} disabled={busy || pin.length < 4}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 transition">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
            {duration} minute ke liye kholein
          </button>

          <button onClick={() => setForgot(true)}
            className="w-full text-[11px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-emerald-600 inline-flex items-center justify-center gap-1 transition">
            <HelpCircle className="h-3.5 w-3.5" /> PIN bhool gaye?
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── PIN bhool gaye ─────────────────── */

export function ForgotPinModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const store = usePrivacyStore();
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!password) return setError('Apna account password likhein');
    if (newPin.length < 4) return setError('Naya PIN kam se kam 4 hindson ka ho');
    if (newPin !== pin2) return setError('Dono PIN aik jaise nahi hain');
    setBusy(true);
    setError('');
    try {
      await store.resetPinWithPassword(password, newPin);
      toast.success('Naya PIN set ho gaya ✓');
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'PIN reset nahi hua');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#ffffff] dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold">
              <KeyRound className="h-3 w-3" /> PIN Bhool Gaye
            </div>
            <h3 className="font-extrabold text-lg mt-1.5">Password se naya PIN</h3>
            <p className="text-xs text-white/85 font-semibold">Jis password se aap login karte hain</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Account password</label>
            <input autoFocus type="password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              className="h-12 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-[#ffffff] dark:bg-slate-800 text-slate-900 dark:text-white px-4 font-bold focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200 dark:focus:ring-amber-500/30" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Naya PIN</label>
              <input type="password" inputMode="numeric" maxLength={8} value={newPin}
                onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                placeholder="••••"
                className="h-12 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-[#ffffff] dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-center text-xl font-extrabold tabular-nums tracking-[0.3em] focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Dobara</label>
              <input type="password" inputMode="numeric" maxLength={8} value={pin2}
                onChange={(e) => { setPin2(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="••••"
                className="h-12 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-[#ffffff] dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-center text-xl font-extrabold tabular-nums tracking-[0.3em] focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          {error && <p className="text-xs font-extrabold text-rose-600 text-center">{error}</p>}
          <button onClick={submit} disabled={busy || !password || newPin.length < 4 || newPin !== pin2}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 transition">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Naya PIN Set Karein
          </button>
          <p className="text-[10px] font-bold text-slate-400 text-center leading-relaxed">
            Password bhool gaye hain? Login safhe par "Password bhool gaye" se email par link aa jata hai.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── PIN set / badlein / hatayein ─────────────────── */

export function PinSetupModal({ onClose }: { onClose: () => void }) {
  const store = usePrivacyStore();
  const hasPin = store.hasPin;
  const [step, setStep] = useState<'menu' | 'set' | 'remove' | 'forgot'>(hasPin ? 'menu' : 'set');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const savePin = async () => {
    if (pin.length < 4) return setError('PIN kam se kam 4 hindson ka ho');
    if (pin !== pin2) return setError('Dono PIN aik jaise nahi hain');
    if (hasPin && currentPin.length < 4) return setError('Purana PIN bhi likhein');
    setBusy(true);
    setError('');
    try {
      await store.setPin(pin, hasPin ? currentPin : undefined);
      toast.success(hasPin ? 'PIN badal gaya ✓' : '🔐 PIN set ho gaya — ab cost chhupi hai');
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'PIN save nahi hua');
    } finally {
      setBusy(false);
    }
  };

  const removePin = async () => {
    setBusy(true);
    setError('');
    const ok = await store.removePin({ currentPin });
    setBusy(false);
    if (!ok) return setError('Ghalat PIN');
    toast.success('PIN hata diya — ab cost sab ko dikhegi');
    onClose();
  };

  if (step === 'forgot') {
    return <ForgotPinModal onClose={onClose} onDone={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#ffffff] dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold">
              <KeyRound className="h-3 w-3" /> Malik ka PIN
            </div>
            <h3 className="font-extrabold text-lg mt-1.5">
              {step === 'set' && (hasPin ? 'PIN Badlein' : 'PIN Set Karein')}
              {step === 'menu' && 'PIN Settings'}
              {step === 'remove' && 'PIN Hatayein'}
            </h3>
            <p className="text-xs text-white/85 font-semibold">Har device par yehi PIN chalega</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {step === 'menu' && (
            <>
              <button onClick={() => setStep('set')}
                className="w-full p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-400 flex items-center gap-3 text-left transition">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-extrabold text-emerald-900 dark:text-emerald-200">Naya PIN set karein</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Purana PIN bhi likhna hoga</div>
                </div>
              </button>
              <button onClick={() => setStep('forgot')}
                className="w-full p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 hover:border-amber-400 flex items-center gap-3 text-left transition">
                <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-extrabold text-amber-900 dark:text-amber-200">PIN bhool gaye?</div>
                  <div className="text-xs text-amber-700 dark:text-amber-300 font-semibold">Account password se naya PIN</div>
                </div>
              </button>
              <button onClick={() => setStep('remove')}
                className="w-full p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 hover:border-rose-400 flex items-center gap-3 text-left transition">
                <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-extrabold text-rose-900 dark:text-rose-200">PIN hatayein</div>
                  <div className="text-xs text-rose-700 dark:text-rose-300 font-semibold">Cost sab ko dikhne lagegi, page lock bhi hat jayenge</div>
                </div>
              </button>
            </>
          )}

          {step === 'set' && (
            <>
              {hasPin && (
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Purana PIN</label>
                  <input autoFocus type="password" inputMode="numeric" maxLength={8} value={currentPin}
                    onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                    placeholder="••••"
                    className="h-12 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-[#ffffff] dark:bg-slate-800 text-slate-900 dark:text-white px-4 text-center text-xl font-extrabold tabular-nums tracking-[0.4em] focus:outline-none focus:border-emerald-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Naya PIN (4-8 hindsay)</label>
                <input autoFocus={!hasPin} type="password" inputMode="numeric" maxLength={8} value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                  placeholder="••••"
                  className="h-14 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-[#ffffff] dark:bg-slate-800 text-slate-900 dark:text-white px-4 text-center text-2xl font-extrabold tabular-nums tracking-[0.5em] focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Dobara likhein</label>
                <input type="password" inputMode="numeric" maxLength={8} value={pin2}
                  onChange={(e) => { setPin2(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && savePin()}
                  placeholder="••••"
                  className="h-14 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-[#ffffff] dark:bg-slate-800 text-slate-900 dark:text-white px-4 text-center text-2xl font-extrabold tabular-nums tracking-[0.5em] focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/30" />
              </div>
              {error && <p className="text-xs font-extrabold text-rose-600 text-center">{error}</p>}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                🔐 Ye PIN server par mehfooz hai — aap jis bhi mobile ya computer se login karein, wohi PIN chalega.
                Kisi ko bata dein to wo bhi apne phone se cost dekh sakega.
              </div>
              <button onClick={savePin} disabled={busy || pin.length < 4 || pin !== pin2 || (hasPin && currentPin.length < 4)}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 transition">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} PIN Save Karein
              </button>
              {hasPin && (
                <button onClick={() => setStep('forgot')}
                  className="w-full text-[11px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-amber-600 transition">
                  Purana PIN yaad nahi? Password se badlein
                </button>
              )}
            </>
          )}

          {step === 'remove' && (
            <>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Mojooda PIN</label>
                <input autoFocus type="password" inputMode="numeric" maxLength={8} value={currentPin}
                  onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && removePin()}
                  placeholder="••••"
                  className="h-14 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-[#ffffff] dark:bg-slate-800 text-slate-900 dark:text-white px-4 text-center text-2xl font-extrabold tabular-nums tracking-[0.5em] focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-200 dark:focus:ring-rose-500/30" />
              </div>
              {error && <p className="text-xs font-extrabold text-rose-600 text-center">{error}</p>}
              <button onClick={removePin} disabled={busy || currentPin.length < 4}
                className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 transition">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} PIN Hatayein
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Settings me lagane wala button */
export function PinSettingsButton() {
  const [open, setOpen] = useState(false);
  const hasPin = usePrivacyStore((s) => s.hasPin);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition">
        <KeyRound className="h-4 w-4 text-emerald-600" />
        {hasPin ? 'PIN Settings' : 'Cost PIN Set Karein'}
      </button>
      {open && <PinSetupModal onClose={() => setOpen(false)} />}
    </>
  );
}
