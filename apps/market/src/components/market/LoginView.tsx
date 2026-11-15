'use client';
/**
 * Sign in / sign up: phone number → 6-digit code (new numbers also give a
 * name) → back to where the customer was (?next=). Google goes through the
 * API's OAuth redirect (/auth/google/start).
 */
import { ChevronLeft, Phone } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Button, Input } from '@/components/ui';
import { ClientError, m } from '@/lib/client';
import { normalizePhone } from '@/lib/format';

export function LoginView() {
  const app = useApp();
  const { t } = app;
  const router = useRouter();
  const sp = useSearchParams();
  const rawNext = sp.get('next') || app.href('/');
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : app.href('/');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(sp.get('google') === 'failed' ? t('auth.googleFailed') : null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const send = async () => {
    setError(null);
    const p = normalizePhone(phone);
    if (!p) return setError(t('auth.invalidPhone'));
    setBusy(true);
    try {
      const r = await m<{ isNew: boolean; devCode?: string }>('auth/otp/send', { body: { phone: p } });
      setIsNew(r.isNew);
      setDevCode(r.devCode ?? null);
      setStep('code');
      setWait(60);
    } catch (e) {
      setError(e instanceof ClientError && e.code === 'PHONE' ? t('auth.invalidPhone') : app.errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code)) return setError(t('auth.invalidCode'));
    if (isNew && name.trim().length < 2) return setError(t('checkout.addr.required'));
    setBusy(true);
    try {
      await m('auth/otp/verify', { body: { phone: normalizePhone(phone), code, isNew, fullName: name.trim() } });
      app.setSignedIn(true);
      await app.refreshCart();
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof ClientError && e.code === 'CODE' ? t('auth.invalidCode') : app.errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mx-auto max-w-md p-6 md:p-8">
      {step === 'phone' ? (
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="space-y-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Phone className="h-7 w-7" /></div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{t('auth.title')}</h1>
            <p className="mt-1 text-sm text-gray-600">{t('auth.sub')}</p>
          </div>
          <Input label={t('auth.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="03001234567" maxLength={16} autoFocus error={error} />
          <Button type="submit" block size="lg" loading={busy}>{t('auth.sendCode')}</Button>
          <div className="flex items-center gap-3 text-xs text-gray-400"><span className="h-px flex-1 bg-gray-200" />{t('auth.or')}<span className="h-px flex-1 bg-gray-200" /></div>
          <a href={`/auth/google/start?next=${encodeURIComponent(next)}`} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-semibold text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50">
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.5 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4-13.5-9.6l-7.9 6.1C6.6 42.6 14.6 48 24 48z" /></svg>
            {t('auth.google')}
          </a>
          <p className="text-center text-xs text-gray-500">{t('auth.agree')}</p>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void verify(); }} className="space-y-4">
          <button type="button" onClick={() => { setStep('phone'); setCode(''); }} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600"><ChevronLeft className="h-4 w-4 rtl:rotate-180" />{t('auth.changeNumber')}</button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{isNew ? t('auth.newHere') : t('auth.code')}</h1>
            <p className="num mt-1 text-sm text-gray-600">{t('auth.codeSent', { phone: normalizePhone(phone) ?? phone })}</p>
          </div>
          {isNew && <Input label={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} />}
          <Input
            ref={codeRef}
            label={t('auth.code')}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            className="[&_input]:num [&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.5em]"
            error={error}
            hint={devCode ? t('auth.demoCode', { code: devCode }) : undefined}
          />
          <Button type="submit" block size="lg" loading={busy}>{isNew ? t('auth.createAccount') : t('auth.verify')}</Button>
          <button type="button" disabled={wait > 0 || busy} onClick={send} className="num w-full text-center text-sm font-semibold text-brand-700 disabled:text-gray-400">
            {wait > 0 ? t('auth.resendIn', { s: wait }) : t('auth.resend')}
          </button>
        </form>
      )}
    </div>
  );
}
