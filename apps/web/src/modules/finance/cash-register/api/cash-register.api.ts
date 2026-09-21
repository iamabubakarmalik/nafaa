import { apiClient } from '@core/api/client';

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

  /**
   * Live hisab — sirf khule hue register par aata hai.
   *
   * `expectedBalance` pehle sirf haath se ki gayi cash in/out par
   * badalta tha; bikri us me ginti hi nahi thi. Ab backend har
   * dafa taaza hisab laga kar bhejta hai.
   */
  live?: {
    openingBalance: number;
    cashSales: number;
    cashSalesCount: number;
    cashIn: number;
    cashOut: number;
    expenses: number;
    expenseCount: number;
    returns: number;
    returnCount: number;
    /** Kharidari jis ka paisa mauqe par cash diya */
    purchases: number;
    purchaseCount: number;
    /** Supplier ko khate se di gayi adaigi */
    supplierPaid: number;
    supplierPaidCount: number;
    expected: number;
    /** Golak ke bahar ka paisa — card, wallet, udhaar */
    allSalesTotal: number;
    allSalesPaid: number;
    creditGiven: number;
    billCount: number;
    nonCashCollected: number;
    openedAt: string;
    openHours: number;
  };
}

export interface OpenRegisterPayload {
  openingBalance: number;
  shopId: string;
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
  current: (shopId?: string) =>
    apiClient.get<{ data: CashRegister | null }>('/cash-register/current', {
      params: shopId ? { shopId } : {},
    }).then(unwrap),
  open: (payload: OpenRegisterPayload) =>
    apiClient.post<{ data: CashRegister }>('/cash-register/open', payload).then(unwrap),
  transaction: (payload: CashTransactionPayload, shopId?: string) =>
    apiClient.post<{ data: CashTransaction }>('/cash-register/transaction', payload, {
      params: shopId ? { shopId } : {},
    }).then(unwrap),
  close: (payload: CloseRegisterPayload, shopId?: string) =>
    apiClient.post<{ data: CashRegister }>('/cash-register/close', payload, {
      params: shopId ? { shopId } : {},
    }).then(unwrap),
  history: (shopId?: string) =>
    apiClient.get<{ data: CashRegister[] }>('/cash-register/history', {
      params: shopId ? { shopId } : {},
    }).then(unwrap),
};
