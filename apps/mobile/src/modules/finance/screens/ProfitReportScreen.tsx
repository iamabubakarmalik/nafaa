/**
 * Profit by product: how much each product earned in a period. A net chain
 * from gross profit to net profit (other income, expenses, stock loss and
 * gain), trend, best and worst products, a searchable product list with
 * sort and views, and breakdowns by category, brand, supplier and staff.
 * Cost and profit are hidden for people without cost access.
 */

import { pctText } from '@nafaa/core/finance';
import { AlertTriangle, Package, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { formatMoney, formatQty } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, BarChart, Card, ChipGroup, DonutChart, EmptyState, ErrorState, HBarList, HeroAmount, HeroText, IconButton, LineChart, ListRow, ListTemplate, PageHero, Select, Sheet, Tabs, Text, Button, useTheme,
} from '@/design';
import { PeriodBar } from '@/modules/reports/components/PeriodBar';
import { CachedNote, ChartCard, Delta, KpiGrid, LineItem } from '@/modules/reports/components/ui';
import { ExportButton } from '@/modules/reports/components/ExportButton';
import type { ReportDoc } from '@/modules/reports/lib/doc';
import { usePeriod } from '@/modules/reports/lib/period';
import { useReport } from '@/modules/reports/lib/useReport';
import { profitApi, type ProfitBrief, type ProfitDim, type ProfitItem, type ProfitSort, type ProfitView } from '../api/profit';

type Tab = 'overview' | 'products' | 'groups';
type Dim = 'category' | 'brand' | 'supplier' | 'staff';
const PAGE = 30;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ProfitReportScreen() {
  const th = useTheme();
  const can = usePermission();
  const costOk = can(P.COST_VIEW);
  const period = usePeriod('month');
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ProfitSort>(costOk ? 'profit' : 'revenue');
  const [view, setView] = useState<ProfitView>('all');
  const [dim, setDim] = useState<Dim>('category');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [filters, setFilters] = useState(false);
  const [open, setOpen] = useState<ProfitItem | null>(null);

  const f = { from: period.period.from === 'all' ? period.today : period.period.from, to: period.period.to, categoryId: categoryId || undefined, brandId: brandId || undefined, staffId: staffId || undefined };
  const overview = useReport('profit-overview', f, () => profitApi.overview(f));
  const items = useInfiniteQuery({
    queryKey: ['report', 'profit-items', f, search, sort, view],
    queryFn: ({ pageParam }) => profitApi.items({ ...f, search: search.trim() || undefined, sort, view, page: pageParam, limit: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined),
    enabled: tab === 'products',
    placeholderData: keepPreviousData,
  });
  const o = overview.data;
  const rows = useMemo(() => items.data?.pages.flatMap((p) => p.items) ?? [], [items.data]);
  const hasProfit = o?.totals.profit != null;

  const dims: Record<Dim, ProfitDim[]> = { category: o?.byCategory ?? [], brand: o?.byBrand ?? [], supplier: o?.bySupplier ?? [], staff: o?.byStaff ?? [] };
  const brief = (b: ProfitBrief, by: 'profit' | 'revenue' | 'discount' | 'refund') => ({
    key: b.key, label: b.name, value: by === 'profit' ? b.profit ?? 0 : by === 'revenue' ? b.revenue : by === 'discount' ? b.discount : b.refund,
    display: formatMoney(by === 'profit' ? b.profit ?? 0 : by === 'revenue' ? b.revenue : by === 'discount' ? b.discount : b.refund),
    hint: `${formatQty(b.qty)} ${b.unit}${by === 'profit' && b.margin != null ? ` · ${pctText(b.margin)}` : ''}`,
  });

  const doc = (): ReportDoc | null => {
    if (!o) return null;
    return {
      title: t('Profit by product'), subtitle: period.label, fileName: `profit-${f.from}-${f.to}`,
      summary: [[t('Sale'), formatMoney(o.totals.revenue)], ...(hasProfit ? [[t('Bill ka profit'), formatMoney(o.totals.profit)] as [string, string], [t('Net profit'), formatMoney(o.net.netProfit)] as [string, string]] : [])],
      tables: [{ heading: t('Products'), columns: [t('Product'), t('Quantity'), t('Sale'), ...(hasProfit ? [t('Profit'), t('Margin')] : [])], rows: rows.map((p) => [p.name, formatQty(p.qty), formatMoney(p.revenue), ...(hasProfit ? [formatMoney(p.profit), pctText(p.margin)] : [])]) }],
    };
  };

  const hero = (
    <PageHero chip={period.label} loading={!o && overview.isLoading}
      stats={[
        { label: hasProfit ? t('Net profit') : t('Sale'), value: <HeroAmount value={hasProfit ? o?.net.netProfit : o?.totals.revenue} size="3xl" weight="heavy" />, hint: o ? <Delta value={hasProfit ? ((o.net.netProfit ?? 0) - (o.prevNet.netProfit ?? 0)) / Math.max(Math.abs(o.prevNet.netProfit ?? 0), 1) * 100 : o.prev.revenue > 0 ? ((o.totals.revenue - o.prev.revenue) / o.prev.revenue) * 100 : null} /> : undefined },
        { label: t('Sale'), value: <HeroAmount value={o?.totals.revenue} size="lg" /> },
        ...(hasProfit ? [{ label: t('Margin'), value: <HeroText weight="bold" size="lg" ltr>{pctText(o?.totals.margin)}</HeroText> }] : []),
        { label: t('Bills'), value: String(o?.totals.bills ?? 0) },
      ]} />
  );

  const overviewTab = !o ? null : (
    <View style={{ gap: th.space(4) }}>
      {hasProfit && (
        <Card title={t('Net profit kaise bana')}>
          <LineItem label={t('Gross profit')} value={<Amount value={o.net.grossProfit} weight="semibold" />} />
          {o.net.split && <>
            <LineItem indent label={t('Is me haath mein aaya')} value={<Amount value={o.net.split.realised - o.net.split.fromOlderBills} />} />
            <LineItem indent label={t('Udhaar mein profit — abhi aana hai')} value={<Amount value={o.net.split.pending} />} />
          </>}
          <LineItem label={t('Doosri aamdani')} value={<Amount value={o.net.otherIncome ?? 0} signed />} />
          <LineItem label={t('Kul kharchay')} value={<Amount value={-o.net.expenses} />} />
          <LineItem label={t('Stock nuksan')} value={<Amount value={-(o.net.stockLoss ?? 0)} />} />
          <LineItem label={t('Stock faida')} value={<Amount value={o.net.stockGain ?? 0} signed />} />
          <LineItem bold last label={t('Net profit')} value={<Amount value={o.net.netProfit} weight="bold" colorize />} />
        </Card>
      )}
      <KpiGrid items={[
        { label: t('Discount diya'), value: <Amount value={o.totals.discount} size="lg" weight="bold" />, tone: 'warning' },
        { label: t('Return'), value: <Amount value={o.totals.refund} size="lg" weight="bold" />, tone: 'danger' },
        ...(o.costBasis && o.costBasis.noCostProducts > 0 ? [{ label: t('Bina cost wale'), value: <Text size="lg" weight="bold">{o.costBasis.noCostProducts}</Text>, hint: t('Un ki poori sale profit ginti gayi'), tone: 'danger' as const }] : []),
      ]} />
      {o.trend.length > 1 && (
        <ChartCard title={t('Sale ka rujhan')}>
          <LineChart labels={o.trend.map((x) => (o.range.byMonth ? x.key.slice(2) : x.key.slice(8)))}
            series={[{ key: 'revenue', label: t('Sale'), data: o.trend.map((x) => x.revenue) }, ...(hasProfit ? [{ key: 'profit', label: t('Profit'), data: o.trend.map((x) => x.profit ?? 0), color: '#16a34a' }] : [])]} format={formatMoney} />
        </ChartCard>
      )}
      {o.weekday.length > 0 && (
        <ChartCard title={t('Hafte ke din')}>
          <BarChart labels={o.weekday.map((w) => DAYS[w.day] ?? String(w.day))} series={[{ key: 'r', values: o.weekday.map((w) => hasProfit ? w.profit ?? 0 : w.revenue) }]} signed={hasProfit} height={120} format={formatMoney} />
        </ChartCard>
      )}
      {o.topEarners.length > 0 && hasProfit && <ChartCard title={t('Sab se zyada kamane wale')}><HBarList rows={o.topEarners.slice(0, 6).map((b) => brief(b, 'profit'))} /></ChartCard>}
      {o.topSellers.length > 0 && <ChartCard title={t('Sab se zyada bikne wale')}><HBarList colorful rows={o.topSellers.slice(0, 6).map((b) => brief(b, 'revenue'))} /></ChartCard>}
      {o.losses.count > 0 && hasProfit && (
        <ChartCard title={t('Nuksan wale products ({{count}})', { count: o.losses.count })} subtitle={formatMoney(o.losses.amount)}>
          <HBarList rows={o.losses.items.slice(0, 6).map((b) => ({ ...brief(b, 'profit'), color: '#e11d48' }))} />
        </ChartCard>
      )}
      {o.discountTop.length > 0 && <ChartCard title={t('Sab se zyada discount')}><HBarList rows={o.discountTop.slice(0, 5).map((b) => ({ ...brief(b, 'discount'), color: '#d97706' }))} /></ChartCard>}
      {o.returnTop.length > 0 && <ChartCard title={t('Sab se zyada return')}><HBarList rows={o.returnTop.slice(0, 5).map((b) => ({ ...brief(b, 'refund'), color: '#e11d48' }))} /></ChartCard>}
    </View>
  );

  const groupsTab = !o ? null : (
    <View style={{ gap: th.space(4) }}>
      <ChipGroup value={dim} onChange={setDim} options={[{ value: 'category', label: t('Category') }, { value: 'brand', label: t('Brand') }, { value: 'supplier', label: t('Supplier') }, { value: 'staff', label: t('Staff') }]} />
      {dims[dim].length === 0 ? <EmptyState title={t('Is period me kuch nahi')} /> : (
        <>
          <ChartCard title={t('Sale ka hissa')}>
            <DonutChart slices={dims[dim].slice(0, 8).map((x) => ({ key: x.id, label: x.name, value: x.revenue, color: x.color ?? undefined }))} />
          </ChartCard>
          <Card flush>
            {dims[dim].map((x, i) => (
              <ListRow key={x.id} dense divider={i < dims[dim].length - 1} title={x.name} subtitle={`${t('Sale')} ${formatMoney(x.revenue)} · ${x.products} ${t('products')}`}
                trailing={<View style={{ alignItems: 'flex-end' }}>{hasProfit ? <Amount value={x.profit} weight="bold" colorize /> : <Amount value={x.revenue} weight="bold" />}{hasProfit && <Text size="2xs" tone="muted" ltr>{pctText(x.margin)}</Text>}</View>} />
            ))}
          </Card>
        </>
      )}
    </View>
  );

  const sortOptions: Array<{ value: ProfitSort; label: string }> = [
    ...(hasProfit || costOk ? [{ value: 'profit' as const, label: t('Profit') }, { value: 'margin' as const, label: t('Margin') }] : []),
    { value: 'revenue', label: t('Sale') }, { value: 'qty', label: t('Quantity') }, { value: 'discount', label: t('Discount') }, { value: 'returns', label: t('Return') },
    ...(costOk ? [{ value: 'loss' as const, label: t('Nuksan') }] : []), { value: 'name', label: t('Naam') },
  ];

  return (
    <>
      <ListTemplate
        title={t('Profit by product')}
        actions={<><ExportButton build={doc} disabled={!o} /><IconButton icon={SlidersHorizontal} label={t('Filters')} onPress={() => setFilters(true)} badge={categoryId || brandId || staffId ? 1 : undefined} /></>}
        search={tab === 'products' ? { value: search, onChange: setSearch, placeholder: t('Product, SKU ya barcode') } : undefined}
        summary={<View style={{ gap: th.space(3) }}>
          {hero}
          <PeriodBar state={period} presets={['today', 'yesterday', 'week', 'month', 'lastMonth', 'year']} />
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'overview', label: t('Overview') }, { value: 'products', label: t('Products') }, { value: 'groups', label: t('Groups') }]} />
          {tab === 'products' && (
            <View style={{ gap: th.space(2) }}>
              <ChipGroup value={view} onChange={setView} options={[
                { value: 'all', label: t('Sab') }, ...(costOk ? [{ value: 'loss' as const, label: t('Nuksan') }, { value: 'nocost' as const, label: t('Bina cost') }, { value: 'fallback' as const, label: t('Andaza cost') }] : []),
                { value: 'discount', label: t('Discount') }, { value: 'returns', label: t('Return') },
              ]} />
              <ChipGroup value={sort} onChange={setSort} options={sortOptions} />
            </View>
          )}
          <CachedNote query={tab === 'products' ? items : overview} />
        </View>}
        data={tab === 'products' ? rows : []}
        loading={tab === 'products' ? items.isLoading : false}
        error={tab === 'products' ? items.error : null}
        onRetry={() => void items.refetch()}
        refreshing={overview.isRefetching}
        onRefresh={() => { void overview.refetch(); if (tab === 'products') void items.refetch(); }}
        onEndReached={() => { if (tab === 'products' && items.hasNextPage && !items.isFetchingNextPage) void items.fetchNextPage(); }}
        keyExtractor={(p) => p.key}
        renderItem={({ item: p }) => (
          <ListRow title={p.name} subtitle={`${formatQty(p.qty)} ${p.unit} · ${t('Sale')} ${formatMoney(p.revenue)}${p.category ? ` · ${p.category.name}` : ''}`} icon={Package}
            trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
              {p.profit != null ? <Amount value={p.profit} weight="bold" colorize /> : <Amount value={p.revenue} weight="bold" />}
              {p.margin != null ? <Text size="2xs" tone="muted" ltr>{pctText(p.margin)}</Text> : null}
              {(p.noCostLines ?? 0) > 0 ? <Badge tone="danger">{t('Bina cost')}</Badge> : p.fallbackLines > 0 ? <Badge tone="warning">{t('Andaza')}</Badge> : null}
            </View>}
            onPress={() => setOpen(p)} />
        )}
        empty={tab === 'products' ? <EmptyState icon={AlertTriangle} title={t('Koi product nahi mila')} />
          : <View style={{ paddingHorizontal: th.space(4) }}>{tab === 'overview' ? (overview.isError && !o ? <ErrorState error={overview.error} onRetry={() => void overview.refetch()} /> : overviewTab) : groupsTab}</View>}
      />
      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')} footer={<Button fullWidth onPress={() => setFilters(false)}>{t('Done')}</Button>}>
        <View style={{ gap: th.space(4) }}>
          <Select label={t('Category')} value={categoryId || 'all'} onChange={(v) => setCategoryId(v === 'all' ? '' : v)} options={[{ value: 'all', label: t('Sab categories') }, ...(o?.byCategory ?? []).filter((x) => x.id).map((x) => ({ value: x.id, label: x.name }))]} />
          <Select label={t('Brand')} value={brandId || 'all'} onChange={(v) => setBrandId(v === 'all' ? '' : v)} options={[{ value: 'all', label: t('Sab brands') }, ...(o?.byBrand ?? []).filter((x) => x.id).map((x) => ({ value: x.id, label: x.name }))]} />
          <Select label={t('Staff')} value={staffId || 'all'} onChange={(v) => setStaffId(v === 'all' ? '' : v)} options={[{ value: 'all', label: t('Sab staff') }, ...(o?.byStaff ?? []).filter((x) => x.id).map((x) => ({ value: x.id, label: x.name }))]} />
        </View>
      </Sheet>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name} description={open?.sku ?? undefined}>
        {open && (
          <View style={{ gap: th.space(2) }}>
            <LineItem label={t('Quantity')} value={`${formatQty(open.qty)} ${open.unit}`} />
            <LineItem label={t('Sale')} value={<Amount value={open.revenue} weight="semibold" />} />
            <LineItem label={t('Discount')} value={<Amount value={open.discount} />} />
            <LineItem label={t('Return')} value={<Amount value={open.refund} />} />
            {open.cost != null && <LineItem label={t('Cost')} value={<Amount value={open.cost} />} />}
            {open.profit != null && <LineItem label={t('Profit')} value={<Amount value={open.profit} weight="bold" colorize />} />}
            {open.margin != null && <LineItem label={t('Margin')} value={pctText(open.margin)} />}
            {open.avgPrice > 0 && <LineItem label={t('Ausat rate')} value={<Amount value={open.avgPrice} />} />}
            {open.avgCost != null && <LineItem last label={t('Ausat cost')} value={<Amount value={open.avgCost} />} />}
            {open.variants.length > 1 && (
              <Card flush title={t('Variants')}>
                {open.variants.map((v, i) => <ListRow key={v.variantId ?? i} dense divider={i < open.variants.length - 1} title={v.name} subtitle={`${formatQty(v.qty)} · ${formatMoney(v.revenue)}`} trailing={v.profit != null ? <Amount value={v.profit} weight="bold" colorize /> : undefined} />)}
              </Card>
            )}
          </View>
        )}
      </Sheet>
    </>
  );
}
