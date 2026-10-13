import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope, applyStockDelta, resolveWriteShopId } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/** Catalogue line every clinic fee is billed against. */
const FEE_SKU = 'CLINIC-FEE';
const FEE_TYPE = 'SERVICE_FEE';

export interface FeeBillInput {
  amount: number;
  paymentMethod?: PaymentMethod;
  customerId?: string | null;
  shopId?: string | null;
  /** Printed on the bill line, e.g. "APT-2026-00012 · Dr. Ahmed". */
  lineNote: string;
  note?: string;
}

/**
 * Bills a fee as a normal sale so the drawer, day book, khata and every
 * report see the money. The fee line is a service product that holds no
 * stock: it gets one unit just before the bill and is switched off again
 * afterwards, so it never shows up in stock lists or low-stock alerts.
 */
export async function billClinicFee(
  prisma: PrismaService,
  sales: SalesService,
  user: AuthenticatedUser,
  scope: ShopScope,
  input: FeeBillInput,
) {
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!(amount > 0)) throw new BadRequestException('Raqam 0 se zyada honi chahiye');
  const shopId = await resolveWriteShopId(prisma, user.tenantId, scope, input.shopId);

  const productId = await prisma.$transaction(async (tx) => {
    let product = await tx.product.findFirst({ where: { tenantId: user.tenantId, sku: FEE_SKU, productType: FEE_TYPE } });
    if (!product) {
      product = await tx.product.create({
        data: {
          tenantId: user.tenantId, name: 'Doctor / Clinic Fee', sku: FEE_SKU, unit: 'service', productType: FEE_TYPE,
          price: 0, costPrice: 0, stock: 0, lowStockAlert: 0, isActive: true,
        },
      });
    } else if (!product.isActive) {
      await tx.product.update({ where: { id: product.id }, data: { isActive: true } });
    }
    const row = await tx.shopStock.findFirst({ where: { shopId, productId: product.id, variantId: null }, select: { stock: true } });
    const here = row?.stock ?? 0;
    if (here < 1) {
      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId, productId: product.id, delta: 1 - here,
        movementType: 'OPENING_BALANCE', reference: FEE_SKU, note: 'Fees ka bill', userId: user.id, unitCost: 0,
      });
    }
    return product.id;
  });

  try {
    const sale: any = await sales.create(user, scope, {
      shopId,
      customerId: input.customerId || undefined,
      paymentMethod: input.paymentMethod ?? 'CASH',
      paidAmount: amount,
      note: input.note || undefined,
      items: [{ productId, quantity: 1, priceOverride: amount, note: input.lineNote }],
    } as any);
    return { id: sale.id as string, saleNumber: sale.saleNumber as string, total: Number(sale.total ?? amount) };
  } finally {
    // Keep the fee line out of product lists and stock alerts between bills.
    await prisma.product.updateMany({ where: { id: productId }, data: { isActive: false } }).catch(() => undefined);
  }
}
