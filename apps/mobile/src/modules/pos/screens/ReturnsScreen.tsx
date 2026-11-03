/**
 * Returns: every return with its bill, what went back on the shelf, how much
 * came off khata and what was handed back. New return from here. The list
 * needs internet; the last loaded list stays readable offline.
 */

import { router } from 'expo-router';
import { Plus, RotateCcw } from 'lucide-react-native';
import { View } from 'react-native';
import { formatDateTime, formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useCachedNotice, useApiQuery } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, EmptyState, ListRow, ListTemplate, StatTile, Text } from '@/design';
import { methodLabel } from '../components/parts';

interface ReturnRecord {
  id: string; returnNumber: string; returnedAt: string; reason: string | null; refundAmount: number; refundMethod: string;
  khataAmount: number; payout: number; qty: number; sale: { saleNumber: string; customer?: { name: string } | null } | null;
}

export function ReturnsScreen() {
  const can = usePermission();
  const q = useApiQuery<{ items: ReturnRecord[]; totals?: { total?: number; bills?: number } }>('/returns/records', { limit: 50 });
  const cached = useCachedNotice(q);
  const items = q.data?.items ?? [];
  const total = items.reduce((s, r) => s + Number(r.refundAmount || 0), 0);
  return (
    <ListTemplate
      title={t('Returns')}
      data={items}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      keyExtractor={(r) => r.id}
      summary={
        <View style={{ gap: 6 }}>
          {items.length > 0 && <StatTile label={t('Returned (last {{n}})', { n: items.length })} icon={RotateCcw} tone="warning" value={<Amount value={total} size="xl" weight="bold" />} />}
          {cached.fromCache && cached.updatedAt && <Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(cached.updatedAt) })}</Text>}
        </View>
      }
      renderItem={({ item: r }) => (
        <ListRow
          icon={RotateCcw}
          iconTone="warning"
          title={`${r.returnNumber} · ${r.sale?.saleNumber ?? ''}`}
          subtitle={[r.sale?.customer?.name ?? t('Walk-in customer'), formatDateTime(r.returnedAt), r.reason ? t(r.reason) : null, r.khataAmount > 0 ? t('{{amount}} off khata', { amount: formatMoney(r.khataAmount) }) : methodLabel(r.refundMethod)].filter(Boolean).join(' · ')}
          trailing={<Amount value={r.refundAmount} weight="bold" />}
        />
      )}
      empty={<EmptyState icon={RotateCcw} title={t('No returns yet')} />}
      fab={can(P.RETURNS_CREATE) ? { icon: Plus, label: t('New return'), onPress: () => router.push('/pos/return' as never) } : undefined}
    />
  );
}
