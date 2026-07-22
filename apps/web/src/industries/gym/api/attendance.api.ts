import { apiClient } from '@core/api/client';

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
  member?: any;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const attendanceApi = {
  checkIn: (data: any) => apiClient.post('/gym/attendance/check-in', data).then(unwrap<Attendance>),
  checkOut: (id: string) => apiClient.post('/gym/attendance/' + id + '/check-out').then(unwrap<Attendance>),
  list: (params?: any) => apiClient.get('/gym/attendance', { params }).then(unwrap<Attendance[]>),
  currentlyInside: () => apiClient.get('/gym/attendance/currently-inside').then(unwrap<Attendance[]>),
  dailyStats: (from: string, to: string) => apiClient.get('/gym/attendance/daily-stats', { params: { from, to } }).then(unwrap<any>),
};
