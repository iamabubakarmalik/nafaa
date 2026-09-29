import { BadRequestException } from '@nestjs/common';

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
    throw new BadRequestException(
      wanted > quantity
        ? `${label.item} insufficient in ${label.shop}. Available: ${available}, cart me kul: ${wanted}`
        : `${label.item} insufficient in ${label.shop}. Available: ${available}`,
    );
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
export async function claimShopStock(tx: any, shopStockId: string, quantity: number, shopName: string): Promise<number> {
  const claimed = await tx.shopStock.updateMany({
    where: { id: shopStockId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  const now = await tx.shopStock.findUnique({ where: { id: shopStockId }, select: { stock: true } });
  if (claimed.count === 0) {
    throw new BadRequestException(
      `Stock abhi abhi badal gaya — ${shopName} me ab sirf ${Number(now?.stock ?? 0)} bacha hai. Cart theek karke dobara try karein.`,
    );
  }
  return Number(now?.stock ?? 0);
}
