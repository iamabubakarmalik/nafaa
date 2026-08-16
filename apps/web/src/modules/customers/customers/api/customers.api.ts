import { apiClient } from '@core/api/client';

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

const isNetFail = (e: any): boolean => {
  const s = e?.response?.status;
  return !s || s === 0 || s === 408 || s >= 502;
};

const stripLocal = (c: any): Customer => {
  const { _syncedAt, _localDirty, _localDeleted, _tempId, ...rest } = c;
  return rest as Customer;
};

async function localList(params?: CustomersListParams): Promise<CustomersResponse> {
  const { db } = await import('@core/lib/offline/db');
  let rows = (await db.customers.toArray()).filter((c: any) => !c._localDeleted);

  if (params?.search) {
    const q = params.search.toLowerCase().trim();
    rows = rows.filter(
      (c: any) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.cnic || '').toLowerCase().includes(q),
    );
  }
  if (params?.city) rows = rows.filter((c: any) => c.city === params.city);
  if (params?.hasCredit) rows = rows.filter((c: any) => c.balance > 0);
  if (params?.isVip) rows = rows.filter((c: any) => c.isVip);

  const sortBy = params?.sortBy || 'createdAt';
  const dir = params?.sortOrder === 'asc' ? 1 : -1;
  rows.sort((a: any, b: any) => {
    const av = a[sortBy] ?? '';
    const bv = b[sortBy] ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const total = rows.length;
  const start = (page - 1) * limit;
  return {
    items: rows.slice(start, start + limit).map(stripLocal),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

async function localDetail(id: string): Promise<CustomerDetail> {
  const { db } = await import('@core/lib/offline/db');
  const c: any = await db.customers.get(id);
  if (!c || c._localDeleted) throw new Error('Customer nahi mila (offline cache me nahi)');
  return {
    ...stripLocal(c),
    sales: [],
    ledgers: [],
    loyaltyTransactions: [],
    _count: { sales: 0, ledgers: 0 },
    stats: { totalSales: 0, totalSpent: c.totalSpent || 0, averageSale: 0 },
  } as CustomerDetail;
}

async function localCreate(payload: UpsertCustomerPayload): Promise<Customer> {
  const { db, localId } = await import('@core/lib/offline/db');
  const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');

  const tempId = localId('temp_cust');
  const now = new Date().toISOString();
  const local: any = {
    id: tempId,
    tenantId: '',
    name: payload.name,
    phone: payload.phone || null,
    email: payload.email || null,
    cnic: payload.cnic || null,
    address: payload.address || null,
    city: payload.city || null,
    area: payload.area || null,
    gender: payload.gender || null,
    dateOfBirth: payload.dateOfBirth || null,
    avatarUrl: payload.avatarUrl || null,
    notes: payload.notes || null,
    creditLimit: Number(payload.creditLimit) || 0,
    balance: 0,
    loyaltyPoints: 0,
    totalSpent: 0,
    isActive: payload.isActive !== false,
    isVip: !!payload.isVip,
    createdAt: now,
    updatedAt: now,
    _syncedAt: 0,
    _localDirty: true,
    _tempId: true,
  };
  await db.customers.put(local);
  await queueGenericMutation({
    type: 'CREATE_CUSTOMER',
    payload,
    endpoint: '/customers',
    method: 'POST',
    tempId,
  });
  return stripLocal(local);
}

async function localUpdate(id: string, payload: UpsertCustomerPayload): Promise<Customer> {
  const { db, isTempId } = await import('@core/lib/offline/db');
  const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');

  const existing = await db.customers.get(id);
  if (!existing) throw new Error('Customer nahi mila');

  const updated: any = {
    ...existing,
    ...(payload as any),
    updatedAt: new Date().toISOString(),
    _localDirty: true,
  };
  await db.customers.put(updated);
  await queueGenericMutation({
    type: 'UPDATE_CUSTOMER',
    payload,
    endpoint: `/customers/${id}`,
    method: 'PATCH',
    tempId: isTempId(id) ? id : undefined,
    idField: 'endpoint',
  });
  return stripLocal(updated);
}

export const customersApi = {
  list: async (params?: CustomersListParams): Promise<CustomersResponse> => {
    try {
      return await apiClient
        .get<{ data: CustomersResponse }>('/customers', {
          params: {
            ...params,
            hasCredit: params?.hasCredit !== undefined ? String(params.hasCredit) : undefined,
            isVip: params?.isVip !== undefined ? String(params.isVip) : undefined,
          },
        })
        .then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localList(params);
    }
  },

  stats: async (): Promise<CustomerStats> => {
    try {
      return await apiClient.get<{ data: CustomerStats }>('/customers/stats').then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const rows = (await db.customers.toArray()).filter((c: any) => !c._localDeleted);
      const top = [...rows].sort((a: any, b: any) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5);
      return {
        total: rows.length,
        vip: rows.filter((c: any) => c.isVip).length,
        withCredit: rows.filter((c: any) => c.balance > 0).length,
        newThisMonth: 0,
        newLastMonth: 0,
        growthPct: 0,
        totalDebt: rows.reduce((s: number, c: any) => s + (c.balance || 0), 0),
        topSpenders: top.map((c: any) => ({
          id: c.id, name: c.name, phone: c.phone, avatarUrl: c.avatarUrl,
          totalSpent: c.totalSpent || 0, isVip: !!c.isVip,
        })),
      };
    }
  },

  getOne: async (id: string): Promise<CustomerDetail> => {
    try {
      return await apiClient.get<{ data: CustomerDetail }>(`/customers/${id}`).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localDetail(id);
    }
  },

  get: async (id: string): Promise<CustomerDetail> => {
    try {
      return await apiClient.get<{ data: CustomerDetail }>(`/customers/${id}`).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localDetail(id);
    }
  },

  create: async (payload: UpsertCustomerPayload): Promise<Customer> => {
    try {
      return await apiClient.post<{ data: Customer }>('/customers', payload).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localCreate(payload);
    }
  },

  update: async (id: string, payload: UpsertCustomerPayload): Promise<Customer> => {
    try {
      return await apiClient.patch<{ data: Customer }>(`/customers/${id}`, payload).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localUpdate(id, payload);
    }
  },

  toggleVip: async (id: string): Promise<Customer> => {
    try {
      return await apiClient.patch<{ data: Customer }>(`/customers/${id}/toggle-vip`).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const c: any = await db.customers.get(id);
      if (!c) throw new Error('Customer nahi mila');
      return localUpdate(id, { ...stripLocal(c), isVip: !c.isVip } as any);
    }
  },

  remove: async (id: string): Promise<{ message: string }> => {
    try {
      return await apiClient.delete<{ data: { message: string } }>(`/customers/${id}`).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db, isTempId } = await import('@core/lib/offline/db');
      const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');
      const existing: any = await db.customers.get(id);
      if (!existing) return { message: 'Already removed' };
      if (isTempId(id) && existing._tempId) {
        await db.customers.delete(id);
        const pendingCreate = await db.syncQueue.where('tempId').equals(id).first();
        if (pendingCreate) await db.syncQueue.delete(pendingCreate.id);
        return { message: 'Removed (was offline-only)' };
      }
      await db.customers.update(id, { _localDeleted: true, _localDirty: true } as any);
      await queueGenericMutation({
        type: 'DELETE_CUSTOMER',
        payload: {},
        endpoint: `/customers/${id}`,
        method: 'DELETE',
      });
      return { message: 'Queued for delete' };
    }
  },

  /** Khata payment — offline pe optimistic balance + queue */
  recordPayment: async (id: string, data: { amount: number; note?: string }): Promise<any> => {
    try {
      const r = await apiClient.post(`/customers/${id}/payments`, data);
      return r.data?.data ?? r.data;
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db, isTempId } = await import('@core/lib/offline/db');
      const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');
      const existing: any = await db.customers.get(id);
      if (existing) {
        await db.customers.update(id, {
          balance: Math.max(0, (existing.balance || 0) - data.amount),
          _localDirty: true,
        } as any);
      }
      await queueGenericMutation({
        type: 'PAYMENT_CUSTOMER',
        payload: data,
        endpoint: `/customers/${id}/payments`,
        method: 'POST',
        tempId: isTempId(id) ? id : undefined,
        idField: 'endpoint',
      });
      return { success: true, offline: true };
    }
  },
};
