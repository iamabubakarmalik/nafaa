import { BadRequestException } from '@nestjs/common';
import { FurnitureCustomOrder, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ensureCustomer, paidOnKhata, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** One order, one bill. */
export const orderSaleNumber = (orderNumber: string) => `FUR-${orderNumber}`;

/** What the customer pays in all: the agreed price plus fitting, when asked for. */
export const billTotal = (o: { finalPrice: number | null; quotedPrice: number; requiresInstallation: boolean; installationCharge: number | null }) =>
  r2((o.finalPrice ?? o.quotedPrice) + (o.requiresInstallation ? o.installationCharge ?? 0 : 0));

/** Statuses after the furniture has left the shop: the bill exists from here on. */
export const BILLED = ['DELIVERED', 'ASSEMBLED', 'COMPLETED'];

/**
 * Writes the order's bill as a Sale (day book, cash register, profit and every
 * sales report). Advances already on the customer's khata pay it first; the
 * rest stays on the khata as udhaar. Returns the order fields to save.
 */
export async function billCustomOrder(tx: Prisma.TransactionClient, user: AuthenticatedUser, o: FurnitureCustomOrder) {
  const total = billTotal(o);
  const price = r2(o.finalPrice ?? o.quotedPrice);
  if (!(total > 0)) throw new BadRequestException('Bill se pehle order ki qeemat likhein');
  const shopId = await resolveIndustryShopId(tx, user, null);
  // Payments recorded before khata posting existed count as paid with this bill.
  const legacyPaid = r2(Math.max(o.totalPaid - (await paidOnKhata(tx, user.tenantId, o.orderNumber)), 0));
  let customerId = o.customerId;
  if (!customerId && total > legacyPaid + 0.009) {
    customerId = await ensureCustomer(tx, user, { name: o.customerName, phone: o.customerPhone, shopId });
  }
    await postIndustrySale(tx, user, {
    saleNumber: orderSaleNumber(o.orderNumber),
    sourceRef: o.orderNumber,
    shopId,
    customerId,
    lines: [
      { label: `Order: ${o.productType}${o.carpenterName ? ` — ${o.carpenterName}` : ''}`, amount: price },
      { label: 'Fitting / installation', amount: o.requiresInstallation ? r2(o.installationCharge ?? 0) : 0 },
    ],
    paidAmount: Math.min(legacyPaid, total),
    paymentMethod: 'CASH',
  });
  // The karigar's job is done once the furniture has left the shop.
  if (o.carpenterId) {
    await tx.furnitureCarpenter.updateMany({ where: { id: o.carpenterId, tenantId: user.tenantId, activeProjects: { gt: 0 } }, data: { activeProjects: { decrement: 1 } } });
    await tx.furnitureCarpenter.updateMany({
      where: { id: o.carpenterId, tenantId: user.tenantId },
      data: { completedProjects: { increment: 1 }, totalRevenue: { increment: price } },
    });
  }
  return {
    customerId,
    finalPrice: price,
    balanceAmount: r2(Math.max(total - o.totalPaid, 0)),
  };
}

/** The delivery slip for an order sent out; made once. */
export async function ensureOrderDelivery(tx: Prisma.TransactionClient, user: AuthenticatedUser, o: FurnitureCustomOrder) {
  const existing = await tx.furnitureDelivery.findFirst({ where: { tenantId: user.tenantId, customOrderId: o.id }, select: { id: true } });
  if (existing) return existing;
  const prefix = `FDL-${new Date().getFullYear()}-`;
  return createWithDocNumber({
    prefix,
    width: 4,
    existing: async () => (await tx.furnitureDelivery.findMany({
      where: { tenantId: user.tenantId, deliveryNumber: { startsWith: prefix } },
      select: { deliveryNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
    })).map((d: { deliveryNumber: string }) => d.deliveryNumber),
    create: (deliveryNumber) => tx.furnitureDelivery.create({
      data: {
        tenantId: user.tenantId,
        deliveryNumber,
        customOrderId: o.id,
        customerId: o.customerId,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        deliveryAddress: o.deliveryAddress || o.customerAddress || '-',
        city: o.deliveryCity,
        area: o.deliveryArea,
        productNames: [o.productType],
        itemsCount: 1,
        requiresAssembly: o.requiresInstallation,
        assemblyIncluded: true,
        status: 'DISPATCHED',
        dispatchedAt: new Date(),
      },
    }),
  });
}
