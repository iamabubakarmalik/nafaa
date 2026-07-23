import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sparkles, ArrowRight, Mail, Lock, Eye, EyeOff, Phone,
  CheckCircle2, ShoppingBag, Store, Zap, Shield,
} from 'lucide-react';
import { marketAuthApi } from '../api/auth.api';
import { useCustomerAuthStore } from '@stores/customerAuth.store';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';

const emailSchema = z.object({
  email: z.string().email('Sahi email likhein'),
  password: z.string().min(6, 'Kam se kam 6 characters'),
});

type EmailFormData = z.infer<typeof emailSchema>;

const features = [
  { icon: ShoppingBag, label: 'Sab kuch ek jagah', desc: 'Kiryana, mobile, kapre — sab' },
  { icon: Zap, label: 'Tez delivery', desc: '30 min mein ghar tak' },
  { icon: Shield, label: 'Verified shops', desc: 'Bharosaymand dukanein' },
  { icon: Store, label: '10,000+ dukanein', desc: 'Pakistan bhar mein' },
];

export default function MarketLoginPage() {
  const navigate = useNavigate();
  const setSession = useCustomerAuthStore((s) => s.setSession);
  const [tab, setTab] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');

  // ─── Email login ───
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '', password: '' },
  });

  const emailLoginMutation = useMutation({
    mutationFn: marketAuthApi.login,
    onSuccess: (data) => {
      setSession(data.customer, data.tokens.accessToken);
      const firstName = data.customer.fullName?.split(' ')[0] || 'Bhai';
      toast.success(`Khush amdeed, ${firstName}! 🎉`);
      navigate('/', { replace: true });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Login fail ho gaya');
    },
  });

  // ─── OTP login ───
  const sendOtpMutation = useMutation({
    mutationFn: (p: string) => marketAuthApi.sendOtp(p, 'LOGIN'),
    onSuccess: (data: any) => {
      toast.success('OTP bhej diya!', {
        description: `${data.expiresIn / 60} minutes ke liye valid`,
      });
      navigate('/verify-otp', {
        state: { phone, purpose: 'LOGIN', devCode: data.devCode },
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'OTP bhejne mein error';
      if (msg.toLowerCase().includes('not found') || msg.includes('nahi mila')) {
        toast.error('Aap ka account nahi mila', {
          description: 'Pehle register karein',
          action: { label: 'Register', onClick: () => navigate('/register') },
        });
      } else {
        toast.error(msg);
      }
    },
  });

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^(\+92|0)?3\d{9}$/.test(phone)) {
      return toast.error('Sahi Pakistani number likhein (03XX-XXXXXXX)');
    }
    sendOtpMutation.mutate(phone);
  };

  const handleGoogleLogin = () => {
    window.location.href = marketAuthApi.googleLoginUrl();
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-slate-50">
      {/* Left — gradient panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-900 text-white p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl translate-y-1/4 -translate-x-1/4" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-xl">
              <span className="text-white font-black text-2xl">N</span>
            </div>
            <div>
              <div className="text-2xl font-extrabold">Nafaa Bazaar</div>
              <div className="text-xs text-brand-100">Pakistan's #1 Marketplace</div>
            </div>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-4 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Wapas khush amdeed
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
            Sab kuch <br />
            <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
              ek hi jaga
            </span>
          </h1>
          <p className="text-brand-100 text-lg leading-relaxed max-w-md">
            Nazdeek dukanein, tez delivery, mol-bhaav ki suvidha — sab digital!
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-3 hover:bg-white/15 transition"
                >
                  <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-bold">{f.label}</div>
                  <div className="text-xs text-brand-100 mt-0.5">{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-xs text-brand-100">
          © {new Date().getFullYear()} Nafaa.pk — Made for Pakistan 🇵🇰
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-emerald-700 flex items-center justify-center shadow-brand">
              <span className="text-white font-black text-lg">N</span>
            </div>
            <span className="text-2xl font-extrabold text-slate-900">Nafaa Bazaar</span>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Login karein</h2>
            <p className="text-slate-600 text-sm mt-1.5">
              Apne account mein wapas aayein
            </p>
          </div>

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 shadow-sm active:scale-[0.98]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google se Login karein
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-50 px-3 text-slate-500 font-medium">YA</span>
            </div>
          </div>

          {/* Tabs: Email / Phone */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setTab('email')}
              className={`h-10 rounded-xl text-sm font-bold transition ${
                tab === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Mail className="h-4 w-4 inline mr-1.5" />
              Email
            </button>
            <button
              onClick={() => setTab('phone')}
              className={`h-10 rounded-xl text-sm font-bold transition ${
                tab === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Phone className="h-4 w-4 inline mr-1.5" />
              Phone OTP
            </button>
          </div>

          {/* Email form */}
          {tab === 'email' && (
            <form
              onSubmit={emailForm.handleSubmit((d) => emailLoginMutation.mutate(d))}
              className="space-y-4"
            >
              <Input
                label="Email"
                type="email"
                placeholder="ahmad@example.com"
                leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                {...emailForm.register('email')}
                error={emailForm.formState.errors.email?.message}
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-slate-700">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Bhool gaye?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    {...emailForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {emailForm.formState.errors.password && (
                  <p className="text-xs text-rose-600 mt-1">
                    {emailForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                fullWidth
                loading={emailLoginMutation.isPending}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Login
              </Button>
            </form>
          )}

          {/* Phone OTP form */}
          {tab === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <span className="text-lg">🇵🇰</span>
                    <span className="text-sm font-bold text-slate-700">+92</span>
                    <div className="h-5 w-px bg-slate-300" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="3001234567"
                    className="w-full h-12 pl-24 pr-4 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base font-bold text-slate-900"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <Shield className="h-3 w-3 text-brand-600" />
                  6-digit OTP SMS pe bhejenge
                </p>
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                fullWidth
                loading={sendOtpMutation.isPending}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                OTP Bhejein
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-slate-600">
            Naye customer hain?{' '}
            <Link to="/register" className="font-bold text-brand-700 hover:text-brand-800">
              Free account banayein
            </Link>
          </p>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-brand-600" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Store className="h-3 w-3 text-brand-600" />
              <span>10,000+ Shops</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Made in 🇵🇰</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
