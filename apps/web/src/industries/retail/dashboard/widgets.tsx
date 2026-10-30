/** Retail-only "Aaj ka kaam" items; stock and transfer items come from the common list. */

import { RefreshCw, ShieldAlert } from 'lucide-react';
import { useRetailAlerts } from '@modules/dashboard/data/queries';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { t } from '@core/i18n';

export function useRetailAttention(): AttentionItem[] {
  const { data: alerts = {} } = useRetailAlerts();
  const items: AttentionItem[] = [];
  if (alerts.pendingReorders) items.push({ icon: RefreshCw, level: 'info', text: t('{{pendingReorders}} reorder tayyar hain', { pendingReorders: alerts.pendingReorders }), to: '/low-stock', cta: t('Reorder') });
  if (alerts.damagesToday) items.push({ icon: ShieldAlert, level: 'neutral', text: t('Aaj {{damagesToday}} damage darj hue', { damagesToday: alerts.damagesToday }), to: '/damage', cta: t('Damage log') });
  return items;
}
