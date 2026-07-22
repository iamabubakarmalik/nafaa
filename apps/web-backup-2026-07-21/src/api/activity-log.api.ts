import { apiClient } from './client';

export interface ActivityEntry {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  description: string;
  metadata?: any;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; role: string } | null;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const activityLogApi = {
  list: () => apiClient.get<{ data: ActivityEntry[] }>('/activity-log').then(unwrap),
};
