import { apiClient } from '@core/api/client';
import type { Trainer } from './trainers.api';

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
  trainer?: Trainer | null;
  bookings?: ClassBooking[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassBooking {
  id: string; classId: string; memberId: string; bookingNumber: string; status: string; bookedAt: string; checkedInAt?: string | null;
  attended: boolean; price: number;
  member?: { id: string; memberNumber: string; customer?: { id: string; name: string; phone?: string | null } | null };
}

export interface ClassInput {
  name: string; classType?: ClassType; trainerId?: string | null; description?: string; scheduledStart: string; scheduledEnd: string;
  maxParticipants?: number; isFree?: boolean; memberPrice?: number; dropInPrice?: number; location?: string; roomName?: string;
  difficultyLevel?: string; notes?: string; recurrenceDays?: number[]; recurrenceEndDate?: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const classesApi = {
  create: (data: ClassInput) => apiClient.post('/gym/classes', data).then(unwrap<GymClass | { classes: GymClass[]; count: number }>),
  list: (params?: { from?: string; to?: string; status?: string; trainerId?: string; classType?: string }) => apiClient.get('/gym/classes', { params }).then(unwrap<GymClass[]>),
  calendar: (from: string, to: string) => apiClient.get('/gym/classes/calendar', { params: { from, to } }).then(unwrap<GymClass[]>),
  getOne: (id: string) => apiClient.get('/gym/classes/' + id).then(unwrap<GymClass>),
  update: (id: string, data: Partial<ClassInput>) => apiClient.patch('/gym/classes/' + id, data).then(unwrap<GymClass>),
  updateStatus: (id: string, status: ClassStatus, cancelledReason?: string) => apiClient.post('/gym/classes/' + id + '/status', { status, cancelledReason }).then(unwrap<GymClass>),
  book: (id: string, memberId: string) => apiClient.post('/gym/classes/' + id + '/book', { memberId }).then(unwrap<ClassBooking>),
  cancelBooking: (bookingId: string, reason?: string) => apiClient.post('/gym/classes/bookings/' + bookingId + '/cancel', { reason }).then(unwrap<ClassBooking>),
  checkInBooking: (bookingId: string) => apiClient.post('/gym/classes/bookings/' + bookingId + '/checkin').then(unwrap<ClassBooking>),
};
