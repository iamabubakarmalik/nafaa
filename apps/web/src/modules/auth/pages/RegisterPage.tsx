/**
 * Sign-up in two short parts: the shop (name + industry), then the owner's
 * account. The register API is unchanged; the picked industry is applied
 * right after the account exists and onboarding opens with it selected.
 */

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Gift, Mail, Phone, Store, User } from 'lucide-react';
import { authApi } from '@modules/auth/api/auth.api';
import { useAuthStore } from '@core/stores/auth.store';
import { Alert, Button, Input } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { AuthHeading, AuthLayout, OrDivider } from '../components/AuthLayout';
import { GoogleButton } from '../components/GoogleButton';
import { IndustryPicker } from '../components/IndustryPicker';
import { PasswordField } from '../components/PasswordField';
import { authErrorMessage } from '../lib/auth-errors';
import { applySignupIndustry, industryChoices, rememberSignupIndustry } from '../lib/industry-choices';

const stripPhone = (v: unknown) => (typeof v === 'string' ? v.replace(/[\s-]/g, '') : v);

const schema = z.object({
  shopName: z.string().trim().min(2, 'Dukaan ka naam likhein (kam se kam 2 huroof)').max(100, 'Naam 100 huroof se chhota rakhein'),
  businessType: z.string().min(1, 'Apna kaam chunein — is se app aap ke hisaab se set hoti hai'),
  fullName: z.string().trim().min(2, 'Apna naam likhein').max(100, 'Naam 100 huroof se chhota rakhein'),
  email: z.string().trim().min(1, 'Email likhein').email('Email sahi nahi lag raha. Misaal: ahmad@gmail.com'),
  phone: z.preprocess(
    stripPhone,
    z.string().regex(/^\+?[0-9]{10,15}$/, 'Mobile number sahi nahi. Misaal: 03001234567').optional().or(z.literal('')),
  ),
  password: z.string().min(8, 'Password kam se kam 8 huroof ka rakhein').max(64, 'Password 64 huroof se chhota rakhein'),
  referralCode: z.string().trim().max(40, 'Code bohat lamba hai').optional().or(z.literal('')),
});

type FormValues = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const refFromUrl = searchParams.get('ref') || '';
  const choices = useMemo(industryChoices, []);

  const [part, setPart] = useState<1 | 2>(1);
  const [showReferral, setShowReferral] = useState(!!refFromUrl);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { shopName: '', businessType: '', fullName: '', email: '', phone: '', password: '', referralCode: refFromUrl },
  });
  const businessType = form.watch('businessType');
  const password = form.watch('password');

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setSession(data);
      const picked = form.getValues('businessType');
      rememberSignupIndustry(picked);
      void applySignupIndustry(picked);
      toast.success('Mubarak ho! Aap ka account ban gaya', { description: 'Email par 6 number ka code bheja gaya hai' });
      navigate('/verify-email', { replace: true, state: { codeSent: true } });
    },
    onError: (err: any) => {
      const msg = authErrorMessage(err, 'Account nahi ban saka. Dobara koshish karein.');
      const raw = String(err?.response?.data?.message ?? '');
      if (/phone/i.test(raw)) form.setError('phone', { message: msg });
      else if (/referral/i.test(raw)) form.setError('referralCode', { message: msg });
      else if (/shop/i.test(raw)) { setPart(1); form.setError('shopName', { message: msg }); }
      else setFormError(msg);
    },
  });

  const goToAccount = async () => {
    const ok = await form.trigger(['shopName', 'businessType']);
    if (ok) {
      setFormError(null);
      setPart(2);
    }
  };

  const onSubmit = (d: FormData) => {
    setFormError(null);
    mutation.mutate({
      shopName: d.shopName,
      fullName: d.fullName,
      email: d.email,
      phone: d.phone || undefined,
      password: d.password,
      referralCode: d.referralCode || undefined,
    });
  };

  const emailTaken = formError?.includes('pehle hi account');

  return (
    <AuthLayout side="signup" wide={part === 1}>
      <PartSteps part={part} />

      {part === 1 ? (
        <>
          <AuthHeading title="Apni dukaan banayein" subtitle="7 din free · card ki zaroorat nahi · jab chahein band karein" />

          {refFromUrl && (
            <Alert tone="success" title="Referral code lag gaya" icon={<Gift className="h-4 w-4 text-success-600" />} className="mb-5">
              Aap ke dost ko reward milega jab aap plan lenge.
            </Alert>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); void goToAccount(); }}
            className="space-y-5"
            noValidate
          >
            <Input
              label="Dukaan / business ka naam"
              placeholder="Misaal: Ahmad Medical Store"
              size="lg"
              autoFocus
              leftIcon={<Store className="h-4 w-4" />}
              hint="Bill aur receipt par yahi naam chhapega. Baad me badal sakte hain."
              {...form.register('shopName')}
              error={form.formState.errors.shopName?.message}
            />

            <IndustryPicker
              choices={choices}
              value={businessType}
              onChange={(v) => form.setValue('businessType', v, { shouldValidate: true })}
              error={form.formState.errors.businessType?.message}
            />

            <Button type="submit" size="xl" fullWidth rightIcon={<ArrowRight className="h-4 w-4" />}>
              Aage barhein
            </Button>
          </form>

          <OrDivider label="ya" />
          <GoogleButton
            label="Google se account banayein"
            onBeforeRedirect={() => { if (businessType) rememberSignupIndustry(businessType); }}
          />
          <p className="mt-2 text-center text-xs text-slate-500">Google ke baad sirf dukaan ka naam poochenge.</p>
        </>
      ) : (
        <>
          <AuthHeading
            title="Aap ka account"
            subtitle={<>Is se aap <strong className="font-semibold text-slate-800">{form.getValues('shopName')}</strong> me login karenge.</>}
          />

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {formError && (
              <Alert
                tone="danger"
                action={emailTaken ? <Link to="/login" className="text-xs font-semibold underline">Login</Link> : undefined}
              >
                {formError}
              </Alert>
            )}

            <Input
              label="Aap ka naam"
              placeholder="Ahmad Ali"
              autoComplete="name"
              size="lg"
              autoFocus
              leftIcon={<User className="h-4 w-4" />}
              {...form.register('fullName')}
              error={form.formState.errors.fullName?.message}
            />
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="ahmad@gmail.com"
              size="lg"
              leftIcon={<Mail className="h-4 w-4" />}
              hint="Login aur password reset isi email se hoga."
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />
            <Input
              label={<>Mobile <span className="font-normal text-slate-500">(zaroori nahi)</span></>}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="03001234567"
              size="lg"
              leftIcon={<Phone className="h-4 w-4" />}
              {...form.register('phone')}
              error={form.formState.errors.phone?.message}
            />
            <PasswordField
              autoComplete="new-password"
              placeholder="Kam se kam 8 huroof"
              strengthOf={password}
              hint={password ? undefined : 'Number aur nishaan (@, #) mila kar mazboot banayein.'}
              {...form.register('password')}
              error={form.formState.errors.password?.message}
            />

            {showReferral ? (
              <Input
                label="Referral code"
                placeholder="NAFAA-XXXX"
                autoCapitalize="characters"
                leftIcon={<Gift className="h-4 w-4" />}
                {...form.register('referralCode')}
                error={form.formState.errors.referralCode?.message}
              />
            ) : (
              <button type="button" onClick={() => setShowReferral(true)} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">
                Referral code hai?
              </button>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="xl" onClick={() => setPart(1)} leftIcon={<ArrowLeft className="h-4 w-4" />} aria-label="Wapas">
                <span className="hidden sm:inline">Wapas</span>
              </Button>
              <Button type="submit" size="xl" className="flex-1" loading={mutation.isPending} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Account banayein
              </Button>
            </div>

            <p className="text-center text-xs leading-relaxed text-slate-500">
              Account bana kar aap Nafaa ki{' '}
              <Link to="/legal" className="font-semibold text-brand-700 hover:underline">Terms</Link> aur{' '}
              <Link to="/legal" className="font-semibold text-brand-700 hover:underline">Privacy Policy</Link> se mutafiq hain.
            </p>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        Pehle se account hai?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">Login karein</Link>
      </p>
    </AuthLayout>
  );
}

function PartSteps({ part }: { part: 1 | 2 }) {
  return (
    <ol className="mb-5 flex items-center gap-2 text-xs font-semibold" aria-label="Sign-up ke hisse">
      {(['Dukaan', 'Account'] as const).map((label, i) => {
        const n = (i + 1) as 1 | 2;
        const done = n < part;
        const active = n === part;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            {i > 0 && <span className={cn('h-px w-6', done || active ? 'bg-brand-400' : 'bg-slate-300')} aria-hidden />}
            <span className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-[0.6875rem]',
              active ? 'bg-brand-600 text-brand-fg' : done ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500',
            )}>
              {n}
            </span>
            <span className={active ? 'text-slate-900' : 'text-slate-500'}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
