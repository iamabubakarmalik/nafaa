import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

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
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  expenseDate: string;
  category?: ExpenseCategory | null;
}

export interface CreateExpensePayload {
  title: string;
  description?: string;
  amount: number;
  categoryId?: string;
  paymentMethod: PaymentMethod;
}

export interface CreateExpenseCategoryPayload {
  name: string;
  color?: string;
  icon?: string;
}

export interface ExpenseSummary {
  todayExpenses: number;
  todayCount: number;
  monthExpenses: number;
  totalExpenses: number;
  byCategory: Array<{
    categoryId: string | null;
    _sum: { amount: number | null };
    _count: { _all: number };
  }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

const isNetFail = (e: any): boolean => {
  const s = e?.response?.status;
  return !s || s === 0 || s === 408 || s >= 502;
};

const stripLocal = (e: any): Expense => {
  const { _syncedAt, _localDirty, _localDeleted, _tempId, ...rest } = e;
  return rest as Expense;
};

async function localExpenseList(): Promise<Expense[]> {
  const { db } = await import('@core/lib/offline/db');
  const rows = (await db.expenses.toArray()).filter((e: any) => !e._localDeleted);
  // category attach from lookups
  const cats = await db.lookups.where('type').equals('expenseCategory').toArray();
  const catMap = new Map(cats.map((c: any) => [c.id, c]));
  return rows
    .map((e: any) => {
      const cat = e.categoryId ? catMap.get(e.categoryId) : null;
      return { ...stripLocal(e), category: cat ? { id: cat.id, name: cat.name, color: cat.color || '#f59e0b', icon: cat.icon } : null };
    })
    .sort((a: any, b: any) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
}

export const expensesApi = {
  list: async (): Promise<Expense[]> => {
    try {
      const server = await apiClient.get<{ data: Expense[] }>('/expenses').then(unwrap);
      // Cache for offline
      try {
        const { db } = await import('@core/lib/offline/db');
        const now = Date.now();
        await db.transaction('rw', db.expenses, async () => {
          for (const e of server) {
            const existing: any = await db.expenses.get(e.id);
            if (existing?._localDirty && !existing?._tempId) continue;
            await db.expenses.put({ ...(e as any), categoryId: e.category?.id ?? null, _syncedAt: now } as any);
          }
        });
      } catch {}
      return server;
    } catch (e) {
      if (!isNetFail(e)) throw e;
      return localExpenseList();
    }
  },

  create: async (payload: CreateExpensePayload): Promise<Expense> => {
    try {
      return await apiClient.post<{ data: Expense }>('/expenses', payload).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db, localId } = await import('@core/lib/offline/db');
      const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');
      const tempId = localId('temp_exp');
      const now = new Date().toISOString();
      const local: any = {
        id: tempId,
        expenseNumber: `LOCAL-${tempId.slice(-6).toUpperCase()}`,
        title: payload.title,
        description: payload.description || null,
        amount: Number(payload.amount) || 0,
        paymentMethod: payload.paymentMethod,
        status: 'PAID',
        expenseDate: now,
        categoryId: payload.categoryId || null,
        _syncedAt: 0,
        _localDirty: true,
        _tempId: true,
      };
      await db.expenses.put(local);
      await queueGenericMutation({
        type: 'CREATE_EXPENSE',
        payload,
        endpoint: '/expenses',
        method: 'POST',
        tempId,
      });
      return stripLocal(local);
    }
  },

  remove: async (id: string): Promise<{ message: string }> => {
    try {
      return await apiClient.delete<{ data: { message: string } }>(`/expenses/${id}`).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db, isTempId } = await import('@core/lib/offline/db');
      const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');
      const existing: any = await db.expenses.get(id);
      if (!existing) return { message: 'Already removed' };
      if (isTempId(id) && existing._tempId) {
        await db.expenses.delete(id);
        const pendingCreate = await db.syncQueue.where('tempId').equals(id).first();
        if (pendingCreate) await db.syncQueue.delete(pendingCreate.id);
        return { message: 'Removed (was offline-only)' };
      }
      await db.expenses.update(id, { _localDeleted: true, _localDirty: true } as any);
      await queueGenericMutation({
        type: 'DELETE_EXPENSE',
        payload: {},
        endpoint: `/expenses/${id}`,
        method: 'DELETE',
      });
      return { message: 'Queued for delete' };
    }
  },

  summary: async (): Promise<ExpenseSummary> => {
    try {
      return await apiClient.get<{ data: ExpenseSummary }>('/expenses/summary').then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const rows = await localExpenseList();
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const today = rows.filter((r) => new Date(r.expenseDate).getTime() >= todayStart.getTime());
      const month = rows.filter((r) => new Date(r.expenseDate).getTime() >= monthStart.getTime());
      const sum = (arr: Expense[]) => arr.reduce((s, r) => s + (r.amount || 0), 0);
      return {
        todayExpenses: sum(today),
        todayCount: today.length,
        monthExpenses: sum(month),
        totalExpenses: sum(rows),
        byCategory: [],
      };
    }
  },
};

export const expenseCategoriesApi = {
  list: async (): Promise<ExpenseCategory[]> => {
    try {
      return await apiClient.get<{ data: ExpenseCategory[] }>('/expense-categories').then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const cats = await db.lookups.where('type').equals('expenseCategory').toArray();
      return cats.map((c: any) => ({ id: c.id, name: c.name, color: c.color || '#f59e0b', icon: c.icon || null }));
    }
  },

  create: async (payload: CreateExpenseCategoryPayload): Promise<ExpenseCategory> => {
    try {
      return await apiClient.post<{ data: ExpenseCategory }>('/expense-categories', payload).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db, localId } = await import('@core/lib/offline/db');
      const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');
      const tempId = localId('temp_expcat');
      const local = {
        id: tempId,
        type: 'expenseCategory' as const,
        name: payload.name,
        color: payload.color || '#f59e0b',
        icon: payload.icon,
        _syncedAt: 0,
      };
      await db.lookups.put(local);
      await queueGenericMutation({
        type: 'OTHER',
        payload,
        endpoint: '/expense-categories',
        method: 'POST',
        tempId,
      });
      return { id: tempId, name: payload.name, color: payload.color || '#f59e0b', icon: payload.icon || null };
    }
  },

  remove: async (id: string): Promise<{ message: string }> => {
    try {
      return await apiClient.delete<{ data: { message: string } }>(`/expense-categories/${id}`).then(unwrap);
    } catch (e) {
      if (!isNetFail(e)) throw e;
      const { db } = await import('@core/lib/offline/db');
      const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');
      await db.lookups.delete(id);
      await queueGenericMutation({
        type: 'OTHER',
        payload: {},
        endpoint: `/expense-categories/${id}`,
        method: 'DELETE',
      });
      return { message: 'Queued for delete' };
    }
  },
};
