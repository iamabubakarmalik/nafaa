/**
 * Cosmetics expiry desk (web CosmeticsExpiryPage): what has expired and what
 * expires in 30 or 90 days, with the stock and its cost. Expired stock is
 * written off through the shared damage record (needs approval like any
 * write-off), so the loss shows in the reports; near-expiry stock gets a
 * discount at the counter. The batch list needs the server; the damage report
 * itself is queued when offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CalendarClock, CalendarX, PackageX } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { enqueueDamage } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, SwipeRow, Text, confirm, toast, useDebouncedValue, useTheme } from '@/design';
import { batchesApi, type ProductBatch } from '@/modules/inventory/api/products';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { COSMETICS_KEYS, dayOnly, daysFrom, expiryTone, refreshCosmetics } from '../meta';

type Tab = 'expired' | '30' | '90';

export function CosmeticsExpiryScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const shopId = useAuthStore((s) => s.currentShopId);
  const canReport = can(P.PRODUCTS_VIEW);
  const [tab, setTab] = useState<Tab>('30');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim().toLowerCase(), 200);

  const expired = useQuery({ queryKey: [COSMETICS_KEYS.expiry, 'expired'], queryFn: () => batchesApi.expired() });
  const soon = useQuery({ queryKey: [COSMETICS_KEYS.expiry, 'soon', 90], queryFn: () => batchesApi.expiringSoon(90) });
  const live = (b: ProductBatch) => b.isActive && b.quantity > 0;
  const lists = useMemo(() => {
    const ex = (expired.data ?? []).filter(live);
    const s = (soon.data ?? []).filter(live);
    return { expired: ex, '30': s.filter((b) => (daysFrom(b.expiryDate) ?? 999) <= 30), '90': s };
  }, [expired.data, soon.data]);
  const value = (rows: ProductBatch[]) => rows.reduce((a, b) => a + b.quantity * b.costPrice, 0);
  const rows = lists[tab].filter((b) => !q || [b.product?.name, b.variant?.name, b.batchNumber].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''));

  const writeOff = async (b: ProductBatch) => {
    const name = [b.product?.name, b.variant?.name].filter(Boolean).join(' · ');
    const ok = await confirm({
      title: t('Expire maal nikaalein?'), tone: 'danger', confirmLabel: t('Nikaal dein'), cancelLabel: t('Rehne dein'),
      message: t('{{name}} — batch {{batchNumber}}, {{quantity}} {{unit}}, cost {{value}}. Damage record banega; manzoori ke baad stock se nikalta hai aur nuksan report me aata hai.', { name, batchNumber: b.batchNumber, quantity: b.quantity, unit: b.product?.unit ?? '', value: cost(b.quantity * b.costPrice) }),
    });
    if (!ok) return;
    try {
      await enqueueDamage({
        productId: b.productId, variantId: b.variantId ?? undefined, shopId: shopId && shopId !== 'all' ? shopId : undefined, quantity: b.quantity,
        reason: t('Expire ho gaya ({{expiryDate}})', { expiryDate: dayOnly(b.expiryDate) }), reasonCode: 'EXPIRY', notes: t('Batch {{batchNumber}}', { batchNumber: b.batchNumber }),
        ...({ batchId: b.id } as object),
      });
      toast.success(t('Damage report bana di — manzoori ke baad stock se nikal jayega'));
      refreshCosmetics([COSMETICS_KEYS.expiry]);
    } catch (e) { toast.error(apiErrorMessage(e, t('Report nahi bani'))); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={CalendarX} tone="danger" label={t('Expire maal (cost)')} loading={expired.isLoading} value={cost(value(lists.expired))} hint={t('{{count}} batch', { count: lists.expired.length })} onPress={() => setTab('expired')} />
        <StatTile style={{ flex: 1 }} icon={CalendarClock} tone="warning" label={t('30 din me (cost)')} loading={soon.isLoading} value={cost(value(lists['30']))} hint={t('{{count}} batch', { count: lists['30'].length })} onPress={() => setTab('30')} />
      </Row>
      <ChipGroup value={tab} onChange={setTab} style={{ marginHorizontal: -th.space(4) }}
        options={[{ value: 'expired', label: t('Expire ho gaye'), count: lists.expired.length }, { value: '30', label: t('30 din'), count: lists['30'].length }, { value: '90', label: t('90 din'), count: lists['90'].length }]} />
      <OfflineNote feature="cosmeticsDesk" />
      <CachedNote query={soon} />
    </View>
  );

  return (
    <ListTemplate<ProductBatch>
      title={t('Expiry')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Product, shade ya batch…') }}
      summary={header}
      data={rows}
      loading={expired.isLoading || soon.isLoading}
      error={!soon.data && !expired.data ? soon.error ?? expired.error : undefined}
      onRetry={() => { void soon.refetch(); void expired.refetch(); }}
      refreshing={soon.isRefetching}
      onRefresh={() => { void soon.refetch(); void expired.refetch(); }}
      keyExtractor={(b) => b.id}
      renderItem={({ item: b }) => {
        const d = daysFrom(b.expiryDate);
        return (
          <SwipeRow end={canReport ? [{ icon: PackageX, label: t('Nikaal dein'), tone: 'danger', onPress: () => void writeOff(b) }] : []}>
            <ListRow icon={CalendarClock} iconTone={expiryTone(d)} title={[b.product?.name, b.variant?.name].filter(Boolean).join(' · ')}
              subtitle={`${t('Batch')} ${b.batchNumber} · ${b.quantity} ${b.product?.unit ?? ''}`}
              trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Badge tone={expiryTone(d)}>{dayOnly(b.expiryDate)}</Badge><Text size="2xs" tone="muted">{cost(b.quantity * b.costPrice)}</Text></View>}
              onPress={() => router.push(`/products/${b.productId}` as never)} />
          </SwipeRow>
        );
      }}
      empty={<EmptyState icon={CalendarClock} title={q ? t('Is filter me koi batch nahi') : tab === 'expired' ? t('Koi maal expire nahi hua') : t('Koi batch expire hone ke qareeb nahi')} message={t('Batch aur expiry Purchase ke saath aate hain.')} />}
    />
  );
}
