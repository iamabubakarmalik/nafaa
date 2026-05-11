import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const iosClientId = Constants.expoConfig?.extra?.googleIosClientId;
  const androidClientId = Constants.expoConfig?.extra?.googleAndroidClientId;
  const webClientId = Constants.expoConfig?.extra?.googleWebClientId;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
  });

  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.params?.id_token;
      if (token) setIdToken(token);
    }
  }, [response]);

  return {
    promptAsync,
    idToken,
    response,
    isReady: !!request,
    reset: () => setIdToken(null),
  };
}
