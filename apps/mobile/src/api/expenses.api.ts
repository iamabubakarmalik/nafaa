import { apiClient } from './client';
import type { PaymentMethod } from './sales.api';

export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  title: string;
  description?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  status: 'PAID' | 'PENDING';
  expenseDate: string;
  category?: ExpenseCategory | null;
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

export interface CreateExpensePayload {
  title: string;
  description?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  categoryId?: string;
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const expensesApi = {
  list: (): Promise<Expense[]> =>
    apiClient.get('/expenses').then((r) => unwrapArr<Expense>(r)),
  summary: (): Promise<ExpenseSummary> =>
    apiClient.get('/expenses/summary').then((r) => unwrapOne<ExpenseSummary>(r)),
  create: (payload: CreateExpensePayload): Promise<Expense> =>
    apiClient.post('/expenses', payload).then((r) => unwrapOne<Expense>(r)),
  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/expenses/${id}`).then((r) => unwrapOne<{ message: string }>(r)),
};

export const expenseCategoriesApi = {
  list: (): Promise<ExpenseCategory[]> =>
    apiClient.get('/expense-categories').then((r) => unwrapArr<ExpenseCategory>(r)),
  create: (payload: { name: string; color?: string }): Promise<ExpenseCategory> =>
    apiClient.post('/expense-categories', payload).then((r) => unwrapOne<ExpenseCategory>(r)),
  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/expense-categories/${id}`).then((r) => unwrapOne<{ message: string }>(r)),
};
