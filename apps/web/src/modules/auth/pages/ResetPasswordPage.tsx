/** Reset password from the emailed link (/reset-password?token=…). */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, LinkIcon } from 'lucide-react';
import { authApi } from '@modules/auth/api/auth.api';
import { Alert, Button } from '@/design-system/components';
import { AuthHeading, AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { authErrorMessage } from '../lib/auth-errors';
import { t as tr } from '@core/i18n';

const schema = z
  .object({
    newPassword: z.string().min(8, tr('Password kam se kam 8 huroof ka rakhein')),
    confirmPassword: z.string().min(1, tr('Password dobara likhein')),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: tr('Dono password ek jaise nahi hain'),
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const REDIRECT_SECONDS = 4;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [formError, setFormError] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { newPassword: '', confirmPassword: '' } });
  const password = form.watch('newPassword');

  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) {
      navigate('/login', { replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown, navigate]);

  const mutation = useMutation({
    mutationFn: (d: FormData) => authApi.resetPassword(token!, d.newPassword),
    onSuccess: () => setDone(true),
    onError: (err: any) => {
      const raw = String(err?.response?.data?.message ?? '');
      setLinkExpired(/token/i.test(raw));
      setFormError(authErrorMessage(err, tr('Password nahi badla ja saka. Dobara koshish karein.')));
    },
  });

  if (!token) {
    return (
      <AuthLayout side="signin">
        <AuthHeading
          icon={<LinkIcon className="h-5 w-5" />}
          title={tr('Link adhoora hai')}
          subtitle={tr('Email wala pura link kholein, ya naya link mangwa lein.')}
        />
        <Button size="xl" fullWidth onClick={() => navigate('/forgot-password')}>{tr('Naya link mangwaein')}</Button>
        <Link to="/login" className="mt-4 block text-center text-sm font-semibold text-slate-600 hover:text-slate-900">{tr('Login par wapas')}</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout side="signin">
      {done ? (
        <div>
          <AuthHeading
            icon={<CheckCircle2 className="h-5 w-5" />}
            title={tr('Naya password lag gaya')}
            subtitle={tr('Ab naye password se login karein. {{countdown}} second me login page khul jayega.', { countdown })}
          />
          <Button size="xl" fullWidth onClick={() => navigate('/login', { replace: true })} rightIcon={<ArrowRight className="h-4 w-4 rtl-flip" />}>
            {tr('Abhi login karein')}
          </Button>
        </div>
      ) : (
        <>
          <AuthHeading
            icon={<KeyRound className="h-5 w-5" />}
            title={tr('Naya password banayein')}
            subtitle={tr('Aisa password rakhein jo yaad rahe lekin doosre andaza na laga saken.')}
          />
          <form onSubmit={form.handleSubmit((d) => { setFormError(null); mutation.mutate(d); })} className="space-y-4" noValidate>
            {formError && (
              <Alert
                tone="danger"
                action={linkExpired ? <Link to="/forgot-password" className="text-xs font-semibold underline">{tr('Naya link')}</Link> : undefined}
              >
                {formError}
              </Alert>
            )}
            <PasswordField
              label={tr('Naya password')}
              autoComplete="new-password"
              placeholder={tr('Kam se kam 8 huroof')}
              autoFocus
              strengthOf={password}
              {...form.register('newPassword')}
              error={form.formState.errors.newPassword?.message}
            />
            <PasswordField
              label={tr('Password dobara likhein')}
              autoComplete="new-password"
              placeholder={tr('Wahi password')}
              {...form.register('confirmPassword')}
              error={form.formState.errors.confirmPassword?.message}
            />
            <Button type="submit" size="xl" fullWidth loading={mutation.isPending} rightIcon={<ArrowRight className="h-4 w-4 rtl-flip" />}>
              {tr('Password badlein')}
            </Button>
          </form>
          <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-slate-600 hover:text-slate-900">{tr('Login par wapas')}</Link>
        </>
      )}
    </AuthLayout>
  );
}
