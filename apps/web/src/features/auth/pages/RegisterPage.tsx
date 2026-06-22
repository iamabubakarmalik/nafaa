import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sparkles, Store, ArrowRight, Gift, Mail, Lock, User, Phone,
  Eye, EyeOff, CheckCircle2, Shield, Zap, TrendingUp,
} from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/brand/Logo';

const schema = z.object({
  shopName: z.string().min(2, 'Shop ka naam likhein'),
  fullName: z.string().min(2, 'Apna naam likhein'),
  email: z.string().email('Sahi email likhein'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Sahi mobile number')
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'Kam se kam 8 characters'),
  referralCode: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

const benefits = [
  { icon: Zap, label: 'Quick setup', desc: '2 minutes mein ready' },
  { icon: Shield, label: 'Bank-grade security', desc: '256-bit encryption' },
  { icon: TrendingUp, label: 'Free 7 days trial', desc: 'No credit card' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const refFromUrl = searchParams.get('ref');
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      shopName: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      referralCode: refFromUrl || '',
    },
  });

  useEffect(() => {
    if (refFromUrl) form.setValue('referralCode', refFromUrl);
  }, [refFromUrl, form]);

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setSession(data);
      toast.success('Mubarak ho! Aap ka account ban gaya 🎉');
      // New users always go to onboarding (not dashboard)
      navigate('/onboarding', { replace: true });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Kuch ghalat ho gaya');
    },
  });

  const handleGoogleSignup = () => {
    window.location.href = authApi.googleLoginUrl();
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr] bg-slate-50">
      {/* Right side — Form (mobile shows first) */}
      <div className="order-2 lg:order-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-2">
            <Logo size={36} />
            <span className="text-2xl font-extrabold text-slate-900">Nafaa</span>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-bold mb-3">
              <Store className="h-3.5 w-3.5" />
              Apni dukan register karein
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">Free trial shuru karein</h2>
            <p className="text-slate-600 text-sm mt-1.5">
              7 din free • Credit card nahi chahiye • Kabhi bhi cancel karein
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
                  Aap ke friend ko Rs 500+ ka reward milega jab aap subscribe karenge.
                </div>
              </div>
            </div>
          )}

          {/* Google Signup */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="w-full h-12 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 shadow-sm"
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
              <span className="bg-slate-50 px-3 text-slate-500 font-medium">YA EMAIL SE</span>
            </div>
          </div>

          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d as any))}
            className="space-y-4"
          >
            <Input
              label="Shop / Business Name"
              placeholder="Ahmad Bakery"
              leftIcon={<Store className="h-4 w-4 text-slate-400" />}
              {...form.register('shopName')}
              error={form.formState.errors.shopName?.message}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Aap ka naam"
                placeholder="Ahmad Ali"
                leftIcon={<User className="h-4 w-4 text-slate-400" />}
                {...form.register('fullName')}
                error={form.formState.errors.fullName?.message}
              />
              <Input
                label="Mobile (optional)"
                placeholder="+923001234567"
                leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
                {...form.register('phone')}
                error={form.formState.errors.phone?.message}
              />
            </div>
            <Input
              label="Email"
              type="email"
              placeholder="ahmad@example.com"
              leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />

            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Strong password (8+ characters)"
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
              placeholder="NAFAA-XXXX"
              leftIcon={<Gift className="h-4 w-4 text-slate-400" />}
              {...form.register('referralCode')}
              hint="Agar friend ne code diya hai to yahan likhein"
            />

            <Button type="submit" loading={mutation.isPending} className="w-full" size="lg">
              Account banayein
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Continue karke aap{' '}
              <Link to="/legal" className="text-brand-700 hover:underline font-semibold">
                Terms
              </Link>{' '}
              aur{' '}
              <Link to="/legal" className="text-brand-700 hover:underline font-semibold">
                Privacy Policy
              </Link>{' '}
              se agree karte hain.
            </p>
          </form>

          <p className="text-center text-sm text-slate-600">
            Pehle se account hai?{' '}
            <Link to="/login" className="font-bold text-brand-700 hover:text-brand-800">
              Login karein
            </Link>
          </p>
        </div>
      </div>

      {/* Left side — Gradient panel */}
      <div className="order-1 lg:order-2 hidden lg:flex flex-col justify-between bg-gradient-to-br from-emerald-600 via-brand-700 to-emerald-900 text-white p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl -translate-y-1/4 -translate-x-1/4" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl translate-y-1/4 translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Logo size={48} />
            <div>
              <div className="text-2xl font-extrabold">Nafaa</div>
              <div className="text-xs text-emerald-200">Pakistan-first retail OS</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
            Pakistan ka <br />
            <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
              sab se aasaan
            </span>{' '}
            <br />
            POS system
          </h1>
          <p className="text-emerald-100 text-lg leading-relaxed max-w-md">
            Bakery, Kiryana, Mobile shop, Pharmacy — koi bhi business ho. Nafaa ke saath digital banayein.
          </p>

          {/* Benefits */}
          <div className="space-y-3 pt-4">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.label}
                  className="flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-4"
                >
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold">{b.label}</div>
                    <div className="text-xs text-emerald-200 mt-0.5">{b.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-4 pt-2 text-xs text-emerald-200">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-amber-300" />
              <span>500+ shops</span>
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

        <div className="relative z-10 text-sm text-emerald-200">
          © {new Date().getFullYear()} Nafaa.pk — Made for Pakistan 🇵🇰
        </div>
      </div>
    </div>
  );
}
