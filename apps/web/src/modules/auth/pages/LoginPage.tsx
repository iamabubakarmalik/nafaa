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
  WifiOff, Wifi,
} from 'lucide-react';
import { authApi } from '@modules/auth/api/auth.api';
import { useAuthStore } from '@core/stores/auth.store';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { apiClient } from '@core/api/client';
import { Logo } from '@core/components/brand/Logo';
import { useOnlineStatus } from '@core/lib/offline/useOnlineStatus';
import {
  cacheOfflineCredential,
  verifyOfflineLogin,
  hasOfflineCredential,
  getOfflineCredential,
  clearOfflineCredential,
} from '@core/lib/offline/offlineAuth';
import { prewarmAfterLogin } from '@core/lib/offline/offlinePrewarm';
import { downloadAllData } from '@core/lib/offline/syncEngine';

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
  const [offlineBusy, setOfflineBusy] = useState(false);
  const isOnline = useOnlineStatus();

  const offlineAvailable = hasOfflineCredential();
  const cachedEmail = getOfflineCredential()?.email;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: cachedEmail || '', password: '' },
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
    onSuccess: (data, vars) => {
      setSession(data);

      // ═══ Offline login ke liye credential cache karo ═══
      void cacheOfflineCredential(vars.email, vars.password, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        tenant: data.tenant,
      });

      // ═══ AUTO-PREWARM: sab pages ka data background me load ═══
      // Ye login ke baad chalta hai taake user offline jaye to sab pages me data ho
      setTimeout(() => {
        downloadAllData(true).catch(() => {});
        prewarmAfterLogin().catch(() => {});
      }, 1000);

      const firstName = data.user.fullName.split(' ')[0];

      // First-time users ko batao ke offline data taiyar ho rahi hai
      setTimeout(() => {
        toast.info('📦 Offline data taiyar ho raha hai…', {
          description: '10 second wait karein — phir aap net ke bina bhi kaam kar saken ge',
          duration: 8000,
        });
      }, 2000);

      if ((data as any).isNewDevice) {
        toast.success(`Khush amdeed, ${firstName}! 🎉`, {
          description: 'New device detected — security email bhej diya gaya hai',
          duration: 6000,
        });
      } else {
        toast.success(`Khush amdeed, ${firstName}! 🎉`);
      }

      navigate('/dashboard', { replace: true });
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      // Network error + offline credential available → offline login suggest karo
      if ((!status || status === 0 || status >= 500) && hasOfflineCredential()) {
        toast.error('Server tak pahunch nahi pa rahe', {
          description: 'Offline Login try karein (neeche)',
          duration: 5000,
        });
        return;
      }
      toast.error(err?.response?.data?.message || 'Login fail ho gaya');
    },
  });

  // ═══ SWITCH ACCOUNT (clears offline credential) ═══
  const handleSwitchAccount = () => {
    if (!confirm('Saved account clear kar dein? Doosra user login kar sake ga (offline access bhi khatam hogi jab tak aap online wapis login na karein).')) return;
    clearOfflineCredential();
    form.reset({ email: '', password: '' });
    toast.info('Saved account clear ho gaya — naya login karein');
    // Force re-render
    window.location.reload();
  };

  // ═══ OFFLINE LOGIN HANDLER ═══
  const handleOfflineLogin = async (d: FormData) => {
    setOfflineBusy(true);
    try {
      const rec = await verifyOfflineLogin(d.email, d.password);
      if (!rec) {
        toast.error('Email ya password match nahi hua', {
          description: 'Offline login sirf last saved account se hota hai',
        });
        return;
      }
      setSession({
        accessToken: rec.accessToken,
        refreshToken: rec.refreshToken,
        user: rec.user,
        tenant: rec.tenant,
      });
      toast.success(`📡 Offline login — khush amdeed, ${rec.user.fullName.split(' ')[0]}!`, {
        description: 'Sales/data locally save honge — net aate hi sync',
        duration: 5000,
      });
      navigate('/dashboard', { replace: true });
    } finally {
      setOfflineBusy(false);
    }
  };

  const onSubmit = (d: FormData) => {
    // Offline hai aur server se login mumkin nahi → offline verify
    if (!isOnline) {
      handleOfflineLogin(d);
      return;
    }
    mutation.mutate(d);
  };

  const isImpersonating = searchParams.get('impersonate') === '1';
  const handleGoogleLogin = () => {
    if (!isOnline) {
      toast.error('Google login ke liye internet chahiye');
      return;
    }
    window.location.href = authApi.googleLoginUrl();
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-slate-50">
      {/* Left side — Premium gradient panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-emerald-600 via-brand-700 to-emerald-900 text-white p-12 relative overflow-hidden">
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
            POS, inventory, khata, reports — sab ek hi jagah. Net ho ya na ho, dukaan chalti rahegi.
          </p>

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
          <div className="lg:hidden flex items-center justify-center gap-3 mb-2">
            <Logo size={36} />
            <span className="text-2xl font-extrabold text-slate-900">Nafaa</span>
          </div>

          {/* ═══ OFFLINE STATUS BANNER ═══ */}
          {!isOnline && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
              <WifiOff className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm flex-1">
                <div className="font-bold text-amber-900">Offline Mode</div>
                <div className="text-amber-800 text-xs mt-1">
                  {offlineAvailable
                    ? 'Internet nahi hai — saved account se offline login kar sakte hain.'
                    : 'Internet nahi hai — pehle ek dafa online login zaroori hai.'}
                </div>
              </div>
            </div>
          )}

          {isImpersonating && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-bold text-amber-900">Admin Impersonation</div>
                <div className="text-amber-800 text-xs mt-1">Auto-login ho raha hai... please wait.</div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Login karein</h2>
            <p className="text-slate-600 text-sm mt-1.5">Apni dukan ka dashboard kholein</p>
          </div>

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={!isOnline}
            className="w-full h-12 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google se Login karein
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-50 px-3 text-slate-500 font-medium">YA EMAIL SE</span>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                {isOnline && (
                  <Link to="/forgot-password" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                    Bhool gaye?
                  </Link>
                )}
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
                <p className="text-xs text-rose-600 mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              loading={mutation.isPending || offlineBusy}
              className="w-full"
              size="lg"
            >
              {!isOnline ? (
                <>
                  <WifiOff className="h-4 w-4" /> Offline Login
                </>
              ) : (
                <>
                  Login <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* Offline hint */}
            {!isOnline && offlineAvailable && (
              <div className="text-center space-y-1">
                <p className="text-xs text-amber-700 font-semibold">
                  💾 Saved account: {cachedEmail} — wahi password use karein
                </p>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="text-xs text-slate-500 hover:text-slate-700 underline font-medium"
                >
                  Doosra account use karna hai?
                </button>
              </div>
            )}

            {/* Show saved account even when online */}
            {isOnline && offlineAvailable && cachedEmail && (
              <p className="text-center text-[11px] text-slate-400 font-medium">
                💾 Offline access ready for: <strong className="text-slate-600">{cachedEmail}</strong>
                {' • '}
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="text-slate-500 hover:text-slate-700 underline"
                >
                  Switch
                </button>
              </p>
            )}
          </form>

          <p className="text-center text-sm text-slate-600">
            Naya user?{' '}
            <Link to="/register" className="font-bold text-brand-700 hover:text-brand-800">
              Free account banayein
            </Link>
          </p>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
            {isOnline ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Secure login • SSL encrypted</span>
              </>
            ) : (
              <>
                <Wifi className="h-3 w-3 text-amber-600" />
                <span>Offline mode • data device pe safe hai</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
