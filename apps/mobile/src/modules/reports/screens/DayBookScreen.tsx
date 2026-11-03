/**
 * Day report (day book): the end-of-day report for any business day, per
 * branch or for all branches. Sales, payment methods, each cash drawer
 * reconciled, cash in and out, expenses, purchases, supplier payments,
 * khata, bookings, items, staff, voids, returns and discounts, compared with
 * yesterday and the same weekday last week. Share as PDF or WhatsApp text.
 * Offline, the last saved day shows, and today's sales come from the phone.
 */

import { Ban, BarChart3, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, MessageCircle, Package, UserRound, Vault, Wallet, WifiOff } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';
import { useShops } from '@/core/auth/useShops';
import { businessDayKey, formatDate, formatDateTime, formatMoney, formatQty, formatTime } from '@/core/format';
import { t } from '@/core/i18n';
import { useSalesHistory } from '@/core/offline';
import { useOnlineStatus, useSyncStatus } from '@/core/net';
import {
  Amount, Badge, BarChart, Button, Card, ChipGroup, DatePicker, DonutChart, EmptyState, ErrorState, HBarList, HeroAmount, HeroText, IconButton, ListRow, PageHero, Screen, SearchBar, Sheet, SkeletonRows, Tabs, Text, toast, useTheme,
} from '@/design';
import { dayBookApi, type DayBook } from '../api/daybook';
import { CachedNote, ChartCard, Delta, KpiGrid, LineItem } from '../components/ui';
import { ExportButton } from '../components/ExportButton';
import type { ReportDoc } from '../lib/doc';
import { dateOfKey, localKey, useDayStart, ymd } from '../lib/period';
import { useReport } from '../lib/useReport';

type Tab = 'overview' | 'cash' | 'money' | 'items' | 'staff' | 'checks';

const shiftKey = (key: string, days: number) => { const [y, m, d] = key.split('-').map(Number); return ymd(y, m - 1, d + days); };
const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa', BANK_TRANSFER: 'Bank', CREDIT: 'Udhaar', SPLIT: 'Split', WALLET: 'Wallet' };
const methodName = (m: string) => t(METHOD_LABEL[m] ?? m);

export function DayBookScreen() {
  const th = useTheme();
  const startHour = useDayStart();
  const today = businessDayKey(Date.now(), startHour);
  const online = useOnlineStatus();
  const sync = useSyncStatus();
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const shops = (useShops().data ?? []).filter((s) => s.isActive);
  const [date, setDate] = useState(today);
  const [shopId, setShopId] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [closing, setClosing] = useState(false);
  const [picker, setPicker] = useState(false);

  const q = useReport('day-book', { date, shopId }, () => dayBookApi.get(date >= today ? undefined : date, shopId), { refetchInterval: date >= today ? 60_000 : undefined });
  const d = q.data;
  const isToday = date >= today;
  const key = d?.date ?? date;
  const term = search.trim().toLowerCase();
  const dayTitle = key === today ? t('Aaj') : key === shiftKey(today, -1) ? t('Kal') : formatDate(dateOfKey(key));
  const branch = shopId ? shops.find((s) => s.id === shopId)?.name ?? t('Branch') : allShops ? t('All branches') : '';
  const drawerHidden = !!d && !d.drawer;

  const moneyIn = d ? d.payments.reduce((a, p) => a + p.total, 0) + d.khata.collected : 0;
  const waText = (x: DayBook) => {
    const s = x.summary;
    return [`*${t('Din ka hisaab')}* — ${x.date}${branch ? ` · ${branch}` : ''}`, `${t('Net sale')}: ${formatMoney(s.net)} (${s.bills} ${t('bills')})`,
      ...(s.grossProfit != null ? [`${t('Profit')}: ${formatMoney(s.grossProfit)}`] : []), `${t('Paisa aaya')}: ${formatMoney(moneyIn)}`, `${t('Kul kharchay')}: ${formatMoney(x.expenses.total)}`,
      ...(x.drawer ? [`${t('Galla hona chahiye')}: ${formatMoney(x.drawer.expected)}`] : []), `${t('Udhaar diya')}: ${formatMoney(x.khata.given)} · ${t('wasool')} ${formatMoney(x.khata.collected)}`].join('\n');
  };

  const doc = (): ReportDoc | null => {
    if (!d) return null;
    const s = d.summary;
    return {
      title: t('Din ka hisaab'), subtitle: `${d.date}${branch ? ` · ${branch}` : ''}`, fileName: `day-report-${d.date}`,
      summary: [[t('Net sale'), formatMoney(s.net)], [t('Bills'), String(s.bills)], ...(s.grossProfit != null ? [[t('Profit'), formatMoney(s.grossProfit)] as [string, string]] : []), [t('Paisa aaya'), formatMoney(moneyIn)], [t('Discount'), formatMoney(s.discount)], [t('Return'), formatMoney(s.returns)], [t('Kul kharchay'), formatMoney(d.expenses.total)],
        ...(d.drawer ? [[t('Galla hona chahiye'), formatMoney(d.drawer.expected)] as [string, string]] : [])],
      tables: [
        { heading: t('Payment methods'), columns: [t('Tareeqa'), t('Bills'), t('Amount')], rows: d.payments.map((p) => [methodName(p.method), p.bills, formatMoney(p.total)]) },
        ...(d.expenses.list.length ? [{ heading: t('Expenses'), columns: [t('Number'), t('Kis cheez ka'), t('Amount')], rows: d.expenses.list.map((e) => [e.number, e.title, formatMoney(e.amount)]) }] : []),
        { heading: t('Maal'), columns: [t('Product'), t('Quantity'), t('Sale')], rows: d.items.map((i) => [i.name, formatQty(i.qty), formatMoney(i.revenue)]) },
        { heading: t('Staff'), columns: [t('Naam'), t('Bills'), t('Sale')], rows: d.staff.map((x) => [x.name, x.bills, formatMoney(x.total)]) },
      ],
    };
  };

  const hero = (
    <PageHero chip={`${dayTitle}${isToday ? ` · ${t('Live')}` : ''}`} meta={d ? `${formatDate(dateOfKey(d.date))}${branch ? ` · ${branch}` : ''}` : undefined} loading={!d && q.isLoading}
      stats={d ? [
        { label: t('Net sale'), value: <HeroAmount value={d.summary.net} size="3xl" weight="heavy" />, hint: <Delta value={d.compare.yesterday.net > 0 ? ((d.summary.net - d.compare.yesterday.net) / d.compare.yesterday.net) * 100 : null} /> },
        { label: t('Bills'), value: String(d.summary.bills) },
        { label: t('Paisa aaya'), value: <HeroAmount value={moneyIn} size="lg" /> },
        ...(d.summary.grossProfit != null ? [{ label: t('Profit'), value: <HeroAmount value={d.summary.grossProfit} size="lg" /> }] : []),
        ...(d.drawer ? [{ label: d.drawer.counted != null ? t('Galla farq') : t('Galla hona chahiye'), value: <HeroAmount value={d.drawer.counted != null ? d.drawer.difference : d.drawer.expected} size="lg" /> }] : []),
      ] : [{ label: t('Net sale'), value: <HeroText>—</HeroText> }]} />
  );

  const nav = (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
        <IconButton icon={ChevronLeft} flip label={t('Pichhla din')} variant="secondary" onPress={() => setDate(shiftKey(key, -1))} />
        <View style={{ flex: 1 }}><DatePicker value={dateOfKey(key)} onChange={(x) => { const k = localKey(x); setDate(k > today ? today : k); }} maximumDate={new Date()} /></View>
        <IconButton icon={ChevronRight} flip label={t('Agla din')} variant="secondary" disabled={key >= today} onPress={() => setDate(shiftKey(key, 1))} />
      </View>
      <ChipGroup value={key === today ? 'today' : key === shiftKey(today, -1) ? 'yest' : key === shiftKey(today, -7) ? 'week' : 'x'} onChange={(v) => setDate(v === 'today' ? today : v === 'yest' ? shiftKey(today, -1) : shiftKey(today, -7))}
        options={[{ value: 'today', label: t('Aaj') }, { value: 'yest', label: t('Kal') }, { value: 'week', label: t('Pichhle hafte ka yehi din') }]} />
      {allShops && shops.length > 1 && <ChipGroup value={shopId} onChange={setShopId} options={[{ value: '', label: t('All branches') }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} />}
    </View>
  );

  const overview = d && (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[
        { label: t('Discount'), value: <Amount value={d.summary.discount} size="lg" weight="bold" />, hint: t('{{count}} bills', { count: d.discounts.bills }), tone: 'warning' },
        { label: t('Return'), value: <Amount value={d.summary.returns} size="lg" weight="bold" />, hint: t('{{count}} dafa · {{void}} void', { count: d.summary.returnCount, void: d.summary.voidedBills }), tone: 'danger' },
        { label: t('Udhaar diya'), value: <Amount value={d.khata.given} size="lg" weight="bold" />, hint: `${t('wasool')} ${formatMoney(d.khata.collected)}`, tone: 'warning' },
        { label: t('Expense'), value: <Amount value={d.expenses.total} size="lg" weight="bold" />, hint: `${d.expenses.count} · ${t('Purchase')} ${formatMoney(d.purchases.total)}`, tone: 'danger' },
        { label: t('Ausat bill'), value: <Amount value={d.summary.avgBill} size="lg" weight="bold" />, hint: t('{{count}} cheezein', { count: Number(d.summary.itemsSold.toFixed(1)) }) },
        { label: t('Customers'), value: <Text size="lg" weight="bold">{d.summary.customers}</Text>, hint: `${d.summary.walkIns} walk-in`, tone: 'info' },
      ]} />
      <ChartCard title={t('Ghante ke hisaab se')} subtitle={t('Aaj aur kal')}>
        <BarChart labels={d.hourly.map((h) => String(h.hour))} maxLabels={8} series={[{ key: 'now', label: t('Aaj'), values: d.hourly.map((h) => h.sales) }, { key: 'y', label: t('Kal'), values: d.hourly.map((h) => h.yesterday), color: '#94a3b8' }]} format={formatMoney} />
      </ChartCard>
      {d.payments.length > 0 && (
        <ChartCard title={t('Paisa kaise aaya')}>
          <DonutChart slices={d.payments.map((p) => ({ key: p.method, label: methodName(p.method), value: p.total }))} center={<Amount value={d.payments.reduce((a, p) => a + p.total, 0)} compact weight="bold" size="md" />} format={(v) => formatMoney(v, { compact: true })} />
        </ChartCard>
      )}
      <Card title={t('Kal aur pichhle hafte se')}>
        {[[t('Kal'), d.compare.yesterday], [t('Pichhle hafte'), d.compare.lastWeek]].map(([label, c], i) => {
          const cc = c as DayBook['compare']['yesterday'];
          return <LineItem key={i} last={i === 1} label={`${label as string} (${cc.date})`} value={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={cc.net} weight="medium" /><Delta value={cc.net > 0 ? ((d.summary.net - cc.net) / cc.net) * 100 : null} /></View>} />;
        })}
      </Card>
      {d.sources.length > 1 && <ChartCard title={t('Kahan se bill aaye')}><HBarList colorful rows={d.sources.map((s) => ({ key: s.source, label: s.source, value: s.total, display: formatMoney(s.total), hint: t('{{count}} bills', { count: s.bills }) }))} /></ChartCard>}
      {d.charges.length > 0 && <Card title={t('Service / delivery charges')}>{d.charges.map((c, i) => <LineItem key={c.label} last={i === d.charges.length - 1} label={c.label} value={<Amount value={c.amount} />} />)}</Card>}
      {d.lowStock.length > 0 && <Card flush title={t('Kam stock')}>{d.lowStock.slice(0, 8).map((x, i) => <ListRow key={x.productId} dense divider={i < Math.min(8, d.lowStock.length) - 1} title={x.name} subtitle={x.shop} trailing={<Badge tone={x.stock <= 0 ? 'danger' : 'warning'}>{`${formatQty(x.stock)} ${x.unit}`}</Badge>} />)}</Card>}
      {d.branches.length > 1 && !shopId && <Card flush title={t('Branch ke hisaab se')}>{d.branches.map((b, i) => <ListRow key={b.shopId} dense divider={i < d.branches.length - 1} title={b.name} subtitle={`${b.bills} ${t('bills')} · ${t('Cash')} ${formatMoney(b.cash)}`} trailing={<Amount value={b.net} weight="bold" />} onPress={() => setShopId(b.shopId)} />)}</Card>}
    </View>
  );

  const cash = d?.drawer && (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[
        { label: t('Galla hona chahiye'), value: <Amount value={d.drawer.expected} size="lg" weight="bold" />, tone: 'success' },
        { label: d.drawer.counted != null ? t('Ginti') : t('Opening'), value: <Amount value={d.drawer.counted ?? d.drawer.opening} size="lg" weight="bold" /> },
      ]} />
      {d.drawer.registers.length === 0 && <EmptyState icon={Vault} title={t('Is din koi shift nahi khuli')} />}
      {d.drawer.registers.map((r) => (
        <Card key={r.id} title={`${r.number}${r.shop ? ` · ${r.shop}` : ''}`} description={`${formatTime(r.openedAt)} – ${r.closedAt ? formatTime(r.closedAt) : t('Khuli hai')} · ${r.openedBy}`} action={<Badge tone={r.status === 'OPEN' ? 'warning' : 'success'}>{r.status === 'OPEN' ? t('Khuli') : t('Band')}</Badge>}>
          <LineItem label={t('Opening')} value={<Amount value={r.opening} />} />
          <LineItem label={t('Cash sale')} value={<Amount value={r.flow.cashSales} />} />
          <LineItem label={t('Khata wasool')} value={<Amount value={r.flow.khataReceived} />} />
          {r.flow.bookingReceived !== 0 && <LineItem label={t('Booking')} value={<Amount value={r.flow.bookingReceived} />} />}
          <LineItem label={t('Cash in')} value={<Amount value={r.flow.cashIn} />} />
          <LineItem label={t('Cash out')} value={<Amount value={-r.flow.cashOut} />} />
          <LineItem label={t('Return')} value={<Amount value={-r.flow.returns} />} />
          <LineItem label={t('Expense')} value={<Amount value={-r.flow.expenses} />} />
          <LineItem label={t('Purchase aur supplier')} value={<Amount value={-(r.flow.purchases + r.flow.supplierPaid)} />} />
          <LineItem bold label={t('Hona chahiye')} value={<Amount value={r.expected} weight="bold" />} last={r.counted == null} />
          {r.counted != null && <><LineItem label={t('Ginti')} value={<Amount value={r.counted} />} /><LineItem bold last label={t('Farq')} value={<Amount value={r.difference} weight="bold" colorize />} /></>}
        </Card>
      ))}
      {d.cashMoves.length > 0 && <Card flush title={t('Cash in / out')}>{d.cashMoves.map((m, i) => <ListRow key={m.id} dense divider={i < d.cashMoves.length - 1} title={m.reason ?? (m.type === 'CASH_IN' ? t('Cash in') : t('Cash out'))} subtitle={`${formatTime(m.at)} · ${m.by ?? ''}`} trailing={<Amount value={m.type === 'CASH_IN' ? m.amount : -m.amount} weight="bold" colorize />} />)}</Card>}
    </View>
  );

  const money = d && (
    <View style={{ gap: th.space(4) }}>
      <Card title={t('Payment methods')}>
        {d.payments.map((p, i) => <LineItem key={p.method} last={i === d.payments.length - 1} label={`${methodName(p.method)} · ${p.bills}`} value={<Amount value={p.total} weight="semibold" />} />)}
      </Card>
      <Card title={t('Expenses')} description={`${formatMoney(d.expenses.total)} · ${d.expenses.count}`} flush>
        {d.expenses.list.length === 0 ? <View style={{ padding: th.space(4) }}><Text tone="muted">{t('Is din koi expense nahi')}</Text></View> : d.expenses.list.map((e, i) => <ListRow key={e.id} dense divider={i < d.expenses.list.length - 1} title={e.title} subtitle={`${e.category ?? t('Bina category')} · ${methodName(e.method)}`} trailing={<Amount value={e.amount} weight="semibold" />} />)}
      </Card>
      {d.purchases.count > 0 && <Card title={t('Purchase')} description={`${formatMoney(d.purchases.total)} · ${t('Ada')} ${formatMoney(d.purchases.paid)}`} flush>{d.purchases.list.map((p, i) => <ListRow key={p.id} dense divider={i < d.purchases.list.length - 1} title={p.supplier} subtitle={p.number} trailing={<Amount value={p.total} weight="semibold" />} />)}</Card>}
      {d.supplierPayments.list.length > 0 && <Card title={t('Supplier ko ada')} description={formatMoney(d.supplierPayments.total)} flush>{d.supplierPayments.list.map((p, i) => <ListRow key={p.id} dense divider={i < d.supplierPayments.list.length - 1} title={p.supplier} subtitle={methodName(p.method)} trailing={<Amount value={p.amount} weight="semibold" />} />)}</Card>}
      {d.khata.list.length > 0 && <Card title={t('Khata')} description={`${t('Diya')} ${formatMoney(d.khata.given)} · ${t('Wasool')} ${formatMoney(d.khata.collected)}`} flush>{d.khata.list.map((k, i) => <ListRow key={k.id} dense divider={i < d.khata.list.length - 1} title={k.customer} subtitle={k.kind === 'given' ? t('Udhaar diya') : t('Wasool')} trailing={<Amount value={k.kind === 'given' ? -k.amount : k.amount} weight="semibold" colorize />} />)}</Card>}
      {d.bookings.list.length > 0 && <Card title={t('Booking payments')} description={`${t('Advance')} ${formatMoney(d.bookings.advances)} · ${t('Wapas')} ${formatMoney(d.bookings.refunds)}`} flush>{d.bookings.list.map((b, i) => <ListRow key={b.id} dense divider={i < d.bookings.list.length - 1} title={b.customer ?? b.number} subtitle={`${b.number} · ${b.type}`} trailing={<Amount value={b.type === 'REFUND' ? -b.amount : b.amount} weight="semibold" colorize />} />)}</Card>}
    </View>
  );

  const items = d && (
    <View style={{ gap: th.space(3) }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('Item, bill, customer, expense ya staff search…')} />
      {d.categories.length > 0 && !term && <ChartCard title={t('Category')}><HBarList colorful rows={d.categories.slice(0, 6).map((c) => ({ key: c.id ?? c.name, label: c.name, value: c.revenue, display: formatMoney(c.revenue), hint: `${formatQty(c.qty)} · ${c.items} ${t('items')}` }))} /></ChartCard>}
      <Card flush title={t('Maal ({{count}})', { count: d.items.length })}>
        {d.items.filter((i) => !term || `${i.name} ${i.category} ${i.sku ?? ''}`.toLowerCase().includes(term)).map((i, k, a) => (
          <ListRow key={`${i.productId}${k}`} dense divider={k < a.length - 1} icon={Package} title={i.name} subtitle={`${formatQty(i.qty)} ${i.unit} · ${i.category}${i.returnedQty ? ` · ${t('Return')} ${formatQty(i.returnedQty)}` : ''}`}
            trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={i.revenue} weight="semibold" />{i.profit != null && <Amount value={i.profit} size="2xs" colorize />}</View>} />
        ))}
      </Card>
    </View>
  );

  const staff = d && (
    <Card flush title={t('Staff')}>
      {d.staff.map((x, i) => (
        <ListRow key={x.userId} dense divider={i < d.staff.length - 1} icon={UserRound} title={x.name} subtitle={`${x.bills} ${t('bills')} · ${t('Ausat')} ${formatMoney(x.avgBill)}${x.voids ? ` · ${x.voids} void` : ''}${x.discount ? ` · ${t('Discount')} ${formatMoney(x.discount)}` : ''}`}
          trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={x.total} weight="bold" />{x.profit != null && <Amount value={x.profit} size="2xs" colorize />}</View>} />
      ))}
    </Card>
  );

  const checks = d && (
    <View style={{ gap: th.space(4) }}>
      <Card flush title={t('Void bills ({{count}})', { count: d.voids.length })}>{d.voids.length === 0 ? <View style={{ padding: th.space(4) }}><Text tone="muted">{t('Koi nahi')}</Text></View> : d.voids.map((v, i) => <ListRow key={v.id} dense divider={i < d.voids.length - 1} title={v.saleNumber} subtitle={`${v.customer ?? t('Walk-in customer')} · ${v.by ?? ''}${v.reason ? ` · ${v.reason}` : ''}`} trailing={<Amount value={v.total} weight="semibold" />} />)}</Card>
      <Card flush title={t('Returns ({{count}})', { count: d.returns.length })}>{d.returns.length === 0 ? <View style={{ padding: th.space(4) }}><Text tone="muted">{t('Koi nahi')}</Text></View> : d.returns.map((r, i) => <ListRow key={r.id} dense divider={i < d.returns.length - 1} title={`${r.number} · ${r.saleNumber}`} subtitle={`${r.customer ?? ''}${r.reason ? ` · ${r.reason}` : ''}`} trailing={<Amount value={r.amount} weight="semibold" />} />)}</Card>
      <Card flush title={t('Discount ({{count}})', { count: d.discounts.bills })} description={formatMoney(d.discounts.total)}>{d.discounts.list.slice(0, 20).map((x, i, a) => <ListRow key={x.id} dense divider={i < a.length - 1} title={x.saleNumber} subtitle={`${x.customer ?? ''}${x.code ? ` · ${x.code}` : ''} · ${x.by ?? ''}`} trailing={<Amount value={x.discount} weight="semibold" />} />)}</Card>
    </View>
  );

  const body = q.isLoading && !d ? <SkeletonRows count={6} /> : q.isError && !d ? (
    <OfflineSnapshot date={key} online={online} error={q.error} onRetry={() => void q.refetch()} />
  ) : !d ? null : tab === 'overview' ? overview : tab === 'cash' ? cash : tab === 'money' ? money : tab === 'items' ? items : tab === 'staff' ? staff : checks;

  return (
    <Screen title={t('Day report')} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}
      actions={<>
        <IconButton icon={MessageCircle} label={t('WhatsApp')} disabled={!d} onPress={() => d && void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(waText(d))}`).catch(() => toast.error(t('WhatsApp nahi khula')))} />
        <ExportButton build={doc} disabled={!d} />
        <IconButton icon={ClipboardCheck} label={t('Din band karein')} disabled={!d} onPress={() => setClosing(true)} />
      </>}>
      {hero}
      {nav}
      <CachedNote query={q} />
      {d && <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'overview', label: t('Khulasa'), icon: BarChart3 },
        ...(drawerHidden ? [] : [{ value: 'cash' as Tab, label: t('Galla'), icon: Vault }]),
        { value: 'money', label: t('Paisa'), icon: Wallet },
        { value: 'items', label: t('Maal'), icon: Package, count: d.items.length },
        { value: 'staff', label: t('Staff'), icon: UserRound, count: d.staff.length },
        { value: 'checks', label: t('Jaanch'), icon: Ban, count: d.voids.length + d.returns.length || undefined },
      ]} />}
      {body}
      <Sheet open={closing} onClose={() => setClosing(false)} title={t('Din band karein')} description={d ? `${formatDate(dateOfKey(d.date))}${branch ? ` · ${branch}` : ''}` : undefined}
        footer={<Button fullWidth icon={ClipboardCheck} onPress={() => setClosing(false)}>{t('Theek hai')}</Button>}>
        {d && (
          <View style={{ gap: th.space(2) }}>
            <Check ok={!d.drawer || d.drawer.allClosed} text={d.drawer?.allClosed === false ? t('{{count}} shift abhi khuli hai — pehle band karein', { count: d.drawer.openNow }) : t('Saari shifts band hain')} />
            <Check ok={sync.pending === 0} text={sync.pending ? t('{{count}} changes abhi bheje nahi gaye', { count: sync.pending }) : t('Sab kuch bheja ja chuka hai')} />
            <Check ok={!d.drawer || d.drawer.difference == null || Math.abs(d.drawer.difference) < 1} text={d.drawer?.difference ? t('Galla me farq: {{amount}}', { amount: formatMoney(d.drawer.difference) }) : t('Galla barabar hai')} />
            <Check ok={d.voids.length === 0} text={d.voids.length ? t('{{count}} void bill dekh lein', { count: d.voids.length }) : t('Koi void bill nahi')} />
            <Check ok={d.lowStock.length === 0} text={d.lowStock.length ? t('{{count}} cheezein kam hain', { count: d.lowStock.length }) : t('Stock theek hai')} />
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return <ListRow dense icon={ok ? ClipboardCheck : Ban} iconTone={ok ? 'success' : 'warning'} title={text} />;
}

/** No saved day and no internet: today's sales from the phone's own copy. */
function OfflineSnapshot({ date, online, error, onRetry }: { date: string; online: boolean; error: unknown; onRetry: () => void }) {
  const th = useTheme();
  const startHour = useDayStart();
  const sales = useSalesHistory({});
  const rows = useMemo(() => (sales.data ?? []).filter((s) => businessDayKey(s.soldAt, startHour) === date && s.status !== 'VOIDED' && s.status !== 'CANCELLED'), [sales.data, date, startHour]);
  if (online || rows.length === 0) return <ErrorState error={error} onRetry={onRetry} />;
  const net = rows.reduce((a, s) => a + s.total, 0);
  const credit = rows.reduce((a, s) => a + s.creditAmount, 0);
  const byMethod = new Map<string, number>();
  for (const s of rows) byMethod.set(s.paymentMethod, (byMethod.get(s.paymentMethod) ?? 0) + s.paidAmount);
  return (
    <View style={{ gap: th.space(3) }}>
      <ListRow icon={WifiOff} iconTone="warning" title={t('Internet nahi — phone ke bills se hisaab')} subtitle={t('Poora din ka hisaab internet aane par khulega')} />
      <KpiGrid items={[{ label: t('Net sale'), value: <Amount value={net} size="lg" weight="bold" /> }, { label: t('Bills'), value: <Text size="lg" weight="bold">{rows.length}</Text> }, { label: t('Udhaar diya'), value: <Amount value={credit} size="lg" weight="bold" />, tone: 'warning' }, { label: t('Ausat bill'), value: <Amount value={net / rows.length} size="lg" weight="bold" /> }]} />
      <Card title={t('Payment methods')}>{[...byMethod.entries()].map(([m, v], i, a) => <LineItem key={m} last={i === a.length - 1} label={methodName(m)} value={<Amount value={v} weight="semibold" />} />)}</Card>
      <Text size="xs" tone="muted">{formatDateTime(Date.now())}</Text>
    </View>
  );
}
