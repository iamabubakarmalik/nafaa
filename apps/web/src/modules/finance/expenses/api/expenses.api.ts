/**
 * Expenses API: the paged record, headline numbers, analytics, monthly bills,
 * and record / edit / pay / delete. Writes and the record fall back to the
 * offline store when the network is down and sync later.
 */

import { apiClient } from '@core/api/client';
import type { ShopStamp } from '@core/lib/shopScope';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { businessDayKey, cachedDayStartHour } from '@core/lib/business-day';

export type ExpenseStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type ExpenseMethod = Extract<PaymentMethod, 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA'>;

export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  _count?: { expenses: number };
}

export interface Expense {
  id: string;
  expenseNumber: string;
  title: string;
  description?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  expenseDate: string;
  createdAt?: string;
  /** Photo of the bill. */
  attachmentUrl?: string | null;
  categoryId?: string | null;
  category?: ExpenseCategory | null;
  shop?: ShopStamp | null;
  createdBy?: { id: string; fullName: string } | null;
}

export interface CreateExpensePayload {
  title: string;
  description?: string;
  amount: number;
  categoryId?: string;
  paymentMethod: PaymentMethod;
  /** Business-day key ("2026-10-13"); today is saved with the current time. */
  expenseDate?: string;
  attachmentUrl?: string;
  status?: ExpenseStatus;
  /** Branch, needed on the all-branches view. */
  shopId?: string;
}

/** Only what changed; an empty string clears category, note or photo. */
export type UpdateExpensePayload = Partial<Omit<CreateExpensePayload, 'shopId'>>;

export interface ExpenseQuery {
  from?: string;
  to?: string;
  /** A category id, or "none". */
  categoryId?: string;
  paymentMethod?: ExpenseMethod;
  shopId?: string;
  createdById?: string;
  search?: string;
  status?: ExpenseStatus;
  sort?: 'recent' | 'amount';
  page?: number;
  limit?: number;
}

export type ExpenseFilter = Omit<ExpenseQuery, 'status' | 'sort' | 'page' | 'limit'>;

export interface ExpensePage {
  items: Expense[];
  total: number;
  page: number;
  pages: number;
  /** For the whole filter, any status; `amount` is the paid (spent) total. */
  totals: {
    amount: number; paid: number; pending: number; cancelled: number;
    paidCount: number; pendingCount: number; cancelledCount: number;
  };
  /** Set when the list came from this device because the server could not be reached. */
  offline?: boolean;
}

/** Today, this month and the top category count paid expenses only. */
export interface ExpenseOverview {
  today: { amount: number; count: number };
  month: { amount: number; count: number };
  /** Same days of last month, and the whole of last month. */
  lastMonth: { toDate: number; full: number };
  /** Percent against the same days of last month; null when last month had none. */
  change: number | null;
  topCategory: { id: string; name: string; color: string; icon: string | null; amount: number; count: number; share: number } | null;
  pending: { count: number; amount: number; oldest: string | null };
  /** Cash shift of the open branch; null on the all-branches view. */
  register: { open: true; registerNumber: string; openedAt: string; cashExpenses: number; count: number } | { open: false } | null;
  people: Array<{ id: string; fullName: string }>;
}

export interface ExpenseBucket { key: string; label: string; amount: number; count: number; color?: string; icon?: string | null }

export interface ExpenseAnalytics {
  from: string;
  to: string;
  totals: {
    amount: number; count: number; pending: number; pendingCount: number; perDay: number; days: number;
    previous: number; change: number | null;
    biggest: { title: string; amount: number; date: string } | null;
  };
  byCategory: ExpenseBucket[];
  byDay: Array<{ key: string; amount: number; count: number }>;
  byMonth: Array<{ key: string; amount: number }>;
  byBranch: ExpenseBucket[];
  byMethod: ExpenseBucket[];
  byPerson: ExpenseBucket[];
  topPayees: ExpenseBucket[];
  matrix: {
    months: string[];
    rows: Array<{ key: string; label: string; color: string; icon: string | null; values: number[]; total: number }>;
    totals: number[];
  };
}

export interface RepeatingExpense {
  key: string;
  title: string;
  category: { id: string; name: string; color: string; icon: string | null } | null;
  paymentMethod: PaymentMethod;
  /** Months (of the last three) it was paid. */
  months: number;
  lastAmount: number;
  average: number;
  lastDate: string;
  /** Day of the month it was paid last time. */
  usualDay: number;
  thisMonth: { amount: number; count: number; pending: number };
  /** Not recorded this month yet. */
  due: boolean;
}

export interface RepeatingExpenses {
  month: string;
  items: RepeatingExpense[];
  due: number;
  dueAmount: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

const isNetFail = (e: unknown): boolean => {
  const s = (e as { response?: { status?: number } })?.response?.status;
  return !s || s === 408 || s >= 502;
};

type LocalRow = Expense & { _syncedAt?: number; _localDirty?: boolean; _localDeleted?: boolean; _tempId?: boolean };

const stripLocal = (e: LocalRow): Expense => {
  const { _syncedAt, _localDirty, _localDeleted, _tempId, ...rest } = e;
  void _syncedAt; void _localDirty; void _localDeleted; void _tempId;
  return rest;
};

/** Expenses kept on this device, newest first, with their category attached. */
async function localExpenseList(): Promise<Expense[]> {
  const { db } = await import('@core/lib/offline/db');
  const rows = ((await db.expenses.toArray()) as unknown as LocalRow[]).filter((e) => !e._localDeleted);
  const cats = await db.lookups.where('type').equals('expenseCategory').toArray();
  const catMap = new Map(cats.map((c) => [c.id, c as unknown as ExpenseCategory]));
  return rows
    .map((e) => {
      const cat = e.categoryId ? catMap.get(e.categoryId) : null;
      return { ...stripLocal(e), category: cat ? { id: cat.id, name: cat.name, color: cat.color || '#f59e0b', icon: cat.icon } : e.category ?? null };
    })
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
}

/** Saves server rows on this device so the record still opens offline. */
async function cacheRows(rows: Expense[]) {
  try {
    const { db } = await import('@core/lib/offline/db');
    const now = Date.now();
    await db.transaction('rw', db.expenses, async () => {
      for (const e of rows) {
        const existing = (await db.expenses.get(e.id)) as unknown as LocalRow | undefined;
        if (existing?._localDirty && !existing?._tempId) continue;
        await db.expenses.put({ ...e, categoryId: e.category?.id ?? null, _syncedAt: now } as never);
      }
    });
  } catch { /* the cache is a convenience */ }
}

/** The record from this device's copy, filtered like the server would. */
async function localPage(q: ExpenseQuery): Promise<ExpensePage> {
  const h = cachedDayStartHour();
  const s = q.search?.trim().toLowerCase();
  const rows = (await localExpenseList()).filter((e) => {
    const k = businessDayKey(new Date(e.expenseDate), h);
    if (q.from && q.to && (k < q.from || k > q.to)) return false;
    if (q.categoryId && (q.categoryId === 'none' ? !!e.category : e.category?.id !== q.categoryId)) return false;
    if (q.paymentMethod && e.paymentMethod !== q.paymentMethod) return false;
    if (s && ![e.title, e.description, e.expenseNumber, e.category?.name].some((v) => v?.toLowerCase().includes(s))) return false;
    return true;
  });
  const sum = (st: ExpenseStatus) => rows.filter((r) => r.status === st).reduce((t, r) => t + Number(r.amount || 0), 0);
  const count = (st: ExpenseStatus) => rows.filter((r) => r.status === st).length;
  const list = (q.status ? rows.filter((r) => r.status === q.status) : rows)
    .sort((a, b) => (q.sort === 'amount' ? b.amount - a.amount : 0));
  const limit = q.limit ?? 30;
  const page = q.page ?? 1;
  return {
    items: list.slice((page - 1) * limit, page * limit),
    total: list.length,
    page,
    pages: Math.max(1, Math.ceil(list.length / limit)),
    totals: {
      amount: sum('PAID'), paid: sum('PAID'), pending: sum('PENDING'), cancelled: sum('CANCELLED'),
      paidCount: count('PAID'), pendingCount: count('PENDING'), cancelledCount: count('CANCELLED'),
    },
    offline: true,
  };
}

export const expensesApi = {
  /** The latest 100 as an array; also fills the offline cache. */
  list: async (): Promise<Expense[]> => {
    try {
      const server = await apiClient.get<{ data: Expense[] }>('/expenses').then(unwrap);
      await cacheRows(server);
      return server;
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localExpenseList();
    }
  },

  page: async (q: ExpenseQuery): Promise<ExpensePage> => {
    try {
      const res = await apiClient.get<{ data: ExpensePage }>('/expenses/list', { params: q }).then(unwrap);
      if (res.page === 1) void cacheRows(res.items);
      return res;
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localPage(q);
    }
  },

  overview: (shopId?: string) =>
    apiClient.get<{ data: ExpenseOverview }>('/expenses/overview', { params: shopId ? { shopId } : {} }).then(unwrap),

  analytics: (q: ExpenseFilter) =>
    apiClient.get<{ data: ExpenseAnalytics }>('/expenses/analytics', { params: q }).then(unwrap),

  repeating: (shopId?: string) =>
    apiClient.get<{ data: RepeatingExpenses }>('/expenses/repeating', { params: shopId ? { shopId } : {} }).then(unwrap),

  create: async (payload: CreateExpensePayload): Promise<Expense> => {
    try {
      return await apiClient.post<{ data: Expense }>('/expenses', payload).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db, localId } = await import('@core/lib/offline/db');
      const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');
      const tempId = localId('temp_exp');
      const local = {
        id: tempId,
        expenseNumber: `LOCAL-${tempId.slice(-6).toUpperCase()}`,
        title: payload.title,
        description: payload.description || null,
        amount: Number(payload.amount) || 0,
        paymentMethod: payload.paymentMethod,
        status: payload.status ?? 'PAID',
        expenseDate: new Date().toISOString(),
        categoryId: payload.categoryId || null,
        _syncedAt: 0,
        _localDirty: true,
        _tempId: true,
      };
      await db.expenses.put(local as never);
      await queueGenericMutation({ type: 'CREATE_EXPENSE', payload, endpoint: '/expenses', method: 'POST', tempId });
      return stripLocal(local as LocalRow);
    }
  },

  update: async (id: string, payload: UpdateExpensePayload): Promise<Expense> => {
    try {
      return await apiClient.patch<{ data: Expense }>(`/expenses/${id}`, payload).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');
      const existing = (await db.expenses.get(id)) as unknown as LocalRow | undefined;
      if (!existing) throw e;
      const merged = {
        ...existing,
        ...payload,
        amount: payload.amount !== undefined ? Number(payload.amount) || 0 : existing.amount,
        _localDirty: true,
      };
      await db.expenses.put(merged as never);
      await queueGenericMutation({ type: 'UPDATE_EXPENSE', payload, endpoint: `/expenses/${id}`, method: 'PATCH' });
      return stripLocal(merged as LocalRow);
    }
  },

  /** Pays a pending bill now (needs the network). */
  pay: (id: string, paymentMethod?: PaymentMethod) =>
    apiClient.post<{ data: Expense }>(`/expenses/${id}/pay`, paymentMethod ? { paymentMethod } : {}).then(unwrap),

  remove: async (id: string): Promise<{ message: string }> => {
    try {
      return await apiClient.delete<{ data: { message: string } }>(`/expenses/${id}`).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db, isTempId } = await import('@core/lib/offline/db');
      const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');
      const existing = (await db.expenses.get(id)) as unknown as LocalRow | undefined;
      if (!existing) return { message: 'Already removed' };
      if (isTempId(id) && existing._tempId) {
        await db.expenses.delete(id);
        const pendingCreate = await db.syncQueue.where('tempId').equals(id).first();
        if (pendingCreate?.id != null) await db.syncQueue.delete(pendingCreate.id);
        return { message: 'Removed (was offline-only)' };
      }
      await db.expenses.update(id, { _localDeleted: true, _localDirty: true } as never);
      await queueGenericMutation({ type: 'DELETE_EXPENSE', payload: {}, endpoint: `/expenses/${id}`, method: 'DELETE' });
      return { message: 'Queued for delete' };
    }
  },
};

export interface ExpenseCategoryPayload {
  name: string;
  color?: string;
  icon?: string;
}

export const expenseCategoriesApi = {
  list: async (): Promise<ExpenseCategory[]> => {
    try {
      return await apiClient.get<{ data: ExpenseCategory[] }>('/expense-categories').then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const cats = await db.lookups.where('type').equals('expenseCategory').toArray();
      return cats.map((c) => {
        const x = c as unknown as ExpenseCategory;
        return { id: x.id, name: x.name, color: x.color || '#f59e0b', icon: x.icon || null };
      });
    }
  },

  create: (payload: ExpenseCategoryPayload) =>
    apiClient.post<{ data: ExpenseCategory }>('/expense-categories', payload).then(unwrap),

  update: (id: string, payload: Partial<ExpenseCategoryPayload>) =>
    apiClient.patch<{ data: ExpenseCategory }>(`/expense-categories/${id}`, payload).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/expense-categories/${id}`).then(unwrap),
};
