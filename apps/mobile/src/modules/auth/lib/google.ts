/**
 * Google sign-in with the native client ids (app.json extra). Returns the
 * Google ID token; the API exchanges it at /auth/google/mobile.
 */

import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleIdToken() {
  const extra = Constants.expoConfig?.extra ?? {};
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: extra.googleIosClientId,
    androidClientId: extra.googleAndroidClientId,
    webClientId: extra.googleWebClientId,
  });
  const [idToken, setIdToken] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(0);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.params?.id_token) setIdToken(response.params.id_token);
    else setCancelled((n) => n + 1);
  }, [response]);

  return { ready: !!request, prompt: () => promptAsync(), idToken, reset: () => setIdToken(null), cancelled };
}
