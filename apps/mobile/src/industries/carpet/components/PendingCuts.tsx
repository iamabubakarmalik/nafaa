/**
 * Bills with roll cuts or pieces not yet taken from stock (made offline or
 * from a booking). One tap settles them all. Shown on the rolls screen and in
 * the counter's bill.
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Scissors } from 'lucide-react-native';
import { useState } from 'react';
import { useAuthStore } from '@/core/auth/store';
import { useOnlineStatus } from '@/core/net';
import { t } from '@/core/i18n';
import { Button, Card, Row, Text, toast } from '@/design';
import { carpetRollsApi } from '../api';
import { UNSETTLED_KEY, refreshCarpet } from '../meta';

export function useUnsettledBills() {
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;
  const online = useOnlineStatus();
  return useQuery({ queryKey: [UNSETTLED_KEY, shopId ?? ''], queryFn: () => carpetRollsApi.unsettledBills(shopId), enabled: online, staleTime: 60_000 });
}

/** Settles every listed bill; returns how many lines could not be cut. */
export async function settleAll(saleIds: string[]) {
  let failed = 0;
  for (const id of saleIds) {
    const res = await carpetRollsApi.settleBill(id).catch(() => null);
    failed += res ? res.lines.filter((l) => !l.ok).length : 1;
  }
  return failed;
}

export function PendingBanner({ compact }: { compact?: boolean }) {
  const { data = [] } = useUnsettledBills();
  const [busy, setBusy] = useState(false);
  if (!data.length) return null;
  const run = async () => {
    setBusy(true);
    const failed = await settleAll(data.map((b) => b.saleId));
    setBusy(false);
    refreshCarpet();
    if (failed) toast.error(t('{{failed}} line nahi kati — roll number ya lambai check karein (bill khol kar dekhein)', { failed }));
    else toast.success(t('Sab bills ka carpet stock se kat gaya'));
  };
  if (compact) {
    return (
      <Row gap={2} style={{ alignItems: 'center' }}>
        <Scissors size={14} color="#b45309" />
        <Text size="xs" style={{ flex: 1 }}>{t('{{count}} bill ka carpet abhi stock se nahi kata', { count: data.length })}</Text>
        <Button size="sm" variant="soft" loading={busy} onPress={() => void run()}>{t('Ab kaatein')}</Button>
      </Row>
    );
  }
  return (
    <Card tone="warning">
      <Row gap={3} style={{ alignItems: 'center' }}>
        <AlertTriangle size={20} color="#b45309" />
        <Text size="sm" weight="semibold" style={{ flex: 1 }}>{t('{{count}} bill ka carpet abhi stock se nahi kata', { count: data.length })}</Text>
        <Button size="sm" loading={busy} onPress={() => void run()}>{t('Ab kaatein')}</Button>
      </Row>
      <Text size="xs" tone="muted" style={{ marginTop: 6 }} numberOfLines={2}>{data.slice(0, 4).map((b) => `${b.saleNumber}${b.customerName ? ` (${b.customerName})` : ''}`).join(', ')}{data.length > 4 ? '…' : ''}</Text>
    </Card>
  );
}

/** Compact notice in the counter's bill. */
export function PendingCuts() {
  return <PendingBanner compact />;
}
