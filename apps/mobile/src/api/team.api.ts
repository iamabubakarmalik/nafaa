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

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const teamApi = {
  list: (): Promise<TeamMember[]> =>
    apiClient.get('/team').then((r) => unwrapArr<TeamMember>(r)),

  catalog: (): Promise<TeamPermissionCatalog> =>
    apiClient.get('/team/permissions/catalog').then((r) => unwrapOne<TeamPermissionCatalog>(r)),

  create: (payload: CreateTeamMemberPayload): Promise<TeamMember> =>
    apiClient.post('/team', payload).then((r) => unwrapOne<TeamMember>(r)),

  updatePermissions: (id: string, permissions: string[]): Promise<TeamMember> =>
    apiClient.patch(`/team/${id}/permissions`, { permissions }).then((r) => unwrapOne<TeamMember>(r)),

  toggle: (id: string): Promise<TeamMember> =>
    apiClient.patch(`/team/${id}/toggle`).then((r) => unwrapOne<TeamMember>(r)),

  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/team/${id}`).then((r) => unwrapOne<{ message: string }>(r)),
};
