/**
 * Stock transfers between branches (web TransfersPage): what is on the way
 * to this branch on top, the record with direction, status, period and
 * search, totals and analytics. Sending takes stock off the sending branch
 * at once; the receiving branch's stock goes up when it receives. Needs
 * internet; the last loaded list stays readable offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowRightLeft, PackageCheck, Plus, Printer } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatDateTime, formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, isOwner, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Segmented, Text, useDebouncedValue, useTheme } from '@/design';
import { INV, qty, useCostMask, useOnline } from '../../lib/shared';
import { transfersApi, type StockTransfer, type TransferQuery, type TransferStatusFilter } from '../api';
import { TRANSFER_STATUS, duration, periodRange, type PeriodPreset } from '../meta';
import { Bars, OnlineOnly, PeriodChips, StatStrip, printTable } from '../components/parts';
import { usePaged } from '../usePaged';

/** "12 pcs Surf · 2 pcs Daal +3". */
export function transferPreview(tr: StockTransfer, max = 3) {
  const name = (i: StockTransfer['items'][number]) => (i.usedPhone ? `${i.usedPhone.brand} ${i.usedPhone.model}` : i.product?.name ?? t('Cheez'));
  const text = tr.items.slice(0, max).map((i) => `${qty(i.quantity)} ${i.product?.unit ?? 'pcs'} ${name(i)}`).join(' · ');
  return tr.items.length > max ? `${text} +${tr.items.length - max}` : text;
}

export function useTransferRights() {
  const can = usePermission();
  const user = useAuthStore((s) => s.user);
  const locked = isOwner(user?.role) ? null : (user as { shopId?: string | null } | null)?.shopId ?? null;
  const manage = can(P.STOCK_TRANSFERS_MANAGE);
  return {
    manage,
    locked,
    canReceive: (x: StockTransfer) => manage && x.status === 'IN_TRANSIT' && (!locked || locked === x.toShopId),
    canCancel: (x: StockTransfer) => manage && x.status === 'IN_TRANSIT' && (!locked || locked === x.fromShopId),
  };
}

export function TransfersScreen() {
  const th = useTheme();
  const online = useOnline();
  const { cost } = useCostMask();
  const rights = useTransferRights();
  const currentShop = useAuthStore((s) => s.currentShopId);
  const [tab, setTab] = useState<'record' | 'analytics'>('record');
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [direction, setDirection] = useState<'all' | 'in' | 'out'>('all');
  const [status, setStatus] = useState<TransferStatusFilter>('all');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const range = periodRange(period);
  const f: TransferQuery = { ...(range ?? {}), direction, status, search: query || undefined };
  const list = usePaged([INV, 'transfers', 'list', f], (page) => transfersApi.list({ ...f, page, limit: 30 }), tab === 'record');
  const stats = useQuery({ queryKey: [INV, 'transfers', 'analytics', range], queryFn: () => transfersApi.analytics({ ...(range ?? {}) }) });
  const onWay = useQuery({ queryKey: [INV, 'transfers', 'on-way'], queryFn: () => transfersApi.list({ status: 'IN_TRANSIT', limit: 100 }) });
  const viewShop = rights.locked ?? currentShop;
  const waiting = useMemo(() => (onWay.data?.items ?? []).filter((x) => !viewShop || x.toShopId === viewShop), [onWay.data, viewShop]);
  const s = stats.data?.totals;

  const print = async () => {
    const all = await transfersApi.list({ ...f, page: 1, limit: 200 });
    await printTable({
      title: t('Transfers'), subtitle: range ? `${range.from} — ${range.to}` : t('Sab tareekhen'),
      columns: [t('Number'), t('Kahan se'), t('Kahan'), t('Halat'), t('Cheezein'), t('Qeemat')],
      rows: all.items.map((x) => [x.transferNumber, x.fromShop.name, x.toShop.name, t(TRANSFER_STATUS[x.status].label), transferPreview(x), formatPKR(x.value)]),
    });
  };

  if (!online && !list.items.length && !list.loading) {
    return (
      <ListTemplate title={t('Transfers')} data={[]} keyExtractor={() => ''} renderItem={() => null} empty={<OnlineOnly feature="transfers" />} />
    );
  }

  const summary = (
    <View style={{ gap: th.space(3) }}>
      {waiting.length > 0 && (
        <Card tone="info" title={t('Receive ka intezar')} description={t('Maal "Raste me" rahega jab tak {{to}} "Receive karein" na dabaye. Ghalti ho to receive se pehle cancel ho sakta hai.', { to: waiting[0].toShop.name })}>
          <View style={{ gap: th.space(2) }}>
            {waiting.slice(0, 3).map((x) => (
              <Row key={x.id} gap={2}>
                <View style={{ flex: 1 }}>
                  <Text size="sm" weight="semibold">{`${x.transferNumber} · ${x.fromShop.name}`}</Text>
                  <Text size="xs" tone="muted" numberOfLines={1}>{transferPreview(x)} · {t(' · {{sentAt}} se raste me', { sentAt: duration(x.transferredAt ?? x.createdAt) })}</Text>
                </View>
                {rights.canReceive(x) && <Button size="sm" icon={PackageCheck} onPress={() => router.push(`/transfers/${x.id}?receive=1` as never)}>{t('Receive karein')}</Button>}
              </Row>
            ))}
          </View>
        </Card>
      )}
      <PeriodChips value={period} onChange={setPeriod} />
      {s && (
        <StatStrip items={[
          { label: t('Kul maal gaya · {{value}} transfer', { value: s.count }), value: cost(s.value), tone: 'brand' },
          { label: t('Raste me'), value: String(s.inTransit), tone: 'info', onPress: () => setStatus('IN_TRANSIT') },
          { label: t('Receive'), value: String(s.received), tone: 'success', onPress: () => setStatus('RECEIVED') },
          { label: t('Kam aaya'), value: cost(s.shortValue), tone: 'warning' },
          { label: t('Ausat receiving waqt'), value: s.avgHours == null ? '—' : t('{{count}} ghante', { count: Math.round(s.avgHours) }), tone: 'neutral' },
        ]} />
      )}
      <Segmented value={tab} onChange={setTab} options={[{ value: 'record', label: t('Record') }, { value: 'analytics', label: t('Analytics') }]} />
      {tab === 'record' && <>
        <Segmented value={direction} onChange={setDirection} size="sm"
          options={[{ value: 'all', label: t('Sab') }, { value: 'in', label: t('Aane wala') }, { value: 'out', label: t('Bheja hua') }]} />
        <ChipGroup value={status} onChange={setStatus} style={{ marginHorizontal: -th.space(4) }}
          options={[{ value: 'all', label: t('Har halat') }, { value: 'IN_TRANSIT', label: t('Raste me') }, { value: 'RECEIVED', label: t('Receive') }, { value: 'CANCELLED', label: t('Cancel') }]} />
        <OnlineOnly feature="transfers" updatedAt={list.cached.fromCache ? list.cached.updatedAt : null} />
      </>}
      {tab === 'analytics' && stats.data && (
        <View style={{ gap: th.space(3) }}>
          <Bars title={t('Raaste')} rows={stats.data.routes.map((r) => ({ key: `${r.from}-${r.to}`, label: `${r.from} → ${r.to}`, amount: r.value, value: cost(r.value), hint: t('{{count}} transfer', { count: r.count }) }))} />
          <Bars title={t('Sab se zyada bheja')} tone="info" rows={stats.data.topProducts.map((p) => ({ key: p.name, label: p.name, amount: p.value, value: cost(p.value), hint: `${qty(p.qty)} ${p.unit}` }))} />
        </View>
      )}
    </View>
  );

  return (
    <ListTemplate
      title={t('Transfers')}
      actions={<IconButton icon={Printer} label={t('Print')} onPress={() => void print()} disabled={!list.items.length} />}
      search={tab === 'record' ? { value: search, onChange: setSearch, placeholder: t('Number, branch ya cheez…') } : undefined}
      summary={summary}
      data={tab === 'record' ? list.items : []}
      loading={tab === 'record' && list.loading}
      error={tab === 'record' ? list.error : null}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void onWay.refetch(); void stats.refetch(); }}
      onEndReached={list.loadMore}
      footer={list.loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : undefined}
      keyExtractor={(x) => x.id}
      renderItem={({ item: x }) => (
        <ListRow
          icon={ArrowRightLeft}
          iconTone={TRANSFER_STATUS[x.status].tone}
          overline={`${x.transferNumber} · ${formatDateTime(x.createdAt)}`}
          title={`${x.fromShop.name} → ${x.toShop.name}`}
          subtitle={transferPreview(x)}
          trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text size="sm" weight="bold" ltr>{cost(x.value)}</Text>
            <Badge tone={TRANSFER_STATUS[x.status].tone}>{t(TRANSFER_STATUS[x.status].label)}</Badge>
          </View>}
          chevron
          onPress={() => router.push(`/transfers/${x.id}` as never)}
        />
      )}
      empty={tab === 'record' ? (
        <EmptyState icon={ArrowRightLeft} title={t('Is filter me koi transfer nahi')} message={t('Period ya filter badlein, ya dusri branch ko maal bhejein')}
          action={rights.manage ? <Button icon={Plus} onPress={() => router.push('/transfers/new' as never)}>{t('Maal bhejein')}</Button> : undefined} />
      ) : <View />}
      fab={rights.manage && online ? { icon: Plus, label: t('Maal bhejein'), onPress: () => router.push('/transfers/new' as never) } : undefined}
    />
  );
}
