/**
 * Shared helpers for the bakery API: business-day ranges in the shop's own
 * timezone, per-year document numbers that survive two saves at once, and
 * branch checks for writes.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { businessDayKey, safeDayStart, startOfBusinessDayTz, tzParts, zonedToUtc } from '../../common/helpers/business-time.helper';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopScope } from '../../common/shop-scope';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { PIN_NEEDS, requireManagerPin } from '../../common/helpers/manager-pin.helper';
import { ensureCustomer, paidOnKhata, recordKhataPayment, resolveIndustryShopId } from '../_shared/industry-sale.helper';

export const DAY_MS = 86_400_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Sale statuses that count as sold goods. */
export const SOLD_STATUSES = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

/** Order statuses after which nothing is left to do. */
export const CLOSED_ORDER = ['DELIVERED', 'CANCELLED', 'REFUNDED'] as const;

interface DayRange { gte: Date; lt: Date }

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

/** Units goods are sold by weight or volume in; their baking and batch quantities keep decimals (12.5 kg). */
const MEASURED_UNITS = new Set(['kg', 'kilogram', 'g', 'gm', 'gram', 'pound', 'lb', 'l', 'liter', 'litre', 'ml']);
const measured = (unit?: string | null) => MEASURED_UNITS.has(String(unit ?? '').trim().toLowerCase());

/**
 * A baking or batch quantity: up to three decimals for goods sold by weight,
 * whole pieces otherwise. NaN when the value is not a number.
 */
export function bakeQty(value: unknown, unit?: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return Number.NaN;
  return measured(unit) ? r3(n) : Math.round(n);
}

/** Unit of a catalog product, or null when there is no product. */
export async function productUnit(db: PrismaService | Prisma.TransactionClient, tenantId: string, productId?: string | null) {
  if (!productId) return null;
  return (await db.product.findFirst({ where: { id: productId, tenantId }, select: { unit: true } }))?.unit ?? null;
}

/** Adds each row's product unit, so screens know which quantities take decimals. */
export async function withUnits<T extends { productId: string | null }>(db: PrismaService, tenantId: string, rows: T[]): Promise<Array<T & { unit: string | null }>> {
  const ids = [...new Set(rows.map((r) => r.productId).filter((x): x is string => !!x))];
  const units = new Map(ids.length
    ? (await db.product.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, unit: true } })).map((p) => [p.id, p.unit])
    : []);
  return rows.map((r) => ({ ...r, unit: r.productId ? units.get(r.productId) ?? null : null }));
}

type Numbered<T> = { [K in keyof T]: T[K] extends Prisma.Decimal ? number : T[K] };

/** Production and batch quantities are DECIMAL in the database; services and the API use plain numbers. */
export function qtyNumbers<T extends object>(row: T): Numbered<T> {
  const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const [k, v] of Object.entries(out)) if (v instanceof Prisma.Decimal) out[k] = v.toNumber();
  return out as Numbered<T>;
}

/** A production plan with its line quantities as numbers. */
export function planNumbers<P extends { items: object[] }>(plan: P): Omit<P, 'items'> & { items: Numbered<P['items'][number]>[] } {
  return { ...plan, items: plan.items.map((it) => qtyNumbers(it)) } as Omit<P, 'items'> & { items: Numbered<P['items'][number]>[] };
}

/** The shop's clock plus helpers bound to it. */
export async function shopClock(tz: TenantTimezoneService, tenantId: string) {
  const { tz: zone, dayStartHour } = await tz.clock(tenantId);
  const start = safeDayStart(dayStartHour);
  /** Start of the business day named by a `yyyy-mm-dd` key. */
  const dayStart = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, start, 0, 0, zone);
  };
  const today = (now = new Date()): DayRange => {
    const gte = startOfBusinessDayTz(now, zone, start);
    return { gte, lt: new Date(gte.getTime() + DAY_MS) };
  };
  /** `yyyy-mm-dd` of the business day a moment falls in. */
  const keyOf = (d: Date) => businessDayKey(d, zone, start);
  /** Business days from `from` to `to` (keys, inclusive); undefined when not given. */
  const range = (from?: string, to?: string): DayRange | undefined => {
    const f = from && KEY.test(from) ? from : undefined;
    const t = to && KEY.test(to) ? to : undefined;
    if (!f && !t) return undefined;
    const gte = f ? dayStart(f) : new Date(0);
    const lt = t ? new Date(dayStart(t).getTime() + DAY_MS) : new Date(Date.now() + 3650 * DAY_MS);
    return { gte, lt };
  };
  const year = () => tzParts(new Date(), zone).year;
  return { zone, startHour: start, dayStart, today, keyOf, range, year };
}

export const isDayKey = (v?: string): v is string => !!v && KEY.test(v);

/**
 * Creates a row with the next free `PREFIX-YEAR-0001` number. Two saves at
 * the same moment both read the same last number; the unique index rejects
 * the second, which then retries with the next number.
 */
export async function withNextNumber<T>(
  last: (prefix: string) => Promise<string | null | undefined>,
  prefix: string,
  pad: number,
  create: (number: string) => Promise<T>,
): Promise<T> {
  const latest = await last(prefix);
  const base = Number(String(latest ?? '').slice(prefix.length)) || 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const number = `${prefix}${String(base + 1 + attempt).padStart(pad, '0')}`;
    try {
      return await create(number);
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  }
  throw new BadRequestException('Number nahi bana — dobara koshish karein');
}

/**
 * Branch a new record belongs to: an explicit shop (checked against the
 * tenant), else the branch being viewed, else none (consolidated view).
 */
export async function writeShopId(prisma: PrismaService, tenantId: string, scope: ShopScope, explicit?: string | null): Promise<string | null> {
  if (explicit) {
    const shop = await prisma.shop.findFirst({ where: { id: explicit, tenantId }, select: { id: true } });
    if (!shop) throw new NotFoundException('Branch nahi mili');
    return shop.id;
  }
  return scope.shopId ?? null;
}

/** Positive finite number or a 400 with the given message. */
export function positive(value: unknown, message: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new BadRequestException(message);
  return n;
}

interface RecipeLine { ingredientId: string; name: string; qty: number; unit: string; costPerUnit: number }
interface Recipe { yieldQty: number; lines: RecipeLine[] }

/**
 * Reads the recipe saved on a bakery product profile (`ingredients` JSON:
 * `{ yield, lines: [{ ingredientId, name, qty, unit, costPerUnit }] }`).
 * Null when the product has no recipe.
 */
export function recipeOf(json: unknown): Recipe | null {
  const raw = json as { yield?: unknown; lines?: unknown } | null;
  const lines = Array.isArray(raw?.lines) ? (raw!.lines as Array<Record<string, unknown>>) : [];
  const clean = lines
    .filter((l) => typeof l?.ingredientId === 'string' && Number(l.qty) > 0)
    .map((l) => ({ ingredientId: String(l.ingredientId), name: String(l.name ?? ''), qty: Number(l.qty), unit: String(l.unit ?? ''), costPerUnit: Number(l.costPerUnit) || 0 }));
  if (!clean.length) return null;
  return { yieldQty: Number(raw?.yield) > 0 ? Number(raw!.yield) : 1, lines: clean };
}

/**
 * Brings live freshness batches in line with branch stock. Counter sales take
 * pieces off the shelf without touching batches, so when a branch holds fewer
 * pieces of an item than its live batches say, the oldest batches are marked
 * sold until the two agree. Without this the freshness page kept showing
 * bread that had long been sold, and baking suggestions subtracted it.
 * Batches with no branch (made before branches) are left as they are.
 */
export async function syncBatchesWithStock(prisma: PrismaService, tenantId: string, where: Prisma.BakeryFreshnessLogWhereInput = {}) {
  const live = await prisma.bakeryFreshnessLog.findMany({
    where: { tenantId, ...where, status: { in: ['FRESH', 'DAY_OLD', 'NEAR_EXPIRY', 'EXPIRED'] }, currentQty: { gt: 0 }, shopId: { not: null } },
    select: { id: true, productId: true, shopId: true, currentQty: true },
    orderBy: [{ productionDate: 'asc' }, { createdAt: 'asc' }],
  }).then((rows) => rows.map(qtyNumbers));
  if (!live.length) return;
  const stock = await prisma.shopStock.findMany({
    where: { shopId: { in: [...new Set(live.map((b) => b.shopId!))] }, productId: { in: [...new Set(live.map((b) => b.productId))] }, variantId: null },
    select: { shopId: true, productId: true, stock: true, product: { select: { unit: true } } },
  });
  // Pieces count whole; goods sold by weight keep their decimals.
  const shelf = new Map(stock.map((s) => {
    const n = Math.max(Number(s.stock) || 0, 0);
    return [`${s.shopId}:${s.productId}`, measured(s.product?.unit) ? r3(n) : Math.floor(n)];
  }));
  const groups = new Map<string, typeof live>();
  for (const b of live) {
    const key = `${b.shopId}:${b.productId}`;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  for (const [key, batches] of groups) {
    let over = r3(batches.reduce((s, b) => s + b.currentQty, 0) - (shelf.get(key) ?? 0));
    for (const b of batches) {
      if (over <= 0) break;
      const take = Math.min(b.currentQty, over);
      const done = await prisma.bakeryFreshnessLog.updateMany({
        where: { id: b.id, currentQty: b.currentQty },
        data: { currentQty: { decrement: take }, soldQty: { increment: take } },
      });
      if (done.count) over = r3(over - take);
    }
  }
}

/**
 * Money taken on a cake or bulk order before its bill. It goes on the
 * customer's khata as an advance (reference = order number) on the day it is
 * paid, so the drawer, day book and khata show it that day. The delivery bill
 * later puts its unpaid part on the same khata, where the advance cancels it.
 * Returns the customer the money is held for.
 */
export async function postOrderAdvance(
  tx: Prisma.TransactionClient,
  user: AuthenticatedUser,
  input: { orderNumber: string; kind: 'Cake' | 'Bulk'; amount: number; method?: string | null; customerId?: string | null; name?: string | null; phone?: string | null; shopId?: string | null },
) {
  const shopId = await resolveIndustryShopId(tx, user, input.shopId);
  const customerId = await ensureCustomer(tx, user, { customerId: input.customerId, name: input.name, phone: input.phone, shopId });
  await recordKhataPayment(tx, user, {
    customerId,
    shopId,
    amount: input.amount,
    reference: input.orderNumber,
    note: `${input.kind} order advance: ${input.orderNumber}`,
    method: input.method,
  });
  return customerId;
}

/**
 * Money on an order split by where it sits: `khataPaid` is held on the
 * customer's khata as an advance; `legacyPaid` is the rest (paid before khata
 * posting existed, or taken with a delivery bill that was not saved), which
 * the delivery bill counts as paid.
 */
export async function orderMoney(db: PrismaService | Prisma.TransactionClient, tenantId: string, orderNumber: string, paidAmount: number) {
  const khataPaid = Math.min(await paidOnKhata(db as Prisma.TransactionClient, tenantId, orderNumber), r2(paidAmount));
  return { khataPaid, legacyPaid: r2(Math.max(paidAmount - khataPaid, 0)) };
}

/** Payment methods an order advance can be taken by. */
export const ORDER_PAY_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'] as const;

/** Refunding money follows the shop's refund PIN setting, as returns and booking refunds do. */
export async function checkRefundPin(prisma: PrismaService, user: AuthenticatedUser, managerPin?: string) {
  const rules = await prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { requirePinForRefund: true } });
  if (rules?.requirePinForRefund) await requireManagerPin(prisma, user, managerPin, 'Advance wapsi', false, PIN_NEEDS.refund);
}

/**
 * Gives back in cash the advance of a cancelled order. Only money held on
 * the customer's khata for this order (and still unused there) goes back:
 * the khata gets a REFUND line with the order number, so the advance is
 * cleared, and the cash leaves the branch's open drawer as a cash-out with
 * the same number. Returns the amount given back.
 */
export async function refundOrderAdvance(
  tx: Prisma.TransactionClient,
  user: AuthenticatedUser,
  input: { orderNumber: string; kind: 'Cake' | 'Bulk'; customerId: string | null; paidAmount: number; shopId?: string | null },
) {
  const { khataPaid } = await orderMoney(tx, user.tenantId, input.orderNumber, input.paidAmount);
  const refunded = await tx.customerLedger.aggregate({ where: { tenantId: user.tenantId, type: 'REFUND', reference: input.orderNumber }, _sum: { amount: true } });
  const customer = input.customerId
    ? await tx.customer.findFirst({ where: { id: input.customerId, tenantId: user.tenantId }, select: { id: true, balance: true } })
    : null;
  const held = customer ? Math.max(-Number(customer.balance), 0) : 0;
  const amount = r2(Math.min(khataPaid - (Number(refunded._sum.amount) || 0), held));
  if (!customer || !(amount > 0)) throw new BadRequestException('Is order ka koi advance khata par baqi nahi — wapas karne ko kuch nahi');

  const shopId = await resolveIndustryShopId(tx, user, input.shopId);
  const register = await tx.cashRegister.findFirst({ where: { tenantId: user.tenantId, shopId, status: 'OPEN' }, orderBy: { openedAt: 'desc' }, select: { id: true } });
  const claimed = register
    ? await tx.cashRegister.updateMany({ where: { id: register.id, status: 'OPEN' }, data: { expectedBalance: { decrement: amount }, totalCashOut: { increment: amount } } })
    : { count: 0 };
  if (!register || !claimed.count) throw new BadRequestException('Is branch ka cash register band hai — pehle register kholein, phir advance wapas karein');

  const { balance } = await tx.customer.update({ where: { id: customer.id }, data: { balance: { increment: amount } }, select: { balance: true } });
  await tx.customerLedger.create({
    data: {
      tenantId: user.tenantId, shopId, customerId: customer.id, createdById: user.id,
      type: 'REFUND', amount, balanceAfter: balance, reference: input.orderNumber, paymentMethod: 'CASH',
      note: `${input.kind} order cancel — advance wapas: ${input.orderNumber}`,
    },
  });
  await tx.cashTransaction.create({
    data: {
      tenantId: user.tenantId, cashRegisterId: register.id, createdById: user.id,
      type: 'CASH_OUT', amount, reason: `Advance wapas: ${input.orderNumber}`, note: `${input.kind} order cancel`, reference: input.orderNumber,
    },
  });
  return amount;
}
