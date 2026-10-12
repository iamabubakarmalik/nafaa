/**
 * Asks for the owner's PIN before a protected counter action (discount above
 * the limit, credit over a customer's limit, cancelling a bill, a refund).
 * The PIN is checked with the server, then handed back to the caller, which
 * sends it with the request so the server can check it again.
 *
 *   const pin = await askManagerPin('Bill cancel');   // null when cancelled
 *   await withManagerPin('Wapsi', (pin) => api.refund({ ...body, managerPin: pin }));
 */

import { useEffect, useRef, useState } from 'react';
import { Delete, LockKeyhole, WifiOff } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { securityApi } from './security.api';

const MAX = 8;

export function ManagerPinModal({ open, reason, onDone }: {
  open: boolean;
  /** What needs the PIN, e.g. "Bill cancel". */
  reason: string;
  onDone: (pin: string | null) => void;
}) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;

  useEffect(() => { if (open) { setPin(''); setError(''); } }, [open]);

  const submit = async () => {
    if (pin.length < 4) { setError('PIN kam se kam 4 hindson ka hai'); return; }
    setBusy(true);
    setError('');
    try {
      const r = await securityApi.verifyPin(pin);
      if (r.valid) onDone(pin);
      else { setError(r.message || 'Ghalat PIN'); setPin(''); }
    } catch {
      setError('PIN check nahi hua — internet dekhein');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const press = (d: string) => { setError(''); setPin((p) => (p.length < MAX ? p + d : p)); };

  return (
    <Modal open={open} onClose={() => onDone(null)} size="sm" title="Malik ka PIN"
      description={<>Is kaam ke liye PIN chahiye: <b className="text-slate-700">{reason}</b></>}
      footer={
        <div className="flex w-full gap-2">
          <Button variant="secondary" fullWidth onClick={() => onDone(null)}>Wapas</Button>
          <Button fullWidth loading={busy} disabled={offline || pin.length < 4} onClick={submit}>Theek hai</Button>
        </div>
      }>
      {offline ? (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
          <p>PIN internet ke bagair check nahi hota. Net aane par dobara koshish karein.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="relative block">
            <span className="sr-only">PIN</span>
            <input ref={inputRef} data-autofocus type="password" inputMode="numeric" autoComplete="off" value={pin}
              onChange={(e) => { setError(''); setPin(e.target.value.replace(/\D/g, '').slice(0, MAX)); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
              className="absolute inset-0 opacity-0" aria-invalid={!!error} />
            <div className={cn('flex h-16 items-center justify-center gap-3 rounded-2xl border-2 bg-slate-50 transition',
              error ? 'border-rose-300' : 'border-slate-200 focus-within:border-brand-500')}>
              <LockKeyhole className="h-5 w-5 text-slate-400" />
              {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                <span key={i} className={cn('h-3.5 w-3.5 rounded-full transition', i < pin.length ? 'bg-slate-900' : 'bg-slate-300')} />
              ))}
            </div>
          </label>
          <p role="alert" className="min-h-[1.25rem] text-center text-sm font-medium text-rose-600">{error}</p>
          <div className="grid grid-cols-3 gap-2" aria-hidden>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) => k === '' ? <span key="gap" /> : (
              <button key={k} type="button" tabIndex={-1}
                onClick={() => (k === 'del' ? setPin((p) => p.slice(0, -1)) : press(k))}
                className="flex h-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-800 transition hover:bg-slate-200 active:scale-95">
                {k === 'del' ? <Delete className="h-5 w-5" /> : k}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

type Ask = { reason: string; resolve: (pin: string | null) => void };
let show: ((ask: Ask) => void) | null = null;

/** Opens the PIN dialog from anywhere; resolves with the checked PIN, or null. */
export function askManagerPin(reason: string): Promise<string | null> {
  if (!show) return Promise.resolve(null);
  return new Promise((resolve) => show!({ reason, resolve }));
}

/**
 * Runs a request; when the server answers that the owner's PIN is needed,
 * asks for it once and sends the request again with it.
 */
export async function withManagerPin<T>(reason: string, run: (pin?: string) => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    const res = (e as { response?: { status?: number; data?: { message?: string } } })?.response;
    if (res?.status !== 403 || !/PIN chahiye/.test(res.data?.message ?? '')) throw e;
    const pin = await askManagerPin(reason);
    if (!pin) throw new Error('PIN ke bagair nahi hua');
    return run(pin);
  }
}

/** Mounted once in the app shell. */
export function ManagerPinHost() {
  const [ask, setAsk] = useState<Ask | null>(null);
  useEffect(() => {
    show = setAsk;
    return () => { show = null; };
  }, []);
  return <ManagerPinModal open={!!ask} reason={ask?.reason ?? ''} onDone={(pin) => { ask?.resolve(pin); setAsk(null); }} />;
}
