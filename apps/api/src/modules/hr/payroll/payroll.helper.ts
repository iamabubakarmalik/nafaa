/**
 * Payroll arithmetic, kept free of the database so the run sheet, the saved
 * record and the payslip all use the same numbers.
 *
 *   base pay    MONTHLY / HYBRID   the monthly salary, by calendar days employed when
 *                                  the person joined or left during the month
 *               DAILY              rate x days worked (present, late, half day as 0.5)
 *               HOURLY             rate x hours worked
 *               PER_TASK           rate x tasks (entered on the run)
 *               COMMISSION         0, commission only
 *   absent cut  MONTHLY / HYBRID only: (absent + half days x 0.5 + unpaid leave) x day rate,
 *               only when attendance was marked that month
 *   overtime    overtime hours x hour rate, unless typed in
 *   gross       base + overtime + commission + bonuses
 *   deductions  absent cut + advance due this month + other deductions
 *   net         gross - deductions (never below zero; a larger advance is refused)
 *
 * Bonuses and deductions with their reasons are stored in the record's notes
 * as "Reason: +5000" / "Reason: -500" lines, so any screen can read them.
 */

import { SalaryType } from '@prisma/client';

interface StaffPay {
  salaryType: SalaryType;
  baseSalary: number;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
}

export interface AttendanceTally {
  /** Days with any attendance row. */
  marked: number;
  present: number;
  late: number;
  half: number;
  absent: number;
  leave: number;
  holiday: number;
  hours: number;
  overtimeHours: number;
  lateMinutes: number;
}

export interface PayLine { label: string; amount: number }

interface PayInput {
  staff: StaffPay;
  att: AttendanceTally;
  /** Approved unpaid-leave days in the month not already marked absent. */
  unpaidLeave: number;
  /** Share of the month the person was employed (joined or left mid-month); 1 = whole month. */
  employed?: number;
  advanceDue: number;
  commission: number;
  adds?: PayLine[];
  cuts?: PayLine[];
  units?: number;
  overtimePay?: number;
  skipAbsentCut?: boolean;
  includeCommission?: boolean;
}

export interface PayResult {
  /** What base pay is counted in: days, hours, tasks or the month. */
  unitKind: 'month' | 'days' | 'hours' | 'tasks' | 'none';
  units: number;
  rate: number;
  dayRate: number;
  hourRate: number;
  basePay: number;
  daysWorked: number;
  absentDays: number;
  absentCut: number;
  overtimePay: number;
  commission: number;
  bonuses: number;
  otherCuts: number;
  advance: number;
  gross: number;
  deductions: number;
  net: number;
  /** The advance is larger than what is left to pay. */
  advanceTooBig: boolean;
}

const r0 = (v: number) => Math.round(v);
const sum = (l?: PayLine[]) => (l ?? []).reduce((a, x) => a + (Number(x.amount) || 0), 0);

export const emptyTally = (): AttendanceTally => ({
  marked: 0, present: 0, late: 0, half: 0, absent: 0, leave: 0, holiday: 0, hours: 0, overtimeHours: 0, lateMinutes: 0,
});

export function computePay(i: PayInput): PayResult {
  const s = i.staff;
  const base = Number(s.baseSalary) || 0;
  const days = Math.max(1, Number(s.workingDaysPerMonth) || 26);
  const hours = Math.max(1, Number(s.workingHoursPerDay) || 8);
  const monthly = s.salaryType === 'MONTHLY' || s.salaryType === 'HYBRID';
  const daysWorked = i.att.present + i.att.late + i.att.half * 0.5;

  const dayRate = monthly ? base / days : s.salaryType === 'DAILY' ? base : s.salaryType === 'HOURLY' ? base * hours : 0;
  const hourRate = monthly ? base / (days * hours) : s.salaryType === 'DAILY' ? base / hours : s.salaryType === 'HOURLY' ? base : 0;

  let unitKind: PayResult['unitKind'] = 'none';
  let units = 0;
  let rate = 0;
  let basePay = 0;
  switch (s.salaryType) {
    case 'MONTHLY':
    case 'HYBRID':
      unitKind = 'month'; units = 1; rate = base; basePay = base * Math.min(1, Math.max(0, i.employed ?? 1));
      break;
    case 'DAILY':
      unitKind = 'days'; units = i.units ?? daysWorked; rate = base; basePay = base * units;
      break;
    case 'HOURLY':
      unitKind = 'hours'; units = i.units ?? Math.round(i.att.hours * 100) / 100; rate = base; basePay = base * units;
      break;
    case 'PER_TASK':
      unitKind = 'tasks'; units = i.units ?? 0; rate = base; basePay = base * units;
      break;
    default:
      break;
  }

  // Absences are only cut when attendance was kept that month.
  const absentDays = monthly && i.att.marked > 0 ? i.att.absent + i.att.half * 0.5 + i.unpaidLeave : monthly ? i.unpaidLeave : 0;
  const absentCut = i.skipAbsentCut ? 0 : r0(Math.min(basePay, absentDays * dayRate));
  const overtimePay = r0(i.overtimePay ?? i.att.overtimeHours * hourRate);
  const commission = i.includeCommission ? r0(i.commission) : 0;
  const bonuses = r0(sum(i.adds));
  const otherCuts = r0(sum(i.cuts));
  const gross = r0(basePay) + overtimePay + commission + bonuses;
  const room = gross - absentCut - otherCuts;
  const advance = r0(i.advanceDue);
  const deductions = absentCut + otherCuts + advance;
  return {
    unitKind, units, rate, dayRate: r0(dayRate), hourRate: Math.round(hourRate * 100) / 100,
    basePay: r0(basePay), daysWorked, absentDays, absentCut, overtimePay, commission, bonuses, otherCuts, advance,
    gross, deductions, net: Math.max(0, gross - deductions), advanceTooBig: advance > 0 && advance > room,
  };
}

/* ───────── notes: bonus and deduction lines ───────── */

const LINE = /^(.{1,60}): ([+-])(\d+(?:\.\d+)?)$/;

/** "Eid bonus: +5000" lines, then the free note. */
export function writeNotes(adds: PayLine[] = [], cuts: PayLine[] = [], note?: string | null): string | null {
  const clean = (l: string) => l.replace(/[\r\n:]+/g, ' ').trim().slice(0, 60);
  const lines = [
    ...adds.map((a) => `${clean(a.label)}: +${r0(a.amount)}`),
    ...cuts.map((c) => `${clean(c.label)}: -${r0(c.amount)}`),
    ...(note?.trim() ? [note.trim()] : []),
  ];
  return lines.length ? lines.join('\n') : null;
}

export function readNotes(notes?: string | null): { adds: PayLine[]; cuts: PayLine[]; note: string | null } {
  const adds: PayLine[] = [];
  const cuts: PayLine[] = [];
  const rest: string[] = [];
  for (const line of (notes ?? '').split('\n')) {
    const m = LINE.exec(line.trim());
    if (m) (m[2] === '+' ? adds : cuts).push({ label: m[1], amount: Number(m[3]) });
    else if (line.trim()) rest.push(line.trim());
  }
  return { adds, cuts, note: rest.length ? rest.join('\n') : null };
}

/* ───────── months ───────── */

function monthParts(key: string): { y: number; m: number } {
  const [y, m] = key.split('-').map(Number);
  return { y, m };
}

export function shiftMonth(key: string, by: number): string {
  const { y, m } = monthParts(key);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Calendar dates of a month for @db.Date columns (attendance, salary period). */
export function monthDates(key: string): { first: Date; last: Date; next: Date; days: number } {
  const { y, m } = monthParts(key);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const next = new Date(Date.UTC(y, m, 1));
  const last = new Date(next.getTime() - 86_400_000);
  return { first, last, next, days: last.getUTCDate() };
}

export const monthKeyOf = (d: Date) => d.toISOString().slice(0, 7);

/** Share of the month between joining and leaving, by calendar day. */
export function employedShare(key: string, joinDate: Date, endDate: Date | null): number {
  const { first, last, days } = monthDates(key);
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const from = Math.max(first.getTime(), day(joinDate));
  const to = Math.min(last.getTime(), endDate ? day(endDate) : last.getTime());
  if (to < from) return 0;
  return Math.min(1, (Math.round((to - from) / 86_400_000) + 1) / days);
}
