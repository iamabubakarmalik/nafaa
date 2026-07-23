import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck, ArrowLeft, RotateCw, Sparkles } from 'lucide-react';
import { marketAuthApi } from '../api/auth.api';
import { useCustomerAuthStore } from '@/stores/customerAuth.store';
import { Button } from '@shared/ui/Button';

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setSession = useCustomerAuthStore((s) => s.setSession);
  const { phone, purpose, fullName, devCode } = location.state || {};
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) navigate('/login');
    inputRefs.current[0]?.focus();
  }, [phone, navigate]);

  useEffect(() => {
    if (timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timeLeft]);

  const verifyMutation = useMutation({
    mutationFn: () =>
      marketAuthApi.verifyOtp({
        phone, code: code.join(''), purpose,
        ...(fullName ? { fullName } : {}),
      }),
    onSuccess: (data: any) => {
      if (data?.customer && data?.tokens) {
        setSession(data.customer, data.tokens.accessToken);
        toast.success('Login successful! 🎉');
        navigate('/market', { replace: true });
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Ghalat OTP');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => marketAuthApi.sendOtp(phone, purpose),
    onSuccess: () => {
      toast.success('New OTP bhej diya!');
      setTimeLeft(60);
    },
  });

  const handleChange = (index: number, val: string) => {
    if (val.length > 1) {
      // Paste handling
      const pasted = val.slice(0, 6).split('');
      const newCode = [...code];
      pasted.forEach((c, i) => {
        if (index + i < 6 && /\d/.test(c)) newCode[index + i] = c;
      });
      setCode(newCode);
      const nextEmpty = newCode.findIndex((c) => !c);
      inputRefs.current[nextEmpty !== -1 ? nextEmpty : 5]?.focus();
      return;
    }
    if (!/^\d?$/.test(val)) return;
    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);
    if (val && index < 5) inputRefs.current[index + 1]?.focus();
    if (index === 5 && val && newCode.every((c) => c)) {
      // Auto submit
      setTimeout(() => verifyMutation.mutate(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50 to-emerald-50 flex flex-col">
      <header className="p-4">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 pb-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-emerald-700 flex items-center justify-center shadow-brand-lg mb-4">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900">Verify OTP</h1>
            <p className="text-slate-500 text-sm mt-2">
              6-digit code aap ke <span className="font-extrabold text-slate-800">{phone}</span> pe bhej diya hai
            </p>
            {devCode && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-extrabold">
                <Sparkles className="h-3 w-3" />
                DEV: {devCode}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white shadow-soft-xl p-6 border border-slate-100">
            {/* OTP Boxes */}
            <div className="flex justify-center gap-2 mb-6">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={i === 0 ? 6 : 1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border-2 border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none text-center text-2xl font-black text-brand-700 transition"
                />
              ))}
            </div>

            <Button
              onClick={() => verifyMutation.mutate()}
              variant="gradient"
              size="xl"
              fullWidth
              loading={verifyMutation.isPending}
              disabled={code.some((c) => !c)}
            >
              Verify OTP
            </Button>

            {/* Resend */}
            <div className="mt-5 text-center">
              {timeLeft > 0 ? (
                <p className="text-sm text-slate-500">
                  Resend in <span className="font-extrabold text-slate-800 tabular-nums">{timeLeft}s</span>
                </p>
              ) : (
                <button
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                  className="inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-700 hover:text-brand-800 transition"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Resend OTP
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            OTP nahi mila? Spam folder check karein ya wait karein — kabhi kabhi SMS late aata hai.
          </p>
        </div>
      </div>
    </div>
  );
}
