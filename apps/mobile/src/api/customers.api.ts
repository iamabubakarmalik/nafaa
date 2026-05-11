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

/**
 * Defensive unwrap — handles BOTH cases:
 *  1. Axios interceptor already unwrapped: response.data === { items, meta }
 *  2. No interceptor: response.data === { data: { items, meta } }
 *  3. Backend returns array directly: response.data === [...]
 */
function unwrapList(res: any): CustomersResponse {
  const body = res?.data;

  // Case: { data: { items, meta } }
  if (body?.data?.items) {
    return body.data;
  }

  // Case: { items, meta } — already unwrapped
  if (body?.items) {
    return body;
  }

  // Case: array directly
  if (Array.isArray(body)) {
    return {
      items: body,
      meta: { page: 1, limit: body.length, total: body.length, totalPages: 1 },
    };
  }

  // Case: { data: [...] } — array inside data
  if (Array.isArray(body?.data)) {
    return {
      items: body.data,
      meta: { page: 1, limit: body.data.length, total: body.data.length, totalPages: 1 },
    };
  }

  // Fallback: empty
  console.warn('⚠️ customersApi.list: Unexpected response shape', body);
  return {
    items: [],
    meta: { page: 1, limit: 0, total: 0, totalPages: 0 },
  };
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data) return body.data as T;
  return body as T;
}

export const customersApi = {
  list: (params?: CustomersListParams): Promise<CustomersResponse> =>
    apiClient
      .get('/customers', {
        params: {
          ...params,
          hasCredit: params?.hasCredit !== undefined ? String(params.hasCredit) : undefined,
          isVip: params?.isVip !== undefined ? String(params.isVip) : undefined,
        },
      })
      .then(unwrapList),

  stats: (): Promise<CustomerStats> =>
    apiClient.get('/customers/stats').then((r) => unwrapOne<CustomerStats>(r)),

  getOne: (id: string): Promise<CustomerDetail> =>
    apiClient.get(`/customers/${id}`).then((r) => unwrapOne<CustomerDetail>(r)),

  // Alias
  get: (id: string): Promise<CustomerDetail> =>
    apiClient.get(`/customers/${id}`).then((r) => unwrapOne<CustomerDetail>(r)),

  create: (payload: UpsertCustomerPayload): Promise<Customer> =>
    apiClient.post('/customers', payload).then((r) => unwrapOne<Customer>(r)),

  update: (id: string, payload: UpsertCustomerPayload): Promise<Customer> =>
    apiClient.patch(`/customers/${id}`, payload).then((r) => unwrapOne<Customer>(r)),

  toggleVip: (id: string): Promise<Customer> =>
    apiClient.patch(`/customers/${id}/toggle-vip`).then((r) => unwrapOne<Customer>(r)),

  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/customers/${id}`).then((r) => unwrapOne<{ message: string }>(r)),
};
