import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation } from '@tanstack/react-query';
import {
  Mail, Lock, Phone, Eye, EyeOff, Sparkles, ArrowRight,
  ShieldCheck, Star, Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Card, Input } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

type Method = 'password' | 'otp';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const from = (location.state as any)?.from?.pathname || '/';

  const [method, setMethod] = useState<Method>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const looksLikeEmail = (v: string) => /@/.test(v);

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(
      looksLikeEmail(identifier)
        ? { email: identifier.trim().toLowerCase(), password }
        : { phone: identifier.trim(), password },
    ),
    onSuccess: (data) => {
      setSession(data.customer, data.tokens);
      toast.success(`Welcome back, ${data.customer.fullName}! 👋`);
      navigate(from, { replace: true });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Invalid credentials'),
  });

  const otpRequestMutation = useMutation({
    mutationFn: () => authApi.sendOtp({ phone: phone.trim(), purpose: 'LOGIN' }),
    onSuccess: (r) => {
      toast.success('OTP sent to your phone 📱');
      if (r.devCode) toast.info(`Dev OTP: ${r.devCode}`);
      navigate('/verify-otp', { state: { phone: phone.trim(), purpose: 'LOGIN', from } });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to send OTP'),
  });

  const loginWithGoogle = () => {
    window.location.href = authApi.googleLoginUrl();
  };

  return (
    <>
      <Helmet><title>Login — Nafaa Bazaar</title></Helmet>

      <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        </div>

        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center gap-2 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-brand">
              <span className="text-white font-black text-xl">N</span>
            </div>
            <div>
              <div className="font-black text-content text-lg leading-none">Nafaa Bazaar</div>
              <div className="text-2xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mt-0.5">
                🇵🇰 Pakistan
              </div>
            </div>
          </Link>

          <Card className="p-6 md:p-8 shadow-soft-lg space-y-5">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black text-content">Welcome back</h1>
              <p className="text-sm text-content-muted mt-1">Login to your account</p>
            </div>

            {/* Method tabs */}
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
                      method === m.key ? 'bg-surface text-brand-600 shadow-soft' : 'text-content-muted hover:text-content',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {method === 'password' && (
              <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-4">
                <Input
                  label="Email or phone"
                  placeholder="you@example.com or 03001234567"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  leftIcon={looksLikeEmail(identifier) ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                  inputSize="lg"
                  required
                />
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-bold text-content">Password</label>
                    <Link to="/forgot-password" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                      Forgot?
                    </Link>
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
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
                  />
                </div>
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  fullWidth
                  loading={loginMutation.isPending}
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Login
                </Button>
              </form>
            )}

            {method === 'otp' && (
              <form onSubmit={(e) => { e.preventDefault(); otpRequestMutation.mutate(); }} className="space-y-4">
                <Input
                  label="Phone number"
                  type="tel"
                  placeholder="03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<Phone className="h-4 w-4" />}
                  inputSize="lg"
                  hint="We'll send you a one-time code"
                  required
                />
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  fullWidth
                  loading={otpRequestMutation.isPending}
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Send OTP
                </Button>
              </form>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-2xs">
                <span className="bg-surface px-3 text-content-subtle font-bold uppercase tracking-wider">
                  or continue with
                </span>
              </div>
            </div>

            <button
              onClick={loginWithGoogle}
              className="w-full h-12 rounded-2xl bg-surface hover:bg-surface-muted border-2 border-border flex items-center justify-center gap-3 font-bold text-content transition"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="text-center text-sm">
              <span className="text-content-muted">Don't have an account? </span>
              <Link to="/register" className="text-brand-600 dark:text-brand-400 font-black hover:underline">
                Create one
              </Link>
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { icon: ShieldCheck, label: '10k+ shops' },
              { icon: Star, label: '500k+ users' },
              { icon: Users, label: 'Trusted' },
            ].map((tb) => {
              const Icon = tb.icon;
              return (
                <div key={tb.label} className="p-3 rounded-2xl bg-surface/50 backdrop-blur-sm border border-border">
                  <Icon className="h-4 w-4 text-brand-600 mx-auto mb-1" />
                  <div className="text-2xs font-black text-content">{tb.label}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center text-2xs text-content-subtle">
            By logging in you agree to our <Link to="/terms" className="underline">Terms</Link> and{' '}
            <Link to="/privacy" className="underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </>
  );
}
