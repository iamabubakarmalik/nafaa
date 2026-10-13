import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope, applyStockDelta, resolveWriteShopId } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Optical bills things that hold no stock (eye test fee, lenses made at the
 * lab, fitting). Each kind is a service product that only exists to carry a
 * bill line: it is switched on and given exactly the units a bill needs, and
 * switched off again afterwards so it never shows in stock lists or alerts.
 */
export const OPTICAL_LINES = {
  EYE_TEST: { sku: 'OPTICAL-EYE-TEST', name: 'Eye test fee' },
  LENS: { sku: 'OPTICAL-LENS', name: 'Lens (order)' },
} as const;
export type OpticalLine = keyof typeof OPTICAL_LINES;

const LINE_TYPE = 'SERVICE_FEE';
const METHODS = new Set<string>(Object.values(PaymentMethod));

/** Maps the free-text method some screens send onto a real payment method. */
export function toPaymentMethod(v?: string | null): PaymentMethod {
  if (!v) return 'CASH';
  const up = v.toUpperCase();
  if (up === 'BANK') return 'BANK_TRANSFER';
  if (up === 'MOBILE') return 'JAZZCASH';
  return METHODS.has(up) ? (up as PaymentMethod) : 'CASH';
}

type Tx = Prisma.TransactionClient;

/** Turns the line on and makes sure `units` are on the shelf at `shopId`. */
export async function openServiceLine(tx: Tx, user: AuthenticatedUser, line: OpticalLine, shopId: string | null, units: number) {
  const { sku, name } = OPTICAL_LINES[line];
  let product = await tx.product.findFirst({ where: { tenantId: user.tenantId, sku, productType: LINE_TYPE } });
  if (!product) {
    product = await tx.product.create({
      data: {
        tenantId: user.tenantId, name, sku, unit: 'service', productType: LINE_TYPE,
        price: 0, costPrice: 0, stock: 0, lowStockAlert: 0, isActive: true,
      },
    });
  } else if (!product.isActive) {
    await tx.product.update({ where: { id: product.id }, data: { isActive: true } });
  }
  if (shopId && units > 0) {
    const row = await tx.shopStock.findFirst({ where: { shopId, productId: product.id, variantId: null }, select: { stock: true } });
    const here = row?.stock ?? 0;
    if (here < units) {
      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId, productId: product.id, delta: units - here,
        movementType: 'OPENING_BALANCE', reference: sku, note: 'Service bill line', userId: user.id, unitCost: 0,
      });
    }
  }
  return product.id;
}

/** Switches the line off again; failures here must not undo a bill. */
export async function closeServiceLine(prisma: PrismaService, productId: string) {
  await prisma.product.updateMany({ where: { id: productId }, data: { isActive: false } }).catch(() => undefined);
}

/** Bills one fee as a fully paid sale (cash basis). */
export async function billServiceFee(
  prisma: PrismaService,
  sales: SalesService,
  user: AuthenticatedUser,
  scope: ShopScope,
  input: { line: OpticalLine; amount: number; paymentMethod?: string | null; customerId?: string | null; lineNote: string; note?: string },
) {
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!(amount > 0)) throw new BadRequestException('Raqam 0 se zyada honi chahiye');
  const shopId = await resolveWriteShopId(prisma, user.tenantId, scope);
  const productId = await prisma.$transaction((tx) => openServiceLine(tx, user, input.line, shopId, 1));
  try {
    const sale: any = await sales.create(user, scope, {
      shopId,
      customerId: input.customerId || undefined,
      paymentMethod: toPaymentMethod(input.paymentMethod),
      paidAmount: amount,
      note: input.note || undefined,
      items: [{ productId, quantity: 1, priceOverride: amount, note: input.lineNote }],
    } as any);
    return { id: sale.id as string, saleNumber: sale.saleNumber as string, total: Number(sale.total ?? amount) };
  } finally {
    await closeServiceLine(prisma, productId);
  }
}
