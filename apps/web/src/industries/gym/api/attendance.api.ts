import { apiClient } from '@core/api/client';
import type { Membership } from './memberships.api';

export interface Attendance {
  id: string;
  memberId: string;
  checkInAt: string;
  checkOutAt?: string;
  durationMinutes?: number;
  method: string;
  entryPoint?: string;
  isGuest: boolean;
  guestName?: string;
  guestPhone?: string;
  invitedByMemberId?: string;
  membershipId?: string;
  notes?: string;
  photoUrl?: string;
  member?: { id: string; memberNumber: string; customerId: string; photoUrl?: string | null; customer?: { id: string; name: string; phone?: string | null } | null };
  createdAt: string;
}

export type CheckInMethod = 'MANUAL' | 'QR_CODE' | 'RFID_CARD' | 'BIOMETRIC' | 'MOBILE_APP' | 'FACIAL_RECOGNITION';

export interface CheckInInput {
  memberId?: string; code?: string; method?: CheckInMethod; isGuest?: boolean; guestName?: string; guestPhone?: string;
  invitedByMemberId?: string; allowExpired?: boolean; notes?: string;
}

export interface CheckInResult extends Attendance {
  membership: { id: string; membershipNumber: string; planName: string; endDate: string; visitsRemaining: number | null } | null;
  due: number;
  warnings: string[];
}

export interface DeskLookup {
  member: { id: string; memberNumber: string; photoUrl?: string | null; status: string; isActive: boolean; customer?: { id: string; name: string; phone?: string | null; balance: number } | null };
  membership: (Membership & { plan?: { name: string; includesGuestPasses: number } }) | null;
  block: string | null;
  message: string | null;
  due: number;
  inside: { id: string; checkInAt: string } | null;
  warnings: string[];
}

export interface AttendancePage { items: Attendance[]; total: number; page: number; pages: number }

export interface AttendanceStats {
  total: number; members: number; guests: number; avgMinutes: number | null;
  byDay: Array<{ day: string; count: number }>;
  byHour: Array<{ hour: number; count: number }>;
  byMethod: Array<{ method: string; count: number }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const attendanceApi = {
  checkIn: (data: CheckInInput) => apiClient.post('/gym/attendance/check-in', data).then(unwrap<CheckInResult>),
  checkOut: (id: string) => apiClient.post('/gym/attendance/' + id + '/check-out').then(unwrap<Attendance>),
  checkOutAll: () => apiClient.post('/gym/attendance/check-out-all').then(unwrap<{ count: number }>),
  lookup: (code: string) => apiClient.get('/gym/attendance/lookup', { params: { code } }).then(unwrap<DeskLookup>),
  list: (params?: { memberId?: string; from?: string; to?: string }) => apiClient.get('/gym/attendance', { params }).then(unwrap<Attendance[]>),
  page: (params: { from?: string; to?: string; search?: string; isGuest?: boolean; method?: string; page: number; limit?: number }) => apiClient.get('/gym/attendance', { params }).then(unwrap<AttendancePage>),
  currentlyInside: () => apiClient.get('/gym/attendance/currently-inside').then(unwrap<Attendance[]>),
  dailyStats: (from?: string, to?: string) => apiClient.get('/gym/attendance/daily-stats', { params: { from, to } }).then(unwrap<AttendanceStats>),
};
