/**
 * Expenses: this month against last month, the record for a period with
 * category, payment, branch, staff and status filters, bills that come back
 * every month, and analytics. Cash expenses come out of the open cash shift.
 * New expenses work offline and wait in the outbox until they are sent.
 */

import { BarChart3, CheckCircle2, Clock, Copy, FileText, Pencil, Plus, Receipt, Repeat, RotateCcw, SlidersHorizontal, Tags, Trash2, Wallet, XCircle } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '@/core/api/errors';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';
import { useShops } from '@/core/auth/useShops';
import { formatDateTime, formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOfflineList, useOutbox } from '@/core/offline';
import { useOnlineStatus, useSyncStatus } from '@/core/net';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Chip, ChipGroup, Field, IconButton, ListRow, ListTemplate, Select, Sheet, StatusPill, SwipeRow, Tabs, Text, confirm, toast, useTheme,
  EmptyState,
} from '@/design';
import { BranchBar, PeriodBar } from '@/modules/reports/components/PeriodBar';
import { CachedNote, Delta, KpiGrid } from '@/modules/reports/components/ui';
import { ExportButton } from '@/modules/reports/components/ExportButton';
import { usePeriod } from '@/modules/reports/lib/period';
import { sharePdfDoc, type ReportDoc } from '@/modules/reports/lib/doc';
import { expenseCategoriesApi, expensesApi, type Expense, type ExpenseQuery, type ExpenseStatus } from '../api/expenses';
import { CategorySheet } from '../components/CategorySheet';
import { ExpenseAnalyticsView, RepeatingView } from '../components/ExpenseViews';
import { ExpenseSheet, type ExpenseDraft } from '../components/ExpenseSheet';
import { FIN, METHODS, STATUS, categoryEmoji, methodOf } from '../lib/meta';

type Tab = 'record' | 'repeating' | 'analytics';
const PAGE = 30;

export function ExpensesScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ new?: string }>();
  const can = usePermission();
  const canWrite = can(P.EXPENSES_CREATE);
  const online = useOnlineStatus();
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const shopsQ = useShops();
  const period = usePeriod('month');

  const [tab, setTab] = useState<Tab>('record');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [method, setMethod] = useState('');
  const [shopId, setShopId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState<'' | ExpenseStatus>('');
  const [filters, setFilters] = useState(false);
  const [form, setForm] = useState<ExpenseDraft | null>(null);
  const [cats, setCats] = useState(false);
  const [detail, setDetail] = useState<Expense | null>(null);

  useEffect(() => { if (params.new === '1' && canWrite) { setForm({ mode: 'new' }); router.setParams({ new: undefined }); } }, [params.new, canWrite]);

  const base = { from: period.period.from === 'all' ? undefined : period.period.from, to: period.period.to };
  const filter = { ...base, categoryId: categoryId || undefined, paymentMethod: method || undefined, shopId: shopId || undefined, createdById: staffId || undefined, search: search.trim() || undefined };

  const overview = useQuery({ queryKey: [FIN, 'overview', shopId], queryFn: () => expensesApi.overview(shopId || undefined), placeholderData: keepPreviousData });
  const list = useInfiniteQuery({
    queryKey: [FIN, 'list', filter, status],
    queryFn: ({ pageParam }) => expensesApi.page({ ...filter, status: status || undefined, sort: 'recent', page: pageParam, limit: PAGE } as ExpenseQuery),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    enabled: tab === 'record',
    placeholderData: keepPreviousData,
  });
  const analytics = useQuery({ queryKey: [FIN, 'analytics', filter], queryFn: () => expensesApi.analytics(filter), enabled: tab === 'analytics', placeholderData: keepPreviousData });
  const repeating = useQuery({ queryKey: [FIN, 'repeating', shopId], queryFn: () => expensesApi.repeating(shopId || undefined), enabled: tab === 'repeating' });
  const catsQ = useQuery({ queryKey: [FIN, 'categories'], queryFn: expenseCategoriesApi.list, staleTime: 5 * 60_000 });
  const offlineCats = useOfflineList<{ id: string; name: string; color?: string; icon?: string | null }>('expenseCategory');
  const categories = catsQ.data ?? (offlineCats.data ?? []).map((c) => ({ id: c.id, name: c.name, color: c.color ?? '#f59e0b', icon: c.icon ?? null }));

  // Waiting expenses made offline sit on top of the record.
  const outbox = useOutbox();
  const waiting = outbox.items.filter((i) => i.kind === 'expense.create' && (i.status === 'pending' || i.status === 'sending' || i.status === 'issue') && tab === 'record' && !status);
  const sync = useSyncStatus();
  useEffect(() => { if (sync.pending === 0) void qc.invalidateQueries({ queryKey: [FIN] }); }, [sync.pending, qc]);

  const o = overview.data;
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const totals = list.data?.pages[0]?.totals;
  const offlineBlocked = () => { if (!online) { toast.warning(t('Yeh kaam internet par hota hai')); return true; } return false; };

  const refresh = () => { void qc.invalidateQueries({ queryKey: [FIN] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }); void qc.invalidateQueries({ queryKey: ['report'] }); };
  const pay = useMutation({
    mutationFn: (e: Expense) => expensesApi.pay(e.id),
    onSuccess: (e) => { toast.success(t('{{amount}} ada — {{label}}', { amount: formatMoney(e.amount), label: t(methodOf(e.paymentMethod).label) })); refresh(); setDetail(null); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Ada nahi hua'))),
  });
  const setState = useMutation({
    mutationFn: ({ e, to }: { e: Expense; to: ExpenseStatus }) => expensesApi.update(e.id, { status: to }),
    onSuccess: (e) => { toast.success(e.status === 'CANCELLED' ? t('Expense cancel — hisaab se nikal gaya') : t('Expense wapas hisaab me')); refresh(); setDetail(null); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const remove = useMutation({
    mutationFn: (e: Expense) => expensesApi.remove(e.id),
    onSuccess: () => { toast.success(t('Expense mita diya')); refresh(); setDetail(null); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi mita'))),
  });

  const doPay = async (e: Expense) => {
    if (offlineBlocked()) return;
    if (await confirm({ title: t('"{{title}}" {{amount}} abhi ada karein ({{label}})?', { title: e.title, amount: formatMoney(e.amount), label: t(methodOf(e.paymentMethod).label) }), message: t('Tareekh aaj ki lagegi.'), confirmLabel: t('Ada karein') })) pay.mutate(e);
  };
  const doCancel = async (e: Expense) => {
    if (offlineBlocked()) return;
    if (await confirm({ title: t('"{{title}}" cancel karein?', { title: e.title }), message: t('Record rahega magar hisaab me nahi ginega.'), tone: 'danger', confirmLabel: t('Cancel expense') })) setState.mutate({ e, to: 'CANCELLED' });
  };
  const doRemove = async (e: Expense) => {
    if (offlineBlocked()) return;
    if (await confirm({ title: t('"{{title}}" ({{amount}}) hamesha ke liye mitayein?', { title: e.title, amount: formatMoney(e.amount) }), message: t('Behtar hai "Cancel" karein — record bhi rehta hai.'), tone: 'danger', confirmLabel: t('Delete') })) remove.mutate(e);
  };
  const voucher = (e: Expense): ReportDoc => ({
    title: t('Expense voucher'), subtitle: `${e.expenseNumber} · ${formatDateTime(e.expenseDate)}`, fileName: `expense-${e.expenseNumber}`,
    summary: [[t('Kis cheez ka'), e.title], [t('Amount'), formatMoney(e.amount)], [t('Category'), e.category?.name ?? t('Bina category')], [t('Kaise diye'), t(methodOf(e.paymentMethod).label)], [t('Haal'), t(STATUS[e.status].label)], ...(e.createdBy ? [[t('Likha'), e.createdBy.fullName] as [string, string]] : [])],
    notes: e.description ? [e.description] : undefined,
  });
  const listDoc = (): ReportDoc => ({
    title: t('Expenses'), subtitle: period.label, fileName: `expenses-${base.from ?? 'all'}-${base.to}`,
    summary: [[t('Kul expense'), formatMoney(totals?.paid ?? 0)], [t('Baqi bill'), formatMoney(totals?.pending ?? 0)], [t('Records'), String(list.data?.pages[0]?.total ?? rows.length)]],
    tables: [{ heading: t('Expenses'), columns: [t('Tareekh'), t('Kis cheez ka'), t('Category'), t('Kaise diye'), t('Amount')], rows: rows.map((e) => [formatDate(e.expenseDate), e.title, e.category?.name ?? '', t(methodOf(e.paymentMethod).label), formatMoney(e.amount)]) }],
  });

  const filtered = !!(categoryId || method || shopId || staffId || status);
  const up = (o?.change ?? 0) > 0;

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <KpiGrid loading={!o} items={[
        { label: t('Is mahine'), icon: Wallet, tone: 'brand', value: <Amount value={o?.month.amount} size="xl" weight="bold" />, hint: o?.change != null ? <Delta value={o.change} upIsGood={false} /> : t('{{count}} expenses', { count: o?.month.count ?? 0 }) },
        { label: t('Aaj'), icon: Receipt, tone: 'danger', value: <Amount value={o?.today.amount} size="xl" weight="bold" />, hint: t('{{count}} expenses', { count: o?.today.count ?? 0 }) },
        { label: t('Baqi bill'), icon: Clock, tone: 'warning', value: <Amount value={o?.pending.amount} size="xl" weight="bold" />, hint: o?.pending.count ? t('{{count}} bill', { count: o.pending.count }) : t('Koi bill baqi nahi'), onPress: () => { setTab('record'); setStatus('PENDING'); period.setPreset('all'); } },
        o?.topCategory
          ? { label: t('Sab se bara expense'), tone: 'info' as const, value: <Text size="md" weight="bold" numberOfLines={1}>{`${categoryEmoji(o.topCategory.icon) ? `${categoryEmoji(o.topCategory.icon)} ` : ''}${o.topCategory.name === 'Bina category' ? t('Bina category') : o.topCategory.name}`}</Text>, hint: `${formatMoney(o.topCategory.amount)} · ${o.topCategory.share}%`, onPress: () => { setTab('record'); setCategoryId(o.topCategory!.id); period.setPreset('month'); } }
          : { label: t('Pichle mahine se'), tone: 'info' as const, value: <Text size="md" weight="bold">{o?.change == null ? '—' : `${up ? '+' : ''}${o.change}%`}</Text>, hint: o ? t('Poora {{full}}', { full: formatMoney(o.lastMonth.full) }) : undefined },
      ]} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'record', label: t('Record'), icon: Receipt },
        { value: 'repeating', label: t('Har mahine'), icon: Repeat, count: repeating.data?.due || undefined },
        { value: 'analytics', label: t('Analytics'), icon: BarChart3 },
      ]} />
      <PeriodBar state={period} allowAll />
      <BranchBar value={shopId} onChange={setShopId} />
      {filtered && (
        <ChipGroup multiple wrap value={[categoryId && 'c', method && 'm', status && 's', staffId && 'p'].filter(Boolean) as string[]}
          onChange={(v) => { if (!v.includes('c')) setCategoryId(''); if (!v.includes('m')) setMethod(''); if (!v.includes('s')) setStatus(''); if (!v.includes('p')) setStaffId(''); }}
          options={[
            ...(categoryId ? [{ value: 'c', label: categories.find((c) => c.id === categoryId)?.name ?? (categoryId === 'none' ? t('Bina category') : t('Category')) }] : []),
            ...(method ? [{ value: 'm', label: t(methodOf(method).label) }] : []),
            ...(status ? [{ value: 's', label: t(STATUS[status].label) }] : []),
            ...(staffId ? [{ value: 'p', label: o?.people.find((p) => p.id === staffId)?.fullName ?? t('Staff') }] : []),
          ]} />
      )}
      <CachedNote query={tab === 'record' ? list : tab === 'analytics' ? analytics : repeating} />
    </View>
  );

  const renderRow = ({ item: e }: { item: Expense }) => {
    const cat = e.category;
    const st = STATUS[e.status];
    const actions = canWrite ? [
      ...(e.status === 'PENDING' ? [{ icon: CheckCircle2, label: t('Ada karein'), tone: 'success' as const, onPress: () => void doPay(e) }] : []),
      { icon: Pencil, label: t('Edit'), tone: 'brand' as const, onPress: () => setForm({ mode: 'edit', expense: e }) },
      { icon: Trash2, label: t('Delete'), tone: 'danger' as const, onPress: () => void doRemove(e) },
    ] : [];
    return (
      <SwipeRow end={actions}>
        <ListRow
          leading={<View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${cat?.color ?? '#64748b'}26`, alignItems: 'center', justifyContent: 'center' }}>{categoryEmoji(cat?.icon) ? <Text size="lg">{categoryEmoji(cat?.icon)}</Text> : <Wallet size={18} color={cat?.color ?? '#64748b'} />}</View>}
          title={e.title}
          subtitle={`${cat?.name ?? t('Bina category')} · ${t(methodOf(e.paymentMethod).label)} · ${formatDate(e.expenseDate)}`}
          trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Amount value={e.amount} weight="bold" colorize={false} />
            {e.status !== 'PAID' && <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>}
          </View>}
          onPress={() => setDetail(e)}
        />
      </SwipeRow>
    );
  };

  const waitingRows = waiting.map((w) => {
    const b = w.body as { title?: string; paymentMethod?: string; expenseDate?: string } | null;
    return { w, b };
  });

  const content = tab === 'record' ? null : tab === 'analytics'
    ? <ExpenseAnalyticsView data={analytics.data} loading={analytics.isLoading} onCategory={(id) => { setCategoryId(id); setTab('record'); }} />
    : <RepeatingView data={repeating.data} loading={repeating.isLoading} onRecord={(r) => canWrite && setForm({ mode: 'new', title: r.title, amount: r.lastAmount, categoryId: r.category?.id, paymentMethod: r.paymentMethod })} />;

  return (
    <>
      <ListTemplate
        title={t('Expenses')}
        actions={<>
          <ExportButton build={listDoc} disabled={!rows.length} />
          <IconButton icon={Tags} label={t('Categories')} onPress={() => setCats(true)} />
          <IconButton icon={SlidersHorizontal} label={t('Filters')} onPress={() => setFilters(true)} />
        </>}
        search={tab === 'record' ? { value: search, onChange: setSearch, placeholder: t('Expense, number, category ya details…') } : undefined}
        summary={<>
          {summary}
          {waitingRows.length > 0 && (
            <View style={{ gap: th.space(2) }}>
              {waitingRows.map(({ w, b }) => (
                <ListRow key={w.id} icon={Clock} iconTone={w.status === 'issue' ? 'danger' : 'warning'} title={b?.title ?? w.title} subtitle={w.status === 'issue' ? (w.explanation ?? t('Sync issue')) : t('Bhejna baqi hai')}
                  trailing={<Amount value={w.amount ?? 0} weight="bold" />} onPress={w.status === 'issue' ? () => router.push('/settings' as never) : undefined} />
              ))}
            </View>
          )}
        </>}
        data={tab === 'record' ? rows : []}
        loading={tab === 'record' ? list.isLoading : false}
        error={tab === 'record' ? list.error : null}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching}
        onRefresh={() => { void list.refetch(); void overview.refetch(); }}
        onEndReached={() => { if (tab === 'record' && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(e) => e.id}
        renderItem={renderRow}
        empty={content ? <View style={{ paddingHorizontal: th.space(4) }}>{content}</View> : <EmptyState icon={Wallet} title={filtered || search ? t('Koi expense nahi mila') : t('Is period me koi expense nahi')} message={canWrite ? t('Kiraya, bijli, salary, chai-pani — har expense likhein taake profit sahi nikle') : undefined}
          action={canWrite ? <Button icon={Plus} onPress={() => setForm({ mode: 'new' })}>{t('New')}</Button> : undefined} />}
        fab={canWrite && tab !== 'analytics' ? { icon: Plus, label: t('New'), onPress: () => setForm({ mode: 'new' }) } : undefined}
        grouped
      />

      <ExpenseSheet draft={form} categories={categories} register={o?.register} onClose={() => setForm(null)} onManageCategories={() => setCats(true)} />
      <CategorySheet kind="expense" open={cats} onClose={() => setCats(false)} categories={categories} />

      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')} footer={<View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={() => { setCategoryId(''); setMethod(''); setShopId(''); setStaffId(''); setStatus(''); }}>{t('Clear')}</Button>
        <Button style={{ flex: 1 }} onPress={() => setFilters(false)}>{t('Done')}</Button>
      </View>}>
        <View style={{ gap: th.space(4) }}>
          <Select label={t('Category')} value={categoryId || 'all'} onChange={(v) => setCategoryId(v === 'all' ? '' : v)}
            options={[{ value: 'all', label: t('Sab categories') }, { value: 'none', label: t('Bina category') }, ...categories.map((c) => ({ value: c.id, label: `${categoryEmoji(c.icon) ? `${categoryEmoji(c.icon)} ` : ''}${c.name}` }))]} />
          <Select label={t('Kaise diye')} value={method || 'all'} onChange={(v) => setMethod(v === 'all' ? '' : v)}
            options={[{ value: 'all', label: t('Sab tareeqe') }, ...METHODS.map((m) => ({ value: m.id, label: t(m.label), icon: m.icon }))]} />
          <Select label={t('Haal')} value={status || 'all'} onChange={(v) => setStatus(v === 'all' ? '' : (v as ExpenseStatus))}
            options={[{ value: 'all', label: t('Sab') }, ...(Object.keys(STATUS) as ExpenseStatus[]).map((k) => ({ value: k, label: t(STATUS[k].label) }))]} />
          {(o?.people.length ?? 0) > 1 && (
            <Select label={t('Staff')} value={staffId || 'all'} onChange={(v) => setStaffId(v === 'all' ? '' : v)}
              options={[{ value: 'all', label: t('Sab staff') }, ...(o?.people ?? []).map((p) => ({ value: p.id, label: p.fullName }))]} />
          )}
          {allShops && (shopsQ.data?.length ?? 0) > 1 && (
            <Select label={t('Branch')} value={shopId || 'all'} onChange={(v) => setShopId(v === 'all' ? '' : v)}
              options={[{ value: 'all', label: t('All branches') }, ...(shopsQ.data ?? []).map((s) => ({ value: s.id, label: s.name }))]} />
          )}
        </View>
      </Sheet>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.title} description={detail ? `${detail.expenseNumber} · ${formatDateTime(detail.expenseDate)}` : undefined}>
        {detail && (
          <View style={{ gap: th.space(3) }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Amount value={detail.amount} size="3xl" weight="heavy" />
              <StatusPill tone={STATUS[detail.status].tone}>{t(STATUS[detail.status].label)}</StatusPill>
            </View>
            <ListRow dense title={t('Category')} trailing={<Text size="sm">{detail.category ? `${categoryEmoji(detail.category.icon) ? `${categoryEmoji(detail.category.icon)} ` : ''}${detail.category.name}` : t('Bina category')}</Text>} />
            <ListRow dense title={t('Kaise diye')} trailing={<Text size="sm">{t(methodOf(detail.paymentMethod).label)}</Text>} />
            {detail.shop && <ListRow dense title={t('Branch')} trailing={<Text size="sm">{detail.shop.name}</Text>} />}
            {detail.createdBy && <ListRow dense title={t('Likha')} trailing={<Text size="sm">{detail.createdBy.fullName}</Text>} />}
            {detail.description ? <Text size="sm" tone="secondary">{detail.description}</Text> : null}
            <View style={{ gap: th.space(2) }}>
              <Button variant="secondary" icon={FileText} onPress={() => void sharePdfDoc(voucher(detail)).catch(() => toast.error(t('File nahi bani, dobara koshish karein')))}>{t('Share voucher')}</Button>
              {canWrite && <>
                {detail.status === 'PENDING' && <Button variant="success" icon={CheckCircle2} loading={pay.isPending} onPress={() => void doPay(detail)}>{t('Ada karein')}</Button>}
                <Button variant="soft" icon={Pencil} onPress={() => { const e = detail; setDetail(null); setTimeout(() => setForm({ mode: 'edit', expense: e }), 300); }}>{t('Edit')}</Button>
                <Button variant="soft" icon={Copy} onPress={() => { const e = detail; setDetail(null); setTimeout(() => setForm({ mode: 'new', title: e.title, amount: e.amount, categoryId: e.category?.id, paymentMethod: e.paymentMethod, description: e.description ?? undefined }), 300); }}>{t('Dobara likhein')}</Button>
                {detail.status === 'CANCELLED'
                  ? <Button variant="soft" icon={RotateCcw} onPress={() => setState.mutate({ e: detail, to: 'PAID' })}>{t('Wapas hisaab me')}</Button>
                  : <Button variant="soft" icon={XCircle} onPress={() => void doCancel(detail)}>{t('Cancel expense')}</Button>}
                <Button variant="danger" icon={Trash2} onPress={() => void doRemove(detail)}>{t('Delete')}</Button>
              </>}
            </View>
          </View>
        )}
      </Sheet>
    </>
  );
}
