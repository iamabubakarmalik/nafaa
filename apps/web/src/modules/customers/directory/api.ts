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
}

type Bucket = { count: number; amount: number };

export interface DirectoryPage {
  page: number; limit: number; count: number; hasMore: boolean;
  items: DirectoryCustomer[];
  tabs: Record<DirectoryType, number>;
  activity: Record<DirectoryActivity, number>;
  cities: Array<{ name: string; count: number }>;
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
  credit: { taken: number; paid: number; reduced: number; oldestDueAt: string | null; dueDays: number | null };
}

const params = (f: DirectoryFilters, page: number, limit: number) => ({
  search: f.search?.trim() || undefined, status: f.status, type: f.type, activity: f.activity, aging: f.aging, city: f.city,
  birthday: f.birthday, sort: f.sort, scope: f.scope, page, limit,
});

export const directoryApi = {
  list: (f: DirectoryFilters, page = 1, limit = 40) =>
    apiClient.get<{ data: DirectoryPage }>('/customers/directory', { params: params(f, page, limit) }).then((r) => r.data.data),
  insights: (id: string) => apiClient.get<{ data: CustomerInsights }>(`/customers/${id}/insights`).then((r) => r.data.data),
};

