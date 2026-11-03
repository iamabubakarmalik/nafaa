/** Forgot password: sends a reset link to the account email (same as the web). */

import { KeyRound, Mail, MailCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { t, Trans } from '@/core/i18n';
import { authApi } from '@/core/auth/api';
import { Button, Card, Icon, Input, Text, useTheme } from '@/design';
import { AuthLayout } from '../components/AuthLayout';
import { authErrorMessage, retryAfterSeconds } from '../lib/auth-errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

export function ForgotPasswordScreen() {
  const th = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const send = useMutation({
    meta: { silentError: true },
    mutationFn: (to: string) => authApi.forgotPassword(to),
    onSuccess: (_, to) => {
      setSentTo(to);
      setError(null);
      setCooldown(RESEND_SECONDS);
    },
    onError: (err) => {
      setCooldown(retryAfterSeconds(err) ?? 0);
      setError(authErrorMessage(err, t('Link nahi bheja ja saka. Dobara koshish karein.')));
    },
  });

  const submit = () => {
    const v = email.trim();
    if (!v) return setError(t('Email likhein'));
    if (!EMAIL_RE.test(v)) return setError(t('Email sahi nahi lag raha. Misaal: ahmad@gmail.com'));
    setError(null);
    send.mutate(v);
  };

  if (sentTo) {
    return (
      <AuthLayout back title={t('Email check karein')} subtitle={<Text color="rgba(255,255,255,0.85)"><Trans text="Agar {{email}} se Nafaa account bana hai to us par password badalne ka link bhej diya gaya hai." values={{ email: <Text weight="bold" color="#ffffff" ltr>{sentTo}</Text> }} /></Text>}>
        <View style={{ alignItems: 'center', paddingVertical: th.space(2) }}>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={MailCheck} size={30} color={th.colors.brand.text} />
          </View>
        </View>
        <View style={{ gap: th.space(2) }}>
          {[t('Link 1 ghante tak chalega.'), t('Inbox me na mile to Spam / Promotions folder dekhein.'), t('Google se account banaya tha? To seedha "Google se login" kar lein.')].map((line) => (
            <Text key={line} size="sm" tone="secondary">{`•  ${line}`}</Text>
          ))}
        </View>
        {error && <Card tone="danger"><Text size="sm" tone="danger">{error}</Text></Card>}
        <Button variant="secondary" size="lg" fullWidth loading={send.isPending} disabled={cooldown > 0} onPress={() => send.mutate(sentTo)}>
          {cooldown > 0 ? t('Dobara bhejein ({{cooldown}}s)', { cooldown }) : t('Link dobara bhejein')}
        </Button>
        <Button variant="ghost" size="lg" fullWidth onPress={() => { setSentTo(null); setError(null); }}>{t('Doosra email likhein')}</Button>
        <Button variant="link" onPress={() => router.push({ pathname: '/reset-password' })}>{t('Code / link mil gaya? Naya password banayein')}</Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout back title={t('Password bhool gaye?')} subtitle={t('Koi baat nahi. Apna account wala email likhein — hum naya password banane ka link bhej denge.')}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={KeyRound} size={26} color={th.colors.brand.text} />
        </View>
      </View>
      {error && <Card tone="danger"><Text size="sm" tone="danger">{error}</Text></Card>}
      <Input label={t('Email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="ahmad@gmail.com" icon={Mail} returnKeyType="send" onSubmitEditing={submit} autoFocus />
      <Button size="xl" fullWidth loading={send.isPending} disabled={cooldown > 0} onPress={submit}>
        {cooldown > 0 ? t('{{cooldown}} second ruk-ein…', { cooldown }) : t('Reset link bhejein')}
      </Button>
    </AuthLayout>
  );
}
