import { db, type OfflineExpense, localId, isTempId } from './db';
import { expensesApi, type Expense, type CreateExpensePayload } from '@modules/finance/expenses/api/expenses.api';
import { queueGenericMutation } from './syncEngine';

function toExpense(oe: OfflineExpense): Expense {
  const { _syncedAt, _localDirty, _localDeleted, _tempId, ...rest } = oe;
  return rest as any;
}

export const offlineExpensesApi = {
  /**
   * Expenses list — local Dexie (incl. pending) + server merged.
   */
  listMerged: async (): Promise<Expense[]> => {
    const local = (await db.expenses.toArray()).filter((e) => !e._localDeleted);
    if (navigator.onLine) {
      try {
        const server = await expensesApi.list();
        const now = Date.now();
        const serverIds = new Set(server.map((e) => e.id));
        await db.transaction('rw', db.expenses, async () => {
          for (const e of server) {
            const existing = await db.expenses.get(e.id);
            if (existing?._localDirty && !existing?._tempId) continue;
            await db.expenses.put({ ...(e as any), _syncedAt: now } as OfflineExpense);
          }
        });
        // Local temp (unsynced) + server fresh
        const tempLocal = local.filter((e) => e._tempId && !serverIds.has(e.id));
        return [...tempLocal.map(toExpense), ...server].sort(
          (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime(),
        );
      } catch {}
    }
    return local.map(toExpense).sort(
      (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime(),
    );
  },

  list: async (): Promise<Expense[]> => {
    if (navigator.onLine) {
      try {
        const server = await expensesApi.list();
        const now = Date.now();
        await db.transaction('rw', db.expenses, async () => {
          for (const e of server) {
            const existing = await db.expenses.get(e.id);
            if (existing?._localDirty && !existing?._tempId) continue;
            await db.expenses.put({ ...(e as any), _syncedAt: now } as OfflineExpense);
          }
        });
        return server;
      } catch {}
    }
    const local = (await db.expenses.toArray()).filter((e) => !e._localDeleted);
    return local.map(toExpense);
  },

  create: async (payload: CreateExpensePayload): Promise<Expense> => {
    if (navigator.onLine) {
      try {
        const created = await expensesApi.create(payload);
        await db.expenses.put({ ...(created as any), _syncedAt: Date.now() } as OfflineExpense);
        return created;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status < 500 && status !== 408) throw err;
      }
    }
    const tempId = localId('temp_exp');
    const now = new Date().toISOString();
    const local: OfflineExpense = {
      id: tempId,
      expenseNumber: `LOCAL-${tempId.slice(-6).toUpperCase()}`,
      title: payload.title,
      description: payload.description || null,
      amount: Number(payload.amount) || 0,
      paymentMethod: payload.paymentMethod,
      status: 'PAID',
      expenseDate: now,
      categoryId: payload.categoryId || null,
      category: null,
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
    return toExpense(local);
  },

  remove: async (id: string): Promise<void> => {
    const existing = await db.expenses.get(id);
    if (!existing) return;

    if (isTempId(id) && existing._tempId) {
      await db.expenses.delete(id);
      const pendingCreate = await db.syncQueue.where('tempId').equals(id).first();
      if (pendingCreate) await db.syncQueue.delete(pendingCreate.id);
      return;
    }

    await db.expenses.update(id, { _localDeleted: true, _localDirty: true });

    if (navigator.onLine) {
      try {
        await expensesApi.remove(id);
        await db.expenses.delete(id);
        return;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status < 500 && status !== 408) {
          await db.expenses.update(id, { _localDeleted: false, _localDirty: false });
          throw err;
        }
      }
    }

    await queueGenericMutation({
      type: 'DELETE_EXPENSE',
      payload: {},
      endpoint: `/expenses/${id}`,
      method: 'DELETE',
    });
  },
};
