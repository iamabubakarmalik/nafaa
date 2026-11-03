/** Stationery and art supplies lists (web SuppliesList): by type and brand; school / professional and low-stock views. Needs the server. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Package, Palette, Pencil, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, Segmented, StatTile, Text, useDebouncedValue, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { artApi, stationeryApi, type SupplyProfile } from '../api';
import { ART_CATEGORIES, KEYS, STATIONERY_CATEGORIES, labelOf } from '../meta';

type Tab = 'all' | 'mark' | 'low';
const KIND = {
  STATIONERY: { title: 'Stationery', icon: Pencil, categories: STATIONERY_CATEGORIES, mark: 'School ka', key: KEYS.stationery, load: (search?: string, category?: string) => stationeryApi.list({ search, category }), isMarked: (r: SupplyProfile) => !!r.isSchoolItem },
  ART: { title: 'Art supplies', icon: Palette, categories: ART_CATEGORIES, mark: 'Professional', key: KEYS.art, load: (search?: string, category?: string) => artApi.list({ search, category }), isMarked: (r: SupplyProfile) => !!r.isProfessional },
} as const;

export function SuppliesScreen({ kind }: { kind: keyof typeof KIND }) {
  const k = KIND[kind];
  const th = useTheme();
  const canCreate = usePermission()(P.PRODUCTS_CREATE);
  const { guard } = useDeskOnline('bookstoreDesk');
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const term = useDebouncedValue(search.trim(), 300);
  const q = useQuery({ queryKey: [k.key, term, category], queryFn: () => k.load(term || undefined, category || undefined) });
  const all = q.data ?? [];
  const stock = (r: SupplyProfile) => Number(r.product?.stock ?? 0);
  const low = (r: SupplyProfile) => stock(r) <= Math.max(Number(r.product?.lowStockAlert ?? 0), r.reorderLevel ?? 0, 0);
  const rows = useMemo(() => all.filter((r) => tab === 'all' || (tab === 'mark' && k.isMarked(r)) || (tab === 'low' && low(r))), [all, tab, k]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = all.reduce((s, r) => s + Math.max(stock(r), 0) * Number(r.product?.price ?? 0), 0);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={k.icon} tone="info" label={t('Items')} loading={q.isLoading} value={String(all.length)} onPress={() => setTab('all')} />
        <StatTile style={{ flex: 1 }} icon={Package} tone="danger" label={t('Stock kam')} loading={q.isLoading} value={String(all.filter(low).length)} hint={formatMoney(value)} onPress={() => setTab('low')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'all', label: t('Sab') }, { value: 'mark', label: t(k.mark) }, { value: 'low', label: t('Stock kam') }]} />
      <ChipGroup value={category} onChange={setCategory} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Har type') }, ...k.categories.map(([v, l]) => ({ value: v, label: t(l) }))]} />
      <OfflineNote feature="bookstoreDesk" />
      <CachedNote query={q} />
    </View>
  );

  return (
    <ListTemplate<SupplyProfile>
      title={t(k.title)}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Naam, brand ya type') }}
      summary={header}
      data={rows}
      loading={q.isLoading}
      error={q.data ? null : q.error}
      onRetry={() => void q.refetch()}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => (
        <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
          <ListRow icon={k.icon} iconTone={low(r) ? 'danger' : 'info'}
            title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.product?.name ?? ''}</Text>{k.isMarked(r) && <Badge tone="accent">{t(k.mark)}</Badge>}</Row>}
            subtitle={<Text size="xs" tone="muted" numberOfLines={1}>{[labelOf(k.categories, r.category), r.brand, r.color, r.size].filter(Boolean).join(' · ')}</Text>}
            trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={Number(r.product?.price ?? 0)} weight="bold" /><Text size="2xs" tone={low(r) ? 'danger' : 'muted'} ltr>{stock(r)}</Text></View>}
            chevron onPress={() => router.push(`/products/${r.productId}` as never)} />
        </View>
      )}
      empty={<EmptyState icon={k.icon} title={t('Abhi kuch nahi')} message={t('Nayi cheez banate waqt type chunein — yahan aa jayegi.')} />}
      fab={canCreate ? { icon: Plus, label: t('Nayi cheez'), onPress: () => guard(() => router.push('/products/new' as never)) } : undefined}
    />
  );
}
