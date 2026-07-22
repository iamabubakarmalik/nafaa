import { apiClient } from '@core/api/client';

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
  socialMedia?: any;
  languages: string[];
  isActive: boolean;
  staff?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const trainersApi = {
  create: (data: Partial<Trainer>) => apiClient.post('/gym/trainers', data).then(unwrap<Trainer>),
  list: (params?: any) => apiClient.get('/gym/trainers', { params }).then(unwrap<Trainer[]>),
  getOne: (id: string) => apiClient.get('/gym/trainers/' + id).then(unwrap<Trainer>),
  availability: (id: string, date: string) => apiClient.get('/gym/trainers/' + id + '/availability', { params: { date } }).then(unwrap<any>),
  update: (id: string, data: Partial<Trainer>) => apiClient.patch('/gym/trainers/' + id, data).then(unwrap<Trainer>),
  remove: (id: string) => apiClient.delete('/gym/trainers/' + id).then(unwrap),
};
