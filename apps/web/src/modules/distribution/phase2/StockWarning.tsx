/**
 * Overbooking warning on the order desk: what the booked and approved orders
 * on screen need from their godown against free stock (stock less what other
 * orders and the counter hold). Shown only when something is short.
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Alert } from '@/design-system/components';
import { DIST_KEY } from '../api/distribution.api';
import { phase2Api } from '../api/phase2.api';
import { trim } from '../lib/meta';
import { t } from '@core/i18n';

export function StockWarning({ ids }: { ids: string[] }) {
  const key = [...ids].sort().join(',');
  const q = useQuery({
    queryKey: [DIST_KEY, 'stock-check', key],
    queryFn: () => phase2Api.stockCheck(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
  const short = (q.data?.lines ?? []).filter((l) => l.short > 0);
  if (!short.length) return null;
  const orders = (q.data?.orders ?? []).filter((o) => o.short).map((o) => o.orderNumber);
  return (
    <Alert tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>
      <div className="font-semibold">{t('Stock kam hai — {{count}} item in orders ke liye poora nahi', { count: short.length })}</div>
      <ul className="mt-1 space-y-0.5 text-[0.8125rem]">
        {short.slice(0, 5).map((l) => (
          <li key={`${l.shopId}:${l.productId}:${l.variantId ?? ''}`}>
            <b>{l.name}</b>{t(': chahiye {{need}} {{baseUnit}}, free {{free}}{{value}} — kam {{short}}', { need: trim(l.need), baseUnit: l.baseUnit, free: trim(l.free), value: l.reservedByOthers > 0 ? t(' ({{reservedByOthers}} doosre orders ke liye rakha)', { reservedByOthers: trim(l.reservedByOthers) }) : '', short: trim(l.short) })}
          </li>
        ))}
      </ul>
      <div className="mt-1 text-[0.75rem] text-slate-600">{t('Orders: {{value}}{{value2}}', { value: orders.slice(0, 8).join(', '), value2: orders.length > 8 ? ' …' : '' })}</div>
    </Alert>
  );
}
