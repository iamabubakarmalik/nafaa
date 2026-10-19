/**
 * Picks a product and, for size/colour products, the exact variant. Used
 * by holds, instalment plans, collections and the shop's own fabric on a
 * stitching order. Shows the stock of the branch being worked in.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, ScanLine, Search, X } from 'lucide-react';
import { Input } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useShopParam } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';

export interface PickedProduct {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  unit: string;
  /** Branch stock of the product or variant, when known. */
  stock?: number;
}

const stockOf = (p: Product) => Number(p.shopStock ?? p.stock ?? 0);

export function ProductPick({ value, onChange, label = 'Product', hint, error, placeholder = 'Naam, SKU ya barcode' }: {
  value: PickedProduct | null;
  onChange: (v: PickedProduct | null) => void;
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
}) {
  const shopId = useShopParam();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState<Product | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const term = q.trim();

  const found = useQuery({
    queryKey: ['garments-product-pick', term],
    queryFn: () => productsApi.list({ search: term, limit: 8, isActive: true }),
    enabled: open && term.length >= 2,
    staleTime: 30_000,
  });
  const variants = useQuery({
    queryKey: ['product-variants', base?.id],
    queryFn: () => productVariantsApi.list(base!.id),
    enabled: !!base?.hasVariants,
  });
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (p: Product) => {
    setQ(''); setOpen(false);
    if (p.hasVariants) { setBase(p); onChange(null); return; }
    setBase(null);
    onChange({ productId: p.id, name: p.name, price: Number(p.price) || 0, unit: p.unit || 'pcs', stock: stockOf(p) });
  };
  /** A scanned barcode: product or variant code. */
  const scan = async () => {
    if (term.length < 4) return;
    try {
      const hit = await productsApi.byBarcode(term, shopId ?? undefined) as Product & { matchedVariant?: { id: string; name: string; price: number } };
      setQ(''); setOpen(false);
      if (hit.matchedVariant) {
        setBase(null);
        onChange({ productId: hit.id, variantId: hit.matchedVariant.id, name: hit.name, variantName: hit.matchedVariant.name, price: Number(hit.matchedVariant.price) || Number(hit.price) || 0, unit: hit.unit || 'pcs', stock: hit.shopStock });
      } else choose(hit);
    } catch { /* not a code: the list stays open */ }
  };

  if (value) {
    return (
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200"><Package className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.875rem] font-semibold text-slate-900">{value.name}{value.variantName ? ` · ${value.variantName}` : ''}</p>
            <p className="text-[0.75rem] text-slate-500">{formatPKR(value.price)} / {value.unit}{value.stock !== undefined ? ` · stock ${value.stock}` : ''}</p>
          </div>
          <button type="button" onClick={() => { onChange(null); setBase(null); }} aria-label="Hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div ref={box} className="relative space-y-2">
      <Input label={label} value={q} error={error} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void scan(); } }}
        placeholder={placeholder} leftIcon={<Search className="h-4 w-4" />} rightIcon={<ScanLine className="h-4 w-4" />} hint={hint ?? 'Barcode scan karein ya naam likhein'} />
      {open && term.length >= 2 && (
        <div className="absolute inset-x-0 top-[4.25rem] z-30 max-h-72 overflow-auto rounded-2xl bg-white p-1 shadow-xl ring-1 ring-slate-200">
          {found.isLoading ? <p className="px-3 py-2 text-[0.8125rem] text-slate-500">Dhoond rahe hain…</p>
            : !(found.data?.items ?? []).length ? <p className="px-3 py-2 text-[0.8125rem] text-slate-500">Koi product nahi mila</p>
            : found.data!.items.map((p) => (
              <button key={p.id} type="button" onClick={() => choose(p)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                <span className="min-w-0"><span className="block truncate text-[0.875rem] font-medium text-slate-900">{p.name}</span>
                  <span className="text-[0.75rem] text-slate-500">{p.hasVariants ? 'Size / rang chunein' : `Stock ${stockOf(p)} ${p.unit}`}</span></span>
                <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums">{formatPKR(Number(p.price) || 0)}</span>
              </button>
            ))}
        </div>
      )}
      {base && (
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="mb-2 text-[0.8125rem] font-semibold text-slate-800">{base.name} — size / rang chunein</p>
          {variants.isLoading ? <p className="text-[0.8125rem] text-slate-500">Load ho rahe hain…</p> : (
            <div className="flex flex-wrap gap-1.5">
              {(variants.data ?? []).filter((v) => v.isActive).map((v) => (
                <button key={v.id} type="button"
                  onClick={() => { onChange({ productId: base.id, variantId: v.id, name: base.name, variantName: v.name, price: Number(v.price) || Number(base.price) || 0, unit: base.unit || 'pcs', stock: Number(v.stock) }); setBase(null); }}
                  className={cn('rounded-xl bg-white px-3 py-1.5 text-left text-[0.8125rem] ring-1 ring-slate-200 hover:ring-brand-400', Number(v.stock) <= 0 && 'opacity-60')}>
                  <span className="block font-semibold text-slate-900">{v.name}</span>
                  <span className="text-[0.6875rem] text-slate-500">{formatPKR(Number(v.price) || Number(base.price) || 0)} · {Number(v.stock)} pc</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
