/**
 * Purchase and supplier analytics for the chosen period, like the web
 * (totals against the previous period, trend, suppliers, items, cost
 * rises, payment methods, units, returns, open orders, weekday pattern),
 * drawn as simple bars that read well on a phone.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Badge, Card, ListRow, ProgressBar, Row, SkeletonRows, StatTile, Text, useTheme, ErrorState } from '@/design';
import { PUR } from '@/modules/inventory/lib/shared';
import { purchasesApi } from '../api/purchases';
import { suppliersApi } from '../api/suppliers';
import { day, payLabel } from '../lib/meta';

const DAYS = [msg('Itwar'), msg('Peer'), msg('Mangal'), msg('Budh'), msg('Jumeraat'), msg('Juma'), msg('Hafta')];
const q2 = (n: number) => String(Number(n.toFixed(2)));

/** Labelled bar rows; `value` decides the bar, `right` is shown. */
export function Bars({ rows, tone = 'brand' }: { rows: Array<{ key: string; label: string; sub?: string; value: number; right: string; onPress?: () => void }>; tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info' }) {
  const th = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: th.space(2.5) }}>
      {rows.map((r) => (
        <View key={r.key} style={{ gap: 4 }}>
          <Row justify="between" gap={2}>
            <View style={{ flex: 1 }}>
              <Text size="sm" numberOfLines={1} onPress={r.onPress}>{r.label}</Text>
              {r.sub ? <Text size="2xs" tone="muted" numberOfLines={1}>{r.sub}</Text> : null}
            </View>
            <Text size="sm" weight="semibold" ltr>{r.right}</Text>
          </Row>
          <ProgressBar value={r.value / max} tone={tone} height={5} />
        </View>
      ))}
    </View>
  );
}

export function PurchaseAnalyticsView({ range, money }: { range: { from: string; to: string } | null; money: (n: number) => string }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [PUR, 'analytics', range?.from, range?.to], queryFn: () => purchasesApi.analytics(range) });
  const d = q.data;
  if (q.isLoading) return <SkeletonRows count={6} />;
  if (!d) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const tt = d.totals;
  const up = tt.growth >= 0;
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Maal aaya')} value={money(tt.value)}
          hint={<Row gap={1}>{up ? <ArrowUpRight size={14} color={th.colors.danger.text} /> : <ArrowDownRight size={14} color={th.colors.success.text} />}
            <Text size="2xs" tone="muted">{t('{{value}}% pichli period se ({{prevValue}})', { value: Math.abs(tt.growth).toFixed(0), prevValue: money(tt.prevValue) })}</Text></Row>} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Bill')} value={String(tt.bills)} hint={t('Ausat bill {{avgBill}}', { avgBill: money(tt.avgBill) })} tone="info" />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Diye')} value={money(tt.paid)} tone="success" hint={t('Udhaar par {{credit}}', { credit: money(tt.credit) })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Return')} value={money(tt.returned)} tone="warning" hint={t('Supplier ko lautaya maal')} />
      </Row>

      <Card title={t('Purchase ka rujhan')}>
        {d.trend.length ? <Bars rows={d.trend.map((x) => ({ key: x.key, label: x.label, sub: t('{{bills}} bill · diye {{paid}}', { bills: x.bills, paid: money(x.paid) }), value: x.value, right: money(x.value) }))} />
          : <Text size="sm" tone="muted">{t('Koi purchase nahi')}</Text>}
      </Card>

      <Card title={t('Kis se kitna maal aaya')}>
        {d.suppliers.length ? <Bars tone="info" rows={d.suppliers.slice(0, 10).map((s) => ({ key: s.id, label: s.name, sub: t('{{bills}} bill · diye {{paid}}', { bills: s.bills, paid: money(s.paid) }), value: s.value, right: money(s.value), onPress: () => router.push(`/suppliers/${s.id}` as never) }))} />
          : <Text size="sm" tone="muted">{t('Koi purchase nahi')}</Text>}
      </Card>

      <Card title={t('Sab se zyada khareeda maal')} description={t('Amount, quantity aur ausat cost (fi base unit)')}>
        {d.items.length ? <Bars tone="success" rows={d.items.slice(0, 10).map((i) => ({ key: i.name, label: i.raw ? `${i.name} · ${t('RAW')}` : i.name, sub: `${q2(i.qty)} ${i.unit} · ${t('Ausat cost')} ${money(i.avgCost)}`, value: i.value, right: money(i.value) }))} />
          : <Text size="sm" tone="muted">{t('Koi purchase nahi')}</Text>}
      </Card>

      <Card title={t('Mehngi hoti cheezein')} description={t('Is period me cost kitni barhi')}>
        {d.costRises.length ? d.costRises.slice(0, 8).map((c) => (
          <Row key={c.name} justify="between" gap={2} style={{ paddingVertical: 4 }}>
            <Text size="sm" style={{ flex: 1 }} numberOfLines={1}>{c.name}</Text>
            <Text size="xs" tone="muted" ltr>{`${money(c.first)} → ${money(c.last)}`}</Text>
            <Badge tone="danger">{`+${c.change.toFixed(0)}%`}</Badge>
          </Row>
        )) : <Text size="sm" tone="muted">{t('Kisi cheez ki cost nahi barhi')}</Text>}
      </Card>

      <Card title={t('Paisa kis type ke maal par laga')}>
        {d.categories.length ? <Bars tone="warning" rows={d.categories.map((c) => ({ key: c.name, label: c.name, value: c.value, right: money(c.value) }))} />
          : <Text size="sm" tone="muted">{t('Koi purchase nahi')}</Text>}
      </Card>

      <Card title={t('Payment kaise hui')}>
        {d.payments.length ? <Bars rows={d.payments.map((p) => ({ key: p.method, label: payLabel(p.method), sub: t('{{count}} bill', { count: p.bills }), value: p.value, right: money(p.value) }))} />
          : <Text size="sm" tone="muted">{t('Koi payment nahi')}</Text>}
      </Card>

      <Card title={t('Kis unit me khareeda')} description={t('Pcs, carton, box, bori…')}>
        {d.units.length ? <Bars tone="info" rows={d.units.map((u) => ({ key: u.unit, label: u.unit, sub: t('{{count}} line', { count: u.lines }), value: u.value, right: money(u.value) }))} />
          : <Text size="sm" tone="muted">{t('Koi purchase nahi')}</Text>}
      </Card>

      <Card title={t('Hafte ke din')} description={t('Kis din zyada maal aata hai')}>
        <Bars rows={d.weekday.map((w) => ({ key: String(w.day), label: t(DAYS[w.day] ?? ''), sub: t('{{count}} bill', { count: w.bills }), value: w.value, right: money(w.value) }))} />
      </Card>

      <Card title={t('Khule orders')} description={d.openOrders.count ? t('{{count}} order · {{value}} ka maal aana baqi{{value2}}', { count: d.openOrders.count, value: money(d.openOrders.value), value2: d.openOrders.late ? t(' · {{late}} late', { late: d.openOrders.late }) : '' }) : undefined} flush>
        {d.openOrders.list.length ? d.openOrders.list.map((o) => (
          <ListRow key={o.id} title={`${o.number} · ${o.supplier}`} subtitle={o.expectedAt ? day(o.expectedAt) : undefined} icon={o.late ? AlertTriangle : undefined} iconTone="warning"
            trailing={<Text size="sm" weight="semibold" ltr>{money(o.value)}</Text>} chevron onPress={() => router.push(`/purchases/${o.id}` as never)} />
        )) : <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Koi khula order nahi')}</Text></View>}
      </Card>

      <Card title={t('Supplier ko lautaya maal')}>
        <Text size="sm">{d.returns.count ? `${d.returns.count} ${t('return')} · ${money(d.returns.total)}` : t('Koi return nahi')}</Text>
      </Card>
    </View>
  );
}

export function SupplierAnalyticsView() {
  const th = useTheme();
  const q = useQuery({ queryKey: [PUR, 'suppliers', 'summary'], queryFn: suppliersApi.summary, staleTime: 60_000 });
  const s = q.data;
  if (q.isLoading) return <SkeletonRows count={6} />;
  if (!s) return <ErrorState error={q.error} onRetry={q.refetch} />;
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" label={t('Kul dena hai')} value={formatPKR(s.totalOutstanding)} hint={t('{{suppliersWithDebt}} supplier', { suppliersWithDebt: s.suppliersWithDebt })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Is mahine purchase')} value={formatPKR(s.monthPurchases)}
          hint={t('{{value}} {{value2}}% pichle mahine se', { value: s.growthVsLastMonth >= 0 ? '▲' : '▼', value2: Math.abs(s.growthVsLastMonth).toFixed(0) })} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Is mahine diye')} value={formatPKR((s.monthLedgerPaid ?? 0) + (s.monthPaid ?? 0))} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Ausat bill')} value={formatPKR(s.avgOrderValue)} hint={t('{{activeSuppliers}} chalu supplier', { activeSuppliers: s.activeSuppliers })} />
      </Row>
      <Card title={t('12 mahine — purchase aur payment')}>
        <Bars rows={s.months12.map((m) => ({ key: m.month, label: m.label, sub: `${t('Diye')} ${formatPKR(m.paid)} · ${t('{{count}} bill', { count: m.count })}`, value: m.total, right: formatPKR(m.total) }))} />
      </Card>
      <Card title={t('Baqi kitna purana')} description={t('Aakhri payment ke hisaab se')}>
        {s.dueAging.some((b) => b.amount > 0)
          ? <Bars tone="danger" rows={s.dueAging.map((b) => ({ key: b.bucket, label: t(b.bucket), sub: t('{{count}} supplier', { count: b.count }), value: b.amount, right: formatPKR(b.amount) }))} />
          : <Text size="sm" tone="muted">{t('Kisi ka kuch baqi nahi')}</Text>}
      </Card>
      <Card title={t('Sab se zyada dena')} flush>
        {s.topDebtors.length ? s.topDebtors.map((d) => (
          <ListRow key={d.id} title={d.name} chevron onPress={() => router.push(`/suppliers/${d.id}` as never)}
            subtitle={d.daysSincePayment == null ? t('Kabhi payment nahi') : t('Aakhri payment {{daysSincePayment}} din pehle', { daysSincePayment: d.daysSincePayment })}
            trailing={<Text size="sm" weight="semibold" tone="danger" ltr>{formatPKR(d.outstandingDue)}</Text>} />
        )) : <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Kisi ka kuch baqi nahi')}</Text></View>}
      </Card>
      <Card title={t('Bare suppliers')} description={t('Ab tak ki kul purchase')}>
        {s.topSuppliers.length ? <Bars tone="info" rows={s.topSuppliers.slice(0, 10).map((x) => ({ key: x.supplierId, label: x.supplier?.name ?? '—', sub: x.outstanding > 0 ? t('Baqi {{outstanding}}', { outstanding: formatPKR(x.outstanding) }) : undefined, value: x.totalSpent, right: formatPKR(x.totalSpent), onPress: () => router.push(`/suppliers/${x.supplierId}` as never) }))} />
          : <Text size="sm" tone="muted">{t('Abhi koi purchase nahi')}</Text>}
      </Card>
      <Card title={t('Khamosh suppliers')} description={t('Kaafi din se maal nahi liya')} flush>
        {s.dormantSuppliers.length ? s.dormantSuppliers.map((d) => (
          <ListRow key={d.id} title={d.name} chevron onPress={() => router.push(`/suppliers/${d.id}` as never)}
            subtitle={d.daysSincePurchase == null ? t('Kabhi nahi') : t('{{daysSincePurchase}} din', { daysSincePurchase: d.daysSincePurchase })}
            trailing={d.outstandingDue > 0 ? <Text size="sm" tone="danger" ltr>{formatPKR(d.outstandingDue)}</Text> : undefined} />
        )) : <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Sab se maal aa raha hai')}</Text></View>}
      </Card>
      {s.cityBreakdown.length > 1 && (
        <Card title={t('Shehar')}>
          <Bars rows={s.cityBreakdown.map((c) => ({ key: c.city, label: c.city, sub: t('{{count}} supplier · {{totalPurchased}}', { count: c.count, totalPurchased: formatPKR(c.totalPurchased) }), value: c.totalPurchased, right: c.outstanding > 0 ? formatPKR(c.outstanding) : '' }))} />
        </Card>
      )}
    </View>
  );
}

