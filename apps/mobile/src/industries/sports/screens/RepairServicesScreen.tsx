/**
 * Repair desk (web RepairServicesPage): bats, rackets and other kit left for
 * repair. Receive an item with an estimate, advance and photos, move it
 * through the work, then deliver: the charge and any parts from stock become
 * one bill and the advance is used up. Needs the server.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { AlarmClock, Hammer, ListChecks, PackageCheck, Plus, Wallet, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, ChipGroup, EmptyState, ListRow, ListTemplate, StatTile, StatusPill, Text, useDebouncedValue, useTheme } from '@/design';
import { OfflineNote, daysFromToday } from '@/industries/_shared/deskKit';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { repairServicesApi, type RepairView, type SportsRepairService } from '../api';
import { NewRepairSheet, RepairJobSheet } from '../components/RepairSheets';
import { REPAIR_KEY, REPAIR_STATUS, day } from '../meta';

const TABS: Array<{ value: RepairView; label: string }> = [
  { value: 'active', label: msg('Chalu') }, { value: 'work', label: msg('Kaam baqi') }, { value: 'ready', label: msg('Tayyar — le jana') }, { value: 'late', label: msg('Late') },
  { value: 'advance', label: msg('Advance wali') }, { value: 'done', label: msg('De di / cancel') }, { value: 'all', label: msg('Sab') },
];
const isLate = (r: SportsRepairService) => ['RECEIVED', 'IN_PROGRESS', 'ON_HOLD'].includes(r.status) && !!r.estimatedReadyAt && (daysFromToday(r.estimatedReadyAt) ?? 0) < 0;

export function RepairServicesScreen() {
  const th = useTheme();
  const canDo = usePermission()(P.POS_USE);
  const [tab, setTab] = useState<RepairView>('active');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim(), 250);
  const period = usePeriod('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const q = { view: tab, search: term || undefined, ...(period.period.from !== 'all' ? { from: period.period.from, to: period.period.to } : {}) };
  const list = useInfiniteQuery({
    queryKey: [REPAIR_KEY, 'page', q], queryFn: ({ pageParam }) => repairServicesApi.page({ ...q, page: pageParam, limit: 25 }), initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined), placeholderData: (p) => p, refetchInterval: 60_000,
  });
  const first = list.data?.pages[0];
  const c = first?.counts;
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  const header = (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1 }} icon={Hammer} tone="accent" label={t('Kaam baqi')} loading={!c} value={String(c?.work ?? 0)} onPress={() => setTab('work')} />
        <StatTile style={{ flex: 1 }} icon={PackageCheck} tone="success" label={t('Tayyar — le jana')} loading={!c} value={String(c?.ready ?? 0)} hint={t('Customer ko bulayein')} onPress={() => setTab('ready')} />
      </View>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1 }} icon={AlarmClock} tone={c?.late ? 'danger' : 'neutral'} label={t('Late')} loading={!c} value={String(c?.late ?? 0)} onPress={() => setTab('late')} />
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="warning" label={t('Advance wali')} loading={!c} value={String(c?.advance ?? 0)} onPress={() => setTab('advance')} />
      </View>
      <ChipGroup value={tab} onChange={(v) => setTab(v as RepairView)} style={{ marginHorizontal: -th.space(4) }} options={TABS.map((x) => ({ value: x.value, label: t(x.label), count: c?.[x.value] }))} />
      <ChipGroup value={period.preset} onChange={(v) => period.setPreset(v as typeof period.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
      {first && <Text size="sm" tone="secondary">{t('Value')} {formatMoney(first.totals.value)} · {t('Advance')} {formatMoney(first.totals.advance)} · {t('Baqi')} {formatMoney(first.totals.due)}</Text>}
      <CachedNote query={list} />
      <OfflineNote feature="sportsDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<SportsRepairService>
        title={t('Repairs')}
        search={{ value: search, onChange: setSearch, placeholder: t('Parchi number, customer, phone ya saman…') }}
        summary={header}
        data={rows}
        loading={list.isLoading}
        error={!list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => {
          const late = isLate(r);
          const value = r.finalCost || r.estimatedCost;
          return (
            <ListRow icon={Wrench} iconTone={late ? 'danger' : REPAIR_STATUS[r.status].tone} title={`${t(r.itemType)}${r.itemBrand ? ` · ${r.itemBrand}` : ''}`}
              subtitle={[r.serviceNumber, r.customerName, r.repairType ? t(r.repairType) : '', r.estimatedReadyAt ? `${t('Tayyar')} ${day(r.estimatedReadyAt)}` : ''].filter(Boolean).join(' · ')}
              trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
                {value > 0 && <Amount value={value} weight="bold" />}
                <StatusPill tone={late ? 'danger' : REPAIR_STATUS[r.status].tone}>{late ? t('Late') : t(REPAIR_STATUS[r.status].label)}</StatusPill>
                {r.advancePaid > 0 && <Text size="2xs" tone="success">{t('Advance {{a}}', { a: formatMoney(r.advancePaid) })}</Text>}
              </View>}
              onPress={() => setOpenId(r.id)} />
          );
        }}
        empty={<EmptyState icon={Wrench} title={search || tab !== 'active' ? t('Is filter me koi repair nahi') : t('Abhi koi repair nahi')} message={t('Bat, racket ya kisi saman ki repair yahan jama karein — andaza, advance aur tayyar hone ki date likhein.')} />}
        fab={canDo ? { icon: Plus, label: t('Nayi repair'), onPress: () => setAdding(true) } : undefined}
      />
      <NewRepairSheet open={adding} onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); setTimeout(() => setOpenId(id), 350); }} />
      <RepairJobSheet id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
