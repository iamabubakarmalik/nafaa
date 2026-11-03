/**
 * Other income: money that is not a sale (company incentive, scheme claim,
 * commission, rent, interest). It adds to net profit on the day it is
 * written. Shows this month against last, twelve months, monthly incomes
 * that are due, and the record with filters. Works offline for new entries.
 */

import { HandCoins, Pencil, Plus, Repeat, SlidersHorizontal, Tags, Trash2 } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatMoney, formatMonthShort } from '@/core/format';
import { t } from '@/core/i18n';
import { useOfflineList, useOutbox } from '@/core/offline';
import { useOnlineStatus, useSyncStatus } from '@/core/net';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, BarChart, Button, EmptyState, IconButton, ListRow, ListTemplate, Select, Sheet, SwipeRow, Text, confirm, toast, useTheme, Badge, HBarList } from '@/design';
import { BranchBar, PeriodBar } from '@/modules/reports/components/PeriodBar';
import { CachedNote, ChartCard, Delta, KpiGrid } from '@/modules/reports/components/ui';
import { ExportButton } from '@/modules/reports/components/ExportButton';
import { usePeriod } from '@/modules/reports/lib/period';
import type { ReportDoc } from '@/modules/reports/lib/doc';
import { incomeApi, incomeCategoriesApi, type Income, type IncomeReceivedVia } from '../api/expenses';
import { CategorySheet } from '../components/CategorySheet';
import { IncomeSheet, type IncomeDraft } from '../components/IncomeSheet';
import { FIN, FIXED_INCOME, VIA, incomeCat } from '../lib/meta';

const PAGE = 30;
const monthShort = formatMonthShort;

export function IncomeScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ new?: string }>();
  const can = usePermission();
  const canWrite = can(P.INCOME_MANAGE);
  const online = useOnlineStatus();
  const period = usePeriod('month');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [via, setVia] = useState('');
  const [shopId, setShopId] = useState('');
  const [filters, setFilters] = useState(false);
  const [form, setForm] = useState<IncomeDraft | null>(null);
  const [cats, setCats] = useState(false);

  useEffect(() => { if (params.new === '1' && canWrite) { setForm({ mode: 'new' }); router.setParams({ new: undefined }); } }, [params.new, canWrite]);

  const base = { from: period.period.from === 'all' ? undefined : period.period.from, to: period.period.to };
  const filter = { ...base, category: category || undefined, receivedVia: (via || undefined) as IncomeReceivedVia | undefined, shopId: shopId || undefined, search: search.trim() || undefined };
  const overview = useQuery({ queryKey: [FIN, 'income-overview', shopId], queryFn: () => incomeApi.overview(shopId || undefined), placeholderData: keepPreviousData });
  const list = useInfiniteQuery({
    queryKey: [FIN, 'income-list', filter],
    queryFn: ({ pageParam }) => incomeApi.page({ ...filter, page: pageParam, limit: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const catsQ = useQuery({ queryKey: [FIN, 'income-categories'], queryFn: incomeCategoriesApi.list, staleTime: 5 * 60_000 });
  const offlineCats = useOfflineList<{ id: string; name: string; color?: string }>('incomeCategory');
  const categories = catsQ.data ?? (offlineCats.data ?? []).map((c) => ({ id: c.id, name: c.name, color: c.color ?? '#64748b' }));

  const outbox = useOutbox();
  const waiting = outbox.items.filter((i) => i.kind === 'income.create' && (i.status === 'pending' || i.status === 'sending' || i.status === 'issue'));
  const sync = useSyncStatus();
  useEffect(() => { if (sync.pending === 0) void qc.invalidateQueries({ queryKey: [FIN] }); }, [sync.pending, qc]);

  const o = overview.data;
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const first = list.data?.pages[0];
  const remove = useMutation({
    mutationFn: (i: Income) => incomeApi.remove(i.id),
    onSuccess: () => { toast.success(t('Aamdani ka record mita diya')); void qc.invalidateQueries({ queryKey: [FIN] }); void qc.invalidateQueries({ queryKey: ['report'] }); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi mita'))),
  });
  const doRemove = async (i: Income) => {
    if (!online) { toast.warning(t('Yeh kaam internet par hota hai')); return; }
    if (await confirm({ title: t('"{{title}}" ({{amount}}) mitayein?', { title: i.title, amount: formatMoney(i.amount) }), message: t('Profit se yeh aamdani nikal jayegi.'), tone: 'danger', confirmLabel: t('Delete') })) remove.mutate(i);
  };

  const doc = (): ReportDoc => ({
    title: t('Other income'), subtitle: period.label, fileName: `income-${base.from ?? 'all'}-${base.to}`,
    summary: [[t('Kul aamdani'), formatMoney(first?.totals.amount ?? 0)], [t('Records'), String(first?.total ?? rows.length)]],
    tables: [{ heading: t('Other income'), columns: [t('Tareekh'), t('Kis cheez ki'), t('Category'), t('Amount')], rows: rows.map((i) => [formatDate(i.incomeDate), i.title, incomeCat(i).label, formatMoney(i.amount)]) }],
  });

  const filtered = !!(category || via || shopId);
  const months = o?.months ?? [];
  const summary = (
    <View style={{ gap: th.space(3) }}>
      <KpiGrid loading={!o} items={[
        { label: t('Is mahine'), icon: HandCoins, tone: 'success', value: <Amount value={o?.month.amount} size="xl" weight="bold" />, hint: o ? <Delta value={o.lastMonth.amount > 0 ? ((o.month.amount - o.lastMonth.amount) / o.lastMonth.amount) * 100 : null} /> : undefined },
        { label: t('Is period me'), icon: HandCoins, tone: 'brand', value: <Amount value={first?.totals.amount} size="xl" weight="bold" />, hint: t('{{count}} records', { count: first?.totals.count ?? 0 }) },
      ]} />
      {months.length > 1 && (
        <ChartCard title={t('12 mahine')}>
          <BarChart labels={months.map((m) => monthShort(m.key))} series={[{ key: 'm', values: months.map((m) => m.amount) }]} format={formatMoney} highlight={months.length - 1} height={120} />
        </ChartCard>
      )}
      {(o?.due.length ?? 0) > 0 && canWrite && (
        <View style={{ gap: th.space(2) }}>
          <Text size="sm" weight="semibold" tone="warning">{t('Har mahine wali — is mahine abhi nahi likhi')}</Text>
          {o!.due.map((d) => <ListRow key={d.id} icon={Repeat} iconTone="warning" title={d.title} subtitle={incomeCat(d).label} trailing={<Amount value={d.amount} weight="bold" />} onPress={() => setForm({ mode: 'new', income: { ...d } })} />)}
        </View>
      )}
      {first && first.byCategory.length > 0 && (
        <ChartCard title={t('Category ke hisaab se')}><HBarList rows={first.byCategory.map((c) => ({ key: c.key, label: c.label, value: c.amount, color: c.color ?? undefined, display: formatMoney(c.amount), hint: t('{{count}} records', { count: c.count }) }))} /></ChartCard>
      )}
      <PeriodBar state={period} allowAll />
      <BranchBar value={shopId} onChange={setShopId} />
      {waiting.map((w) => <ListRow key={w.id} icon={HandCoins} iconTone={w.status === 'issue' ? 'danger' : 'warning'} title={w.title} subtitle={w.status === 'issue' ? (w.explanation ?? t('Sync issue')) : t('Bhejna baqi hai')} trailing={<Amount value={w.amount ?? 0} weight="bold" />} />)}
      <CachedNote query={list} />
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Other income')}
        actions={<>
          <ExportButton build={doc} disabled={!rows.length} />
          <IconButton icon={Tags} label={t('Categories')} onPress={() => setCats(true)} />
          <IconButton icon={SlidersHorizontal} label={t('Filters')} onPress={() => setFilters(true)} badge={filtered ? 1 : undefined} />
        </>}
        search={{ value: search, onChange: setSearch, placeholder: t('Title, number ya company…') }}
        summary={summary}
        data={rows}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching}
        onRefresh={() => { void list.refetch(); void overview.refetch(); }}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(i) => i.id}
        renderItem={({ item: i }) => {
          const c = incomeCat(i);
          return (
            <SwipeRow end={canWrite ? [{ icon: Pencil, label: t('Edit'), tone: 'brand', onPress: () => setForm({ mode: 'edit', income: i }) }, { icon: Trash2, label: t('Delete'), tone: 'danger', onPress: () => void doRemove(i) }] : []}>
              <ListRow
                leading={<View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${c.color}26`, alignItems: 'center', justifyContent: 'center' }}><c.icon size={18} color={c.color} /></View>}
                title={i.title}
                subtitle={`${c.label} · ${t(VIA[i.receivedVia].label)} · ${formatDate(i.incomeDate)}`}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={i.amount} weight="bold" tone="success" />{i.repeatMonthly ? <Badge tone="info">{t('Har mahine')}</Badge> : null}</View>}
                onPress={canWrite ? () => setForm({ mode: 'edit', income: i }) : undefined}
              />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={HandCoins} title={t('Is period me koi aamdani nahi')} message={t('Company incentive, scheme claim, commission, kiraya — sale ke ilawa jo paisa aaye, likhein taake net profit sahi nikle')}
          action={canWrite ? <Button icon={Plus} onPress={() => setForm({ mode: 'new' })}>{t('New')}</Button> : undefined} />}
        fab={canWrite ? { icon: Plus, label: t('New'), onPress: () => setForm({ mode: 'new' }) } : undefined}
      />
      <IncomeSheet draft={form} categories={categories} onClose={() => setForm(null)} onManageCategories={() => setCats(true)} />
      <CategorySheet kind="income" open={cats} onClose={() => setCats(false)} categories={categories} />
      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')} footer={<View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={() => { setCategory(''); setVia(''); }}>{t('Clear')}</Button>
        <Button style={{ flex: 1 }} onPress={() => setFilters(false)}>{t('Done')}</Button>
      </View>}>
        <View style={{ gap: th.space(4) }}>
          <Select label={t('Category')} value={category || 'all'} onChange={(v) => setCategory(v === 'all' ? '' : v)}
            options={[{ value: 'all', label: t('Sab categories') }, ...FIXED_INCOME.map((c) => ({ value: c.id, label: t(c.label) })), ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label={t('Paisa kahan aaya?')} value={via || 'all'} onChange={(v) => setVia(v === 'all' ? '' : v)}
            options={[{ value: 'all', label: t('Sab') }, ...(Object.keys(VIA) as IncomeReceivedVia[]).map((k) => ({ value: k, label: t(VIA[k].label) }))]} />
        </View>
      </Sheet>
    </>
  );
}
