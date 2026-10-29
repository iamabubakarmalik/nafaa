/**
 * "Sab se behtar courier" for an order: the shop's own delivered share and
 * average charge per courier for the customer's city (all cities when the
 * city has few parcels). A small hint inside the courier pickers.
 */

import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { orderMoneyApi } from '../../api/order-money.api';
import { courierBrand, rs } from '../../lib/labels';

export function CourierHint({ orderId, current, pickable, onPick }: {
  orderId: string;
  current?: string;
  /** Couriers the picker can switch to; others are only described. */
  pickable?: string[];
  onPick?: (code: string) => void;
}) {
  const { data } = useQuery({ queryKey: ['courier-suggest', orderId], queryFn: () => orderMoneyApi.courierSuggest(orderId), staleTime: 10 * 60_000 });
  const best = data?.couriers.find((c) => c.best);
  if (!data || !best) return null;
  const where = data.basis === 'CITY' && data.city ? `${data.city} me` : 'aap ke sab shehron me';
  const others = data.couriers.filter((c) => c.code !== best.code && c.delivered + c.returned >= 3).slice(0, 2);
  return (
    <div className="rounded-xl bg-brand-50/60 px-3 py-2 text-[0.75rem] text-slate-700 ring-1 ring-brand-100">
      <div className="flex flex-wrap items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
        <span className="font-semibold text-slate-900">Sab se behtar:</span>
        <BrandLogo name={courierBrand(best.code)} size={16} />
        <span className="font-semibold">{best.name}</span>
        <span className="text-slate-600">— {where} {best.successRate}% deliver{best.avgCharge ? ` · ausat ${rs(best.avgCharge)}` : ''} ({best.delivered + best.returned} parcel)</span>
        {onPick && best.code !== current && (!pickable || pickable.includes(best.code)) && (
          <button type="button" onClick={() => onPick(best.code)} className="ml-auto font-semibold text-brand-700 hover:underline">Ye chunein</button>
        )}
      </div>
      {others.length > 0 && (
        <div className="mt-0.5 pl-5 text-[0.6875rem] text-slate-500">
          {others.map((c) => `${c.name} ${c.successRate}%${c.avgCharge ? ` · ${rs(c.avgCharge)}` : ''}`).join('  ·  ')}
        </div>
      )}
    </div>
  );
}
