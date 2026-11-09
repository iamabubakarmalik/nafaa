/**
 * Personal coupon codes on the Nafaa order form: look one up and mark it
 * used. Kept apart from ConversionService so the storefront can use it
 * without importing that service.
 */

import { PrismaService } from '../../../prisma/prisma.service';
import { phoneKey } from '../customer-risk';
import { CouponRow, cleanCouponCode, couponApplies } from './conversion-math';

/** An open personal code for the order form; null when the code is not one. */
export async function findAutoCoupon(prisma: PrismaService, tenantId: string, code: string, subtotal: number, phone: string | null) {
  const c = cleanCouponCode(code);
  if (c.length < 4) return null;
  const row = await prisma.commerceCoupon.findFirst({ where: { tenantId, code: c, shared: false }, orderBy: { createdAt: 'desc' } });
  if (!row) return null;
  const r = couponApplies(row as CouponRow, subtotal, phoneKey(phone), new Date());
  return { row, ...r };
}

/** Marks a personal code used by an order-form order. */
export async function markCouponUsed(prisma: PrismaService, id: string, orderId: string, total: number) {
  await prisma.commerceCoupon.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date(), usedOrderId: orderId, usedOrderTotal: total } }).catch(() => null);
}
