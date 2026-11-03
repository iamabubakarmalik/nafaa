/**
 * Delivery area: opens the delivery man's offline database, downloads
 * today's dispatched load sheets, keeps reports syncing in the background
 * while the app is open, and stacks the delivery screens. Only users with
 * distribution.delivery.report reach it.
 */

import { Redirect, Stack } from 'expo-router';
import { Truck } from 'lucide-react-native';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { PERMISSIONS, hasPermission } from '@/core/permissions';
import { EmptyState, Screen, SkeletonRows } from '@/design';
import { useDeliveryStore } from '@/modules/distribution/delivery/store';

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
      <Screen title={t('Delivery')} onBack={null}>
        {openError ? <EmptyState icon={Truck} title={openError} /> : <SkeletonRows count={4} />}
      </Screen>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
