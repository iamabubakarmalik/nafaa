import { useState, useEffect, type ReactNode } from 'react';
import { Eye, EyeOff, Lock, Unlock, KeyRound, Shield, Trash2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePrivacyStore } from '../stores/privacy.store';
import { usePermission } from '../hooks/usePermission';
import { PERMISSIONS } from '../lib/permissions';

/* Cost and profit hiding.
   Staff should see sale prices but not purchase cost. The owner unlocks cost
   for a short time with a PIN.

   The PIN lives on the server and is shared by the whole shop, so every
   branch and device uses the same one; each device asks the server on start
   whether a PIN is set. Only the "currently unlocked" state is per device:
   unlocking on the owner's phone does not unlock the counter screen. */

/**
 * Whether cost is hidden right now.
 *
 * Two separate controls:
 *   1. Permission (`cost.view`): users without it never see cost or profit,
 *      regardless of the switch or the PIN.
 *   2. PIN: the owner's own way to hide numbers at the counter and unlock
 *      them briefly when needed.
 *
 * The switch used to be stored per browser (localStorage) only, so a cashier
 * on another machine saw cost, margin and discount by default.
 */
export function useCostHidden() {
  const canSeeCost = usePermission(PERMISSIONS.COST_VIEW);
  const { hideCost, hasPin, unlockedUntil } = usePrivacyStore();
  const [, tick] = useState(0);

  // Re-render when the unlock window ends so values hide again.
  useEffect(() => {
    if (unlockedUntil > Date.now()) {
      const t = setTimeout(() => tick((n) => n + 1), unlockedUntil - Date.now() + 100);
      return () => clearTimeout(t);
    }
  }, [unlockedUntil]);

  // No permission: always hidden, the local switch cannot override it.
  if (!canSeeCost) return true;

  if (!hideCost) return false;
  if (!hasPin) return true;
  return Date.now() >= unlockedUntil;
}

/**
 * Whether the user may ever see cost and profit.
 *
 * Unlike `useCostHidden()`, which reports the current state, this reports
 * the permission. PIN buttons and "forgot PIN" links are hidden without it.
 */
export function useCanSeeCost() {
  return usePermission(PERMISSIONS.COST_VIEW);
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
 * Page-level privacy button.
 *  - No PIN: toggles hide/show directly.
 *  - PIN set and locked: asks for the PIN.
 *  - PIN set and unlocked: locks again.
 */
export function PrivacyToggle({ compact = false }: { compact?: boolean }) {
  const canSeeCost = useCanSeeCost();
  const store = usePrivacyStore();
  const hideCost = useCostHidden();
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const hasPin = store.hasPin;
  const isUnlocked = store.isUnlocked();

  // Without the permission values stay hidden anyway, so the button is pointless.
  if (!canSeeCost) return null;

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
                : 'bg-[#ffffff] dark:bg-ink-900 border-slate-200 dark:border-ink-700 hover:border-sky-300 text-slate-700 dark:text-ink-200',
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

/* Shared PIN field styling: large centered digits. */
const PIN_INPUT = 'h-14 text-center text-2xl font-bold tabular-nums tracking-[0.5em]';
const PIN_INPUT_SMALL = 'h-12 text-center text-xl font-bold tabular-nums tracking-[0.3em]';
const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 8);

/* ─────────────────── PIN prompt ─────────────────── */

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
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={<span className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-600" />{title}</span>}
      description={subtitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Wapas</Button>
          <Button onClick={submit} loading={busy} disabled={pin.length < 4} leftIcon={<Unlock className="h-4 w-4" />}>
            {duration} minute ke liye kholein
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="PIN"
          autoFocus
          data-autofocus
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={(e) => { setPin(onlyDigits(e.target.value)); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="••••"
          error={error || undefined}
          className={PIN_INPUT}
        />

        <div>
          <div className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Kitni der ke liye khula rahe?</div>
          <div className="grid grid-cols-4 gap-1.5">
            {[5, 15, 30, 60].map((m) => (
              <Button
                key={m}
                size="sm"
                variant={duration === m ? 'primary' : 'secondary'}
                onClick={() => setDuration(m)}
                aria-pressed={duration === m}
              >
                {m < 60 ? `${m}m` : '1h'}
              </Button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setForgot(true)}
          className="inline-flex w-full items-center justify-center gap-1 text-xs font-medium text-slate-500 transition hover:text-brand-700"
        >
          <HelpCircle className="h-3.5 w-3.5" /> PIN bhool gaye?
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────── Forgot PIN ─────────────────── */

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
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={<span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4 text-amber-600" />Password se naya PIN</span>}
      description="Wohi password jis se aap login karte hain"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Wapas</Button>
          <Button
            onClick={submit}
            loading={busy}
            disabled={!password || newPin.length < 4 || newPin !== pin2}
            leftIcon={<KeyRound className="h-4 w-4" />}
          >
            Naya PIN set karein
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Account password"
          autoFocus
          data-autofocus
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          placeholder="••••••••"
          size="lg"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Naya PIN"
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={newPin}
            onChange={(e) => { setNewPin(onlyDigits(e.target.value)); setError(''); }}
            placeholder="••••"
            className={PIN_INPUT_SMALL}
          />
          <Input
            label="Dobara likhein"
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pin2}
            onChange={(e) => { setPin2(onlyDigits(e.target.value)); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="••••"
            className={PIN_INPUT_SMALL}
          />
        </div>
        {error && <p role="alert" className="text-center text-xs font-medium text-rose-600">{error}</p>}
        <p className="text-center text-xs leading-relaxed text-slate-500">
          Password bhool gaye hain? Login safhe par "Password bhool gaye" se email par link aa jata hai.
        </p>
      </div>
    </Modal>
  );
}

/* ─────────────────── Set / change / remove PIN ─────────────────── */

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

  const heading = step === 'set' ? (hasPin ? 'PIN badlein' : 'PIN set karein')
    : step === 'remove' ? 'PIN hatayein'
      : 'PIN Settings';

  const footer = step === 'set' ? (
    <>
      <Button variant="secondary" onClick={onClose}>Wapas</Button>
      <Button
        onClick={savePin}
        loading={busy}
        disabled={pin.length < 4 || pin !== pin2 || (hasPin && currentPin.length < 4)}
        leftIcon={<KeyRound className="h-4 w-4" />}
      >
        PIN save karein
      </Button>
    </>
  ) : step === 'remove' ? (
    <>
      <Button variant="secondary" onClick={onClose}>Wapas</Button>
      <Button variant="danger" onClick={removePin} loading={busy} disabled={currentPin.length < 4} leftIcon={<Trash2 className="h-4 w-4" />}>
        PIN hatayein
      </Button>
    </>
  ) : undefined;

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={<span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4 text-emerald-600" />{heading}</span>}
      description="Har device par yehi PIN chalega"
      footer={footer}
    >
      <div className="space-y-3">
        {step === 'menu' && (
          <>
            <MenuOption
              tone="emerald"
              icon={<KeyRound className="h-5 w-5" />}
              title="Naya PIN set karein"
              hint="Purana PIN bhi likhna hoga"
              onClick={() => setStep('set')}
            />
            <MenuOption
              tone="amber"
              icon={<HelpCircle className="h-5 w-5" />}
              title="PIN bhool gaye?"
              hint="Account password se naya PIN"
              onClick={() => setStep('forgot')}
            />
            <MenuOption
              tone="rose"
              icon={<Trash2 className="h-5 w-5" />}
              title="PIN hatayein"
              hint="Cost sab ko dikhne lagegi, page lock bhi hat jayenge"
              onClick={() => setStep('remove')}
            />
          </>
        )}

        {step === 'set' && (
          <>
            {hasPin && (
              <Input
                label="Purana PIN"
                autoFocus
                data-autofocus
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={currentPin}
                onChange={(e) => { setCurrentPin(onlyDigits(e.target.value)); setError(''); }}
                placeholder="••••"
                className={PIN_INPUT_SMALL}
              />
            )}
            <Input
              label="Naya PIN (4-8 hindsay)"
              autoFocus={!hasPin}
              data-autofocus={hasPin ? undefined : true}
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => { setPin(onlyDigits(e.target.value)); setError(''); }}
              placeholder="••••"
              className={PIN_INPUT}
            />
            <Input
              label="Dobara likhein"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin2}
              onChange={(e) => { setPin2(onlyDigits(e.target.value)); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && savePin()}
              placeholder="••••"
              className={PIN_INPUT}
            />
            {error && <p role="alert" className="text-center text-xs font-medium text-rose-600">{error}</p>}
            <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              🔐 Ye PIN server par mehfooz hai — aap jis bhi mobile ya computer se login karein, wohi PIN chalega.
              Kisi ko bata dein to wo bhi apne phone se cost dekh sakega.
            </div>
            {hasPin && (
              <button
                type="button"
                onClick={() => setStep('forgot')}
                className="w-full text-xs font-medium text-slate-500 transition hover:text-brand-700"
              >
                Purana PIN yaad nahi? Password se badlein
              </button>
            )}
          </>
        )}

        {step === 'remove' && (
          <Input
            label="Mojooda PIN"
            autoFocus
            data-autofocus
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={currentPin}
            onChange={(e) => { setCurrentPin(onlyDigits(e.target.value)); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && removePin()}
            placeholder="••••"
            error={error || undefined}
            className={PIN_INPUT}
          />
        )}
      </div>
    </Modal>
  );
}

const MENU_TONES = {
  emerald: { box: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400', icon: 'bg-emerald-600', title: 'text-emerald-900', hint: 'text-emerald-700' },
  amber: { box: 'border-amber-200 bg-amber-50 hover:border-amber-400', icon: 'bg-amber-500', title: 'text-amber-900', hint: 'text-amber-700' },
  rose: { box: 'border-rose-200 bg-rose-50 hover:border-rose-400', icon: 'bg-rose-600', title: 'text-rose-900', hint: 'text-rose-700' },
} as const;

function MenuOption({ tone, icon, title, hint, onClick }: {
  tone: keyof typeof MENU_TONES;
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  const t = MENU_TONES[tone];
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition', t.box)}>
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white', t.icon)}>{icon}</span>
      <span>
        <span className={cn('block text-sm font-semibold', t.title)}>{title}</span>
        <span className={cn('block text-xs', t.hint)}>{hint}</span>
      </span>
    </button>
  );
}

/** Button for the settings page. */
export function PinSettingsButton() {
  const [open, setOpen] = useState(false);
  const hasPin = usePrivacyStore((s) => s.hasPin);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ffffff] dark:bg-ink-900 border-2 border-slate-200 dark:border-ink-700 hover:border-emerald-300 text-sm font-extrabold text-slate-700 dark:text-ink-200 transition">
        <KeyRound className="h-4 w-4 text-emerald-600" />
        {hasPin ? 'PIN Settings' : 'Cost PIN Set Karein'}
      </button>
      {open && <PinSetupModal onClose={() => setOpen(false)} />}
    </>
  );
}
