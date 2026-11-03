/**
 * Mobile shop dashboard (web mobile/dashboard): IMEI stock and PTA, repairs by
 * stage with what is ready to hand back, installments that are late, used
 * phones and profit by source. Last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, BarChart3, CheckCircle2, CreditCard, Plus, Receipt, RotateCcw, ShieldCheck, ShoppingCart, Smartphone, Wrench } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Card, ListRow, Text, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { emiApi, imeiApi, mobileReportsApi, repairsApi, usedPhonesApi } from '../api';
import { useShopId } from '../components/kit';

const n = (v: unknown) => Number(v || 0);
const MINUTE = 60_000;
const count = (rows: Array<{ status: string; count: number }> | undefined, ...keys: string[]) => (rows ?? []).filter((r) => keys.includes(r.status)).reduce((x, r) => x + n(r.count), 0);

export function MobileDashboardScreen() {
  const th = useTheme();
  const can = usePermission();
  const shopId = useShopId();
  const { cost } = useCostMask();
  const imei = useQuery({ queryKey: ['imei-stats', shopId], queryFn: () => imeiApi.stats(shopId ?? undefined).catch(() => null), refetchInterval: MINUTE });
  const rep = useQuery({ queryKey: ['repair-stats', shopId], queryFn: () => repairsApi.stats(shopId ?? undefined).catch(() => null), refetchInterval: MINUTE });
  const used = useQuery({ queryKey: ['used-phones-stats'], queryFn: () => usedPhonesApi.stats().catch(() => null), refetchInterval: MINUTE });
  const emi = useQuery({ queryKey: ['emi-stats'], queryFn: () => emiApi.stats().catch(() => null), refetchInterval: MINUTE });
  const ready = useQuery({ queryKey: ['repair-tickets', 'dashboard-ready'], queryFn: () => repairsApi.list({ status: 'READY', limit: 6 }).then((r) => r.items).catch(() => []), refetchInterval: MINUTE });
  const late = useQuery({ queryKey: ['emi-plans', 'dashboard-overdue'], queryFn: () => emiApi.list({ status: 'ACTIVE', filter: 'ONLY_OVERDUE', limit: 6 }).then((r) => r.items).catch(() => []), refetchInterval: 5 * MINUTE });
  const range = useMemo(() => { const to = new Date(); return { from: new Date(to.getTime() - 30 * 86_400_000).toISOString(), to: to.toISOString() }; }, []);
  const src = useQuery({ queryKey: ['mobile-profit-by-source', '30d', 'dashboard'], queryFn: () => mobileReportsApi.profitBySource(range).catch(() => null), staleTime: 5 * MINUTE, enabled: can(P.COST_VIEW) });

  const s = imei.data;
  const nonPta = (s?.byPta ?? []).filter((p) => p.ptaStatus === 'NON_PTA' || p.ptaStatus === 'PENDING').reduce((x, p) => x + n(p.count), 0);
  const r = rep.data;
  const open = r?.openTickets ?? 0;
  const readyN = count(r?.byStatus, 'READY');
  const approval = count(r?.byStatus, 'AWAITING_APPROVAL');
  const parts = count(r?.byStatus, 'AWAITING_PARTS');
  const e = emi.data;
  const u = used.data;
  const inspection = u?.byStatus?.find((b) => b.status === 'PENDING_INSPECTION')?.count ?? 0;

  const attention: DashAttention[] = [];
  if (e?.overdueCount) attention.push({ icon: AlertTriangle, tone: 'danger', text: t('{{count}} customer ki qist late hai — {{amount}}', { count: e.overdueCount, amount: formatMoney(n(e.overdueAmount)) }), href: '/mobile/emi' });
  if (readyN) attention.push({ icon: CheckCircle2, tone: 'warning', text: t('{{count}} repair tayyar hain — customer ko call karein', { count: readyN }), href: '/mobile/repairs' });
  if (approval) attention.push({ icon: Wrench, tone: 'info', text: t('{{count}} job me customer ki haan baqi hai', { count: approval }), href: '/mobile/repairs' });
  if (parts) attention.push({ icon: Wrench, tone: 'info', text: t('{{count}} job part ke intezar me hain', { count: parts }), href: '/mobile/repairs' });
  if (r?.late) attention.push({ icon: AlertTriangle, tone: 'warning', text: t('{{count}} repair late hain', { count: r.late }), href: '/mobile/repairs' });
  if (nonPta) attention.push({ icon: ShieldCheck, tone: 'warning', text: t('{{count}} phone Non-PTA ya PTA baqi — bechte waqt customer ko batayein', { count: nonPta }), href: '/mobile/imei' });
  if (inspection) attention.push({ icon: Smartphone, tone: 'info', text: t('{{count}} used phone ka check baqi hai', { count: inspection }), href: '/mobile/used-phones' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/mobile/imei', icon: ShieldCheck, label: t('IMEI stock'), hint: t('{{count}} phone', { count: s?.inStock ?? 0 }), show: can(P.MOBILE_IMEI_VIEW) },
    { href: '/mobile/repairs/new', icon: Plus, label: t('Naya job'), hint: t('Repair'), show: can(P.MOBILE_REPAIRS_MANAGE) },
    { href: '/mobile/repairs', icon: Wrench, label: t('Repairs'), hint: readyN ? t('{{count}} tayyar', { count: readyN }) : t('{{count}} khule', { count: open }), show: can(P.MOBILE_REPAIRS_VIEW) },
    { href: '/mobile/emi', icon: CreditCard, label: t('Kist (EMI)'), hint: e?.overdueCount ? t('{{count}} late', { count: e.overdueCount }) : t('Chal rahe'), show: can(P.KHATA_VIEW) },
    { href: '/mobile/used-phones', icon: RotateCcw, label: t('Used phone'), hint: t('{{count}} stock me', { count: u?.byStatus?.find((b) => b.status === 'IN_STOCK')?.count ?? 0 }), show: can(P.MOBILE_IMEI_VIEW) },
    { href: '/products', icon: Smartphone, label: t('Products'), hint: t('Phone aur accessories'), show: can(P.PRODUCTS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sales history'), hint: t('Purani receipts'), show: can(P.SALES_VIEW) },
    { href: '/mobile/reports', icon: BarChart3, label: t('Reports'), hint: t('Mobile hisaab'), show: can(P.REPORTS_VIEW) },
  ];

  return (
    <PackDashboard title={t('Mobile shop')} refreshing={false} onRefresh={() => { void imei.refetch(); void rep.refetch(); void emi.refetch(); void used.refetch(); void ready.refetch(); void late.refetch(); }}
      stats={[
        { label: t('Phone stock'), value: String(s?.inStock ?? 0) }, { label: t('Repair khule'), value: String(open) }, { label: t('Qist late'), value: String(e?.overdueCount ?? 0) },
      ]} attention={attention} actions={actions}>
      <OfflineNote feature="mobileDesk" />
      <CachedNote query={imei} />
      {can(P.MOBILE_REPAIRS_VIEW) && (ready.data ?? []).length > 0 && (
        <Card flush title={t('Tayyar — customer ko dena hai')} description={t('{{amount}} lene hain', { amount: formatMoney(n(r?.readyDue)) })}>
          {(ready.data ?? []).map((tk, i, a) => (
            <ListRow key={tk.id} divider={i < a.length - 1} icon={CheckCircle2} iconTone="success" title={`${tk.deviceBrand} ${tk.deviceModel}`} subtitle={`${tk.customerName} · ${tk.ticketNumber}`}
              trailing={<Text weight="semibold" size="sm" ltr>{formatMoney(n(tk.balanceDue))}</Text>} onPress={() => router.push(`/mobile/repairs/${tk.id}` as never)} />
          ))}
        </Card>
      )}
      {can(P.KHATA_VIEW) && (late.data ?? []).length > 0 && (
        <Card flush title={t('Late qist wale')} description={e ? t('Is mahine mila {{amount}}', { amount: cost(n(e.collectedThisMonth)) }) : undefined}>
          {(late.data ?? []).map((p, i, a) => (
            <ListRow key={p.id} divider={i < a.length - 1} icon={AlertTriangle} iconTone="danger" title={p.customerName} subtitle={`${p.planNumber}${p.nextDueDate ? ` · ${formatDate(p.nextDueDate)}` : ''}`}
              trailing={<Text weight="semibold" size="sm" tone="danger" ltr>{formatMoney(n(p.overdueAmount))}</Text>} onPress={() => router.push(`/mobile/emi/${p.id}` as never)} />
          ))}
        </Card>
      )}
      {can(P.COST_VIEW) && src.data && src.data.sources.length > 0 && (
        <Card flush title={t('Kamai ka rasta')} description={t('30 din ka profit')}>
          {src.data.sources.map((x, i, a) => <ListRow key={`${x.key}-${i}`} divider={i < a.length - 1} title={t(x.label)} subtitle={t('{{n}} sale', { n: x.sales })} trailing={<Text weight="bold" ltr>{cost(x.profit)}</Text>} />)}
        </Card>
      )}
      <View style={{ height: th.space(1) }} />
    </PackDashboard>
  );
}
