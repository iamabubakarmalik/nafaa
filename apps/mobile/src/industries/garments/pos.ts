/**
 * Garments counter (web garments/pos/config.ts) on the shared POS: pieces held
 * for a customer (holds, instalment plans) are not sold, so a size picked at
 * the counter offers only stock minus held, and a plain product warns. Older
 * variant products whose units sat on the product row are moved to their
 * sizes once, before the size picker. A size / colour barcode is understood
 * by the shared scan (variants are in the phone's mirror).
 */

import { useMemo } from 'react';
import { sellable } from '@nafaa/core/industries/garments';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline } from '@/core/offline';
import { toast } from '@/design';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { hasSize, useSizeIndex } from '../retail/lib/sizeIndex';
import { garmentProductsApi, reservationsApi } from './api';

let held = { product: new Map<string, number>(), size: new Map<string, number>() };
let loadedAt = 0;
/** Variant products checked this session for units kept on the product row. */
const splitChecked = new Set<string>();
const allowOnce = new Set<string>();

function refreshHeld() {
  if (!isOnline() || Date.now() - loadedAt < 60_000) return;
  loadedAt = Date.now();
  reservationsApi.held().then(({ items }) => {
    const product = new Map<string, number>();
    const size = new Map<string, number>();
    for (const r of items) {
      product.set(r.productId, (product.get(r.productId) ?? 0) + r.reserved);
      if (r.variantId) size.set(`${r.productId}:${r.variantId}`, r.reserved);
    }
    held = { product, size };
  }).catch(() => { loadedAt = 0; });
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

export const garmentsPos: PosIndustryConfig = {
  ...generalPos,
  id: 'garments',
  searchHint: msg('Naam, article code ya size ka barcode scan karein'),
  receiptFooter: 'Badalne (exchange) ke liye yeh bill saath laayein.',
  /** Size chips from the sizes of each product's variants (works offline). */
  useShelf: () => {
    const { bySize, sizes } = useSizeIndex(SIZE_ORDER);
    return useMemo(() => ({
      filters: sizes.length ? [{ key: 'size', label: t('Size'), options: sizes.slice(0, 14).map((s) => ({ value: s, label: s })), match: (p: { id: string }, v: string) => hasSize(bySize, p.id, v) }] : [],
    }), [bySize, sizes]);
  },
  beforeAdd: (productId, opts, api) => {
    const key = `${productId}:${opts.variant?.id ?? ''}`;
    if (allowOnce.delete(key)) return 'continue';
    refreshHeld();
    void (async () => {
      const product = await offline.products.get(productId, api.shopId).catch(() => null);
      let next = opts;
      if (product && opts.variant) {
        const heldHere = held.size.get(`${productId}:${opts.variant.id}`) ?? 0;
        if (heldHere > 0) {
          const free = opts.variant.stock == null ? null : sellable(Number(opts.variant.stock), heldHere);
          toast.warning(t('{{name}} · {{name2}}: {{heldHere}} hold par{{value}}', { name: product.name, name2: opts.variant.name, heldHere, value: free != null ? t(' — {{free}} bech sakte hain', { free }) : '' }));
          if (free != null) next = { ...opts, variant: { ...opts.variant, stock: free } };
        }
      } else if (product && !opts.variant) {
        const onHold = held.product.get(productId) ?? 0;
        if (onHold) toast.warning(t('{{name}}: {{onHold}} piece customer ke liye hold par hain — wo is stock me nahi gine', { name: product.name, onHold }));
        // Older variant products kept their units on the product row; the server moves them once (only when exact).
        if (product.hasVariants && !splitChecked.has(productId) && isOnline()) {
          splitChecked.add(productId);
          await garmentProductsApi.splitVariantStock(productId).catch(() => undefined);
        }
      }
      allowOnce.add(`${productId}:${next.variant?.id ?? ''}`);
      await api.addProduct(productId, next);
    })();
    return 'handled';
  },
};

registerPosIndustry(garmentsPos);
