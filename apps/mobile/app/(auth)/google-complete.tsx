import { Redirect } from 'expo-router';
import { canRegisterInApp } from '@/core/platform/purchases';
import { GoogleCompleteScreen } from '@/modules/auth/screens/GoogleCompleteScreen';

/** iOS signs in only (App Store guideline 3.1.1); see canRegisterInApp. */
export default function GoogleCompleteRoute() {
  if (!canRegisterInApp()) return <Redirect href="/login" />;
  return <GoogleCompleteScreen />;
}
