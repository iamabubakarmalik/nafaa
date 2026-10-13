/**
 * Attendance API: today's board, the day-by-day sheet for a period,
 * check-in / check-out, owner corrections and leave requests.
 */

import { apiClient } from '@core/api/client';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';
export type LeaveType = 'CASUAL' | 'SICK' | 'ANNUAL' | 'UNPAID' | 'EMERGENCY' | 'MATERNITY' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/** P present · L late · H half day · A absent · LV leave · HO holiday · OFF weekly off · NONE not marked · NA not employed · FUT future. */
export type DayCode = 'P' | 'L' | 'H' | 'A' | 'LV' | 'HO' | 'OFF' | 'NONE' | 'NA' | 'FUT';

export interface DayCell {
  code: DayCode;
  id?: string;
  in?: string | null;
  out?: string | null;
  /** Minutes after opening time (0 within the grace). */
  late: number;
  worked: number;
  ot: number;
  leaveType?: LeaveType;
  unpaid?: boolean;
  note?: string | null;
}

export interface ShopClock {
  tz: string;
  dayStartHour: number;
  openTime: string;
  openTimeSet: boolean;
  closeTime: string | null;
  workingDays: string[];
  graceMinutes: number;
}

export interface AttStaff {
  id: string;
  staffNumber: string;
  fullName: string;
  designation: string;
  avatarUrl?: string | null;
  status: string;
  joinDate: string;
  endDate?: string | null;
  workingHoursPerDay: number;
  userId?: string | null;
  shop?: { id: string; name: string } | null;
}

export interface Board {
  day: string;
  clock: ShopClock;
  workingDay: boolean;
  rows: Array<{ staff: AttStaff; day: DayCell }>;
  counts: {
    staff: number; present: number; inside: number; out: number; late: number; notIn: number;
    absent: number; leave: number; off: number; lateMinutes: number; pendingLeaves: number;
  };
}

export interface Totals {
  present: number; late: number; halfDay: number; absent: number; missing: number;
  leave: number; unpaidLeave: number; holiday: number; off: number;
  daysWorked: number; workingDays: number; workedHours: number; overtimeHours: number; lateMinutes: number;
}

export interface Sheet {
  from: string;
  to: string;
  today: string;
  clock: ShopClock;
  keys: string[];
  rows: Array<{ staff: AttStaff; days: Record<string, DayCell>; totals: Totals }>;
  totals: Totals;
  byDay: Array<{ key: string; workingDay: boolean; present: number; late: number; absent: number; leave: number; lateMinutes: number; overtimeHours: number; workedHours: number }>;
}

export interface LeaveRow {
  id: string;
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string | null;
  status: LeaveStatus;
  rejectedReason?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  staff: { id: string; fullName: string; staffNumber: string; designation: string; avatarUrl?: string | null; shop?: { id: string; name: string } | null };
}

export interface SheetQuery { from?: string; to?: string; shopId?: string; staffId?: string }
export interface Punch { record: unknown; already: boolean }
/** `payrollMade`: a salary record already covers the day, so it may need a second look. */
export interface Correction { record: unknown; payrollMade: boolean }

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const attendanceApi = {
  today: (params: SheetQuery) => apiClient.get<{ data: Board }>('/staff/timesheet/today', { params }).then(unwrap),
  sheet: (params: SheetQuery) => apiClient.get<{ data: Sheet }>('/staff/timesheet/sheet', { params }).then(unwrap),
  checkIn: (staffId: string) => apiClient.post<{ data: Punch }>('/staff/timesheet/check-in', { staffId }).then(unwrap),
  checkOut: (staffId: string) => apiClient.post<{ data: Punch }>('/staff/timesheet/check-out', { staffId }).then(unwrap),
  correct: (body: { staffId: string; date: string; status?: AttendanceStatus; checkIn?: string; checkOut?: string; remove?: boolean; reason: string }) =>
    apiClient.post<{ data: Correction }>('/staff/timesheet/correct', body).then(unwrap),
  leaves: (params: { status?: LeaveStatus; from?: string; to?: string; shopId?: string }) =>
    apiClient.get<{ data: LeaveRow[] }>('/staff/timesheet/leaves', { params }).then(unwrap),
  createLeave: (body: { staffId: string; type: LeaveType; startDate: string; endDate: string; reason?: string; approve?: boolean }) =>
    apiClient.post<{ data: LeaveRow }>('/staff/timesheet/leaves', body).then(unwrap),
  decideLeave: (id: string, decision: 'APPROVE' | 'REJECT' | 'CANCEL', reason?: string) =>
    apiClient.post<{ data: LeaveRow }>(`/staff/timesheet/leaves/${id}/decide`, { decision, reason }).then(unwrap),
};
