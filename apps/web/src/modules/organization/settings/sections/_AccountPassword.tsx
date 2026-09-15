import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, Mail, ShieldCheck,
} from 'lucide-react';
import { SectionCard, Alert, Field } from '../components/UI';
import { Button } from '@core/ui/Button';
import { authApi } from '@modules/auth/api/auth.api';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   ACCOUNT KA PASSWORD
   ─────────────────────────────────────────────────────────────
   Password badalne ka raasta backend me pehle se tha, magar
   Settings me kahin nazar nahi aata tha — dukaan-daar ko logout
   kar ke "password bhool gaye" wala chakkar chalana parta tha.

   Ye password PIN se alag cheez hai: is se app me LOGIN hota
   hai. PIN sirf cost/lock safhe kholta hai. Aur PIN bhool jane
   par yehi password kaam aata hai, is liye isay mazboot rakhein.
   ═════════════════════════════════════════════════════════════ */

/** Password kitna mazboot hai — sada sa hisab */
function strengthOf(pw: string) {
  if (!pw) return { score: 0, label: 'Khali', color: 'bg-slate-300', text: 'text-slate-400' };
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

export function AccountPasswordCard() {
  const user = useAuthStore((s: any) => s.user);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  /**
   * Google se login karne walon ka koi password hota hi nahi.
   * Un ke liye "badlein" ke bajaye "pehli dafa banayein".
   */
  const isGoogleOnly = !!user?.googleId && user?.hasPassword === false;

  const str = strengthOf(next);

  const changeMut = useMutation({
    mutationFn: () =>
      isGoogleOnly
        ? authApi.setPassword(next)
        : authApi.changePassword(current, next),
    onSuccess: () => {
      toast.success(isGoogleOnly ? 'Password ban gaya ✓' : 'Password badal gaya ✓');
      setCurrent(''); setNext(''); setConfirm(''); setError('');
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || 'Password badal nahi saka'),
  });

  const forgotMut = useMutation({
    mutationFn: () => authApi.forgotPassword(user?.email ?? ''),
    onSuccess: () => toast.success(`Reset link ${user?.email} par bhej diya gaya`),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Email nahi gaya'),
  });

  const submit = () => {
    setError('');
    if (!isGoogleOnly && !current) return setError('Purana password likhein');
    if (next.length < 8) return setError('Naya password kam se kam 8 harf ka ho');
    if (next !== confirm) return setError('Dono password aik jaise nahi hain');
    if (!isGoogleOnly && next === current) return setError('Naya password purane se alag hona chahiye');
    changeMut.mutate();
  };

  const inputCls =
    'w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ' +
    'text-slate-900 dark:text-white px-3 pr-10 text-sm font-bold outline-none focus:border-emerald-500 ' +
    'focus:ring-2 focus:ring-emerald-500/20 transition';

  return (
    <SectionCard
      title="🔑 Account ka Password"
      desc="Is se aap app me login karte hain — PIN se alag cheez hai"
      icon={KeyRound}
      color="emerald"
    >
      <Alert tone="violet" icon={ShieldCheck} title="Password aur PIN ka farq">
        <strong>Password</strong> se app me <em>login</em> hota hai.{' '}
        <strong>PIN</strong> sirf cost aur lock safhe kholta hai.
        PIN bhool jane par yehi password kaam aata hai — is liye isay mazboot rakhein.
      </Alert>

      {isGoogleOnly && (
        <Alert tone="amber" icon={AlertTriangle} title="Abhi koi password nahi hai">
          Aap Google se login karte hain. Ek password bana lein — phone par Google na chal raha ho
          to bhi login ho sakega, aur PIN bhool jane par kaam aayega.
        </Alert>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {!isGoogleOnly && (
          <Field label="Purana password">
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={current} autoComplete="current-password"
                onChange={(e) => { setCurrent(e.target.value); setError(''); }}
                placeholder="••••••••" className={inputCls} />
              <button type="button" onClick={() => setShow((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                {show ? <EyeOff className="h-3.5 w-3.5 text-slate-500" /> : <Eye className="h-3.5 w-3.5 text-slate-500" />}
              </button>
            </div>
          </Field>
        )}

        <Field label={isGoogleOnly ? 'Naya password' : 'Naya password'} hint="kam se kam 8 harf">
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={next} autoComplete="new-password"
              onChange={(e) => { setNext(e.target.value); setError(''); }}
              placeholder="••••••••" className={inputCls} />
          </div>
          {next && (
            <div className="mt-1.5">
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${str.color}`}
                  style={{ width: `${(str.score / 5) * 100}%` }} />
              </div>
              <div className={`text-[10px] font-extrabold mt-0.5 ${str.text}`}>{str.label}</div>
            </div>
          )}
        </Field>

        <Field label="Dobara likhein">
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={confirm} autoComplete="new-password"
              onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="••••••••" className={inputCls} />
            {confirm && next === confirm && (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
        </Field>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 text-xs font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <Button onClick={submit} disabled={changeMut.isPending || next.length < 8 || next !== confirm}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold shadow-lg shadow-emerald-500/30">
          {changeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {isGoogleOnly ? 'Password Banayein' : 'Password Badlein'}
        </Button>

        {!isGoogleOnly && (
          <Button variant="secondary" onClick={() => forgotMut.mutate()}
            disabled={forgotMut.isPending || !user?.email} className="font-extrabold">
            {forgotMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Purana password yaad nahi — email par link
          </Button>
        )}
      </div>

      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
        Password badalne par baqi devices ka login chalta rahega. Kisi device ko nikalna ho to
        neeche "Active Devices" se us ka session revoke karein.
      </p>
    </SectionCard>
  );
}
