import { apiClient } from './client';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF' | 'SUPER_ADMIN';

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
  lastSeenVia?: string | null;
  createdAt: string;
  tenant: { id: string; name: string; slug: string; status: string };
}

export interface UsersResponse {
  items: AdminUserItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export interface UsersStats { total: number; active: number; inactive: number; newThisWeek: number; neverSignedIn: number; onlineNow?: number; activeToday?: number;
}

export const adminUsersApi = {
  signOut: (id: string) => apiClient.post<{ data: { ended: number } }>(`/admin/users/${id}/sign-out`).then(unwrap),
  resetPassword: (id: string) => apiClient.post<{ data: { temporaryPassword: string } }>(`/admin/users/${id}/reset-password`).then(unwrap),
  update: (id: string, dto: { fullName?: string; phone?: string | null; role?: string }) => apiClient.patch(`/admin/users/${id}`, dto).then(unwrap),
  stats: () => apiClient.get<{ data: UsersStats }>('/admin/users/stats').then(unwrap),
  list: (params?: { search?: string; role?: UserRole; status?: 'active' | 'inactive'; activity?: string; via?: string; sort?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: UsersResponse }>('/admin/users', { params })
      .then(unwrap),
  toggle: (id: string) =>
    apiClient
      .patch<{ data: AdminUserItem }>(`/admin/users/${id}/toggle`)
      .then(unwrap),
};
