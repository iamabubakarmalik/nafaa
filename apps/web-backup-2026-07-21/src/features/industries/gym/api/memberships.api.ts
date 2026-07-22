import { apiClient } from '@/api/client';

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
  plan?: any;
  member?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const membershipsApi = {
  subscribe: (data: any) => apiClient.post('/gym/memberships/subscribe', data).then(unwrap<Membership>),
  list: (params?: any) => apiClient.get('/gym/memberships', { params }).then(unwrap<Membership[]>),
  getOne: (id: string) => apiClient.get('/gym/memberships/' + id).then(unwrap<Membership>),
  payment: (id: string, amount: number) => apiClient.post('/gym/memberships/' + id + '/payment', { amount }).then(unwrap<Membership>),
  freeze: (id: string, days: number, reason?: string) => apiClient.post('/gym/memberships/' + id + '/freeze', { days, reason }).then(unwrap<Membership>),
  unfreeze: (id: string) => apiClient.post('/gym/memberships/' + id + '/unfreeze').then(unwrap<Membership>),
  cancel: (id: string, reason?: string, refundAmount?: number) => apiClient.post('/gym/memberships/' + id + '/cancel', { reason, refundAmount }).then(unwrap<Membership>),
  renew: (id: string, paidAmount?: number) => apiClient.post('/gym/memberships/' + id + '/renew', { paidAmount }).then(unwrap<Membership>),
  expireOld: () => apiClient.post('/gym/memberships/expire-old').then(unwrap),
};
