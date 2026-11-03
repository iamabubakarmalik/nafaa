/**
 * Expiry: batches that have expired or will expire soon, by when (expired,
 * this week, this month, later), first expiry first. Swipe a batch to report
 * it as damaged or open its product. Needs internet; the last loaded list
 * stays readable offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CalendarClock, CalendarX, Package, PackageX } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { daysUntil, expiryBuckets, fefo } from '@nafaa/core/inventory';
import { businessDayKey, formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { useCachedNotice } from '@/core/offline';
import { Badge, EmptyState, ListRow, ListTemplate, SwipeRow, Text, useDebouncedValue, useTheme } from '@/design';
import { batchesApi, type ProductBatch } from '../../api/products';
import { INV, qty, useCostMask } from '../../lib/shared';
import { OnlineOnly, StatStrip } from '../components/parts';

type Bucket = 'expired' | 'week' | 'month' | 'later';

export function ExpiryScreen() {
  const th = useTheme();
  const { cost } = useCostMask();
  const today = businessDayKey();
  const [bucket, setBucket] = useState<Bucket>('expired');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim().toLowerCase(), 200);
  const soon = useQuery({ queryKey: [INV, 'expiry', 'soon'], queryFn: () => batchesApi.expiringSoon(90) });
  const expired = useQuery({ queryKey: [INV, 'expiry', 'expired'], queryFn: batchesApi.expired });
  const cached = useCachedNotice(soon);
  const all = useMemo(() => {
    const seen = new Map<string, ProductBatch>();
    for (const b of [...(expired.data ?? []), ...(soon.data ?? [])]) seen.set(b.id, b);
    return [...seen.values()].map((b) => ({ ...b, quantity: Number(b.quantity) || 0 }));
  }, [soon.data, expired.data]);
  const buckets = useMemo(() => expiryBuckets(all, today), [all, today]);
  const rows = fefo(buckets[bucket]).filter((b) => !query || `${b.product?.name ?? ''} ${b.batchNumber}`.toLowerCase().includes(query));
  const value = (list: ProductBatch[]) => list.reduce((s, b) => s + b.quantity * (Number(b.costPrice) || 0), 0);

  return (
    <ListTemplate
      title={t('Expiry')}
      search={{ value: search, onChange: setSearch, placeholder: t('Product ya batch number…') }}
      summary={<View style={{ gap: th.space(3) }}>
        <StatStrip items={[
          { label: t('Expire ho chuka'), value: String(buckets.expired.length), hint: cost(value(buckets.expired)), tone: 'danger', onPress: () => setBucket('expired') },
          { label: t('7 din me'), value: String(buckets.week.length), hint: cost(value(buckets.week)), tone: 'warning', onPress: () => setBucket('week') },
          { label: t('30 din me'), value: String(buckets.month.length), hint: cost(value(buckets.month)), tone: 'accent', onPress: () => setBucket('month') },
          { label: t('Baad me'), value: String(buckets.later.length), hint: cost(value(buckets.later)), tone: 'neutral', onPress: () => setBucket('later') },
        ]} />
        <OnlineOnly feature="reports" updatedAt={cached.fromCache ? cached.updatedAt : null} />
      </View>}
      filters={{ value: bucket, onChange: (v) => setBucket(v as Bucket), options: [
        { value: 'expired', label: t('Expire ho chuka'), count: buckets.expired.length }, { value: 'week', label: t('7 din me'), count: buckets.week.length },
        { value: 'month', label: t('30 din me'), count: buckets.month.length }, { value: 'later', label: t('Baad me'), count: buckets.later.length },
      ] }}
      data={rows}
      loading={soon.isLoading || expired.isLoading}
      error={soon.data ? null : soon.error}
      onRetry={() => { void soon.refetch(); void expired.refetch(); }}
      refreshing={soon.isRefetching}
      onRefresh={() => { void soon.refetch(); void expired.refetch(); }}
      keyExtractor={(b) => b.id}
      renderItem={({ item: b }) => {
        const d = daysUntil(b.expiryDate, today);
        return (
          <SwipeRow end={[
            { icon: PackageX, label: t('Kharab'), tone: 'danger', onPress: () => router.push('/damage/new' as never) },
            { icon: Package, label: t('Product'), tone: 'brand', onPress: () => router.push(`/products/${b.productId}` as never) },
          ]}>
            <ListRow
              icon={d !== null && d < 0 ? CalendarX : CalendarClock}
              iconTone={d !== null && d < 0 ? 'danger' : d !== null && d <= 7 ? 'warning' : 'accent'}
              title={b.variant ? `${b.product?.name ?? ''} · ${b.variant.name}` : b.product?.name ?? ''}
              subtitle={`${t('Batch')} ${b.batchNumber} · ${b.expiryDate ? formatDate(b.expiryDate) : '—'}`}
              trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text weight="bold" ltr>{`${qty(b.quantity)} ${b.product?.unit ?? ''}`}</Text>
                <Badge tone={d !== null && d < 0 ? 'danger' : 'warning'}>{d === null ? '—' : d < 0 ? t('{{d}} din pehle', { d: -d }) : d === 0 ? t('aaj') : t('{{d}} din me', { d })}</Badge>
              </View>}
              onPress={() => router.push(`/products/${b.productId}` as never)}
            />
          </SwipeRow>
        );
      }}
      empty={<EmptyState icon={CalendarClock} title={t('Is me koi batch nahi')} message={t('Jis batch ki expiry itne din me hai, woh "Expiry" me dikhta hai.')} />}
    />
  );
}
