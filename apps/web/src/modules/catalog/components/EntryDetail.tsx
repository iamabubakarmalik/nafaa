/**
 * Full view of one entry for the customer: photo gallery with zoom and arrow
 * keys, options (variants) with their own price and photo, rates, details and
 * what is included. Copy or send it on WhatsApp, or add it to the list.
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Copy, Maximize2, MessageCircle, Plus, Star, X } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import type { CatalogEntry } from '../types';
import { Chip, PriceTag, Thumb } from './EntryViews';

/** WhatsApp / clipboard text for one entry; never includes cost. */
function entryText(e: CatalogEntry, shop: string, variant?: ProductVariant | null) {
  const price = e.priceNote ?? `${formatPKR(variant?.price ?? e.price)}${e.per ? ` / ${e.per}` : ''}`;
  return [
    `*${e.name}*${variant ? ` — ${variant.name}` : ''}`,
    `Rate: ${price}`,
    ...(e.priceTiers ?? []).map((t) => `${t.label}: ${formatPKR(t.price)}`),
    ...(e.specs ?? []).slice(0, 6).map(([k, v]) => `${k}: ${v}`),
    ...(e.description ? ['', e.description] : []),
    '', shop,
  ].join('\n');
}

export function EntryDetail({ entry, shop, showStock, onPick, onClose }: {
  entry: CatalogEntry; shop: string; showStock: boolean;
  onPick: (variant?: ProductVariant | null) => void; onClose: () => void;
}) {
  const pid = entry.productId;
  const { data: product } = useQuery({ queryKey: ['catalog-product', pid], queryFn: () => productsApi.getOne(pid!), enabled: !!pid, staleTime: 60_000 });
  const { data: variants = [] } = useQuery({
    queryKey: ['catalog-variants', pid], queryFn: () => productVariantsApi.list(pid!),
    enabled: !!pid && (entry.variantCount ?? 0) > 0, staleTime: 60_000,
  });
  const options = useMemo(() => (Array.isArray(variants) ? variants : []).filter((v) => v.isActive !== false), [variants]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const variant = options.find((v) => v.id === variantId) ?? null;
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);

  const images = useMemo(() => {
    const own = product?.images?.length ? product.images.map((i) => i.url) : entry.images?.length ? entry.images : entry.image ? [entry.image] : [];
    return [...new Set([variant?.imageUrl, ...own].filter(Boolean) as string[])];
  }, [product, entry, variant]);
  useEffect(() => setIndex(0), [variantId]);
  const step = (d: number) => setIndex((i) => (i + d + images.length) % Math.max(images.length, 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zoom) { e.stopPropagation(); setZoom(false); return; }
      if (images.length < 2) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, images.length]);

  const out = showStock && entry.inStock === false;
  const shown = variant ? { ...entry, price: variant.price } : entry;
  const description = (product?.description && product.description !== entry.description ? product.description : null) ?? entry.description;
  const text = entryText(entry, shop, variant);

  return (
    <Modal open onClose={onClose} size="xl" title={entry.name} description={[entry.brand, entry.category?.name].filter(Boolean).join(' · ') || undefined}
      footer={<>
        <Button variant="ghost" leftIcon={<Copy className="h-4 w-4" />} onClick={() => { void navigator.clipboard?.writeText(text); toast.success('Copy ho gaya'); }}>Copy</Button>
        <Button variant="secondary" leftIcon={<MessageCircle className="h-4 w-4" />} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')}>WhatsApp</Button>
        <Button leftIcon={<Plus className="h-4 w-4" />} disabled={out} onClick={() => onPick(variant)}>List me daalein</Button>
      </>}>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <div className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
            {images.length ? (
              <img src={images[index]} alt={entry.name} onClick={() => setZoom(true)} className={cn('h-full w-full cursor-zoom-in object-cover', out && 'grayscale')} />
            ) : <Thumb entry={entry} />}
            {entry.featured && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[0.6875rem] font-bold text-amber-950"><Star className="h-3 w-3 fill-current" />Khaas</span>}
            {images.length > 0 && (
              <button type="button" onClick={() => setZoom(true)} aria-label="Bara karein" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow"><Maximize2 className="h-4 w-4" /></button>
            )}
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Pichli photo" className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" onClick={() => step(1)} aria-label="Agli photo" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"><ChevronRight className="h-5 w-5" /></button>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-white">{index + 1} / {images.length}</span>
              </>
            )}
            {out && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[0.75rem] font-bold text-white backdrop-blur-sm">Abhi khatam</span>}
          </div>
          {images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button key={src} type="button" onClick={() => setIndex(i)} className={cn('h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2', i === index ? 'ring-brand-500' : 'ring-transparent')}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
            <PriceTag entry={shown} big />
            {variant && <p className="mt-1 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-800"><Check className="h-3.5 w-3.5" />{variant.name}</p>}
            {showStock && entry.stockNote && !out && <p className="mt-1 text-[0.8125rem] font-medium text-success-700">{entry.stockNote}</p>}
          </div>
          {!!(entry.badges?.length || entry.chips?.length) && (
            <div className="flex flex-wrap gap-1.5">{[...(entry.badges ?? []), ...(entry.chips ?? [])].map((c) => <Chip key={c.label} chip={c} className="max-w-none text-[0.75rem]" />)}</div>
          )}
          {!!entry.priceTiers?.length && (
            <div className="grid grid-cols-2 gap-2">
              {entry.priceTiers.map((t) => (
                <div key={t.label} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                  <p className="text-[0.6875rem] font-medium text-slate-500">{t.label}</p>
                  <p className="font-bold tabular-nums text-slate-900">{formatPKR(t.price)}</p>
                </div>
              ))}
            </div>
          )}
          {options.length > 0 && (
            <div>
              <p className="mb-2 text-[0.8125rem] font-semibold text-slate-900">Options ({options.length})</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {options.map((v) => (
                  <button key={v.id} type="button" onClick={() => setVariantId(variantId === v.id ? null : v.id)}
                    className={cn('overflow-hidden rounded-xl text-left ring-2 transition', variantId === v.id ? 'ring-brand-500' : 'ring-slate-200 hover:ring-brand-300')}>
                    <div className="aspect-square bg-slate-100" style={!v.imageUrl && v.colorHex ? { backgroundColor: v.colorHex } : undefined}>
                      {v.imageUrl && <img src={v.imageUrl} alt={v.name} loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="truncate text-[0.6875rem] font-semibold text-slate-900">{v.size || v.color || v.name}</p>
                      <p className="text-[0.6875rem] font-bold tabular-nums text-brand-700">{formatPKR(v.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {description && <p className="whitespace-pre-line text-[0.875rem] leading-relaxed text-slate-700">{description}</p>}
          {!!entry.specs?.length && (
            <dl className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {entry.specs.map(([k, v]) => (
                <div key={k} className="flex gap-3 px-3 py-2 text-[0.8125rem]">
                  <dt className="w-32 shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 flex-1 font-medium text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {!!entry.includes?.length && (
            <ul className="space-y-1.5">
              {entry.includes.map((x) => <li key={x} className="flex gap-2 text-[0.8125rem] text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />{x}</li>)}
            </ul>
          )}
        </div>
      </div>

      {zoom && images[index] && createPortal(
        <div role="dialog" aria-modal="true" aria-label={entry.name} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setZoom(false)}>
          <img src={images[index]} alt={entry.name} className="max-h-full max-w-full object-contain" />
          <button type="button" onClick={() => setZoom(false)} aria-label="Band karein" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"><X className="h-5 w-5" /></button>
        </div>,
        document.body,
      )}
    </Modal>
  );
}
