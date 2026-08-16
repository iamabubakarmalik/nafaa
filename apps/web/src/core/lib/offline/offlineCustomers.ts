import { apiClient } from '@core/api/client';
import { db, type OfflineCustomer, localId, isTempId } from './db';
import { customersApi, type Customer, type CustomerDetail } from '@modules/customers/customers/api/customers.api';
import { queueGenericMutation } from './syncEngine';

let lastBgRefreshAt = 0;
const BG_REFRESH_GAP_MS = 30 * 1000;

function toCustomer(oc: OfflineCustomer): Customer {
  const { _syncedAt, _localDirty, _localDeleted, _tempId, ...rest } = oc;
  return {
    ...rest,
    createdAt: rest.createdAt || new Date().toISOString(),
    updatedAt: rest.updatedAt || new Date().toISOString(),
  } as Customer;
}

async function backgroundRefresh() {
  const now = Date.now();
  if (now - lastBgRefreshAt < BG_REFRESH_GAP_MS) return;
  lastBgRefreshAt = now;
  try {
    const server = await customersApi.list({ page: 1, limit: 5000 });
    const syncedAt = Date.now();
    await db.transaction('rw', db.customers, async () => {
      for (const c of server.items) {
        const existing = await db.customers.get(c.id);
        if (existing?._localDirty && !existing?._tempId) continue;
        await db.customers.put({ ...c, _syncedAt: syncedAt } as OfflineCustomer);
      }
    });
  } catch {}
}

export const offlineCustomersApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 500;

    let all = (await db.customers.toArray()).filter((c) => !c._localDeleted);

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      all = all.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.cnic || '').toLowerCase().includes(q),
      );
    }

    const total = all.length;
    const startIdx = (page - 1) * limit;
    const items = all.slice(startIdx, startIdx + limit).map(toCustomer);

    if (navigator.onLine && all.length > 0) {
      backgroundRefresh();
    } else if (navigator.onLine && all.length === 0) {
      try {
        const server = await customersApi.list({ page: 1, limit: 5000 });
        const now = Date.now();
        await db.transaction('rw', db.customers, async () => {
          for (const c of server.items) {
            await db.customers.put({ ...c, _syncedAt: now } as OfflineCustomer);
          }
        });
        const fresh = (await db.customers.toArray()).filter((c) => !c._localDeleted);
        return {
          items: fresh.slice(startIdx, startIdx + limit).map(toCustomer),
          meta: { page, limit, total: fresh.length, totalPages: Math.ceil(fresh.length / limit) },
        };
      } catch {}
    }

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  get: async (id: string): Promise<CustomerDetail> => {
    if (navigator.onLine && !isTempId(id)) {
      try {
        const fresh = await customersApi.get(id);
        const existing = await db.customers.get(id);
        if (!existing?._localDirty) {
          await db.customers.put({ ...fresh, _syncedAt: Date.now() } as OfflineCustomer);
        }
        return fresh;
      } catch {}
    }

    const cached = await db.customers.get(id);
    if (!cached || cached._localDeleted) throw new Error('Customer not found');

    return {
      ...toCustomer(cached),
      sales: [],
      ledgers: [],
      loyaltyTransactions: [],
      _count: { sales: 0, ledgers: 0 },
      stats: { totalSales: 0, totalSpent: cached.totalSpent, averageSale: 0 },
    } as CustomerDetail;
  },

  getOne: async (id: string): Promise<CustomerDetail> => offlineCustomersApi.get(id),

  create: async (payload: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    cnic?: string;
    city?: string;
    creditLimit?: number;
  }): Promise<Customer> => {
    if (navigator.onLine) {
      try {
        const customer = await customersApi.create(payload as any);
        await db.customers.put({ ...customer, _syncedAt: Date.now() } as OfflineCustomer);
        return customer;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status < 500 && status !== 408) throw err;
      }
    }

    const tempId = localId('temp_cust');
    const now = new Date().toISOString();
    const localCustomer: OfflineCustomer = {
      id: tempId,
      tenantId: '',
      name: payload.name,
      phone: payload.phone || null,
      email: payload.email || null,
      cnic: payload.cnic || null,
      address: payload.address || null,
      city: payload.city || null,
      area: null,
      gender: null,
      dateOfBirth: null,
      avatarUrl: null,
      notes: null,
      creditLimit: Number(payload.creditLimit) || 0,
      balance: 0,
      loyaltyPoints: 0,
      totalSpent: 0,
      isActive: true,
      isVip: false,
      createdAt: now,
      updatedAt: now,
      _syncedAt: 0,
      _localDirty: true,
      _tempId: true,
    };
    await db.customers.put(localCustomer);
    await queueGenericMutation({
      type: 'CREATE_CUSTOMER',
      payload,
      endpoint: '/customers',
      method: 'POST',
      tempId,
    });
    return toCustomer(localCustomer);
  },

  update: async (id: string, payload: any): Promise<Customer> => {
    const existing = await db.customers.get(id);
    if (!existing) throw new Error('Customer nahi mila');

    const updated: OfflineCustomer = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
      _localDirty: true,
    };
    await db.customers.put(updated);

    if (navigator.onLine && !isTempId(id)) {
      try {
        const server = await customersApi.update(id, payload);
        await db.customers.put({ ...server, _syncedAt: Date.now(), _localDirty: false } as OfflineCustomer);
        return server;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status < 500 && status !== 408) throw err;
      }
    }

    await queueGenericMutation({
      type: 'UPDATE_CUSTOMER',
      payload,
      endpoint: `/customers/${id}`,
      method: 'PATCH',
      tempId: isTempId(id) ? id : undefined,
      idField: 'endpoint',
    });
    return toCustomer(updated);
  },

  remove: async (id: string): Promise<void> => {
    const existing = await db.customers.get(id);
    if (!existing) return;

    if (isTempId(id) && existing._tempId) {
      await db.customers.delete(id);
      const pendingCreate = await db.syncQueue.where('tempId').equals(id).first();
      if (pendingCreate) await db.syncQueue.delete(pendingCreate.id);
      return;
    }

    await db.customers.update(id, { _localDeleted: true, _localDirty: true });

    if (navigator.onLine) {
      try {
        await customersApi.remove(id);
        await db.customers.delete(id);
        return;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status < 500 && status !== 408) {
          await db.customers.update(id, { _localDeleted: false, _localDirty: false });
          throw err;
        }
      }
    }

    await queueGenericMutation({
      type: 'DELETE_CUSTOMER',
      payload: {},
      endpoint: `/customers/${id}`,
      method: 'DELETE',
    });
  },

  recordPayment: async (id: string, data: { amount: number; note?: string }): Promise<any> => {
    // Optimistic — reduce balance
    const existing = await db.customers.get(id);
    if (existing) {
      await db.customers.update(id, {
        balance: Math.max(0, existing.balance - data.amount),
        _localDirty: true,
      });
    }

    if (navigator.onLine && !isTempId(id)) {
      try {
        const res = await apiClient.post(`/customers/${id}/payments`, data);
        return res.data?.data ?? res.data;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status < 500 && status !== 408) {
          // Revert
          if (existing) await db.customers.update(id, { balance: existing.balance, _localDirty: false });
          throw err;
        }
      }
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
  },
};
