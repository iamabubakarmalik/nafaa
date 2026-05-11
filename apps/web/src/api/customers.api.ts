import { apiClient } from './client';

export type CustomerGender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  cnic?: string | null;
  address?: string | null;
  city?: string | null;
  area?: string | null;
  gender?: CustomerGender | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  creditLimit: number;
  balance: number;
  loyaltyPoints: number;
  totalSpent: number;
  isActive: boolean;
  isVip: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSale {
  id: string;
  saleNumber: string;
  total: number;
  paidAmount: number;
  creditAmount: number;
  paymentMethod: string;
  status: string;
  soldAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  createdBy?: { id: string; fullName: string } | null;
}

export interface CustomerLoyaltyTx {
  id: string;
  type: string;
  points: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  sales: CustomerSale[];
  ledgers: CustomerLedgerEntry[];
  loyaltyTransactions: CustomerLoyaltyTx[];
  _count: { sales: number; ledgers: number };
  stats: {
    totalSales: number;
    totalSpent: number;
    averageSale: number;
  };
}

export interface CustomersResponse {
  items: Customer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CustomerStats {
  total: number;
  vip: number;
  withCredit: number;
  newThisMonth: number;
  newLastMonth: number;
  growthPct: number;
  totalDebt: number;
  topSpenders: Array<{
    id: string;
    name: string;
    phone?: string | null;
    avatarUrl?: string | null;
    totalSpent: number;
    isVip: boolean;
  }>;
}

export interface UpsertCustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  cnic?: string;
  address?: string;
  city?: string;
  area?: string;
  gender?: CustomerGender;
  dateOfBirth?: string;
  avatarUrl?: string;
  notes?: string;
  creditLimit?: number;
  isVip?: boolean;
  isActive?: boolean;
}

export interface CustomersListParams {
  search?: string;
  city?: string;
  hasCredit?: boolean;
  isVip?: boolean;
  sortBy?: 'name' | 'totalSpent' | 'balance' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const customersApi = {
  list: (params?: CustomersListParams) =>
    apiClient
      .get<{ data: CustomersResponse }>('/customers', {
        params: {
          ...params,
          hasCredit: params?.hasCredit !== undefined ? String(params.hasCredit) : undefined,
          isVip: params?.isVip !== undefined ? String(params.isVip) : undefined,
        },
      })
      .then(unwrap),

  stats: () =>
    apiClient.get<{ data: CustomerStats }>('/customers/stats').then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: CustomerDetail }>(`/customers/${id}`).then(unwrap),

  // ✅ Alias for getOne (used by POS)
  get: (id: string) =>
    apiClient.get<{ data: CustomerDetail }>(`/customers/${id}`).then(unwrap),

  create: (payload: UpsertCustomerPayload) =>
    apiClient.post<{ data: Customer }>('/customers', payload).then(unwrap),

  update: (id: string, payload: UpsertCustomerPayload) =>
    apiClient.patch<{ data: Customer }>(`/customers/${id}`, payload).then(unwrap),

  toggleVip: (id: string) =>
    apiClient.patch<{ data: Customer }>(`/customers/${id}/toggle-vip`).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/customers/${id}`).then(unwrap),
};
