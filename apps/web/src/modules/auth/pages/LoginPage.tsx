/**
 * Sign-in. Email + password or Google, with offline sign-in from the last
 * saved account on this device. Token handling, offline caching and admin
 * impersonation work exactly as before; this file only owns the screen.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Mail, ShieldAlert, UserRound, WifiOff } from 'lucide-react';
import { authApi } from '@modules/auth/api/auth.api';
import { useAuthStore } from '@core/stores/auth.store';
import { Alert, Button, Checkbox, Input, Modal } from '@/design-system/components';
import { apiClient } from '@core/api/client';
import { useOnlineStatus } from '@core/lib/offline/useOnlineStatus';
import {
  cacheOfflineCredential,
  verifyOfflineLogin,
  getOfflineCredential,
  clearOfflineCredential,
  isOfflineCredentialForEmail,
} from '@core/lib/offline/offlineAuth';
import { prewarmAfterLogin } from '@core/lib/offline/offlinePrewarm';
import { downloadAllData } from '@core/lib/offline/syncEngine';
import { AuthHeading, AuthLayout, OrDivider } from '../components/AuthLayout';
import { GoogleButton } from '../components/GoogleButton';
import { PasswordField } from '../components/PasswordField';
import { authErrorMessage, retryAfterSeconds } from '../lib/auth-errors';

const schema = z.object({
  email: z.string().trim().min(1, 'Email likhein').email('Email sahi nahi lag raha. Misaal: ahmad@gmail.com'),
  password: z.string().min(1, 'Password likhein').min(8, 'Password kam se kam 8 huroof ka hota hai'),
});

type FormData = z.infer<typeof schema>;

const REMEMBER_KEY = 'nafaa.auth.remember-device';

function readRemember(): boolean {
  try { return localStorage.getItem(REMEMBER_KEY) !== '0'; } catch { return true; }
}

function writeRemember(on: boolean): void {
  try { localStorage.setItem(REMEMBER_KEY, on ? '1' : '0'); } catch { /* storage blocked */ }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const isOnline = useOnlineStatus();

  const [saved, setSaved] = useState(() => getOfflineCredential());
  const [remember, setRemember] = useState(readRemember);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [confirmSwitch, setConfirmSwitch] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: saved?.email || '', password: '' },
  });

  // Countdown after the server asks us to slow down.
  useEffect(() => {
    if (waitSeconds <= 0) return;
    const t = setTimeout(() => setWaitSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [waitSeconds]);

  // Admin impersonation: the admin panel opens /login?impersonate=1&access=…&refresh=…
  const isImpersonating = searchParams.get('impersonate') === '1';
  useEffect(() => {
    const access = searchParams.get('access');
    const refresh = searchParams.get('refresh');
    if (!isImpersonating || !access || !refresh) return;
    (async () => {
      try {
        const meRes = await apiClient.get('/auth/me', { headers: { Authorization: `Bearer ${access}` } });
        const data = meRes.data?.data;
        if (data?.user && data?.tenant) {
          setSession({ user: data.user, tenant: data.tenant, accessToken: access, refreshToken: refresh });
          toast.success(`Impersonating ${data.tenant.name}`);
          navigate('/dashboard', { replace: true });
        }
      } catch {
        toast.error('Impersonation nahi ho saki');
      }
    })();
  }, [isImpersonating, searchParams, setSession, navigate]);

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data, vars) => {
      setSession(data);
      writeRemember(remember);

      if (remember) {
        // Lets this device sign in without internet next time.
        void cacheOfflineCredential(vars.email, vars.password, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          tenant: data.tenant,
        });
      } else if (isOfflineCredentialForEmail(vars.email)) {
        clearOfflineCredential();
      }

      // Load every page's data in the background so the app works offline.
      setTimeout(() => {
        downloadAllData(true).catch(() => {});
        prewarmAfterLogin().catch(() => {});
      }, 1000);
      setTimeout(() => {
        toast.info('Offline data tayyar ho raha hai…', {
          description: '10 second ruk-ein — phir net ke bina bhi kaam chalega',
          duration: 8000,
        });
      }, 2000);

      const firstName = data.user.fullName.split(' ')[0];
      toast.success(`Khush aamdeed, ${firstName}!`, data.isNewDevice
        ? { description: 'Naya device — aap ki email par security notice bhej diya gaya hai', duration: 6000 }
        : undefined);

      navigate('/dashboard', { replace: true });
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const wait = retryAfterSeconds(err);
      if (status === 429 && wait) setWaitSeconds(wait);
      if (status === 401) setFailedCount((n) => n + 1);

      if ((!status || status >= 500) && getOfflineCredential()) {
        setFormError('Server tak nahi pohanch sake. Neeche "Offline login" se saved account khol sakte hain.');
        return;
      }
      setFormError(authErrorMessage(err, 'Login nahi ho saka. Dobara koshish karein.'));
    },
  });

  const handleOfflineLogin = async (d: FormData) => {
    setOfflineBusy(true);
    try {
      const rec = await verifyOfflineLogin(d.email, d.password);
      if (!rec) {
        setFormError('Email ya password match nahi hua. Offline login sirf is device par aakhri saved account se hota hai.');
        return;
      }
      setSession({ accessToken: rec.accessToken, refreshToken: rec.refreshToken, user: rec.user, tenant: rec.tenant });
      toast.success(`Offline login — khush aamdeed, ${rec.user.fullName.split(' ')[0]}!`, {
        description: 'Sale is device par save hogi, net aate hi sync ho jayegi',
        duration: 5000,
      });
      navigate('/dashboard', { replace: true });
    } finally {
      setOfflineBusy(false);
    }
  };

  const onSubmit = (d: FormData) => {
    setFormError(null);
    if (!isOnline) {
      void handleOfflineLogin(d);
      return;
    }
    mutation.mutate({ email: d.email.trim(), password: d.password });
  };

  const switchAccount = () => {
    clearOfflineCredential();
    setSaved(null);
    form.reset({ email: '', password: '' });
    setConfirmSwitch(false);
    toast.info('Saved account hata diya — naya login karein');
  };

  const offlineNoAccount = !isOnline && !saved;

  return (
    <AuthLayout side="signin">
      {isImpersonating && (
        <Alert tone="warning" title="Admin impersonation" icon={<ShieldAlert className="h-4 w-4 text-amber-600" />} className="mb-5">
          Login ho raha hai, ek pal ruk-ein…
        </Alert>
      )}

      {!isOnline && (
        <Alert tone="warning" title="Internet nahi hai" icon={<WifiOff className="h-4 w-4 text-amber-600" />} className="mb-5">
          {saved
            ? 'Is device par saved account se offline login kar sakte hain.'
            : 'Offline login ke liye pehle ek dafa net ke saath login zaroori hai.'}
        </Alert>
      )}

      <AuthHeading title="Wapas aaiye" subtitle="Apni dukaan kholne ke liye login karein." />

      <GoogleButton label="Google se login karein" disabled={!isOnline} />
      <OrDivider />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}

        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ahmad@gmail.com"
          size="lg"
          leftIcon={<Mail className="h-4 w-4" />}
          autoFocus={!saved}
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />

        <PasswordField
          autoComplete="current-password"
          placeholder="Apna password"
          autoFocus={!!saved}
          labelAction={isOnline ? (
            <Link to="/forgot-password" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
              Password bhool gaye?
            </Link>
          ) : undefined}
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />

        {failedCount >= 3 && (
          <p className="text-xs text-slate-600">
            Baar baar ghalat ho raha hai?{' '}
            <Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline">Naya password bana lein</Link>
            {' '}— 2 minute ka kaam hai.
          </p>
        )}

        <Checkbox
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          label="Is device ko yaad rakhein"
          description="Agli dafa email pehle se likha hoga aur net ke bina bhi login ho sakega. Shared computer par band rakhein."
        />

        <Button
          type="submit"
          size="xl"
          fullWidth
          loading={mutation.isPending || offlineBusy}
          disabled={waitSeconds > 0 || offlineNoAccount}
          rightIcon={isOnline && waitSeconds <= 0 ? <ArrowRight className="h-4 w-4" /> : undefined}
          leftIcon={!isOnline ? <WifiOff className="h-4 w-4" /> : undefined}
        >
          {waitSeconds > 0 ? `${waitSeconds} second ruk-ein…` : isOnline ? 'Login karein' : 'Offline login'}
        </Button>

        {saved && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">Saved: <strong className="font-semibold text-slate-800">{saved.email}</strong></span>
            </span>
            <button type="button" onClick={() => setConfirmSwitch(true)} className="shrink-0 font-semibold text-brand-700 hover:underline">
              Doosra account
            </button>
          </div>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Nafaa par naye hain?{' '}
        <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">Free account banayein</Link>
      </p>

      <Modal
        open={confirmSwitch}
        onClose={() => setConfirmSwitch(false)}
        size="sm"
        title="Saved account hatayein?"
        description="Is device se saved login hat jayega. Doosra user login kar sakega, lekin net ke bina login tab tak nahi hoga jab tak koi dobara online login na kare."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmSwitch(false)}>Rehne dein</Button>
            <Button variant="danger" onClick={switchAccount}>Haan, hata dein</Button>
          </>
        )}
      >
        <p className="text-sm text-slate-600">Aap ka data aur sale mehfooz rehti hai — sirf is device ka saved login hatega.</p>
      </Modal>
    </AuthLayout>
  );
}
