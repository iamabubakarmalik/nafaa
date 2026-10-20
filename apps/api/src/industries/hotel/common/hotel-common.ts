/**
 * Shared rules of the hotel industry: stay dates, nightly rates (weekend and
 * season plans), the khata that holds a booking's money, advance refunds and
 * posting the folio bill (with split payments) into the books.
 *
 * Stay dates are calendar days stored as UTC midnight of the shop's date
 * (Asia/Karachi); "today" is always the shop's date, never the server's.
 */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { dateKeyTz } from '../../../common/helpers/business-time.helper';
import { PIN_NEEDS, requireManagerPin } from '../../../common/helpers/manager-pin.helper';
import { MONEY_METHODS, saveSalePayments, splitTender, type PaymentPart } from '../../../common/helpers/sale-payments.helper';
import { hasPermission, type PermissionKey } from '../../../common/constants/permissions.constants';
import { ensureCustomer, paidOnKhata, postIndustrySale, resolveIndustryShopId, toPaymentMethod } from '../../_shared/industry-sale.helper';

export type Db = Prisma.TransactionClient;

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Bookings that hold their rooms for the stay dates. */
export const HOLDING = ['TENTATIVE', 'CONFIRMED', 'CHECKED_IN', 'EXTENDED'] as const;
/** Bookings whose guests are in the hotel now (EXTENDED is kept for older rows). */
export const IN_HOUSE = ['CHECKED_IN', 'EXTENDED'] as const;
/** Bookings that are not yet checked in and can still change. */
export const OPEN_RESERVATION = ['INQUIRY', 'QUOTED', 'TENTATIVE', 'CONFIRMED'] as const;

/** Weekend nights (night starting Friday or Saturday) use the room type's weekend rate. */
export const WEEKEND_NIGHTS = [5, 6];

const DAY_MS = 86_400_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Shop's calendar date as a stay date (UTC midnight of that day). */
export function dayOf(input: string | Date | undefined | null, field = 'Date'): Date {
  if (input == null || input === '') throw new BadRequestException(`${field} zaroori hai`);
  const s = typeof input === 'string' ? input.trim() : '';
  const key = KEY.test(s) ? s : (() => {
    const d = new Date(input as string | Date);
    if (Number.isNaN(d.getTime())) throw new BadRequestException(`${field} sahi nahi`);
    return dateKeyTz(d);
  })();
  return new Date(`${key}T00:00:00.000Z`);
}

/** Today in the shop, as a stay date. */
export function today(): Date {
  return new Date(`${dateKeyTz(new Date())}T00:00:00.000Z`);
}

export const keyOf = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
export const nightsBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS);

/** Throws unless the user has at least one of the permissions. */
export function requireAny(user: AuthenticatedUser, perms: PermissionKey[], what: string) {
  if (perms.some((p) => hasPermission(user.role, user.permissions, p))) return;
  throw new ForbiddenException(`${what} ki permission nahi`);
}

/** Pakistani CNIC as 12345-1234567-1, or a cleaned passport / other ID number. */
export function cleanIdNumber(idType: string | null | undefined, idNumber: string | null | undefined): string | null {
  const raw = String(idNumber ?? '').trim();
  if (!raw) return null;
  if ((idType ?? 'CNIC') === 'CNIC' || idType === 'NIC' || idType === 'NADRA') {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 13) throw new BadRequestException('CNIC 13 hindson ka hota hai (12345-1234567-1)');
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  }
  if (raw.length < 5) throw new BadRequestException('ID number poora likhein');
  return raw.toUpperCase();
}

export function cleanPhone(phone: string | null | undefined, field = 'Phone'): string {
  const p = String(phone ?? '').trim();
  if (p.replace(/\D/g, '').length < 10) throw new BadRequestException(`${field} number sahi likhein (kam az kam 10 hindse)`);
  return p;
}

// ─── Rates ───────────────────────────────────────────────────────────

export interface RoomRateSource {
  id: string;
  basePrice: number;
  weekendPrice: number | null;
  peakPrice: number | null;
  offSeasonPrice: number | null;
}

export interface NightRate { date: string; rate: number; label: string }

interface PlanRow {
  name: string; planType: string; startDate: Date; endDate: Date; isPercentage: boolean; adjustment: number;
  minNights: number | null; maxNights: number | null; applicableDays: number[]; applicableRoomTypeIds: string[]; applicableSources: string[];
}

/** Active rate plans that touch the stay, in the order they apply. */
export async function plansFor(db: Db, tenantId: string, from: Date, to: Date): Promise<PlanRow[]> {
  return db.hotelRatePlan.findMany({
    where: { tenantId, isActive: true, startDate: { lt: to }, endDate: { gte: from } },
    orderBy: [{ displayOrder: 'asc' }, { startDate: 'desc' }],
  });
}

/**
 * Nightly rates for one room: the room's own price or the type's base rate,
 * the weekend rate on Friday and Saturday nights, then the first rate plan
 * that covers the night (season rate or a +/- adjustment).
 */
export function quoteNights(
  rt: RoomRateSource,
  roomPrice: number | null | undefined,
  from: Date,
  nights: number,
  plans: PlanRow[],
  source?: string | null,
): NightRate[] {
  const out: NightRate[] = [];
  for (let i = 0; i < nights; i++) {
    const day = addDays(from, i);
    const dow = day.getUTCDay();
    let rate = Number(roomPrice) > 0 ? Number(roomPrice) : rt.basePrice;
    let label = 'Normal';
    if (WEEKEND_NIGHTS.includes(dow) && Number(rt.weekendPrice) > 0) { rate = Number(rt.weekendPrice); label = 'Weekend'; }
    const plan = plans.find((p) => day >= p.startDate && day <= p.endDate
      && (!p.applicableDays.length || p.applicableDays.includes(dow))
      && (!p.applicableRoomTypeIds.length || p.applicableRoomTypeIds.includes(rt.id))
      && (!p.applicableSources.length || (source != null && p.applicableSources.includes(source)))
      && (!p.minNights || nights >= p.minNights)
      && (!p.maxNights || nights <= p.maxNights));
    if (plan) {
      const type = plan.planType.toUpperCase();
      if (!plan.adjustment && type === 'PEAK' && Number(rt.peakPrice) > 0) rate = Number(rt.peakPrice);
      else if (!plan.adjustment && type === 'OFF_SEASON' && Number(rt.offSeasonPrice) > 0) rate = Number(rt.offSeasonPrice);
      else rate = plan.isPercentage ? rate * (1 + plan.adjustment / 100) : rate + plan.adjustment;
      label = plan.name;
    }
    out.push({ date: keyOf(day), rate: r2(Math.max(rate, 0)), label });
  }
  return out;
}

// ─── Khata ───────────────────────────────────────────────────────────

/** The customer whose khata holds this booking's advances, if any were taken. */
export async function khataHolder(db: Db, tenantId: string, bookingNumber: string): Promise<string | null> {
  const row = await db.customerLedger.findFirst({
    where: { tenantId, reference: bookingNumber, type: 'PAYMENT_RECEIVED' },
    orderBy: { createdAt: 'asc' },
    select: { customerId: true },
  });
  return row?.customerId ?? null;
}

/** Money on the booking split by where it sits (see bakery orders for the same rule). */
export async function bookingMoney(db: Db, tenantId: string, bookingNumber: string, paidAmount: number) {
  const onKhata = await paidOnKhata(db, tenantId, bookingNumber);
  const refunded = await db.customerLedger.aggregate({ where: { tenantId, type: 'REFUND', reference: bookingNumber }, _sum: { amount: true } });
  const held = r2(onKhata - (Number(refunded._sum.amount) || 0));
  const khataPaid = r2(Math.max(Math.min(held, paidAmount), 0));
  return { khataPaid, legacyPaid: r2(Math.max(paidAmount - held, 0)), refunded: r2(Number(refunded._sum.amount) || 0) };
}

/** Khata for a guest's money: the given customer, the guest profile's khata, or one opened by phone. */
export async function guestCustomer(
  db: Db,
  user: AuthenticatedUser,
  g: { customerId?: string | null; primaryGuestId?: string | null; guestName?: string | null; guestPhone?: string | null; shopId: string },
): Promise<string> {
  if (g.customerId) return ensureCustomer(db, user, { customerId: g.customerId });
  const guest = g.primaryGuestId ? await db.hotelGuest.findFirst({ where: { id: g.primaryGuestId, tenantId: user.tenantId } }) : null;
  if (guest?.customerId) {
    const ok = await db.customer.findFirst({ where: { id: guest.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (ok) return ok.id;
  }
  const customerId = await ensureCustomer(db, user, { name: guest?.fullName || g.guestName, phone: guest?.phone || g.guestPhone, shopId: g.shopId });
  if (guest) await db.hotelGuest.update({ where: { id: guest.id }, data: { customerId } });
  return customerId;
}

/** Refunds follow the shop's refund PIN rule, as returns do. */
export async function checkRefundPin(db: Db, user: AuthenticatedUser, managerPin?: string) {
  const rules = await db.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { requirePinForRefund: true } });
  if (rules?.requirePinForRefund) await requireManagerPin(db, user, managerPin, 'Advance wapsi', false, PIN_NEEDS.refund);
}

/**
 * Gives back in cash an advance still held on the khata for this booking:
 * a REFUND line on the khata (reference = booking number) and a cash-out
 * from the branch's open drawer. Returns the amount given back.
 */
export async function refundAdvance(
  tx: Db,
  user: AuthenticatedUser,
  input: { bookingNumber: string; paidAmount: number; shopId?: string | null; amount?: number; note: string },
) {
  const { khataPaid } = await bookingMoney(tx, user.tenantId, input.bookingNumber, input.paidAmount);
  const customerId = await khataHolder(tx, user.tenantId, input.bookingNumber);
  const customer = customerId ? await tx.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true, balance: true } }) : null;
  const held = customer ? Math.max(-Number(customer.balance), 0) : 0;
  const most = r2(Math.min(khataPaid, held));
  const amount = input.amount != null ? r2(input.amount) : most;
  if (!customer || !(most > 0)) throw new BadRequestException('Is booking ka koi advance khata par baqi nahi — wapas karne ko kuch nahi');
  if (!(amount > 0) || amount > most + 0.009) throw new BadRequestException(`Zyada se zyada Rs ${most} wapas ho sakte hain`);

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
      type: 'REFUND', amount, balanceAfter: balance, reference: input.bookingNumber, paymentMethod: 'CASH', note: input.note,
    },
  });
  await tx.cashTransaction.create({
    data: {
      tenantId: user.tenantId, cashRegisterId: register.id, createdById: user.id,
      type: 'CASH_OUT', amount, reason: `Advance wapas: ${input.bookingNumber}`, note: input.note, reference: input.bookingNumber,
    },
  });
  return amount;
}

// ─── Bill ────────────────────────────────────────────────────────────

export interface TenderInput {
  /** Split payment: what was handed over by each method. */
  payments?: Array<{ method: string; amount: number; reference?: string | null }>;
  paymentMethod?: string;
  /** Handed over by one method; left out, the whole amount due is taken. */
  paidAmount?: number;
  /** Nothing taken now: the whole amount due goes on the khata. */
  onCredit?: boolean;
}

/** Reads what the guest handed over against `due`. Change comes off cash only. */
export function readTender(due: number, t: TenderInput) {
  if (t.payments?.length) {
    const parts: PaymentPart[] = t.payments.map((p) => {
      const method = String(p.method ?? '').toUpperCase() as PaymentMethod;
      if (!(MONEY_METHODS as string[]).includes(method)) throw new BadRequestException('Payment ka tareeqa ghalat hai');
      return { method, amount: r2(p.amount), reference: p.reference ?? null };
    });
    const tender = splitTender(due, { parts, method: parts[0].method, paidAmount: 0 });
    return { rows: tender.rows, change: tender.changeAmount, mainMethod: tender.mainMethod };
  }
  const method = toPaymentMethod(t.paymentMethod);
  const handed = t.onCredit ? 0 : t.paidAmount == null ? due : r2(Math.max(Number(t.paidAmount) || 0, 0));
  if (method !== 'CASH' && handed > due + 0.009) throw new BadRequestException('Card, bank ya wallet par change nahi diya ja sakta — zyada paisa sirf Cash me lein');
  const kept = r2(Math.min(handed, due));
  return { rows: kept > 0 ? [{ method, amount: kept }] : [], change: r2(handed - kept), mainMethod: method };
}

export interface BillLine { label: string; amount: number; quantity?: number; cost?: number }

/**
 * Posts a hotel bill as one sale. Advances on the khata are used first (the
 * unpaid part goes on the khata, where the advance cancels it); `rows` is
 * the money taken now, by method; `legacyPaid` was taken before advances
 * went to the khata and is counted with this bill.
 */
export async function postHotelBill(
  tx: Db,
  user: AuthenticatedUser,
  input: {
    saleNumber: string; sourceRef: string; shopId: string; customerId: string | null;
    lines: BillLine[]; discount: number; rows: PaymentPart[]; mainMethod: PaymentMethod; legacyPaid: number;
  },
) {
  const money = r2(input.rows.reduce((s, p) => s + p.amount, 0));
  // A bill voided earlier keeps its number; the new bill takes the next one.
  const used = await tx.sale.count({ where: { tenantId: user.tenantId, saleNumber: { startsWith: input.saleNumber } } });
  const sale = await postIndustrySale(tx, user, {
    saleNumber: used ? `${input.saleNumber}-${used + 1}` : input.saleNumber,
    sourceRef: input.sourceRef,
    shopId: input.shopId,
    customerId: input.customerId,
    lines: input.lines,
    discount: input.discount,
    paidAmount: r2(money + input.legacyPaid),
    paymentMethod: input.mainMethod,
  });
  // The helper stores one payment row; a split bill keeps one row per method.
  const wanted: PaymentPart[] = [...input.rows, ...(input.legacyPaid > 0 ? [{ method: input.mainMethod, amount: input.legacyPaid, note: 'Pehle wasool hua' }] : [])];
  if (wanted.length > 1) {
    const first = await tx.salePayment.findFirst({ where: { saleId: sale.id }, select: { id: true } });
    if (first) {
      await tx.salePayment.update({ where: { id: first.id }, data: { method: wanted[0].method, amount: wanted[0].amount, reference: wanted[0].reference ?? null, note: wanted[0].note ?? null } });
      await saveSalePayments(tx, sale, wanted.slice(1));
    }
  }
  return sale;
}

/** Next guest number (GST-000001) from the highest one, not the row count. */
export async function nextGuestNumber(db: Db, tenantId: string) {
  const last = await db.hotelGuest.findFirst({ where: { tenantId, guestNumber: { startsWith: 'GST-' } }, orderBy: { guestNumber: 'desc' }, select: { guestNumber: true } });
  return 'GST-' + String((last ? Number(last.guestNumber.slice(4)) || 0 : 0) + 1).padStart(6, '0');
}

/** Next housekeeping task number (HK-<year>-00001). */
export async function nextTaskNumber(db: Db, tenantId: string) {
  const prefix = `HK-${keyOf(today()).slice(0, 4)}-`;
  const last = await db.hotelHousekeepingTask.findFirst({ where: { tenantId, taskNumber: { startsWith: prefix } }, orderBy: { taskNumber: 'desc' }, select: { taskNumber: true } });
  return prefix + String((last ? Number(last.taskNumber.slice(prefix.length)) || 0 : 0) + 1).padStart(5, '0');
}

/**
 * The catalog item on a folio charge: from its columns, or for charges
 * posted before they existed, from `reference` (`stock:<productId>:<unitCost>:<shopId|->`).
 * shopId is null when no stock was taken (a service item).
 */
export function folioStock(c: { productId?: string | null; unitCost?: number | null; shopId?: string | null; reference: string | null }) {
  if (c.productId) return { productId: c.productId, unitCost: r2(c.unitCost ?? 0), shopId: c.shopId ?? null };
  const m = /^stock:([^:]+):([\d.]+):([^:]+)$/.exec(c.reference ?? '');
  return m ? { productId: m[1], unitCost: r2(Number(m[2])), shopId: m[3] === '-' ? null : m[3] } : null;
}

/** Throws a clean 404 when a row is missing. */
export function found<T>(row: T | null | undefined, what: string): T {
  if (!row) throw new NotFoundException(`${what} nahi mila`);
  return row;
}
