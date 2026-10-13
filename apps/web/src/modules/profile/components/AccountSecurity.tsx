/**
 * Security tab: a short checklist, password change or set (with an option to
 * sign out other devices), email verification, Google sign-in and the owner
 * PIN that hides cost and locks pages.
 */

import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Eye, EyeOff, KeyRound, Lock, Mail, Sparkles, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Checkbox, Input, Modal } from '@/design-system/components';
import { PinSetupModal } from '@core/security/HiddenValue';
import { usePrivacyStore } from '@core/stores/privacy.store';
import { useAuthStore, type AuthUser } from '@core/stores/auth.store';
import { authApi } from '@modules/auth/api/auth.api';
import { day, errorText } from './meta';

export function AccountSecurity({ user }: { user: AuthUser }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState<null | 'change' | 'set'>(null);
  const [pin, setPin] = useState(false);
  const hasPin = usePrivacyStore((s) => s.hasPin);
  const canManagePin = usePrivacyStore((s) => s.canManage);

  const hasPassword = user.hasPassword !== false;
  const hasGoogle = !!user.googleId;
  const checks = [
    { label: 'Email verify hai', done: !!user.emailVerified },
    { label: 'Password laga hai', done: hasPassword },
    { label: 'Google se login jura hai', done: hasGoogle },
    ...(canManagePin ? [{ label: 'Malik ka PIN laga hai', done: hasPin }] : []),
  ];
  const score = checks.filter((c) => c.done).length;

  const disconnect = useMutation({
    mutationFn: authApi.disconnectGoogle,
    onSuccess: () => { toast.success('Google login hata diya'); qc.invalidateQueries({ queryKey: ['auth-me'] }); },
    onError: (e) => toast.error(errorText(e, 'Google nahi hata')),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      {pwd && <PasswordModal mode={pwd} onClose={() => setPwd(null)} />}
      {pin && <PinSetupModal onClose={() => setPin(false)} />}

      <Card className="h-fit rounded-3xl" title="Hifazat ka haal" description={`${score} / ${checks.length} mukammal`}>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={score === checks.length ? 'h-full bg-emerald-500' : score >= checks.length / 2 ? 'h-full bg-amber-500' : 'h-full bg-rose-500'} style={{ width: `${(score / checks.length) * 100}%` }} />
        </div>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-[0.8125rem]">
              {c.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-slate-300" />}
              <span className={c.done ? 'text-slate-800' : 'text-slate-500'}>{c.label}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-3">
        <Row icon={Lock} title="Password" text={hasPassword ? 'Kam se kam 8 huroof. Kisi ko na batayein.' : 'Abhi sirf Google se login hota hai. Password bana lein taake dono chalein.'}
          action={hasPassword ? <Button size="sm" variant="secondary" onClick={() => setPwd('change')}>Badlein</Button> : <Button size="sm" onClick={() => setPwd('set')}>Password banayein</Button>} />

        <Row icon={Mail} title="Email" text={user.emailVerified ? `${user.email} · ${day(user.emailVerifiedAt)} ko verify hua` : `${user.email} abhi verify nahi — password bhoolne par isi se wapas aate hain.`}
          badge={user.emailVerified ? <Badge variant="success" size="xs">Verified</Badge> : <Badge variant="warning" size="xs">Baqi</Badge>}
          action={!user.emailVerified ? <Button size="sm" onClick={() => navigate('/verify-email')}>Verify karein</Button> : undefined} />

        <Row icon={Sparkles} title="Google se login" text={hasGoogle ? 'Google account jura hai — ek click me login.' : 'Google account jor lein to password ke baghair bhi login ho sakta hai.'}
          badge={hasGoogle ? <Badge variant="success" size="xs">Jura hai</Badge> : undefined}
          action={hasGoogle
            ? <Button size="sm" variant="critical" disabled={!hasPassword} loading={disconnect.isPending} title={!hasPassword ? 'Pehle password banayein' : undefined}
                onClick={() => disconnect.mutate()}><Unlink className="h-4 w-4" /> Hatayein</Button>
            : <Button size="sm" variant="secondary" onClick={() => { window.location.href = authApi.googleLoginUrl(); }}>Google jorein</Button>} />

        {canManagePin && (
          <Row icon={KeyRound} title="Malik ka PIN" text={hasPin ? 'PIN laga hai — cost chhupi rehti hai aur band safhe isi se khulte hain. Poori dukaan ke liye ek.' : 'PIN lagayein taake counter par cost aur profit chhupa rahe.'}
            badge={hasPin ? <Badge variant="success" size="xs">Laga hai</Badge> : <Badge variant="warning" size="xs">Nahi</Badge>}
            action={<Button size="sm" variant={hasPin ? 'secondary' : 'primary'} onClick={() => setPin(true)}>{hasPin ? 'PIN settings' : 'PIN lagayein'}</Button>} />
        )}
      </div>
    </div>
  );
}

function Row({ icon: Icon, title, text, badge, action }: { icon: typeof Lock; title: string; text: string; badge?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900">{title} {badge}</p>
        <p className="text-[0.8125rem] text-slate-500">{text}</p>
      </div>
      {action}
    </div>
  );
}

function PasswordModal({ mode, onClose }: { mode: 'change' | 'set'; onClose: () => void }) {
  const qc = useQueryClient();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [signOutOthers, setSignOutOthers] = useState(true);

  const mismatch = !!again && next !== again;
  const short = !!next && next.length < 8;
  const same = mode === 'change' && !!next && next === current;
  const ready = next.length >= 8 && next === again && !same && (mode === 'set' || !!current);

  const save = useMutation({
    mutationFn: async () => {
      if (mode === 'change') await authApi.changePassword(current, next);
      else await authApi.setPassword(next);
      // A new password should also end sessions on lost or shared devices. Read the
      // token now: a silent refresh during the request may have replaced it.
      const token = useAuthStore.getState().refreshToken;
      if (signOutOthers && token) await authApi.revokeOtherSessions(token).catch(() => undefined);
    },
    onSuccess: () => {
      toast.success(mode === 'change' ? 'Password badal gaya' : 'Password ban gaya', { description: signOutOthers ? 'Baqi devices se logout kar diya' : undefined });
      qc.invalidateQueries({ queryKey: ['auth-me'] });
      qc.invalidateQueries({ queryKey: ['active-sessions'] });
      onClose();
    },
    onError: (e) => toast.error(errorText(e, 'Password save nahi hua')),
  });

  const eye = <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Chhupayein' : 'Dikhayein'} className="pointer-events-auto">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>;
  return (
    <Modal open onClose={onClose} size="sm" title={mode === 'change' ? 'Password badlein' : 'Password banayein'}
      description={mode === 'set' ? 'Ab email aur password se bhi login ho sakega' : undefined}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Wapas</Button>
        <Button onClick={() => save.mutate()} disabled={!ready} loading={save.isPending}>Save karein</Button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ready) save.mutate(); }}>
        {mode === 'change' && <Input label="Purana password" type={show ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" data-autofocus rightIcon={eye} />}
        <Input label="Naya password" type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password"
          error={short ? 'Kam se kam 8 huroof' : same ? 'Naya password purane se alag ho' : undefined} rightIcon={mode === 'set' ? eye : undefined} />
        <Input label="Naya password dobara" type={show ? 'text' : 'password'} value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password"
          error={mismatch ? 'Dono password aik jaise nahi' : undefined} />
        <Checkbox label="Baqi sab devices se logout kar dein" checked={signOutOthers} onChange={(e) => setSignOutOthers(e.target.checked)} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
