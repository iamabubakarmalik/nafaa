/**
 * Admin sign-in: email and password, then the 6-digit code from the
 * authenticator app (or a backup code) when two-step sign-in is on.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, KeyRound, Smartphone } from 'lucide-react';
import { Button, Input } from '@/design-system/components';
import { adminAuthApi } from '@/api/admin-auth.api';
import { useAuthStore } from '@/store/auth.store';
import { AuthFrame } from '../components/AuthFrame';

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [useBackup, setUseBackup] = useState(false);

  const login = useMutation({
    mutationFn: () => adminAuthApi.login(email.trim(), password, needsCode ? code.trim() : undefined),
    onSuccess: (data) => {
      if (data.twoFactorRequired) { setNeedsCode(true); return; }
      setSession(data);
      navigate('/dashboard');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message || 'Sign-in failed'),
  });

  return (
    <AuthFrame title="Nafaa Admin" subtitle={needsCode ? 'One more step' : 'Sign in to the platform control panel'}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email || !password) { toast.error('Enter your email and password'); return; }
          if (needsCode && !code.trim()) return;
          login.mutate();
        }}
        className="space-y-4"
      >
        {needsCode ? (
          <>
            <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-3 text-[0.8125rem] text-brand-900 ring-1 ring-brand-100">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0" />
              {useBackup ? 'Enter one of your backup codes. Each works once.' : 'Open your authenticator app and enter the 6-digit code for Nafaa Admin.'}
            </div>
            <Input
              key={useBackup ? 'backup' : 'totp'}
              label={useBackup ? 'Backup code' : '6-digit code'}
              value={code}
              onChange={(e) => setCode(useBackup ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode={useBackup ? 'text' : 'numeric'}
              autoComplete="one-time-code"
              placeholder={useBackup ? 'XXXX-XXXX' : '123456'}
              autoFocus
              size="lg"
            />
            <Button type="submit" fullWidth size="lg" loading={login.isPending} rightIcon={<ArrowRight className="h-4 w-4" />}>Verify and sign in</Button>
            <div className="flex items-center justify-between text-[0.8125rem]">
              <button type="button" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900" onClick={() => { setNeedsCode(false); setCode(''); }}><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
              <button type="button" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline" onClick={() => { setUseBackup((v) => !v); setCode(''); }}>
                <KeyRound className="h-3.5 w-3.5" /> {useBackup ? 'Use the app code' : 'Use a backup code'}
              </button>
            </div>
          </>
        ) : (
          <>
            <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@nafaa.pk" autoFocus size="lg" />
            <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" size="lg" />
            <Button type="submit" fullWidth size="lg" loading={login.isPending} rightIcon={<ArrowRight className="h-4 w-4" />}>Sign in</Button>
          </>
        )}
      </form>
    </AuthFrame>
  );
}
