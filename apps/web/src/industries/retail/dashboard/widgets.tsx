/** Retail-only dashboard widgets. */

import { AlertTriangle, ArrowLeftRight, BookOpen, PackageX, RefreshCw, ShieldAlert, Target, TrendingUp } from 'lucide-react';
import { useOverview, useRetailAlerts } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { AttentionList, KpiStrip, type AttentionItem } from '@modules/dashboard/widgets';

export function RetailKpis() {
  const { data, isLoading } = useOverview();
  const { sales, cost, costHidden, salesHidden } = useMasked();
  const s = data?.stats;
  const growth = s?.salesGrowthVsYesterday ?? 0;
  return (
    <KpiStrip
      loading={isLoading}
      items={[
        {
          label: 'Aaj ki sales', icon: TrendingUp, value: sales(s?.salesToday),
          hint: salesHidden ? undefined : `${s?.ordersToday ?? 0} bill${growth ? ` · ${growth > 0 ? '+' : ''}${growth.toFixed(1)}% kal se` : ''}`,
          to: '/sales',
        },
        { label: 'Aaj ka munafa', icon: Target, tone: 'success', value: cost(s?.netProfitToday), hint: costHidden ? 'Cost lock hai' : 'Lagat nikal kar' },
        {
          label: 'Kam stock', icon: AlertTriangle, tone: 'warning', value: s?.lowStockCount ?? 0,
          hint: `${s?.outOfStockCount ?? 0} khatam`, to: '/low-stock', alert: (s?.outOfStockCount ?? 0) > 0,
        },
        { label: 'Udhaar', icon: BookOpen, tone: 'danger', value: cost(s?.totalUdhaar), hint: `${s?.customersWithUdhaar ?? 0} customers`, to: '/khata' },
      ]}
    />
  );
}

export function RetailAttention() {
  const { data } = useOverview();
  const { data: alerts = {} } = useRetailAlerts();
  const s = data?.stats;
  const items: AttentionItem[] = [];

  if (s?.outOfStockCount) items.push({ icon: PackageX, level: 'danger', text: `${s.outOfStockCount} cheezein khatam ho gayin — customer khali haath lautega`, to: '/products?filter=out', cta: 'Restock' });
  if (s?.lowStockCount) items.push({ icon: AlertTriangle, level: 'warning', text: `${s.lowStockCount} cheezein kam reh gayin — mangwane ka waqt`, to: '/products?filter=low', cta: 'Dekhein' });
  if (alerts.pendingReorders) items.push({ icon: RefreshCw, level: 'info', text: `${alerts.pendingReorders} reorder tayyar hain`, to: '/retail/reorders', cta: 'Reorder' });
  if (s?.pendingTransfers) items.push({ icon: ArrowLeftRight, level: 'info', text: `${s.pendingTransfers} transfer aane wale hain`, to: '/transfers', cta: 'Receive' });
  if (alerts.damagesToday) items.push({ icon: ShieldAlert, level: 'neutral', text: `Aaj ${alerts.damagesToday} damage darj hue`, to: '/retail/damage', cta: 'Damage log' });

  return <AttentionList items={items} />;
}
