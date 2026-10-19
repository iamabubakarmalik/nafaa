/**
 * Bill panel block: normal or restaurant rate for items added next (a
 * customer with a wholesale account switches to it on its own), the
 * account's udhaar and limit, and a link to orders ready for hand-over.
 */

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Package, Store } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { wholesaleApi } from '../api/wholesale.api';
import { weightOrdersApi } from '../api/weight-orders.api';
import { KEYS } from '../lib/meta';
import { saleListener, setRateMode, useRateMode, type RateMode } from './rateMode';

export function CounterRate({ customerId }: { customerId?: string | null }) {
  const mode = useRateMode();
  const account = useQuery({
    queryKey: [KEYS.wholesale, 'by-customer', customerId],
    queryFn: () => wholesaleApi.byCustomer(customerId!).catch(() => null),
    enabled: !!customerId,
    staleTime: 60_000,
  });
  const ready = useQuery({
    queryKey: [KEYS.orders, 'ready-count'],
    queryFn: () => weightOrdersApi.page({ tab: 'ready', limit: 1 }).then((r) => r.counts.ready).catch(() => 0),
    staleTime: 60_000,
  });
  const acc = account.data?.isActive ? account.data : null;

  // A restaurant account picks its rate once when chosen; the cashier can still switch back.
  const seen = useRef<string | null>(null);
  useEffect(() => {
    const id = acc?.id ?? null;
    if (id && seen.current !== id) setRateMode('wholesale');
    if (!customerId && seen.current) setRateMode('retail');
    seen.current = id;
  }, [acc?.id, customerId]);

  useEffect(() => {
    saleListener.current = () => setRateMode('retail');
    return () => { saleListener.current = null; };
  }, []);

  return (
    <div className="space-y-1.5">
      <Segmented<RateMode> label="Rate" value={mode} onChange={setRateMode} className="w-full [&>button]:flex-1"
        items={[
          { value: 'retail', label: <span className="inline-flex items-center gap-1.5"><Store className="h-3.5 w-3.5" />Aam rate</span> },
          { value: 'wholesale', label: <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Restaurant rate</span> },
        ]} />
      {mode === 'wholesale' && (
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
          Ab jo item dalenge un par wholesale rate lagega (jis item par likha hai). Pehle se dali lines ka rate nahi badalta. Bill ke baad wapas aam rate.
        </p>
      )}
      {acc && (
        <p className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[0.75rem] text-slate-700 ring-1 ring-slate-200">
          {acc.businessName} · {acc.accountNumber} — udhaar {formatPKR(acc.totalOutstanding)}
          {acc.creditLimit > 0 ? ` / had ${formatPKR(acc.creditLimit)}` : ''}
        </p>
      )}
      {!!ready.data && (
        <Link to="/meat/weight-orders?tab=ready" className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[0.75rem] font-semibold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100">
          <Package className="h-3.5 w-3.5" />{ready.data} order tayyar — bill bana kar dein
        </Link>
      )}
    </div>
  );
}
