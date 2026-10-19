/**
 * Search pickers for meat pages: catalog items (the counter's offline
 * catalog), customers with their khata balance, and suppliers (beopari /
 * mandi). Each hands the picked record back.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package, Plus, Search, Truck, UserRound, X } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useProductCatalog, type PosItem } from '@modules/pos/engine';
import { customersApi, type Customer } from '@modules/customers/customers/api/customers.api';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { apiError, kg } from '../lib/meta';

const box = 'h-11 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-3 text-[0.9375rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500 aria-[invalid=true]:ring-rose-400';
const menu = 'absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-slate-200';
const row = 'flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-50';

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** The counter catalog, for pickers and name lookups. */
export function useMeatItems() {
  const { items, loading } = useProductCatalog();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  return { items: items.filter((i) => !i.hasVariants), byId, loading };
}

export function ItemPick({ onPick, placeholder = 'Item ka naam ya code…', exclude = [], error, autoFocus }: {
  onPick: (item: PosItem) => void;
  placeholder?: string;
  exclude?: string[];
  error?: string;
  autoFocus?: boolean;
}) {
  const { items } = useMeatItems();
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return [];
    const words = term.split(/\s+/);
    return items.filter((i) => !exclude.includes(i.id) && words.every((w) => [i.name, i.product.sku, i.product.barcode, i.categoryName].filter(Boolean).join(' ').toLowerCase().includes(w))).slice(0, 8);
  }, [items, term, exclude]);
  const pick = (i: PosItem) => { onPick(i); setQ(''); };
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-[1.375rem] h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-invalid={!!error} autoFocus={autoFocus}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) pick(matches[0]); } }} className={box} />
      {error && <p className="mt-1 text-[0.8125rem] font-medium text-rose-600">{error}</p>}
      {term && (
        <div className={menu}>
          {matches.map((i) => (
            <button key={i.id} type="button" onClick={() => pick(i)} className={row}>
              <Package className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-slate-900">{i.name}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">stock {kg(i.stock, i.unit)}</span>
              </span>
              <span className="text-[0.875rem] font-semibold tabular-nums text-slate-800">{formatPKR(i.price)}</span>
            </button>
          ))}
          {!matches.length && <p className="px-3 py-3 text-[0.8125rem] text-slate-500">Koi item nahi mila — pehle Maal me item banayein</p>}
        </div>
      )}
    </div>
  );
}

/** A picked item shown as a chip with a remove button. */
export function PickedChip({ icon: Icon = Package, title, sub, onClear }: { icon?: typeof Package; title: string; sub?: string; onClear?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
      <Icon className="h-5 w-5 shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{title}</span>
        {sub && <span className="block truncate text-[0.75rem] text-slate-500">{sub}</span>}
      </span>
      {onClear && <button type="button" onClick={onClear} aria-label="Hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>}
    </div>
  );
}

export type PickedCustomer = Pick<Customer, 'id' | 'name' | 'phone' | 'balance'> & { address?: string | null };

export function CustomerPick({ value, onChange, allowCreate = true, error }: {
  value: PickedCustomer | null;
  onChange: (c: PickedCustomer | null) => void;
  allowCreate?: boolean;
  error?: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const term = useDebounced(q.trim());
  const { data } = useQuery({
    queryKey: ['meat-customer-pick', term],
    queryFn: () => customersApi.list({ search: term, scope: 'all', limit: 8 }),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });
  const list = (data?.items ?? []) as Customer[];

  if (value) {
    const bal = Number(value.balance) || 0;
    return <PickedChip icon={UserRound} title={value.name} onClear={() => onChange(null)}
      sub={[value.phone, bal > 0 ? `Udhaar ${formatPKR(bal)}` : bal < 0 ? `Advance ${formatPKR(-bal)}` : 'Khata saaf'].filter(Boolean).join(' · ')} />;
  }

  const create = async () => {
    const name = q.trim();
    if (name.length < 2) { toast.error('Customer ka naam likhein'); return; }
    if (phone && !/^[0-9+\-\s]{10,15}$/.test(phone.trim())) { toast.error('Phone number theek likhein (03xx-xxxxxxx)'); return; }
    setBusy(true);
    try {
      const c = await customersApi.create({ name, phone: phone.trim() || undefined });
      qc.invalidateQueries({ queryKey: ['customers'] });
      onChange(c);
      setQ(''); setPhone('');
      toast.success(`${c.name} customer ban gaya`);
    } catch (e) { toast.error(apiError(e, 'Customer nahi bana')); } finally { setBusy(false); }
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-[1.375rem] h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Customer ka naam ya phone…" aria-invalid={!!error} className={box} />
      {error && <p className="mt-1 text-[0.8125rem] font-medium text-rose-600">{error}</p>}
      {q.trim().length >= 2 && (
        <div className={menu}>
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => { onChange(c); setQ(''); }} className={row}>
              <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-slate-900">{c.name}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{c.phone || 'Phone nahi'}</span>
              </span>
              {c.balance > 0 && <span className="text-[0.75rem] font-semibold tabular-nums text-amber-700">{formatPKR(c.balance)}</span>}
            </button>
          ))}
          {allowCreate && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-2">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (marzi)" inputMode="tel"
                className="h-9 min-w-0 flex-1 rounded-lg bg-slate-100 px-3 text-[0.8125rem] outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
              <button type="button" disabled={busy} onClick={create} className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                <Plus className="h-4 w-4" />"{q.trim()}" naya customer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export interface PickedSupplier { id: string; name: string; phone?: string | null }

export function SupplierPick({ value, onChange, error }: { value: PickedSupplier | null; onChange: (s: PickedSupplier | null) => void; error?: string }) {
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim());
  const { data } = useQuery({
    queryKey: ['meat-supplier-pick', term],
    queryFn: () => suppliersApi.list({ search: term || undefined, status: 'active', limit: 8 }),
    staleTime: 30_000,
  });
  const list = ((data as { items?: PickedSupplier[] } | undefined)?.items ?? []) as PickedSupplier[];
  if (value) return <PickedChip icon={Truck} title={value.name} sub={value.phone ?? undefined} onClear={() => onChange(null)} />;
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-[1.375rem] h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Beopari / mandi wala ka naam…" aria-invalid={!!error} className={box} />
      {error && <p className="mt-1 text-[0.8125rem] font-medium text-rose-600">{error}</p>}
      {q.trim().length >= 1 && (
        <div className={menu}>
          {list.map((s) => (
            <button key={s.id} type="button" onClick={() => { onChange(s); setQ(''); }} className={row}>
              <Truck className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-slate-900">{s.name}</span>
              <span className="text-[0.75rem] text-slate-500">{s.phone}</span>
            </button>
          ))}
          {!list.length && <p className="px-3 py-3 text-[0.8125rem] text-slate-500">Koi supplier nahi mila — Suppliers me naya banayein</p>}
        </div>
      )}
    </div>
  );
}
