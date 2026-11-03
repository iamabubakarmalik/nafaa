/**
 * Customers API (same endpoints and shapes as the web): the server-side
 * directory, one customer, insights, the khata ledger and its summary.
 * Creating and editing customers and recording khata go through the offline
 * engine (see ../lib/actions.ts); the rest needs the server.
 */

import { apiClient } from '@/core/api/client';
import type { AgingBucket, DirectoryType } from '@nafaa/core/customers';

export type { AgingBucket, DirectoryType };
export type DirectoryActivity = 'all' | 'new' | 'active30' | 'inactive30' | 'inactive60' | 'inactive90' | 'never';
export type DirectorySort = 'recent' | 'old' | 'name' | 'nameDesc' | 'spent' | 'balance' | 'lastVisit' | 'visits' | 'average' | 'aging';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type PriceTier = 'RETAIL' | 'WHOLESALE' | 'CREDIT';

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
  from?: string;
  to?: string;
  dateOn?: 'sales' | 'joined' | 'khata';
}

export interface DirectoryCustomer {
  id: string; name: string; phone: string | null; email: string | null; cnic: string | null; city: string | null; area: string | null;
  gender: Gender | null; dateOfBirth: string | null; avatarUrl: string | null; creditLimit: number; loyaltyPoints: number;
  isActive: boolean; isVip: boolean; createdAt: string;
  /** Owed at the active branch; negative = advance. */
  balance: number; totalBalance: number; overLimit: boolean;
  visits: number; spent: number; average: number; lastSaleAt: string | null; firstSaleAt: string | null; daysSinceVisit: number | null;
  oldestDueAt: string | null; dueDays: number | null;
  period: { visits: number; spent: number; credit: number; paid: number } | null;
  /** Saved on this phone, not on the server yet. */
  pending?: boolean;
}

type Bucket = { count: number; amount: number };

export interface DirectoryPage {
  page: number; limit: number; count: number; hasMore: boolean;
  items: DirectoryCustomer[];
  tabs: Record<DirectoryType, number>;
  activity: Record<DirectoryActivity, number>;
  cities: Array<{ name: string; count: number }>;
  period: { from: string; to: string; visits: number; spent: number; buyers: number; credit: number; paid: number; joined: number } | null;
  /** Built from the phone's own copy because the server was out of reach. */
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
  credit: { taken: number; paid: number; reduced: number; oldestDueAt: string | null; dueDays: number | null; realised?: number; pendingProfit?: number; billProfit?: number };
}

export interface Customer {
  id: string; name: string; phone?: string | null; email?: string | null; cnic?: string | null; ntn?: string | null; address?: string | null;
  city?: string | null; area?: string | null; gender?: Gender | null; dateOfBirth?: string | null; avatarUrl?: string | null; notes?: string | null;
  creditLimit: number; balance: number; loyaltyPoints: number; totalSpent: number; isActive: boolean; isVip: boolean; createdAt: string;
  shopBalance?: number; totalBalance?: number; priceTier?: PriceTier | null;
}

export interface CustomerDetail extends Customer {
  loyaltyTransactions: Array<{ id: string; type: string; points: number; balanceAfter: number; note?: string | null; createdAt: string }>;
  _count: { sales: number; ledgers: number };
  stats: { totalSales: number; totalSpent: number; averageSale: number };
}

export type LedgerType = 'SALE_CREDIT' | 'PAYMENT_RECEIVED' | 'ADJUSTMENT' | 'OPENING_BALANCE' | 'REFUND' | 'LOYALTY_REDEEMED';

export interface LedgerEntry {
  id: string; type: LedgerType; amount: number; balanceAfter: number; reference?: string | null; note?: string | null; createdAt: string;
  createdBy?: { id: string; fullName: string } | null; shop?: { id: string; name: string } | null;
}

export interface LedgerDetail {
  customer: { id: string; name: string; phone?: string | null; balance: number; creditLimit: number };
  ledgers: LedgerEntry[];
  shopBalance: number; totalBalance: number; isAllShops: boolean;
}

export interface LedgerSummary {
  totalOutstanding: number; totalCustomers: number; customersWithCredit: number;
  advance: { amount: number; count: number };
  thisMonth: { udhaar: number; wasooli: number };
  overLimitCount: number; staleCount: number;
}

export interface PaymentPreview {
  amount: number;
  bills: Array<{ saleId: string; saleNumber: string; soldAt: string; amount: number; billNet: number; leftAfter: number; profit?: number }>;
  toOther: number; costHidden: boolean; profit?: number;
}

const params = (f: DirectoryFilters, page: number, limit: number) => ({
  search: f.search?.trim() || undefined, status: f.status, type: f.type, activity: f.activity, aging: f.aging, city: f.city,
  birthday: f.birthday, sort: f.sort, scope: f.scope, from: f.from, to: f.to, dateOn: f.dateOn, page, limit,
});

export const customersApi = {
  directory: (f: DirectoryFilters, page = 1, limit = 40) => apiClient.get<DirectoryPage>('/customers/directory', { params: params(f, page, limit) }).then((r) => r.data),
  getOne: (id: string) => apiClient.get<CustomerDetail>(`/customers/${id}`).then((r) => r.data),
  insights: (id: string) => apiClient.get<CustomerInsights>(`/customers/${id}/insights`).then((r) => r.data),
  toggleVip: (id: string) => apiClient.patch<Customer>(`/customers/${id}/toggle-vip`).then((r) => r.data),
  remove: (id: string) => apiClient.delete<{ message: string; softDeleted?: boolean }>(`/customers/${id}`).then((r) => r.data),
  update: (id: string, body: Record<string, unknown>) => apiClient.patch<Customer>(`/customers/${id}`, body).then((r) => r.data),
};

export const ledgerApi = {
  summary: () => apiClient.get<LedgerSummary>('/customer-ledger/summary').then((r) => r.data),
  list: (customerId: string) => apiClient.get<LedgerDetail>(`/customer-ledger/${customerId}`).then((r) => r.data),
  preview: (customerId: string, amount: number) => apiClient.get<PaymentPreview>(`/customer-ledger/${customerId}/payment-preview`, { params: { amount } }).then((r) => r.data),
  opening: (customerId: string, body: { balance: number; note?: string }) => apiClient.post(`/customer-ledger/${customerId}/opening-balance`, body).then((r) => r.data),
};
