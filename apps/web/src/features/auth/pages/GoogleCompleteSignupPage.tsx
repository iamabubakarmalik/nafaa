import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Store, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  shopName: z.string().min(2, 'Shop ka naam likhein (min 2 chars)'),
});

type FormData = z.infer<typeof schema>;

interface PendingGoogleUser {
  tempToken: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export default function GoogleCompleteSignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [pending, setPending] = useState<PendingGoogleUser | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const tempToken = params.get('tempToken');
    const email = params.get('email');
    const fullName = params.get('fullName');
    const avatarUrl = params.get('avatarUrl') || undefined;

    if (!tempToken || !email || !fullName) {
      toast.error('Google signup data missing');
      navigate('/login', { replace: true });
      return;
    }
    setPending({ tempToken, email, fullName, avatarUrl });
  }, [navigate]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { shopName: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      authApi.completeGoogleSignup(pending!.tempToken, data.shopName.trim()),
    onSuccess: (data) => {
      setSession(data);
      toast.success(`Mubarak ho ${data.user.fullName.split(' ')[0]}! 🎉`);
      navigate('/onboarding', { replace: true });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Account banane mein masla');
    },
  });

  if (!pending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Nafaa</div>
            <div className="text-xs text-slate-500">Pakistan-first retail OS</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-brand-700 p-8 text-white">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 mb-4">
              <Store className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-extrabold">Aakhri Step!</h2>
            <p className="text-emerald-100 text-sm mt-2">
              Apni dukan ka naam batayein
            </p>
          </div>

          <div className="p-8 space-y-5">
            {/* Google account confirmation */}
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
              {pending.avatarUrl ? (
                <img src={pending.avatarUrl} className="h-10 w-10 rounded-full" alt="" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center">
                  {pending.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-emerald-900 truncate">{pending.fullName}</div>
                <div className="text-xs text-emerald-700 truncate">{pending.email}</div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Google se sign in ho gaya hai ✅<br />
              Bas apni dukan/business ka naam batayein:
            </p>

            <form
              onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
              className="space-y-4"
            >
              <Input
                label="Shop / Business Name"
                placeholder="e.g. Ahmad Bakery"
                leftIcon={<Store className="h-4 w-4 text-slate-400" />}
                autoFocus
                {...form.register('shopName')}
                error={form.formState.errors.shopName?.message}
              />

              <Button
                type="submit"
                loading={mutation.isPending}
                className="w-full"
                size="lg"
              >
                Account Banayein
                <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Continue karke aap{' '}
                <Link to="/legal" className="font-bold text-emerald-700">Terms</Link> aur{' '}
                <Link to="/legal" className="font-bold text-emerald-700">Privacy</Link> se agree karte hain.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
