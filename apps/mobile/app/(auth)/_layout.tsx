import { Stack } from 'expo-router';
import { useTheme } from '@/design';

export default function AuthGroupLayout() {
  const th = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: th.colors.canvas }, animation: th.motion ? 'slide_from_right' : 'none' }} />;
}
