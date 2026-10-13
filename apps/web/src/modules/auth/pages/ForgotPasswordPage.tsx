/** Forgot password: asks for the account email and sends a reset link. */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react';
import { authApi } from '@modules/auth/api/auth.api';
import { Alert, Button, Input } from '@/design-system/components';
import { AuthHeading, AuthLayout } from '../components/AuthLayout';
import { authErrorMessage, retryAfterSeconds } from '../lib/auth-errors';

const schema = z.object({
  email: z.string().trim().min(1, 'Email likhein').email('Email sahi nahi lag raha. Misaal: ahmad@gmail.com'),
});

type FormData = z.infer<typeof schema>;

const RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const mutation = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: (_, email) => {
      setSentTo(email);
      setFormError(null);
      setCooldown(RESEND_SECONDS);
    },
    onError: (err) => {
      setCooldown(retryAfterSeconds(err) ?? 0);
      setFormError(authErrorMessage(err, 'Link nahi bheja ja saka. Dobara koshish karein.'));
    },
  });

  const send = (email: string) => {
    setFormError(null);
    mutation.mutate(email);
  };

  return (
    <AuthLayout side="signin">
      {sentTo ? (
        <div>
          <AuthHeading
            icon={<MailCheck className="h-5 w-5" />}
            title="Email check karein"
            subtitle={<>Agar <strong className="font-semibold text-slate-800 break-all">{sentTo}</strong> se Nafaa account bana hai to us par password badalne ka link bhej diya gaya hai.</>}
          />
          <ul className="mb-6 space-y-2 text-sm text-slate-600">
            <li className="flex gap-2"><span aria-hidden>•</span>Link 1 ghante tak chalega.</li>
            <li className="flex gap-2"><span aria-hidden>•</span>Inbox me na mile to Spam / Promotions folder dekhein.</li>
            <li className="flex gap-2"><span aria-hidden>•</span>Google se account banaya tha? To seedha "Google se login" kar lein.</li>
          </ul>
          {formError && <Alert tone="danger" className="mb-4">{formError}</Alert>}
          <div className="space-y-2">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              loading={mutation.isPending}
              disabled={cooldown > 0}
              onClick={() => send(sentTo)}
            >
              {cooldown > 0 ? `Dobara bhejein (${cooldown}s)` : 'Link dobara bhejein'}
            </Button>
            <Button variant="ghost" size="lg" fullWidth onClick={() => { setSentTo(null); setFormError(null); }}>
              Doosra email likhein
            </Button>
          </div>
        </div>
      ) : (
        <>
          <AuthHeading
            icon={<KeyRound className="h-5 w-5" />}
            title="Password bhool gaye?"
            subtitle="Koi baat nahi. Apna account wala email likhein — hum naya password banane ka link bhej denge."
          />
          <form onSubmit={form.handleSubmit((d) => send(d.email))} className="space-y-4" noValidate>
            {formError && <Alert tone="danger">{formError}</Alert>}
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="ahmad@gmail.com"
              size="lg"
              autoFocus
              leftIcon={<Mail className="h-4 w-4" />}
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />
            <Button type="submit" size="xl" fullWidth loading={mutation.isPending} disabled={cooldown > 0}>
              {cooldown > 0 ? `${cooldown} second ruk-ein…` : 'Reset link bhejein'}
            </Button>
          </form>
        </>
      )}

      <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Login par wapas
      </Link>
    </AuthLayout>
  );
}
