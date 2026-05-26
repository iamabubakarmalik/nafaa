import { apiClient } from './client';

export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  permissions?: string[];
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface CreateTeamMemberPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: Exclude<UserRole, 'OWNER' | 'SUPER_ADMIN'>;
  permissions?: string[];
}

export interface TeamPermissionCatalog {
  allPermissions: string[];
  defaultsByRole: Record<string, string[]>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const teamApi = {
  list: () => apiClient.get<{ data: TeamMember[] }>('/team').then(unwrap),

  catalog: () =>
    apiClient
      .get<{ data: TeamPermissionCatalog }>('/team/permissions/catalog')
      .then(unwrap),

  create: (payload: CreateTeamMemberPayload) =>
    apiClient.post<{ data: TeamMember }>('/team', payload).then(unwrap),

  updatePermissions: (id: string, permissions: string[]) =>
    apiClient
      .patch<{ data: TeamMember }>(`/team/${id}/permissions`, { permissions })
      .then(unwrap),

  toggle: (id: string) =>
    apiClient.patch<{ data: TeamMember }>(`/team/${id}/toggle`).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/team/${id}`).then(unwrap),
};
