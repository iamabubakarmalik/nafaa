/** Activity log API: the filtered, paged log with counts for the filter menus. */

import { apiClient } from '@core/api/client';

export interface ActivityEntry {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; role: string; assignedShop?: { id: string; name: string } | null } | null;
}

export interface ActivityFilters {
  /** Business days "YYYY-MM-DD"; `from` left out means from the beginning. */
  from?: string;
  to?: string;
  /** User id, or "system". */
  userId?: string;
  action?: string;
  entity?: string;
  shopId?: string;
  search?: string;
}

export interface ActivityFeed {
  items: ActivityEntry[];
  nextCursor: string | null;
  total: number;
  facets: {
    users: Array<{ id: string; name: string; role: string | null; count: number }>;
    actions: Array<{ key: string; count: number }>;
    entities: Array<{ key: string; count: number }>;
  };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const activityLogApi = {
  feed: (f: ActivityFilters, cursor?: string, limit = 50) =>
    apiClient.get<{ data: ActivityFeed }>('/activity-log/feed', { params: { ...f, ...(cursor && { cursor }), limit } }).then(unwrap),
};
