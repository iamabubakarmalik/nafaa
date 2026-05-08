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
  createdAt: string;
  tenant: { id: string; name: string; slug: string; status: string };
}

export interface UsersResponse {
  items: AdminUserItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminUsersApi = {
  list: (params?: { search?: string; role?: UserRole; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: UsersResponse }>('/admin/users', { params })
      .then(unwrap),
  toggle: (id: string) =>
    apiClient
      .patch<{ data: AdminUserItem }>(`/admin/users/${id}/toggle`)
      .then(unwrap),
};
