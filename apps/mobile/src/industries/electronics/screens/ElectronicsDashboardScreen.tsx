/**
 * Electronics dashboard (web electronics/dashboard): serials on the shelf,
 * warranty claims waiting, warranties ending soon, brand sales and the units
 * that came in last. Last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Barcode, Building2, Layers, Plus, Receipt, Recycle, Shield, ShoppingCart, Wrench } from 'lucide-react-native';
import { useMemo } from 'react';
import { daysSince } from '@nafaa/core/industries/electronics';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Card, HBarList, ListRow, Text } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { electronicsDashboardApi, serialTrackingApi, warrantyClaimsApi } from '../api';
import { claimStage, metaText } from '../meta';

const MINUTE = 60_000;
const OPEN = new Set(['ACTIVE', 'CLAIMED', 'IN_REPAIR']);
interface Overview { totals?: { totalSerials: number; activeBundles: number }; inventory?: { inStock: number; sold: number; defective: number }; warranty?: { expiringWarranties: number }; topBrands?: Array<{ id: string; name: string; totalRevenue: number; unitsSold: number }> }

export function ElectronicsDashboardScreen() {
  const can = usePermission();
  const { cost } = useCostMask();
  const overview = useQuery({ queryKey: ['electronics-dashboard-overview'], queryFn: () => (electronicsDashboardApi.overview() as Promise<Overview>).catch(() => ({} as Overview)), refetchInterval: MINUTE });
  const summary = useQuery({ queryKey: ['warranty-claims-summary'], queryFn: () => warrantyClaimsApi.summary().catch(() => null), refetchInterval: 5 * MINUTE });
  const claims = useQuery({ queryKey: ['warranty-claims-list'], queryFn: () => warrantyClaimsApi.list({}).catch(() => []), refetchInterval: 5 * MINUTE });
  const serials = useQuery({ queryKey: ['recent-serials'], queryFn: () => serialTrackingApi.list({ status: 'IN_STOCK' }).catch(() => []), refetchInterval: MINUTE });
  const o = overview.data;
  const s = summary.data;
  const open = useMemo(() => (claims.data ?? []).filter((c) => OPEN.has(c.status)).map((c) => ({ ...c, age: Math.max(daysSince(c.claimDate), 0) })).sort((a, b) => b.age - a.age), [claims.data]);
  const recent = useMemo(() => [...(serials.data ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5), [serials.data]);
  const stale = open.filter((c) => c.age >= 7).length;
  const expiring = o?.warranty?.expiringWarranties ?? 0;
  const inStock = o?.inventory?.inStock ?? serials.data?.length ?? 0;

  const attention: DashAttention[] = [];
  if (stale) attention.push({ icon: AlertTriangle, tone: 'danger', text: t('{{count}} claim hafte se zyada purane hain', { count: stale }), href: '/electronics/warranty-claims' });
  if (s?.pending) attention.push({ icon: Wrench, tone: 'warning', text: t('{{count}} claim par kaam baqi hai', { count: s.pending }), href: '/electronics/warranty-claims' });
  if (expiring) attention.push({ icon: Shield, tone: 'info', text: t('{{count}} units ki warranty 30 din me khatam hogi', { count: expiring }), href: '/electronics/serials' });
  if (o?.inventory?.defective) attention.push({ icon: Barcode, tone: 'warning', text: t('{{count}} unit kharab hain', { count: o.inventory.defective }), href: '/electronics/serials' });
  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/electronics/serials', icon: Barcode, label: t('Serial / IMEI'), hint: t('{{count}} stock mein', { count: inStock }), show: can(P.ELECTRONICS_SERIALS_VIEW) },
    { href: '/electronics/warranty-claims', icon: Shield, label: t('Warranty claims'), hint: s?.pending ? t('{{count}} khule', { count: s.pending }) : t('Koi nahi'), show: can(P.ELECTRONICS_WARRANTY_VIEW) },
    { href: '/electronics/bundles', icon: Layers, label: t('Bundles'), hint: t('{{count}} chalu', { count: o?.totals?.activeBundles ?? 0 }), show: can(P.PRODUCTS_VIEW) },
    { href: '/products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/sales', icon: Receipt, label: t('Sales history'), hint: t('Purani receipts'), show: can(P.SALES_VIEW) },
  ];
  return (
    <PackDashboard title={t('Electronics')} refreshing={false} onRefresh={() => { void overview.refetch(); void summary.refetch(); void claims.refetch(); void serials.refetch(); }}
      stats={[{ label: t('Unit stock mein'), value: String(inStock) }, { label: t('Claim khule'), value: String(s?.pending ?? open.length) }, { label: t('Warranty khatam hone wali'), value: String(expiring) }]}
      attention={attention} actions={actions}>
      <OfflineNote feature="electronicsDesk" />
      <CachedNote query={overview} />
      {can(P.ELECTRONICS_WARRANTY_VIEW) && open.length > 0 && (
        <Card flush title={t('Claims jo khule hain')} description={s ? t('Dukaan ka kharcha {{n}}', { n: cost(s.cost.shopBore) }) : undefined}>
          {open.slice(0, 6).map((c, i, a) => (
            <ListRow key={c.id} divider={i < a.length - 1} icon={Wrench} iconTone={c.age >= 7 ? 'danger' : 'warning'} title={c.productName} subtitle={`${c.claimNumber} · ${c.customerName}`}
              trailing={<Text size="xs" tone={c.age >= 7 ? 'danger' : 'muted'}>{t('{{n}} din', { n: c.age })}</Text>} onPress={() => router.push({ pathname: '/electronics/warranty-claims', params: { q: c.claimNumber } } as never)} />
          ))}
        </Card>
      )}
      {(o?.topBrands ?? []).length > 0 && <Card title={t('Brands ki sale')}><HBarList rows={(o?.topBrands ?? []).slice(0, 5).map((b) => ({ key: b.id, label: b.name, value: b.totalRevenue, display: formatMoney(b.totalRevenue), hint: t('{{n}} unit', { n: b.unitsSold }) }))} /></Card>}
      {can(P.ELECTRONICS_SERIALS_VIEW) && recent.length > 0 && (
        <Card flush title={t('Abhi aaye units')}>
          {recent.map((u, i, a) => <ListRow key={u.id} divider={i < a.length - 1} icon={Barcode} title={<Text ltr weight="semibold">{u.serialNumber}</Text>} subtitle={u.product?.name} trailing={<Text size="2xs" tone="muted">{formatDate(u.createdAt)}</Text>} />)}
        </Card>
      )}
    </PackDashboard>
  );
}
