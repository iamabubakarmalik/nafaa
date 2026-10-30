/**
 * New Google user: asks for the shop name (required by the API), how the
 * business sells and the industry, then creates the account with the
 * temporary Google token.
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
import { BusinessModelPicker } from '../components/BusinessModelPicker';
import { authErrorMessage } from '../lib/auth-errors';
import { industryChoices, readSignupIndustry, rememberSignupIndustry, setUpNewAccount } from '../lib/industry-choices';
import { DEFAULT_MODELS, readSignupModels, rememberSignupModels, type BusinessModel } from '@core/lib/business-models';
import { t, Trans } from '@core/i18n';

const schema = z.object({
  shopName: z.string().trim().min(2, t('Dukaan ka naam likhein (kam se kam 2 huroof)')).max(100, t('Naam 100 huroof se chhota rakhein')),
  businessType: z.string().min(1, t('Apna kaam chunein — is se app aap ke hisaab se set hoti hai')),
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
  const [models, setModels] = useState<BusinessModel[]>(() => readSignupModels() ?? DEFAULT_MODELS);
  const choices = useMemo(() => industryChoices(models), [models]);
  const [pending, setPending] = useState<PendingGoogleUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const tempToken = params.get('tempToken');
    const email = params.get('email');
    const fullName = params.get('fullName');
    const avatarUrl = params.get('avatarUrl') || undefined;
    if (!tempToken || !email || !fullName) {
      toast.error(t('Google ki maloomat nahi mili. Dobara try karein.'));
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
      rememberSignupModels(models);
      await setUpNewAccount(vars.businessType, models);
      try {
        await queryClient.fetchQuery({ queryKey: ['onboarding'], queryFn: onboardingApi.get });
      } catch {
        // OnboardingGate retries.
      }
      toast.success(t('Mubarak ho, {{value}}!', { value: data.user.fullName.split(' ')[0] }));
      navigate('/onboarding', { replace: true });
    },
    onError: (err) => setFormError(authErrorMessage(err, t('Account nahi ban saka. Dobara koshish karein.'))),
  });

  if (!pending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-label={t('Load ho raha hai')} />
      </div>
    );
  }

  return (
    <AuthLayout side="signup" wide>
      <AuthHeading title={t('Bas aakhri qadam')} subtitle={t('Apne business ka naam aur kaam batayein — account foran ban jayega.')} />

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
          <CheckCircle2 className="h-4 w-4" aria-hidden /> {' '}{t('Google')}
        </span>
      </div>

      <form onSubmit={form.handleSubmit((d) => { setFormError(null); mutation.mutate(d); })} className="space-y-5" noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Input
          label={t('Dukaan / business ka naam')}
          placeholder={t('Misaal: Ahmad Medical Store')}
          size="lg"
          autoFocus
          leftIcon={<Store className="h-4 w-4" />}
          hint={t('Bill aur receipt par yahi naam chhapega.')}
          {...form.register('shopName')}
          error={form.formState.errors.shopName?.message}
        />
        <BusinessModelPicker value={models} onChange={setModels} />
        <IndustryPicker
          label={models.length === 1 && models[0] === 'RETAIL' ? t('Aap ka kaam kya hai?') : t('Aap kis cheez ka kaam karte hain?')}
          choices={choices}
          value={businessType}
          onChange={(v) => form.setValue('businessType', v, { shouldValidate: true })}
          error={form.formState.errors.businessType?.message}
        />
        <Button type="submit" size="xl" fullWidth loading={mutation.isPending} rightIcon={<ArrowRight className="h-4 w-4 rtl-flip" />}>
          {t('Create account')}
        </Button>
        <p className="text-center text-xs leading-relaxed text-slate-500">
          <Trans text="Account bana kar aap Nafaa ki {{terms}} aur {{privacy}} se mutafiq hain." values={{
            terms: <Link to="/legal" className="font-semibold text-brand-700 hover:underline">{t('Terms')}</Link>,
            privacy: <Link to="/legal" className="font-semibold text-brand-700 hover:underline">{t('Privacy Policy')}</Link>,
          }} />
        </p>
      </form>
    </AuthLayout>
  );
}
