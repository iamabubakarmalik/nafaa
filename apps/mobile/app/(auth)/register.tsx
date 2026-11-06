import { Redirect } from 'expo-router';
import { canRegisterInApp } from '@/core/platform/purchases';
import { RegisterScreen } from '@/modules/auth/screens/RegisterScreen';

/** iOS signs in only (App Store guideline 3.1.1); see canRegisterInApp. */
export default function RegisterRoute() {
  if (!canRegisterInApp()) return <Redirect href="/login" />;
  return <RegisterScreen />;
}
