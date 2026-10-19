/**
 * The bill for a garment that was kept aside for a customer (reservation
 * or layaway). Money taken earlier sits on the customer's khata as an
 * advance; the bill is a normal sale, so stock and cost follow, and its
 * unpaid part goes on the khata where the advance cancels it.
 */

import { Prisma } from '@prisma/client';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { toPaymentMethod } from '../../_shared/industry-sale.helper';
import { findBill, r2 } from './garments-common';

type Db = Prisma.TransactionClient;

export interface HeldGoodsBill {
  /** Record number (RES-…, LAY-…); a retried call finds the first bill by it. */
  ref: string;
  shopId: string;
  customerId: string | null;
  productId: string;
  variantId?: string | null;
  quantity: number;
  /** Agreed price for all pieces together. */
  amount: number;
  /** Money counted as paid with this bill (taken now plus anything not on the khata). */
  paidAmount: number;
  method?: string | null;
  note: string;
}

export async function billHeldGoods(db: Db, sales: SalesService, user: AuthenticatedUser, b: HeldGoodsBill) {
  const existing = await findBill(db, user.tenantId, b.ref);
  if (existing) return existing;
  const qty = Math.max(Number(b.quantity) || 1, 1);
  const sale = await sales.create(user, new ShopScope(b.shopId, false), {
    shopId: b.shopId,
    customerId: b.customerId ?? undefined,
    paymentMethod: toPaymentMethod(b.method),
    paidAmount: r2(b.paidAmount),
    allowCredit: b.customerId ? true : undefined,
    items: [{ productId: b.productId, variantId: b.variantId ?? undefined, quantity: qty, priceOverride: r2(b.amount / qty), note: b.note }],
  } as never, { source: 'POS', sourceRef: b.ref });
  return sale as unknown as { id: string; saleNumber: string };
}
