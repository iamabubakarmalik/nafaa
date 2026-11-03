/** Pure rules of the services pack (shared by web and mobile): job charges, what is due on a job, quotation totals and the next step of a job. */

export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface JobCharges { visitCharge: number; labourCharge: number; partsCharge: number; transportCharge: number; emergencyCharge: number; taxAmount: number; discountAmount: number }

/** Total of a job: every charge plus tax, less discount (same as the API). */
export function jobTotal(c: JobCharges): number {
  return round2(Math.max(c.visitCharge + c.labourCharge + c.partsCharge + c.transportCharge + c.emergencyCharge + c.taxAmount - c.discountAmount, 0));
}

/** Parts charge of a job: customer-supplied and warranty parts cost the customer nothing. */
export function partsCharge(parts: Array<{ quantity: number; unitPrice: number; isCustomerSupplied?: boolean; isUnderWarranty?: boolean }>): number {
  return round2(parts.reduce((s, p) => s + (p.isCustomerSupplied || p.isUnderWarranty ? 0 : p.quantity * p.unitPrice), 0));
}

/** Still to collect on a job, after what was paid and what was returned on the bill. */
export const jobDue = (j: { totalCharge: number; paidAmount: number }, returned = 0) => Math.max(round2(j.totalCharge - returned - j.paidAmount), 0);

export interface QuoteLine { kind: string; description: string; quantity: number; unitPrice: number }
export const lineTotal = (l: Pick<QuoteLine, 'quantity' | 'unitPrice'>) => round2(l.quantity * l.unitPrice);

/** Total of a quotation. */
export function quoteTotal(lines: QuoteLine[], discount = 0, tax = 0): number {
  return round2(Math.max(lines.reduce((s, l) => s + lineTotal(l), 0) + tax - discount, 0));
}

export type JobStep = { status: string; label: string } | null;
const FLOW: Array<[string[], { status: string; label: string }]> = [
  [['DRAFT', 'ENQUIRY', 'QUOTED'], { status: 'CONFIRMED', label: 'Confirm' }],
  [['CONFIRMED', 'SCHEDULED', 'RESCHEDULED', 'ASSIGNED'], { status: 'DISPATCHED', label: 'Send out' }],
  [['DISPATCHED'], { status: 'EN_ROUTE', label: 'On the way' }],
  [['EN_ROUTE'], { status: 'ARRIVED', label: 'Arrived' }],
  [['ARRIVED', 'PAUSED', 'AWAITING_PARTS', 'AWAITING_APPROVAL'], { status: 'IN_PROGRESS', label: 'Start work' }],
  [['IN_PROGRESS'], { status: 'QUALITY_CHECK', label: 'Work done' }],
];
/** The next status button of a job; a finished job goes to its bill, not to a status. */
export function nextStep(status: string): JobStep {
  return FLOW.find(([from]) => from.includes(status))?.[1] ?? null;
}
/** A job whose work is done and which can be billed. */
export const canBill = (status: string) => status === 'QUALITY_CHECK';
export const isClosed = (status: string) => ['COMPLETED', 'CANCELLED'].includes(status);

/** Technician's commission on a billed job: percent of the work (labour and visit), a fixed amount per job, or both. */
export function techCommission(work: number, rule: { type: string; pct?: number; fixed?: number }): number {
  if (rule.type === 'PERCENTAGE') return round2((work * (rule.pct ?? 0)) / 100);
  if (rule.type === 'FIXED') return round2(rule.fixed ?? 0);
  if (rule.type === 'BOTH') return round2((work * (rule.pct ?? 0)) / 100 + (rule.fixed ?? 0));
  return 0;
}
