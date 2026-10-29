/**
 * Booker area: opens the booker's offline database, keeps the queue
 * syncing in the background while the app is open, and stacks the booker
 * screens. Only users with distribution.orders.book reach it.
 */

import { useEffect } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useBookerStore } from '@/features/booker/store';
import { ACCENT } from '@/features/booker/ui/parts';

const AUTO_SYNC_MS = 90_000;

export default function BookerLayout() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const { db, openError, open } = useBookerStore();
  const allowed = hasPermission(user?.role, user?.permissions, PERMISSIONS.DISTRIBUTION_ORDERS_BOOK);

  useEffect(() => {
    if (allowed && user?.id && tenant?.id) open(tenant.id, user.id);
  }, [allowed, user?.id, tenant?.id, open]);

  // Background sync: on open, when the app comes back, and every 90 s while something waits.
  useEffect(() => {
    if (!db) return;
    const kick = () => {
      const s = useBookerStore.getState();
      if (!s.syncing && s.pending > 0) s.sync({ quiet: true });
    };
    useBookerStore.getState().refreshCounts().then(kick);
    const timer = setInterval(kick, AUTO_SYNC_MS);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') kick(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [db]);

  if (!allowed) return <Redirect href="/(tabs)" />;

  if (!db) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center px-8">
        <View className="h-16 w-16 rounded-3xl bg-teal-100 items-center justify-center mb-4">
          {openError ? <Truck size={30} color={ACCENT} /> : <ActivityIndicator color={ACCENT} />}
        </View>
        <Text className="text-base font-extrabold text-neutral-700 dark:text-neutral-200 text-center">
          {openError ?? 'Order Booking khul raha hai…'}
        </Text>
      </SafeAreaView>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
