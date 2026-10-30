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
import { t } from '@core/i18n';

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
    { label: t('Email verify hai'), done: !!user.emailVerified },
    { label: t('Password laga hai'), done: hasPassword },
    { label: t('Google se login jura hai'), done: hasGoogle },
    ...(canManagePin ? [{ label: t('Malik ka PIN laga hai'), done: hasPin }] : []),
  ];
  const score = checks.filter((c) => c.done).length;

  const disconnect = useMutation({
    mutationFn: authApi.disconnectGoogle,
    onSuccess: () => { toast.success(t('Google login hata diya')); qc.invalidateQueries({ queryKey: ['auth-me'] }); },
    onError: (e) => toast.error(errorText(e, t('Google nahi hata'))),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      {pwd && <PasswordModal mode={pwd} onClose={() => setPwd(null)} />}
      {pin && <PinSetupModal onClose={() => setPin(false)} />}

      <Card className="h-fit rounded-3xl" title={t('Hifazat ka haal')} description={t('{{score}} / {{count}} mukammal', { score, count: checks.length })}>
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
        <Row icon={Lock} title={t('Password')} text={hasPassword ? t('Kam se kam 8 huroof. Kisi ko na batayein.') : t('Abhi sirf Google se login hota hai. Password bana lein taake dono chalein.')}
          action={hasPassword ? <Button size="sm" variant="secondary" onClick={() => setPwd('change')}>{t('Badlein')}</Button> : <Button size="sm" onClick={() => setPwd('set')}>{t('Password banayein')}</Button>} />

        <Row icon={Mail} title={t('Email')} text={user.emailVerified ? t('{{email}} · {{emailVerifiedAt}} ko verify hua', { email: user.email, emailVerifiedAt: day(user.emailVerifiedAt) }) : t('{{email}} abhi verify nahi — password bhoolne par isi se wapas aate hain.', { email: user.email })}
          badge={user.emailVerified ? <Badge variant="success" size="xs">{t('Verified')}</Badge> : <Badge variant="warning" size="xs">{t('Baqi')}</Badge>}
          action={!user.emailVerified ? <Button size="sm" onClick={() => navigate('/verify-email')}>{t('Verify karein')}</Button> : undefined} />

        <Row icon={Sparkles} title={t('Google se login')} text={hasGoogle ? t('Google account jura hai — ek click me login.') : t('Google account jor lein to password ke baghair bhi login ho sakta hai.')}
          badge={hasGoogle ? <Badge variant="success" size="xs">{t('Jura hai')}</Badge> : undefined}
          action={hasGoogle
            ? <Button size="sm" variant="critical" disabled={!hasPassword} loading={disconnect.isPending} title={!hasPassword ? t('Pehle password banayein') : undefined}
                onClick={() => disconnect.mutate()}><Unlink className="h-4 w-4" /> {' '}{t('Hatayein')}</Button>
            : <Button size="sm" variant="secondary" onClick={() => { window.location.href = authApi.googleLoginUrl(); }}>{t('Google jorein')}</Button>} />

        {canManagePin && (
          <Row icon={KeyRound} title={t('Malik ka PIN')} text={hasPin ? t('PIN laga hai — cost chhupi rehti hai aur band safhe isi se khulte hain. Poori dukaan ke liye ek.') : t('PIN lagayein taake counter par cost aur profit chhupa rahe.')}
            badge={hasPin ? <Badge variant="success" size="xs">{t('Laga hai')}</Badge> : <Badge variant="warning" size="xs">{t('Nahi')}</Badge>}
            action={<Button size="sm" variant={hasPin ? 'secondary' : 'primary'} onClick={() => setPin(true)}>{hasPin ? t('PIN settings') : t('PIN lagayein')}</Button>} />
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
      toast.success(mode === 'change' ? t('Password badal gaya') : t('Password ban gaya'), { description: signOutOthers ? t('Baqi devices se logout kar diya') : undefined });
      qc.invalidateQueries({ queryKey: ['auth-me'] });
      qc.invalidateQueries({ queryKey: ['active-sessions'] });
      onClose();
    },
    onError: (e) => toast.error(errorText(e, t('Password save nahi hua'))),
  });

  const eye = <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? t('Chhupayein') : t('Dikhayein')} className="pointer-events-auto">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>;
  return (
    <Modal open onClose={onClose} size="sm" title={mode === 'change' ? t('Password badlein') : t('Password banayein')}
      description={mode === 'set' ? t('Ab email aur password se bhi login ho sakega') : undefined}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('Wapas')}</Button>
        <Button onClick={() => save.mutate()} disabled={!ready} loading={save.isPending}>{t('Save karein')}</Button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ready) save.mutate(); }}>
        {mode === 'change' && <Input label={t('Purana password')} type={show ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" data-autofocus rightIcon={eye} />}
        <Input label={t('Naya password')} type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password"
          error={short ? t('Kam se kam 8 huroof') : same ? t('Naya password purane se alag ho') : undefined} rightIcon={mode === 'set' ? eye : undefined} />
        <Input label={t('Naya password dobara')} type={show ? 'text' : 'password'} value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password"
          error={mismatch ? t('Dono password aik jaise nahi') : undefined} />
        <Checkbox label={t('Baqi sab devices se logout kar dein')} checked={signOutOthers} onChange={(e) => setSignOutOthers(e.target.checked)} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
