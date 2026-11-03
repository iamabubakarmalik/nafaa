/** New Google user: one question, the shop name, then the account is made. */

import { Store } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { authApi, isGoogleSession } from '@/core/auth/api';
import { useAuthStore } from '@/core/auth/store';
import { Button, Card, Input, Text, toast } from '@/design';
import { AuthLayout } from '../components/AuthLayout';
import { authErrorMessage } from '../lib/auth-errors';
import { readSignupPicks, setUpNewAccount } from '../lib/industry-choices';
import { pendingGoogle } from '../lib/useGoogleSignIn';

export function GoogleCompleteScreen() {
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const done = useMutation({
    meta: { silentError: true },
    mutationFn: () => authApi.googleMobile(pendingGoogle.idToken ?? '', shopName.trim()),
    onSuccess: async (res) => {
      if (!isGoogleSession(res)) return setError(t('Google wala session khatam ho gaya. Google se dobara try karein.'));
      pendingGoogle.idToken = null;
      await useAuthStore.getState().setSession(res);
      const picks = readSignupPicks();
      await setUpNewAccount(picks.businessType, picks.models);
      toast.success(t('Mubarak ho! Aap ka account ban gaya'));
      router.replace('/');
    },
    onError: (err) => setError(authErrorMessage(err, t('Account nahi ban saka. Dobara koshish karein.'))),
  });

  if (!pendingGoogle.idToken) {
    return (
      <AuthLayout back title={t('Google se account')} subtitle={t('Google wala session khatam ho gaya. Google se dobara try karein.')}>
        <Button size="xl" fullWidth onPress={() => router.replace('/register')}>{t('Wapas')}</Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout back title={t('Bas ek sawal')} subtitle={t('{{name}}, aap ki dukaan ka naam kya hai?', { name: pendingGoogle.fullName.split(' ')[0] || '' })}>
      {error && <Card tone="danger"><Text size="sm" tone="danger">{error}</Text></Card>}
      <Input label={t('Dukaan / business ka naam')} placeholder={t('Misaal: Ahmad Medical Store')} icon={Store} value={shopName} onChangeText={setShopName} autoFocus autoCapitalize="words" hint={t('Bill aur receipt par yahi naam chhapega. Baad me badal sakte hain.')} />
      <Button size="xl" fullWidth loading={done.isPending} disabled={shopName.trim().length < 2} onPress={() => done.mutate()}>{t('Create account')}</Button>
    </AuthLayout>
  );
}
