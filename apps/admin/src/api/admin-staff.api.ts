import { apiClient } from './client';
import type { AdminSession } from './admin-auth.api';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export interface PermissionDef { key: string; label: string; hint?: string; sensitive?: boolean }
export interface AreaDef { area: string; label: string; workspace: string; permissions: PermissionDef[] }
export interface AdminRole {
  id: string; key: string; name: string; description: string | null; permissions: string[]; isSystem: boolean; memberCount: number; createdAt: string;
}
export interface StaffMember {
  id: string; userId: string; fullName: string; email: string; phone?: string | null;
  status: 'ACTIVE' | 'DISABLED' | 'INVITED'; role: { id: string; name: string; key: string } | null; extraPermissions: string[];
  totpEnabled: boolean; inviteExpiresAt: string | null; lastLoginAt: string | null; lastActiveAt: string | null; createdAt: string;
}
export interface SuperAdminMember {
  userId: string; fullName: string; email: string; active: boolean; lastLoginAt: string | null; totpEnabled: boolean; lastActiveAt: string | null; createdAt: string;
}
export interface AuditEntry {
  id: string; actorId: string | null; actorEmail: string | null; action: string; method: string; path: string;
  targetType: string | null; targetId: string | null; summary: string | null; statusCode: number | null;
  ip: string | null; userAgent: string | null; metadata: unknown; createdAt: string;
}
export interface Paged<T> { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }

export const adminStaffApi = {
  catalog: () => apiClient.get<{ data: { areas: AreaDef[] } }>('/admin/staff/catalog').then(unwrap),
  roles: () => apiClient.get<{ data: AdminRole[] }>('/admin/staff/roles').then(unwrap),
  createRole: (dto: { name: string; description?: string; permissions: string[] }) => apiClient.post<{ data: AdminRole }>('/admin/staff/roles', dto).then(unwrap),
  updateRole: (id: string, dto: { name?: string; description?: string; permissions?: string[] }) => apiClient.patch<{ data: AdminRole }>(`/admin/staff/roles/${id}`, dto).then(unwrap),
  deleteRole: (id: string) => apiClient.delete(`/admin/staff/roles/${id}`).then(unwrap),
  members: () => apiClient.get<{ data: { superAdmins: SuperAdminMember[]; staff: StaffMember[] } }>('/admin/staff/members').then(unwrap),
  invite: (dto: { email: string; fullName: string; roleId: string; extraPermissions?: string[] }) =>
    apiClient.post<{ data: { memberId: string; inviteUrl: string; expiresAt: string } }>('/admin/staff/members', dto).then(unwrap),
  resendInvite: (id: string) => apiClient.post<{ data: { inviteUrl: string; expiresAt: string } }>(`/admin/staff/members/${id}/resend-invite`).then(unwrap),
  updateMember: (id: string, dto: { roleId?: string; extraPermissions?: string[]; status?: 'ACTIVE' | 'DISABLED' }) => apiClient.patch(`/admin/staff/members/${id}`, dto).then(unwrap),
  removeMember: (id: string) => apiClient.delete(`/admin/staff/members/${id}`).then(unwrap),
  sessions: (userId: string) => apiClient.get<{ data: AdminSession[] }>(`/admin/staff/users/${userId}/sessions`).then(unwrap),
  endSession: (userId: string, sessionId: string) => apiClient.delete(`/admin/staff/users/${userId}/sessions/${sessionId}`).then(unwrap),
  endAllSessions: (userId: string) => apiClient.post<{ data: { ended: number } }>(`/admin/staff/users/${userId}/sessions/end-all`).then(unwrap),
  audit: (params: { actorId?: string; search?: string; method?: string; failed?: boolean; from?: string; to?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: Paged<AuditEntry> }>('/admin/staff/audit', { params: { ...params, failed: params.failed ? '1' : undefined } }).then(unwrap),
};
