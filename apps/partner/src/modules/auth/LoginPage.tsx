/** Sign in with mobile number or email and password. */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, LogIn, Phone } from 'lucide-react';
import { Alert, Button, Input } from '@/design-system/components';
import { errorText } from '@/api/client';
import { partnerApi } from '@/api/partner.api';
import { useAuthStore } from '@/store/auth.store';
import { SUPPORT_PHONE_TEXT, SUPPORT_WHATSAPP } from '@/lib/constants';
import { AuthLayout } from './AuthLayout';

export default function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) { setError('Mobile number (ya email) aur password likhein'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await partnerApi.login(login.trim(), password);
      qc.clear();
      setSession(res);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-7">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Sign in karein</h2>
        <p className="mt-1 text-[0.9375rem] text-slate-500">Partner account me jayein</p>
        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <Input label="Mobile number ya email" size="lg" value={login} onChange={(e) => setLogin(e.target.value)}
            placeholder="03xx xxxxxxx" autoComplete="username" inputMode="email" autoCapitalize="none" leftIcon={<Phone className="h-4 w-4" />} />
          <Input label="Password" size="lg" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={<button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Password chhupayein' : 'Password dikhayein'} className="text-slate-400 hover:text-slate-700">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} />
          <Button type="submit" size="xl" fullWidth loading={busy} leftIcon={<LogIn className="h-5 w-5" />}>Sign in</Button>
        </form>
        <p className="mt-4 text-center text-[0.8125rem] text-slate-500">
          Password bhool gaye? <a className="font-semibold text-brand-700" href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Assalam o alaikum, mera Nafaa partner password reset karna hai.')}`} target="_blank" rel="noreferrer">WhatsApp {SUPPORT_PHONE_TEXT}</a>
        </p>
      </div>
      <div className="mt-4 rounded-3xl bg-brand-50 p-5 text-center ring-1 ring-brand-100">
        <p className="font-semibold text-brand-900">Abhi partner nahi hain?</p>
        <p className="mt-0.5 text-[0.875rem] text-brand-800/80">2 minute me application dein</p>
        <Link to="/apply" className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-[0.9375rem] font-bold text-brand-700 shadow-sm ring-1 ring-brand-200">Partner banein</Link>
      </div>
    </AuthLayout>
  );
}
