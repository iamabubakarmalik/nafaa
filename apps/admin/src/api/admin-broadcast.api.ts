import { apiClient } from './client';

export type BroadcastTarget = 'ALL' | 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'SPECIFIC';

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  targetType: BroadcastTarget;
  targetTenantIds: string[];
  recipientCount: number;
  sentAt: string;
  author: { id: string; fullName: string };
}

export interface CreateBroadcastPayload {
  title: string;
  message: string;
  link?: string;
  targetType: BroadcastTarget;
  targetTenantIds?: string[];
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminBroadcastApi = {
  list: () => apiClient.get<{ data: Broadcast[] }>('/admin/broadcast').then(unwrap),
  paged: (params: { search?: string; targetType?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: { items: Broadcast[]; meta: { page: number; limit: number; total: number; totalPages: number }; stats: { total: number; last30d: number; recipients: number } } }>('/admin/broadcast', { params: { ...params, paged: 1 } })
      .then(unwrap),
  send: (payload: CreateBroadcastPayload) =>
    apiClient.post<{ data: Broadcast }>('/admin/broadcast/send', payload).then(unwrap),
};
