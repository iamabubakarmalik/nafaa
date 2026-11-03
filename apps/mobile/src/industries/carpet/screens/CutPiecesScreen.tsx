/**
 * Cut pieces (web CarpetCutPiecesPage): remnants left beside roll cuts,
 * customer returns and pieces added by hand. Tabs by status with server
 * counts, search and paging; edit, write off (damage) and add need their permissions.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, CheckCircle2, Lock, Pencil, Plus, Scissors, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, SwipeRow, Text, confirm, toast, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { useCostMask } from '@/modules/sales/lib/mask';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { Meta, RowCard, StatGrid } from '../../_shared/trade/kit';
import { carpetCutPiecesApi, type CarpetCutPiece, type CarpetCutPieceStatus, type CutPiecesListParams } from '../api';
import { PieceSheet } from '../components/PieceSheet';
import { PIECES_KEY, PIECE_SOURCE, ftIn, pieceStatus, r2, refreshCarpet } from '../meta';

type Tab = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DAMAGED' | 'all';
const LIMIT = 25;

export function CutPiecesScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('carpetDesk');
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;
  const params = useLocalSearchParams<{ search?: string }>();
  const [tab, setTab] = useState<Tab>('AVAILABLE');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState(params.search ?? '');
  const [form, setForm] = useState<CarpetCutPiece | 'new' | null>(null);

  const query: CutPiecesListParams = useMemo(() => ({ status: tab === 'all' ? undefined : (tab as CarpetCutPieceStatus), sourceType: (source || undefined) as never, search: search.trim() || undefined, shopId }), [tab, source, search, shopId]);
  const list = usePaged([PIECES_KEY, 'page', query], (page) => carpetCutPiecesApi.list({ ...query, page, limit: LIMIT }).then((r) => ({ items: r.items, page: r.meta.page, pages: r.meta.totalPages })));
  const stats = useQuery({ queryKey: [PIECES_KEY, 'stats', shopId ?? ''], queryFn: () => carpetCutPiecesApi.stats(shopId) });
  const s = stats.data;
  const canAdd = can(P.PRODUCTS_CREATE);
  const canEdit = can(P.PRODUCTS_EDIT);
  const canWriteOff = can(P.STOCK_ADJUSTMENTS_MANAGE);

  const tabs: Array<{ value: Tab; label: string; n?: number }> = [
    { value: 'AVAILABLE', label: t('Bikne ko tayyar'), n: s?.available.count }, { value: 'RESERVED', label: t('Reserved'), n: s?.reserved.count },
    { value: 'SOLD', label: t('Bik gaye'), n: s?.sold.count }, { value: 'DAMAGED', label: t('Damage / hataye'), n: s?.damaged.count }, { value: 'all', label: t('Sab'), n: s?.all },
  ];

  const writeOff = async (p: CarpetCutPiece) => {
    if (!(await confirm({ title: t('{{pieceCode}} stock se hatayein?', { pieceCode: p.pieceCode }), message: t('Tukra damage me chala jayega — record rehta hai, counter par nahi bikega.'), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    try { await carpetCutPiecesApi.remove(p.id); toast.success(t('{{pieceCode}} stock se hat gaya', { pieceCode: p.pieceCode })); refreshCarpet(); }
    catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); }
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: CheckCircle2, tone: 'success', label: t('Bikne ko tayyar'), loading: stats.isLoading, value: String(s?.available.count ?? 0), hint: t('{{sqft}} sqft · cost {{cost}}', { sqft: Math.round(s?.available.sqft ?? 0), cost: cost(s?.available.cost) }), onPress: () => setTab('AVAILABLE') },
        { icon: Scissors, tone: 'info', label: t('Bechne par'), loading: stats.isLoading, value: formatMoney(s?.available.value ?? 0) },
        { icon: Lock, tone: 'accent', label: t('Reserved'), loading: stats.isLoading, value: String(s?.reserved.count ?? 0), onPress: () => setTab('RESERVED') },
        { icon: Ban, tone: 'danger', label: t('Damage / hataye'), loading: stats.isLoading, value: String(s?.damaged.count ?? 0), hint: t('cost {{cost}}', { cost: cost(s?.damaged.cost) }), onPress: () => setTab('DAMAGED') },
      ]} />
      <OfflineNote feature="carpetDesk" />
      <CachedNote query={stats} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={tabs.map((x) => ({ value: x.value, label: x.n != null ? `${x.label} · ${x.n}` : x.label }))} />
      <PieceSheet piece={form} open={!!form} onClose={() => setForm(null)} />
      <ChipGroup value={source} onChange={setSource} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Har jagah se') }, ...Object.entries(PIECE_SOURCE).map(([v, l]) => ({ value: v, label: t(l) }))]} />
    </View>
  );

  return (
    <ListTemplate<CarpetCutPiece>
      title={t('Carpet tukre')}
      subtitle={t('Bache hue aur wapas aaye tukre — POS par seedha bikte hain')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Piece code, carpet, roll number, rack…') }}
      summary={summary}
      data={list.items}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void stats.refetch(); }}
      onEndReached={list.loadMore}
      keyExtractor={(p) => p.id}
      renderItem={({ item: p }) => {
        const st = pieceStatus(p.status);
        const editable = p.status !== 'SOLD';
        const end = [
          ...(canEdit && editable ? [{ icon: Pencil, label: t('Edit'), tone: 'brand' as const, onPress: () => guard(() => setForm(p)) }] : []),
          ...(canWriteOff && editable && p.status !== 'DAMAGED' ? [{ icon: Trash2, label: t('Hatayein'), tone: 'danger' as const, onPress: () => guard(() => void writeOff(p)) }] : []),
        ];
        const row = (
          <ListRow
            title={<Row gap={1.5} wrap><Text weight="semibold" ltr>{p.pieceCode}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
            subtitle={<View style={{ gap: 3 }}>
              <Meta parts={[p.product?.name, p.variant?.name, t(PIECE_SOURCE[p.sourceType]), p.sourceRoll?.rollNumber]} />
              <Text size="xs" ltr>{t('{{widthFt}} × {{lengthFt}} · {{totalSqft}} sqft', { widthFt: ftIn(p.widthFt, p.widthInch), lengthFt: ftIn(p.lengthFt, p.lengthInch), totalSqft: r2(p.totalSqft) })}</Text>
              <Meta parts={[p.condition, p.rackNumber && t('Rack {{rackNumber}}', { rackNumber: p.rackNumber }), formatDate(p.createdAt)]} />
            </View>}
            trailing={<Amount value={p.salePrice} weight="bold" />}
            chevron={!!p.sourceRoll}
            onPress={p.sourceRoll ? () => router.push(`/carpet/rolls/${p.sourceRoll!.id}` as never) : canEdit && editable ? () => guard(() => setForm(p)) : undefined}
          />
        );
        return <RowCard>{end.length ? <SwipeRow end={end}>{row}</SwipeRow> : row}</RowCard>;
      }}
      empty={<EmptyState icon={Scissors} title={search || tab !== 'AVAILABLE' || source ? t('Is filter me koi tukra nahi') : t('Abhi koi tukra nahi')} message={t('Roll se kam chaurai kaatne par bachi patti yahan khud aati hai.')} />}
      fab={canAdd ? { icon: Plus, label: t('Naya tukra'), onPress: () => guard(() => setForm('new')) } : undefined}
    />
  );
}
