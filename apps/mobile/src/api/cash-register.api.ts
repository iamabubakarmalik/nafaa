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

export const cashRegisterApi = {
  current: (): Promise<CashRegister | null> =>
    apiClient.get('/cash-register/current').then((r) => unwrapOne<CashRegister | null>(r)),
  open: (payload: OpenRegisterPayload): Promise<CashRegister> =>
    apiClient.post('/cash-register/open', payload).then((r) => unwrapOne<CashRegister>(r)),
  transaction: (payload: CashTransactionPayload): Promise<CashTransaction> =>
    apiClient.post('/cash-register/transaction', payload).then((r) => unwrapOne<CashTransaction>(r)),
  close: (payload: CloseRegisterPayload): Promise<CashRegister> =>
    apiClient.post('/cash-register/close', payload).then((r) => unwrapOne<CashRegister>(r)),
  history: (): Promise<CashRegister[]> =>
    apiClient.get('/cash-register/history').then((r) => unwrapArr<CashRegister>(r)),
};
