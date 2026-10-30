import { BadRequestException } from '@nestjs/common';
import { apiMessage } from '../../../common/i18n/api-message';

/**
 * Cart me ek hi product kai lines me ho to sab jor kar stock se milao.
 * (4 + 4 alag lines, stock 5 → dono akeli "pass" ho kar -3 kar deti thin.)
 * Jitna ab tak chahiye us ka naya total wapas — warna saaf ghalti.
 */
export function addCartNeed(
  wantByKey: Map<string, number>,
  key: string,
  quantity: number,
  available: number,
  label: { item: string; shop: string },
): number {
  const wanted = (wantByKey.get(key) ?? 0) + quantity;
  if (available < wanted) {
    const params = { item: label.item, shop: label.shop, available, wanted };
    throw new BadRequestException(wanted > quantity
      ? apiMessage('Stock kam hai — {{item}}: {{shop}} me {{available}} pada hai, cart me kul {{wanted}}. Pehle stock barhayein, ya Settings → Stock rules me minus stock ki ijazat dein.', params)
      : apiMessage('Stock kam hai — {{item}}: {{shop}} me {{available}} pada hai, chahiye {{wanted}}. Pehle stock barhayein, ya Settings → Stock rules me minus stock ki ijazat dein.', params));
  }
  wantByKey.set(key, wanted);
  return wanted;
}

/**
 * Transaction ke andar atomic kami: sirf tab ghatao jab abhi bhi kaafi ho.
 * Upar ka check transaction se pehle hai — do counter ek saath bechein (ya
 * offline sales baad me sync hon) to dono purana stock dekh kar pass ho
 * jate aur stock minus me chala jata. Ye shart us race ko band karti hai.
 * Naya stock wapas deta hai.
 */
export async function claimShopStock(tx: any, shopStockId: string, quantity: number, shopName: string, allowNegative = false): Promise<number> {
  // With "sell below zero" switched on in settings the stock may go negative.
  const claimed = await tx.shopStock.updateMany({
    where: { id: shopStockId, ...(!allowNegative && { stock: { gte: quantity } }) },
    data: { stock: { decrement: quantity } },
  });
  const now = await tx.shopStock.findUnique({ where: { id: shopStockId }, select: { stock: true } });
  if (claimed.count === 0) {
    throw new BadRequestException(apiMessage(
      'Stock abhi abhi badal gaya — {{shop}} me ab sirf {{stock}} bacha hai. Cart theek karke dobara try karein.',
      { shop: shopName, stock: Number(now?.stock ?? 0) },
    ));
  }
  return Number(now?.stock ?? 0);
}
