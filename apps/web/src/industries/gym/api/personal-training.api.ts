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
  /** Bill of a single session, or the PT package's bill for a package session. */
  saleId?: string | null;
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
  isFromPackage?: boolean; packageId?: string; focusArea?: string; trainerNotes?: string; weeks?: number;
}

export type PtPackageStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface PtPackage {
  id: string;
  packageNumber: string;
  memberId: string;
  trainerId: string | null;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsBooked: number;
  sessionsLeft: number;
  price: number;
  saleId: string | null;
  status: PtPackageStatus;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  member: { id: string; memberNumber: string; customer: { id: string; name: string; phone?: string | null } | null } | null;
  trainer: { id: string; trainerNumber: string; name: string | null } | null;
  sale: { id: string; saleNumber: string; status: string; creditAmount: number; paidAmount: number } | null;
}

export interface SellPtPackageInput {
  memberId: string; trainerId?: string; sessions: number; price: number; paidAmount?: number; paymentMethod?: PaymentMethod;
  startDate?: string; validDays?: number; notes?: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const ptApi = {
  create: (data: PtInput) => apiClient.post('/gym/personal-training', data).then(unwrap<PTSession | { sessions: PTSession[]; count: number }>),
  list: (params?: { memberId?: string; trainerId?: string; status?: string; from?: string; to?: string; search?: string }) => apiClient.get('/gym/personal-training', { params }).then(unwrap<PTSession[]>),
  updateStatus: (id: string, body: { status: string; cancellationReason?: string; paidAmount?: number; paymentMethod?: PaymentMethod }) =>
    apiClient.post('/gym/personal-training/' + id + '/status', body).then(unwrap<PTSession>),
  packages: (params?: { memberId?: string; trainerId?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/gym/pt-packages', { params }).then(unwrap<{ items: PtPackage[]; total: number; page: number; pages: number; totals: { price: number; sessions: number; used: number } }>),
  sellPackage: (body: SellPtPackageInput) => apiClient.post('/gym/pt-packages', body).then(unwrap<PtPackage>),
  cancelPackage: (id: string, reason?: string) => apiClient.post('/gym/pt-packages/' + id + '/cancel', { reason }).then(unwrap<PtPackage>),
  rate: (id: string, rating: number, feedback?: string) => apiClient.post('/gym/personal-training/' + id + '/rate', { rating, feedback }).then(unwrap<PTSession>),
};
