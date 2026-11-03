/**
 * Sign in: email + password or Google (same flow and wording as the web
 * LoginPage). After a server "slow down" the button counts down.
 */

import { ArrowRight, Mail } from 'lucide-react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { t, Trans } from '@/core/i18n';
import { authApi } from '@/core/auth/api';
import { apiClient } from '@/core/api/client';
import type { AuthTenant, AuthUser } from '@/core/auth/types';
import { useAuthStore } from '@/core/auth/store';
import { useOnlineStatus } from '@/core/net';
import { kv } from '@/core/storage/kv';
import { Button, Card, Input, PasswordInput, Text, toast, useTheme } from '@/design';
import { AuthLayout, OrDivider } from '../components/AuthLayout';
import { GoogleButton } from '../components/GoogleButton';
import { authErrorMessage, retryAfterSeconds } from '../lib/auth-errors';
import { useGoogleSignIn } from '../lib/useGoogleSignIn';

const LAST_EMAIL = 'nafaa.auth.last-email';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const th = useTheme();
  const online = useOnlineStatus();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState(() => kv.get<string>(LAST_EMAIL, ''));
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [failed, setFailed] = useState(0);
  const [wait, setWait] = useState(0);
  const google = useGoogleSignIn(setFormError);
  const params = useLocalSearchParams<{ impersonate?: string; access?: string; refresh?: string }>();

  // Admin impersonation, same as the web: the admin panel opens
  // nafaa://login?impersonate=1&access=…&refresh=…
  useEffect(() => {
    const { impersonate, access, refresh } = params;
    if (impersonate !== '1' || !access || !refresh) return;
    apiClient.get<{ user: AuthUser; tenant: AuthTenant }>('/auth/me', { headers: { Authorization: `Bearer ${access}` } })
      .then(async ({ data }) => {
        await setSession({ user: data.user, tenant: data.tenant, accessToken: access, refreshToken: refresh });
        toast.success(t('Impersonating {{name}}', { name: data.tenant.name }));
      })
      .catch(() => toast.error(t('Impersonation nahi ho saki')));
  }, [params, setSession]);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const login = useMutation({
    mutationFn: () => authApi.login(email.trim(), password),
    meta: { silentError: true },
    onSuccess: async (data) => {
      kv.set(LAST_EMAIL, email.trim());
      await setSession(data);
      toast.success(t('Khush aamdeed, {{firstName}}!', { firstName: data.user.fullName.split(' ')[0] }), data.isNewDevice ? { message: t('Naya device — aap ki email par security notice bhej diya gaya hai') } : undefined);
    },
    onError: (err) => {
      const status = (err as { response?: { status?: number } }).response?.status;
      const s = retryAfterSeconds(err);
      if (status === 429 && s) setWait(s);
      if (status === 401) setFailed((n) => n + 1);
      setFormError(authErrorMessage(err, t('Login nahi ho saka. Dobara koshish karein.')));
    },
  });

  const submit = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = t('Email likhein');
    else if (!EMAIL_RE.test(email.trim())) e.email = t('Email sahi nahi lag raha. Misaal: ahmad@gmail.com');
    if (!password) e.password = t('Password likhein');
    else if (password.length < 8) e.password = t('Password kam se kam 8 huroof ka hota hai');
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    login.mutate();
  };

  return (
    <AuthLayout
      title={t('Wapas aaiye')}
      subtitle={t('Apni dukaan kholne ke liye login karein.')}
      footer={(
        <Text tone="secondary" align="center">
          {t('Nafaa par naye hain?')}{' '}
          <Link href="/register" asChild><Text weight="bold" tone="brand" suppressHighlighting>{t('Free account banayein')}</Text></Link>
        </Text>
      )}
    >
      {!online && (
        <Card tone="warning"><Text size="sm" tone="warning">{t('Internet nahi hai. Login ke liye internet zaroori hai.')}</Text></Card>
      )}
      <GoogleButton label={t('Google se login karein')} onPress={google.start} loading={google.busy} disabled={!online || !google.ready} />
      <OrDivider />
      {formError && <Card tone="danger"><Text size="sm" tone="danger">{formError}</Text></Card>}
      <Input
        label={t('Email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        placeholder="ahmad@gmail.com"
        icon={Mail}
        error={errors.email}
        returnKeyType="next"
      />
      <PasswordInput
        label={t('Password')}
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        placeholder={t('Apna password')}
        error={errors.password}
        returnKeyType="go"
        onSubmitEditing={submit}
        labelAction={<Link href="/forgot-password" asChild><Text size="sm" weight="semibold" tone="brand" suppressHighlighting>{t('Password bhool gaye?')}</Text></Link>}
      />
      {failed >= 3 && (
        <Text size="sm" tone="secondary">
          <Trans text="Baar baar ghalat ho raha hai? {{link}} — 2 minute ka kaam hai." values={{ link: <Text size="sm" weight="bold" tone="brand" onPress={() => router.push('/forgot-password')}>{t('Naya password bana lein')}</Text> }} />
        </Text>
      )}
      <View style={{ marginTop: th.space(1) }}>
        <Button size="xl" fullWidth onPress={submit} loading={login.isPending} disabled={wait > 0 || !online} iconEnd={wait > 0 ? undefined : ArrowRight} iconEndFlip>
          {wait > 0 ? t('{{waitSeconds}} second ruk-ein…', { waitSeconds: wait }) : t('Login karein')}
        </Button>
      </View>
    </AuthLayout>
  );
}

