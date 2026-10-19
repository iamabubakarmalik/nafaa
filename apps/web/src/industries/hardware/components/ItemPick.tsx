/**
 * Search box that finds catalog items by name, size, shade or code (the
 * same offline catalog the counter uses) and hands the picked item back.
 */

import { useMemo, useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useProductCatalog, type PosItem } from '@modules/pos/engine';
import { factLine, useHardwareFacts } from '../hooks/useHardwareFacts';
import { qty } from '../lib/meta';

export function ItemPick({ onPick, onCustom, placeholder = 'Item ka naam, size ya code likhein…' }: {
  onPick: (item: PosItem, facts: string | undefined) => void;
  /** Adds a line that is not in the catalog (quotations only). */
  onCustom?: (name: string) => void;
  placeholder?: string;
}) {
  const { items } = useProductCatalog();
  const facts = useHardwareFacts();
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return [];
    const words = term.split(/\s+/);
    return items.filter((i) => {
      const text = [i.name, i.product.sku, i.product.barcode, factLine(facts.get(i.id))].filter(Boolean).join(' ').toLowerCase();
      return words.every((w) => text.includes(w));
    }).slice(0, 8);
  }, [items, facts, term]);
  const pick = (i: PosItem) => { onPick(i, factLine(facts.get(i.id))); setQ(''); };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          if (matches[0]) pick(matches[0]); else if (onCustom && q.trim()) { onCustom(q.trim()); setQ(''); }
        }}
        className="h-11 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-3 text-[0.9375rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500" />
      {term && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          {matches.map((i) => (
            <button key={i.id} type="button" onClick={() => pick(i)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-50">
              <Package className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-slate-900">{i.name}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{[factLine(facts.get(i.id)), `stock ${qty(i.stock)} ${i.unit}`].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="text-[0.875rem] font-semibold tabular-nums text-slate-800">{formatPKR(i.price)}</span>
            </button>
          ))}
          {onCustom && (
            <button type="button" onClick={() => { onCustom(q.trim()); setQ(''); }} className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">
              <Plus className="h-4 w-4" />"{q.trim()}" catalog ke bagair line jorein
            </button>
          )}
          {!matches.length && !onCustom && <p className="px-3 py-3 text-[0.8125rem] text-slate-500">Koi item nahi mila</p>}
        </div>
      )}
    </div>
  );
}
