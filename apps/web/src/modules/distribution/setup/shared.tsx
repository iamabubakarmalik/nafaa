/**
 * Pieces shared by the distribution setup screens (price lists, routes,
 * schemes, settings): query keys, a debounced value, pick chips, weekday
 * names and the customer roster used for assigning lists and routes.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { customersApi, type Customer } from '@modules/customers/customers/api/customers.api';
import { DIST_KEY } from '../api/distribution.api';

export type RosterCustomer = Customer;

export const PRICE_LISTS_KEY = [DIST_KEY, 'price-lists'] as const;
export const ROUTES_KEY = [DIST_KEY, 'routes'] as const;
export const SCHEMES_KEY = [DIST_KEY, 'schemes'] as const;

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Every customer with route and price list, for the assign screens (pages of 500). */
export function useCustomerRoster(enabled = true) {
  const can = usePermission(PERMISSIONS.CUSTOMERS_VIEW);
  return useQuery({
    queryKey: [DIST_KEY, 'roster'],
    queryFn: async () => {
      const out: RosterCustomer[] = [];
      for (let page = 1; page <= 20; page++) {
        const r = await customersApi.list({ scope: 'all', limit: 500, page });
        out.push(...r.items);
        if (out.length >= (r.meta?.total ?? 0) || !r.items.length) break;
      }
      return out;
    },
    enabled: enabled && can,
    staleTime: 60_000,
  });
}

/** Toggle chips; nothing picked reads as "any". */
export function PickChips({ label, items, picked, onChange, anyText = 'koi bhi' }: {
  label: string; items: Array<{ value: string; label: string }>; picked: string[]; onChange: (v: string[]) => void; anyText?: string;
}) {
  return (
    <div>
      <div className="mb-1 text-[0.75rem] font-semibold text-slate-600">{label} <span className="font-normal text-slate-400">{picked.length ? `· ${picked.length} chune` : `· ${anyText}`}</span></div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x) => {
          const on = picked.includes(x.value);
          return (
            <button key={x.value} type="button" aria-pressed={on} onClick={() => onChange(on ? picked.filter((p) => p !== x.value) : [...picked, x.value])}
              className={cn('rounded-lg border px-2.5 py-1 text-xs font-semibold transition', on ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {x.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "2 + 5" style number field that keeps the typed text (empty allowed). */
export const num = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
