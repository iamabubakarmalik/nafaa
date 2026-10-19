/**
 * Posts money earned by industry records (salon appointments, gym
 * memberships, hotel stays, service jobs, gaming sessions) into the books.
 *
 * These records are services, not stocked products, so they cannot go
 * through the POS sale engine. Each finished bill becomes a Sale whose
 * lines are product-less unless the caller names the product a line sold
 * (same pattern as mobile repair delivery), so it shows
 * in the day book, cash register, profit and every sales report. Money
 * taken before the bill is final is held on the customer's khata as an
 * advance and is used up when the bill is posted: the unpaid part of the
 * bill goes on the khata as one SALE_CREDIT and the advance (a negative
 * balance) cancels against it.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { MONEY_METHODS, saveSalePayments } from '../../common/helpers/sale-payments.helper';

type Db = Prisma.TransactionClient;

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

const METHODS = new Set<string>(MONEY_METHODS);

/** Maps loose method names from industry screens onto the sale enum. */
export function toPaymentMethod(method?: string | null): PaymentMethod {
  const m = String(method ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (METHODS.has(m)) return m as PaymentMethod;
  if (m === 'BANK' || m === 'TRANSFER' || m === 'ONLINE' || m === 'IBFT') return 'BANK_TRANSFER';
  if (m === 'JAZZ_CASH') return 'JAZZCASH';
  if (m === 'EASY_PAISA') return 'EASYPAISA';
  if (m === 'DEBIT_CARD' || m === 'CREDIT_CARD') return 'CARD';
  return 'CASH';
}

export interface IndustrySaleLine {
  /** Text printed on the bill, e.g. "Hair Cut — Ayesha". */
  label: string;
  /** Line total before the bill discount. */
  amount: number;
  /** Shop's own cost for this line (product used, rider, etc.). */
  cost?: number;
  quantity?: number;
  /**
   * The catalog product this line sold, so it shows in product reports and a
   * return can put it back on the shelf. The helper never moves stock: the
   * caller has already taken it. A void puts it back like any bill line.
   */
  productId?: string | null;
  variantId?: string | null;
}

export interface IndustrySaleInput {
  /** Unique per tenant; a second post with the same number returns the first sale. */
  saleNumber: string;
  /** The industry record number, searchable from sales history. */
  sourceRef: string;
  shopId?: string | null;
  customerId?: string | null;
  lines: IndustrySaleLine[];
  discount?: number;
  /** Money taken at the counter with this bill (advances already on khata are not included). */
  paidAmount: number;
  paymentMethod?: string | null;
  /** Goods taken toward the bill (an old part): TRADE_IN rows, paid but never money. */
  tradeIns?: Array<{ amount: number; reference: string; note?: string }>;
}

/** Picks the branch for a write: the given one, the user's own, else the main shop. */
export async function resolveIndustryShopId(db: Db, user: AuthenticatedUser, shopId?: string | null): Promise<string> {
  const wanted = shopId || user.shopId;
  if (wanted) {
    const shop = await db.shop.findFirst({ where: { id: wanted, tenantId: user.tenantId }, select: { id: true } });
    if (shop) return shop.id;
  }
  const main = await db.shop.findFirst({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  if (!main) throw new BadRequestException('Koi active shop nahi hai. Pehle shop banayein.');
  return main.id;
}

/** Finds the customer by phone, or opens a khata for a walk-in so money can be held for them. */
export async function ensureCustomer(
  db: Db,
  user: AuthenticatedUser,
  input: { customerId?: string | null; name?: string | null; phone?: string | null; shopId?: string | null },
): Promise<string> {
  if (input.customerId) {
    const c = await db.customer.findFirst({ where: { id: input.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    return c.id;
  }
  const phone = input.phone?.trim();
  const name = input.name?.trim();
  if (phone) {
    const byPhone = await db.customer.findFirst({ where: { tenantId: user.tenantId, phone }, select: { id: true } });
    if (byPhone) return byPhone.id;
  }
  if (!name) throw new BadRequestException('Udhaar ya advance ke liye customer ka naam zaroori hai');
  const created = await db.customer.create({
    data: { tenantId: user.tenantId, shopId: input.shopId ?? null, name, phone: phone || null },
    select: { id: true },
  });
  return created.id;
}

/**
 * Money received before the final bill: kept on khata as the customer's
 * advance. `method` decides where the money lands (drawer for cash, the
 * bank or wallet account otherwise); left out, it is cash.
 */
export async function recordKhataPayment(
  db: Db,
  user: AuthenticatedUser,
  input: { customerId: string; shopId: string; amount: number; reference: string; note: string; method?: string | null },
) {
  const amount = r2(input.amount);
  if (amount <= 0) throw new BadRequestException('Amount sahi likhein');
  const { balance } = await db.customer.update({
    where: { id: input.customerId },
    data: { balance: { decrement: amount } },
    select: { balance: true },
  });
  return db.customerLedger.create({
    data: {
      tenantId: user.tenantId,
      shopId: input.shopId,
      customerId: input.customerId,
      createdById: user.id,
      type: 'PAYMENT_RECEIVED',
      amount: -amount,
      balanceAfter: balance,
      reference: input.reference,
      note: input.note,
      paymentMethod: toPaymentMethod(input.method),
    },
  });
}

/** Writes the final bill as a Sale. Safe to call twice: the first sale is returned. */
export async function postIndustrySale(db: Db, user: AuthenticatedUser, input: IndustrySaleInput) {
  const existing = await db.sale.findFirst({ where: { tenantId: user.tenantId, saleNumber: input.saleNumber } });
  if (existing) return existing;

  const lines = input.lines.filter((l) => r2(l.amount) > 0 || r2(l.cost ?? 0) > 0);
  if (lines.length === 0) throw new BadRequestException('Bill me koi amount nahi hai');

  const subtotal = r2(lines.reduce((s, l) => s + r2(l.amount), 0));
  const discount = Math.min(r2(input.discount ?? 0), subtotal);
  const total = r2(Math.max(subtotal - discount, 0));
  const moneyIn = r2(Math.max(input.paidAmount, 0));
  const tradeIns = (input.tradeIns ?? []).map((t) => ({ ...t, amount: r2(Math.max(Number(t.amount) || 0, 0)) })).filter((t) => t.amount > 0);
  const tradeIn = r2(tradeIns.reduce((s, t) => s + t.amount, 0));
  const paidAmount = r2(moneyIn + tradeIn);
  const changeAmount = r2(Math.max(paidAmount - total, 0));
  if (changeAmount > moneyIn + 0.005) throw new BadRequestException('Trade-in par change nahi diya ja sakta');
  const creditAmount = r2(Math.max(total - paidAmount, 0));
  const costOfGoods = r2(lines.reduce((s, l) => s + r2(l.cost ?? 0), 0));

  if (creditAmount > 0 && !input.customerId) {
    throw new BadRequestException(`Rs ${creditAmount} baqi hai — udhaar ke liye customer select karein ya poori amount lein`);
  }

  const shopId = await resolveIndustryShopId(db, user, input.shopId);
  const customer = input.customerId
    ? await db.customer.findFirst({ where: { id: input.customerId, tenantId: user.tenantId } })
    : null;
  if (input.customerId && !customer) throw new NotFoundException('Customer nahi mila');

  const register = await db.cashRegister.findFirst({
    where: { tenantId: user.tenantId, shopId, status: 'OPEN' },
    select: { id: true },
  });

  const sale = await db.sale.create({
    data: {
      tenantId: user.tenantId,
      shopId,
      cashRegisterId: register?.id,
      customerId: customer?.id,
      createdById: user.id,
      soldById: user.id,
      saleNumber: input.saleNumber,
      sourceRef: input.sourceRef,
      subtotal,
      discount,
      total,
      costOfGoods,
      paidAmount,
      changeAmount,
      creditAmount,
      paymentMethod: tradeIn > 0 && !(moneyIn > 0) ? 'TRADE_IN' : toPaymentMethod(input.paymentMethod),
      status: 'COMPLETED',
      items: {
        create: lines.map((l) => {
          const qty = Number(l.quantity) > 0 ? Number(l.quantity) : 1;
          return {
            productId: l.productId || null,
            quantity: qty,
            price: r2(r2(l.amount) / qty),
            costPrice: r2(r2(l.cost ?? 0) / qty),
            total: r2(l.amount),
            note: l.label,
            ...(l.productId && l.variantId && { variantLink: { create: { variantId: l.variantId } } }),
          };
        }),
      },
    },
    include: { items: true },
  });
  const money = r2(moneyIn - changeAmount);
  await saveSalePayments(db, sale, [
    ...(money > 0 ? [{ method: toPaymentMethod(input.paymentMethod), amount: money }] : []),
    ...tradeIns.map((t) => ({ method: 'TRADE_IN' as const, amount: t.amount, reference: t.reference, note: t.note ?? null })),
  ]);

  if (customer) {
    if (creditAmount > 0) {
      // One SALE_CREDIT for the whole unpaid part, as a POS udhaar bill writes,
      // so the day book's credit equals the khata given. An advance already on
      // the khata (negative balance) cancels against it inside the balance.
      const advanceHeld = Math.max(-Number(customer.balance), 0);
      const fromAdvance = r2(Math.min(advanceHeld, creditAmount));
      const { balance } = await db.customer.update({
        where: { id: customer.id }, data: { balance: { increment: creditAmount } }, select: { balance: true },
      });
      await db.customerLedger.create({
        data: {
          tenantId: user.tenantId, shopId, customerId: customer.id, createdById: user.id,
          type: 'SALE_CREDIT', amount: creditAmount, balanceAfter: balance, reference: sale.saleNumber,
          note: fromAdvance > 0
            ? `Udhaar: ${input.sourceRef} (${sale.saleNumber}) — Rs ${fromAdvance} advance se adjust`
            : `Udhaar: ${input.sourceRef} (${sale.saleNumber})`,
        },
      });
    }
    await db.customer.update({ where: { id: customer.id }, data: { totalSpent: { increment: total } } });
  }

  return sale;
}

/**
 * Money already recorded on the khata against an industry record (advances
 * and later payments). Records paid before khata posting existed show a
 * paidAmount with no ledger rows; callers treat that gap as paid at the bill.
 */
export async function paidOnKhata(db: Db, tenantId: string, reference: string): Promise<number> {
  const agg = await db.customerLedger.aggregate({
    where: { tenantId, reference, type: 'PAYMENT_RECEIVED' },
    _sum: { amount: true },
  });
  return r2(-(Number(agg._sum.amount) || 0));
}
