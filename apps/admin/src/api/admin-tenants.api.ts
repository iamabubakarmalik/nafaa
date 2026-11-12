import { apiClient } from './client';

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'EXPIRED';

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  status: TenantStatus;
  businessType?: string | null;
  /** RETAIL, WHOLESALE, DISTRIBUTION, ONLINE; empty = not answered. */
  businessModels?: string[] | null;
  referralCode?: string | null;
  accountCredit: number;
  createdAt: string;
  lastActiveAt?: string | null;
  _count: {
    users: number;
    products: number;
    sales: number;
    customers: number;
  };
  /** Paused by an admin; the shop cannot work until unpaused or pausedUntil. */
  pausedAt?: string | null;
  pausedUntil?: string | null;
  pauseReason?: string | null;
  /** The plan the shop is really on (not a newer unpaid renewal bill). */
  billing?: TenantBillingSummary;
  subscriptions: Array<{
    id: string;
    status: string;
    interval: string;
    amount: number;
    currentPeriodEnd: string;
    plan: { id: string; name: string; slug: string };
  }>;
}

export interface TenantBillingSummary {
  planName: string | null;
  planSlug: string | null;
  state: 'trial' | 'active' | 'free' | 'expired';
  endsAt: string | null;
  paused: boolean;
  pausedUntil: string | null;
  pauseReason: string | null;
}

export interface TenantsResponse {
  items: AdminTenant[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface TenantInsights {
  health: { score: number; label: string; factors: Array<{ key: string; label: string; ok: boolean; detail: string }> };
  sales: { last7Bills: number; last7Total: number; lastSaleAt: string | null; daily: Array<{ date: string; bills: number; total: number }> };
  activeUsers7: number;
  shops: Array<{ id: string; name: string; isMain: boolean; isActive: boolean; createdAt: string }>;
  devices: Array<{ id: string; platform: string; appVersion: string; osVersion: string | null; lastSeenAt: string; user: string | null }>;
  integrations: Array<{ id: string; type: string; status: string; isActive: boolean; lastSyncAt: string | null; createdAt: string }>;
  couriers: Array<{ id: string; provider: string; isActive: boolean }>;
  onlineOrders30: number;
  onboarding: { currentStep: number; completedSteps: number[]; isCompleted: boolean; isSkipped: boolean; completedAt: string | null } | null;
  timeline: Array<{ id: string; kind: 'shop' | 'admin'; title: string; who: string | null; at: string; failed?: boolean }>;
}

export interface TenantStats {
  total: number; active: number; trial: number; suspended: number; expired: number; newThisWeek: number; onlineNow: number; activeToday: number; idle7: number;
  industries: Array<{ type: string; count: number }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminTenantsApi = {
  list: (params?: { search?: string; status?: TenantStatus; model?: string; industry?: string; activity?: string; sort?: 'newest' | 'oldest' | 'name' | 'active'; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: TenantsResponse }>('/admin/tenants', { params })
      .then(unwrap),
  updateProfile: (id: string, dto: { name?: string; phone?: string | null; businessType?: string | null; businessModels?: string[] }) =>
    apiClient.patch(`/admin/tenants/${id}/profile`, dto).then(unwrap),
  signOutAll: (id: string) => apiClient.post<{ data: { ended: number } }>(`/admin/tenants/${id}/sign-out-all`).then(unwrap),
  insights: (id: string) =>
    apiClient.get<{ data: TenantInsights }>(`/admin/tenants/${id}/insights`).then(unwrap),
  stats: () =>
    apiClient.get<{ data: TenantStats }>('/admin/tenants/stats').then(unwrap),
  getOne: (id: string) =>
    apiClient.get<{ data: any }>(`/admin/tenants/${id}`).then(unwrap),
  updateStatus: (id: string, status: TenantStatus, reason?: string) =>
    apiClient
      .patch<{ data: AdminTenant }>(`/admin/tenants/${id}/status`, { status, reason })
      .then(unwrap),
  /** Pause: closes the shop (signs everyone out) until unpaused, or until `until`. */
  pause: (id: string, body: { reason?: string; until?: string | null }) =>
    apiClient.post<{ data: { paused: boolean; pausedUntil: string | null; signedOut: number } }>(`/admin/tenants/${id}/pause`, body).then(unwrap),
  unpause: (id: string) =>
    apiClient.post<{ data: { paused: boolean } }>(`/admin/tenants/${id}/unpause`).then(unwrap),
  remove: (id: string) =>
    apiClient
      .delete<{ data: { message: string } }>(`/admin/tenants/${id}`)
      .then(unwrap),
};
