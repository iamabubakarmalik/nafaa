import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Package, Search } from 'lucide-react';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { rs } from '../../lib/labels';
import { cn } from '@core/lib/cn';

export interface PickedProduct {
  productId: string;
  variantId: string | null;
  label: string;
}

/**
 * Nafaa product (ya us ka variant) chunne ka dropdown — search ke saath.
 * Variants wala product khulta hai aur us ka size/color chunna hota hai.
 */
export function ProductPicker({ onPick, initialSearch, placeholder = 'Nafaa product chunein', compact }: {
  onPick: (p: PickedProduct) => void; initialSearch?: string; placeholder?: string; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(initialSearch ?? '');
  const [debounced, setDebounced] = useState(q);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(r.width, 340);
      const left = Math.min(r.left, window.innerWidth - width - 12);
      const below = window.innerHeight - r.bottom > 360;
      setPos({ top: below ? r.bottom + 6 : Math.max(12, r.top - 366), left: Math.max(12, left), width });
    };
    place();
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ['picker-products', debounced],
    queryFn: () => productsApi.list({ search: debounced || undefined, limit: 20, isActive: true }),
    enabled: open,
  });
  const items = data?.items ?? [];

  const pick = (p: PickedProduct) => { onPick(p); setOpen(false); };

  return (
    <>
      <button ref={btn} type="button" onClick={() => setOpen((v) => !v)}
        className={cn('inline-flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 bg-white text-left font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
          compact ? 'h-8 px-2.5 text-[12.5px]' : 'h-9 px-3 text-[13px]')}>
        <span className="inline-flex items-center gap-1.5 truncate"><Search className="h-3.5 w-3.5 shrink-0" /> {placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>
      {open && pos && createPortal(
        <div ref={panel} style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed z-[90] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam, SKU ya barcode…"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] outline-none focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {isFetching && !items.length && <div className="p-4 text-center text-[12.5px] text-slate-500">Dhoond rahe hain…</div>}
            {!isFetching && !items.length && <div className="p-4 text-center text-[12.5px] text-slate-500">Koi product nahi mila</div>}
            {items.map((p: any) => {
              const img = p.images?.[0]?.url;
              const head = (
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                    {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-slate-400" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-900 dark:text-white">{p.name}</span>
                    <span className="block text-[11.5px] text-slate-500">{p.sku ? `SKU ${p.sku} · ` : ''}Stock {p.stock}</span>
                  </span>
                  {!p.hasVariants && <span className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{rs(p.price)}</span>}
                </div>
              );
              if (p.hasVariants && p.variants?.length) {
                return (
                  <div key={p.id} className="rounded-lg px-2 py-1.5">
                    {head}
                    <div className="mt-1.5 flex flex-wrap gap-1 pl-10">
                      {p.variants.map((v: any) => (
                        <button key={v.id} onClick={() => pick({ productId: p.id, variantId: v.id, label: `${p.name} — ${v.name}` })}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[12px] font-medium text-slate-700 hover:border-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                          {v.name}{v.sku ? <span className="text-slate-400"> · {v.sku}</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <button key={p.id} onClick={() => pick({ productId: p.id, variantId: null, label: p.name })}
                  className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                  {head}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
