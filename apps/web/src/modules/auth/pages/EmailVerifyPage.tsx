/** Email check after sign-up: a 6-digit code sent to the owner's email. */

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Loader2, MailCheck, RefreshCw } from 'lucide-react';
import { authApi } from '@modules/auth/api/auth.api';
import { useAuthStore } from '@core/stores/auth.store';
import { Alert, Button } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { AuthHeading, AuthLayout } from '../components/AuthLayout';
import { authErrorMessage, retryAfterSeconds } from '../lib/auth-errors';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function EmailVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  /** Sign-up already sent a code; asking again within a minute is refused by the API. */
  const codeSent = (location.state as { codeSent?: boolean } | null)?.codeSent === true;

  const [code, setCode] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [cooldown, setCooldown] = useState(codeSent ? RESEND_SECONDS : 0);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const startedRef = useRef(false);

  const goOn = () => navigate('/dashboard', { replace: true });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendMutation = useMutation({
    mutationFn: authApi.sendVerifyEmail,
    onSuccess: (data) => {
      if (data?.alreadyVerified) {
        updateUser({ emailVerified: true });
        goOn();
        return;
      }
      setError(null);
      setCooldown(RESEND_SECONDS);
      toast.success('Naya code email par bhej diya');
      if (data?.devCode) console.info(`[dev] verify code: ${data.devCode}`);
    },
    onError: (err) => {
      const wait = retryAfterSeconds(err);
      if (wait) {
        // A code went out moments ago; it is still valid.
        setCooldown(wait);
        return;
      }
      setError(authErrorMessage(err, 'Code nahi bheja ja saka. Thori der baad dobara try karein.'));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (otp: string) => authApi.confirmVerifyEmail(otp),
    onSuccess: () => {
      setVerified(true);
      updateUser({ emailVerified: true });
      toast.success('Email verify ho gaya');
      setTimeout(goOn, 900);
    },
    onError: (err) => {
      setError(authErrorMessage(err, 'Code sahi nahi. Dobara likhein.'));
      setCode(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    },
  });

  useEffect(() => {
    if (startedRef.current || !user) return;
    startedRef.current = true;
    if (user.emailVerified) {
      goOn();
      return;
    }
    if (!codeSent) sendMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = (digits: string[]) => {
    const full = digits.join('');
    if (full.length !== OTP_LENGTH) {
      setError('Pura 6 number ka code likhein.');
      return;
    }
    setError(null);
    verifyMutation.mutate(full);
  };

  const fill = (start: number, digits: string) => {
    const next = [...code];
    for (let i = 0; i < digits.length && start + i < OTP_LENGTH; i++) next[start + i] = digits[i];
    setCode(next);
    const last = Math.min(start + digits.length, OTP_LENGTH - 1);
    inputs.current[last]?.focus();
    if (next.every(Boolean)) submit(next);
  };

  const onChange = (i: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      const next = [...code];
      next[i] = '';
      setCode(next);
      return;
    }
    // Phones paste or autofill the whole code into one box.
    fill(i, digits.slice(0, OTP_LENGTH - i));
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) inputs.current[i + 1]?.focus();
    if (e.key === 'Enter') submit(code);
  };

  const onPaste = (e: ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!digits) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setCode(next);
    inputs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
    if (digits.length === OTP_LENGTH) submit(next);
  };

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-label="Load ho raha hai" />
      </div>
    );
  }

  const busy = verifyMutation.isPending || verified;

  return (
    <AuthLayout side="signup">
      <AuthHeading
        icon={<MailCheck className="h-5 w-5" />}
        title="Email verify karein"
        subtitle={<>6 number ka code bheja gaya hai: <strong className="break-all font-semibold text-slate-800">{user.email}</strong></>}
      />

      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      {verified && <Alert tone="success" className="mb-4">Shukriya! Email verify ho gaya — aage le ja rahe hain…</Alert>}

      <fieldset disabled={busy} className="mb-2">
        <legend className="sr-only">6 number ka code</legend>
        <div className="flex justify-between gap-2" onPaste={onPaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              pattern="[0-9]*"
              maxLength={OTP_LENGTH}
              value={digit}
              aria-label={`Code ka ${i + 1} number`}
              autoFocus={i === 0}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              className={cn(
                'h-14 w-full min-w-0 max-w-[3.25rem] rounded-xl border bg-white text-center text-2xl font-bold tabular-nums text-slate-900 shadow-sm transition',
                'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60',
                digit ? 'border-brand-400' : 'border-slate-300',
              )}
            />
          ))}
        </div>
      </fieldset>
      <p className="mb-5 text-xs text-slate-500">Code 10 minute tak chalega. Paste bhi kar sakte hain.</p>

      <Button
        size="xl"
        fullWidth
        loading={verifyMutation.isPending}
        disabled={verified || code.join('').length !== OTP_LENGTH}
        onClick={() => submit(code)}
      >
        Verify karein
      </Button>

      <div className="mt-5 flex flex-col items-center gap-3 border-t border-slate-200 pt-5 text-sm">
        <p className="text-slate-600">
          Email nahi mili? Spam folder dekhein, ya{' '}
          <button
            type="button"
            onClick={() => sendMutation.mutate()}
            disabled={cooldown > 0 || sendMutation.isPending}
            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', sendMutation.isPending && 'animate-spin')} aria-hidden />
            {cooldown > 0 ? `${cooldown}s baad naya code` : 'naya code mangwaein'}
          </button>
        </p>
        <button type="button" onClick={goOn} className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-slate-500 hover:text-slate-800">
          Baad me verify karunga <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </AuthLayout>
  );
}
