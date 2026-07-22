import { db } from './db';
import {
  customerLedgerApi,
  type LedgerEntry,
  type LedgerCustomer,
} from '@/api/customer-ledger.api';
import { customersApi, type Customer } from '@/api/customers.api';

export interface LedgerResponse {
  customer: LedgerCustomer;
  ledgers: LedgerEntry[];
}

interface CachedLedgerData extends LedgerResponse {
  _cachedAt: number;
}

const LEDGER_CACHE_KEY = 'khata-ledger-cache';

/**
 * Build a minimal LedgerCustomer from an OfflineCustomer
 */
function customerToLedgerCustomer(c: any): LedgerCustomer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    balance: c.balance,
    creditLimit: c.creditLimit,
  };
}

/**
 * Cache all customer ledgers locally.
 */
export async function downloadKhataData(): Promise<void> {
  if (!navigator.onLine) return;

  try {
    const customers = await db.customers.toArray();
    const allLedgers: Record<string, CachedLedgerData> = {};

    const batchSize = 5;
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (c) => {
          try {
            const data = await customerLedgerApi.list(c.id);
            return { customerId: c.id, data };
          } catch {
            return {
              customerId: c.id,
              data: { customer: customerToLedgerCustomer(c), ledgers: [] },
            };
          }
        }),
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.data) {
          allLedgers[r.value.customerId] = {
            customer: r.value.data.customer,
            ledgers: r.value.data.ledgers,
            _cachedAt: Date.now(),
          };
        }
      }
    }

    await db.meta.put({
      key: LEDGER_CACHE_KEY,
      value: allLedgers,
      updatedAt: Date.now(),
    });

    console.log(
      `[offline-khata] Cached ledger for ${Object.keys(allLedgers).length} customers`,
    );
  } catch (e) {
    console.warn('[offline-khata] Cache failed:', e);
  }
}

/**
 * Get cached ledger for a customer
 */
export async function getCachedLedger(customerId: string): Promise<LedgerResponse> {
  const entry = await db.meta.get(LEDGER_CACHE_KEY);
  if (entry?.value) {
    const all = entry.value as Record<string, CachedLedgerData>;
    const data = all[customerId];
    if (data) {
      return { customer: data.customer, ledgers: data.ledgers };
    }
  }

  // Fallback: build from local customer + empty ledgers
  const customer = await db.customers.get(customerId);
  if (!customer) {
    throw new Error('Customer not found in local cache');
  }
  return {
    customer: customerToLedgerCustomer(customer),
    ledgers: [],
  };
}

/**
 * Get khata ledger — server first, cache fallback.
 * Returns same shape as customerLedgerApi.list(): { customer, ledgers }
 */
export async function getKhataLedger(customerId: string): Promise<LedgerResponse> {
  if (navigator.onLine) {
    try {
      const data = await customerLedgerApi.list(customerId);

      // Update cache
      const entry = await db.meta.get(LEDGER_CACHE_KEY);
      const allLedgers =
        (entry?.value as Record<string, CachedLedgerData>) || {};
      allLedgers[customerId] = {
        customer: data.customer,
        ledgers: data.ledgers,
        _cachedAt: Date.now(),
      };
      await db.meta.put({
        key: LEDGER_CACHE_KEY,
        value: allLedgers,
        updatedAt: Date.now(),
      });

      return data;
    } catch {
      // Fall through to cache
    }
  }
  return getCachedLedger(customerId);
}

/**
 * Get all customers (offline-aware).
 * Same shape as customersApi.list({ hasCredit: true })
 */
export async function getKhataCustomers(params?: {
  hasCredit?: boolean;
  search?: string;
}): Promise<{
  items: Customer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  if (navigator.onLine) {
    try {
      const result = await customersApi.list({
        hasCredit: params?.hasCredit,
        search: params?.search,
        limit: 5000,
      });
      return result;
    } catch {
      // Fall through to cache
    }
  }

  let customers = await db.customers.toArray();

  if (params?.hasCredit) {
    customers = customers.filter((c) => c.balance > 0);
  }

  if (params?.search) {
    const q = params.search.toLowerCase().trim();
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q),
    );
  }

  customers.sort((a, b) => b.balance - a.balance);

  // Strip internal fields when returning as Customer[]
  const items = customers.map((c) => {
    const { _syncedAt, _localDirty, ...rest } = c;
    return rest as Customer;
  });

  return {
    items,
    meta: {
      page: 1,
      limit: items.length,
      total: items.length,
      totalPages: 1,
    },
  };
}
