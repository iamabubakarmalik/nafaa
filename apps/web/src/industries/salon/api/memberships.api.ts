import { apiClient } from '@core/api/client';

export type MembershipTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'CUSTOM';

export interface MembershipPlan {
  id: string;
  name: string;
  tier: MembershipTier;
  description?: string;
  price: number;
  durationDays: number;
  discountPct: number;
  freeServiceCount: number;
  freeServiceIds: string[];
  priorityBooking: boolean;
  freeConsultation: boolean;
  birthdayBonus: number;
  colorTheme?: string;
  iconUrl?: string;
  benefits: string[];
  isActive: boolean;
  displayOrder: number;
  totalSubscribers: number;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  planId: string;
  customerId: string;
  membershipNumber: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAUSED';
  startDate: string;
  expiryDate: string;
  amountPaid: number;
  paymentMethod?: string;
  usedServices: number;
  totalSaved: number;
  autoRenew: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
  plan?: MembershipPlan;
  customer?: { id: string; name: string; phone?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export type PlanInput = Pick<MembershipPlan, 'name' | 'tier' | 'price' | 'durationDays' | 'discountPct' | 'priorityBooking' | 'benefits' | 'isActive'>
  & { description?: string };

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const membershipsApi = {
  createPlan: (data: PlanInput) => apiClient.post('/salon/memberships/plans', data).then(unwrap<MembershipPlan>),
  listPlans: (params?: { active?: boolean }) => apiClient.get('/salon/memberships/plans', { params }).then(unwrap<MembershipPlan[]>),
  updatePlan: (id: string, data: Partial<PlanInput>) => apiClient.patch('/salon/memberships/plans/' + id, data).then(unwrap<MembershipPlan>),

  subscribe: (data: { planId: string; customerId: string; amountPaid: number; paymentMethod?: string; autoRenew?: boolean; notes?: string }) =>
    apiClient.post('/salon/memberships/subscribe', data).then(unwrap<Membership>),
  list: (params?: { status?: string; customerId?: string; planId?: string; search?: string }) => apiClient.get('/salon/memberships', { params }).then(unwrap<Membership[]>),
  cancel: (id: string, reason?: string) => apiClient.post('/salon/memberships/' + id + '/cancel', { reason }).then(unwrap<Membership>),
};
