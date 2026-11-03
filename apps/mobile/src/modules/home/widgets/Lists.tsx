/**
 * List widgets (web widgets/TopProducts, SlowMovers, LowStock, RecentSales)
 * on GET /dashboard/lists, with the web's period, sort and filter choices.
 */

import { AlertTriangle, Package, PackageX, Receipt, TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';
import { formatDate, formatMoney, formatQty, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, ListRow, Segmented, Text } from '@/design';
import { useDashboardList, type LowList, type RecentList, type SlowList, type TopList } from '../api/dashboard';
import { EmptyLine, METHOD_LABEL, Money, WidgetCard, WidgetSkeleton, useWidgetState } from '../components/parts';
import { MASK, useMasked } from '../lib/privacy';

const LIMIT = 5;
const Loading = () => <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}><WidgetSkeleton height={160} /></View>;

export function TopProducts() {
  const [s, set] = useWidgetState('top-products', { days: '30', sort: 'revenue' });
  const { costHidden } = useMasked();
  const sort = costHidden && s.sort === 'profit' ? 'revenue' : s.sort;
  const q = useDashboardList<TopList>({ kind: 'top', days: s.days, sort, limit: LIMIT });
  const items = q.data?.items ?? [];
  return (
    <WidgetCard title={t('Sab se zyada bika')} description={t('Is mahine ki top cheezein')} href="/reports" flush
      controls={<>
        <Segmented size="sm" value={s.days} onChange={(days) => set({ days })} options={[{ value: '1', label: t('Aaj') }, { value: '7', label: t('7 din') }, { value: '30', label: t('30 din') }]} />
        <Segmented size="sm" value={sort} onChange={(v) => set({ sort: v })} options={[{ value: 'revenue', label: t('Amount') }, { value: 'qty', label: t('Qty') }, ...(costHidden ? [] : [{ value: 'profit' as const, label: t('Profit') }])]} />
      </>}>
      {q.isLoading && !q.data ? <Loading /> : !items.length ? <EmptyLine text={t('Is period me koi sale nahi')} /> : items.map((p, i) => (
        <ListRow key={`${p.id}-${i}`} dense divider={i < items.length - 1} icon={TrendingUp} iconTone={i === 0 ? 'success' : 'brand'} title={p.name}
          subtitle={t('{{qty}} {{unit}} · {{bills}} bill{{value}}', { qty: formatQty(p.qty), unit: p.unit, bills: p.bills, value: '' })}
          trailing={sort === 'profit' ? <Money value={p.profit} kind="cost" weight="bold" /> : sort === 'qty' ? <Text weight="bold" ltr>{formatQty(p.qty)}</Text> : <Money value={p.revenue} weight="bold" />}
          onPress={() => router.push(`/products/${p.id}` as never)} />
      ))}
    </WidgetCard>
  );
}

export function SlowMovers() {
  const [s, set] = useWidgetState('slow-movers', { days: '30', sort: 'value' });
  const { costHidden } = useMasked();
  const q = useDashboardList<SlowList>({ kind: 'slow', days: s.days, sort: s.sort, limit: LIMIT });
  const d = q.data;
  return (
    <WidgetCard title={t('Atka hua maal')} flush
      description={d && d.total ? t('{{total}} cheezein {{days}} din se nahi biki · {{totalValue}} ka maal', { total: d.total, days: s.days, totalValue: costHidden ? MASK : formatMoney(d.totalValue) }) : t('30 din se na bikne wali cheezein')}
      controls={<>
        <Segmented size="sm" value={s.days} onChange={(days) => set({ days })} options={[{ value: '30', label: t('30 din se') }, { value: '60', label: t('60 din se') }, { value: '90', label: t('90 din se') }]} />
        <Segmented size="sm" value={s.sort} onChange={(sort) => set({ sort })} options={[{ value: 'value', label: t('Maal ki qeemat') }, { value: 'stock', label: t('Stock ginti') }]} />
      </>}>
      {q.isLoading && !d ? <Loading /> : !d?.items.length ? <EmptyLine text={t('Shabash — sab maal chal raha hai')} /> : d.items.map((p, i) => (
        <ListRow key={`${p.id}-${i}`} dense divider={i < d.items.length - 1} icon={Package} iconTone="warning" title={p.name}
          subtitle={p.lastSoldAt ? t('aakhri sale {{lastSoldAt}}', { lastSoldAt: formatDate(p.lastSoldAt) }) : t('kabhi nahi bika')}
          trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="semibold" ltr>{`${formatQty(p.stock)} ${p.unit ?? ''}`.trim()}</Text><Money value={p.value} kind="cost" size="2xs" tone="muted" /></View>}
          onPress={() => router.push(`/products/${p.id}` as never)} />
      ))}
    </WidgetCard>
  );
}

export function LowStock() {
  const [s, set] = useWidgetState('low-stock', { filter: 'all' });
  const q = useDashboardList<LowList>({ kind: 'low', filter: s.filter, limit: LIMIT });
  const d = q.data;
  return (
    <WidgetCard title={t('Kam stock')} href="/low-stock" flush
      description={d && d.total ? t('{{total}} cheezein · {{outCount}} khatam — {{hint}}', { total: d.total, outCount: d.outCount, hint: t('dobara mangwane ka waqt') }) : undefined}
      controls={<Segmented size="sm" value={s.filter} onChange={(filter) => set({ filter })} options={[{ value: 'all', label: t('Sab') }, { value: 'low', label: t('Sirf kam') }, { value: 'out', label: t('Sirf khatam') }]} />}>
      {q.isLoading && !d ? <Loading /> : !d?.items.length ? <EmptyLine text={t('Sab cheezein poori hain')} /> : d.items.map((p, i) => {
        const out = p.stock <= 0;
        return (
          <ListRow key={`${p.id}-${i}`} dense divider={i < d.items.length - 1} icon={out ? PackageX : AlertTriangle} iconTone={out ? 'danger' : 'warning'} title={p.name}
            subtitle={t('{{stock}} {{unit}} baqi · alert {{lowStockAlert}}{{value}}', { stock: formatQty(p.stock), unit: p.unit, lowStockAlert: formatQty(p.lowStockAlert), value: '' })}
            trailing={<Badge tone={out ? 'danger' : 'warning'}>{out ? t('Khatam') : t('Kam')}</Badge>}
            onPress={() => router.push(`/products/${p.id}` as never)} />
        );
      })}
    </WidgetCard>
  );
}

export function RecentSales() {
  const [s, set] = useWidgetState('recent-sales', { method: '' });
  const { salesHidden } = useMasked();
  const q = useDashboardList<RecentList>({ kind: 'recent', method: s.method, limit: LIMIT });
  const items = q.data?.items ?? [];
  return (
    <WidgetCard title={t('Haaliya sale')} description={t('Aakhri bill')} href="/sales" flush
      controls={<Segmented size="sm" value={s.method} onChange={(method) => set({ method })} options={[{ value: '', label: t('Sab payments') }, { value: 'CASH', label: t('Cash') }, { value: 'JAZZCASH', label: 'JazzCash' }, { value: 'EASYPAISA', label: 'Easypaisa' }]} />}>
      {q.isLoading && !q.data ? <Loading /> : !items.length ? <EmptyLine text={t('Abhi koi bill nahi bana')} /> : items.map((r, i) => (
        <ListRow key={`${r.id}-${i}`} dense divider={i < items.length - 1} icon={Receipt} iconTone={r.credit > 0 ? 'warning' : 'success'}
          title={r.customer ?? t('Walk-in')}
          subtitle={`${r.saleNumber} · ${formatRelative(r.soldAt)} · ${t(METHOD_LABEL[r.method] ?? r.method)}`}
          trailing={<View style={{ alignItems: 'flex-end' }}><Money value={r.total} weight="bold" />{r.credit > 0 && <Text size="2xs" tone="warning" weight="semibold">{salesHidden ? t('Udhaar') : t('{{credit}} udhaar', { credit: formatMoney(r.credit) })}</Text>}</View>}
          onPress={() => router.push(`/sales/${r.id}` as never)} />
      ))}
    </WidgetCard>
  );
}
