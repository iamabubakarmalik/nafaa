import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { Trainer } from './trainers.api';

export interface PTSession {
  id: string;
  sessionNumber: string;
  memberId: string;
  trainerId: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  durationMinutes: number;
  status: string;
  cancelledAt?: string;
  cancellationReason?: string;
  focusArea?: string;
  caloriesBurned?: number;
  price: number;
  paidAmount: number;
  isFromPackage: boolean;
  commissionAmount: number;
  memberRating?: number;
  memberFeedback?: string;
  trainerNotes?: string;
  trainer?: Trainer;
  member?: { id: string; memberNumber: string; customer?: { id: string; name: string; phone?: string | null } | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PtInput {
  memberId: string; trainerId: string; scheduledStart: string; durationMinutes?: number; price?: number;
  isFromPackage?: boolean; focusArea?: string; trainerNotes?: string; weeks?: number;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const ptApi = {
  create: (data: PtInput) => apiClient.post('/gym/personal-training', data).then(unwrap<PTSession | { sessions: PTSession[]; count: number }>),
  list: (params?: { memberId?: string; trainerId?: string; status?: string; from?: string; to?: string; search?: string }) => apiClient.get('/gym/personal-training', { params }).then(unwrap<PTSession[]>),
  updateStatus: (id: string, body: { status: string; cancellationReason?: string; paidAmount?: number; paymentMethod?: PaymentMethod }) =>
    apiClient.post('/gym/personal-training/' + id + '/status', body).then(unwrap<PTSession>),
  rate: (id: string, rating: number, feedback?: string) => apiClient.post('/gym/personal-training/' + id + '/rate', { rating, feedback }).then(unwrap<PTSession>),
};
