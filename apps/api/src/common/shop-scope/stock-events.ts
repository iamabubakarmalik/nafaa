import { EventEmitter } from 'events';

/**
 * Stock badla — ek halka in-process signal. applyStockDelta har tabdeeli par
 * bhejta hai; online store (WooCommerce/Shopify) sunta hai aur thori der
 * (debounce) baad sirf badle hue products ka stock website par bhejta hai.
 * Transaction ke andar bhi chal jata hai: sunne wala baad me DB se taaza
 * (committed) stock parhta hai, is signal ka number istemal nahi karta.
 */
export interface StockChanged {
  tenantId: string;
  productId: string;
  variantId: string | null;
}

export const stockEvents = new EventEmitter();
stockEvents.setMaxListeners(20);

export function emitStockChanged(e: StockChanged) {
  try {
    stockEvents.emit('changed', e);
  } catch {
    // Sunne wale ki ghalti stock likhne ko kabhi na roke
  }
}
