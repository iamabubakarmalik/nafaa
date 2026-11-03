/** Expenses and other income: the paged record, headline numbers, analytics, and record / edit / pay / delete. */

import { apiClient } from '@/core/api/client';

export type ExpenseStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type PaymentMethodCode = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

export interface ExpenseCategory { id: string; name: string; color: string; icon?: string | null; _count?: { expenses: number } }

export interface Expense {
  id: string;
  expenseNumber: string;
  title: string;
  description?: string | null;
  amount: number;
  paymentMethod: string;
  status: ExpenseStatus;
  expenseDate: string;
  attachmentUrl?: string | null;
  categoryId?: string | null;
  category?: ExpenseCategory | null;
  shop?: { id: string; name: string } | null;
  createdBy?: { id: string; fullName: string } | null;
}

export interface CreateExpensePayload {
  title: string;
  description?: string;
  amount: number;
  categoryId?: string;
  paymentMethod: string;
  expenseDate?: string;
  attachmentUrl?: string;
  status?: ExpenseStatus;
  shopId?: string;
}
export type UpdateExpensePayload = Partial<Omit<CreateExpensePayload, 'shopId'>>;

export interface ExpenseFilter {
  from?: string; to?: string; categoryId?: string; paymentMethod?: string; shopId?: string; createdById?: string; search?: string;
}
export interface ExpenseQuery extends ExpenseFilter { status?: ExpenseStatus; sort?: 'recent' | 'amount'; page?: number; limit?: number }

export interface ExpensePage {
  items: Expense[]; total: number; page: number; pages: number;
  totals: { amount: number; paid: number; pending: number; cancelled: number; paidCount: number; pendingCount: number; cancelledCount: number };
}

export interface ExpenseOverview {
  today: { amount: number; count: number };
  month: { amount: number; count: number };
  lastMonth: { toDate: number; full: number };
  change: number | null;
  topCategory: { id: string; name: string; color: string; icon: string | null; amount: number; count: number; share: number } | null;
  pending: { count: number; amount: number; oldest: string | null };
  register: { open: true; registerNumber: string; openedAt: string; cashExpenses: number; count: number } | { open: false } | null;
  people: Array<{ id: string; fullName: string }>;
}

export interface ExpenseBucket { key: string; label: string; amount: number; count: number; color?: string; icon?: string | null }

export interface ExpenseAnalytics {
  from: string; to: string;
  totals: { amount: number; count: number; pending: number; pendingCount: number; perDay: number; days: number; previous: number; change: number | null; biggest: { title: string; amount: number; date: string } | null };
  byCategory: ExpenseBucket[];
  byDay: Array<{ key: string; amount: number; count: number }>;
  byMonth: Array<{ key: string; amount: number }>;
  byBranch: ExpenseBucket[];
  byMethod: ExpenseBucket[];
  byPerson: ExpenseBucket[];
  topPayees: ExpenseBucket[];
}

export interface RepeatingExpense {
  key: string; title: string;
  category: { id: string; name: string; color: string; icon: string | null } | null;
  paymentMethod: string; months: number; lastAmount: number; average: number; lastDate: string; usualDay: number;
  thisMonth: { amount: number; count: number; pending: number };
  due: boolean;
}
export interface RepeatingExpenses { month: string; items: RepeatingExpense[]; due: number; dueAmount: number }

const d = <T,>(r: { data: T }) => r.data;

export const expensesApi = {
  page: (q: ExpenseQuery) => apiClient.get<ExpensePage>('/expenses/list', { params: q }).then(d),
  overview: (shopId?: string) => apiClient.get<ExpenseOverview>('/expenses/overview', { params: shopId ? { shopId } : {} }).then(d),
  analytics: (q: ExpenseFilter) => apiClient.get<ExpenseAnalytics>('/expenses/analytics', { params: q }).then(d),
  repeating: (shopId?: string) => apiClient.get<RepeatingExpenses>('/expenses/repeating', { params: shopId ? { shopId } : {} }).then(d),
  create: (p: CreateExpensePayload) => apiClient.post<Expense>('/expenses', p).then(d),
  update: (id: string, p: UpdateExpensePayload) => apiClient.patch<Expense>(`/expenses/${id}`, p).then(d),
  pay: (id: string, paymentMethod?: string) => apiClient.post<Expense>(`/expenses/${id}/pay`, paymentMethod ? { paymentMethod } : {}).then(d),
  remove: (id: string) => apiClient.delete<{ message: string }>(`/expenses/${id}`).then(d),
};

export const expenseCategoriesApi = {
  list: () => apiClient.get<ExpenseCategory[]>('/expense-categories').then(d),
  create: (p: { name: string; color?: string; icon?: string }) => apiClient.post<ExpenseCategory>('/expense-categories', p).then(d),
  update: (id: string, p: Partial<{ name: string; color: string; icon: string }>) => apiClient.patch<ExpenseCategory>(`/expense-categories/${id}`, p).then(d),
  remove: (id: string) => apiClient.delete<{ message: string }>(`/expense-categories/${id}`).then(d),
};

/* ───────── other income ───────── */

export type IncomeCategoryCode = 'COMPANY_INCENTIVE' | 'SCHEME_CLAIM' | 'COMMISSION' | 'RENT' | 'INTEREST' | 'OTHER' | 'CUSTOM';
export type IncomeReceivedVia = 'CASH_DRAWER' | 'ACCOUNT' | 'SUPPLIER_KHATA';

export interface IncomeCustomCategory { id: string; name: string; color: string; isActive?: boolean }

export interface Income {
  id: string; incomeNumber: string; title: string; amount: number; category: IncomeCategoryCode; categoryId: string | null;
  incomeDate: string; supplierId: string | null; receivedVia: IncomeReceivedVia; moneyAccountId: string | null; note: string | null;
  repeatMonthly: boolean; shop?: { id: string; name: string } | null; supplier?: { id: string; name: string } | null;
  customCategory?: IncomeCustomCategory | null; createdBy?: { id: string; fullName: string } | null;
}

export interface IncomePayload {
  title: string; amount: number; category: IncomeCategoryCode; categoryId?: string | null; incomeDate?: string;
  supplierId?: string | null; receivedVia: IncomeReceivedVia; moneyAccountId?: string | null; note?: string | null;
  repeatMonthly?: boolean; shopId?: string;
}

export interface IncomeQuery { from?: string; to?: string; category?: string; supplierId?: string; receivedVia?: IncomeReceivedVia; shopId?: string; search?: string; page?: number; limit?: number }

export interface IncomePage {
  items: Income[]; total: number; page: number; pages: number;
  totals: { amount: number; count: number };
  byCategory: Array<{ key: string; label: string; color: string | null; amount: number; count: number }>;
}

export interface IncomeOverview {
  month: { key: string; amount: number; count: number };
  lastMonth: { amount: number };
  months: Array<{ key: string; amount: number; count: number }>;
  due: Income[];
  categories: Array<{ key: string; label: string }>;
}

export const incomeApi = {
  page: (q: IncomeQuery) => apiClient.get<IncomePage>('/income/list', { params: q }).then(d),
  overview: (shopId?: string) => apiClient.get<IncomeOverview>('/income/overview', { params: shopId ? { shopId } : {} }).then(d),
  create: (b: IncomePayload) => apiClient.post<Income>('/income', b).then(d),
  update: (id: string, b: Partial<Omit<IncomePayload, 'shopId'>>) => apiClient.patch<Income>(`/income/${id}`, b).then(d),
  remove: (id: string) => apiClient.delete<{ message: string }>(`/income/${id}`).then(d),
};

export const incomeCategoriesApi = {
  list: () => apiClient.get<IncomeCustomCategory[]>('/income/categories').then(d),
  create: (b: { name: string; color?: string }) => apiClient.post<IncomeCustomCategory>('/income/categories', b).then(d),
  update: (id: string, b: { name: string; color?: string; isActive?: boolean }) => apiClient.patch<IncomeCustomCategory>(`/income/categories/${id}`, b).then(d),
  remove: (id: string) => apiClient.delete<{ message: string }>(`/income/categories/${id}`).then(d),
};
