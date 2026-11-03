/**
 * Stock report (web StockReportPage): what is on the shelf with its value
 * at cost and at sale price, how fast it sells and how long it lasts, dead,
 * slow and fast stock, expiry; analytics, the branch view and the period
 * ledger (opening, in, out, closing). Tap a line for its detail (branches,
 * batches, last movements). Industries add statuses through
 * STOCK_REPORT_EXTRA (meta.ts). Needs internet; the last loaded data stays
 * readable offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BarChart3, Package, Printer, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { formatDate, formatDateTime, formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import {
  Badge, Button, Card, ChipGroup, DetailRow, EmptyState, IconButton, ListRow, ListTemplate, Row, Segmented, Select, Sheet, Text, useDebouncedValue, useTheme,
} from '@/design';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { useCategories, useBrands } from '../../components/Pickers';
import { ProductThumb } from '../../components/ProductThumb';
import { INV, qty, useCostMask } from '../../lib/shared';
import { stockReportApi, type StockLine, type StockQuery, type StockSort, type StockStatusFilter } from '../api';
import { BASE_STATUSES, LEDGER_KINDS, STOCK_REPORT_EXTRA, STOCK_STATUS, ageText, movementOf, periodRange, type PeriodPreset } from '../meta';
import { Bars, OnlineOnly, PeriodChips, StatStrip, printTable } from '../components/parts';
import { usePaged } from '../usePaged';

type Tab = 'stock' | 'analytics' | 'branches' | 'period';
const coverText = (d: number | null) => (d === null ? '—' : d < 1 ? t('aaj khatam') : t('{{d}} din', { d }));

export function StockReportScreen() {
  const th = useTheme();
  const { cost, costHidden } = useCostMask();
  const { id: industry } = useIndustry();
  const [tab, setTab] = useState<Tab>('stock');
  const [period, setPeriod] = useState<PeriodPreset>('last30');
  const [status, setStatus] = useState<StockStatusFilter>('all');
  const [sort, setSort] = useState<StockSort>('value');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [filters, setFilters] = useState(false);
  const [item, setItem] = useState<StockLine | null>(null);
  const [ledgerShow, setLedgerShow] = useState<'all' | 'moved'>('moved');
  const categories = useCategories();
  const brands = useBrands();
  const range = periodRange(period);
  const base: StockQuery = { ...(range ?? {}), categoryId: categoryId || undefined, brandId: brandId || undefined, search: query || undefined };
  const list = usePaged([INV, 'stock-report', 'list', base, status, sort], (page) => stockReportApi.list({ ...base, status, sort, page, limit: 40 }), tab === 'stock');
  const ledger = usePaged([INV, 'stock-report', 'ledger', base, ledgerShow], (page) => stockReportApi.ledger({ ...base, show: ledgerShow, page, limit: 40 }), tab === 'period');
  const analytics = useQuery({ queryKey: [INV, 'stock-report', 'analytics', base], queryFn: () => stockReportApi.analytics(base), enabled: tab === 'analytics' });
  const branches = useQuery({ queryKey: [INV, 'stock-report', 'branches', base], queryFn: () => stockReportApi.branches(base), enabled: tab === 'branches' });
  const first = list.first;
  const tot = first?.totals;
  const statuses: StockStatusFilter[] = ['all', ...BASE_STATUSES, ...(STOCK_REPORT_EXTRA[industry ?? '']?.statuses ?? [])];

  const print = async () => {
    const all = await stockReportApi.list({ ...base, status, sort, page: 1, limit: 1000 });
    await printTable({
      title: t('Stock report'), subtitle: `${range ? `${range.from} — ${range.to}` : t('Sab tareekhen')} · ${t(STOCK_STATUS[status].label)}`,
      columns: [t('Cheez'), t('Stock'), ...(costHidden ? [] : [t('Cost')]), t('Bechne par'), t('Bika'), t('Kitne din')],
      rows: all.items.map((l) => [l.name, `${qty(l.stock)} ${l.unit}`, ...(costHidden ? [] : [cost(l.valueAtCost ?? 0)]), formatPKR(l.retail), qty(l.sold.qty), coverText(l.cover)]),
      footer: all.totals ? `${t('Stock ki cost')}: ${cost(all.totals.cost)} · ${t('Bechne par milega')}: ${cost(all.totals.retail)}` : undefined,
    });
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <PeriodChips value={period} onChange={setPeriod} />
      {tot && (
        <StatStrip items={[
          { label: t('Stock ki cost'), value: cost(tot.cost), hint: t('{{units}} units', { units: qty(tot.units) }), tone: 'brand' },
          { label: t('Bechne par milega'), value: cost(tot.retail), hint: costHidden ? undefined : t('profit {{cost}}', { cost: cost(tot.profit) }), tone: 'success' },
          { label: t('Dead stock'), value: cost(tot.dead.cost), hint: t('{{dead}} nahi bik rahi', { dead: tot.dead.count }), tone: 'accent', onPress: () => setStatus('dead') },
          { label: t('Expiry'), value: cost(tot.expiry.cost), hint: t('{{count}} cheezein', { count: tot.expiry.count }), tone: 'warning', onPress: () => setStatus('expiry') },
          { label: t('Stock kitne din chalega'), value: coverText(tot.coverDays), tone: 'info' },
        ]} />
      )}
      <Segmented value={tab} onChange={setTab} size="sm" options={[
        { value: 'stock', label: t('Stock') }, { value: 'analytics', label: t('Analytics') }, { value: 'branches', label: t('Branches') }, { value: 'period', label: t('Period') },
      ]} />
      {tab === 'stock' && (
        <ChipGroup value={status} onChange={setStatus} style={{ marginHorizontal: -th.space(4) }}
          options={statuses.map((s) => ({ value: s, label: t(STOCK_STATUS[s].label), icon: STOCK_STATUS[s].icon, count: first?.counts?.[s] }))} />
      )}
      {tab === 'period' && (
        <Segmented value={ledgerShow} onChange={setLedgerShow} size="sm" options={[{ value: 'moved', label: t('Jo hila') }, { value: 'all', label: t('Sab') }]} />
      )}
      {tab === 'period' && ledger.first && (
        <Card title={t('Period ka hisaab')}>
          <DetailRow label={t('Shuru me')} value={`${qty(ledger.first.totals.opening.units)} · ${cost(ledger.first.totals.opening.cost)}`} />
          {ledger.first.totals.kinds.filter((k) => k.qty).map((k) => {
            const meta = LEDGER_KINDS.find((x) => x.key === k.key);
            return <DetailRow key={k.key} label={meta ? t(meta.label) : k.key} value={`${meta?.dir === 'out' ? '−' : '+'}${qty(Math.abs(k.qty))}`} />;
          })}
          <DetailRow label={t('Aakhir me')} value={`${qty(ledger.first.totals.closing.units)} · ${cost(ledger.first.totals.closing.cost)}`} last />
        </Card>
      )}
      {tab === 'analytics' && <StockAnalyticsView data={analytics.data} loading={analytics.isLoading} cost={cost} />}
      {tab === 'branches' && <BranchesView data={branches.data} loading={branches.isLoading} cost={cost} />}
      {(tab === 'stock' || tab === 'period') && <OnlineOnly feature="reports" updatedAt={(tab === 'stock' ? list : ledger).cached.fromCache ? (tab === 'stock' ? list : ledger).cached.updatedAt : null} />}
    </View>
  );

  const pager = tab === 'stock' ? list : ledger;
  return (
    <>
      <ListTemplate<StockLine | Awaited<ReturnType<typeof stockReportApi.ledger>>['items'][number]>
        title={t('Stock report')}
        actions={<Row gap={1}>
          <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={!!categoryId || !!brandId} onPress={() => setFilters(true)} />
          <IconButton icon={Printer} label={t('Print')} onPress={() => void print()} disabled={!list.items.length} />
        </Row>}
        search={tab === 'stock' || tab === 'period' ? { value: search, onChange: setSearch, placeholder: t('Naam, SKU ya barcode…') } : undefined}
        summary={summary}
        data={tab === 'stock' ? list.items : tab === 'period' ? ledger.items : []}
        loading={(tab === 'stock' || tab === 'period') && pager.loading}
        error={tab === 'stock' || tab === 'period' ? pager.error : null}
        onRetry={pager.refetch}
        refreshing={pager.refreshing}
        onRefresh={pager.refetch}
        onEndReached={pager.loadMore}
        footer={pager.loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : undefined}
        keyExtractor={(l) => l.productId}
        renderItem={({ item: l }) => ('flags' in l ? (
          <ListRow
            leading={<ProductThumb name={l.name} category={l.category?.name} url={l.image} size={42} />}
            title={l.name}
            subtitle={[t('{{qty}} bika', { qty: qty(l.sold.qty) }), t('{{d}} chalega', { d: coverText(l.cover) }), l.saleAge !== null ? t('aakhri sale {{age}}', { age: ageText(l.saleAge) }) : null].filter(Boolean).join(' · ')}
            trailing={<View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text weight="bold" tone={l.status === 'out' ? 'danger' : l.status === 'low' ? 'warning' : 'default'} ltr>{`${qty(l.stock)} ${l.unit}`}</Text>
              <Text size="xs" tone="muted" ltr>{costHidden ? cost(l.retail) : cost(l.valueAtCost ?? 0)}</Text>
              {l.flags.includes('dead') ? <Badge tone="accent">{t('Dead')}</Badge> : l.flags.includes('expiry') || l.flags.includes('expired') ? <Badge tone="warning">{t('Expiry qareeb')}</Badge> : null}
            </View>}
            onPress={() => setItem(l)}
          />
        ) : (
          <ListRow
            icon={Package}
            title={l.name}
            subtitle={`${t('Shuru me')} ${qty(l.opening)} · +${qty(l.inQty)} · −${qty(l.outQty)}`}
            trailing={<View style={{ alignItems: 'flex-end' }}>
              <Text weight="bold" ltr>{`${qty(l.closing)} ${l.unit}`}</Text>
              <Text size="xs" tone={l.change >= 0 ? 'success' : 'danger'} ltr>{`${l.change >= 0 ? '+' : ''}${qty(l.change)}`}</Text>
            </View>}
            onPress={() => router.push(`/products/${l.productId}` as never)}
          />
        ))}
        empty={tab === 'stock' || tab === 'period' ? <EmptyState icon={BarChart3} title={t('Is filter me kuch nahi')} /> : <View />}
      />
      <ItemSheet line={item} range={range} onClose={() => setItem(null)} cost={cost} />
      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')} footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={() => { setCategoryId(''); setBrandId(''); setStatus('all'); }}>{t('Filter saaf karein')}</Button>
        <Button style={{ flex: 1 }} onPress={() => setFilters(false)}>{t('Dekhein')}</Button>
      </Row>}>
        <View style={{ gap: th.space(3) }}>
          <Select label={t('Category')} value={categoryId} onChange={setCategoryId} searchable options={[{ value: '', label: t('Sab category') }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label={t('Brand')} value={brandId} onChange={setBrandId} searchable options={[{ value: '', label: t('Sab') }, ...(brands.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          <Select<StockSort> label={t('Sort')} value={sort} onChange={setSort} options={[
            { value: 'value', label: t('Stock ki qeemat') }, { value: 'retail', label: t('Bechne par milega') }, { value: 'stock', label: t('Zyada stock pehle') },
            { value: 'sold', label: t('Zyada bikne wale') }, { value: 'cover', label: t('Kam din ka maal pehle') }, { value: 'age', label: t('Purana maal pehle') }, { value: 'name', label: t('Naam (A–Z)') },
          ]} />
        </View>
      </Sheet>
    </>
  );
}

function ItemSheet({ line, range, onClose, cost }: { line: StockLine | null; range?: { from: string; to: string }; onClose: () => void; cost: (n: number) => string }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [INV, 'stock-report', 'item', line?.productId, range], queryFn: () => stockReportApi.item(line!.productId, range ?? {}), enabled: !!line });
  if (!line) return null;
  const d = q.data;
  return (
    <Sheet open onClose={onClose} title={line.name} description={`${qty(line.stock)} ${line.unit} · ${cost(line.valueAtCost ?? line.retail)}`}
      footer={<Button fullWidth variant="secondary" onPress={() => { onClose(); router.push(`/products/${line.productId}` as never); }}>{t('Product dekhein')}</Button>}>
      {!d ? <ActivityIndicator /> : (
        <View style={{ gap: th.space(3) }}>
          <Card>
            <DetailRow label={t('Bika')} value={`${qty(line.sold.qty)} · ${cost(line.sold.revenue)}`} />
            <DetailRow label={t('Roz')} value={qty(line.perDay)} />
            <DetailRow label={t('Kitne din chalega')} value={coverText(line.cover)} />
            <DetailRow label={t('Aakhri sale')} value={line.lastSoldAt ? formatDate(line.lastSoldAt) : t('kabhi nahi')} />
            <DetailRow label={t('Aakhri purchase')} value={line.lastInAt ? formatDate(line.lastInAt) : '—'} last />
          </Card>
          {(d.line?.shops?.length ?? 0) > 1 && (
            <Card title={t('Branches')}>
              {d.line!.shops.map((s, i) => <DetailRow key={s.shopId} label={s.name ?? s.shopId} value={`${qty(s.stock)} ${line.unit}`} last={i === d.line!.shops.length - 1} />)}
            </Card>
          )}
          {d.variants.length > 0 && (
            <Card title={t('Variants')}>
              {d.variants.map((v, i) => <DetailRow key={v.id} label={v.name} value={qty(v.stock)} last={i === d.variants.length - 1} />)}
            </Card>
          )}
          {d.batches.length > 0 && (
            <Card title={t('Batches')}>
              {d.batches.map((b, i) => <DetailRow key={b.id} label={`${b.batchNumber}${b.expiryDate ? ` · ${formatDate(b.expiryDate)}` : ''}`} value={qty(b.qty)} last={i === d.batches.length - 1} />)}
            </Card>
          )}
          {d.moves.length > 0 && (
            <Card title={t('Stock ki movements')}>
              {d.moves.slice(0, 12).map((m, i) => (
                <DetailRow key={m.id} label={`${t(movementOf(m.type).label)} · ${formatDateTime(m.createdAt)}`} value={`${m.quantity > 0 ? '+' : ''}${qty(m.quantity)} → ${qty(m.balanceAfter)}`} last={i === Math.min(11, d.moves.length - 1)} />
              ))}
            </Card>
          )}
        </View>
      )}
    </Sheet>
  );
}

function StockAnalyticsView({ data, loading, cost }: { data?: Awaited<ReturnType<typeof stockReportApi.analytics>>; loading: boolean; cost: (n: number) => string }) {
  const th = useTheme();
  if (loading || !data) return loading ? <ActivityIndicator /> : <OnlineOnly feature="reports" />;
  const brief = (l: typeof data.topValue) => l.map((b) => ({ key: b.productId, label: b.name, amount: b.valueAtCost || b.retail, value: cost(b.valueAtCost || b.retail), hint: `${qty(b.stock)} ${b.unit}` }));
  return (
    <View style={{ gap: th.space(3) }}>
      <Bars title={t('Category')} rows={data.byCategory.map((c) => ({ key: c.id, label: c.name, amount: c.cost || c.retail, value: cost(c.cost || c.retail), hint: t('{{count}} cheezein', { count: c.lines }) }))} />
      <Bars title={t('Sab se zyada paisa laga')} tone="info" rows={brief(data.topValue)} />
      <Bars title={t('Tez bikne wala')} tone="warning" rows={data.fast.map((b) => ({ key: b.productId, label: b.name, amount: b.sold, value: qty(b.sold), hint: coverText(b.cover) }))} />
      <Bars title={t('Dead stock')} tone="accent" rows={brief(data.dead)} />
      <Bars title={t('Aakhri sale kab hui')} tone="neutral" rows={data.saleAge.map((a) => ({ key: a.key, label: t(a.label), amount: a.cost || a.retail, value: cost(a.cost || a.retail), hint: t('{{count}} cheezein', { count: a.lines }) }))} />
      {data.expiry.soonest.length > 0 && (
        <Bars title={t('Expiry qareeb')} tone="danger" rows={data.expiry.soonest.map((e) => ({ key: `${e.productId}-${e.batchNumber}`, label: `${e.name} · ${e.batchNumber}`, amount: e.cost, value: t('{{d}} din', { d: e.days }), hint: `${qty(e.qty)} · ${formatDate(e.expiryDate)}` }))} />
      )}
    </View>
  );
}

function BranchesView({ data, loading, cost }: { data?: Awaited<ReturnType<typeof stockReportApi.branches>>; loading: boolean; cost: (n: number) => string }) {
  const th = useTheme();
  if (loading || !data) return loading ? <ActivityIndicator /> : <OnlineOnly feature="reports" />;
  return (
    <View style={{ gap: th.space(3) }}>
      {data.shops.map((s) => (
        <Card key={s.shopId} title={s.name} description={t('{{count}} cheezein', { count: s.lines })}>
          <DetailRow label={t('Stock ki cost')} value={cost(s.cost)} />
          <DetailRow label={t('Bechne par milega')} value={cost(s.retail)} />
          <DetailRow label={t('Khatam / Kam')} value={`${s.out} / ${s.low}`} />
          <DetailRow label={t('Bika')} value={`${qty(s.sold.qty)} · ${cost(s.sold.revenue)}`} last />
        </Card>
      ))}
      {data.moves.length > 0 && (
        <Bars title={t('Ek branch me pada, doosri me bik raha')} tone="info" rows={data.moves.map((m) => ({ key: `${m.productId}-${m.from}`, label: `${m.name}: ${m.from} → ${m.to}`, amount: m.qty, value: `${qty(m.qty)} ${m.unit}` }))} />
      )}
    </View>
  );
}
