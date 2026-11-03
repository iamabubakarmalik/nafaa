/**
 * Chart widgets (web widgets/SalesTrend, PeakHours, PaymentMix, Insights):
 * each has the web's controls as compact toggles, remembered on the device.
 */

import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { BarChart, DonutChart, HBarList, LineChart, ListRow, Segmented, Text, useChartColors, useTheme } from '@/design';
import { useHourlySales, useInsights, type InsightDays } from '../api/dashboard';
import { EmptyLine, METHOD_LABEL, Money, WidgetCard, WidgetSkeleton, hourLabel, hourTick, useWidgetState, weekdayNames } from '../components/parts';
import { useMasked } from '../lib/privacy';

const money = (v: number) => formatMoney(v, { compact: true });
const DAY_OPTIONS = () => [{ value: '7', label: t('7 din') }, { value: '30', label: t('30 din') }, { value: '90', label: t('90 din') }];

export function SalesTrend() {
  const cc = useChartColors();
  const [s, set] = useWidgetState('sales-trend', { days: '7', metric: 'sales', compare: 'yes' });
  const { costHidden, salesHidden } = useMasked();
  const days = Number(s.days) as 7 | 30 | 90;
  const q = useInsights(days);
  const metric = (costHidden && s.metric === 'profit' ? 'sales' : s.metric) as 'sales' | 'profit' | 'bills';
  const names = weekdayNames();
  const points = useMemo(() => (q.data?.trend ?? []).map((p) => {
    const d = new Date(`${p.date}T12:00:00`);
    return { ...p, label: days === 7 ? names[d.getDay()].slice(0, 3) : `${d.getDate()}/${d.getMonth() + 1}` };
  }), [q.data, days, names]);
  const total = points.reduce((x, p) => x + Number(p[metric] || 0), 0);
  const avg = points.length ? total / points.length : 0;
  const hidden = metric === 'bills' ? false : metric === 'profit' ? costHidden : salesHidden;
  const fmt = metric === 'bills' ? (v: number) => String(Math.round(v)) : money;
  const showProfit = metric === 'sales' && s.compare === 'yes' && !costHidden;

  return (
    <WidgetCard
      title={t('Sale ka rujhan')}
      description={hidden ? t('Pichhle {{days}} din', { days }) : t('Pichhle {{days}} din · {{value}}', { days, value: metric === 'bills' ? String(total) : formatMoney(total) })}
      controls={<>
        <Segmented size="sm" value={s.days} onChange={(days) => set({ days })} options={DAY_OPTIONS()} />
        <Segmented size="sm" value={metric} onChange={(m) => set({ metric: m })} options={[
          { value: 'sales', label: t('Sale') }, ...(costHidden ? [] : [{ value: 'profit' as const, label: t('Profit') }]), { value: 'bills', label: t('Bill') },
        ]} />
      </>}
    >
      {q.isLoading && !q.data ? <WidgetSkeleton height={170} /> : hidden ? <EmptyLine text={t('Sale chhupi hui hai')} /> : !total ? <EmptyLine text={t('Is period me koi sale nahi')} /> : (
        <>
          <LineChart labels={points.map((p) => p.label)} format={fmt} series={[
            { key: metric, label: metric === 'sales' ? t('Sale') : metric === 'profit' ? t('Profit') : t('Bill'), data: points.map((p) => Number(p[metric] || 0)) },
            ...(showProfit ? [{ key: 'profit', label: t('Profit'), data: points.map((p) => Number(p.profit || 0)), color: cc.good, dashed: true }] : []),
          ]} />
          <Text size="xs" tone="muted" style={{ marginTop: 6 }}>{t('Rozana ausat')}: <Text size="xs" weight="semibold" ltr>{fmt(avg)}</Text></Text>
        </>
      )}
    </WidgetCard>
  );
}

export function PeakHours({ openFrom = 8 }: { openFrom?: number }) {
  const [s, set] = useWidgetState('peak-hours', { days: '1', metric: 'total', range: 'open' });
  const { salesHidden } = useMasked();
  const q = useHourlySales(Number(s.days));
  const hours = useMemo(() => {
    const all = q.data?.hours ?? [];
    return s.range === 'open' ? all.filter((h) => h.hour >= openFrom || h.total > 0) : all;
  }, [q.data, s.range, openFrom]);
  const key = (s.metric === 'count' ? 'count' : 'total') as 'total' | 'count';
  const values = hours.map((h) => Number(h[key] ?? 0));
  const peak = q.data?.peakHour;
  const hidden = key === 'total' && salesHidden;

  return (
    <WidgetCard
      title={t('Rush ka waqt')}
      description={peak != null ? t('Sab se masroof {{peak}}', { peak: hourLabel(peak) }) : t('Kis ghante sab se zyada sale hoti hai')}
      controls={<>
        <Segmented size="sm" value={s.days} onChange={(days) => set({ days })} options={[{ value: '1', label: t('Aaj') }, { value: '7', label: t('Hafte ka ausat') }, { value: '30', label: t('Mahine ka ausat') }]} />
        <Segmented size="sm" value={s.metric} onChange={(metric) => set({ metric })} options={[{ value: 'total', label: t('Sale') }, { value: 'count', label: t('Bill') }]} />
      </>}
    >
      {q.isLoading && !q.data ? <WidgetSkeleton height={130} /> : hidden ? <EmptyLine text={t('Sale chhupi hui hai')} /> : !values.some((v) => v > 0) ? <EmptyLine text={t('Abhi ghanton ka hisab nahi')} /> : (
        <BarChart labels={hours.map((h) => hourTick(h.hour))} maxLabels={8} height={130}
          series={[{ key: 'h', label: key === 'count' ? t('Bill') : t('Sale'), values }]}
          highlight={peak != null ? hours.findIndex((h) => h.hour === peak) : undefined}
          format={key === 'count' ? (v) => String(Math.round(v)) : money} />
      )}
    </WidgetCard>
  );
}

export function PaymentMix() {
  const [s, set] = useWidgetState('payment-mix', { days: '30', view: 'donut' });
  const { salesHidden } = useMasked();
  const q = useInsights(Number(s.days) as InsightDays);
  const rows = (q.data?.payments ?? []).filter((p) => p.collected > 0);
  const credit = q.data?.credit ?? 0;
  const slices = [
    ...rows.map((p) => ({ key: p.method, label: t(METHOD_LABEL[p.method] ?? p.method), value: p.collected })),
    ...(credit > 0 ? [{ key: 'CREDIT', label: t('Udhaar'), value: credit }] : []),
  ];
  const total = slices.reduce((a, x) => a + x.value, 0);
  return (
    <WidgetCard title={t('Paisa kaise aaya')} description={t('Cash, card, wallet aur udhaar ka hissa')}
      controls={<>
        <Segmented size="sm" value={s.days} onChange={(days) => set({ days })} options={[{ value: '1', label: t('Aaj') }, ...DAY_OPTIONS()]} />
        <Segmented size="sm" value={s.view} onChange={(view) => set({ view })} options={[{ value: 'donut', label: t('Gol chart') }, { value: 'bars', label: t('Patiyan') }]} />
      </>}
    >
      {q.isLoading && !q.data ? <WidgetSkeleton /> : salesHidden ? <EmptyLine text={t('Sale chhupi hui hai')} /> : !total ? <EmptyLine text={t('Is period me koi sale nahi')} /> : s.view === 'bars'
        ? <HBarList colorful rows={slices.map((x) => ({ key: x.key, label: x.label, value: x.value, display: formatMoney(x.value), hint: `${Math.round((x.value / total) * 100)}%` }))} />
        : <DonutChart slices={slices} center={<Money value={total} compact weight="bold" size="md" />} format={money} />}
    </WidgetCard>
  );
}

export function CategoryMix() {
  const [s, set] = useWidgetState('category-mix', { days: '30', metric: 'revenue' });
  const { salesHidden, costHidden } = useMasked();
  const q = useInsights(Number(s.days) as InsightDays);
  const metric = (costHidden && s.metric === 'profit' ? 'revenue' : s.metric) as 'revenue' | 'qty' | 'profit';
  const rows = (q.data?.categories ?? []).filter((c) => Number(c[metric]) > 0).sort((a, b) => Number(b[metric]) - Number(a[metric])).slice(0, 8);
  const hidden = metric === 'qty' ? false : metric === 'profit' ? costHidden : salesHidden;
  return (
    <WidgetCard title={t('Category ke hisaab se')} description={t('Har category ki sale, quantity aur profit')}
      controls={<>
        <Segmented size="sm" value={s.days} onChange={(days) => set({ days })} options={[{ value: '1', label: t('Aaj') }, ...DAY_OPTIONS()]} />
        <Segmented size="sm" value={metric} onChange={(m) => set({ metric: m })} options={[{ value: 'revenue', label: t('Sale') }, { value: 'qty', label: t('Qty') }, ...(costHidden ? [] : [{ value: 'profit' as const, label: t('Profit') }])]} />
      </>}
    >
      {q.isLoading && !q.data ? <WidgetSkeleton /> : hidden ? <EmptyLine text={t('Sale chhupi hui hai')} /> : !rows.length ? <EmptyLine text={t('Is period me koi sale nahi')} /> : (
        <DonutChart slices={rows.map((c, i) => ({ key: c.id ?? `c${i}`, label: c.name, value: Number(c[metric]), color: c.color ?? undefined }))}
          format={metric === 'qty' ? (v) => String(Math.round(v)) : money} />
      )}
    </WidgetCard>
  );
}

export function StaffBoard() {
  const [s, set] = useWidgetState('staff', { days: '30' });
  const { salesHidden } = useMasked();
  const q = useInsights(Number(s.days) as InsightDays);
  const rows = (q.data?.staff ?? []).slice(0, 8);
  return (
    <WidgetCard title={t('Staff ki sale')} description={t('Kis ne kitna becha — ranking')} href="/reports/staff"
      controls={<Segmented size="sm" value={s.days} onChange={(days) => set({ days })} options={[{ value: '1', label: t('Aaj') }, ...DAY_OPTIONS()]} />}>
      {q.isLoading && !q.data ? <WidgetSkeleton /> : !rows.length ? <EmptyLine text={t('Is period me koi sale nahi')} /> : (
        <HBarList colorful rows={rows.map((r) => ({ key: r.userId, label: r.name, value: r.total, display: salesHidden ? 'Rs ••••' : formatMoney(r.total), hint: t('{{count}} bills', { count: r.bills }) }))} />
      )}
    </WidgetCard>
  );
}

export function WeekdayPattern() {
  const [s, set] = useWidgetState('weekday', { days: '90' });
  const { salesHidden } = useMasked();
  const q = useInsights(Number(s.days) as InsightDays);
  const rows = q.data?.weekday ?? [];
  const names = weekdayNames();
  const best = rows.reduce<(typeof rows)[number] | null>((b, r) => (!b || r.average > b.average ? r : b), null);
  return (
    <WidgetCard title={t('Hafte ke din')} description={best && best.average > 0 ? `${t('Kaunsa din sab se acha jata hai')} · ${names[best.day]}` : t('Kaunsa din sab se acha jata hai')}
      controls={<Segmented size="sm" value={s.days} onChange={(days) => set({ days })} options={DAY_OPTIONS().slice(1)} />}>
      {q.isLoading && !q.data ? <WidgetSkeleton height={130} /> : salesHidden ? <EmptyLine text={t('Sale chhupi hui hai')} /> : !rows.some((r) => r.total > 0) ? <EmptyLine text={t('Is period me koi sale nahi')} /> : (
        <BarChart labels={rows.map((r) => names[r.day]?.slice(0, 3) ?? String(r.day))} height={130}
          series={[{ key: 'a', label: t('Ausat'), values: rows.map((r) => r.average) }]}
          highlight={best ? rows.indexOf(best) : undefined} format={money} />
      )}
    </WidgetCard>
  );
}

export function MonthlyTrend() {
  const cc = useChartColors();
  const th = useTheme();
  const [s, set] = useWidgetState('monthly', { months: '6' });
  const { salesHidden, costHidden } = useMasked();
  const q = useInsights(30, s.months === '12' ? 12 : 6);
  const rows = q.data?.monthly ?? [];
  const name = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short' });
  return (
    <WidgetCard title={t('6 mahine ka muqabla')} description={t('Har mahine ki sale, expense aur profit')}
      controls={<Segmented size="sm" value={s.months} onChange={(months) => set({ months })} options={[{ value: '6', label: t('6 mahine') }, { value: '12', label: t('12 mahine') }]} />}>
      {q.isLoading && !q.data ? <WidgetSkeleton /> : salesHidden ? <EmptyLine text={t('Sale chhupi hui hai')} /> : !rows.length ? <EmptyLine text={t('Is period me koi sale nahi')} /> : (
        <View style={{ gap: th.space(1) }}>
          <BarChart labels={rows.map((r) => name(r.month))} format={money} series={[
            { key: 's', label: t('Sale'), values: rows.map((r) => r.sales) },
            ...(costHidden ? [] : [
              { key: 'e', label: t('Expense'), values: rows.map((r) => r.expenses), color: cc.series[3] },
              { key: 'p', label: t('Profit'), values: rows.map((r) => r.profit), color: cc.good },
            ]),
          ]} />
        </View>
      )}
    </WidgetCard>
  );
}

export function TopCustomers() {
  const [s, set] = useWidgetState('top-customers', { days: '30' });
  const q = useInsights(Number(s.days) as InsightDays);
  const rows = (q.data?.topCustomers ?? []).slice(0, 6);
  return (
    <WidgetCard title={t('Behtareen customers')} description={t('Sab se zyada khareedne wale')} href="/customers" flush
      controls={<Segmented size="sm" value={s.days} onChange={(days) => set({ days })} options={DAY_OPTIONS()} />}>
      {q.isLoading && !q.data ? <View style={{ paddingHorizontal: 16 }}><WidgetSkeleton /></View> : !rows.length ? <EmptyLine text={t('Is period me koi sale nahi')} /> : rows.map((c, i) => (
        <ListRow key={`${c.customerId}-${i}`} dense divider={i < rows.length - 1} title={c.name}
          subtitle={c.balance > 0 ? `${t('{{count}} bills', { count: c.bills })} · ${t('Udhaar')} ${formatMoney(c.balance)}` : t('{{count}} bills', { count: c.bills })}
          trailing={<Money value={c.total} weight="bold" />} onPress={() => router.push(`/customers/${c.customerId}` as never)} />
      ))}
    </WidgetCard>
  );
}
