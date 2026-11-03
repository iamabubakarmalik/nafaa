/** The report centre sections: Sales, Items, Customers, Purchases, Expenses, Profit, Returns, Tax and the industry tab. */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { formatDate, formatMoney, formatQty } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, BarChart, Card, DonutChart, EmptyState, HBarList, LineChart, ListRow, Text, useTheme } from '@/design';
import type { CustomersReport, ExpensesReport, IndustryReport, ItemsReport, ProfitReport, PurchasesReport, ReturnsReport, SalesReport, TaxReport } from '../api/center';
import { axisLabel, changePct, fmtValue, keyLabel, pct, weekday } from '../lib/fmt';
import { ChartCard, DataTable, Delta, KpiGrid, LineItem } from './ui';

const METHODS: Record<string, string> = { CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa', BANK_TRANSFER: 'Bank', CREDIT: 'Udhaar', SPLIT: 'Split', WALLET: 'Wallet' };
const method = (m: string) => t(METHODS[m] ?? m);
const SOURCES: Record<string, string> = { POS: 'Counter (POS)', WEBSITE: 'Website', DARAZ: 'Daraz', FOODPANDA: 'Foodpanda', SHOPIFY: 'Shopify', MARKETPLACE: 'Nafaa marketplace' };
const money = (n: number | null | undefined) => formatMoney(n ?? 0);
const ids = (v: string | null, i: number) => v ?? `x${i}`;

function Stack({ children }: { children: ReactNode }) {
  const th = useTheme();
  return <View style={{ gap: th.space(4) }}>{children}</View>;
}
const Big = (v: number | null | undefined, tone?: 'success' | 'danger') => <Amount value={v ?? 0} size="lg" weight="bold" tone={tone} />;

export function SalesSection({ d }: { d: SalesReport }) {
  const x = d.totals;
  const hasCost = x.profit != null;
  return (
    <Stack>
      <KpiGrid items={[
        { label: t('Net sale'), tone: 'brand', value: Big(x.net), hint: <Delta value={changePct(x.net, d.previous?.net)} /> },
        { label: t('Bills'), tone: 'info', value: <Text size="lg" weight="bold">{x.bills}</Text>, hint: <Delta value={changePct(x.bills, d.previous?.bills)} /> },
        ...(hasCost ? [{ label: t('Profit'), tone: 'success' as const, value: Big(x.profit), hint: `${t('Margin')} ${pct(x.margin)}` }] : []),
        { label: t('Ausat bill'), value: Big(x.average), hint: <Delta value={changePct(x.average, d.previous?.average)} /> },
        { label: t('Paisa aaya'), value: Big(x.cashIn), tone: 'success' },
        { label: t('Udhaar diya'), value: Big(x.credit), tone: 'warning', hint: <Delta value={changePct(x.credit, d.previous?.credit)} upIsGood={false} /> },
        { label: t('Discount'), value: Big(x.discount), tone: 'warning' },
        { label: t('Return'), value: Big(x.refunds), tone: 'danger' },
      ]} />
      {d.trend.length > 1 && (
        <ChartCard title={t('Sale ka rujhan')}>
          <LineChart labels={d.trend.map((p) => axisLabel(p.key))} series={[{ key: 'net', label: t('Sale'), data: d.trend.map((p) => p.net) }, ...(hasCost ? [{ key: 'profit', label: t('Profit'), data: d.trend.map((p) => p.profit ?? 0), color: '#16a34a' }] : [])]} format={formatMoney} />
        </ChartCard>
      )}
      {d.hours.some((h) => h.net > 0) && (
        <ChartCard title={t('Rush ka waqt')} subtitle={t('Kis ghante sab se zyada sale')}>
          <BarChart labels={d.hours.map((h) => String(h.hour))} maxLabels={8} series={[{ key: 'h', values: d.hours.map((h) => h.net) }]} format={formatMoney} height={130} />
        </ChartCard>
      )}
      {d.weekdays.some((w) => w.net > 0) && (
        <ChartCard title={t('Hafte ke din')}>
          <BarChart labels={d.weekdays.map((w) => weekday(w.day).slice(0, 3))} series={[{ key: 'w', values: d.weekdays.map((w) => w.net) }]} format={formatMoney} height={120} />
        </ChartCard>
      )}
      {d.payments.length > 0 && (
        <ChartCard title={t('Paisa kaise aaya')}>
          <DonutChart slices={d.payments.map((p) => ({ key: p.method, label: method(p.method), value: p.cashIn }))} center={<Amount value={x.cashIn} compact weight="bold" size="md" />} format={(v) => formatMoney(v, { compact: true })} />
        </ChartCard>
      )}
      {d.channels.length > 1 && <ChartCard title={t('Kahan se sale aayi')}><HBarList colorful rows={d.channels.map((c) => ({ key: c.source, label: t(SOURCES[c.source] ?? c.source), value: c.net, display: money(c.net), hint: t('{{count}} bills', { count: c.bills }) }))} /></ChartCard>}
      {d.staff.length > 1 && <ChartCard title={t('Staff ki sale')}><HBarList colorful rows={d.staff.map((s, i) => ({ key: ids(s.id, i), label: s.name, value: s.net, display: money(s.net), hint: t('{{count}} bills', { count: s.bills }) }))} /></ChartCard>}
      {d.shops.length > 1 && <ChartCard title={t('Branch ke hisaab se')}><HBarList colorful rows={d.shops.map((s, i) => ({ key: ids(s.id, i), label: s.name, value: s.net, display: money(s.net), hint: t('{{count}} bills', { count: s.bills }) }))} /></ChartCard>}
      {d.priceTiers?.mixed && (
        <Card flush title={t('Price tier ke hisaab se')}>
          {d.priceTiers.tiers.map((p, i) => <ListRow key={String(p.tier)} dense divider={i < d.priceTiers!.tiers.length - 1} title={p.label} subtitle={t('{{count}} bills', { count: p.bills })} trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={p.net} weight="bold" />{p.profit != null && <Amount value={p.profit} size="2xs" colorize />}</View>} />)}
        </Card>
      )}
      <Card title={t('Aur tafseel')}>
        <LineItem label={t('Total sale (list rate par)')} value={money(x.gross)} />
        <LineItem label={t('Service / delivery charges')} value={money(x.service)} />
        <LineItem label={t('Cheezein bikin')} value={formatQty(x.qty)} />
        <LineItem label={t('Customers')} value={String(x.customers)} />
        <LineItem label={t('Walk-in bills')} value={String(x.walkInBills)} />
        <LineItem last label={t('Void bills')} value={`${x.voidedBills} · ${money(x.voidedValue)}`} />
      </Card>
    </Stack>
  );
}

export function ItemsSection({ d }: { d: ItemsReport }) {
  const hasCost = d.totals.profit != null;
  const list = (rows: ItemsReport['topRevenue'], by: 'revenue' | 'profit' | 'qty') => (
    <HBarList rows={rows.slice(0, 7).map((r) => ({ key: r.id, label: r.name, value: by === 'profit' ? r.profit ?? 0 : by === 'qty' ? r.qty : r.revenue, display: by === 'qty' ? `${formatQty(r.qty)} ${r.unit}` : money(by === 'profit' ? r.profit : r.revenue), hint: by === 'revenue' ? `${formatQty(r.qty)} ${r.unit}${r.margin != null ? ` · ${pct(r.margin)}` : ''}` : r.category ?? undefined }))} />
  );
  return (
    <Stack>
      <KpiGrid items={[
        { label: t('Products bike'), value: <Text size="lg" weight="bold">{d.totals.products}</Text>, tone: 'info' },
        { label: t('Sale'), value: Big(d.totals.revenue), tone: 'brand' },
        ...(hasCost ? [{ label: t('Profit'), value: Big(d.totals.profit), tone: 'success' as const }] : []),
        { label: t('Atka hua maal'), value: <Text size="lg" weight="bold">{d.totals.slowCount}</Text>, tone: 'warning', hint: d.totals.stockValue != null ? `${t('Stock value')} ${money(d.totals.stockValue)}` : undefined },
      ]} />
      {d.topRevenue.length > 0 && <ChartCard title={t('Sab se zyada sale')}>{list(d.topRevenue, 'revenue')}</ChartCard>}
      {hasCost && d.topProfit.length > 0 && <ChartCard title={t('Sab se zyada profit')}>{list(d.topProfit, 'profit')}</ChartCard>}
      {d.topQty.length > 0 && <ChartCard title={t('Sab se zyada quantity')}>{list(d.topQty, 'qty')}</ChartCard>}
      {d.lowest.length > 0 && <ChartCard title={t('Sab se kam bika')}>{list(d.lowest, 'revenue')}</ChartCard>}
      {d.categories.length > 0 && <ChartCard title={t('Category')}><DonutChart slices={d.categories.slice(0, 8).map((c, i) => ({ key: ids(c.id, i), label: c.name, value: c.revenue, color: c.color ?? undefined }))} /></ChartCard>}
      {d.brands.length > 0 && <ChartCard title={t('Brand')}><HBarList colorful rows={d.brands.slice(0, 8).map((c, i) => ({ key: ids(c.id, i), label: c.name, value: c.revenue, display: money(c.revenue) }))} /></ChartCard>}
      {d.slow.length > 0 && (
        <Card flush title={t('Atka hua maal')} description={t('Is period me nahi bika')}>
          {d.slow.slice(0, 15).map((s, i, a) => <ListRow key={s.id} dense divider={i < a.length - 1} title={s.name} subtitle={s.lastSold ? `${t('Aakhri sale')} ${formatDate(s.lastSold)}` : t('Kabhi nahi bika')} trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="semibold" ltr>{`${formatQty(s.stock)} ${s.unit}`}</Text>{s.stockValue != null && <Amount value={s.stockValue} size="2xs" tone="muted" />}</View>} onPress={() => router.push(`/products/${s.id}` as never)} />)}
        </Card>
      )}
    </Stack>
  );
}

export function CustomersSection({ d }: { d: CustomersReport }) {
  const x = d.totals;
  return (
    <Stack>
      <KpiGrid items={[
        { label: t('Customers'), value: <Text size="lg" weight="bold">{x.customers}</Text>, tone: 'info', hint: `${t('Naye')} ${x.newCount} · ${t('Purane')} ${x.returning}` },
        { label: t('Wapas aaye'), value: <Text size="lg" weight="bold">{x.repeat}</Text>, tone: 'success' },
        { label: t('Udhaar diya'), value: Big(x.creditGiven), tone: 'warning', hint: <Delta value={changePct(x.creditGiven, d.previous?.creditGiven)} upIsGood={false} /> },
        { label: t('Wasool'), value: Big(x.recovered), tone: 'success', hint: t('{{count}} payments', { count: x.payments }) },
        { label: t('Abhi baqi'), value: Big(x.outstanding), tone: 'danger', hint: t('{{count}} customers', { count: x.debtors }) },
        { label: t('Walk-in sale'), value: Big(x.walkInValue), hint: t('{{count}} bills', { count: x.walkInBills }) },
      ]} />
      {d.aging.length > 0 && <ChartCard title={t('Udhaar kitna purana')}><HBarList rows={d.aging.map((a) => ({ key: a.key, label: a.label, value: a.amount, color: '#d97706', display: money(a.amount), hint: t('{{count}} customers', { count: a.count }) }))} /></ChartCard>}
      {d.top.length > 0 && (
        <Card flush title={t('Behtareen customers')}>
          {d.top.slice(0, 10).map((c, i, a) => <ListRow key={c.id} dense divider={i < a.length - 1} title={c.name} subtitle={`${t('{{count}} bills', { count: c.bills })}${c.phone ? ` · ${c.phone}` : ''}`} trailing={<Amount value={c.net} weight="bold" />} onPress={() => router.push(`/customers/${c.id}` as never)} />)}
        </Card>
      )}
      {d.debtors.length > 0 && (
        <Card flush title={t('Sab se zyada udhaar')}>
          {d.debtors.slice(0, 10).map((c, i, a) => <ListRow key={c.id} dense divider={i < a.length - 1} title={c.name} subtitle={c.days != null ? t('{{count}} din se', { count: c.days }) : c.phone ?? undefined} trailing={<Amount value={c.balance} weight="bold" tone="danger" />} onPress={() => router.push(`/customers/${c.id}` as never)} />)}
        </Card>
      )}
    </Stack>
  );
}

export function PurchasesSection({ d }: { d: PurchasesReport }) {
  const x = d.totals;
  return (
    <Stack>
      <KpiGrid items={[
        { label: t('Purchase'), value: Big(x.value), tone: 'brand', hint: <Delta value={changePct(x.value, d.previous?.value)} upIsGood={false} /> },
        { label: t('Bills'), value: <Text size="lg" weight="bold">{x.bills}</Text> },
        { label: t('Ada kiya'), value: Big(x.paid), tone: 'success' },
        { label: t('Baqi'), value: Big(x.credit), tone: 'warning' },
        { label: t('Suppliers ko dena'), value: Big(x.dueTotal), tone: 'danger', hint: t('{{count}} suppliers', { count: x.dueSuppliers }) },
        { label: t('Wapas kiya'), value: Big(x.returned), hint: t('{{count}} returns', { count: x.returns }) },
      ]} />
      {d.trend.length > 1 && <ChartCard title={t('Purchase ka rujhan')}><BarChart labels={d.trend.map((p) => axisLabel(p.key))} series={[{ key: 'v', label: t('Purchase'), values: d.trend.map((p) => p.value) }, { key: 'p', label: t('Ada'), values: d.trend.map((p) => p.paid), color: '#16a34a' }]} format={formatMoney} /></ChartCard>}
      {d.suppliers.length > 0 && <ChartCard title={t('Suppliers')}><HBarList colorful rows={d.suppliers.slice(0, 8).map((s) => ({ key: s.id, label: s.name, value: s.value, display: money(s.value), hint: `${t('{{count}} bills', { count: s.bills })} · ${s.share.toFixed(0)}%`, onPress: () => router.push(`/suppliers/${s.id}` as never) }))} /></ChartCard>}
      {d.items.length > 0 && <ChartCard title={t('Kya khareeda')}><HBarList rows={d.items.slice(0, 8).map((s, i) => ({ key: `${s.name}${i}`, label: s.name, value: s.value, display: money(s.value), hint: `${formatQty(s.qty)}` }))} /></ChartCard>}
      {d.dues.length > 0 && <Card flush title={t('Baqi payments')}>{d.dues.slice(0, 10).map((s, i, a) => <ListRow key={s.id} dense divider={i < a.length - 1} title={s.name} subtitle={s.phone ?? undefined} trailing={<Amount value={s.due} weight="bold" tone="danger" />} onPress={() => router.push(`/suppliers/${s.id}` as never)} />)}</Card>}
    </Stack>
  );
}

export function ExpensesSection({ d }: { d: ExpensesReport }) {
  const x = d.totals;
  return (
    <Stack>
      <KpiGrid items={[
        { label: t('Kul expense'), value: Big(x.amount), tone: 'danger', hint: <Delta value={changePct(x.amount, d.previous?.amount)} upIsGood={false} /> },
        { label: t('Roz ka ausat'), value: Big(x.perDay) },
        { label: t('Sale ka hissa'), value: <Text size="lg" weight="bold" ltr>{pct(x.ofSales)}</Text>, tone: 'warning' },
        { label: t('Baqi bill'), value: Big(x.pending), tone: 'warning' },
      ]} />
      {d.trend.length > 1 && <ChartCard title={t('Expense ka rujhan')}><BarChart labels={d.trend.map((p) => axisLabel(p.key))} series={[{ key: 'a', values: d.trend.map((p) => p.amount) }]} format={formatMoney} /></ChartCard>}
      {d.categories.length > 0 && <ChartCard title={t('Category ke hisaab se')}><DonutChart slices={d.categories.map((c, i) => ({ key: ids(c.id, i), label: c.name, value: c.amount, color: c.color ?? undefined }))} center={<Amount value={x.amount} compact weight="bold" size="md" />} /></ChartCard>}
      {d.methods.length > 0 && <ChartCard title={t('Kaise diye')}><DonutChart slices={d.methods.map((m) => ({ key: m.method, label: method(m.method), value: m.amount }))} /></ChartCard>}
      {d.biggest.length > 0 && <Card flush title={t('Sab se bare')}>{d.biggest.map((e, i, a) => <ListRow key={e.id} dense divider={i < a.length - 1} title={e.title} subtitle={`${e.category ?? t('Bina category')} · ${formatDate(e.date)}`} trailing={<Amount value={e.amount} weight="bold" />} />)}</Card>}
    </Stack>
  );
}

export function ProfitSection({ d }: { d: ProfitReport }) {
  const x = d.totals;
  const hasCost = x.netProfit != null;
  return (
    <Stack>
      <KpiGrid items={[
        { label: t('Net sale'), value: Big(x.sales - x.refunds), tone: 'brand' },
        ...(hasCost ? [
          { label: t('Gross profit'), value: Big(x.grossProfit), tone: 'success' as const, hint: `${t('Margin')} ${pct(x.margin)}` },
          { label: t('Net profit'), value: <Amount value={x.netProfit} size="lg" weight="bold" colorize />, tone: 'info' as const, hint: `${t('Net margin')} ${pct(x.netMargin)}` },
        ] : []),
        { label: t('Kul kharchay'), value: Big(x.expenses), tone: 'danger' },
      ]} />
      {hasCost && (
        <Card title={t('Net profit kaise bana')}>
          <LineItem label={t('Gross profit')} value={money(x.grossProfit)} />
          {x.split && <LineItem indent label={t('Udhaar mein profit — abhi aana hai')} value={money(x.split.pending)} />}
          <LineItem label={t('Doosri aamdani')} value={money(x.otherIncome)} />
          <LineItem label={t('Kul kharchay')} value={money(-x.expenses)} />
          <LineItem label={t('Stock nuksan')} value={money(-(x.stockLoss ?? 0))} />
          <LineItem label={t('Stock faida')} value={money(x.stockGain ?? 0)} />
          <LineItem bold last label={t('Net profit')} value={<Amount value={x.netProfit} weight="bold" colorize />} />
        </Card>
      )}
      {d.rows.length > 1 && (
        <ChartCard title={hasCost ? t('Net profit') : t('Sale')}>
          <BarChart signed labels={d.rows.map((r) => axisLabel(r.key))} series={[{ key: 'p', values: d.rows.map((r) => (hasCost ? r.netProfit ?? 0 : r.sales)) }]} format={formatMoney} />
        </ChartCard>
      )}
      <Card flush title={t('Tafseel')}>
        <DataTable rows={[...d.rows].reverse()} keyOf={(r) => r.key}
          columns={[{ key: 'k', label: t('Din'), width: 84, render: (r) => <Text size="sm" weight="medium">{keyLabel(r.key)}</Text> }, { key: 's', label: t('Sale'), value: (r) => formatMoney(r.sales, { compact: true }) },
            ...(hasCost ? [{ key: 'g', label: t('Gross profit'), value: (r: ProfitReport['rows'][number]) => formatMoney(r.grossProfit, { compact: true }) }] : []),
            { key: 'e', label: t('Kharchay'), value: (r) => formatMoney(r.expenses, { compact: true }) },
            ...(hasCost ? [{ key: 'n', label: t('Net profit'), render: (r: ProfitReport['rows'][number]) => <Amount value={r.netProfit} compact weight="bold" size="sm" colorize /> }] : [])]} />
      </Card>
    </Stack>
  );
}

export function ReturnsSection({ d }: { d: ReturnsReport }) {
  const x = d.totals;
  return (
    <Stack>
      <KpiGrid items={[
        { label: t('Return'), value: Big(x.amount), tone: 'danger', hint: <Delta value={changePct(x.amount, d.previous?.amount)} upIsGood={false} /> },
        { label: t('Kitni dafa'), value: <Text size="lg" weight="bold">{x.count}</Text> },
        { label: t('Return ki rate'), value: <Text size="lg" weight="bold" ltr>{pct(x.rate)}</Text>, tone: 'warning', hint: t('sale ka') },
        { label: t('Void bills'), value: <Text size="lg" weight="bold">{x.voidedBills}</Text>, hint: money(x.voidedValue) },
      ]} />
      {d.trend.length > 1 && <ChartCard title={t('Return ka rujhan')}><BarChart labels={d.trend.map((p) => axisLabel(p.key))} series={[{ key: 'a', values: d.trend.map((p) => p.amount), color: '#e11d48' }]} format={formatMoney} /></ChartCard>}
      {d.reasons.length > 0 && <ChartCard title={t('Wajah')}><HBarList colorful rows={d.reasons.map((r, i) => ({ key: `${r.reason}${i}`, label: r.reason ?? t('Wajah nahi likhi'), value: r.amount, display: money(r.amount), hint: t('{{count}} dafa', { count: r.count }) }))} /></ChartCard>}
      {d.methods.length > 0 && <ChartCard title={t('Paisa kaise wapas kiya')}><DonutChart slices={d.methods.map((m) => ({ key: m.method, label: method(m.method), value: m.amount }))} /></ChartCard>}
      {d.products.length > 0 && <ChartCard title={t('Kaunsa maal zyada wapas aaya')}><HBarList rows={d.products.slice(0, 8).map((p) => ({ key: p.id, label: p.name, value: p.amount, color: '#e11d48', display: money(p.amount), hint: `${formatQty(p.qty)} ${p.unit}` }))} /></ChartCard>}
      {d.staff.length > 1 && <ChartCard title={t('Staff')}><HBarList colorful rows={d.staff.map((s, i) => ({ key: ids(s.id, i), label: s.name, value: s.amount, display: money(s.amount), hint: t('{{count}} dafa', { count: s.count }) }))} /></ChartCard>}
      {d.voided.length > 0 && <Card flush title={t('Void bills')}>{d.voided.map((v, i, a) => <ListRow key={v.id} dense divider={i < a.length - 1} title={v.saleNumber} subtitle={`${v.customer ?? t('Walk-in customer')} · ${v.staff ?? ''}`} trailing={<Amount value={v.total} weight="semibold" />} onPress={() => router.push(`/sales/${v.id}` as never)} />)}</Card>}
    </Stack>
  );
}

export function TaxSection({ d }: { d: TaxReport }) {
  const x = d.totals;
  if (d.migrationPending) return <EmptyState title={t('Tax report abhi tayyar nahi')} />;
  return (
    <Stack>
      <KpiGrid items={[
        { label: t('Tax'), value: Big(x.tax), tone: 'brand' },
        { label: t('Taxable sale'), value: Big(x.taxedValue) },
        { label: t('Bills'), value: <Text size="lg" weight="bold">{x.bills}</Text>, hint: `${t('Coverage')} ${pct(x.coverage, 0)}` },
        { label: t('Fail / baqi'), value: <Text size="lg" weight="bold">{`${x.failed} / ${x.pending}`}</Text>, tone: x.failed ? 'danger' : 'neutral' },
      ]} />
      {d.rates.length > 0 && <Card flush title={t('Rate ke hisaab se')}>{d.rates.map((r, i, a) => <ListRow key={r.rate} dense divider={i < a.length - 1} title={`${r.rate}%`} subtitle={t('{{count}} bills', { count: r.bills })} trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={r.tax} weight="bold" /><Amount value={r.value} size="2xs" tone="muted" /></View>} />)}</Card>}
      {d.authorities.length > 0 && <Card flush title={t('Authority')}>{d.authorities.map((r, i, a) => <ListRow key={r.authority} dense divider={i < a.length - 1} title={r.authority} subtitle={`${t('{{count}} bills', { count: r.bills })}${r.failed ? ` · ${r.failed} ${t('fail')}` : ''}${r.pending ? ` · ${r.pending} ${t('baqi')}` : ''}`} trailing={<Amount value={r.tax} weight="bold" />} />)}</Card>}
    </Stack>
  );
}

export function IndustrySection({ d }: { d: IndustryReport }) {
  const th = useTheme();
  return (
    <Stack>
      {d.kpis.length > 0 && <KpiGrid items={d.kpis.map((k) => ({ label: k.label, value: <Text size="lg" weight="bold" ltr numberOfLines={1}>{fmtValue(k.value, k.fmt)}</Text>, hint: k.hint }))} />}
      {d.charts.map((c) => (
        <ChartCard key={c.title} title={c.title}>
          {c.kind === 'pie'
            ? <DonutChart slices={c.data.map((p, i) => ({ key: `${p.name}${i}`, label: p.name, value: p.value }))} format={(v) => fmtValue(v, c.fmt)} />
            : <HBarList colorful rows={c.data.map((p, i) => ({ key: `${p.name}${i}`, label: p.name, value: p.value, display: fmtValue(p.value, c.fmt) }))} />}
        </ChartCard>
      ))}
      {d.tables.map((tb) => (
        <Card key={tb.title} flush title={tb.title} description={tb.hint}>
          <DataTable rows={tb.rows} keyOf={(_, i) => String(i)} columns={tb.columns.map((c, ci) => ({ key: String(ci), label: c.label, value: (r: Array<string | number | null>) => fmtValue(r[ci], c.fmt) }))} />
        </Card>
      ))}
      {d.notes.map((n, i) => <Text key={i} size="xs" tone="muted" style={{ paddingHorizontal: th.space(1) }}>{n}</Text>)}
      {!d.kpis.length && !d.charts.length && !d.tables.length && <EmptyState title={t('Is period me kuch nahi')} />}
    </Stack>
  );
}
