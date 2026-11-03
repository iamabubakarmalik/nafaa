/**
 * Carpet rolls (web CarpetRollsPage): every roll in the branch with the
 * length and sqft left, rate and rack. Tabs for in stock, running low,
 * reserved, finished and damaged. Bills whose carpet is not yet cut from stock
 * (offline or booking bills) show on top with one-tap settling.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, Ban, Layers, Plus, Ruler, Scissors, Upload } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, Chip, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, ProgressBar, Row, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { useCostMask } from '@/modules/sales/lib/mask';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { Meta, RowCard, StatGrid } from '../../_shared/trade/kit';
import { carpetRollsApi, type CarpetRoll, type CarpetRollsListParams } from '../api';
import { PendingBanner } from '../components/PendingCuts';
import { ROLLS_KEY, ftIn, r2, realFt, rollStatus } from '../meta';

type Tab = 'stock' | 'low' | 'reserved' | 'finished' | 'damaged' | 'all';
const LIMIT = 25;
const LOW_FT = 10;

const tabParams = (tab: Tab): Partial<CarpetRollsListParams> =>
  tab === 'stock' ? { inStockOnly: true } : tab === 'low' ? { lowFt: LOW_FT }
    : tab === 'reserved' ? { status: 'RESERVED' } : tab === 'finished' ? { status: 'FINISHED' } : tab === 'damaged' ? { status: 'DAMAGED' } : {};

const usedPct = (r: CarpetRoll) => {
  const orig = realFt(r.originalLengthFt, r.originalLengthInch);
  return orig > 0 ? Math.min(100, Math.max(0, Math.round((1 - realFt(r.remainingLengthFt, r.remainingLengthInch) / orig) * 100))) : 0;
};

export function CarpetRollsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('carpetDesk');
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const [tab, setTab] = useState<Tab>('stock');
  const [search, setSearch] = useState('');

  const query: CarpetRollsListParams = useMemo(() => ({ ...tabParams(tab), search: search.trim() || undefined, productId, shopId }), [tab, search, productId, shopId]);
  const list = usePaged([ROLLS_KEY, 'page', query], (page) => carpetRollsApi.list({ ...query, page, limit: LIMIT }).then((r) => ({ items: r.items, page: r.meta.page, pages: r.meta.totalPages })));
  const stats = useQuery({ queryKey: [ROLLS_KEY, 'stats', shopId ?? ''], queryFn: () => carpetRollsApi.stats(shopId, LOW_FT) });
  const s = stats.data;
  const c = s?.counts;
  const canAdd = can(P.PRODUCTS_CREATE);

  const tabs: Array<{ value: Tab; label: string }> = [
    { value: 'stock', label: t('Chalu') }, { value: 'low', label: t('Kam bache ({{LOW_FT}}ft)', { LOW_FT }) }, { value: 'reserved', label: t('Reserved') },
    { value: 'finished', label: t('Khatam') }, { value: 'damaged', label: t('Damage') }, { value: 'all', label: t('Sab') },
  ];
  const count = (v: Tab) => (v === 'stock' ? s?.inStockRolls : v === 'low' ? c?.low : v === 'reserved' ? c?.reserved : v === 'finished' ? c?.finished : v === 'damaged' ? c?.damaged : c?.all);

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: Layers, tone: 'success', label: t('Chalu rolls'), loading: stats.isLoading, value: String(s?.inStockRolls ?? 0), hint: t('{{lengthFt}} ft lambai', { lengthFt: Math.round(s?.lengthFt ?? 0) }), onPress: () => setTab('stock') },
        { icon: AlertTriangle, tone: 'warning', label: t('Kam bache'), loading: stats.isLoading, value: String(c?.low ?? 0), hint: t('{{LOW_FT}}ft ya kam', { LOW_FT }), onPress: () => setTab('low') },
        { icon: Ruler, tone: 'info', label: t('Sqft rolls me'), loading: stats.isLoading, value: Math.round(s?.sqft ?? 0).toLocaleString('en-PK'), hint: t('Stock ki cost {{cost}}', { cost: cost(s?.costValue) }) },
        { icon: Scissors, tone: 'accent', label: t('Tukre'), loading: stats.isLoading, value: String(s?.pieces.count ?? 0), hint: t('{{sqft}} sqft', { sqft: Math.round(s?.pieces.sqft ?? 0) }), onPress: () => router.push('/carpet/cut-pieces' as never) },
      ]} />
      <PendingBanner />
      <OfflineNote feature="carpetDesk" />
      <CachedNote query={stats} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={tabs.map((x) => ({ value: x.value, label: count(x.value) != null ? `${x.label} · ${count(x.value)}` : x.label }))} />
      {productId ? <Row><Chip label={t('Ek carpet')} selected onPress={() => router.setParams({ productId: undefined as never })} /></Row> : null}
    </View>
  );

  return (
    <ListTemplate<CarpetRoll>
      title={t('Carpet rolls')}
      grouped={false}
      actions={canAdd ? <IconButton icon={Upload} label={t('Import')} onPress={() => guard(() => router.push('/carpet/rolls/bulk-import' as never))} /> : undefined}
      search={{ value: search, onChange: setSearch, placeholder: t('Roll number, carpet, design, rack…') }}
      summary={summary}
      data={list.items}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void stats.refetch(); }}
      onEndReached={list.loadMore}
      keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => {
        const st = rollStatus(r.status);
        const pct = usedPct(r);
        return (
          <RowCard>
            <ListRow
              leading={<View style={{ width: 44, height: 44, borderRadius: th.radius('lg'), backgroundColor: r.variant?.colorHex || th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}><Layers size={20} color={r.variant?.colorHex ? '#fff' : th.colors.brand.solid} /></View>}
              title={<Row gap={1.5} wrap><Text weight="semibold" ltr>{r.rollNumber}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
              subtitle={<View style={{ gap: 4 }}>
                <Meta parts={[r.product?.name, r.variant?.name, r.rackNumber ? t('Rack {{rackNumber}}', { rackNumber: r.rackNumber }) : null]} />
                <Text size="xs" ltr>{ftIn(r.widthFt, r.widthInch)} × {ftIn(r.remainingLengthFt, r.remainingLengthInch)} {t('bacha · {{remainingSqft}} sqft', { remainingSqft: r2(r.remainingSqft) })}</Text>
                <ProgressBar value={pct / 100} tone={pct > 90 ? 'danger' : pct > 60 ? 'warning' : 'success'} />
              </View>}
              trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={r.salePricePerSqft} weight="semibold" size="sm" /><Text size="2xs" tone="muted">/sqft</Text></View>}
              chevron
              onPress={() => router.push(`/carpet/rolls/${r.id}` as never)}
            />
          </RowCard>
        );
      }}
      empty={<EmptyState icon={Layers} title={search || tab !== 'stock' || productId ? t('Is filter me koi roll nahi') : t('Abhi koi roll nahi')} message={t('Supplier se roll Purchase se daalein, ya dukaan ka para roll "Naya roll" se.')}
        action={canAdd ? <Button icon={Plus} onPress={() => guard(() => router.push('/carpet/rolls/new' as never))}>{t('Naya roll')}</Button> : undefined} />}
      fab={canAdd ? { icon: Plus, label: t('Naya roll'), onPress: () => guard(() => router.push('/carpet/rolls/new' as never)) } : undefined}
    />
  );
}
