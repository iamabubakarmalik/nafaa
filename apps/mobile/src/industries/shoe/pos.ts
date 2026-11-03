/**
 * Shoe counter (web shoe/pos/config.ts) on the shared POS: older size
 * products whose pairs sat on the product row are moved to their sizes once,
 * before the size picker. A pair's barcode puts that exact size on the bill
 * through the shared scan (variants are in the phone's mirror).
 */

import { useMemo } from 'react';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline } from '@/core/offline';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { hasSize, useSizeIndex } from '../retail/lib/sizeIndex';
import { shoeProductsApi } from './api';

const splitChecked = new Set<string>();
const allowOnce = new Set<string>();

export const shoePos: PosIndustryConfig = {
  ...generalPos,
  id: 'shoe',
  searchHint: msg('Naam, article number ya joron ka barcode scan karein'),
  receiptFooter: 'Size badalne (exchange) ke liye yeh bill aur dabba saath laayein.',
  /** Size chips from the sizes of each article's variants (works offline). */
  useShelf: () => {
    const { bySize, sizes } = useSizeIndex();
    return useMemo(() => ({
      filters: sizes.length ? [{ key: 'size', label: t('Size'), options: sizes.slice(0, 16).map((s) => ({ value: s, label: s })), match: (p: { id: string }, v: string) => hasSize(bySize, p.id, v) }] : [],
    }), [bySize, sizes]);
  },
  beforeAdd: (productId, opts, api) => {
    if (opts.variant || splitChecked.has(productId) || !isOnline()) return 'continue';
    if (allowOnce.delete(productId)) return 'continue';
    void (async () => {
      const product = await offline.products.get(productId, api.shopId).catch(() => null);
      if (product?.hasVariants) {
        splitChecked.add(productId);
        await shoeProductsApi.splitVariantStock(productId).catch(() => undefined);
      }
      allowOnce.add(productId);
      await api.addProduct(productId, opts);
    })();
    return 'handled';
  },
};

registerPosIndustry(shoePos);
