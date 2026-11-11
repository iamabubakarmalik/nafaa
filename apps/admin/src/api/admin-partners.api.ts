/**
 * Admin partner programme API: partners, leads, visit audit, commission
 * plans, earnings, payouts, performance, marketing kit, and a shop's partner.
 */

import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export type PartnerType = 'REFERRAL' | 'FIELD_AGENT' | 'RESELLER' | 'TRAINER' | 'EMPLOYEE';
export type PartnerStatus = 'APPLIED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
export type LeadStage = 'VISITED' | 'DEMO' | 'SIGNED_UP' | 'ACTIVATED' | 'PAID' | 'LOST';
export type EarningKind = 'SIGNUP_BONUS' | 'ACTIVATION_BONUS' | 'RECURRING' | 'OVERRIDE' | 'SLAB_BONUS' | 'ADJUSTMENT';
export type EarningStatus = 'PENDING' | 'PAYABLE' | 'PAID' | 'REVERSED';
export type PayoutStatus = 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED';
export type VisitFlag = 'NO_GPS' | 'LOW_ACCURACY' | 'FAR_FROM_LEAD' | 'FAST_TRAVEL' | 'OUT_OF_HOURS' | 'TOO_MANY';

export interface Meta { page: number; limit: number; total: number; totalPages: number }
export interface Paged<T> { items: T[]; meta: Meta }
export interface PersonRef { id: string; fullName: string; code: string }

export interface PartnerStats {
  month: string; total: number; active: number; applied: number; suspended: number; rejected: number;
  byType: Array<{ type: PartnerType; count: number }>;
  signupsThisMonth: number; paidSignupsThisMonth: number; owed: number;
  requestedPayouts: { count: number; amount: number }; approvedPayouts: { count: number; amount: number };
  flaggedVisits: number;
}

export interface PartnerRow {
  id: string; code: string; type: PartnerType; status: PartnerStatus; fullName: string; phone: string; email: string | null;
  city: string | null; territory: string | null; isManager: boolean; incentivesOn: boolean; salary: number | null;
  appliedAt: string; approvedAt: string | null; createdAt: string; rejectReason: string | null;
  manager: PersonRef | null; plan: { id: string; name: string } | null;
  lastSeenAt: string | null; signedIn: boolean; leads: number; signups: number; teamSize: number; paid: number; owed: number;
}

export interface PartnerPlan {
  id: string; name: string; description: string | null; isDefault: boolean; active: boolean;
  signupBonus: number; activationBonus: number; activationSales: number; activationDays: number;
  recurringPercent: number; recurringMonths: number; managerOverridePercent: number; clawbackDays: number;
  slabs: Array<{ signups: number; bonus: number }> | null; createdAt: string; updatedAt: string;
  partners?: number; ownPartners?: number;
}

export interface PartnerNumbers { visits: number; leads: number; signups: number; activations: number; paid: number; earned: number }
export interface PartnerBalances { pending: number; available: number; requested: number; owed: number; paid: number; reversed: number }

export interface PartnerDetail {
  id: string; userId: string; code: string; type: PartnerType; status: PartnerStatus; fullName: string; phone: string; email: string | null; cnic: string | null;
  city: string | null; territory: string | null; isManager: boolean; managerId: string | null; planId: string | null; salary: number | null; incentivesOn: boolean;
  payoutMethod: string | null; payoutAccount: string | null; payoutTitle: string | null; bankName: string | null; notes: string | null; rejectReason: string | null;
  appliedAt: string; approvedAt: string | null; approvedById: string | null; createdAt: string; updatedAt: string;
  user: { id: string; email: string; isActive: boolean; lastLoginAt: string | null; lastSeenAt: string | null; lastSeenVia: string | null; activeSessions: number };
  manager: (PersonRef & { phone: string }) | null;
  team: Array<PersonRef & { status: PartnerStatus; type: PartnerType; city: string | null }>;
  plan: PartnerPlan; usesDefaultPlan: boolean; approvedByName: string | null;
  month: string; thisMonth: PartnerNumbers; allTime: PartnerNumbers;
  target: { visits: number; signups: number; activations: number } | null;
  balances: PartnerBalances; flaggedOpen: number;
}

export interface PartnerShop {
  id: string; name: string; slug: string; phone: string | null; status: string; createdAt: string; partnerAttributedAt: string | null; partnerSource: string | null;
  lastActiveAt: string | null; planName: string | null; subscriptionStatus: string | null; stage: LeadStage | null; activatedAt: string | null; paidAt: string | null; paymentsTotal: number;
}

export interface TargetMonth { month: string; target: { visits: number; signups: number; activations: number } | null; actual: { visits: number; signups: number; activations: number } }

export interface PartnerLead {
  id: string; shopName: string; ownerName: string | null; phone: string; category: string | null; city: string | null; address: string | null;
  lat: number | null; lng: number | null; interest: string | null; stage: LeadStage; lostReason: string | null; followUpAt: string | null; notes: string | null;
  tenantId: string | null; lockedUntil: string; locked: boolean; signedUpAt: string | null; activatedAt: string | null; paidAt: string | null;
  createdAt: string; updatedAt: string; partner: PersonRef; visits: number;
}

export interface PartnerVisit {
  id: string; lat: number | null; lng: number | null; accuracy: number | null; photoUrl: string | null; note: string | null; visitedAt: string;
  flags: VisitFlag[]; review: 'ok' | 'fake' | null; reviewedAt: string | null; reviewedBy: string | null; createdAt: string;
  lead: { id: string; shopName: string; phone: string; city: string | null; stage: LeadStage };
  partner: PersonRef;
}

export interface PartnerEarning {
  id: string; partnerId: string; tenantId: string | null; tenantName: string | null; kind: EarningKind; status: EarningStatus; amount: number;
  description: string | null; sourceRef: string | null; availableAt: string; reversedReason: string | null; payoutId: string | null;
  createdById: string | null; createdByName: string | null; createdAt: string;
  partner: PersonRef; payout: { id: string; status: PayoutStatus; reference: string | null } | null;
}

export interface PartnerPayout {
  id: string; partnerId: string; amount: number; status: PayoutStatus; method: string | null; account: string | null; accountTitle: string | null;
  reference: string | null; note: string | null; rejectReason: string | null; requestedAt: string; decidedAt: string | null; decidedByName: string | null; paidAt: string | null;
  earningsCount: number;
  partner: PersonRef & { phone: string; type: PartnerType; payoutMethod: string | null; payoutAccount: string | null; payoutTitle: string | null; bankName: string | null };
}

export interface Totals<S extends string> { status: S; count: number; amount: number }

export interface PerformanceRow {
  key: string; label: string; sub: string | null; partnerId: string | null; partners: number;
  visits: number; leads: number; signups: number; activations: number; paid: number; earnings: number; revenue: number; roi: number | null;
}

export interface KitItem { id: string; title: string; type: 'link' | 'video' | 'pdf' | 'image'; url: string; description: string | null }
export interface PartnerKit { items: KitItem[]; demo: { url: string; email: string; password: string; note: string | null } | null }

export interface TenantPartnerInfo {
  partner: { id: string; fullName: string; code: string; phone: string; status: PartnerStatus; type: PartnerType; city: string | null } | null;
  source: string | null; attributedAt: string | null; stage: LeadStage | null;
}

export interface PartnerInput {
  fullName?: string; phone?: string; email?: string | null; cnic?: string | null; type?: PartnerType; city?: string | null; territory?: string | null;
  isManager?: boolean; managerId?: string | null; planId?: string | null; salary?: number | null; incentivesOn?: boolean; notes?: string | null;
  payoutMethod?: string | null; payoutAccount?: string | null; payoutTitle?: string | null; bankName?: string | null;
}

export type PlanInput = Partial<Omit<PartnerPlan, 'id' | 'createdAt' | 'updatedAt' | 'partners' | 'ownPartners'>>;

type Q = Record<string, string | number | undefined>;

export const adminPartnersApi = {
  stats: () => apiClient.get<{ data: PartnerStats }>('/admin/partners/stats').then(unwrap),
  list: (params: Q) => apiClient.get<{ data: Paged<PartnerRow> }>('/admin/partners', { params }).then(unwrap),
  create: (dto: PartnerInput) => apiClient.post<{ data: { partner: { id: string; code: string; fullName: string; phone: string }; temporaryPassword: string } }>('/admin/partners', dto).then(unwrap),
  get: (id: string) => apiClient.get<{ data: PartnerDetail }>(`/admin/partners/${id}`).then(unwrap),
  update: (id: string, dto: PartnerInput) => apiClient.patch<{ data: PartnerDetail }>(`/admin/partners/${id}`, dto).then(unwrap),
  approve: (id: string) => apiClient.post<{ data: PartnerDetail }>(`/admin/partners/${id}/approve`).then(unwrap),
  reject: (id: string, reason: string) => apiClient.post<{ data: PartnerDetail }>(`/admin/partners/${id}/reject`, { reason }).then(unwrap),
  suspend: (id: string) => apiClient.post<{ data: PartnerDetail }>(`/admin/partners/${id}/suspend`).then(unwrap),
  reactivate: (id: string) => apiClient.post<{ data: PartnerDetail }>(`/admin/partners/${id}/reactivate`).then(unwrap),
  resetPassword: (id: string) => apiClient.post<{ data: { temporaryPassword: string } }>(`/admin/partners/${id}/reset-password`).then(unwrap),
  signOut: (id: string) => apiClient.post<{ data: { ended: number } }>(`/admin/partners/${id}/sign-out`).then(unwrap),
  shops: (id: string, params: Q) => apiClient.get<{ data: Paged<PartnerShop> }>(`/admin/partners/${id}/shops`, { params }).then(unwrap),
  targets: (id: string) => apiClient.get<{ data: { currentMonth: string; items: TargetMonth[] } }>(`/admin/partners/${id}/targets`).then(unwrap),
  setTarget: (id: string, month: string, dto: { visits: number; signups: number; activations: number }) =>
    apiClient.put(`/admin/partners/${id}/targets/${month}`, dto).then(unwrap),
  adjust: (id: string, dto: { amount: number; note: string }) => apiClient.post(`/admin/partners/${id}/adjustments`, dto).then(unwrap),

  leads: (params: Q) => apiClient.get<{ data: Paged<PartnerLead> & { stages: Array<{ stage: LeadStage; count: number }> } }>('/admin/partners/leads', { params }).then(unwrap),
  visits: (params: Q) => apiClient.get<{ data: Paged<PartnerVisit> & { stats: { flaggedOpen: number; fake: number } } }>('/admin/partners/visits', { params }).then(unwrap),
  reviewVisit: (id: string, review: 'ok' | 'fake' | null) => apiClient.patch(`/admin/partners/visits/${id}`, { review }).then(unwrap),

  plans: () => apiClient.get<{ data: PartnerPlan[] }>('/admin/partners/plans').then(unwrap),
  createPlan: (dto: PlanInput) => apiClient.post<{ data: PartnerPlan }>('/admin/partners/plans', dto).then(unwrap),
  updatePlan: (id: string, dto: PlanInput) => apiClient.patch<{ data: PartnerPlan }>(`/admin/partners/plans/${id}`, dto).then(unwrap),

  earnings: (params: Q) => apiClient.get<{ data: Paged<PartnerEarning> & { totals: Totals<EarningStatus>[] } }>('/admin/partners/earnings', { params }).then(unwrap),
  reverseEarning: (id: string, reason: string) => apiClient.post<{ data: { reversed: number } }>(`/admin/partners/earnings/${id}/reverse`, { reason }).then(unwrap),

  payouts: (params: Q) => apiClient.get<{ data: Paged<PartnerPayout> & { totals: Totals<PayoutStatus>[] } }>('/admin/partners/payouts', { params }).then(unwrap),
  approvePayout: (id: string) => apiClient.post(`/admin/partners/payouts/${id}/approve`).then(unwrap),
  markPaid: (id: string, dto: { reference: string; note?: string }) => apiClient.post(`/admin/partners/payouts/${id}/paid`, dto).then(unwrap),
  rejectPayout: (id: string, reason: string) => apiClient.post(`/admin/partners/payouts/${id}/reject`, { reason }).then(unwrap),

  performance: (params: Q) => apiClient.get<{ data: { group: 'partner' | 'city'; rows: PerformanceRow[]; totals: PerformanceRow; meta: Meta } }>('/admin/partners/performance', { params }).then(unwrap),

  kit: () => apiClient.get<{ data: PartnerKit }>('/admin/partners/kit').then(unwrap),
  saveKit: (kit: PartnerKit) => apiClient.put<{ data: PartnerKit }>('/admin/partners/kit', kit).then(unwrap),

  runCommissions: () => apiClient.post<{ data: { running: boolean; result: Record<string, number> | null } }>('/admin/partners/commissions/run').then(unwrap),

  tenantPartner: (tenantId: string) => apiClient.get<{ data: TenantPartnerInfo }>(`/admin/tenants/${tenantId}/partner`).then(unwrap),
  setTenantPartner: (tenantId: string, partnerId: string | null) => apiClient.patch<{ data: TenantPartnerInfo }>(`/admin/tenants/${tenantId}/partner`, { partnerId }).then(unwrap),
};
