/**
 * Pickers shared by the phase 2 screens (vans, market returns): a customer
 * search over the roster and an item search over the booker catalog that
 * hands back the product, variant and its packs.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserRound } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { DIST_KEY, distributionApi, type BootProduct } from '../api/distribution.api';
import { useCustomerRoster } from '../setup/shared';
import { rs } from '../lib/meta';

export interface PickedCustomer { id: string; name: string; sub: string; balance?: number | null }

export function CustomerSearch({ value, onPick, autoFocus }: { value: PickedCustomer | null; onPick: (c: PickedCustomer) => void; autoFocus?: boolean }) {
  const roster = useCustomerRoster();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    const active = (roster.data ?? []).filter((c) => c.isActive);
    if (!t) return active.slice(0, 8);
    return active.filter((c) => `${c.name} ${c.businessName ?? ''} ${c.phone ?? ''} ${c.area ?? ''}`.toLowerCase().includes(t)).slice(0, 8);
  }, [q, roster.data]);
  useEffect(() => setHi(0), [q]);
  const pick = (c: (typeof found)[number]) => {
    onPick({ id: c.id, name: c.businessName || c.name, sub: [c.businessName ? c.name : '', c.area].filter(Boolean).join(' · '), balance: c.balance });
    setOpen(false); setQ('');
  };
  return (
    <div className="relative">
      <label className="mb-1 block text-[0.8125rem] font-medium text-slate-700">Customer</label>
      <div className="relative">
        <UserRound className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input autoFocus={autoFocus} value={open ? q : value ? `${value.name}${value.sub ? ` · ${value.sub}` : ''}` : ''}
          placeholder={roster.isLoading ? 'Customers aa rahe hain…' : 'Naam, dukaan, phone ya area'}
          onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, found.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === 'Enter' && found[hi]) { e.preventDefault(); pick(found[hi]); }
            else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); }
          }}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[0.875rem] font-semibold text-slate-900 outline-none focus:border-brand-500" />
      </div>
      {open && (
        <ul className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200">
          {!found.length ? <li className="px-3 py-2 text-[0.8125rem] text-slate-500">Koi customer nahi mila</li> : found.map((c, i) => (
            <li key={c.id}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(c); }} onMouseEnter={() => setHi(i)}
                className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left', i === hi && 'bg-brand-50')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{c.businessName || c.name}</span>
                  <span className="block truncate text-[0.6875rem] text-slate-500">{[c.businessName ? c.name : '', c.area, c.phone].filter(Boolean).join(' · ')}</span>
                </span>
                {c.balance != null && c.balance > 0 && <span className="shrink-0 text-[0.75rem] font-semibold tabular-nums text-amber-700">{rs(c.balance)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface ItemOption { productId: string; variantId: string | null; label: string; sub: string; product: BootProduct }

/** The booker catalog (every product with variants and packs), loaded once for the office. */
export function useCatalog() {
  const q = useQuery({ queryKey: [DIST_KEY, 'boot', 'products'], queryFn: distributionApi.bootProducts, staleTime: 5 * 60_000 });
  const options = useMemo<ItemOption[]>(() => (q.data ?? []).filter((p) => p.isActive).flatMap((p): ItemOption[] => (p.variants.length
    ? p.variants.map((v) => ({ productId: p.id, variantId: v.id, label: `${p.name} · ${v.name}`, sub: [p.sku, p.brandName].filter(Boolean).join(' · '), product: p }))
    : [{ productId: p.id, variantId: null, label: p.name, sub: [p.sku, p.brandName, p.categoryName].filter(Boolean).join(' · '), product: p }])), [q.data]);
  const byId = useMemo(() => new Map((q.data ?? []).map((p) => [p.id, p])), [q.data]);
  return { options, byId, isLoading: q.isLoading };
}

/** Packs of a product for a variant; the base unit first (id ''). */
export function packsOf(p: BootProduct | undefined, variantId: string | null) {
  const units = (p?.units ?? []).filter((u) => !u.variantId || u.variantId === variantId);
  return [{ id: '', name: p?.unit || 'pcs', rate: 1 }, ...units.map((u) => ({ id: u.id, name: u.unitName, rate: u.conversionRate }))];
}

/** Default pack for wholesale work: the default one, else the biggest. */
export function defaultPack(p: BootProduct, variantId: string | null) {
  const units = p.units.filter((u) => !u.variantId || u.variantId === variantId);
  return (units.find((u) => u.isDefault) ?? [...units].sort((a, b) => b.conversionRate - a.conversionRate)[0])?.id ?? '';
}

export function ItemSearch({ options, loading, onPick, placeholder = 'Item dhoondein…' }: {
  options: ItemOption[]; loading?: boolean; onPick: (o: ItemOption) => void; placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const found = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return options.filter((o) => words.every((w) => `${o.label} ${o.sub} ${o.product.barcode ?? ''}`.toLowerCase().includes(w))).slice(0, 8);
  }, [q, options]);
  useEffect(() => setHi(0), [q]);
  const pick = (o: ItemOption) => { onPick(o); setQ(''); setOpen(false); };
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
      <input value={q} placeholder={loading ? 'Items aa rahe hain…' : placeholder} aria-label={placeholder}
        onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, found.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && found[hi]) { e.preventDefault(); pick(found[hi]); }
          else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); }
        }}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[0.875rem] outline-none focus:border-brand-500" />
      {open && q.trim() && (
        <ul className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200">
          {!found.length ? <li className="px-3 py-2 text-[0.8125rem] text-slate-500">Koi item nahi mila</li> : found.map((o, i) => (
            <li key={`${o.productId}-${o.variantId}`}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setHi(i)}
                className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left', i === hi && 'bg-brand-50')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{o.label}</span>
                  {o.sub && <span className="block truncate text-[0.6875rem] text-slate-500">{o.sub}</span>}
                </span>
                {o.product.units.length > 0 && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 text-[0.6875rem] text-slate-600">{o.product.units.map((u) => u.unitName).join(' / ')}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const newKey = () => Math.random().toString(36).slice(2, 10);

/** A small select for a line's pack. */
export function PackSelect({ product, variantId, value, onChange }: { product: BootProduct | undefined; variantId: string | null; value: string; onChange: (v: string) => void }) {
  const packs = packsOf(product, variantId);
  return (
    <select value={value} aria-label="Pack" onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] outline-none focus:border-brand-500">
      {packs.map((p) => <option key={p.id} value={p.id}>{p.name}{p.rate > 1 ? ` (${p.rate})` : ''}</option>)}
    </select>
  );
}
