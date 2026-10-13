/**
 * How a bill was paid. Each bill keeps one SalePayment row per method used
 * (cash + card, cash + JazzCash, old gold …). Every view that splits money
 * by method (drawer, bank and wallet accounts, day book, reports) reads the
 * rows, not Sale.paymentMethod.
 *
 *   rows        one per method; cash rows are net of the change handed back,
 *               so the rows add up to paidAmount − changeAmount
 *   change      only ever given from cash
 *   TRADE_IN    goods taken toward the bill: counts as paid, never as money
 *   main method the largest money part, kept on Sale.paymentMethod for older
 *               screens; TRADE_IN only when nothing else was paid
 */

import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

/** Methods that move real money. TRADE_IN is not one of them. */
export const MONEY_METHODS = Object.values(PaymentMethod).filter((m) => m !== 'TRADE_IN') as PaymentMethod[];

export interface PaymentPart {
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
  note?: string | null;
}

export interface Tender {
  /** Rows to store, cash already net of change. */
  rows: PaymentPart[];
  /** Everything handed over, as Sale.paidAmount. */
  paidAmount: number;
  changeAmount: number;
  /** Sale.paymentMethod. */
  mainMethod: PaymentMethod;
}

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Works out the stored rows for a bill.
 *
 * With `parts`: each part is what was handed over by that method; change
 * comes off the cash parts. Without: one row of paid − change by `method`,
 * which is how every bill was paid before split tender.
 */
export function splitTender(
  total: number,
  input: { parts?: PaymentPart[] | null; method: PaymentMethod; paidAmount: number },
): Tender {
  if (!input.parts?.length) {
    const paidAmount = Math.max(Number(input.paidAmount) || 0, 0);
    const changeAmount = Math.max(paidAmount - total, 0);
    const kept = paidAmount - changeAmount;
    return {
      rows: kept > 0 ? [{ method: input.method, amount: kept }] : [],
      paidAmount,
      changeAmount,
      mainMethod: input.method,
    };
  }

  const parts = input.parts.map((p) => ({
    method: p.method,
    amount: r2(p.amount),
    reference: p.reference?.trim() || null,
    note: p.note?.trim() || null,
  }));
  if (parts.some((p) => !(p.amount > 0))) throw new BadRequestException('Har payment ki amount likhein');

  const paidAmount = r2(parts.reduce((s, p) => s + p.amount, 0));
  const changeAmount = r2(Math.max(paidAmount - total, 0));
  const cash = r2(parts.filter((p) => p.method === 'CASH').reduce((s, p) => s + p.amount, 0));
  if (changeAmount > cash + 0.005) {
    throw new BadRequestException('Card, bank, wallet ya trade-in par change nahi diya ja sakta — zyada paisa sirf Cash me lein');
  }

  // Change comes off the cash parts, last one first.
  let toTake = changeAmount;
  for (let i = parts.length - 1; i >= 0 && toTake > 0; i--) {
    if (parts[i].method !== 'CASH') continue;
    const cut = Math.min(parts[i].amount, toTake);
    parts[i].amount = r2(parts[i].amount - cut);
    toTake = r2(toTake - cut);
  }
  const rows = parts.filter((p) => p.amount > 0);

  const byMethod = new Map<PaymentMethod, number>();
  for (const p of rows) if (p.method !== 'TRADE_IN') byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
  const largest = [...byMethod.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const mainMethod = largest ?? (rows.some((p) => p.method === 'TRADE_IN') ? 'TRADE_IN' : input.method);

  return { rows, paidAmount, changeAmount, mainMethod };
}

/** Stores the payment rows of a new bill. */
export async function saveSalePayments(
  db: Db,
  sale: { id: string; tenantId: string; shopId: string | null },
  rows: PaymentPart[],
) {
  if (!rows.length) return;
  await db.salePayment.createMany({
    data: rows.map((p) => ({
      tenantId: sale.tenantId,
      saleId: sale.id,
      shopId: sale.shopId,
      method: p.method,
      amount: p.amount,
      reference: p.reference ?? null,
      note: p.note ?? null,
    })),
  });
}
