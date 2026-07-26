import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Unlock, KeyRound, Shield, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePrivacyStore } from '../stores/privacy.store';

/**
 * Effective hide: hideCost is on AND (no PIN set OR PIN is currently locked)
 */
export function useCostHidden() {
  const { hideCost, pinHash, unlockedUntil } = usePrivacyStore();
  const [, tick] = useState(0);

  // Auto re-render when unlock expires
  useEffect(() => {
    if (unlockedUntil > Date.now()) {
      const t = setTimeout(() => tick((n) => n + 1), unlockedUntil - Date.now() + 100);
      return () => clearTimeout(t);
    }
  }, [unlockedUntil]);

  if (!hideCost) return false;
  if (!pinHash) return true;
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
 * PrivacyToggle — Header button. Shows lock state.
 * • No PIN set:  toggles hide/show
 * • PIN set + locked: opens PIN prompt to unlock
 * • PIN set + unlocked: shows "Lock now" button
 */
export function PrivacyToggle({ compact = false }: { compact?: boolean }) {
  const store = usePrivacyStore();
  const hideCost = useCostHidden();
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const hasPin = store.hasPin();
  const isUnlocked = store.isUnlocked();

  const onClick = () => {
    if (!hasPin) {
      // No PIN — simple toggle, offer PIN setup if enabling
      if (!store.hideCost) {
        setShowSetup(true);
      } else {
        store.toggleHideCost();
      }
      return;
    }
    // PIN exists
    if (isUnlocked) {
      store.lock();
      toast.success('🔒 Cost locked again');
    } else {
      setShowPinPrompt(true);
    }
  };

  const label = !hasPin
    ? (store.hideCost ? 'Cost Hidden' : 'Cost Visible')
    : (isUnlocked ? 'Unlocked' : 'PIN Locked 🔒');

  const Icon = !hasPin
    ? (store.hideCost ? EyeOff : Eye)
    : (isUnlocked ? Unlock : Lock);

  return (
    <>
      <button
        onClick={onClick}
        title={hasPin ? (isUnlocked ? 'Click to lock again' : 'Click to enter PIN') : (store.hideCost ? 'Show cost' : 'Hide cost')}
        className={[
          'inline-flex items-center gap-1.5 rounded-xl border-2 font-extrabold text-xs transition',
          compact ? 'h-9 px-2.5' : 'h-11 px-4',
          hasPin && !isUnlocked
            ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
            : hasPin && isUnlocked
              ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
              : store.hideCost
                ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 hover:border-sky-300 text-slate-700',
        ].join(' ')}
      >
        <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {!compact && label}
      </button>

      {showPinPrompt && (
        <PinPromptModal
          onClose={() => setShowPinPrompt(false)}
          onSuccess={() => setShowPinPrompt(false)}
        />
      )}
      {showSetup && (
        <PinSetupModal
          onClose={() => setShowSetup(false)}
        />
      )}
    </>
  );
}

/**
 * PinPromptModal — Ask for PIN to unlock temporarily
 */
function PinPromptModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const store = usePrivacyStore();
  const [pin, setPin] = useState('');
  const [duration, setDuration] = useState(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (pin.length < 4) return setError('PIN kam se kam 4 digits ka ho');
    setBusy(true);
    setError('');
    try {
      const ok = await store.verifyPin(pin);
      if (!ok) {
        setError('Ghalat PIN');
        setBusy(false);
        return;
      }
      store.unlock(duration);
      toast.success(`🔓 Cost visible for ${duration} minutes`);
      onSuccess();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold">
              <Shield className="h-3 w-3 text-emerald-300" /> Owner Only
            </div>
            <h3 className="font-extrabold text-lg mt-1.5">Cost dekhne ke liye PIN</h3>
            <p className="text-xs text-white/70 font-semibold">Sirf owner ko dikhega</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">PIN</label>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="••••"
              maxLength={8}
              className="h-14 w-full rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 text-center text-3xl font-extrabold tabular-nums tracking-[0.5em] focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200"
            />
            {error && <p className="mt-2 text-xs font-extrabold text-rose-600 text-center">{error}</p>}
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5">
              Kitni der ke liye unlock?
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 15, 30, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={[
                    'py-2 rounded-lg text-xs font-extrabold transition',
                    duration === m ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
                  ].join(' ')}
                >
                  {m < 60 ? `${m}m` : '1h'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={busy || pin.length < 4}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Unlock className="h-4 w-4" />
            Unlock for {duration} minutes
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PinSetupModal — Set / change / remove PIN
 */
function PinSetupModal({ onClose }: { onClose: () => void }) {
  const store = usePrivacyStore();
  const hasPin = store.hasPin();
  const [step, setStep] = useState<'menu' | 'set' | 'confirm' | 'remove'>(hasPin ? 'menu' : 'set');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const savePin = async () => {
    if (pin.length < 4) return setError('PIN kam se kam 4 digits ka ho');
    if (pin !== pin2) return setError('Dono PINs match nahi ho rahe');
    setBusy(true);
    await store.setPin(pin);
    toast.success('🔐 PIN set ho gaya — ab cost hidden hai');
    setBusy(false);
    onClose();
  };

  const removePin = async () => {
    setBusy(true);
    setError('');
    const ok = await store.removePin(currentPin);
    setBusy(false);
    if (!ok) return setError('Ghalat PIN');
    toast.success('PIN hata diya');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold">
              <KeyRound className="h-3 w-3" /> Owner PIN
            </div>
            <h3 className="font-extrabold text-lg mt-1.5">
              {step === 'set' && (hasPin ? 'PIN Change karo' : 'PIN Set karo')}
              {step === 'menu' && 'PIN Settings'}
              {step === 'remove' && 'PIN Hataao'}
            </h3>
            <p className="text-xs text-white/80 font-semibold">Cost/profit sirf aap ko dikhe</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {step === 'menu' && (
            <>
              <button
                onClick={() => setStep('set')}
                className="w-full p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400 flex items-center gap-3 text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-extrabold text-emerald-900">Naya PIN set karo</div>
                  <div className="text-xs text-emerald-700 font-semibold">Purana replace ho jayega</div>
                </div>
              </button>
              <button
                onClick={() => setStep('remove')}
                className="w-full p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 hover:border-rose-400 flex items-center gap-3 text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-extrabold text-rose-900">PIN hataao</div>
                  <div className="text-xs text-rose-700 font-semibold">Cost sab ko dikhne lagega</div>
                </div>
              </button>
            </>
          )}

          {step === 'set' && (
            <>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Naya PIN (4-8 digits)</label>
                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                  placeholder="••••"
                  maxLength={8}
                  className="h-14 w-full rounded-2xl border-2 border-slate-300 px-4 text-center text-2xl font-extrabold tabular-nums tracking-[0.5em] focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Dobara likho</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin2}
                  onChange={(e) => { setPin2(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && savePin()}
                  placeholder="••••"
                  maxLength={8}
                  className="h-14 w-full rounded-2xl border-2 border-slate-300 px-4 text-center text-2xl font-extrabold tabular-nums tracking-[0.5em] focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200"
                />
              </div>
              {error && <p className="text-xs font-extrabold text-rose-600 text-center">{error}</p>}
              <button
                onClick={savePin}
                disabled={busy || pin.length < 4 || pin !== pin2}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" /> PIN Save Karo
              </button>
            </>
          )}

          {step === 'remove' && (
            <>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Current PIN</label>
                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && removePin()}
                  placeholder="••••"
                  maxLength={8}
                  className="h-14 w-full rounded-2xl border-2 border-slate-300 px-4 text-center text-2xl font-extrabold tabular-nums tracking-[0.5em] focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-200"
                />
              </div>
              {error && <p className="text-xs font-extrabold text-rose-600 text-center">{error}</p>}
              <button
                onClick={removePin}
                disabled={busy || currentPin.length < 4}
                className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> PIN Hataao
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PinSettingsButton — Standalone button to open PIN setup (place in Settings page)
 */
export function PinSettingsButton() {
  const [open, setOpen] = useState(false);
  const store = usePrivacyStore();
  const hasPin = store.hasPin();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-sm font-extrabold text-slate-700"
      >
        <KeyRound className="h-4 w-4 text-emerald-600" />
        {hasPin ? 'PIN Settings' : 'Cost PIN Set Karo'}
      </button>
      {open && <PinSetupModal onClose={() => setOpen(false)} />}
    </>
  );
}
