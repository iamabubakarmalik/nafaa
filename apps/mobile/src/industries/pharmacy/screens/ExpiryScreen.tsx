/**
 * Expiry list (web ExpiringPage): every batch by days left, with its cost and
 * sale value, medicine facts and the formula. Tapping a batch offers what to
 * do: send it back to the distributor against the purchase it came on (stock
 * and the distributor's khata both go down) or write it off as damage. Needs
 * the server.
 */

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CalendarClock, CalendarX, PackageX, Pill, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { shopParam } from '@/core/auth/shopScope';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, EmptyState, ListRow, ListTemplate, Row, Segmented, Select, Sheet, StatTile, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { adjustmentsApi } from '@/modules/inventory/stock/api';
import { purchasesApi } from '@/modules/purchasing/api/purchases';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { expiryApi, type ExpiryBucket, type ExpiryRow, type ExpirySort } from '../api';
import { EXPIRY_KEY, daysText, expiryTone, fmtNum, refreshPharmacy } from '../meta';

const LIMIT = 40;
const BUCKETS: Array<{ id: ExpiryBucket; label: string }> = [
  { id: 'expired', label: 'Expire ho chuki' }, { id: '30', label: '30 din' }, { id: '90', label: '90 din' }, { id: '180', label: '6 mahine' }, { id: 'all', label: 'Sab batch' },
];
const SORTS: Array<{ value: ExpirySort; label: string }> = [
  { value: 'soon', label: 'Pehle expire hone wale' }, { value: 'value', label: 'Zyada value pehle' }, { value: 'name', label: 'Naam se' },
];

function ActionSheet({ row, onClose }: { row: ExpiryRow | null; onClose: () => void }) {
  const th = useTheme();
  const can = usePermission();
  const canReturn = can(P.PURCHASES_CREATE);
  const canWriteOff = can(P.STOCK_ADJUSTMENTS_MANAGE);
  const [mode, setMode] = useState<'return' | 'writeoff'>(canReturn ? 'return' : 'writeoff');
  const [lineId, setLineId] = useState('');
  const [qty, setQty] = useState<number | null>(null);
  const src = useQuery({ queryKey: ['pharmacy-expiry-source', row?.id], queryFn: () => expiryApi.source(row!.id), enabled: !!row && canReturn });
  const lines = src.data?.lines ?? [];
  const line = lines.find((l) => l.itemId === lineId) ?? lines[0];
  const reason = row && row.daysLeft < 0 ? t('Expire ho gayi') : t('Expiry qareeb');
  const maxUnits = mode === 'return' ? line?.returnableUnits ?? 0 : row?.quantity ?? 0;
  const amount = qty ?? 0;
  const value = mode === 'return' && line ? amount * line.unitCost : amount * (row?.unitCost ?? 0);

  const run = useMutation({
    mutationFn: async () => {
      if (!row) return '';
      if (!(amount > 0)) throw new Error(t('Miqdaar likhein'));
      if (amount > maxUnits + 1e-9) throw new Error(t('Zyada se zyada {{maxUnits}}', { maxUnits }));
      if (mode === 'return') {
        if (!line) throw new Error(t('Is batch ki koi purchase nahi mili'));
        const res = await purchasesApi.returnGoods(line.purchaseId, { items: [{ itemId: line.itemId, quantity: amount }], reason: `${reason} · Batch ${row.batchNumber}` });
        return t('Distributor ko wapas — {{name}} ke khate se {{total}} kam', { name: line.supplier.name, total: formatMoney((res as { total?: number }).total ?? value) });
      }
      await adjustmentsApi.batch({
        shopId: row.shop?.id, reason, reasonCode: 'EXPIRY' as never, note: `Batch ${row.batchNumber} · expiry ${formatDate(row.expiryDate, { year: true })}`,
        items: [{ productId: row.product.id, type: 'DAMAGE' as never, quantity: amount, batchId: row.id }],
      });
      return t('{{amount}} {{unit}} kharab likh diya', { amount, unit: row.product.unit });
    },
    onSuccess: (m) => { toast.success(m); refreshPharmacy([EXPIRY_KEY, 'pharmacy-expiry-source'], true); setQty(null); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, (e as Error).message || t('Nahi hua'))),
  });

  return (
    <Sheet open={!!row} onClose={onClose} height={0.85} title={row ? `${row.product.name} · ${t('Batch')} ${row.batchNumber}` : ''}
      description={row ? t('Expiry {{expiryDate}} · shelf par {{value}} {{unit}}', { expiryDate: formatDate(row.expiryDate, { year: true }), value: fmtNum(row.quantity), unit: row.product.unit }) : undefined}
      footer={<Button fullWidth variant={mode === 'writeoff' ? 'danger' : 'primary'} loading={run.isPending} disabled={!(amount > 0) || (mode === 'return' && !line)} onPress={() => run.mutate()}>
        {mode === 'return' ? t('Distributor ko wapas') : t('Kharab likhein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {!canReturn && !canWriteOff ? <Text tone="muted">{t('Is ke liye ijazat chahiye')}</Text> : (
          <>
            <Segmented value={mode} onChange={(v) => { setMode(v); setQty(null); }}
              options={[...(canReturn ? [{ value: 'return' as const, label: t('Distributor ko wapas'), icon: Truck }] : []), ...(canWriteOff ? [{ value: 'writeoff' as const, label: t('Kharab / zaya'), icon: PackageX }] : [])]} />
            {mode === 'return' ? (
              src.isLoading ? <Text tone="muted">{t('Purchase dhoond rahe hain…')}</Text>
                : lines.length === 0 ? <Card tone="warning"><Text size="sm">{t('Is batch ki koi purchase (bill) nahi mili jis par ye aaya ho — shuru ka stock ho to "Kharab likhein" use karein.')}</Text></Card>
                  : <Select label={t('Kis purchase par wapas')} value={line?.itemId ?? ''} onChange={setLineId}
                    options={lines.map((l) => ({ value: l.itemId, label: `${l.supplier.name} · ${l.purchaseNumber}`, description: `${formatDate(l.purchasedAt, { year: true })} · ${formatMoney(l.unitCost)} · ${t('wapas ho sakta')} ${l.returnableUnits}` }))} />
            ) : null}
            <NumberInput label={t('Kitni')} value={qty} onChangeValue={setQty} hint={t('Zyada se zyada {{maxUnits}}', { maxUnits: fmtNum(maxUnits) })} />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[maxUnits].filter((m) => m > 0).map((m) => <Button key="all" size="sm" variant="soft" onPress={() => setQty(m)}>{t('Sab ({{value}})', { value: fmtNum(m) })}</Button>)}
            </View>
            {amount > 0 ? <Text size="sm" tone="secondary">{t('Qeemat')}: <Text size="sm" weight="bold">{formatMoney(value)}</Text></Text> : null}
          </>
        )}
      </View>
    </Sheet>
  );
}

export function ExpiryScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('pharmacyDesk');
  const canAct = can(P.PURCHASES_CREATE) || can(P.STOCK_ADJUSTMENTS_MANAGE);
  const [bucket, setBucket] = useState<ExpiryBucket>('90');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ExpirySort>('soon');
  const [action, setAction] = useState<ExpiryRow | null>(null);
  const q = useDebouncedValue(search.trim(), 300);

  const list = useInfiniteQuery({
    queryKey: [EXPIRY_KEY, bucket, q, sort],
    queryFn: ({ pageParam }) => expiryApi.list({ bucket, search: q || undefined, sort, page: pageParam, limit: LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const totals = list.data?.pages[0]?.totals;
  const count = (id: ExpiryBucket) => (totals ? (id === 'expired' ? totals.expired : id === '30' ? totals.d30 : id === '90' ? totals.d90 : id === '180' ? totals.d180 : undefined)?.batches : undefined);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={CalendarX} tone="danger" label={t('Expire ho chuki')} loading={!totals} value={cost(totals?.expired.cost ?? 0)} hint={t('{{count}} batch', { count: totals?.expired.batches ?? 0 })} onPress={() => setBucket('expired')} />
        <StatTile style={{ flex: 1 }} icon={CalendarClock} tone="warning" label={t('30 din me')} loading={!totals} value={cost(totals?.d30.cost ?? 0)} hint={t('{{count}} batch', { count: totals?.d30.batches ?? 0 })} onPress={() => setBucket('30')} />
      </Row>
      <ChipGroup value={bucket} onChange={setBucket} style={{ marginHorizontal: -th.space(4) }} options={BUCKETS.map((b) => ({ value: b.id, label: t(b.label), count: count(b.id) }))} />
      <Select label={t('Sort')} value={sort} onChange={(v) => setSort(v as ExpirySort)} options={SORTS.map((s) => ({ value: s.value, label: t(s.label) }))} />
      <OfflineNote feature="pharmacyDesk" />
      <CachedNote query={list} />
    </View>
  );

  return (
    <>
      <ListTemplate<ExpiryRow>
        title={t('Expiry')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Dawai, formula, batch ya barcode…') }}
        summary={header}
        data={items}
        loading={list.isLoading}
        error={!list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => (
          <ListRow icon={Pill} iconTone={expiryTone(r.daysLeft)} title={r.product.name}
            subtitle={[r.generic, `${t('Batch')} ${r.batchNumber}`, r.medicine?.manufacturer].filter(Boolean).join(' · ')}
            overline={`${formatDate(r.expiryDate, { year: true })} · ${fmtNum(r.quantity)} ${r.product.unit}`}
            trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Badge tone={expiryTone(r.daysLeft)}>{daysText(r.daysLeft)}</Badge><Text size="2xs" tone="muted">{cost(r.value)}</Text></View>}
            chevron={canAct} onPress={canAct ? () => guard(() => setAction(r)) : () => router.push(`/products/${r.product.id}` as never)} />
        )}
        empty={<EmptyState icon={CalendarX} title={q ? t('Is filter me koi batch nahi') : t('Koi dawai expire hone ke qareeb nahi')} message={t('Purchase me har batch ka number aur expiry likhein.')} />}
      />
      <ActionSheet row={action} onClose={() => setAction(null)} />
    </>
  );
}
