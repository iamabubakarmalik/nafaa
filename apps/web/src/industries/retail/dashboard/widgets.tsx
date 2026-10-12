/** Retail-only "Aaj ka kaam" items; stock and transfer items come from the common list. */

import { RefreshCw, ShieldAlert } from 'lucide-react';
import { useRetailAlerts } from '@modules/dashboard/data/queries';
import type { AttentionItem } from '@modules/dashboard/widgets';

export function useRetailAttention(): AttentionItem[] {
  const { data: alerts = {} } = useRetailAlerts();
  const items: AttentionItem[] = [];
  if (alerts.pendingReorders) items.push({ icon: RefreshCw, level: 'info', text: `${alerts.pendingReorders} reorder tayyar hain`, to: '/low-stock', cta: 'Reorder' });
  if (alerts.damagesToday) items.push({ icon: ShieldAlert, level: 'neutral', text: `Aaj ${alerts.damagesToday} damage darj hue`, to: '/damage', cta: 'Damage log' });
  return items;
}
