/**
 * Google sign-in for the sign-in and sign-up screens. Existing accounts are
 * signed in; a new Google user is asked for the shop name first.
 */

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { t } from '@/core/i18n';
import { authApi, isGoogleSession } from '@/core/auth/api';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/design';
import { canRegisterInApp, NO_ACCOUNT_TEXT } from '@/core/platform/purchases';
import { authErrorMessage } from './auth-errors';
import { useGoogleIdToken } from './google';

/** Holds the Google token while a new user types the shop name. */
export const pendingGoogle: { idToken: string | null; email: string; fullName: string } = { idToken: null, email: '', fullName: '' };

export function useGoogleSignIn(onError: (message: string | null) => void) {
  const { ready, prompt, idToken, reset, cancelled } = useGoogleIdToken();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cancelled) setBusy(false);
  }, [cancelled]);

  useEffect(() => {
    if (!idToken) return;
    setBusy(true);
    authApi.googleMobile(idToken)
      .then(async (res) => {
        if (isGoogleSession(res)) {
          await useAuthStore.getState().setSession(res);
          toast.success(t('Khush aamdeed, {{firstName}}!', { firstName: res.user.fullName.split(' ')[0] }));
        } else if (!canRegisterInApp()) {
          onError(t(NO_ACCOUNT_TEXT));
        } else {
          pendingGoogle.idToken = idToken;
          pendingGoogle.email = res.email;
          pendingGoogle.fullName = res.fullName;
          router.push('/google-complete');
        }
      })
      .catch((err) => onError(authErrorMessage(err, t('Google se login nahi ho saka. Dobara koshish karein.'))))
      .finally(() => {
        setBusy(false);
        reset();
      });
  }, [idToken, onError, reset]);

  return {
    ready,
    busy,
    start: () => {
      onError(null);
      setBusy(true);
      prompt().catch(() => setBusy(false));
    },
  };
}
