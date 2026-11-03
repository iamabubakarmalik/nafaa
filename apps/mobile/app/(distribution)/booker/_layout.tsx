/**
 * Booker area: opens the booker's offline database, keeps the queue
 * syncing in the background while the app is open, and stacks the booker
 * screens. Only users with distribution.orders.book reach it.
 */

import { Redirect, Stack } from 'expo-router';
import { Truck } from 'lucide-react-native';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { EmptyState, Screen, SkeletonRows } from '@/design';
import { useBookerStore } from '@/modules/distribution/booker/store';

const AUTO_SYNC_MS = 90_000;

export default function BookerLayout() {
  const user = useAuthStore((s) => s.user);
  const tenantId = useAuthStore((s) => s.tenant?.id);
  const { db, openError, open } = useBookerStore();
  const allowed = usePermission()(PERMISSIONS.DISTRIBUTION_ORDERS_BOOK);

  useEffect(() => {
    if (allowed && user?.id && tenantId) open(tenantId, user.id);
  }, [allowed, user?.id, tenantId, open]);

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
      <Screen title={t('Order booking')}>
        {openError ? <EmptyState icon={Truck} title={t(openError)} /> : <SkeletonRows count={5} />}
      </Screen>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
