import { apiClient } from './client';

export interface LedgerEntry {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  createdBy?: { id: string; fullName: string } | null;
}

export interface KhataSummary {
  totalOutstanding?: number;
  customersWithCredit?: number;
  totalCustomers: number;
  totalUdhaar: number;
  topDebtors: Array<{
    id: string;
    name: string;
    phone?: string | null;
    balance: number;
    creditLimit: number;
  }>;
}

export interface PaymentPayload {
  amount: number;
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

export const customerLedgerApi = {
  summary: (): Promise<KhataSummary> =>
    apiClient.get('/customer-ledger/summary').then((r) => unwrapOne<KhataSummary>(r)),
  customerLedger: (customerId: string): Promise<{ customer: any; entries: LedgerEntry[] }> =>
    apiClient
      .get(`/customer-ledger/${customerId}`)
      .then((r) => unwrapOne<{ customer: any; entries: LedgerEntry[] }>(r)),
  receivePayment: (customerId: string, payload: PaymentPayload): Promise<LedgerEntry> =>
    apiClient
      .post(`/customer-ledger/${customerId}/payment`, payload)
      .then((r) => unwrapOne<LedgerEntry>(r)),
  recordPayment: (customerId: string, payload: PaymentPayload): Promise<LedgerEntry> =>
    apiClient
      .post(`/customer-ledger/${customerId}/payment`, payload)
      .then((r) => unwrapOne<LedgerEntry>(r)),
};
