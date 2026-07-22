import { apiClient } from '@core/api/client';

export type ClassType = 'YOGA' | 'ZUMBA' | 'AEROBICS' | 'CROSSFIT' | 'HIIT' | 'SPINNING'
  | 'BOXING' | 'KICKBOXING' | 'MMA' | 'KARATE' | 'DANCE' | 'PILATES' | 'STRETCHING'
  | 'BOOTCAMP' | 'MEDITATION' | 'BODY_PUMP' | 'OTHER';

export type ClassStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

export interface GymClass {
  id: string;
  trainerId?: string;
  name: string;
  classType: ClassType;
  description?: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  durationMinutes: number;
  isRecurring: boolean;
  recurrencePattern?: string;
  recurrenceDays: number[];
  recurrenceEndDate?: string;
  maxParticipants: number;
  minParticipants: number;
  currentEnrolled: number;
  isFree: boolean;
  dropInPrice: number;
  memberPrice: number;
  location?: string;
  roomName?: string;
  difficultyLevel?: string;
  targetAudience?: string;
  status: ClassStatus;
  cancelledReason?: string;
  imageUrl?: string;
  notes?: string;
  trainer?: any;
  bookings?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const classesApi = {
  create: (data: Partial<GymClass>) => apiClient.post('/gym/classes', data).then(unwrap<GymClass>),
  list: (params?: any) => apiClient.get('/gym/classes', { params }).then(unwrap<GymClass[]>),
  calendar: (from: string, to: string) => apiClient.get('/gym/classes/calendar', { params: { from, to } }).then(unwrap<GymClass[]>),
  getOne: (id: string) => apiClient.get('/gym/classes/' + id).then(unwrap<GymClass>),
  update: (id: string, data: Partial<GymClass>) => apiClient.patch('/gym/classes/' + id, data).then(unwrap<GymClass>),
  updateStatus: (id: string, status: string, cancelledReason?: string) =>
    apiClient.post('/gym/classes/' + id + '/status', { status, cancelledReason }).then(unwrap<GymClass>),
  book: (id: string, memberId: string) => apiClient.post('/gym/classes/' + id + '/book', { memberId }).then(unwrap<any>),
  cancelBooking: (bookingId: string, reason?: string) =>
    apiClient.post('/gym/classes/bookings/' + bookingId + '/cancel', { reason }).then(unwrap<any>),
  checkInBooking: (bookingId: string) => apiClient.post('/gym/classes/bookings/' + bookingId + '/checkin').then(unwrap<any>),
};
