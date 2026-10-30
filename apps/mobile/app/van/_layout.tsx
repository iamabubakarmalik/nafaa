/** Van salesman area: only users with distribution.vans.sell reach it. Online screens. */

import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export default function VanLayout() {
  const user = useAuthStore((s) => s.user);
  if (!hasPermission(user?.role, user?.permissions, PERMISSIONS.DISTRIBUTION_VANS_SELL)) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
