/**
 * Sign in with Apple (iOS only), same flow as Google: an existing account is
 * signed in; a new Apple user is asked for the shop name first. Apple shares
 * the name only on the first sign-in, so it is sent along every time it comes.
 */

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { t } from '@/core/i18n';
import { authApi, isGoogleSession } from '@/core/auth/api';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/design';
import { appleAuth } from './apple';
import { canRegisterInApp, NO_ACCOUNT_TEXT } from '@/core/platform/purchases';
import { authErrorMessage } from './auth-errors';

/** Holds the Apple sign-up token while a new user types the shop name. */
export const pendingApple: { tempToken: string | null; email: string; fullName: string } = { tempToken: null, email: '', fullName: '' };

/** True on iOS devices where Sign in with Apple can be used. */
export function useAppleAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const AppleAuthentication = appleAuth();
    if (Platform.OS !== 'ios' || !AppleAuthentication) return;
    let alive = true;
    AppleAuthentication.isAvailableAsync().then((ok) => alive && setAvailable(ok)).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return available;
}

export function useAppleSignIn(onError: (message: string | null) => void) {
  const available = useAppleAvailable();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    const AppleAuthentication = appleAuth();
    if (!AppleAuthentication) return;
    onError(null);
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nonce = (require('expo-crypto') as typeof import('expo-crypto')).randomUUID();
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce,
      });
      if (!cred.identityToken) throw new Error('missing identity token');
      const fullName = cred.fullName ? AppleAuthentication.formatFullName(cred.fullName).trim() : '';
      const res = await authApi.appleSignIn({
        identityToken: cred.identityToken,
        nonce,
        fullName: fullName || undefined,
        email: cred.email ?? undefined,
      });
      if (isGoogleSession(res)) {
        await useAuthStore.getState().setSession(res);
        const first = res.user.fullName.split(' ')[0];
        toast.success(first ? t('Khush aamdeed, {{firstName}}!', { firstName: first }) : t('Khush aamdeed!'));
      } else if (!canRegisterInApp()) {
        onError(t(NO_ACCOUNT_TEXT));
      } else {
        pendingApple.tempToken = res.tempToken;
        pendingApple.email = res.email;
        pendingApple.fullName = res.fullName;
        router.push({ pathname: '/google-complete', params: { provider: 'apple' } });
      }
    } catch (err) {
      // The person closed the Apple sheet: nothing to report.
      if ((err as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      onError(authErrorMessage(err, t('Apple se login nahi ho saka. Dobara koshish karein.')));
    } finally {
      setBusy(false);
    }
  };

  return { available, busy, start: () => void start() };
}
