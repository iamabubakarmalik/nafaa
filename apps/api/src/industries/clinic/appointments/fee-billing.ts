import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/** Catalogue line every clinic fee is billed against. */
const FEE_SKU = 'CLINIC-FEE';
const FEE_TYPE = 'SERVICE_FEE';

/** Team-only tag on a fee line that ties the bill back to its clinic record. */
export const FEE_LINK = { appointment: 'clinic-apt:', lab: 'clinic-lab:' } as const;

const BILL_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];

export interface FeePart { method: PaymentMethod; amount: number; reference?: string }

export interface FeeBillInput {
  /** Bill amount. */
  amount: number;
  /** Taken now; the rest goes to the patient's khata. Defaults to `amount`. */
  paid?: number;
  paymentMethod?: PaymentMethod;
  /** Split payment; the parts add up to `paid`. */
  payments?: FeePart[];
  customerId?: string | null;
  shopId?: string | null;
  /** Printed on the bill line, e.g. "APT-2026-00012 · Dr. Ahmed". */
  lineNote: string;
  /** Team-only link, e.g. "clinic-apt:<id>". */
  link: string;
  note?: string;
}

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Fee bills in flight per tenant, so one bill never switches the fee line off under another. */
const inFlight = new Map<string, number>();

/** Checks and normalises the money part of a fee payment request. */
export function readFeePayment(body: any, due: number) {
  const amount = r2(body?.amount);
  if (!(amount > 0)) throw new BadRequestException('Amount 0 se zyada honi chahiye');
  if (amount > due + 0.009) throw new BadRequestException(due > 0 ? `Sirf Rs ${due} baqi hain` : 'Poori fees mil chuki hai');
  const method = (body?.paymentMethod ?? 'CASH') as PaymentMethod;
  if (!BILL_METHODS.includes(method)) throw new BadRequestException('Payment ka tareeqa ghalat hai');
  let payments: FeePart[] | undefined;
  if (Array.isArray(body?.payments) && body.payments.length) {
    payments = body.payments.map((p: any) => ({ method: p?.method, amount: r2(p?.amount), reference: p?.reference ? String(p.reference).slice(0, 80) : undefined }));
    if (payments!.some((p) => !BILL_METHODS.includes(p.method) || !(p.amount > 0))) throw new BadRequestException('Har hissa ka tareeqa aur amount likhein');
  }
  const paidParts = payments ? r2(payments.reduce((s, p) => s + p.amount, 0)) : undefined;
  const paid = body?.onCredit ? 0 : paidParts ?? (body?.paid != null ? r2(body.paid) : amount);
  if (paid < 0) throw new BadRequestException('Payment manfi nahi ho sakti');
  // Cash beyond the bill is change; card/wallet parts may not exceed it.
  if (payments && payments.filter((p) => p.method !== 'CASH').reduce((s, p) => s + p.amount, 0) > amount + 0.009) {
    throw new BadRequestException('Card / wallet ka hissa bill se zyada nahi ho sakta');
  }
  return { amount, paid, paymentMethod: payments?.[0]?.method ?? method, payments };
}

/**
 * Bills a fee as a normal sale so the drawer, day book, khata and every
 * report see the money exactly once. The fee line is a service product (no
 * stock); it is switched on only while a bill is being made, so it stays out
 * of product lists. Whatever is not paid now goes to the patient's khata.
 */
export async function billClinicFee(
  prisma: PrismaService,
  sales: SalesService,
  user: AuthenticatedUser,
  scope: ShopScope,
  input: FeeBillInput,
) {
  const amount = r2(input.amount);
  if (!(amount > 0)) throw new BadRequestException('Amount 0 se zyada honi chahiye');
  const paid = input.paid == null ? amount : r2(input.paid);
  if (paid < amount - 0.009 && !input.customerId) {
    throw new BadRequestException('Udhaar ke liye mareez ka khata zaroori hai');
  }
  const shopId = await resolveWriteShopId(prisma, user.tenantId, scope, input.shopId);

  let product = await prisma.product.findFirst({ where: { tenantId: user.tenantId, sku: FEE_SKU, productType: FEE_TYPE }, select: { id: true, isActive: true } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        tenantId: user.tenantId, name: 'Doctor / Clinic Fee', sku: FEE_SKU, unit: 'service', productType: FEE_TYPE,
        price: 0, costPrice: 0, stock: 0, lowStockAlert: 0, isActive: true,
      },
      select: { id: true, isActive: true },
    });
  }
  const productId = product.id;
  inFlight.set(user.tenantId, (inFlight.get(user.tenantId) ?? 0) + 1);
  try {
    if (!product.isActive) await prisma.product.update({ where: { id: productId }, data: { isActive: true } });
    const sale: any = await sales.create(user, scope, {
      shopId,
      customerId: input.customerId || undefined,
      paymentMethod: input.payments?.[0]?.method ?? input.paymentMethod ?? 'CASH',
      paidAmount: paid,
      ...(input.payments?.length && paid > 0 ? { payments: input.payments } : {}),
      note: input.note || undefined,
      items: [{ productId, quantity: 1, priceOverride: amount, note: input.lineNote, internalNote: input.link }],
    } as any);
    return {
      id: sale.id as string,
      saleNumber: sale.saleNumber as string,
      total: Number(sale.total ?? amount),
      paidAmount: Number(sale.paidAmount ?? paid),
      creditAmount: Number(sale.creditAmount ?? Math.max(amount - paid, 0)),
    };
  } finally {
    const left = (inFlight.get(user.tenantId) ?? 1) - 1;
    if (left > 0) inFlight.set(user.tenantId, left);
    else {
      inFlight.delete(user.tenantId);
      // Keep the fee line out of product lists between bills.
      await prisma.product.updateMany({ where: { id: productId }, data: { isActive: false } }).catch(() => undefined);
    }
  }
}

/** Fee lines of one bill that belong to clinic records, for the void hook. */
export async function clinicFeeLines(prisma: PrismaService, tenantId: string, saleId: string) {
  const rows = await prisma.saleItem.findMany({
    where: { saleId, sale: { tenantId }, internalNote: { startsWith: 'clinic-' } },
    select: { internalNote: true, total: true },
  });
  return rows.map((r) => {
    const tag = r.internalNote ?? '';
    const kind = tag.startsWith(FEE_LINK.appointment) ? 'appointment' : tag.startsWith(FEE_LINK.lab) ? 'lab' : null;
    return kind ? { kind, id: tag.slice(tag.indexOf(':') + 1), total: Number(r.total) || 0 } : null;
  }).filter(Boolean) as Array<{ kind: 'appointment' | 'lab'; id: string; total: number }>;
}
