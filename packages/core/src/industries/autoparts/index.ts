/**
 * Pure rules of the auto parts pack (shared by web and mobile): where a job
 * card stands on its path, what is due and late, which part fits which
 * vehicle, which vehicle papers are ending, and the WhatsApp link of a
 * Pakistani number. No labels here; screens translate the words.
 */

export type JobStatus = 'DRAFT' | 'QUOTED' | 'APPROVED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'WAITING_APPROVAL' | 'READY_FOR_TEST' | 'QUALITY_CHECK' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED' | 'ON_HOLD';

/** The usual path of a job, for the step bar and the "next step" button. */
export const JOB_FLOW: JobStatus[] = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'];
/** Side states a job can be put in while it is open. */
export const JOB_SIDE: JobStatus[] = ['WAITING_APPROVAL', 'WAITING_PARTS', 'ON_HOLD'];
/** Statuses where the vehicle is ready to hand back. */
export const READY: JobStatus[] = ['READY_FOR_TEST', 'QUALITY_CHECK', 'COMPLETED'];
export const isClosed = (s: JobStatus) => s === 'DELIVERED' || s === 'CANCELLED';
export const isReady = (s: JobStatus) => READY.includes(s);

/** Where the job is on the usual path: 0 received, 1 working, 2 ready, 3 handed back. */
export const stepOf = (s: JobStatus) => (s === 'DELIVERED' ? 3 : isReady(s) ? 2 : s === 'DRAFT' || s === 'QUOTED' ? 0 : 1);

export type NextJobStep = { to: JobStatus | 'DELIVER'; step: 'start' | 'finish' | 'deliver' };
/** The button an open job offers next; null when the job is closed. */
export function nextJobStep(s: JobStatus): NextJobStep | null {
  if (isClosed(s)) return null;
  if (isReady(s)) return { to: 'DELIVER', step: 'deliver' };
  if (s === 'IN_PROGRESS') return { to: 'COMPLETED', step: 'finish' };
  return { to: 'IN_PROGRESS', step: 'start' };
}

const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

/** Money still to be paid on a job. */
export const jobDue = (j: { total: number; paidAmount: number }) => Math.max(r2(Number(j.total || 0) - Number(j.paidAmount || 0)), 0);

/** A promised time that has passed on a job still in the workshop and not yet ready. */
export const jobIsLate = (j: { status: JobStatus; promisedAt?: string | null }, now: number = Date.now()) =>
  !isClosed(j.status) && !!j.promisedAt && new Date(j.promisedAt).getTime() < now && !isReady(j.status);

/** Whole days from today to a date (negative = past); null without a date. */
export const daysUntil = (iso?: string | null, now: number = Date.now()) => (iso ? Math.ceil((new Date(iso).getTime() - now) / 86_400_000) : null);

export interface VehiclePapers { insuranceExpiry?: string | null; tokenTaxExpiry?: string | null; fitnessExpiry?: string | null }
export type PaperKind = 'insurance' | 'token' | 'fitness';
/** Paper dates that end within `within` days (or already ended), soonest first. */
export function papersDue(v: VehiclePapers, within = 30, now: number = Date.now()): Array<{ kind: PaperKind; date: string; left: number }> {
  const rows: Array<[PaperKind, string | null | undefined]> = [['insurance', v.insuranceExpiry], ['token', v.tokenTaxExpiry], ['fitness', v.fitnessExpiry]];
  return rows
    .map(([kind, date]) => ({ kind, date: date ?? '', left: daysUntil(date, now) }))
    .filter((x): x is { kind: PaperKind; date: string; left: number } => !!x.date && x.left !== null && x.left <= within)
    .sort((a, b) => a.left - b.left);
}

export interface Fitment { makeId?: string | null; modelId?: string | null; makeName?: string | null; modelName?: string | null; yearFrom?: number | null; yearTo?: number | null }

/** True when a fitment row covers the vehicle (company, model when named, and the year when both are known). */
export function fits(f: Fitment, v: { makeId?: string | null; modelId?: string | null; year?: number | null }): boolean {
  if (f.makeId && f.makeId !== v.makeId) return false;
  if (f.modelId && f.modelId !== v.modelId) return false;
  if (v.year) {
    if (f.yearFrom && v.year < f.yearFrom) return false;
    if (f.yearTo && v.year > f.yearTo) return false;
  }
  return true;
}

/** A part fits when it is universal, has no rows, or one row covers the vehicle. */
export const partFits = (p: { universal?: boolean; fitments?: Fitment[] | null }, v: { makeId?: string | null; modelId?: string | null; year?: number | null }) =>
  !!p.universal || !p.fitments?.length || p.fitments.some((f) => fits(f, v));

/** "2016–2020", "2016 se", "2020 tak": the words are the caller's; this gives the numbers and which kind. */
export function yearRange(f: Pick<Fitment, 'yearFrom' | 'yearTo'>): { kind: 'both' | 'from' | 'to' | 'any'; from?: number; to?: number } {
  if (f.yearFrom && f.yearTo) return { kind: 'both', from: f.yearFrom, to: f.yearTo };
  if (f.yearFrom) return { kind: 'from', from: f.yearFrom };
  if (f.yearTo) return { kind: 'to', to: f.yearTo };
  return { kind: 'any' };
}

/** A "from" year above the "to" year is a mistake. */
export const badYears = (from?: number | null, to?: number | null) => !!from && !!to && from > to;

/** Plate as written on the number plate: upper case, single spaces. */
export const plate = (v?: string | null) => (v ?? '').toUpperCase().replace(/\s+/g, ' ').trim();

/** Digits only. */
export const digitsOf = (v?: string | null) => (v ?? '').replace(/\D/g, '');

/** WhatsApp link for a Pakistani number (03xx or 923xx); undefined when the number is too short. */
export function waLink(phone: string | null | undefined, text: string): string | undefined {
  const d = digitsOf(phone);
  if (d.length < 10) return undefined;
  const intl = d.startsWith('92') ? d : d.startsWith('0') ? `92${d.slice(1)}` : `92${d}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

/** Labour added on the new-job form: one line per amount, one hour at that rate. */
export function labourLines(rows: Array<{ description: string; amount: number }>) {
  return rows.filter((l) => l.description.trim()).map((l) => ({ description: l.description.trim(), hours: 1, ratePerHour: l.amount }));
}
