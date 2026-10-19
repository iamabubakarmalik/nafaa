import { apiClient } from '@core/api/client';

export type PlanType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'LIFETIME' | 'PAY_PER_VISIT' | 'CUSTOM';

export interface MembershipPlan {
  id: string;
  name: string;
  code?: string;
  description?: string;
  planType: PlanType;
  price: number;
  registrationFee: number;
  securityDeposit: number;
  durationDays: number;
  visitLimit?: number;
  isUnlimited: boolean;
  accessAllHours: boolean;
  accessTimeStart?: string;
  accessTimeEnd?: string;
  accessDays: number[];
  includesPersonalTraining: boolean;
  personalTrainingSessions: number;
  includesClasses: boolean;
  classesLimit?: number;
  includesNutritionPlan: boolean;
  includesLockerFacility: boolean;
  includesTowelService: boolean;
  includesSteamSauna: boolean;
  includesSwimmingPool: boolean;
  includesGuestPasses: number;
  allowFreeze: boolean;
  maxFreezeDays: number;
  freezeFee: number;
  colorTheme?: string;
  iconUrl?: string;
  imageUrl?: string;
  benefits: string[];
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  totalSubscribers: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export type PlanInput = Partial<Omit<MembershipPlan, 'id' | 'totalSubscribers' | 'totalRevenue' | 'createdAt' | 'updatedAt' | 'iconUrl'>>;

export const membershipPlansApi = {
  create: (data: PlanInput) => apiClient.post('/gym/membership-plans', data).then(unwrap<MembershipPlan>),
  list: (params?: { active?: boolean; planType?: string; featured?: boolean }) => apiClient.get('/gym/membership-plans', { params }).then(unwrap<MembershipPlan[]>),
  update: (id: string, data: PlanInput) => apiClient.patch('/gym/membership-plans/' + id, data).then(unwrap<MembershipPlan>),
  remove: (id: string) => apiClient.delete('/gym/membership-plans/' + id).then(unwrap),
};
