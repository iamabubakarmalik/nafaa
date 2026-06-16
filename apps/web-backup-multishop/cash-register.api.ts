import { apiClient } from './client';

export type RegisterStatus = 'OPEN' | 'CLOSED';
export type CashTxType = 'OPENING' | 'SALE' | 'EXPENSE' | 'CASH_IN' | 'CASH_OUT' | 'CLOSING';

export interface CashTransaction {
  id: string;
  type: CashTxType;
  amount: number;
  reason?: string | null;
  note?: string | null;
  reference?: string | null;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  registerNumber: string;
  status: RegisterStatus;
  openingBalance: number;
  expectedBalance: number;
  closingBalance: number;
  difference: number;
  totalSales: number;
  totalCashIn: number;
  totalCashOut: number;
  totalExpenses: number;
  notes?: string | null;
  openedAt: string;
  closedAt?: string | null;
  openedBy?: { id: string; fullName: string } | null;
  closedBy?: { id: string; fullName: string } | null;
  shop?: { id: string; name: string } | null;
  transactions?: CashTransaction[];
}

export interface OpenRegisterPayload {
  openingBalance: number;
  shopId?: string;
  notes?: string;
}

export interface CloseRegisterPayload {
  closingBalance: number;
  notes?: string;
}

export interface CashTransactionPayload {
  type: 'CASH_IN' | 'CASH_OUT';
  amount: number;
  reason: string;
  note?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const cashRegisterApi = {
  current: () =>
    apiClient.get<{ data: CashRegister | null }>('/cash-register/current').then(unwrap),
  open: (payload: OpenRegisterPayload) =>
    apiClient.post<{ data: CashRegister }>('/cash-register/open', payload).then(unwrap),
  transaction: (payload: CashTransactionPayload) =>
    apiClient.post<{ data: CashTransaction }>('/cash-register/transaction', payload).then(unwrap),
  close: (payload: CloseRegisterPayload) =>
    apiClient.post<{ data: CashRegister }>('/cash-register/close', payload).then(unwrap),
  history: () =>
    apiClient.get<{ data: CashRegister[] }>('/cash-register/history').then(unwrap),
};
