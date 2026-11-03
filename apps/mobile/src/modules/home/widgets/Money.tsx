/**
 * Money widgets (web widgets/MoneyMap, ProfitLoss, Expenses, Purchases).
 * All of them show cost, so they follow the cost rule and the eye.
 */

import { Banknote, BookOpen, Boxes, ShoppingBag, Truck, Wallet, type LucideIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, DonutChart, HBarList, Icon, ListRow, PressableScale, Segmented, Text, useLayout, useTheme, withAlpha, type StatusTone } from '@/design';
import { useDashboard, useMoneyMap } from '../api/dashboard';
import { EmptyLine, Money, WidgetCard, WidgetSkeleton, useWidgetState } from '../components/parts';
import { MASK, useMasked } from '../lib/privacy';

const money = (v: number) => formatMoney(v, { compact: true });

export function MoneyMapCard() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const q = useMoneyMap();
  const { costHidden } = useMasked();
  const m = q.data;
  const show = (n: number) => (costHidden ? `Rs ${MASK}` : formatMoney(n));
  if (!m) return <WidgetCard title={t('Paisa kahan hai')}>{q.isLoading ? <WidgetSkeleton /> : <EmptyLine text={t('Abhi hisaab nahi mila')} />}</WidgetCard>;
  const tiles: Array<{ key: string; icon: LucideIcon; tone: StatusTone; href: string; label: string; value: string; hint: string }> = [
    { key: 'stock', icon: Boxes, tone: 'info', href: '/stock-report', label: t('Dukaan me maal'), value: show(m.inventory.valueAtCost), hint: t('{{productCount}} cheezein · bikne par {{valueAtRetail}}', { productCount: m.inventory.productCount, valueAtRetail: show(m.inventory.valueAtRetail) }) },
    { key: 'purchases', icon: ShoppingBag, tone: 'brand', href: '/purchases', label: t('Is mahine maal aaya'), value: show(m.purchases.monthTotal), hint: t('{{monthCount}} bill{{value}}', { monthCount: m.purchases.monthCount, value: m.purchases.monthUnpaid > 0 && !costHidden ? t(' · {{monthUnpaid}} baqi', { monthUnpaid: formatMoney(m.purchases.monthUnpaid) }) : '' }) },
    { key: 'expenses', icon: Wallet, tone: 'warning', href: '/expenses', label: t('Is mahine expense'), value: show(m.expenses.month), hint: t('{{monthCount}} entries · pichhla mahina {{value}}', { monthCount: m.expenses.monthCount, value: show(m.expenses.lastMonth ?? 0) }) },
    { key: 'receivable', icon: BookOpen, tone: 'danger', href: '/khata', label: t('Logon se lena'), value: show(m.receivable.total), hint: t('{{customerCount}} logon ka udhaar', { customerCount: m.receivable.customerCount }) },
    { key: 'payable', icon: Truck, tone: 'neutral', href: '/suppliers', label: t('Suppliers ko dena'), value: show(m.payable.total), hint: t('{{supplierCount}} suppliers', { supplierCount: m.payable.supplierCount }) },
    { key: 'cash', icon: Banknote, tone: 'success', href: '/cash-register', label: t('Galle me cash'), value: m.cash.registerOpen ? show(m.cash.expected) : '—', hint: m.cash.registerOpen ? t('Opening {{opening}}', { opening: show(m.cash.opening) }) : t('Register band hai') },
  ];
  return (
    <WidgetCard title={t('Paisa kahan hai')} description={t('Maal, expense, lena aur dena — sab ek nazar me')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {tiles.map((x) => {
          const color = x.tone === 'neutral' ? th.colors.textMuted : th.colors[x.tone].solid;
          return (
            <PressableScale key={x.key} onPress={() => router.push(x.href as never)} accessibilityLabel={x.label}
              style={{ flexBasis: isTablet ? '31%' : '47%', flexGrow: 1, minWidth: 0, padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(color, th.isDark ? 0.24 : 0.14) }}>
                  <Icon icon={x.icon} size={13} color={color} />
                </View>
                <Text size="2xs" weight="medium" tone="muted" numberOfLines={1} style={{ flex: 1 }}>{x.label}</Text>
              </View>
              <Text size="md" weight="bold" ltr tabular numberOfLines={1} adjustsFontSizeToFit>{x.value}</Text>
              <Text size="2xs" tone="muted" numberOfLines={2}>{x.hint}</Text>
            </PressableScale>
          );
        })}
      </View>
      {m.inventory.deadStockValue > 0 && !costHidden && (
        <Card tone="warning" onPress={() => router.push('/reports' as never)} style={{ marginTop: th.space(3) }}>
          <Text size="sm" weight="semibold">{t('{{deadStockValue}} ka maal atka hua hai', { deadStockValue: formatMoney(m.inventory.deadStockValue) })}</Text>
          <Text size="xs" tone="secondary">{t('{{deadStockCount}} cheezein 60 din se nahi bikin — deal bana kar nikalein', { deadStockCount: m.inventory.deadStockCount })}</Text>
        </Card>
      )}
    </WidgetCard>
  );
}

function Step({ label, value, sign, bold, hint }: { label: string; value: number; sign?: '+' | '−' | '='; bold?: boolean; hint?: string }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: th.space(1.5), gap: th.space(2), borderTopWidth: bold ? 1 : 0, borderTopColor: th.colors.divider, marginTop: bold ? th.space(1) : 0 }}>
      <Text size="sm" weight="bold" tone="muted" ltr style={{ width: 14 }}>{sign ?? ''}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" weight={bold ? 'bold' : 'regular'} tone={bold ? 'default' : 'secondary'} numberOfLines={1}>{label}</Text>
        {hint ? <Text size="2xs" tone="muted" numberOfLines={1}>{hint}</Text> : null}
      </View>
      <Money value={value} kind="cost" weight={bold ? 'bold' : 'medium'} colorize={bold} size={bold ? 'md' : 'sm'} />
    </View>
  );
}

export function ProfitLoss() {
  const { data: o } = useDashboard();
  const { data: mm } = useMoneyMap();
  const s = o?.stats;
  const revenue = mm?.profit.monthRevenue ?? s?.salesMonth ?? 0;
  const cogs = mm?.profit.monthCogs ?? s?.cogsMonth ?? 0;
  const expenses = mm?.profit.monthExpenses ?? s?.expensesMonth ?? 0;
  const split = mm?.profit.monthSplit ?? s?.profitSplitMonth;
  const billProfit = split?.billProfit ?? revenue - cogs;
  const gross = mm?.profit.monthGross ?? s?.grossProfitMonth ?? billProfit;
  const net = mm?.profit.monthNet ?? s?.netProfitMonth ?? gross - expenses;
  const stockLoss = s?.stockLossMonth ?? 0;
  const stockGain = s?.stockGainMonth ?? 0;
  const income = mm?.profit.monthOtherIncome ?? s?.otherIncomeMonth ?? 0;
  const pending = split?.basis === 'PAID' ? split.pending : 0;
  const margin = revenue > 0 ? `${((net / revenue) * 100).toFixed(1)}% margin` : undefined;
  return (
    <WidgetCard title={t('Nafa aur nuqsan')} description={t('Is mahine — bechne se haath mein bachne tak')} href="/profit-loss">
      {!s && !mm ? <WidgetSkeleton /> : (
        <View>
          <Step label={t('Sale ({{value}} bill)', { value: s?.ordersMonth ?? 0 })} value={revenue} />
          <Step sign="−" label={t('Maal ki cost')} value={-cogs} />
          <Step sign="=" label={t('Bill ka profit')} value={billProfit} />
          {pending > 0.5 && <Step label={t('Udhaar mein profit')} value={-pending} hint={t('udhaar mein {{pending}}', { pending: formatMoney(pending) })} />}
          <Step sign="−" label={t('Expenses')} value={-expenses} hint={t('Bijli, kiraya, tankhwah')} />
          {stockLoss > 0 && <Step sign="−" label={t('Stock nuksan')} value={-stockLoss} />}
          {stockGain > 0 && <Step sign="+" label={t('Stock faida')} value={stockGain} />}
          {income > 0 && <Step sign="+" label={t('Doosri aamdani')} value={income} />}
          <Step sign="=" bold label={t('Net profit')} value={net} hint={margin} />
        </View>
      )}
    </WidgetCard>
  );
}

export function ExpensesCard() {
  const [s, set] = useWidgetState('expenses', { sort: 'amount', show: '8', view: 'donut' });
  const q = useMoneyMap();
  const { costHidden } = useMasked();
  const m = q.data;
  const rows = [...(m?.expenses.byCategory ?? [])].filter((c) => c.amount > 0)
    .sort((a, b) => (s.sort === 'count' ? b.count - a.count : b.amount - a.amount)).slice(0, Number(s.show));
  return (
    <WidgetCard title={t('Expense kahan gaya')} href="/expenses"
      description={m ? t('Is mahine {{total}} · pichhla mahina {{value}}', { total: costHidden ? MASK : formatMoney(m.expenses.month), value: costHidden ? MASK : formatMoney(m.expenses.lastMonth ?? 0) }) : undefined}
      controls={<>
        <Segmented size="sm" value={s.sort} onChange={(sort) => set({ sort })} options={[{ value: 'amount', label: t('Amount se') }, { value: 'count', label: t('Entries se') }]} />
        <Segmented size="sm" value={s.show} onChange={(show) => set({ show })} options={[{ value: '5', label: t('Top 5') }, { value: '8', label: t('Top 8') }]} />
      </>}>
      {!m ? (q.isLoading ? <WidgetSkeleton /> : <EmptyLine text={t('Abhi hisaab nahi mila')} />) : costHidden ? <EmptyLine text={t('Cost lock hai')} /> : !rows.length ? <EmptyLine text={t('Is mahine koi expense darj nahi')} /> : s.sort === 'count'
        ? <HBarList colorful rows={rows.map((c, i) => ({ key: c.categoryId ?? `e${i}`, label: c.name, value: c.count, display: t('{{count}} entries', { count: c.count }), hint: formatMoney(c.amount), color: c.color ?? undefined }))} />
        : <DonutChart slices={rows.map((c, i) => ({ key: c.categoryId ?? `e${i}`, label: c.name, value: c.amount, color: c.color ?? undefined }))} center={<Money value={m.expenses.month} kind="cost" compact weight="bold" size="md" />} format={money} />}
    </WidgetCard>
  );
}

export function PurchasesCard() {
  const [s, set] = useWidgetState('purchases', { filter: 'all' });
  const q = useMoneyMap();
  const { costHidden } = useMasked();
  const p = q.data?.purchases;
  const rows = (p?.recent ?? []).filter((r) => (s.filter === 'due' ? r.total - r.paidAmount > 0.5 : true)).slice(0, 5);
  return (
    <WidgetCard title={t('Maal ki purchase')} href="/purchases" flush
      description={p ? t('Aaj {{todayTotal}} · is mahine {{monthTotal}}', { todayTotal: costHidden ? MASK : formatMoney(p.todayTotal), monthTotal: costHidden ? MASK : formatMoney(p.monthTotal) }) : undefined}
      controls={<Segmented size="sm" value={s.filter} onChange={(filter) => set({ filter })} options={[{ value: 'all', label: t('Sab') }, { value: 'due', label: t('Jin ki payment baqi hai') }]} />}>
      {!p ? <View style={{ paddingHorizontal: 16 }}>{q.isLoading ? <WidgetSkeleton /> : <EmptyLine text={t('Abhi hisaab nahi mila')} />}</View> : !rows.length ? <EmptyLine text={t('Abhi koi purchase nahi')} /> : rows.map((r, i) => {
        const due = r.total - r.paidAmount;
        return (
          <ListRow key={`${r.id}-${i}`} dense divider={i < rows.length - 1} icon={ShoppingBag} iconTone={due > 0.5 ? 'warning' : 'success'}
            title={r.supplier?.name ?? r.purchaseNumber}
            subtitle={`${r.purchaseNumber} · ${formatDate(r.purchasedAt)}${due > 0.5 && !costHidden ? ` · ${t('Baqi {{due}}', { due: formatMoney(due) })}` : ''}`}
            trailing={<Money value={r.total} kind="cost" weight="bold" />}
            onPress={() => router.push(`/purchases/${r.id}` as never)} />
        );
      })}
    </WidgetCard>
  );
}
