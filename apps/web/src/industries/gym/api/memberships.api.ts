import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { MembershipPlan } from './membership-plans.api';

export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'CANCELLED' | 'PENDING_PAYMENT' | 'FROZEN';

export interface Membership {
  id: string;
  memberId: string;
  planId: string;
  membershipNumber: string;
  status: MembershipStatus;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  totalPrice: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: string;
  visitsUsed: number;
  visitsRemaining?: number;
  classesUsed: number;
  ptSessionsUsed: number;
  guestPassesUsed: number;
  isFrozen: boolean;
  frozenAt?: string;
  frozenUntil?: string;
  frozenReason?: string;
  totalFrozenDays: number;
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmount: number;
  autoRenew: boolean;
  notes?: string;
  renewalReminded?: boolean;
  plan?: MembershipPlan;
  member?: { id: string; memberNumber: string; customerId: string; photoUrl?: string | null; customer?: { id: string; name: string; phone?: string | null; balance?: number } | null };
  createdAt: string;
  updatedAt: string;
}

export type MembershipView = 'all' | 'running' | 'expiring' | 'expired' | 'frozen' | 'dues' | 'cancelled' | 'upcoming';

export interface MembershipPage {
  items: Membership[]; total: number; page: number; pages: number;
  counts: Record<MembershipView, number>;
  totals: { price: number; paid: number; due: number };
}

export interface MembershipDetail extends Membership {
  bills: Array<{ id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number; status: string; paymentMethod: string; createdAt: string }>;
  payments: Array<{ id: string; amount: number; paymentMethod: string; createdAt: string; note?: string | null }>;
}

export interface SubscribeInput {
  memberId: string; planId: string; startDate?: string; paidAmount?: number; totalPrice?: number;
  paymentMethod?: PaymentMethod; autoRenew?: boolean; notes?: string; waiveAdmission?: boolean;
}

/** The sold membership with the bill it was posted on. */
export type SoldMembership = Membership & { sale?: { id: string; saleNumber: string } | null };

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const membershipsApi = {
  subscribe: (data: SubscribeInput) => apiClient.post('/gym/memberships/subscribe', data).then(unwrap<SoldMembership>),
  /** Plain list (dashboard). */
  list: (params?: { memberId?: string; status?: string; view?: MembershipView; expiringDays?: number }) => apiClient.get('/gym/memberships', { params }).then(unwrap<Membership[]>),
  page: (params: { view: MembershipView; search?: string; planId?: string; page: number; limit?: number; expiringDays?: number }) => apiClient.get('/gym/memberships', { params }).then(unwrap<MembershipPage>),
  getOne: (id: string) => apiClient.get('/gym/memberships/' + id).then(unwrap<MembershipDetail>),
  payment: (id: string, amount: number, paymentMethod?: PaymentMethod) => apiClient.post('/gym/memberships/' + id + '/payment', { amount, paymentMethod }).then(unwrap<Membership>),
  freeze: (id: string, body: { days: number; reason?: string; paidAmount?: number; paymentMethod?: PaymentMethod }) => apiClient.post('/gym/memberships/' + id + '/freeze', body).then(unwrap<Membership>),
  unfreeze: (id: string) => apiClient.post('/gym/memberships/' + id + '/unfreeze').then(unwrap<Membership>),
  cancel: (id: string, reason?: string) => apiClient.post('/gym/memberships/' + id + '/cancel', { reason }).then(unwrap<Membership>),
  renew: (id: string, body: { paidAmount?: number; paymentMethod?: PaymentMethod; planId?: string; totalPrice?: number; notes?: string }) => apiClient.post('/gym/memberships/' + id + '/renew', body).then(unwrap<SoldMembership>),
  reminded: (id: string) => apiClient.post('/gym/memberships/' + id + '/reminded').then(unwrap<Membership>),
};
