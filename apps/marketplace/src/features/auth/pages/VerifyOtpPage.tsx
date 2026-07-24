import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation } from '@tanstack/react-query';
import { Phone, ArrowLeft, RefreshCw } from 'lucide-react';
import { authApi, OtpPurpose } from '../api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Card } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 60;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  const state = (location.state || {}) as any;
  const phone: string = state.phone;
  const purpose: OtpPurpose = state.purpose || 'LOGIN';
  const fullName: string | undefined = state.fullName;
  const referralCode: string | undefined = state.referralCode;
  const from = state.from || '/';

  const [digits, setDigits] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [resendIn, setResendIn] = useState(RESEND_TIMEOUT);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) navigate('/login');
    else inputsRef.current[0]?.focus();
  }, [phone]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const verifyMutation = useMutation({
    mutationFn: () => authApi.verifyOtp({
      phone,
      code: digits.join(''),
      purpose,
      fullName,
      referralCode,
    }),
    onSuccess: (data) => {
      // For LOGIN and REGISTER → response contains tokens
      if (data.tokens?.accessToken) {
        setSession(data.customer, data.tokens);
        toast.success(`Welcome, ${data.customer.fullName}! 🎉`);
        navigate(from, { replace: true });
      } else {
        // For VERIFY_PHONE or others
        toast.success('Verified ✅');
        navigate(from, { replace: true });
      }
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Invalid OTP');
      setDigits(new Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.sendOtp({ phone, purpose }),
    onSuccess: (r) => {
      toast.success('New OTP sent 📱');
      if (r.devCode) toast.info(`Dev OTP: ${r.devCode}`);
      setResendIn(RESEND_TIMEOUT);
      setDigits(new Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    },
  });

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
    if (val && i === OTP_LENGTH - 1 && next.every((d) => d)) {
      setTimeout(() => verifyMutation.mutate(), 100);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = paste.split('').concat(new Array(OTP_LENGTH - paste.length).fill(''));
    setDigits(next);
    inputsRef.current[Math.min(paste.length, OTP_LENGTH - 1)]?.focus();
    if (next.every((d) => d)) setTimeout(() => verifyMutation.mutate(), 100);
  };

  const maskedPhone = phone?.replace(/(\+92|0)(\d{3})(\d+)(\d{2})/, '$1$2****$4');

  return (
    <>
      <Helmet><title>Verify OTP — Nafaa Bazaar</title></Helmet>

      <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        </div>

        <div className="w-full max-w-md">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <Card className="p-6 md:p-8 shadow-soft-lg space-y-6">
            <div className="text-center">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-brand flex items-center justify-center shadow-brand mb-4">
                <Phone className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black">Verify your phone</h1>
              <p className="text-sm text-content-muted mt-2">We sent a 6-digit code to</p>
              <p className="text-sm font-black text-content mt-1">{maskedPhone}</p>
            </div>

            <div className="flex justify-center gap-2 md:gap-3" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={cn(
                    'h-14 w-11 md:h-16 md:w-14 text-center text-2xl font-black rounded-2xl border-2 bg-surface',
                    'focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition',
                    d ? 'border-brand-500' : 'border-border',
                  )}
                />
              ))}
            </div>

            <Button
              variant="gradient"
              size="lg"
              fullWidth
              disabled={digits.some((d) => !d)}
              loading={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
            >
              Verify & continue
            </Button>

            <div className="text-center">
              {resendIn > 0 ? (
                <p className="text-xs text-content-muted">
                  Resend code in <span className="font-black text-content">{resendIn}s</span>
                </p>
              ) : (
                <button
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                  className="text-sm font-black text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', resendMutation.isPending && 'animate-spin')} />
                  Resend code
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
