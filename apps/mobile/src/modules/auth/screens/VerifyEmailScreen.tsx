/** Email check after sign-up: the 6-digit code sent to the owner's email (web EmailVerifyPage). */

import { ArrowRight, MailCheck, RefreshCw } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { authApi } from '@/core/auth/api';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { Button, Card, Icon, OtpInput, Text, toast, useTheme } from '@/design';
import { AuthLayout } from '../components/AuthLayout';
import { authErrorMessage, retryAfterSeconds } from '../lib/auth-errors';

const LENGTH = 6;
const RESEND_SECONDS = 60;

export function VerifyEmailScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ sent?: string }>();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(params.sent ? RESEND_SECONDS : 0);
  const [verified, setVerified] = useState(false);
  const started = useRef(false);

  const goOn = () => router.replace('/');

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const send = useMutation({
    meta: { silentError: true },
    mutationFn: authApi.sendVerifyEmail,
    onSuccess: (data) => {
      if (data?.alreadyVerified) {
        updateUser({ emailVerified: true });
        goOn();
        return;
      }
      setError(null);
      setCooldown(RESEND_SECONDS);
      toast.success(t('Naya code email par bhej diya'));
    },
    onError: (err) => {
      const wait = retryAfterSeconds(err);
      if (wait) return setCooldown(wait);
      setError(authErrorMessage(err, t('Code nahi bheja ja saka. Thori der baad dobara try karein.')));
    },
  });

  const verify = useMutation({
    meta: { silentError: true },
    mutationFn: (otp: string) => authApi.confirmVerifyEmail(otp),
    onSuccess: () => {
      setVerified(true);
      haptic('success');
      updateUser({ emailVerified: true });
      toast.success(t('Email verify ho gaya'));
      setTimeout(goOn, 900);
    },
    onError: (err) => {
      setError(authErrorMessage(err, t('Code sahi nahi. Dobara likhein.')));
      setCode('');
    },
  });

  useEffect(() => {
    if (started.current || !user) return;
    started.current = true;
    if (user.emailVerified) return goOn();
    if (!params.sent) send.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = (value = code) => {
    if (value.length !== LENGTH) return setError(t('Pura 6 number ka code likhein.'));
    setError(null);
    verify.mutate(value);
  };

  return (
    <AuthLayout title={t('Email verify karein')} subtitle={<Text color="rgba(255,255,255,0.85)">{t('6 number ka code bheja gaya hai:')} <Text weight="bold" color="#ffffff" ltr>{user?.email ?? ''}</Text></Text>}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={MailCheck} size={26} color={th.colors.brand.text} />
        </View>
      </View>
      {error && <Card tone="danger"><Text size="sm" tone="danger">{error}</Text></Card>}
      {verified && <Card tone="success"><Text size="sm" tone="success">{t('Shukriya! Email verify ho gaya — aage le ja rahe hain…')}</Text></Card>}
      <OtpInput length={LENGTH} value={code} onChange={setCode} onComplete={submit} error={!!error} disabled={verify.isPending || verified} />
      <Text size="xs" tone="muted">{t('Code 10 minute tak chalega. Paste bhi kar sakte hain.')}</Text>
      <Button size="xl" fullWidth loading={verify.isPending} disabled={verified || code.length !== LENGTH} onPress={() => submit()}>{t('Verify karein')}</Button>
      <View style={{ alignItems: 'center', gap: th.space(2), borderTopWidth: 1, borderTopColor: th.colors.divider, paddingTop: th.space(4) }}>
        <Text size="sm" tone="secondary" align="center">{t('Email nahi mili? Spam folder dekhein, ya')}</Text>
        <Button variant="link" icon={RefreshCw} disabled={cooldown > 0 || send.isPending} onPress={() => send.mutate()}>
          {cooldown > 0 ? t('{{cooldown}}s baad naya code', { cooldown }) : t('naya code mangwaein')}
        </Button>
        <Button variant="ghost" iconEnd={ArrowRight} iconEndFlip onPress={goOn}>{t('Baad me verify karunga')}</Button>
      </View>
    </AuthLayout>
  );
}
