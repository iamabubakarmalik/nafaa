/**
 * Shared plumbing for the distribution services: business-day ranges, name
 * lookups for ids kept without foreign keys, numbering, and posting a
 * verified field collection to the customer's khata.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { businessDayKey, zonedToUtc } from '../../common/helpers/business-time.helper';
import type { BusinessClock } from '../../common/helpers/tenant-timezone.service';
import { tidyCustomerBalance } from '../sales/returns/returns.helpers';
import { docNumber } from './helpers/logistics';

type Db = Prisma.TransactionClient;

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
export const r4 = (v: number) => Math.round((Number(v) || 0) * 10_000) / 10_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

/* ───────────── business days ───────────── */

export function todayKey(clock: BusinessClock, at: Date = new Date()): string {
  return businessDayKey(at, clock.tz, clock.dayStartHour);
}

/** Start of a business day given as YYYY-MM-DD. */
export function dayStart(key: string, clock: BusinessClock): Date {
  const [y, m, d] = key.split('-').map(Number);
  return zonedToUtc(y, m, d, clock.dayStartHour, 0, 0, clock.tz);
}

export function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 0 = Sunday, for a YYYY-MM-DD key. */
export function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function checkKey(v: string | undefined | null, label = 'Date'): string | null {
  if (v == null || v === '') return null;
  if (!KEY.test(v)) throw new BadRequestException(`${label} YYYY-MM-DD me likhein`);
  return v;
}

/** [from, to) of business days, `to` inclusive as a day. Defaults: this month to today. */
export function dayRange(clock: BusinessClock, from?: string | null, to?: string | null) {
  const today = todayKey(clock);
  const f = checkKey(from, 'From') ?? `${today.slice(0, 8)}01`;
  const t = checkKey(to, 'To') ?? today;
  const [a, b] = f <= t ? [f, t] : [t, f];
  return { from: a, to: b, gte: dayStart(a, clock), lt: dayStart(shiftKey(b, 1), clock) };
}

/** A date sent as YYYY-MM-DD (start of that business day) or a full ISO time. */
export function parseWhen(v: string | null | undefined, clock: BusinessClock, endOfDay = false): Date | null {
  if (v == null || v === '') return null;
  if (KEY.test(v)) return endOfDay ? new Date(dayStart(shiftKey(v, 1), clock).getTime() - 1) : dayStart(v, clock);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Date sahi nahi');
  return d;
}

/* ───────────── lookups ───────────── */

export async function userNames(db: Db, tenantId: string, ids: Array<string | null | undefined>) {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Map<string, string>();
  const rows = await db.user.findMany({ where: { tenantId, id: { in: list } }, select: { id: true, fullName: true } });
  return new Map(rows.map((r) => [r.id, r.fullName]));
}

export async function shopNames(db: Db, tenantId: string, ids: Array<string | null | undefined>) {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Map<string, string>();
  const rows = await db.shop.findMany({ where: { tenantId, id: { in: list } }, select: { id: true, name: true } });
  return new Map(rows.map((r) => [r.id, r.name]));
}

export async function routeNames(db: Db, tenantId: string, ids: Array<string | null | undefined>) {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Map<string, string>();
  const rows = await db.distRoute.findMany({ where: { tenantId, id: { in: list } }, select: { id: true, name: true } });
  return new Map(rows.map((r) => [r.id, r.name]));
}

export const CUSTOMER_CARD = {
  id: true, name: true, businessName: true, phone: true, address: true, area: true, city: true,
  balance: true, creditLimit: true, creditDays: true, routeId: true, routeSeq: true, priceListId: true,
  latitude: true, longitude: true, ntn: true, strn: true, isActive: true,
} as const;

export async function customerCards(db: Db, tenantId: string, ids: Array<string | null | undefined>) {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Map<string, Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_CARD }>>();
  const rows = await db.customer.findMany({ where: { tenantId, id: { in: list } }, select: CUSTOMER_CARD });
  return new Map(rows.map((r) => [r.id, r]));
}

/** A user of this business, or a clear error. */
export async function assertUser(db: Db, tenantId: string, id: string | null | undefined, label = 'User') {
  if (!id) return null;
  const u = await db.user.findFirst({ where: { id, tenantId, isActive: true }, select: { id: true, fullName: true } });
  if (!u) throw new BadRequestException(`${label} nahi mila ya band hai`);
  return u;
}

export async function assertShop(db: Db, tenantId: string, id: string | null | undefined) {
  if (!id) return null;
  const s = await db.shop.findFirst({ where: { id, tenantId, isActive: true }, select: { id: true, name: true, type: true } });
  if (!s) throw new BadRequestException('Godown / shop nahi mila ya band hai');
  return s;
}

/* ───────────── numbering ───────────── */

/** Next order or load sheet number, taken atomically from the settings row. */
export async function nextNumber(db: Db, tenantId: string, kind: 'order' | 'loadSheet'): Promise<string> {
  const row = await db.distributionSettings.upsert({
    where: { tenantId },
    create: { tenantId, ...(kind === 'order' ? { orderSeq: 1 } : { loadSheetSeq: 1 }) },
    update: kind === 'order' ? { orderSeq: { increment: 1 } } : { loadSheetSeq: { increment: 1 } },
    select: { orderSeq: true, loadSheetSeq: true, orderPrefix: true, loadSheetPrefix: true },
  });
  return kind === 'order' ? docNumber(row.orderPrefix, row.orderSeq) : docNumber(row.loadSheetPrefix, row.loadSheetSeq);
}

/* ───────────── khata posting ───────────── */

export interface PostableCollection {
  id: string;
  tenantId: string;
  customerId: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  kind: string;
  shopId: string | null;
  saleId: string | null;
}

/**
 * Marks a PENDING collection VERIFIED and writes its PAYMENT_RECEIVED row,
 * inside the caller's transaction. Returns false when another request
 * verified or rejected it first. A payment above what is owed leaves the
 * customer with an advance, as at the counter.
 */
export async function postCollection(tx: Db, c: PostableCollection, verifierId: string): Promise<boolean> {
  const claim = await tx.distCollection.updateMany({
    where: { id: c.id, tenantId: c.tenantId, status: 'PENDING' },
    data: { status: 'VERIFIED', verifiedById: verifierId, verifiedAt: new Date() },
  });
  if (!claim.count) return false;
  const exists = await tx.customer.findFirst({ where: { id: c.customerId, tenantId: c.tenantId }, select: { id: true } });
  if (!exists) throw new NotFoundException('Customer nahi mila');
  const { balance: raw } = await tx.customer.update({
    where: { id: c.customerId },
    data: { balance: { decrement: c.amount } },
    select: { balance: true },
  });
  const balance = await tidyCustomerBalance(tx, c.customerId, raw);
  let reference = c.reference;
  if (!reference && c.saleId) {
    reference = (await tx.sale.findFirst({ where: { id: c.saleId, tenantId: c.tenantId }, select: { saleNumber: true } }))?.saleNumber ?? null;
  }
  const ledger = await tx.customerLedger.create({
    data: {
      tenantId: c.tenantId, customerId: c.customerId, shopId: c.shopId, createdById: verifierId,
      type: 'PAYMENT_RECEIVED', amount: -c.amount, balanceAfter: balance,
      reference, paymentMethod: c.method as PaymentMethod,
      note: c.note || (c.kind === 'INVOICE_CASH' ? 'Delivery par payment' : 'Recovery (field)'),
    },
    select: { id: true },
  });
  await tx.distCollection.update({ where: { id: c.id }, data: { ledgerId: ledger.id } });
  return true;
}

/* ───────────── delivery outcome ───────────── */

export interface ReturnLineInput { orderItemId: string; returnBaseQty?: number; returnFreeQty?: number; damaged?: boolean }
export type ReturnPlan = Map<string, { paid: number; free: number; damaged: boolean }>;

/**
 * What comes back from one invoice, per order line in base units, for an
 * outcome. Used by the office settlement and by the delivery man's report so
 * both accept and refuse the same things. Throws a Roman Urdu 400.
 */
export function returnPlan(
  order: { orderNumber: string; items: Array<{ id: string; baseQty: number; freeBaseQty: number }> },
  outcome: string,
  cash: number,
  lines?: ReturnLineInput[],
): ReturnPlan {
  const back: ReturnPlan = new Map();
  if (outcome === 'RETURNED' && cash > 0) throw new BadRequestException(`${order.orderNumber}: sab maal wapas aaya to cash nahi likh sakte`);
  if (outcome === 'RETURNED') {
    for (const it of order.items) back.set(it.id, { paid: it.baseQty, free: it.freeBaseQty, damaged: false });
  } else if (outcome === 'PARTIAL') {
    if (!lines?.length) throw new BadRequestException(`${order.orderNumber}: PARTIAL me wapas aane wala maal likhein`);
    for (const l of lines) {
      const it = order.items.find((x) => x.id === l.orderItemId);
      if (!it) throw new BadRequestException(`${order.orderNumber}: line is Order ki nahi`);
      const paid = r4(l.returnBaseQty ?? 0);
      const free = r4(l.returnFreeQty ?? 0);
      if (paid > it.baseQty + 1e-6 || free > it.freeBaseQty + 1e-6) throw new BadRequestException(`${order.orderNumber}: wapsi Order se zyada hai`);
      if (paid > 0 || free > 0) back.set(it.id, { paid, free, damaged: !!l.damaged });
    }
    if (!back.size) throw new BadRequestException(`${order.orderNumber}: PARTIAL me kam se kam ek cheez wapas likhein`);
  }
  return back;
}
