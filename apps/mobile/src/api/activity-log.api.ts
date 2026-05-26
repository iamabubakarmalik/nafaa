import { apiClient } from './client';

export interface ActivityLog {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email?: string;
    role?: string;
  } | null;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

export const activityLogApi = {
  list: (): Promise<ActivityLog[]> =>
    apiClient.get('/activity-log').then((r) => unwrapArr<ActivityLog>(r)),
};
