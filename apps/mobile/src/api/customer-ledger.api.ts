import { apiClient } from './client';

export type LedgerType =
  | 'SALE_CREDIT'
  | 'PAYMENT_RECEIVED'
  | 'ADJUSTMENT'
  | 'OPENING_BALANCE';

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  amount: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  createdBy?: { id: string; fullName: string } | null;
}

export interface LedgerCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  balance: number;
  creditLimit: number;
  isVip?: boolean;
}

export interface KhataSummary {
  totalOutstanding: number;
  totalCustomers: number;
  customersWithCredit: number;
  topDebtors: Array<{
    id: string;
    name: string;
    phone?: string | null;
    balance: number;
    creditLimit: number;
  }>;
}

export interface ReceivePaymentPayload {
  amount: number;
  reference?: string;
  note?: string;
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

export const customerLedgerApi = {
  summary: (): Promise<KhataSummary> =>
    apiClient.get('/customer-ledger/summary').then((r) => unwrapOne<KhataSummary>(r)),

  list: (customerId: string): Promise<{ customer: LedgerCustomer; ledgers: LedgerEntry[] }> =>
    apiClient
      .get(`/customer-ledger/${customerId}`)
      .then((r) => unwrapOne<{ customer: LedgerCustomer; ledgers: LedgerEntry[] }>(r)),

  // Backward-compat alias
  customerLedger: (customerId: string): Promise<{ customer: LedgerCustomer; entries: LedgerEntry[] }> =>
    apiClient
      .get(`/customer-ledger/${customerId}`)
      .then((r) => {
        const data = unwrapOne<{ customer: LedgerCustomer; ledgers?: LedgerEntry[]; entries?: LedgerEntry[] }>(r);
        return {
          customer: data.customer,
          entries: data.ledgers || data.entries || [],
        };
      }),

  receivePayment: (customerId: string, payload: ReceivePaymentPayload): Promise<any> =>
    apiClient
      .post(`/customer-ledger/${customerId}/payment`, payload)
      .then((r) => unwrapOne<any>(r)),

  recordPayment: (customerId: string, payload: ReceivePaymentPayload): Promise<any> =>
    apiClient
      .post(`/customer-ledger/${customerId}/payment`, payload)
      .then((r) => unwrapOne<any>(r)),
};
