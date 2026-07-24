import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation } from '@tanstack/react-query';
import {
  User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, Gift,
} from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Card, Input } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

type Method = 'password' | 'otp';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const [method, setMethod] = useState<Method>('password');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    referralCode: searchParams.get('ref') || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showRefField, setShowRefField] = useState(!!form.referralCode);
  const [agreed, setAgreed] = useState(false);

  const passwordRegMutation = useMutation({
    mutationFn: () => authApi.register({
      fullName: form.fullName,
      phone: form.phone,
      email: form.email || undefined,
      password: form.password,
      referralCode: form.referralCode || undefined,
    }),
    onSuccess: (data) => {
      setSession(data.customer, data.tokens);
      toast.success('Welcome to Nafaa Bazaar! 🎉');
      navigate('/', { replace: true });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Registration failed'),
  });

  const phoneOtpMutation = useMutation({
    mutationFn: () => authApi.sendOtp({ phone: form.phone, purpose: 'REGISTER' }),
    onSuccess: (r) => {
      toast.success('OTP sent 📱');
      if (r.devCode) toast.info(`Dev OTP: ${r.devCode}`);
      navigate('/verify-otp', {
        state: {
          phone: form.phone,
          purpose: 'REGISTER',
          fullName: form.fullName,
          referralCode: form.referralCode,
        },
      });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const strengthScore = () => {
    let s = 0;
    if (form.password.length >= 6) s++;
    if (form.password.length >= 10) s++;
    if (/[A-Z]/.test(form.password)) s++;
    if (/[0-9]/.test(form.password)) s++;
    if (/[^A-Za-z0-9]/.test(form.password)) s++;
    return s;
  };
  const strength = strengthScore();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'][strength];
  const strengthColor = ['', 'bg-danger', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-brand-500'][strength];

  return (
    <>
      <Helmet><title>Sign Up — Nafaa Bazaar</title></Helmet>

      <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4 py-8">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        </div>

        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center gap-2 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-brand">
              <span className="text-white font-black text-xl">N</span>
            </div>
          </Link>

          <Card className="p-6 md:p-8 shadow-soft-lg space-y-5">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black text-content">Create your account</h1>
              <p className="text-sm text-content-muted mt-1">Join Pakistan's #1 marketplace</p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-muted rounded-2xl">
              {([
                { key: 'password', icon: Lock, label: 'Password' },
                { key: 'otp', icon: Phone, label: 'OTP' },
              ] as const).map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      'h-10 rounded-xl text-sm font-black transition flex items-center justify-center gap-2',
                      method === m.key ? 'bg-surface text-brand-600 shadow-soft' : 'text-content-muted',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (method === 'password') passwordRegMutation.mutate();
                else phoneOtpMutation.mutate();
              }}
              className="space-y-4"
            >
              <Input
                label="Full name"
                placeholder="Ahmad Khan"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                leftIcon={<User className="h-4 w-4" />}
                inputSize="lg"
                required
              />

              <Input
                label="Phone number"
                type="tel"
                placeholder="03001234567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                leftIcon={<Phone className="h-4 w-4" />}
                inputSize="lg"
                required
              />

              {method === 'password' && (
                <>
                  <Input
                    label="Email (optional)"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    leftIcon={<Mail className="h-4 w-4" />}
                    inputSize="lg"
                  />
                  <div>
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                    {form.password && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <div key={s} className={cn('h-1 flex-1 rounded-full transition', s <= strength ? strengthColor : 'bg-surface-muted')} />
                          ))}
                        </div>
                        <div className="text-2xs text-content-muted mt-1 font-bold">
                          Strength: {strengthLabel}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {showRefField ? (
                <Input
                  label="Referral code"
                  placeholder="FRIEND123"
                  value={form.referralCode}
                  onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })}
                  leftIcon={<Gift className="h-4 w-4" />}
                  inputSize="md"
                  hint="Both you and your friend get 100 loyalty points!"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRefField(true)}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <Gift className="h-3.5 w-3.5" />
                  Have a referral code?
                </button>
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded"
                />
                <span className="text-xs text-content-muted">
                  I agree to the{' '}
                  <Link to="/terms" className="underline text-brand-600">Terms</Link> and{' '}
                  <Link to="/privacy" className="underline text-brand-600">Privacy Policy</Link>
                </span>
              </label>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                fullWidth
                disabled={!agreed}
                loading={passwordRegMutation.isPending || phoneOtpMutation.isPending}
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                {method === 'password' ? 'Create account' : 'Send OTP'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-2xs">
                <span className="bg-surface px-3 text-content-subtle font-bold uppercase tracking-wider">or</span>
              </div>
            </div>

            <button
              onClick={() => window.location.href = authApi.googleLoginUrl()}
              className="w-full h-12 rounded-2xl bg-surface hover:bg-surface-muted border-2 border-border flex items-center justify-center gap-3 font-bold text-content transition"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>

            <div className="text-center text-sm">
              <span className="text-content-muted">Already have an account? </span>
              <Link to="/login" className="text-brand-600 dark:text-brand-400 font-black hover:underline">
                Login
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
