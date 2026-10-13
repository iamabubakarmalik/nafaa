/**
 * New Google user: asks for the shop name (required by the API) and the
 * industry, then creates the account with the temporary Google token.
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, Loader2, Store } from 'lucide-react';
import { authApi } from '@modules/auth/api/auth.api';
import { onboardingApi } from '@modules/onboarding/api/onboarding.api';
import { useAuthStore } from '@core/stores/auth.store';
import { Alert, Button, Input } from '@/design-system/components';
import { AuthHeading, AuthLayout } from '../components/AuthLayout';
import { IndustryPicker } from '../components/IndustryPicker';
import { authErrorMessage } from '../lib/auth-errors';
import { applySignupIndustry, industryChoices, readSignupIndustry, rememberSignupIndustry } from '../lib/industry-choices';

const schema = z.object({
  shopName: z.string().trim().min(2, 'Dukaan ka naam likhein (kam se kam 2 huroof)').max(100, 'Naam 100 huroof se chhota rakhein'),
  businessType: z.string().min(1, 'Apna kaam chunein — is se app aap ke hisaab se set hoti hai'),
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
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const choices = useMemo(industryChoices, []);
  const [pending, setPending] = useState<PendingGoogleUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const tempToken = params.get('tempToken');
    const email = params.get('email');
    const fullName = params.get('fullName');
    const avatarUrl = params.get('avatarUrl') || undefined;
    if (!tempToken || !email || !fullName) {
      toast.error('Google ki maloomat nahi mili. Dobara try karein.');
      navigate('/login', { replace: true });
      return;
    }
    setPending({ tempToken, email, fullName, avatarUrl });
  }, [navigate]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { shopName: '', businessType: readSignupIndustry() ?? '' },
  });
  const businessType = form.watch('businessType');

  const mutation = useMutation({
    mutationFn: (d: FormData) => authApi.completeGoogleSignup(pending!.tempToken, d.shopName.trim()),
    onSuccess: async (data, vars) => {
      setSession(data);
      // Drop cached data from any previous account so OnboardingGate reads fresh state.
      queryClient.clear();
      rememberSignupIndustry(vars.businessType);
      await applySignupIndustry(vars.businessType);
      try {
        await queryClient.fetchQuery({ queryKey: ['onboarding'], queryFn: onboardingApi.get });
      } catch {
        // OnboardingGate retries.
      }
      toast.success(`Mubarak ho, ${data.user.fullName.split(' ')[0]}!`);
      navigate('/onboarding', { replace: true });
    },
    onError: (err) => setFormError(authErrorMessage(err, 'Account nahi ban saka. Dobara koshish karein.')),
  });

  if (!pending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-label="Load ho raha hai" />
      </div>
    );
  }

  return (
    <AuthLayout side="signup" wide>
      <AuthHeading title="Bas aakhri qadam" subtitle="Apni dukaan ka naam aur kaam batayein — account foran ban jayega." />

      <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        {pending.avatarUrl ? (
          <img src={pending.avatarUrl} className="h-10 w-10 rounded-full" alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-semibold text-brand-fg">
            {pending.fullName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{pending.fullName}</div>
          <div className="truncate text-xs text-slate-500">{pending.email}</div>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-success-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Google
        </span>
      </div>

      <form onSubmit={form.handleSubmit((d) => { setFormError(null); mutation.mutate(d); })} className="space-y-5" noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Input
          label="Dukaan / business ka naam"
          placeholder="Misaal: Ahmad Medical Store"
          size="lg"
          autoFocus
          leftIcon={<Store className="h-4 w-4" />}
          hint="Bill aur receipt par yahi naam chhapega."
          {...form.register('shopName')}
          error={form.formState.errors.shopName?.message}
        />
        <IndustryPicker
          choices={choices}
          value={businessType}
          onChange={(v) => form.setValue('businessType', v, { shouldValidate: true })}
          error={form.formState.errors.businessType?.message}
        />
        <Button type="submit" size="xl" fullWidth loading={mutation.isPending} rightIcon={<ArrowRight className="h-4 w-4" />}>
          Account banayein
        </Button>
        <p className="text-center text-xs leading-relaxed text-slate-500">
          Account bana kar aap Nafaa ki{' '}
          <Link to="/legal" className="font-semibold text-brand-700 hover:underline">Terms</Link> aur{' '}
          <Link to="/legal" className="font-semibold text-brand-700 hover:underline">Privacy Policy</Link> se mutafiq hain.
        </p>
      </form>
    </AuthLayout>
  );
}
