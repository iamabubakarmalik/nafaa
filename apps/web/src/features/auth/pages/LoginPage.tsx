import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/api/client';

const schema = z.object({
  email: z.string().email('Sahi email likhein'),
  password: z.string().min(8, 'Kam se kam 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // Handle admin impersonation
  useEffect(() => {
    const impersonate = searchParams.get('impersonate');
    const access = searchParams.get('access');
    const refresh = searchParams.get('refresh');

    if (impersonate === '1' && access && refresh) {
      (async () => {
        try {
          // Temporarily set token to fetch user/tenant
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
            toast.success(`🔐 Impersonating ${data.tenant.name} (1 hour limit)`);
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
      toast.success('Welcome back!');
      navigate('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Login fail ho gaya');
    },
  });

  const isImpersonating = searchParams.get('impersonate') === '1';

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white p-12">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-7 w-7 text-accent-500" />
          Nafaa
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Wapas khush amdeed!
          </h1>
          <p className="text-brand-100 text-lg">
            Apni dukan ka complete control — POS, inventory, sales, customers, sab kuch.
          </p>
        </div>
        <div className="text-sm text-brand-200">
          © {new Date().getFullYear()} Nafaa.pk
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md space-y-6">
          {isImpersonating && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-bold text-amber-900">Admin Impersonation</div>
                <div className="text-amber-800 text-xs mt-1">
                  Auto-login ho raha hai... agar nahi hota to admin se dobara try karein.
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-3xl font-bold text-slate-900">Login karein</h2>
            <p className="text-slate-600 text-sm mt-2">
              Apni dukan ka dashboard kholein
            </p>
          </div>

          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            className="space-y-4"
          >
            <Input
              label="Email"
              type="email"
              placeholder="ahmad@example.com"
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...form.register('password')}
              error={form.formState.errors.password?.message}
            />

            <Button type="submit" loading={mutation.isPending} className="w-full" size="lg">
              Login <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Naya account?{' '}
            <Link to="/register" className="font-medium text-brand-700 hover:text-brand-800">
              Register karein
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
