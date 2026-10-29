/**
 * Customer directory: whole-list search, filters, sort and totals from the
 * server for the customers and khata pages, plus one customer's insights.
 */

import { apiClient } from '@core/api/client';

export type DirectoryType = 'all' | 'vip' | 'khata' | 'advance' | 'overLimit' | 'clear';
export type DirectoryActivity = 'all' | 'new' | 'active30' | 'inactive30' | 'inactive60' | 'inactive90' | 'never';
export type DirectorySort = 'recent' | 'old' | 'name' | 'nameDesc' | 'spent' | 'balance' | 'lastVisit' | 'visits' | 'average' | 'aging';
export type AgingBucket = 'd0' | 'd7' | 'd30' | 'd90';

export interface DirectoryFilters {
  search?: string;
  status: 'active' | 'inactive' | 'all';
  type: DirectoryType;
  activity: DirectoryActivity;
  aging?: AgingBucket;
  city?: string;
  birthday?: 'month';
  sort: DirectorySort;
  scope?: 'branch' | 'all';
  /** Business-day keys for a period; both or neither. */
  from?: string;
  to?: string;
  dateOn?: 'sales' | 'joined' | 'khata';
}

export interface DirectoryCustomer {
  id: string; name: string; phone: string | null; email: string | null; cnic: string | null; city: string | null; area: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null; dateOfBirth: string | null; avatarUrl: string | null; creditLimit: number; loyaltyPoints: number;
  isActive: boolean; isVip: boolean; createdAt: string;
  /** Owed at the active branch (or overall without one); negative = advance. */
  balance: number; totalBalance: number; overLimit: boolean;
  visits: number; spent: number; average: number; lastSaleAt: string | null; firstSaleAt: string | null; daysSinceVisit: number | null;
  /** Oldest unpaid credit, with payments settling the oldest first. */
  oldestDueAt: string | null; dueDays: number | null;
  /** Only with a period: what happened in it. */
  period: { visits: number; spent: number; credit: number; paid: number } | null;
}

type Bucket = { count: number; amount: number };

export interface DirectoryPage {
  page: number; limit: number; count: number; hasMore: boolean;
  items: DirectoryCustomer[];
  tabs: Record<DirectoryType, number>;
  activity: Record<DirectoryActivity, number>;
  cities: Array<{ name: string; count: number }>;
  period: { from: string; to: string; visits: number; spent: number; buyers: number; credit: number; paid: number; joined: number } | null;
  /** True when built from data saved on this device because the server was unreachable. */
  offline?: boolean;
  stats: {
    total: number; inactive: number; vip: number; newThisMonth: number; buyers: number; spent: number;
    receivable: number; owingCount: number; advance: number; advanceCount: number; overLimit: number;
    aging: Record<AgingBucket, Bucket>;
    inactive30: number; inactive90: number; never: number;
    birthdays: Array<{ id: string; name: string; phone: string | null; day: number }>;
    topSpenders: DirectoryCustomer[];
  };
}

export interface CustomerInsights {
  months: Array<{ key: string; spent: number; bills: number }>;
  visits: {
    count: number; first: string | null; last: string | null; averageGapDays: number | null; average: number; best: number; spent: number;
    voided: number; returned: number; favouriteWeekday: number | null; favouriteHour: number | null;
  };
  products: Array<{ productId: string; name: string; unit: string; qty: number; spent: number; times: number; lastAt: string | null }>;
  payments: Array<{ method: string; bills: number; total: number }>;
  credit: {
    taken: number; paid: number; reduced: number; oldestDueAt: string | null; dueDays: number | null;
    /** Profit on this customer's khata bills: in hand and still to come (missing when cost is hidden). */
    realised?: number; pendingProfit?: number; billProfit?: number;
  };
}

const params = (f: DirectoryFilters, page: number, limit: number) => ({
  search: f.search?.trim() || undefined, status: f.status, type: f.type, activity: f.activity, aging: f.aging, city: f.city,
  birthday: f.birthday, sort: f.sort, scope: f.scope, from: f.from, to: f.to, dateOn: f.dateOn, page, limit,
});

const isNetFail = (e: unknown) => {
  const s = (e as { response?: { status?: number } })?.response?.status;
  return !s || s === 408 || s >= 502;
};

export const directoryApi = {
  list: async (f: DirectoryFilters, page = 1, limit = 40): Promise<DirectoryPage> => {
    try {
      return await apiClient.get<{ data: DirectoryPage }>('/customers/directory', { params: params(f, page, limit) }).then((r) => r.data.data);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { localDirectory } = await import('./offlineDirectory');
      return localDirectory(f, page, limit);
    }
  },
  insights: (id: string) => apiClient.get<{ data: CustomerInsights }>(`/customers/${id}/insights`).then((r) => r.data.data),
};

