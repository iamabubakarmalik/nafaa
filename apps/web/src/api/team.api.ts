import { apiClient } from './client';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface CreateTeamMemberPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const teamApi = {
  list: () => apiClient.get<{ data: TeamMember[] }>('/team').then(unwrap),
  create: (payload: CreateTeamMemberPayload) =>
    apiClient.post<{ data: TeamMember }>('/team', payload).then(unwrap),
  toggle: (id: string) =>
    apiClient.patch<{ data: TeamMember }>(`/team/${id}/toggle`).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/team/${id}`).then(unwrap),
};
