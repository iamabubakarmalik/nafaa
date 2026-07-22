import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Mail, CheckCircle2, RefreshCw, ArrowLeft, Sparkles, Clock,
} from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Logo } from '@/components/brand/Logo';

const OTP_LENGTH = 6;

export default function EmailVerifyPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Auto-send OTP on mount if user not verified
  useEffect(() => {
    if (user && !user.emailVerified) {
      sendMutation.mutate();
    } else if (user?.emailVerified) {
      // Already verified — go to dashboard
      navigate('/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const sendMutation = useMutation({
    mutationFn: authApi.sendVerifyEmail,
    onSuccess: (data: any) => {
      if (data.alreadyVerified) {
        toast.success('Email already verified ✅');
        updateUser({ emailVerified: true });
        navigate('/dashboard', { replace: true });
        return;
      }
      toast.success('Code email pe bhej diya gaya 📧');
      setResendCooldown(60);

      // Dev mode — auto-fill code for testing
      if (data.devCode) {
        console.log(`🔑 Dev OTP: ${data.devCode}`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Code send fail');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (otpCode: string) => authApi.confirmVerifyEmail(otpCode),
    onSuccess: () => {
      toast.success('Email verify ho gaya! 🎉');
      updateUser({ emailVerified: true });
      // Navigate to dashboard — OnboardingGate will redirect to /onboarding if incomplete
      setTimeout(() => navigate('/dashboard', { replace: true }), 800);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Invalid code');
      setCode(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    },
  });

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const next = [...code];
    next[index] = digit;
    setCode(next);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    const full = next.join('');
    if (full.length === OTP_LENGTH && next.every((c) => c)) {
      verifyMutation.mutate(full);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);

    if (pasted.length === OTP_LENGTH) {
      verifyMutation.mutate(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const handleManualSubmit = () => {
    const full = code.join('');
    if (full.length !== OTP_LENGTH) {
      toast.error('Pura 6-digit code likhein');
      return;
    }
    verifyMutation.mutate(full);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Logo size={44} />
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Nafaa</div>
            <div className="text-xs text-slate-500">Pakistan-first retail OS</div>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-600 via-brand-700 to-emerald-900 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/20 backdrop-blur mb-4 shadow-lg">
                <Mail className="h-8 w-8" />
              </div>
              <h2 className="text-3xl font-extrabold">Email Verify Karein</h2>
              <p className="text-emerald-100 text-sm mt-2 leading-relaxed">
                Hum ne 6-digit code bheja hai aap ke email pe:
              </p>
              <p className="text-amber-300 font-bold mt-1 break-all">
                {user.email}
              </p>
            </div>
          </div>

          {/* OTP inputs */}
          <div className="p-8 space-y-6">
            <div>
              <label className="text-sm font-bold text-slate-700 mb-3 block">
                6-Digit Code
              </label>
              <div className="flex gap-2 justify-between" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={verifyMutation.isPending}
                    className={`w-12 h-14 text-center text-2xl font-extrabold rounded-xl border-2 transition focus:outline-none ${
                      digit
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-900 focus:border-emerald-500'
                    } ${verifyMutation.isPending ? 'opacity-50' : ''}`}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Paste karne ke liye Ctrl+V / Cmd+V
              </p>
            </div>

            {/* Submit button */}
            <button
              onClick={handleManualSubmit}
              disabled={verifyMutation.isPending || code.join('').length !== OTP_LENGTH}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold inline-flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 transition shadow-md"
            >
              {verifyMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Verify ho raha hai...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Verify Karein
                </>
              )}
            </button>

            {/* Info card */}
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>10 minutes</strong> ke andar verify karein. Code expire ho jaye to "Resend Code" karein.
                Spam folder bhi check karein.
              </div>
            </div>

            {/* Resend button */}
            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                onClick={() => sendMutation.mutate()}
                disabled={resendCooldown > 0 || sendMutation.isPending}
                className="text-sm font-bold text-emerald-700 hover:text-emerald-800 disabled:text-slate-400 inline-flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${sendMutation.isPending ? 'animate-spin' : ''}`} />
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Code dobara bhejein'}
              </button>
            </div>

            {/* Skip option */}
            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-700 inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="h-3 w-3" />
              Baad mein verify karenge (Dashboard pe jayein)
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} Nafaa.pk
        </p>
      </div>
    </div>
  );
}
