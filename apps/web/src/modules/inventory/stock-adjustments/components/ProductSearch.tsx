/**
 * Product search for the adjustment and count forms: name, SKU or barcode,
 * Enter picks the first match, a pack barcode brings its pack unit, and the
 * camera scanner works the same way. Searches the local product list, so it
 * is instant.
 */

import { useMemo, useRef, useState } from 'react';
import { ScanLine, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/design-system/components';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { searchSources, type Source, type UnitChoice } from '@modules/purchasing/purchases/editor/sources';
import { qtyText } from './meta';

export function ProductSearch({ sources, byCode, loading, onPick, onMiss, placeholder = 'Product ka naam, SKU ya barcode…', showUnits = true }: {
  sources: Source[];
  byCode: Map<string, { source: Source; unit: UnitChoice }>;
  loading: boolean;
  onPick: (s: Source, unit: UnitChoice) => void;
  /** Called with a code that matched no product (e.g. an IMEI). */
  onMiss?: (code: string) => void;
  placeholder?: string;
  showUnits?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [scanner, setScanner] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const products = useMemo(() => sources.filter((s) => s.kind === 'product'), [sources]);
  const results = useMemo(() => searchSources(products, query, 20), [products, query]);

  const pick = (s: Source, unit: UnitChoice = s.units[0]) => {
    onPick(s, unit);
    setQuery('');
    setOpen(false);
    ref.current?.focus();
  };

  const onCode = (raw: string) => {
    const code = raw.trim();
    const hit = byCode.get(code.toLowerCase());
    if (hit && hit.source.kind === 'product') { pick(hit.source, hit.unit); return true; }
    if (onMiss) { onMiss(code); setQuery(''); return true; }
    toast.error(`"${code}" kisi product se nahi mila`);
    return false;
  };

  return (
    <div className="relative">
      {scanner && <BarcodeScanner onDetected={(c) => { setScanner(false); onCode(c); }} onClose={() => setScanner(false)} />}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input ref={ref} data-autofocus value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !query.trim()) return;
              e.preventDefault();
              if (byCode.has(query.trim().toLowerCase())) { onCode(query); return; }
              if (results[0]) pick(results[0]);
              else onCode(query);
            }}
            placeholder={placeholder} aria-label="Product search"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
        </div>
        <Button variant="secondary" className="h-11" onClick={() => setScanner(true)} leftIcon={<ScanLine className="h-4 w-4" />}><span className="hidden sm:inline">Scan</span></Button>
      </div>
      {open && query.trim() && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {loading ? <p className="p-4 text-center text-sm text-slate-500">Load ho raha hai…</p>
            : !results.length ? <p className="p-4 text-center text-sm text-slate-500">Koi product nahi mila{onMiss ? ' — Enter dabayein to IMEI / serial search' : ''}</p>
            : results.map((s) => (
              <div key={s.key} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <ProductThumb name={s.name} category={s.category} url={s.image} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{s.name}</span>
                    <span className="block text-[0.75rem] text-slate-500">{s.sku ? `${s.sku} · ` : ''}Stock {qtyText(s.stock)} {s.baseUnit}{s.hasVariants ? ' · qismein hain' : ''}</span>
                  </span>
                </button>
                {showUnits && s.units.length > 1 && (
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {s.units.map((u) => (
                      <button key={u.name} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s, u)}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-800">
                        {u.name}{u.rate !== 1 ? ` (${qtyText(u.rate)})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
