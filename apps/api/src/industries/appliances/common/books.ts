/**
 * Puts appliance service money (repairs, installations, AMC contracts) into
 * the books through the shared industry-sale helper, so the day book, cash
 * register, khata and profit reports all see it.
 *
 *   - money taken before the job is billed sits on the customer's khata as an advance;
 *   - the finished job becomes a product-less Sale numbered like the job;
 *   - money taken after the bill is a khata payment.
 *
 * A voided bill frees the job: the next bill takes the job number with a
 * suffix (INST-2026-0001-2), and everything already paid on khata for the
 * job counts as paid on it.
 */
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  IndustrySaleLine, ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';

type Db = Prisma.TransactionClient;

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

export interface JobParty {
  /** Job number (SR-…, INS-…, AMC-…): the bill number and the khata reference. */
  number: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

/** Every bill number a job can carry: its own number, then `-2`, `-3`… after voids. */
const numberWhere = (number: string): Prisma.SaleWhereInput => ({
  OR: [{ saleNumber: number }, { saleNumber: { startsWith: `${number}-` } }],
});

/** Job number behind a bill number (`INST-2026-0001-2` → `INST-2026-0001`), or null for other bills. */
export function jobNumberOfBill(saleNumber: string) {
  const m = /^((?:INST|SR|AMC|APDL|WC)-\d{4}-\d{4,})(?:-\d+)?$/.exec(saleNumber);
  return m ? m[1] : null;
}

/** The live (not voided) bill posted for a job, if any. */
export function billOf(db: Db, tenantId: string, number: string) {
  return db.sale.findFirst({
    where: { tenantId, ...numberWhere(number), status: { not: 'VOIDED' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, saleNumber: true, customerId: true, status: true },
  });
}

/**
 * Money received for a job. Before the bill it is an advance on khata; after
 * the bill it pays the bill's udhaar. Returns the customer it was booked to.
 * Method left out is cash.
 */
export async function receiveJobMoney(db: Db, user: AuthenticatedUser, job: JobParty, amount: number, note: string, method?: string | null) {
  const value = r2(amount);
  if (value <= 0) throw new BadRequestException('Amount 0 se ziyada honi chahiye');
  const shopId = await resolveIndustryShopId(db, user, null);
  const bill = await billOf(db, user.tenantId, job.number);
  const customerId = bill?.customerId
    ?? await ensureCustomer(db, user, { customerId: job.customerId, name: job.customerName, phone: job.customerPhone, shopId });
  await recordKhataPayment(db, user, { customerId, shopId, amount: value, reference: job.number, note, method });
  return customerId;
}

/**
 * Bills a finished job once. `paidSoFar` is everything the job record says
 * was paid; whatever is not already on khata counts as paid with this bill.
 */
export async function billJob(
  db: Db,
  user: AuthenticatedUser,
  job: JobParty,
  lines: IndustrySaleLine[],
  paidSoFar: number,
  paymentMethod?: string | null,
) {
  const total = r2(lines.reduce((s, l) => s + r2(l.amount), 0));
  // A free job still posts a Rs 0 bill when the shop bore a cost (own parts on a warranty job).
  if (total <= 0 && !lines.some((l) => (Number(l.cost) || 0) > 0)) return null;
  const existing = await billOf(db, user.tenantId, job.number);
  if (existing) return existing;
  const earlier = await db.sale.count({ where: { tenantId: user.tenantId, ...numberWhere(job.number) } });
  const saleNumber = earlier ? `${job.number}-${earlier + 1}` : job.number;

  const onKhata = await paidOnKhata(db, user.tenantId, job.number);
  const paidAtCounter = r2(Math.min(Math.max(paidSoFar - onKhata, 0), total));
  const shopId = await resolveIndustryShopId(db, user, null);
  let customerId = job.customerId ?? null;
  if (!customerId && (total - paidAtCounter > 0.005 || onKhata > 0)) {
    if (!job.customerName?.trim()) {
      throw new BadRequestException(`Rs ${r2(total - paidAtCounter)} baqi hai — poori amount lein ya customer ka naam likhein`);
    }
    customerId = await ensureCustomer(db, user, { name: job.customerName, phone: job.customerPhone, shopId });
  }
  return postIndustrySale(db, user, {
    saleNumber,
    sourceRef: job.number,
    shopId,
    customerId,
    lines,
    paidAmount: paidAtCounter,
    paymentMethod,
  });
}
