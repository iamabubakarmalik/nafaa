import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation } from '@tanstack/react-query';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, Phone } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { Button, Card, Input } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const OTP_LENGTH = 6;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const phone: string | undefined = (location.state as any)?.phone;

  const [step, setStep] = useState<'otp' | 'password' | 'done'>('otp');
  const [digits, setDigits] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) navigate('/forgot-password');
    else inputsRef.current[0]?.focus();
  }, [phone]);

  const verifyOtpMutation = useMutation({
    mutationFn: () => authApi.verifyOtp({
      phone: phone!,
      code: digits.join(''),
      purpose: 'RESET_PASSWORD',
    }),
    onSuccess: () => {
      toast.success('OTP verified — set new password');
      setStep('password');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Invalid OTP');
      setDigits(new Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => authApi.resetPassword(phone!, digits.join(''), password),
    onSuccess: () => {
      toast.success('Password reset! 🎉');
      setStep('done');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
    if (val && i === OTP_LENGTH - 1 && next.every((d) => d)) {
      setTimeout(() => verifyOtpMutation.mutate(), 100);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };

  const passwordsMatch = password && confirm && password === confirm;

  return (
    <>
      <Helmet><title>Reset Password — Nafaa Bazaar</title></Helmet>

      <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
        <div className="w-full max-w-md">
          <Card className="p-6 md:p-8 shadow-soft-lg space-y-5">
            {step === 'otp' && (
              <>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-brand flex items-center justify-center shadow-brand mb-4">
                    <Phone className="h-7 w-7 text-white" />
                  </div>
                  <h1 className="text-2xl font-black">Verify OTP</h1>
                  <p className="text-sm text-content-muted mt-1">Enter the 6-digit code sent to {phone}</p>
                </div>

                <div className="flex justify-center gap-2">
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
                        'h-14 w-11 text-center text-2xl font-black rounded-2xl border-2 bg-surface',
                        'focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
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
                  loading={verifyOtpMutation.isPending}
                  onClick={() => verifyOtpMutation.mutate()}
                >
                  Verify OTP
                </Button>
              </>
            )}

            {step === 'password' && (
              <>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-brand flex items-center justify-center shadow-brand mb-4">
                    <Lock className="h-7 w-7 text-white" />
                  </div>
                  <h1 className="text-2xl font-black">Set new password</h1>
                  <p className="text-sm text-content-muted mt-1">Choose a strong password</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); resetMutation.mutate(); }} className="space-y-4">
                  <Input
                    label="New password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    inputSize="lg"
                    rightIcon={
                      <button type="button" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    required
                    minLength={6}
                  />
                  <Input
                    label="Confirm password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Same password again"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    inputSize="lg"
                    error={confirm && !passwordsMatch ? 'Passwords do not match' : undefined}
                    required
                  />
                  <Button
                    type="submit"
                    variant="gradient"
                    size="lg"
                    fullWidth
                    disabled={!passwordsMatch || password.length < 6}
                    loading={resetMutation.isPending}
                    rightIcon={<ArrowRight className="h-5 w-5" />}
                  >
                    Reset password
                  </Button>
                </form>
              </>
            )}

            {step === 'done' && (
              <div className="text-center py-6">
                <div className="h-20 w-20 mx-auto rounded-3xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-brand-600 dark:text-brand-400" />
                </div>
                <h1 className="text-2xl font-black">Password reset!</h1>
                <p className="text-sm text-content-muted mt-2">Login with your new password</p>
                <Button variant="gradient" size="lg" fullWidth className="mt-6" onClick={() => navigate('/login')}>
                  Go to login
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
