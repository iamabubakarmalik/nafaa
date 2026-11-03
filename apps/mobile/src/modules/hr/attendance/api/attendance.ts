/**
 * Attendance API (same endpoints and shapes as the web): today's board, the
 * day-by-day sheet, corrections and leave requests. Check-in and check-out
 * go through the offline engine (see ../lib/punch.ts).
 */

import { apiClient } from '@/core/api/client';

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
  /** Punch saved on this phone, not on the server yet. */
  pending?: boolean;
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
/** `payrollMade`: a salary record already covers the day, so it may need a second look. */
export interface Correction { record: unknown; payrollMade: boolean }

export const attendanceApi = {
  today: (params: SheetQuery) => apiClient.get<Board>('/staff/timesheet/today', { params }).then((r) => r.data),
  sheet: (params: SheetQuery) => apiClient.get<Sheet>('/staff/timesheet/sheet', { params }).then((r) => r.data),
  correct: (body: { staffId: string; date: string; status?: AttendanceStatus; checkIn?: string; checkOut?: string; remove?: boolean; reason: string }) =>
    apiClient.post<Correction>('/staff/timesheet/correct', body).then((r) => r.data),
  leaves: (params: { status?: LeaveStatus; from?: string; to?: string; shopId?: string }) =>
    apiClient.get<LeaveRow[]>('/staff/timesheet/leaves', { params }).then((r) => r.data),
  createLeave: (body: { staffId: string; type: LeaveType; startDate: string; endDate: string; reason?: string; approve?: boolean }) =>
    apiClient.post<LeaveRow>('/staff/timesheet/leaves', body).then((r) => r.data),
  decideLeave: (id: string, decision: 'APPROVE' | 'REJECT' | 'CANCEL', reason?: string) =>
    apiClient.post<LeaveRow>(`/staff/timesheet/leaves/${id}/decide`, { decision, reason }).then((r) => r.data),
};
