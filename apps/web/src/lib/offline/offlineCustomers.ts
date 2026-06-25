import { db, type OfflineCustomer } from './db';
import { customersApi, type Customer, type CustomerDetail } from '@/api/customers.api';
import { queueGenericMutation } from './syncEngine';

function toCustomer(oc: OfflineCustomer): Customer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _syncedAt, _localDirty, ...rest } = oc;
  return {
    ...rest,
    createdAt: rest.createdAt || new Date().toISOString(),
    updatedAt: rest.updatedAt || new Date().toISOString(),
  } as Customer;
}

export const offlineCustomersApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 500;

    let all = await db.customers.toArray();

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

    if (navigator.onLine) {
      customersApi
        .list({ page: 1, limit: 5000 })
        .then(async (server) => {
          const now = Date.now();
          await db.transaction('rw', db.customers, async () => {
            for (const c of server.items) {
              await db.customers.put({ ...c, _syncedAt: now } as OfflineCustomer);
            }
          });
        })
        .catch(() => {});
    }

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  get: async (id: string): Promise<CustomerDetail> => {
    if (navigator.onLine) {
      try {
        const fresh = await customersApi.get(id);
        await db.customers.put({ ...fresh, _syncedAt: Date.now() } as OfflineCustomer);
        return fresh;
      } catch {
        // Fall through to cache
      }
    }

    const cached = await db.customers.get(id);
    if (!cached) throw new Error('Customer not found');

    // Return a minimal CustomerDetail shape
    return {
      ...toCustomer(cached),
      sales: [],
      ledgers: [],
      loyaltyTransactions: [],
      _count: { sales: 0, ledgers: 0 },
      stats: { totalSales: 0, totalSpent: cached.totalSpent, averageSale: 0 },
    } as CustomerDetail;
  },

  getOne: async (id: string): Promise<CustomerDetail> => {
    return offlineCustomersApi.get(id);
  },

  create: async (payload: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  }): Promise<Customer> => {
    if (navigator.onLine) {
      try {
        const customer = await customersApi.create(payload);
        await db.customers.put({
          ...customer,
          _syncedAt: Date.now(),
        } as OfflineCustomer);
        return customer;
      } catch {
        // Fall through to offline mode
      }
    }

    const tempId = `temp_cust_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const localCustomer: OfflineCustomer = {
      id: tempId,
      tenantId: '',
      name: payload.name,
      phone: payload.phone || null,
      email: payload.email || null,
      cnic: null,
      address: payload.address || null,
      city: null,
      area: null,
      gender: null,
      dateOfBirth: null,
      avatarUrl: null,
      notes: null,
      creditLimit: 0,
      balance: 0,
      loyaltyPoints: 0,
      totalSpent: 0,
      isActive: true,
      isVip: false,
      createdAt: now,
      updatedAt: now,
      _syncedAt: 0,
      _localDirty: true,
    };

    await db.customers.put(localCustomer);

    await queueGenericMutation({
      type: 'CREATE_CUSTOMER',
      payload,
      endpoint: '/customers',
      method: 'POST',
    });

    return toCustomer(localCustomer);
  },
};
