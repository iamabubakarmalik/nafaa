/**
 * Job states, numbers and bill numbers shared by the service-business
 * modules (jobs, quotes, warranty claims, AMC visits, commission).
 *
 * The usual path of a job: booked (CONFIRMED / SCHEDULED) → technician
 * given (ASSIGNED) → on the way / on site / working → ready (QUALITY_CHECK)
 * → billed (COMPLETED). A job whose bill exists is COMPLETED; a voided bill
 * puts it back to ready.
 */

import type { Prisma, ServiceJobStatus } from '@prisma/client';
import { zonedToUtc } from '../../../common/helpers/business-time.helper';

type Db = Prisma.TransactionClient | { serviceJob: Prisma.TransactionClient['serviceJob'] };

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
export const blank = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

export const CLOSED: ServiceJobStatus[] = ['COMPLETED', 'CANCELLED'];
export const BOOKED: ServiceJobStatus[] = ['DRAFT', 'ENQUIRY', 'QUOTED', 'CONFIRMED', 'SCHEDULED', 'RESCHEDULED'];
export const WORKING: ServiceJobStatus[] = ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'PAUSED'];
export const WAITING: ServiceJobStatus[] = ['AWAITING_PARTS', 'AWAITING_APPROVAL', 'WARRANTY_HOLD', 'DISPUTED'];
/** Work done (or could not be done): the bill is the next step. */
export const READY: ServiceJobStatus[] = ['QUALITY_CHECK', 'UNABLE_TO_COMPLETE'];
export const OPEN: ServiceJobStatus[] = [...BOOKED, ...WORKING, ...WAITING, ...READY];
/** Not started yet: late when the booked time has passed. */
export const NOT_STARTED: ServiceJobStatus[] = [...BOOKED, 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE'];

/** Bill number of a job: SVC-JOB-2026-00001, then -2, -3 … after a void. */
export const jobBillPrefix = (jobNumber: string) => `SVC-${jobNumber}`;
export const jobBillNumber = (jobNumber: string, round = 1) => (round > 1 ? `${jobBillPrefix(jobNumber)}-${round}` : jobBillPrefix(jobNumber));
/** The job number inside a bill number, or null for other bills. */
export function jobNumberOfBill(saleNumber: string): string | null {
  const m = saleNumber.match(/^SVC-(JOB-\d{4}-\d+)(?:-\d+)?$/);
  return m ? m[1] : null;
}
export const amcBillNumber = (amcNumber: string) => `SVC-${amcNumber}`;

/** Next JOB-YYYY-NNNNN; follows the last number so a gap never repeats one. */
export async function nextJobNumber(db: Db, tenantId: string, year = new Date().getFullYear()) {
  const prefix = `JOB-${year}-`;
  const last = await db.serviceJob.findFirst({
    where: { tenantId, jobNumber: { startsWith: prefix } },
    orderBy: { jobNumber: 'desc' },
    select: { jobNumber: true },
  });
  return prefix + String((last ? Number(last.jobNumber.slice(prefix.length)) || 0 : 0) + 1).padStart(5, '0');
}

/** Next number for quotes, claims and contracts: PREFIX-YYYY-NNNN from the last one. */
export async function nextDocNumber(
  find: (prefix: string) => Promise<string | null | undefined>,
  code: string,
  year = new Date().getFullYear(),
) {
  const prefix = `${code}-${year}-`;
  const last = await find(prefix);
  return prefix + String((last ? Number(last.slice(prefix.length)) || 0 : 0) + 1).padStart(4, '0');
}

export function payStatus(paid: number, total: number) {
  if (total <= 0.009) return 'PAID';
  return paid >= total - 0.01 ? 'PAID' : paid > 0.009 ? 'PARTIALLY_PAID' : 'UNPAID';
}

/** Money that is the technician's work (commission base), not parts, travel or tax. */
export const workCharge = (j: { visitCharge: number; labourCharge: number; emergencyCharge: number }) =>
  r2((j.visitCharge || 0) + (j.labourCharge || 0) + (j.emergencyCharge || 0));

/** Job total from its charges; the discount can never exceed the charges. */
export function jobTotal(c: { visitCharge: number; labourCharge: number; partsCharge: number; transportCharge: number; emergencyCharge: number; taxAmount: number; discountAmount: number }) {
  return r2(Math.max(c.visitCharge + c.labourCharge + c.partsCharge + c.transportCharge + c.emergencyCharge + c.taxAmount - c.discountAmount, 0));
}

/** UTC bounds of shop days `from`..`to` (YYYY-MM-DD, both inclusive). */
export function dayRange(from: string, to: string) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return { gte: zonedToUtc(fy, fm, fd), lte: new Date(zonedToUtc(ty, tm, td + 1).getTime() - 1) };
}
