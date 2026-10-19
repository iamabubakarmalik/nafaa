import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type TrainerRole = 'HEAD_TRAINER' | 'PERSONAL_TRAINER' | 'YOGA_INSTRUCTOR' | 'ZUMBA_INSTRUCTOR'
  | 'CROSSFIT_COACH' | 'CARDIO_COACH' | 'STRENGTH_COACH' | 'NUTRITIONIST' | 'PHYSIOTHERAPIST'
  | 'MMA_COACH' | 'BOXING_COACH' | 'DANCE_INSTRUCTOR' | 'OTHER';

export interface Trainer {
  id: string;
  staffId: string;
  trainerNumber: string;
  role: TrainerRole;
  specializations: string[];
  certifications: string[];
  experienceYears?: number;
  bio?: string;
  photoUrl?: string;
  hourlyRate: number;
  perSessionRate: number;
  monthlyPackageRate: number;
  commissionPct: number;
  commissionFixed: number;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  isAvailable: boolean;
  maxDailyClients?: number;
  totalClients: number;
  activeClients: number;
  totalSessions: number;
  totalRevenue: number;
  totalCommission: number;
  avgRating?: number;
  totalReviews: number;
  languages: string[];
  isActive: boolean;
  staff?: { id: string; fullName: string; firstName?: string; lastName?: string; phone?: string | null; designation?: string | null; baseSalary?: number; status?: string; shopId?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerCommission {
  trainer: { id: string; trainerNumber: string; name: string; commissionPct: number; commissionFixed: number; perSessionRate: number; baseSalary: number };
  period: { sessions: number; revenue: number; commission: number };
  earned: number; sessions: number; paid: number; owed: number;
  lines: Array<{ id: string; sessionNumber: string; actualEnd?: string | null; scheduledStart: string; price: number; isFromPackage: boolean; commissionAmount: number; focusArea?: string | null; member: { memberNumber: string; name: string | null } | null }>;
}

export interface TrainerPayout { id: string; expenseNumber: string; title: string; description?: string | null; amount: number; paymentMethod: string; status: string; expenseDate: string }

export type TrainerInput = Partial<Pick<Trainer, 'role' | 'specializations' | 'certifications' | 'experienceYears' | 'bio' | 'photoUrl' | 'hourlyRate' | 'perSessionRate'
  | 'monthlyPackageRate' | 'commissionPct' | 'commissionFixed' | 'workingDays' | 'workStartTime' | 'workEndTime' | 'isAvailable' | 'maxDailyClients' | 'languages'>> & { staffId?: string };

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const trainersApi = {
  create: (data: TrainerInput & { staffId: string }) => apiClient.post('/gym/trainers', data).then(unwrap<Trainer>),
  list: (params?: { available?: boolean; role?: string; search?: string; includeLeft?: boolean }) => apiClient.get('/gym/trainers', { params }).then(unwrap<Trainer[]>),
  update: (id: string, data: TrainerInput) => apiClient.patch('/gym/trainers/' + id, data).then(unwrap<Trainer>),
  remove: (id: string) => apiClient.delete('/gym/trainers/' + id).then(unwrap),
  commission: (id: string, from?: string, to?: string) => apiClient.get('/gym/trainers/' + id + '/commission', { params: { from, to } }).then(unwrap<TrainerCommission>),
  payouts: (id: string) => apiClient.get('/gym/trainers/' + id + '/payouts').then(unwrap<TrainerPayout[]>),
  pay: (id: string, body: { amount: number; paymentMethod?: PaymentMethod; note?: string }) => apiClient.post('/gym/trainers/' + id + '/payout', body).then(unwrap<TrainerPayout>),
};
