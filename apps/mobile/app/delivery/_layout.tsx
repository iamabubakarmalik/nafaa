/**
 * Delivery area: opens the delivery man's offline database, downloads
 * today's dispatched load sheets, keeps reports syncing in the background
 * while the app is open, and stacks the delivery screens. Only users with
 * distribution.delivery.report reach it.
 */

import { useEffect } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useDeliveryStore } from '@/features/delivery/store';
import { ACCENT } from '@/features/booker/ui/parts';

const AUTO_SYNC_MS = 90_000;

export default function DeliveryLayout() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const { db, openError, open } = useDeliveryStore();
  const allowed = hasPermission(user?.role, user?.permissions, PERMISSIONS.DISTRIBUTION_DELIVERY_REPORT);

  useEffect(() => {
    if (allowed && user?.id && tenant?.id) open(tenant.id, user.id);
  }, [allowed, user?.id, tenant?.id, open]);

  // Fresh sheets on open and when the app comes back; waiting reports go every 90 s.
  useEffect(() => {
    if (!db) return;
    useDeliveryStore.getState().refresh({ quiet: true });
    const timer = setInterval(() => {
      const s = useDeliveryStore.getState();
      if (!s.syncing && s.pending > 0) s.sync({ quiet: true });
    }, AUTO_SYNC_MS);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') useDeliveryStore.getState().refresh({ quiet: true }); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [db]);

  if (!allowed) return <Redirect href="/(tabs)" />;

  if (!db) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center px-8">
        <View className="h-16 w-16 rounded-3xl bg-teal-100 dark:bg-teal-950 items-center justify-center mb-4">
          {openError ? <Truck size={30} color={ACCENT} /> : <ActivityIndicator color={ACCENT} />}
        </View>
        <Text className="text-base font-extrabold text-neutral-700 dark:text-neutral-200 text-center">
          {openError ?? 'Delivery khul rahi hai…'}
        </Text>
      </SafeAreaView>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
