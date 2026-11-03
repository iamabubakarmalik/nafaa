/**
 * Profit and loss: the shop's real earnings for any period. The statement
 * against the previous period (or the same dates last year), month by month,
 * branch by branch, and cash in and out. Tap a line to see the records
 * behind it. Cost lines stay hidden for people without cost access.
 * Needs internet; the last numbers are kept on the phone.
 */

import { change, monthRange, pctText, sumStatements, unionCategories, type PnlStatement } from '@nafaa/core/finance';
import { Calendar, ChevronRight, FileText, GitCompareArrows, Landmark, Store, Wallet } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';
import { useShops } from '@/core/auth/useShops';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, BarChart, Card, DonutChart, EmptyState, ErrorState, HBarList, Icon, IconButton, ListRow, PageHero, HeroAmount, HeroText, PressableScale, Screen, Segmented, Sheet, SkeletonRows, Switch, Tabs, Text, useTheme,
} from '@/design';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { BranchBar, PeriodBar } from '@/modules/reports/components/PeriodBar';
import { CachedNote, ChartCard, DataTable, Delta, LineItem } from '@/modules/reports/components/ui';
import { ExportButton } from '@/modules/reports/components/ExportButton';
import type { ReportDoc } from '@/modules/reports/lib/doc';
import { usePeriod } from '@/modules/reports/lib/period';
import { useReport } from '@/modules/reports/lib/useReport';
import { pnlApi, type PnlDetailKind } from '../api/pnl';
import { CHANNEL_LABELS, buildLines, pnlConfigFor, serverName, type PnlLine } from '../lib/pnlLines';

type Tab = 'statement' | 'monthly' | 'branches' | 'cash';

const monthName = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });

export function ProfitLossScreen() {
  const th = useTheme();
  const can = usePermission();
  const { id: industry } = useIndustry();
  const cfg = pnlConfigFor(industry ?? undefined);
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const shops = useShops().data ?? [];
  const period = usePeriod('month');
  const [tab, setTab] = useState<Tab>('statement');
  const [compare, setCompare] = useState<'prev' | 'year'>('prev');
  const [staff, setStaff] = useState(true);
  const [branch, setBranch] = useState('');
  const [drill, setDrill] = useState<PnlLine | null>(null);

  const canBranch = allShops && shops.length > 1;
  const showBranches = canBranch && !branch;
  const query = { from: period.period.from, to: period.period.to, compare, staff, shopId: canBranch ? branch || undefined : undefined };

  const reportQ = useReport('pnl', query, () => pnlApi.report(query));
  const monthlyQ = useReport('pnl-monthly', { shopId: query.shopId, staff }, () => pnlApi.monthly({ shopId: query.shopId, staff, months: 12 }), { enabled: tab === 'monthly' });
  const branchesQ = useReport('pnl-branches', query, () => pnlApi.branches(query), { enabled: tab === 'branches' && showBranches });
  const cashQ = useReport('pnl-cash', query, () => pnlApi.cashFlow(query), { enabled: tab === 'cash' });

  const r = reportQ.data;
  const s = r?.current;
  const costOk = r?.costVisible ?? true;
  const lines = useMemo(() => (r ? buildLines(cfg, unionCategories([r.current, r.previous]), r.staffIncluded, [r.current, r.previous]).filter((l) => costOk || !l.cost) : []), [r, cfg, costOk]);

  const money = (v: number | null | undefined, line?: PnlLine) => (v == null ? '—' : line?.kind === 'ratio' ? pctText(v) : formatMoney(v));
  const valueNode = (line: PnlLine, v: number | null) => {
    if (v == null) return <Text size="sm" tone="muted">—</Text>;
    if (line.kind === 'ratio') return <Text size="sm" weight="semibold" ltr>{pctText(v)}</Text>;
    const neg = !!line.minus && v !== 0;
    const grand = line.kind === 'grand';
    return <Amount value={neg ? -Math.abs(v) : v} weight={line.kind === 'total' || grand ? 'bold' : 'medium'} size={grand ? 'md' : 'sm'} colorize={grand && (line.id === 'net-profit' || line.id === 'gross-profit')} />;
  };

  const exportDoc = (): ReportDoc | null => {
    if (!r) return null;
    return {
      title: t('Profit-loss (P&L)'), subtitle: `${period.label}${r.branch ? ` · ${r.branch.name}` : ''}`, fileName: `pnl-${r.period.from}-${r.period.to}`,
      summary: [[t('Net sale'), formatMoney(r.current.revenue.net)], ...(costOk ? [[t('Gross profit'), formatMoney(r.current.grossProfit)] as [string, string]] : []), [t('Kul kharchay'), formatMoney(r.current.expenses.total)], ...(costOk ? [[t('Net profit'), formatMoney(r.current.netProfit)] as [string, string]] : [])],
      tables: [{ heading: t('Bayan'), columns: [t('Line'), t('Is period'), t('Pehle')], rows: lines.filter((l) => l.kind !== 'head').map((l) => [l.label, money(l.value(r.current), l), money(l.value(r.previous), l)]) }],
    };
  };

  const hero = (
    <PageHero
      chip={period.label}
      stats={[
        { label: t('Net profit'), value: <HeroAmount value={costOk ? s?.netProfit : s?.revenue.net} size="3xl" weight="heavy" />, hint: costOk && s?.netMargin != null ? <HeroText size="2xs" tone="subtle">{`${t('Net margin')} ${pctText(s.netMargin)}`}</HeroText> : undefined },
        { label: t('Net sale'), value: <HeroAmount value={s?.revenue.net} size="lg" /> },
        ...(costOk ? [{ label: t('Gross profit'), value: <HeroAmount value={s?.grossProfit} size="lg" /> }] : []),
      ]}
      loading={!r && reportQ.isLoading}
    />
  );

  const filters = (
    <View style={{ gap: th.space(3) }}>
      <PeriodBar state={period} presets={['today', 'yesterday', 'week', 'month', 'lastMonth', 'year']} />
      <BranchBar value={branch} onChange={setBranch} />
      <Segmented value={compare} onChange={setCompare} size="sm" options={[{ value: 'prev', label: t('Pichli period se'), icon: GitCompareArrows }, { value: 'year', label: t('Pichle saal se'), icon: Calendar }]} />
      <Switch value={staff} onChange={setStaff} label={t('Tankhwah aur commission kharch me ginein')} />
    </View>
  );

  const statement = !r ? <SkeletonRows count={8} /> : (
    <View style={{ gap: th.space(4) }}>
      {costOk && s && (
        <ChartCard title={t('Sale ka paisa kahan gaya')} subtitle={t('Net sale ke har 100 me')}>
          <DonutChart
            slices={[
              { key: 'cogs', label: t(cfg.cogs), value: s.cogs?.total ?? 0, color: '#64748b' },
              { key: 'exp', label: t('Kul kharchay'), value: s.expenses.total, color: '#d97706' },
              { key: 'wo', label: t('Stock ka net nuksan'), value: Math.max(s.writeOffs?.net ?? 0, 0), color: '#e11d48' },
              { key: 'profit', label: t('Net profit'), value: Math.max((s.netProfit ?? 0) - s.otherIncome.total, 0), color: '#16a34a' },
            ]}
            center={<><Text size="2xs" tone="muted">{t('Net margin')}</Text><Text weight="bold" ltr>{pctText(s.netMargin)}</Text></>}
            format={(v) => (s.revenue.net > 0 ? `${Math.round((v / s.revenue.net) * 100)}%` : formatMoney(v, { compact: true }))}
          />
        </ChartCard>
      )}
      <Card flush title={t('Bayan')} description={t('Line dabayein, us ke records dekhein')}>
        <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(2) }}>
          {lines.map((l, i) => {
            if (l.kind === 'head') return <Text key={l.id} size="xs" weight="bold" tone="muted" style={{ marginTop: th.space(3), marginBottom: 2, textTransform: 'uppercase' }}>{l.label}</Text>;
            const v = l.value(r.current);
            const pv = l.value(r.previous);
            const body = (
              <LineItem label={l.label} indent={l.kind === 'sub'} bold={l.kind === 'total' || l.kind === 'grand'} last={i === lines.length - 1}
                value={<View style={{ alignItems: 'flex-end', gap: 2, flexDirection: 'row' }}>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    {valueNode(l, v)}
                    {l.upIsGood != null && v != null && pv != null && l.kind !== 'ratio' ? <Delta value={change(v, pv)} upIsGood={l.upIsGood} /> : null}
                  </View>
                  {(l.drill || l.to) ? <Icon icon={ChevronRight} size={16} tone="subtle" flip /> : null}
                </View>} />
            );
            return l.drill || l.to ? <PressableScale key={l.id} haptic="tap" onPress={() => (l.drill ? setDrill(l) : router.push(l.to as never))}>{body}</PressableScale> : <View key={l.id}>{body}</View>;
          })}
        </View>
      </Card>
      {r.channels.length > 1 && (
        <ChartCard title={t('Kahan se sale aayi')}>
          <HBarList colorful rows={r.channels.map((c) => ({ key: c.source, label: t(CHANNEL_LABELS[c.source] ?? c.source), value: c.net, display: formatMoney(c.net), hint: costOk && c.profit != null ? `${t('Profit')} ${formatMoney(c.profit)}` : t('{{count}} bills', { count: c.bills }) }))} />
        </ChartCard>
      )}
      {r.categories.length > 0 && (
        <ChartCard title={t('Category ke hisaab se')}>
          <HBarList rows={r.categories.slice(0, 8).map((c) => ({ key: c.id, label: serverName(c.name), value: c.net, color: c.color, display: formatMoney(c.net), hint: costOk && c.profit != null ? `${t('Profit')} ${formatMoney(c.profit)} · ${pctText(c.margin)}` : undefined }))} />
        </ChartCard>
      )}
      {r.pendingExpenses.count > 0 && (
        <ListRow icon={Wallet} iconTone="warning" title={t('Baqi bill (abhi ginay nahi)')} subtitle={t('{{count}} bill', { count: r.pendingExpenses.count })} trailing={<Amount value={r.pendingExpenses.amount} weight="bold" />} chevron onPress={() => router.push('/expenses')} />
      )}
    </View>
  );

  const monthly = !monthlyQ.data ? <SkeletonRows count={6} /> : (() => {
    const m = monthlyQ.data;
    const ok = m.costVisible;
    const key = ok ? 'netProfit' : 'net';
    const val = (x: PnlStatement) => (ok ? x.netProfit ?? 0 : x.revenue.net);
    const total = sumStatements(m.months.map((x) => x.statement));
    return (
      <View style={{ gap: th.space(4) }}>
        <ChartCard title={ok ? t('Net profit mahine war') : t('Net sale mahine war')}>
          <BarChart signed labels={m.months.map((x) => monthName(x.key).split(' ')[0])} series={[{ key, values: m.months.map((x) => val(x.statement)) }]} format={formatMoney} highlight={m.months.length - 1} />
        </ChartCard>
        <Card flush title={t('Mahine war')}>
          <DataTable
            rows={[...m.months].reverse()}
            keyOf={(x) => x.key}
            onRowPress={(x) => { const mr = monthRange(x.key, m.today); period.setCustom(mr); period.setPreset('custom'); setTab('statement'); }}
            columns={[
              { key: 'm', label: t('Mahina'), width: 92, render: (x) => <Text size="sm" weight="medium">{`${monthName(x.key)}${x.partial ? ' •' : ''}`}</Text> },
              { key: 'net', label: t('Net sale'), value: (x) => formatMoney(x.statement.revenue.net, { compact: true }) },
              ...(ok ? [{ key: 'gp', label: t('Gross profit'), value: (x: typeof m.months[number]) => formatMoney(x.statement.grossProfit, { compact: true }) }] : []),
              { key: 'ex', label: t('Kharchay'), value: (x) => formatMoney(x.statement.expenses.total, { compact: true }) },
              ...(ok ? [{ key: 'np', label: t('Net profit'), render: (x: typeof m.months[number]) => <Amount value={x.statement.netProfit} compact weight="bold" size="sm" colorize /> }] : []),
            ]}
            footer={[t('Kul'), formatMoney(total.revenue.net, { compact: true }), ...(ok ? [formatMoney(total.grossProfit, { compact: true })] : []), formatMoney(total.expenses.total, { compact: true }), ...(ok ? [formatMoney(total.netProfit, { compact: true })] : [])]}
          />
        </Card>
      </View>
    );
  })();

  const branches = !branchesQ.data ? <SkeletonRows count={4} /> : (
    <View style={{ gap: th.space(3) }}>
      {branchesQ.data.branches.map((b) => (
        <ListRow key={b.id} icon={Store} title={b.name} subtitle={`${t('Net sale')} ${formatMoney(b.statement.revenue.net)} · ${t('Kharchay')} ${formatMoney(b.statement.expenses.total)}`}
          trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={branchesQ.data!.costVisible ? b.statement.netProfit : b.statement.revenue.net} weight="bold" colorize={branchesQ.data!.costVisible} /><Text size="2xs" tone="muted">{branchesQ.data!.costVisible ? t('Net profit') : t('Net sale')}</Text></View>}
          onPress={() => setBranch(b.id)} />
      ))}
      <ListRow icon={Landmark} title={t('Total')} trailing={<Amount value={branchesQ.data.costVisible ? branchesQ.data.total.netProfit : branchesQ.data.total.revenue.net} weight="bold" />} />
    </View>
  );

  const cash = !cashQ.data ? (cashQ.isError ? <ErrorState error={cashQ.error} onRetry={() => void cashQ.refetch()} /> : <SkeletonRows count={4} />) : (
    <View style={{ gap: th.space(4) }}>
      <View style={{ flexDirection: 'row', gap: th.space(3) }}>
        <Card style={{ flex: 1 }}><Text size="xs" tone="muted">{t('Aaya')}</Text><Amount value={cashQ.data.totals.in} size="lg" weight="bold" tone="success" /></Card>
        <Card style={{ flex: 1 }}><Text size="xs" tone="muted">{t('Gaya')}</Text><Amount value={cashQ.data.totals.out} size="lg" weight="bold" tone="danger" /></Card>
        <Card style={{ flex: 1 }}><Text size="xs" tone="muted">{t('Bacha')}</Text><Amount value={cashQ.data.totals.net} size="lg" weight="bold" colorize /></Card>
      </View>
      {cashQ.data.trend.length > 1 && (
        <ChartCard title={t('Paisa aaya aur gaya')}>
          <BarChart labels={cashQ.data.trend.map((x) => (cashQ.data!.grouping === 'month' ? monthName(x.key).split(' ')[0] : x.key.slice(8)))} series={[{ key: 'in', label: t('Aaya'), values: cashQ.data.trend.map((x) => x.in), color: '#16a34a' }, { key: 'out', label: t('Gaya'), values: cashQ.data.trend.map((x) => x.out), color: '#e11d48' }]} format={formatMoney} />
        </ChartCard>
      )}
    </View>
  );

  return (
    <Screen title={t('Profit-loss (P&L)')} onRefresh={() => { void reportQ.refetch(); }} refreshing={reportQ.isRefetching} actions={<ExportButton build={exportDoc} disabled={!r} />}>
      {!can(P.PROFIT_REPORT_VIEW) ? <EmptyState title={t('Aap ko yeh dekhne ki ijazat nahi')} /> : (
        <>
          {reportQ.isError && !r ? <ErrorState error={reportQ.error} onRetry={() => void reportQ.refetch()} /> : (
            <>
              {hero}
              {filters}
              <CachedNote query={reportQ} />
              <Tabs value={tab} onChange={setTab} tabs={[
                { value: 'statement', label: t('Bayan'), icon: FileText },
                { value: 'monthly', label: t('Mahine war') },
                ...(showBranches ? [{ value: 'branches' as Tab, label: t('Branch war') }] : []),
                { value: 'cash', label: t('Paisa aaya/gaya') },
              ]} />
              {tab === 'statement' ? statement : tab === 'monthly' ? monthly : tab === 'branches' ? branches : cash}
            </>
          )}
        </>
      )}
      <DrillSheet line={drill} onClose={() => setDrill(null)} query={query} />
    </Screen>
  );
}

function DrillSheet({ line, onClose, query }: { line: PnlLine | null; onClose: () => void; query: { from: string; to: string; staff: boolean; shopId?: string } }) {
  const q = useQuery({
    queryKey: ['report', 'pnl-detail', line?.id, query],
    queryFn: () => pnlApi.detail({ ...query, kind: line!.drill!.kind as PnlDetailKind, categoryId: line!.drill!.categoryId }),
    enabled: !!line?.drill,
    placeholderData: keepPreviousData,
  });
  return (
    <Sheet open={!!line} onClose={onClose} title={line?.label} height={0.8} scrollable>
      {q.isLoading ? <SkeletonRows count={5} /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
        <View style={{ gap: 4 }}>
          <Text size="sm" tone="muted">{t('{{count}} records', { count: q.data?.count ?? 0 })} · {formatMoney(q.data?.total ?? 0)}</Text>
          {(q.data?.rows ?? []).map((row) => (
            <ListRow key={row.id} dense title={row.title} subtitle={[new Date(row.at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }), row.ref, row.branch, row.by].filter(Boolean).join(' · ')} trailing={<Amount value={row.amount} weight="semibold" />} />
          ))}
          {q.data?.truncated ? <Text size="xs" tone="muted" align="center">{t('Sirf pehle records dikhaye gaye')}</Text> : null}
        </View>
      )}
    </Sheet>
  );
}
