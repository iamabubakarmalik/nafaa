import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sparkles, ArrowRight, Gift, Mail, Lock, User, Phone,
  Eye, EyeOff, CheckCircle2, Shield, Zap, ShoppingBag,
} from 'lucide-react';
import { marketAuthApi } from '../api/auth.api';
import { useCustomerAuthStore } from '@stores/customerAuth.store';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';

const emailSchema = z.object({
  fullName: z.string().min(2, 'Apna naam likhein'),
  email: z.string().email('Sahi email likhein'),
  phone: z
    .string()
    .regex(/^(\+92|0)?3\d{9}$/, 'Sahi Pakistani number')
    .optional()
    .or(z.literal('')),
  password: z.string().min(6, 'Kam se kam 6 characters'),
  referralCode: z.string().optional().or(z.literal('')),
});

type EmailFormData = z.infer<typeof emailSchema>;

const benefits = [
  { icon: Gift, label: '500 free points', desc: 'Signup pe milte hain' },
  { icon: Zap, label: 'Tez delivery', desc: '30 min mein ghar' },
  { icon: Shield, label: 'Safe & secure', desc: 'Verified shops only' },
];

export default function MarketRegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setSession = useCustomerAuthStore((s) => s.setSession);
  const [tab, setTab] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpFullName, setOtpFullName] = useState('');
  const refFromUrl = params.get('ref');

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      fullName: '', email: '', phone: '', password: '',
      referralCode: refFromUrl || '',
    },
  });

  useEffect(() => {
    if (refFromUrl) form.setValue('referralCode', refFromUrl);
  }, [refFromUrl, form]);

  // ─── Email registration ───
  const registerMutation = useMutation({
    mutationFn: marketAuthApi.register,
    onSuccess: (data) => {
      setSession(data.customer, data.tokens.accessToken);
      toast.success('Mubarak ho! Account ban gaya 🎉', {
        description: '500 loyalty points free mile hain!',
      });
      navigate('/', { replace: true });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Kuch ghalat ho gaya');
    },
  });

  // ─── OTP registration ───
  const sendOtpMutation = useMutation({
    mutationFn: (p: string) => marketAuthApi.sendOtp(p, 'REGISTER'),
    onSuccess: (data: any) => {
      toast.success('OTP bhej diya!');
      navigate('/verify-otp', {
        state: {
          phone,
          purpose: 'REGISTER',
          fullName: otpFullName,
          referralCode: refFromUrl,
          devCode: data.devCode,
        },
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error');
    },
  });

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpFullName.trim().length < 2) return toast.error('Naam likhein');
    if (!/^(\+92|0)?3\d{9}$/.test(phone)) return toast.error('Sahi PK number');
    sendOtpMutation.mutate(phone);
  };

  const handleGoogleSignup = () => {
    window.location.href = marketAuthApi.googleLoginUrl();
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr] bg-slate-50">
      {/* Right side — Form (mobile shows first) */}
      <div className="order-2 lg:order-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-emerald-700 flex items-center justify-center shadow-brand">
              <span className="text-white font-black text-lg">N</span>
            </div>
            <span className="text-2xl font-extrabold text-slate-900">Nafaa Bazaar</span>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 text-brand-700 px-3 py-1 text-xs font-bold mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Free Account
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Nafaa Bazaar mein <br />
              <span className="bg-gradient-to-r from-brand-600 to-emerald-700 bg-clip-text text-transparent">
                khush amdeed! 🎉
              </span>
            </h2>
            <p className="text-slate-600 text-sm mt-1.5">
              1 minute mein register — 500 loyalty points free!
            </p>
          </div>

          {refFromUrl && (
            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-amber-50 border-2 border-emerald-200 p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div className="text-sm flex-1">
                <div className="font-extrabold text-emerald-900">Referral Code Applied! 🎁</div>
                <div className="text-emerald-700 text-xs mt-1">
                  Aap ko + aap ke friend ko extra points milenge.
                </div>
              </div>
            </div>
          )}

          {/* Google Signup */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="w-full h-12 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 shadow-sm active:scale-[0.98]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google se Signup karein
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-50 px-3 text-slate-500 font-medium">YA</span>
            </div>
          </div>

          {/* Tabs */}
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
              onSubmit={form.handleSubmit((d) => registerMutation.mutate(d as any))}
              className="space-y-4"
            >
              <Input
                label="Aap ka Naam"
                placeholder="Ahmad Ali"
                leftIcon={<User className="h-4 w-4 text-slate-400" />}
                {...form.register('fullName')}
                error={form.formState.errors.fullName?.message}
              />
              <Input
                label="Email"
                type="email"
                placeholder="ahmad@example.com"
                leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                {...form.register('email')}
                error={form.formState.errors.email?.message}
              />
              <Input
                label="Mobile (optional)"
                placeholder="+923001234567"
                leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
                {...form.register('phone')}
                error={form.formState.errors.phone?.message}
                hint="OTP recovery ke liye"
              />

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Strong password (6+ chars)"
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-rose-600 mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Input
                label="Referral Code (optional)"
                placeholder="NB-XXXXX"
                leftIcon={<Gift className="h-4 w-4 text-amber-500" />}
                {...form.register('referralCode')}
                hint="Friend ka code hai? Extra points milenge"
              />

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                fullWidth
                loading={registerMutation.isPending}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Account Banayein
              </Button>

              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Continue karke aap{' '}
                <Link to="/terms" className="text-brand-700 hover:underline font-semibold">
                  Terms
                </Link>{' '}
                aur{' '}
                <Link to="/privacy" className="text-brand-700 hover:underline font-semibold">
                  Privacy Policy
                </Link>{' '}
                se agree karte hain.
              </p>
            </form>
          )}

          {/* Phone OTP form */}
          {tab === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">
                  Aap ka Naam
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={otpFullName}
                    onChange={(e) => setOtpFullName(e.target.value)}
                    placeholder="Ahmad Ali"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base font-bold text-slate-900"
                  />
                </div>
              </div>

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
                  />
                </div>
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
            Pehle se account hai?{' '}
            <Link to="/login" className="font-bold text-brand-700 hover:text-brand-800">
              Login karein
            </Link>
          </p>
        </div>
      </div>

      {/* Left panel */}
      <div className="order-1 lg:order-2 hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-900 text-white p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl -translate-y-1/4 -translate-x-1/4" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl translate-y-1/4 translate-x-1/4" />

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
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
            Pakistan ka <br />
            <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
              sab se aasaan
            </span>{' '}
            <br />
            bazaar
          </h1>
          <p className="text-brand-100 text-lg leading-relaxed max-w-md">
            Kiryana, mobile, kapre, khaana — koi bhi cheez ho, ghar tak milegi.
          </p>

          <div className="space-y-3 pt-4">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.label}
                  className="flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-4"
                >
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold">{b.label}</div>
                    <div className="text-xs text-brand-100 mt-0.5">{b.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 pt-2 text-xs text-brand-100">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-amber-300" />
              <span>10,000+ shops</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-amber-300" />
              <span>Urdu support</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-amber-300" />
              <span>JazzCash / EasyPaisa</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-brand-100">
          © {new Date().getFullYear()} Nafaa.pk — Made for Pakistan 🇵🇰
        </div>
      </div>
    </div>
  );
}
