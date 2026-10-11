/** Retail-only dashboard widgets. */

import { AlertTriangle, ArrowLeftRight, PackageX, RefreshCw, ShieldAlert } from 'lucide-react';
import { useOverview, useRetailAlerts } from '@modules/dashboard/data/queries';
import { AttentionList, type AttentionItem } from '@modules/dashboard/widgets';

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
