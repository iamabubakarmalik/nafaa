/**
 * Profile API (same endpoints as the web): own details, devices and login
 * history, Google link, and account / business deletion.
 */

import { apiClient } from '@/core/api/client';
import type { AuthUser } from '@/core/auth/types';

export interface ActiveSession {
  id: string; deviceName: string; location?: string | null; lastActive?: string | null; createdAt: string;
}

export interface LoginHistoryEntry {
  id: string; deviceName?: string | null; location?: string | null; success: boolean; failureReason?: string | null;
  isNewDevice?: boolean; createdAt: string;
}

/** Deletion request of a person who is not the owner (records the request only). */
export interface AccountDeletionState {
  requested: boolean; requestedAt: string | null; scheduledFor: string | null;
}

const list = <T,>(raw: unknown): T[] => {
  if (Array.isArray(raw)) return raw as T[];
  const r = raw as { data?: unknown; sessions?: unknown } | null;
  if (Array.isArray(r?.data)) return r!.data as T[];
  if (Array.isArray(r?.sessions)) return r!.sessions as T[];
  return [];
};

export const profileApi = {
  updateProfile: (data: { fullName?: string; phone?: string; avatarUrl?: string }) => apiClient.patch<AuthUser>('/auth/me', data).then((r) => r.data),
  sessions: () => apiClient.get('/auth/sessions').then((r) => list<ActiveSession>(r.data)),
  currentSession: (refreshToken: string) => apiClient.post<{ id: string | null }>('/auth/sessions/current', { refreshToken }).then((r) => r.data),
  loginHistory: () => apiClient.get<LoginHistoryEntry[]>('/auth/login-history').then((r) => r.data ?? []),
  revokeSession: (id: string) => apiClient.post(`/auth/sessions/${id}/revoke`).then((r) => r.data),
  revokeOthers: (refreshToken: string) => apiClient.post('/auth/sessions/revoke-others', { refreshToken }).then((r) => r.data),
  disconnectGoogle: () => apiClient.post('/auth/google/disconnect').then((r) => r.data),

  // Account deletion for people who are not the owner.
  deletionStatus: () => apiClient.get<AccountDeletionState>('/auth/account-deletion').then((r) => r.data),
  requestDeletion: (body: { currentPassword?: string; confirmation?: string; reason?: string }) =>
    apiClient.post<AccountDeletionState & { message?: string }>('/auth/account-deletion-request', body).then((r) => r.data),
  cancelDeletion: () => apiClient.post<AccountDeletionState>('/auth/account-deletion-request/cancel').then((r) => r.data),

  // Business deletion (owner): 7 days to change the mind.
  deleteBusiness: (confirmation: string, currentPassword: string) =>
    apiClient.post<{ message?: string }>('/settings/danger/delete-tenant', { confirmation, currentPassword }).then((r) => r.data),
  cancelBusinessDeletion: () => apiClient.post('/settings/danger/cancel-deletion').then((r) => r.data),
};
