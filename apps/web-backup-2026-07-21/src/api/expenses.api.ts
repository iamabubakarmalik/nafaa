import { apiClient } from './client';
import type { PaymentMethod } from './sales.api';

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

export const expensesApi = {
  list: () => apiClient.get<{ data: Expense[] }>('/expenses').then(unwrap),
  create: (payload: CreateExpensePayload) =>
    apiClient.post<{ data: Expense }>('/expenses', payload).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/expenses/${id}`).then(unwrap),
  summary: () => apiClient.get<{ data: ExpenseSummary }>('/expenses/summary').then(unwrap),
};

export const expenseCategoriesApi = {
  list: () => apiClient.get<{ data: ExpenseCategory[] }>('/expense-categories').then(unwrap),
  create: (payload: CreateExpenseCategoryPayload) =>
    apiClient.post<{ data: ExpenseCategory }>('/expense-categories', payload).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/expense-categories/${id}`).then(unwrap),
};
