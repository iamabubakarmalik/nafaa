import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sparkles, ArrowRight, ShieldAlert, Mail, Lock, Eye, EyeOff,
  CheckCircle2, Store, ShoppingBag, BarChart3, Users,
} from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/api/client';
import { Logo } from '@/components/brand/Logo';

const schema = z.object({
  email: z.string().email('Sahi email likhein'),
  password: z.string().min(8, 'Kam se kam 8 characters'),
});

type FormData = z.infer<typeof schema>;

const features = [
  { icon: ShoppingBag, label: 'POS + Inventory', desc: 'Complete sales system' },
  { icon: Users, label: 'Customer Khata', desc: 'Udhaar tracking' },
  { icon: BarChart3, label: 'Reports & Profit', desc: 'Real-time analytics' },
  { icon: Store, label: 'Multi-shop', desc: 'Branches manage karein' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // Admin impersonation handler
  useEffect(() => {
    const impersonate = searchParams.get('impersonate');
    const access = searchParams.get('access');
    const refresh = searchParams.get('refresh');

    if (impersonate === '1' && access && refresh) {
      (async () => {
        try {
          const meRes = await apiClient.get('/auth/me', {
            headers: { Authorization: `Bearer ${access}` },
          });
          const data = meRes.data?.data;
          if (data?.user && data?.tenant) {
            setSession({
              user: data.user,
              tenant: data.tenant,
              accessToken: access,
              refreshToken: refresh,
            });
            toast.success(`🔐 Impersonating ${data.tenant.name}`);
            navigate('/dashboard', { replace: true });
          }
        } catch {
          toast.error('Impersonation failed');
        }
      })();
    }
  }, [searchParams, setSession, navigate]);

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setSession(data);
      toast.success(`Khush amdeed, ${data.user.fullName.split(' ')[0]}! 🎉`);
      navigate('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Login fail ho gaya');
    },
  });

  const isImpersonating = searchParams.get('impersonate') === '1';
  const handleGoogleLogin = () => {
    window.location.href = authApi.googleLoginUrl();
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-slate-50">
      {/* Left side — Premium gradient panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-emerald-600 via-brand-700 to-emerald-900 text-white p-12 relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl translate-y-1/4 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

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
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Wapas khush amdeed
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
            Apni dukan ka <br />
            <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
              complete control
            </span>
          </h1>
          <p className="text-emerald-100 text-lg leading-relaxed max-w-md">
            POS, inventory, khata, reports — sab ek hi jagah. Apni dukan ko digital banayein, profit calculate karein.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-3 hover:bg-white/15 transition"
                >
                  <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-bold">{f.label}</div>
                  <div className="text-xs text-emerald-200 mt-0.5">{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-emerald-200">
          <div>© {new Date().getFullYear()} Nafaa.pk</div>
          <div className="flex items-center gap-3">
            <Link to="/legal" className="hover:text-white">Privacy</Link>
            <span>•</span>
            <Link to="/legal" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </div>

      {/* Right side — Login form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-2">
            <Logo size={36} />
            <span className="text-2xl font-extrabold text-slate-900">Nafaa</span>
          </div>

          {isImpersonating && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-bold text-amber-900">Admin Impersonation</div>
                <div className="text-amber-800 text-xs mt-1">
                  Auto-login ho raha hai... please wait.
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Login karein</h2>
            <p className="text-slate-600 text-sm mt-1.5">
              Apni dukan ka dashboard kholein
            </p>
          </div>

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 shadow-sm"
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
              <span className="bg-slate-50 px-3 text-slate-500 font-medium">YA EMAIL SE</span>
            </div>
          </div>

          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            className="space-y-4"
          >
            <Input
              label="Email"
              type="email"
              placeholder="ahmad@example.com"
              leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
              {...form.register('email')}
              error={form.formState.errors.email?.message}
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

            <Button
              type="submit"
              loading={mutation.isPending}
              className="w-full"
              size="lg"
            >
              Login
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Naya user?{' '}
            <Link to="/register" className="font-bold text-brand-700 hover:text-brand-800">
              Free account banayein
            </Link>
          </p>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Secure login • SSL encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
