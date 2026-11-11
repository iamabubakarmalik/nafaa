import { apiClient } from './client';

export type DeletionStatus = 'IN_GRACE' | 'DUE' | 'PROCESSED' | 'CANCELLED';

export interface DeletionRequest {
  id: string;
  kind: 'USER' | 'TENANT';
  subjectId: string;
  name: string;
  email: string | null;
  role: string | null;
  isActive?: boolean;
  tenantId: string;
  tenantName: string;
  tenantStatus?: string;
  userCount?: number;
  status: DeletionStatus;
  requestedAt: string;
  dueAt: string;
  reason: string | null;
  processedAt: string | null;
  purgeAfter: string | null;
}

export interface DeletionRequestsResponse {
  items: DeletionRequest[];
  counts: { inGrace: number; due: number; processed: number; cancelled: number };
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminDeletionRequestsApi = {
  list: (params: { status?: string; kind?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: DeletionRequestsResponse }>('/admin/deletion-requests', { params }).then(unwrap),
  process: (id: string, note?: string) =>
    apiClient.post<{ data: { success: boolean; alreadyProcessed: boolean } }>(
      `/admin/deletion-requests/${encodeURIComponent(id)}/process`, { note }).then(unwrap),
};
