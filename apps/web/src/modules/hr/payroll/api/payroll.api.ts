/**
 * Payroll API: the month's run sheet, paying one or all, paying a balance,
 * advances, cancelling, history, one record (payslip) and analytics. All
 * figures are worked out on the server; months are "YYYY-MM".
 */

import { apiClient } from '@core/api/client';

export type SalaryType = 'MONTHLY' | 'DAILY' | 'HOURLY' | 'PER_TASK' | 'COMMISSION' | 'HYBRID';
export type RecordStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
export type PaySource = 'DRAWER' | 'ACCOUNT' | 'NONE';
export type AccountKind = 'CASH' | 'BANK' | 'WALLET';

export interface PayLine { label: string; amount: number }

export interface PayrollStaff {
  id: string;
  staffNumber: string;
  fullName: string;
  designation: string;
  department?: string | null;
  avatarUrl?: string | null;
  phone: string;
  cnic?: string | null;
  status: string;
  userId?: string | null;
  shopId?: string | null;
  salaryType: SalaryType;
  baseSalary: number;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  joinDate: string;
  endDate?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  shop?: { id: string; name: string } | null;
}

interface Attendance {
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
  unpaidLeave: number;
  days: number;
}

export interface PayPreview {
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
  advanceTooBig: boolean;
}

export interface SalaryRecord {
  id: string;
  staffId: string;
  paymentNumber: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  daysWorked: number;
  hoursWorked: number;
  overtimePay: number;
  commissionEarned: number;
  bonuses: number;
  advances: number;
  leaveDeduction: number;
  lateDeduction: number;
  otherDeductions: number;
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: string;
  status: RecordStatus;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  kind: 'salary' | 'advance';
  month: string;
  monthLabel: string;
  adds: PayLine[];
  cuts: PayLine[];
  note: string | null;
  staff: { id: string; staffNumber: string; fullName: string; designation: string; avatarUrl?: string | null; shopId?: string | null; salaryType: SalaryType; shop?: { id: string; name: string } | null };
}

export interface RunRow {
  staff: PayrollStaff;
  attendance: Attendance;
  advances: Array<{ id: string; paymentNumber: string; amount: number }>;
  commission: { earned: number; paidSeparately: boolean; enrolled: boolean; included: boolean } | null;
  preview: PayPreview;
  record: SalaryRecord | null;
  warnings: string[];
}

interface PayAccount { id: string; name: string; kind: AccountKind; method?: string | null; shopId?: string | null; shopName?: string | null; balance: number }

export interface Sources {
  canDrawer: boolean;
  canAccount: boolean;
  drawer: { registerId: string; registerNumber: string; openedAt: string; cash: number } | null;
  accounts: PayAccount[];
}

export interface RunSheet {
  month: string;
  label: string;
  isCurrent: boolean;
  isFuture: boolean;
  branchId: string | null;
  rows: RunRow[];
  totals: {
    staff: number; saved: number; open: number; gross: number; net: number; paid: number; due: number; advance: number; commission: number;
    sales: number; salesPct: number | null; advanceOutstanding: { amount: number; staff: number };
  };
  commission: 'ok' | 'hidden' | 'off';
  canPayCommission: boolean;
  canPay: boolean;
  sources: Sources;
}

/** What may be changed on one line before saving. */
export interface RunEdit {
  adds?: PayLine[];
  cuts?: PayLine[];
  units?: number;
  overtimePay?: number;
  skipAbsentCut?: boolean;
  includeCommission?: boolean;
  payAmount?: number;
  note?: string;
}

interface SourcePick { source: PaySource; accountId?: string; allowNegative?: boolean; requestId: string }

export interface RunResult {
  duplicate: boolean;
  created: SalaryRecord[];
  skipped: Array<{ staffId: string; name: string; reason: string }>;
  paid: number;
  source?: string | null;
}

export interface HistoryQuery {
  staffId?: string;
  shopId?: string;
  kind?: 'salary' | 'advance';
  status?: RecordStatus;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface HistoryPage {
  items: SalaryRecord[];
  total: number;
  page: number;
  pages: number;
  totals: { gross: number; net: number; paid: number; due: number; count: number; cancelled: number };
}

interface Movement { id: string; at: string; back: boolean; amount: number; reason?: string | null; from: string; by?: string | null }

export interface RecordDetail extends Omit<SalaryRecord, 'staff'> {
  staff: PayrollStaff;
  paidBy: string | null;
  money: Movement[];
  related: Array<{ id: string; paymentNumber: string; periodStart: string; paidAmount: number; status: RecordStatus; paidAt?: string | null; month: string; label: string }>;
}

export interface AdvanceGroup {
  id: string;
  number: string;
  staff: SalaryRecord['staff'];
  givenAt?: string | null;
  method: string;
  status: RecordStatus;
  reason: string | null;
  parts: Array<{ id: string; number: string; month: string; label: string; amount: number; cutIn: string | null }>;
  total: number;
  remaining: number;
  canCancel: boolean;
}

export interface AdvanceList { groups: AdvanceGroup[]; totals: { open: number; remaining: number; staff: number } }

interface Bucket { key: string; label: string; amount: number }

export interface Analytics {
  months: Array<{
    key: string; label: string; gross: number; net: number; paid: number; due: number; base: number; overtime: number; commission: number;
    bonuses: number; cuts: number; advanceGiven: number; staff: number; sales: number; pct: number | null;
  }>;
  totals: { gross: number; sales: number; pct: number | null; average: number; perStaff: number; current: number; previous: number; change: number | null; advanceGiven: number };
  mix: Bucket[];
  byBranch: Array<{ key: string; label: string; gross: number; staff: number; sales: number; pct: number | null }>;
  byStaff: Array<{ key: string; label: string; designation: string; gross: number; months: number; average: number }>;
  byDesignation: Bucket[];
}

interface AdvancePayload extends SourcePick {
  staffId: string;
  amount: number;
  installments?: number;
  firstMonth: string;
  reason: string;
  shopId?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const BASE = '/staff/payroll';

export const payrollApi = {
  run: (month: string, shopId?: string) =>
    apiClient.get<{ data: RunSheet }>(`${BASE}/run`, { params: { month, shopId } }).then(unwrap),

  process: (body: SourcePick & { month: string; shopId?: string; rows: Array<RunEdit & { staffId: string }> }) =>
    apiClient.post<{ data: RunResult }>(`${BASE}/run`, body).then(unwrap),

  payBalance: (id: string, body: SourcePick & { amount: number; shopId?: string }) =>
    apiClient.post<{ data: { duplicate: boolean; record: SalaryRecord } }>(`${BASE}/records/${id}/pay`, body).then(unwrap),

  cancel: (id: string, body: { reason: string; requestId: string; shopId?: string }) =>
    apiClient.post<{ data: { ok: boolean; number: string } }>(`${BASE}/records/${id}/cancel`, body).then(unwrap),

  record: (id: string) =>
    apiClient.get<{ data: RecordDetail }>(`${BASE}/records/${id}`).then(unwrap),

  history: (q: HistoryQuery) =>
    apiClient.get<{ data: HistoryPage }>(`${BASE}/history`, { params: q }).then(unwrap),

  advances: (shopId?: string, staffId?: string) =>
    apiClient.get<{ data: AdvanceList }>(`${BASE}/advances`, { params: { shopId, staffId } }).then(unwrap),

  giveAdvance: (body: AdvancePayload) =>
    apiClient.post<{ data: { duplicate: boolean; number?: string; amount?: number; installments?: number; from?: string } }>(`${BASE}/advances`, body).then(unwrap),

  analytics: (month?: string, shopId?: string, months?: number) =>
    apiClient.get<{ data: Analytics }>(`${BASE}/analytics`, { params: { month, shopId, months } }).then(unwrap),
};
