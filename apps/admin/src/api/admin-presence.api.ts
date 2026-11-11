import { apiClient } from './client';

export interface LiveUser {
  id: string; fullName: string; email: string; phone: string | null; role: string;
  lastSeenAt: string | null; lastSeenVia: string | null; lastLoginAt: string | null;
  tenant: { id: string; name: string; slug: string; businessType: string | null };
}
export interface LiveSnapshot {
  at: string;
  counts: { onlineUsers: number; onlineShops: number; web: number; desktop: number; mobile: number; activeTodayUsers: number; activeTodayShops: number; signupsToday: number };
  online: LiveUser[];
  signups: Array<{
    id: string; name: string; slug: string; phone: string | null; businessType: string | null; status: string; createdAt: string; lastActiveAt: string | null;
    owner: { fullName: string; email: string; phone: string | null } | null;
    setup: { currentStep: number; isCompleted: boolean; isSkipped: boolean } | null;
  }>;
  signIns: LiveUser[];
  staffOnline: Array<{ id: string; fullName: string; email: string; lastSeenAt: string }>;
}

export const adminPresenceApi = {
  live: () => apiClient.get<{ data: LiveSnapshot }>('/admin/presence/live').then((r) => r.data.data),
};
