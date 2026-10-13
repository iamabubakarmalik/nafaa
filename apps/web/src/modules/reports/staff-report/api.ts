/**
 * Staff report API: the overview for a business-day period, counter shifts,
 * one person's detail and their bills. Cost, profit and margin are missing
 * from responses for users without cost access, so they are optional here.
 */

import { apiClient } from '@core/api/client';

export const STAFF_REPORT_KEY = 'staff-report';

export interface Period { from: string; to: string }

export type HoursSource = 'attendance' | 'shift' | 'active' | null;

export interface StaffRow {
  id: string | null;
  name: string;
  role: string | null;
  designation: string | null;
  avatarUrl: string | null;
  active: boolean;
  bills: number; gross: number; refunds: number; net: number;
  cost?: number; profit?: number; margin?: number;
  average: number; maxBill: number;
  qty: number; lines: number; itemsPerBill: number;
  customers: number; walkIns: number;
  discount: number; manualDiscount: number; discountBills: number; discountPct: number;
  credit: number; creditBills: number; creditPct: number; collected: number;
  returnedBills: number; returnPct: number; reassigned: number;
  voided: number; voidedValue: number; voidPct: number;
  returnsDone: number; returnsDoneValue: number; returnsOthers: number;
  pinApprovals: number; pinFailures: number;
  shifts: number; shiftsClosed: number; short: number; shortCount: number; over: number; overCount: number; shiftHours: number;
  cashIn: number; cashInCount: number; cashOut: number; cashOutCount: number;
  attendance: { days: number; hours: number; late: number; absent: number; leave: number; overtime: number } | null;
  days: number; hours: number; hoursSource: HoursSource;
  perHour: number; itemsPerHour: number; billsPerHour: number;
  first: string | null; last: string | null;
  share: number; rank: number;
  prevNet: number | null; prevBills: number | null; prevRank: number | null;
}

export type AlertKind = 'discount' | 'void' | 'return' | 'credit' | 'short' | 'pin';
export interface StaffAlert { userId: string; name: string; kind: AlertKind; level: 'high' | 'medium'; value: number; team: number; count: number }

export interface StaffOverview {
  from: string; to: string; grouping: 'day' | 'month';
  /** Settings → Reports hides drawer money from this user: shorts, overs and cash in/out come back as 0. */
  drawerHidden?: boolean;
  totals: {
    staff: number; bills: number; gross: number; refunds: number; net: number; cost?: number; profit?: number;
    qty: number; discount: number; manualDiscount: number; discountBills: number; credit: number; creditBills: number; collected: number;
    voided: number; voidedValue: number; returnedBills: number; returnsDone: number; returnsDoneValue: number; reassigned: number;
    pinApprovals: number; pinFailures: number; shifts: number; short: number; shortCount: number; over: number; overCount: number;
    cashIn: number; cashOut: number;
  };
  team: { average: number; itemsPerBill: number; discountPct: number; voidPct: number; returnPct: number; creditPct: number; perStaff: number; perHour: number };
  previous: { bills: number; net: number; manualDiscount: number; voided: number; staff: number } | null;
  staff: StaffRow[];
  alerts: StaffAlert[];
  trend: Array<{ key: string; net: number; bills: number; staff: Record<string, number> }>;
  trendStaff: string[];
  heatmap: number[][];
  hourly: Array<{ hour: number; bills: number; net: number }>;
  staffHours: Array<{ id: string; hours: number[] }>;
  byShop: Array<{ id: string | null; name: string; bills: number; net: number; staff: number; top: { id: string; name: string; net: number } | null }>;
  idle: Array<{ id: string; name: string; role: string }>;
  commission: {
    period: string; scope: 'own' | 'all'; total: number;
    rows: Array<{ userId: string; earned: number; enrolled: boolean; paid: boolean; targetPct: number | null }>;
  } | null;
}

export type ShiftStatusFilter = '' | 'open' | 'closed' | 'short' | 'over' | 'matched';

export interface ShiftRow {
  id: string; number: string; status: 'OPEN' | 'CLOSED'; shop: { id: string; name: string } | null; notes: string | null;
  openedAt: string; closedAt: string | null; hours: number | null;
  openedBy: { id: string; fullName: string }; closedBy: { id: string; fullName: string } | null; closedByOther: boolean;
  opening: number; expected: number; counted: number | null; difference: number | null;
  cashSales: number; bills: number; billTotal: number;
  cashIn: number; cashInCount: number; cashOut: number; cashOutCount: number; expenses: number; refunds: number;
  live: boolean;
}
export interface ShiftBucket {
  key: string; label: string; shifts: number; closed: number; short: number; shortCount: number; over: number; overCount: number;
  hours: number; cashSales: number; net: number; avgHours: number; matchedPct: number;
}
export interface ShiftList {
  from: string | null; to: string;
  items: ShiftRow[]; count: number; page: number; pages: number;
  totals: ShiftBucket & { open: number; closedByOther: number };
  byStaff: ShiftBucket[]; byShop: ShiftBucket[]; byDay: ShiftBucket[];
  hourOpen: number[];
  capped: boolean;
}

export interface PersonDetail {
  from: string; to: string; grouping: 'day' | 'month';
  person: {
    id: string; name: string; role: string; active: boolean; avatarUrl: string | null; phone: string | null;
    lastLoginAt: string | null; since: string; shop: string | null;
    staff: { id: string; number: string; designation: string; status: string } | null;
  };
  trend: Array<{ key: string; bills: number; net: number; discount: number }>;
  heatmap: number[][];
  payments: Array<{ method: string; bills: number; net: number; collected: number; credit: number }>;
  products: Array<{ id: string; name: string; unit: string; qty: number; net: number; bills: number }>;
  shifts: Array<{
    id: string; number: string; status: 'OPEN' | 'CLOSED'; shop: string | null; openedAt: string; closedAt: string | null; hours: number | null;
    opening: number; expected: number | null; counted: number | null; difference: number | null; cashSales: number; closedBy: string | null;
  }>;
  returns: Array<{ id: string; number: string; at: string; amount: number; method: string; reason: string | null; sale: { id: string; number: string; customer: string | null }; ownBill: boolean }>;
  voided: Array<{ id: string; number: string; soldAt: string; voidedAt: string; total: number; customer: string | null }>;
  pins: Array<{ id: string; ok: boolean; text: string; at: string }>;
  attendance: {
    summary: { days: number; hours: number; late: number; absent: number; leave: number; overtime: number } | null;
    days: Array<{ date: string; status: string; checkIn: string | null; checkOut: string | null; hours: number; late: number }>;
    linked: boolean;
  };
  commission: { period: string; row: { userId: string; earned: number; enrolled: boolean; paid: boolean; targetPct: number | null } | null } | null;
}

export type BillKind = 'all' | 'discount' | 'credit' | 'returned' | 'voided' | 'big';
export interface BillList {
  page: number; limit: number; count: number; pages: number;
  items: Array<{
    id: string; number: string; soldAt: string; status: string; subtotal: number; total: number; discount: number; manualDiscount: number;
    refunded: number; credit: number; method: string; lines: number; customer: string | null; madeBy: string | null;
  }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const staffReportApi = {
  overview: (p: Period) => apiClient.get<{ data: StaffOverview }>('/reports/staff', { params: p }).then(unwrap),
  shifts: (q: Period & { staffId?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: ShiftList }>('/reports/staff/shifts', { params: q }).then(unwrap),
  person: (userId: string, p: Period) => apiClient.get<{ data: PersonDetail }>(`/reports/staff/person/${userId}`, { params: p }).then(unwrap),
  bills: (q: Period & { userId: string; kind?: BillKind; page?: number; limit?: number }) =>
    apiClient.get<{ data: BillList }>('/reports/staff/bills', { params: q }).then(unwrap),
};
