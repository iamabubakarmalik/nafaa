/**
 * Other income ("Doosri aamdani") API: the paged record with totals, the
 * headline numbers with twelve months and due monthly incomes, the shop's own
 * categories, and record / edit / delete.
 */

import { apiClient } from '@core/api/client';
import type { ShopStamp } from '@core/lib/shopScope';

export type IncomeCategoryCode = 'COMPANY_INCENTIVE' | 'SCHEME_CLAIM' | 'COMMISSION' | 'RENT' | 'INTEREST' | 'OTHER' | 'CUSTOM';
export type IncomeReceivedVia = 'CASH_DRAWER' | 'ACCOUNT' | 'SUPPLIER_KHATA';

export interface IncomeCustomCategory {
  id: string;
  name: string;
  color: string;
  isActive?: boolean;
}

export interface Income {
  id: string;
  incomeNumber: string;
  title: string;
  amount: number;
  category: IncomeCategoryCode;
  categoryId: string | null;
  incomeDate: string;
  supplierId: string | null;
  receivedVia: IncomeReceivedVia;
  moneyAccountId: string | null;
  note: string | null;
  repeatMonthly: boolean;
  createdAt?: string;
  shop?: ShopStamp | null;
  supplier?: { id: string; name: string } | null;
  customCategory?: IncomeCustomCategory | null;
  createdBy?: { id: string; fullName: string } | null;
}

export interface IncomePayload {
  title: string;
  amount: number;
  category: IncomeCategoryCode;
  categoryId?: string | null;
  /** Business-day key; today is saved with the current time. */
  incomeDate?: string;
  supplierId?: string | null;
  receivedVia: IncomeReceivedVia;
  moneyAccountId?: string | null;
  note?: string | null;
  repeatMonthly?: boolean;
  shopId?: string;
}

export interface IncomeQuery {
  from?: string;
  to?: string;
  category?: string;
  supplierId?: string;
  receivedVia?: IncomeReceivedVia;
  shopId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IncomePage {
  items: Income[];
  total: number;
  page: number;
  pages: number;
  totals: { amount: number; count: number };
  byCategory: Array<{ key: string; label: string; color: string | null; amount: number; count: number }>;
}

export interface IncomeOverview {
  month: { key: string; amount: number; count: number };
  lastMonth: { amount: number };
  months: Array<{ key: string; amount: number; count: number }>;
  /** Monthly incomes recorded in earlier months but not yet this month. */
  due: Income[];
  categories: Array<{ key: string; label: string }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const incomeApi = {
  page: (q: IncomeQuery) => apiClient.get<{ data: IncomePage }>('/income/list', { params: q }).then(unwrap),
  overview: (shopId?: string) => apiClient.get<{ data: IncomeOverview }>('/income/overview', { params: shopId ? { shopId } : {} }).then(unwrap),
  create: (body: IncomePayload) => apiClient.post<{ data: Income }>('/income', body).then(unwrap),
  update: (id: string, body: Partial<Omit<IncomePayload, 'shopId'>>) => apiClient.patch<{ data: Income }>(`/income/${id}`, body).then(unwrap),
  remove: (id: string) => apiClient.delete<{ data: { message: string } }>(`/income/${id}`).then(unwrap),
};

export const incomeCategoriesApi = {
  list: () => apiClient.get<{ data: IncomeCustomCategory[] }>('/income/categories').then(unwrap),
  create: (body: { name: string; color?: string }) => apiClient.post<{ data: IncomeCustomCategory }>('/income/categories', body).then(unwrap),
  update: (id: string, body: { name: string; color?: string; isActive?: boolean }) => apiClient.patch<{ data: IncomeCustomCategory }>(`/income/categories/${id}`, body).then(unwrap),
  remove: (id: string) => apiClient.delete<{ data: { message: string } }>(`/income/categories/${id}`).then(unwrap),
};
