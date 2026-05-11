import { useState } from 'react';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { Field, NumberInput, TextInput, Toggle } from './_shared';

export default function SecuritySection({ s, set }: any) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-rose-700 mt-0.5" />
        <div className="text-xs text-rose-900 leading-5">
          Manager PIN ka use sensitive actions ke liye hota hai jaise void, refund, ya bara discount.
        </div>
      </div>

      <div>
        <h4 className="font-bold text-slate-800 mb-2">Manager PIN</h4>
        {s.hasManagerPin && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 mb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-bold text-emerald-900">PIN set hai ✓</span>
          </div>
        )}
        <Field label={s.hasManagerPin ? 'Change PIN (4-6 digits)' : 'Set Manager PIN (4-6 digits)'}>
          <div className="flex gap-2">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPin(v);
                set('managerPin', v || undefined);
              }}
              placeholder="••••"
              maxLength={6}
              className="flex-1 h-11 px-3 rounded-xl border border-slate-200 text-sm font-bold tracking-widest outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              {showPin ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <h4 className="font-bold text-slate-800 mb-2">Require PIN For</h4>
        <Toggle checked={s.requirePinForVoid} onChange={(v) => set('requirePinForVoid', v)} label="Voiding sales" />
        <Toggle checked={s.requirePinForDiscount} onChange={(v) => set('requirePinForDiscount', v)} label="Giving large discounts" />
        <Toggle checked={s.requirePinForRefund} onChange={(v) => set('requirePinForRefund', v)} label="Processing refunds" />
      </div>

      <div className="border-t border-slate-100 pt-3">
        <h4 className="font-bold text-slate-800 mb-2">Sessions</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Auto Logout (minutes)" hint="Inactivity ke baad logout">
            <NumberInput value={s.autoLogoutMinutes} onChange={(v: number) => set('autoLogoutMinutes', v)} min={5} max={480} />
          </Field>
          <Field label="Max Login Attempts">
            <NumberInput value={s.maxLoginAttempts} onChange={(v: number) => set('maxLoginAttempts', v)} min={3} max={10} />
          </Field>
        </div>
        <div className="mt-3">
          <Toggle checked={s.enableTwoFactor} onChange={(v) => set('enableTwoFactor', v)} label="Enable Two-Factor Auth" desc="Login par email OTP zaroori ho" />
        </div>
      </div>
    </div>
  );
}
