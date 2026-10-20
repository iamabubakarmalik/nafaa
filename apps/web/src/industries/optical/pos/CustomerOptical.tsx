/**
 * Bill panel block for the chosen customer: their latest nuskha and any
 * glasses ready to hand over, with links to make an order or deliver.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Eye, Glasses } from 'lucide-react';
import { lensOrdersApi } from '../api/lens-orders.api';
import { prescriptionsApi } from '../api/prescriptions.api';
import { OPTICAL_KEYS, powerSummary } from '../lib/meta';

export function CustomerOptical({ customerId }: { customerId?: string | null }) {
  const rx = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'customer', customerId], queryFn: () => prescriptionsApi.byCustomer(customerId!), enabled: !!customerId, staleTime: 60_000 });
  const ready = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'customer-ready', customerId], queryFn: () => lensOrdersApi.page({ view: 'ready', customerId: customerId!, limit: 5 }), enabled: !!customerId, staleTime: 60_000 });
  if (!customerId) return null;
  const latest = (rx.data ?? []).find((r) => r.isActive && !r.computed?.isExpired);
  const orders = ready.data?.items ?? [];
  if (!latest && !orders.length) return null;
  return (
    <div className="space-y-1.5 text-[0.75rem]">
      {orders.map((o) => (
        <Link key={o.id} to={`/optical/lens-orders/${o.id}`} className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
          <CheckCircle2 className="h-3.5 w-3.5" />Chashma tayyar: {o.orderNumber}{o.remainingAmount > 0 ? ` · Rs ${o.remainingAmount} baqi` : ''}
        </Link>
      ))}
      {latest && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-700"><Eye className="h-3.5 w-3.5 shrink-0" /><span className="truncate font-mono">{powerSummary(latest) || latest.prescriptionNumber}</span></span>
          <Link to={`/optical/lens-orders/new?rx=${latest.id}`} className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand-700 hover:underline"><Glasses className="h-3.5 w-3.5" />Order</Link>
        </div>
      )}
    </div>
  );
}
