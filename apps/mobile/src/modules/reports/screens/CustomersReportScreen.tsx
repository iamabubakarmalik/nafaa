/**
 * Customers report: who buys (new and returning, top spenders, cities),
 * segments (champions to lost) with WhatsApp messages, khata (aging and who
 * owes), loyalty points and how many come back. Send a reminder to one
 * debtor with one tap.
 */

import { khataReminder, toneFor, waLink } from '@nafaa/core/customers';
import { Crown, MessageCircle, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, BarChart, Card, ChipGroup, DonutChart, EmptyState, ErrorState, HBarList, IconButton, LineChart, ListRow, Screen, SkeletonRows, Tabs, Text, toast, useTheme } from '@/design';
import { customersReportApi, type Debtor, type SegmentKey } from '../api/customers';
import { BranchBar, PeriodBar } from '../components/PeriodBar';
import { CachedNote, ChartCard, Delta, KpiGrid, LineItem } from '../components/ui';
import { ExportButton } from '../components/ExportButton';
import type { ReportDoc } from '../lib/doc';
import { axisLabel, changePct, pct } from '../lib/fmt';
import { usePeriod } from '../lib/period';
import { useReport } from '../lib/useReport';
import { useShopLanguage, useShopName } from '../lib/useShopLanguage';

type Tab = 'overview' | 'segments' | 'khata' | 'loyalty' | 'retention';
const money = (n: number | null | undefined) => formatMoney(n ?? 0);
const SEGMENT_LABEL: Record<string, string> = { champions: 'Champions', loyal: 'Loyal', promising: 'Promising', attention: 'Dhyan chahiye', atRisk: 'Khatre me', lost: 'Kho gaye', never: 'Kabhi nahi khareeda' };

export function CustomersReportScreen() {
  const th = useTheme();
  const can = usePermission();
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const lang = useShopLanguage();
  const shop = useShopName();
  const period = usePeriod('month');
  const [tab, setTab] = useState<Tab>('overview');
  const [branch, setBranch] = useState('');
  const [segment, setSegment] = useState<SegmentKey>('champions');
  const range = { from: period.period.from, to: period.period.to };
  const b = branch || undefined;

  const overview = useReport('cust-overview', { ...range, branch }, () => customersReportApi.overview(range, b), { enabled: tab === 'overview' });
  const segments = useReport('cust-segments', { segment, branch }, () => customersReportApi.segments(segment, b), { enabled: tab === 'segments' });
  const khata = useReport('cust-khata', { ...range, branch }, () => customersReportApi.khata(range, b), { enabled: tab === 'khata' });
  const loyalty = useReport('cust-loyalty', { ...range, branch }, () => customersReportApi.loyalty(range, b), { enabled: tab === 'loyalty' });
  const cohorts = useReport('cust-cohorts', { branch }, () => customersReportApi.cohorts(6, b), { enabled: tab === 'retention' });
  const active = { overview, segments, khata, loyalty, retention: cohorts }[tab];

  const remind = (c: Debtor) => {
    const link = waLink(c.phone, khataReminder({ name: c.name, amount: money(c.balance), dueDays: c.oldestDays, phone: c.phone } as never, shop, lang, toneFor(c.oldestDays)));
    if (!link) { toast.warning(t('Is customer ka phone number nahi')); return; }
    void Linking.openURL(link).catch(() => toast.error(t('WhatsApp nahi khula')));
  };

  const doc = (): ReportDoc | null => {
    if (tab === 'khata' && khata.data) {
      const k = khata.data;
      return { title: t('Customers report'), subtitle: `${t('Khata')} · ${period.label}`, fileName: `khata-${range.from}-${range.to}`, summary: [[t('Abhi baqi'), money(k.totals.receivable)], [t('Udhaar diya'), money(k.totals.given)], [t('Wasool'), money(k.totals.received)]], tables: [{ heading: t('Sab se zyada udhaar'), columns: [t('Naam'), t('Phone'), t('Baqi'), t('Din')], rows: k.rows.map((r) => [r.name, r.phone ?? '', money(r.balance), r.oldestDays ?? '']) }] };
    }
    if (tab === 'overview' && overview.data) {
      const o = overview.data;
      return { title: t('Customers report'), subtitle: period.label, fileName: `customers-${range.from}-${range.to}`, summary: [[t('Customers'), String(o.totals.buyers)], [t('Naye'), String(o.totals.newBuyers)], [t('Wapas aaye'), String(o.totals.repeat)]], tables: [{ heading: t('Behtareen customers'), columns: [t('Naam'), t('Bills'), t('Kharcha')], rows: o.top.spend.map((c) => [c.name, c.bills, money(c.net)]) }] };
    }
    return null;
  };

  const o = overview.data;
  const overviewView = !o ? null : (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[
        { label: t('Customers'), tone: 'info', value: <Text size="lg" weight="bold">{o.totals.buyers}</Text>, hint: <Delta value={changePct(o.totals.buyers, o.previous?.buyers)} /> },
        { label: t('Naye'), tone: 'success', value: <Text size="lg" weight="bold">{o.totals.newBuyers}</Text>, hint: `${t('Sign-up')} ${o.totals.signups}` },
        { label: t('Wapas aaye'), value: <Text size="lg" weight="bold">{o.totals.repeat}</Text>, hint: `${pct(o.totals.repeatRate, 0)} ${t('repeat')}` },
        { label: t('Ausat kharcha'), value: <Amount value={o.totals.avgSpend} size="lg" weight="bold" /> },
        { label: t('Walk-in sale'), value: <Amount value={o.totals.walkIn} size="lg" weight="bold" />, hint: t('{{count}} bills', { count: o.totals.walkInBills }) },
        { label: t('Naam wale'), value: <Amount value={o.totals.named} size="lg" weight="bold" />, hint: `${pct(o.totals.namedShare, 0)} ${t('sale ka')}` },
      ]} />
      {o.trend.length > 1 && <ChartCard title={t('Naye aur purane')}><BarChart labels={o.trend.map((x) => axisLabel(x.key))} series={[{ key: 'n', label: t('Naye'), values: o.trend.map((x) => x.newBuyers), color: '#16a34a' }, { key: 'r', label: t('Purane'), values: o.trend.map((x) => x.returningBuyers) }]} /></ChartCard>}
      {o.visits.length > 0 && <ChartCard title={t('Kitni dafa aaye')}><HBarList rows={o.visits.map((v) => ({ key: v.key, label: v.label, value: v.customers, display: String(v.customers), hint: money(v.net) }))} /></ChartCard>}
      {o.top.spend.length > 0 && <Card flush title={t('Behtareen customers')}>{o.top.spend.slice(0, 10).map((c, i, a) => <ListRow key={c.id} dense divider={i < a.length - 1} icon={c.isVip ? Crown : Users} title={c.name} subtitle={`${t('{{count}} bills', { count: c.bills })}${c.city ? ` · ${c.city}` : ''}`} trailing={<Amount value={c.net} weight="bold" />} onPress={() => router.push(`/customers/${c.id}` as never)} />)}</Card>}
      {o.cities.rows.length > 0 && <ChartCard title={t('Shehar')}><HBarList colorful rows={o.cities.rows.slice(0, 8).map((c) => ({ key: c.name, label: c.name, value: c.net, display: money(c.net), hint: t('{{count}} customers', { count: c.buyers }) }))} /></ChartCard>}
      {o.genders.length > 0 && <ChartCard title={t('Mard / aurat')}><DonutChart slices={o.genders.map((g) => ({ key: g.key, label: g.key === 'MALE' ? t('Mard') : g.key === 'FEMALE' ? t('Aurat') : t('Dusra'), value: g.buyers }))} format={(v) => String(v)} /></ChartCard>}
    </View>
  );

  const s = segments.data;
  const segmentsView = (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup value={segment} onChange={setSegment} options={(['champions', 'loyal', 'promising', 'attention', 'atRisk', 'lost'] as SegmentKey[]).map((k) => ({ value: k, label: t(SEGMENT_LABEL[k]), count: s?.segments.find((x) => x.key === k)?.customers }))} />
      {!s ? <SkeletonRows count={4} /> : (
        <>
          <ChartCard title={t('Customers ka hissa')}><DonutChart slices={s.segments.map((x) => ({ key: x.key, label: t(SEGMENT_LABEL[x.key]), value: x.customers }))} format={(v) => String(v)} /></ChartCard>
          <Card flush title={t(SEGMENT_LABEL[segment])} description={t('{{count}} customers', { count: s.rows?.length ?? 0 })}>
            {(s.rows ?? []).length === 0 ? <View style={{ padding: th.space(4) }}><Text tone="muted">{t('Is group me koi nahi')}</Text></View> : (s.rows ?? []).slice(0, 40).map((c, i, a) => (
              <ListRow key={c.id} dense divider={i < a.length - 1} title={c.name} subtitle={`${c.days != null ? t('{{count}} din pehle', { count: c.days }) : ''} · ${t('{{count}} dafa', { count: c.visits })}`}
                trailing={<View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}><Amount value={c.lifetime} weight="semibold" /><IconButton icon={MessageCircle} label="WhatsApp" size="sm" onPress={() => { const l = waLink(c.phone, t('Assalam-o-Alaikum {{name}}!', { name: c.name })); if (l) void Linking.openURL(l); else toast.warning(t('Is customer ka phone number nahi')); }} /></View>}
                onPress={() => router.push(`/customers/${c.id}` as never)} />
            ))}
          </Card>
        </>
      )}
    </View>
  );

  const k = khata.data;
  const khataView = !k ? null : (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[
        { label: t('Abhi baqi'), tone: 'danger', value: <Amount value={k.totals.receivable} size="lg" weight="bold" />, hint: t('{{count}} customers', { count: k.totals.owing }) },
        { label: t('Udhaar diya'), tone: 'warning', value: <Amount value={k.totals.given} size="lg" weight="bold" />, hint: <Delta value={changePct(k.totals.given, k.previous?.given)} upIsGood={false} /> },
        { label: t('Wasool'), tone: 'success', value: <Amount value={k.totals.received} size="lg" weight="bold" />, hint: <Delta value={changePct(k.totals.received, k.previous?.received)} /> },
        { label: t('Wasooli ki rate'), value: <Text size="lg" weight="bold" ltr>{pct(k.totals.collectionRate, 0)}</Text>, hint: k.totals.daysToCollect != null ? t('{{count}} din me', { count: Math.round(k.totals.daysToCollect) }) : undefined },
        { label: t('60 din se purana'), tone: 'danger', value: <Amount value={k.totals.over60} size="lg" weight="bold" /> },
        { label: t('Limit se zyada'), tone: 'warning', value: <Text size="lg" weight="bold">{k.totals.overLimit}</Text> },
      ]} />
      {k.aging.length > 0 && <ChartCard title={t('Udhaar kitna purana')}><HBarList rows={k.aging.map((a) => ({ key: a.key, label: a.label, value: a.amount, color: '#d97706', display: money(a.amount), hint: t('{{count}} customers', { count: a.customers }) }))} /></ChartCard>}
      {k.trend.length > 1 && <ChartCard title={t('Diya aur wasool')}><BarChart labels={k.trend.map((x) => axisLabel(x.key))} series={[{ key: 'g', label: t('Diya'), values: k.trend.map((x) => x.given), color: '#d97706' }, { key: 'r', label: t('Wasool'), values: k.trend.map((x) => x.received), color: '#16a34a' }]} format={formatMoney} /></ChartCard>}
      <Card flush title={t('Kis par kitna baqi')}>
        {k.rows.length === 0 ? <View style={{ padding: th.space(4) }}><Text tone="muted">{t('Kisi par udhaar nahi')}</Text></View> : k.rows.slice(0, 50).map((c, i, a) => (
          <ListRow key={c.id} dense divider={i < a.length - 1} title={c.name} subtitle={`${c.oldestDays != null ? t('{{count}} din se', { count: c.oldestDays }) : ''}${c.lastPaymentAt ? ` · ${t('Aakhri payment')} ${formatDate(c.lastPaymentAt)}` : ''}`}
            trailing={<View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}><View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={c.balance} weight="bold" tone="danger" />{c.overLimit ? <Badge tone="warning">{t('Limit se zyada')}</Badge> : null}</View>{can(P.KHATA_VIEW) && <IconButton icon={MessageCircle} label={t('Yaad dilayein')} size="sm" onPress={() => remind(c)} />}</View>}
            onPress={() => router.push(`/customers/${c.id}` as never)} />
        ))}
      </Card>
    </View>
  );

  const l = loyalty.data;
  const loyaltyView = !l ? null : !l.enabled ? <EmptyState title={t('Loyalty abhi band hai')} /> : (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[
        { label: t('Points baqi'), tone: 'brand', value: <Text size="lg" weight="bold" ltr>{Math.round(l.outstanding.points).toLocaleString('en-US')}</Text>, hint: `${money(l.outstanding.value)} · ${t('{{count}} customers', { count: l.outstanding.holders })}` },
        { label: t('Diye gaye'), tone: 'success', value: <Text size="lg" weight="bold" ltr>{Math.round(l.totals.issued).toLocaleString('en-US')}</Text>, hint: t('{{count}} customers', { count: l.totals.earners }) },
        { label: t('Istemal hue'), tone: 'warning', value: <Text size="lg" weight="bold" ltr>{Math.round(l.totals.redeemed).toLocaleString('en-US')}</Text>, hint: money(l.totals.redeemedValue) },
        { label: t('Redeem rate'), value: <Text size="lg" weight="bold" ltr>{pct(l.totals.redeemRate, 0)}</Text> },
      ]} />
      {l.trend.length > 1 && <ChartCard title={t('Points diye aur istemal hue')}><BarChart labels={l.trend.map((x) => axisLabel(x.key))} series={[{ key: 'i', label: t('Diye'), values: l.trend.map((x) => x.issued), color: '#16a34a' }, { key: 'r', label: t('Istemal'), values: l.trend.map((x) => x.redeemed), color: '#d97706' }]} /></ChartCard>}
      {l.top.length > 0 && <Card flush title={t('Sab se zyada points')}>{l.top.map((c, i, a) => <ListRow key={c.id} dense divider={i < a.length - 1} title={c.name} subtitle={c.phone ?? undefined} trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{Math.round(c.points).toLocaleString('en-US')}</Text><Amount value={c.value} size="2xs" tone="muted" /></View>} onPress={() => router.push(`/customers/${c.id}` as never)} />)}</Card>}
    </View>
  );

  const c = cohorts.data;
  const retentionView = !c ? null : (
    <View style={{ gap: th.space(4) }}>
      <KpiGrid items={[{ label: t('Naye customers'), tone: 'info', value: <Text size="lg" weight="bold">{c.newCustomers}</Text>, hint: t('{{count}} mahine', { count: c.months }) }]} />
      {c.curve.length > 1 && (
        <ChartCard title={t('Kitne wapas aaye')} subtitle={t('Pehli khareedari ke baad har mahine')}>
          <LineChart labels={c.curve.map((x) => `+${x.offset}`)} series={[{ key: 'p', label: t('Wapas'), data: c.curve.map((x) => x.pct ?? 0) }]} format={(v) => `${v.toFixed(0)}%`} />
        </ChartCard>
      )}
      <Card title={t('Mahine ke group')}>
        {c.cohorts.map((x, i) => <LineItem key={x.key} last={i === c.cohorts.length - 1} label={x.key} hint={t('{{count}} customers', { count: x.size })} value={<Text size="sm" weight="semibold" ltr>{x.cells[1] ? `${x.cells[1].pct.toFixed(0)}%` : '—'}</Text>} />)}
      </Card>
    </View>
  );

  const body = active.isError && !active.data ? <ErrorState error={active.error} onRetry={() => void active.refetch()} /> : tab === 'overview' ? (overviewView ?? <SkeletonRows count={5} />)
    : tab === 'segments' ? segmentsView : tab === 'khata' ? (khataView ?? <SkeletonRows count={5} />) : tab === 'loyalty' ? (loyaltyView ?? <SkeletonRows count={5} />) : (retentionView ?? <SkeletonRows count={5} />);

  return (
    <Screen title={t('Customers report')} onRefresh={() => void active.refetch()} refreshing={active.isRefetching} actions={<ExportButton build={doc} disabled={!doc()} />}>
      {!can(P.REPORTS_VIEW) || !can(P.CUSTOMERS_VIEW) ? <EmptyState title={t('Aap ko yeh dekhne ki ijazat nahi')} /> : (
        <>
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'overview', label: t('Overview') }, { value: 'segments', label: t('Groups') }, { value: 'khata', label: t('Khata') }, { value: 'loyalty', label: t('Loyalty') }, { value: 'retention', label: t('Wapsi') }]} />
          {tab !== 'segments' && tab !== 'retention' && <PeriodBar state={period} allowAll />}
          {allShops && <BranchBar value={branch} onChange={setBranch} />}
          <CachedNote query={active} />
          {body}
        </>
      )}
    </Screen>
  );
}
