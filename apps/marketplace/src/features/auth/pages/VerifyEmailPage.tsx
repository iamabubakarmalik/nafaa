import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Mail, CheckCircle2, RefreshCw, ArrowLeft, Clock, Sparkles,
} from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Card } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 60;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const customer = useAuthStore((s) => s.customer) as any;
  const updateCustomer = useAuthStore((s) => s.updateCustomer);

  const [code, setCode] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [resendIn, setResendIn] = useState(RESEND_TIMEOUT);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const sentOnceRef = useRef(false);

  const sendMutation = useMutation({
    mutationFn: authApi.sendVerifyEmail,
    onSuccess: (r: any) => {
      if (r.alreadyVerified) {
        toast.success('Email already verified ✅');
        updateCustomer({ emailVerified: true, isEmailVerified: true } as any);
        setTimeout(() => navigate('/profile'), 1000);
        return;
      }
      toast.success('Code sent to your email 📧');
      if (r.devCode) toast.info(`Dev OTP: ${r.devCode}`, { duration: 10000 });
      setResendIn(RESEND_TIMEOUT);
      inputsRef.current[0]?.focus();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to send'),
  });

  const verifyMutation = useMutation({
    mutationFn: () => authApi.confirmVerifyEmail(code.join('')),
    onSuccess: () => {
      toast.success('Email verified! 🎉');
      updateCustomer({ emailVerified: true, isEmailVerified: true } as any);
      setTimeout(() => navigate('/profile'), 1500);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Invalid code');
      setCode(new Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    },
  });

  // Auto-send once on mount
  useEffect(() => {
    if (sentOnceRef.current) return;
    if (!customer?.email) {
      toast.error('Please add email first');
      navigate('/profile/edit');
      return;
    }
    if (customer.emailVerified || customer.isEmailVerified) {
      toast.success('Already verified');
      navigate('/profile');
      return;
    }
    sentOnceRef.current = true;
    sendMutation.mutate();
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
    if (val && i === OTP_LENGTH - 1 && next.every((d) => d)) {
      setTimeout(() => verifyMutation.mutate(), 100);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = paste.split('').concat(new Array(OTP_LENGTH - paste.length).fill(''));
    setCode(next);
    inputsRef.current[Math.min(paste.length, OTP_LENGTH - 1)]?.focus();
    if (next.every((d) => d)) setTimeout(() => verifyMutation.mutate(), 100);
  };

  if (!customer) return null;

  return (
    <>
      <Helmet><title>Verify Email — Nafaa Bazaar</title></Helmet>

      <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        </div>

        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/profile')}
            className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </button>

          <Card className="p-6 md:p-8 shadow-soft-lg space-y-5">
            <div className="text-center">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-brand flex items-center justify-center shadow-brand mb-4">
                <Mail className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black">Verify your email</h1>
              <p className="text-sm text-content-muted mt-2">We sent a 6-digit code to</p>
              <p className="text-sm font-black text-brand-600 dark:text-brand-400 mt-1 break-all">
                {customer.email}
              </p>
            </div>

            <div className="flex justify-center gap-2 md:gap-3" onPaste={handlePaste}>
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={verifyMutation.isPending}
                  className={cn(
                    'h-14 w-11 md:h-16 md:w-14 text-center text-2xl font-black rounded-2xl border-2 bg-surface',
                    'focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition',
                    d ? 'border-brand-500' : 'border-border',
                    verifyMutation.isPending && 'opacity-50',
                  )}
                />
              ))}
            </div>

            <Button
              variant="gradient"
              size="lg"
              fullWidth
              disabled={code.some((d) => !d)}
              loading={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
              leftIcon={<CheckCircle2 className="h-5 w-5" />}
            >
              Verify email
            </Button>

            {/* Info */}
            <div className="rounded-2xl bg-accent-50 dark:bg-accent-950/30 border-2 border-accent-200 dark:border-accent-800 p-3 flex items-start gap-2">
              <Clock className="h-4 w-4 text-accent-600 shrink-0 mt-0.5" />
              <div className="text-2xs text-accent-800 dark:text-accent-300 font-bold">
                Code expires in 10 min. Spam folder bhi check karain.
              </div>
            </div>

            {/* Resend */}
            <div className="text-center">
              {resendIn > 0 ? (
                <p className="text-xs text-content-muted">
                  Resend in <span className="font-black text-content">{resendIn}s</span>
                </p>
              ) : (
                <button
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending}
                  className="text-sm font-black text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', sendMutation.isPending && 'animate-spin')} />
                  Resend code
                </button>
              )}
            </div>

            {/* Skip */}
            <button
              onClick={() => navigate('/profile')}
              className="w-full text-center text-2xs text-content-muted hover:text-content font-bold inline-flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Skip for now
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}
