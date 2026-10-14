/**
 * Account password. The password signs in to the app; the PIN only opens
 * cost and locked pages, and a forgotten PIN is reset with this password, so
 * it should be strong. People who sign in with Google and have no password
 * yet can set one here.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Button } from '@/design-system/components';
import { authApi } from '@modules/auth/api/auth.api';
import { useAuthStore } from '@core/stores/auth.store';
import { Alert, Field, SectionCard } from '../components/UI';

/** A simple strength measure: length, mixed case, digits, symbols. */
function strengthOf(pw: string) {
  if (!pw) return { score: 0, label: 'Khaali', color: 'bg-slate-300', text: 'text-slate-400' };
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  if (s <= 1) return { score: 1, label: 'Bohat kamzor', color: 'bg-rose-500', text: 'text-rose-600' };
  if (s === 2) return { score: 2, label: 'Kamzor', color: 'bg-orange-500', text: 'text-orange-600' };
  if (s === 3) return { score: 3, label: 'Theek hai', color: 'bg-amber-500', text: 'text-amber-600' };
  if (s === 4) return { score: 4, label: 'Mazboot', color: 'bg-emerald-500', text: 'text-emerald-600' };
  return { score: 5, label: 'Bohat mazboot', color: 'bg-emerald-600', text: 'text-emerald-700' };
}

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

export function AccountPasswordCard() {
  const user = useAuthStore((s: any) => s.user);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  /** Google sign-in accounts may have no password yet: they create one instead of changing it. */
  const isGoogleOnly = !!user?.googleId && user?.hasPassword === false;
  const str = strengthOf(next);

  const changeMut = useMutation({
    mutationFn: () => (isGoogleOnly ? authApi.setPassword(next) : authApi.changePassword(current, next)),
    onSuccess: () => {
      toast.success(isGoogleOnly ? 'Password ban gaya' : 'Password badal gaya');
      setCurrent(''); setNext(''); setConfirm(''); setError('');
    },
    onError: (e: any) => setError(e?.response?.data?.message || 'Password badal nahi saka'),
  });

  const forgotMut = useMutation({
    mutationFn: () => authApi.forgotPassword(user?.email ?? ''),
    onSuccess: () => toast.success(`Reset link ${user?.email} par bhej diya`),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Email nahi gayi'),
  });

  const submit = () => {
    setError('');
    if (!isGoogleOnly && !current) return setError('Purana password likhein');
    if (next.length < 8) return setError('Naya password kam se kam 8 harf ka ho');
    if (next !== confirm) return setError('Dono password ek jaise nahi hain');
    if (!isGoogleOnly && next === current) return setError('Naya password purane se alag hona chahiye');
    changeMut.mutate();
  };

  const eye = (
    <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Password chhupayein' : 'Password dikhayein'}
      className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
      {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
    </button>
  );

  return (
    <SectionCard title="Account password" desc="Is se aap app me login karte hain — PIN se alag cheez hai" icon={KeyRound} color="emerald">
      <div className="space-y-4">
        {isGoogleOnly && (
          <Alert tone="amber" icon={AlertTriangle} title="Abhi koi password nahi hai">
            Aap Google se login karte hain. Ek password bana lein — Google na chale to bhi login ho sakega, aur PIN bhool jane par kaam aayega.
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {!isGoogleOnly && (
            <Field label="Purana password" hint="Jo abhi login me lagta hai">
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={current} autoComplete="current-password" placeholder="••••••••" className={inputCls}
                  onChange={(e) => { setCurrent(e.target.value); setError(''); }} />
                {eye}
              </div>
            </Field>
          )}
          <Field label="Naya password" hint="Kam se kam 8 harf — bare/chhote harf aur number mila kar">
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={next} autoComplete="new-password" placeholder="••••••••" className={inputCls}
                onChange={(e) => { setNext(e.target.value); setError(''); }} />
              {isGoogleOnly && eye}
            </div>
            {next && (
              <div className="mt-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className={cn('h-full rounded-full transition-all duration-300', str.color)} style={{ width: `${(str.score / 5) * 100}%` }} />
                </div>
                <p className={cn('mt-0.5 text-[0.6875rem] font-semibold', str.text)}>{str.label}</p>
              </div>
            )}
          </Field>
          <Field label="Naya password dobara" hint="Wohi naya password dobara likhein">
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={confirm} autoComplete="new-password" placeholder="••••••••" className={inputCls}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && submit()} />
              {confirm && next === confirm && <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />}
            </div>
          </Field>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={submit} loading={changeMut.isPending} disabled={next.length < 8 || next !== confirm} leftIcon={<KeyRound className="h-4 w-4" />}>
            {isGoogleOnly ? 'Password banayein' : 'Password badlein'}
          </Button>
          {!isGoogleOnly && (
            <Button variant="secondary" onClick={() => forgotMut.mutate()} loading={forgotMut.isPending} disabled={!user?.email} leftIcon={<Mail className="h-4 w-4" />}>
              Purana yaad nahi — email par link
            </Button>
          )}
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Password badalne par doosre devices ka login chalta rehta hai. Kisi device ko nikalna ho to neeche "Active devices" se logout karein.
        </p>
      </div>
    </SectionCard>
  );
}
