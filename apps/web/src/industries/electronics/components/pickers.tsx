/**
 * Small search pickers for electronics forms: a product (name, SKU or
 * barcode) and a customer (name or phone). Both search the server as the
 * user types and pick with a click or Enter.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Package, Search, User, X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi, type Customer } from '@modules/customers/customers/api/customers.api';

function useDebounced(value: string, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value.trim()), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function Shell({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{label}</p>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const box = 'flex h-10 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20';

export function ProductPick({ label = 'Product', hint, value, onChange, exclude = [] }: {
  label?: string;
  hint?: string;
  value: Pick<Product, 'id' | 'name' | 'price'> | null;
  onChange: (p: Product | null) => void;
  /** Ids already chosen elsewhere in the form. */
  exclude?: string[];
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const search = useDebounced(q);
  const res = useQuery({
    queryKey: ['electronics-product-pick', search],
    queryFn: () => productsApi.list({ search, limit: 8, isActive: true }),
    enabled: open && search.length > 0,
    staleTime: 30_000,
  });
  const items = (res.data?.items ?? []).filter((p) => !exclude.includes(p.id));

  if (value) {
    return (
      <Shell label={label} hint={hint}>
        <div className={cn(box, 'justify-between')}>
          <span className="flex min-w-0 items-center gap-2"><Package className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate font-medium">{value.name}</span></span>
          <button type="button" onClick={() => onChange(null)} aria-label="Badlein" className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
      </Shell>
    );
  }
  return (
    <Shell label={label} hint={hint}>
      <div className="relative">
        <label className={box}>
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' && items[0]) { e.preventDefault(); onChange(items[0]); setQ(''); setOpen(false); } }}
            placeholder="Naam, SKU ya barcode…" className="min-w-0 flex-1 bg-transparent outline-none" />
          {res.isFetching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </label>
        {open && search && (
          <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200">
            {items.length === 0 && !res.isFetching && <li className="px-3 py-2 text-[0.8125rem] text-slate-500">Koi product nahi mila</li>}
            {items.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => { onChange(p); setQ(''); setOpen(false); }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[0.8125rem] hover:bg-slate-50">
                  <span className="min-w-0 truncate font-medium text-slate-900">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{formatPKR(p.price)} · {Number(p.stock) || 0} {p.unit}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

export function CustomerPick({ label = 'Customer', hint, value, onChange }: {
  label?: string;
  hint?: string;
  value: Pick<Customer, 'id' | 'name' | 'phone'> | null;
  onChange: (c: Customer | null) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const search = useDebounced(q);
  const res = useQuery({
    queryKey: ['electronics-customer-pick', search],
    queryFn: () => customersApi.list({ search, limit: 8, scope: 'all' }),
    enabled: open && search.length > 1,
    staleTime: 30_000,
  });
  const items = res.data?.items ?? [];

  if (value) {
    return (
      <Shell label={label} hint={hint}>
        <div className={cn(box, 'justify-between')}>
          <span className="flex min-w-0 items-center gap-2"><User className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate font-medium">{value.name}</span>{value.phone && <span className="text-slate-500">{value.phone}</span>}</span>
          <button type="button" onClick={() => onChange(null)} aria-label="Badlein" className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
      </Shell>
    );
  }
  return (
    <Shell label={label} hint={hint}>
      <div className="relative">
        <label className={box}>
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' && items[0]) { e.preventDefault(); onChange(items[0]); setQ(''); setOpen(false); } }}
            placeholder="Naam ya phone…" className="min-w-0 flex-1 bg-transparent outline-none" />
          {res.isFetching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </label>
        {open && search.length > 1 && (
          <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200">
            {items.length === 0 && !res.isFetching && <li className="px-3 py-2 text-[0.8125rem] text-slate-500">Koi customer nahi mila — neeche naam aur phone likh dein</li>}
            {items.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => { onChange(c); setQ(''); setOpen(false); }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[0.8125rem] hover:bg-slate-50">
                  <span className="min-w-0 truncate font-medium text-slate-900">{c.name}</span>
                  <span className="shrink-0 text-slate-500">{c.phone ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
