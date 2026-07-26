import { useState, type ReactNode } from 'react';
import { Lock, Unlock, Shield, X, KeyRound, AlertTriangle } from 'lucide-react';
import { useAppLock } from './useAppLock';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function AppLockGate({ children, title = 'Locked', description }: Props) {
  const lock = useAppLock();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  if (!lock.isLocked) return <>{children}</>;

  const submit = async () => {
    if (!pin.trim()) return;
    setBusy(true);
    const ok = await lock.unlock(pin);
    setBusy(false);
    if (ok) { toast.success('Unlocked ✓'); setPin(''); }
    else toast.error('Ghalat PIN');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="rounded-3xl bg-white border-4 border-slate-200 shadow-2xl overflow-hidden">
          <div className="relative bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white p-6 sm:p-8 text-center">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl bg-white/15 backdrop-blur mx-auto flex items-center justify-center border-2 border-white/20 shadow-xl">
                <Lock className="h-10 w-10" />
              </div>
              <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold">🔒 {title}</h2>
              <p className="mt-1 text-sm text-white/80 font-semibold">{description || 'PIN daalo unlock karne ke liye'}</p>
            </div>
          </div>
          <div className="p-5 sm:p-6 space-y-4">
            <input
              autoFocus type="password" inputMode="numeric" maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="••••"
              className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-3xl font-extrabold text-center tracking-widest tabular-nums focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-200"
            />
            <button
              onClick={submit} disabled={busy || !pin}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 active:scale-95 text-white font-extrabold text-lg shadow-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Unlock className="h-5 w-5" /> Unlock
            </button>
            <div className="text-center text-xs text-slate-500 font-bold">PIN bhool gaye? Settings → Security</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppLockSetupModal({ mode, onClose }: { mode: 'setup' | 'change' | 'disable'; onClose: () => void }) {
  const lock = useAppLock();
  const [oldPin, setOldPin] = useState('');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === 'setup') {
        if (pin1.length < 4) return toast.error('PIN 4-8 digits ka');
        if (pin1 !== pin2) return toast.error('Dono PIN match nahi karte');
        await lock.setup(pin1);
        toast.success('PIN set ho gaya ✓');
        onClose();
      } else if (mode === 'change') {
        if (pin1.length < 4 || pin1 !== pin2) return toast.error('Naya PIN check karo');
        const ok = await lock.changePin(oldPin, pin1);
        if (!ok) return toast.error('Purana PIN ghalat');
        toast.success('PIN change ho gaya ✓');
        onClose();
      } else {
        const ok = await lock.disable(oldPin);
        if (!ok) return toast.error('PIN ghalat');
        toast.success('PIN off');
        onClose();
      }
    } finally { setBusy(false); }
  };

  const title = mode === 'setup' ? 'PIN Set Karo' : mode === 'change' ? 'PIN Change Karo' : 'PIN Band Karo';
  const emoji = mode === 'setup' ? '🔐' : mode === 'change' ? '🔄' : '🔓';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-200">
        <div className="relative px-5 py-4 bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-6 w-6" />
            <h3 className="font-extrabold text-xl">{emoji} {title}</h3>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {mode === 'setup' && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-3 text-xs font-extrabold text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>PIN yaad rakho! Bhoolne par disable karke naya bana sakte ho — data safe rahega.</span>
            </div>
          )}
          {(mode === 'change' || mode === 'disable') && (
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block tracking-wider">Purana PIN</label>
              <input
                autoFocus type="password" inputMode="numeric" maxLength={8}
                value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••"
                className="h-14 w-full rounded-2xl border-4 border-slate-200 px-4 text-2xl font-extrabold text-center tracking-widest tabular-nums focus:outline-none focus:border-sky-500"
              />
            </div>
          )}
          {mode !== 'disable' && (
            <>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block tracking-wider">
                  {mode === 'change' ? 'Naya PIN' : 'Naya PIN (4-8 digits)'}
                </label>
                <input
                  autoFocus={mode === 'setup'} type="password" inputMode="numeric" maxLength={8}
                  value={pin1} onChange={(e) => setPin1(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="h-14 w-full rounded-2xl border-4 border-slate-200 px-4 text-2xl font-extrabold text-center tracking-widest tabular-nums focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block tracking-wider">PIN Dobara</label>
                <input
                  type="password" inputMode="numeric" maxLength={8}
                  value={pin2} onChange={(e) => setPin2(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="••••"
                  className="h-14 w-full rounded-2xl border-4 border-slate-200 px-4 text-2xl font-extrabold text-center tracking-widest tabular-nums focus:outline-none focus:border-sky-500"
                />
              </div>
            </>
          )}
          <button
            onClick={submit} disabled={busy}
            className={[
              'w-full h-14 rounded-2xl text-white font-extrabold text-lg shadow-lg transition active:scale-95 disabled:opacity-50',
              mode === 'disable' ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700' : 'bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700',
              'inline-flex items-center justify-center gap-2',
            ].join(' ')}
          >
            <Shield className="h-5 w-5" /> Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLockPrivacyToggle({ className }: { className?: string }) {
  const lock = useAppLock();
  return (
    <button
      onClick={lock.toggleHideStats}
      className={className || 'inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-bold backdrop-blur border border-white/20 transition'}
      title={lock.hideStats ? 'Show amounts' : 'Hide amounts'}
    >
      {lock.hideStats ? '👁️‍🗨️' : '👁️'}
      <span className="hidden sm:inline">{lock.hideStats ? 'Show' : 'Hide'}</span>
    </button>
  );
}
