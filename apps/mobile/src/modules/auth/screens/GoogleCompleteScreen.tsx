/**
 * New Google or Apple user: one question, the shop name, then the account is
 * made. `?provider=apple` switches to the Apple sign-up token.
 */

import { Store } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { authApi, isGoogleSession } from '@/core/auth/api';
import type { AuthResponse } from '@/core/auth/types';
import { useAuthStore } from '@/core/auth/store';
import { Button, Card, Input, Text, toast } from '@/design';
import { AuthLayout } from '../components/AuthLayout';
import { authErrorMessage } from '../lib/auth-errors';
import { readSignupPicks, setUpNewAccount } from '../lib/industry-choices';
import { pendingApple } from '../lib/useAppleSignIn';
import { pendingGoogle } from '../lib/useGoogleSignIn';

export function GoogleCompleteScreen() {
  const apple = useLocalSearchParams<{ provider?: string }>().provider === 'apple';
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const expired = apple
    ? t('Apple wala session khatam ho gaya. Apple se dobara try karein.')
    : t('Google wala session khatam ho gaya. Google se dobara try karein.');
  const done = useMutation({
    meta: { silentError: true },
    mutationFn: async (): Promise<AuthResponse | null> => {
      if (apple) return authApi.completeAppleSignup(pendingApple.tempToken ?? '', shopName.trim());
      const res = await authApi.googleMobile(pendingGoogle.idToken ?? '', shopName.trim());
      return isGoogleSession(res) ? res : null;
    },
    onSuccess: async (res) => {
      if (!res) return setError(expired);
      if (apple) pendingApple.tempToken = null;
      else pendingGoogle.idToken = null;
      await useAuthStore.getState().setSession(res);
      const picks = readSignupPicks();
      await setUpNewAccount(picks.businessType, picks.models);
      toast.success(t('Mubarak ho! Aap ka account ban gaya'));
      router.replace('/');
    },
    onError: (err) => setError(authErrorMessage(err, t('Account nahi ban saka. Dobara koshish karein.'))),
  });

  const pending = apple ? pendingApple.tempToken : pendingGoogle.idToken;
  const firstName = (apple ? pendingApple.fullName : pendingGoogle.fullName).split(' ')[0] || '';

  if (!pending) {
    return (
      <AuthLayout back title={apple ? t('Apple se account') : t('Google se account')} subtitle={expired}>
        <Button size="xl" fullWidth onPress={() => router.replace('/register')}>{t('Wapas')}</Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout back title={t('Bas ek sawal')} subtitle={firstName ? t('{{name}}, aap ki dukaan ka naam kya hai?', { name: firstName }) : t('Aap ki dukaan ka naam kya hai?')}>
      {error && <Card tone="danger"><Text size="sm" tone="danger">{error}</Text></Card>}
      <Input label={t('Dukaan / business ka naam')} placeholder={t('Misaal: Ahmad Medical Store')} icon={Store} value={shopName} onChangeText={setShopName} autoFocus autoCapitalize="words" hint={t('Bill aur receipt par yahi naam chhapega. Baad me badal sakte hain.')} />
      <Button size="xl" fullWidth loading={done.isPending} disabled={shopName.trim().length < 2} onPress={() => done.mutate()}>{t('Create account')}</Button>
    </AuthLayout>
  );
}
