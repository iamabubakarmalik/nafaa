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
}

export interface LedgerSummary {
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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const customerLedgerApi = {
  summary: () =>
    apiClient.get<{ data: LedgerSummary }>('/customer-ledger/summary').then(unwrap),
  list: (customerId: string) =>
    apiClient
      .get<{ data: { customer: LedgerCustomer; ledgers: LedgerEntry[] } }>(
        `/customer-ledger/${customerId}`,
      )
      .then(unwrap),
  receivePayment: (customerId: string, payload: ReceivePaymentPayload) =>
    apiClient
      .post<{ data: any }>(`/customer-ledger/${customerId}/payment`, payload)
      .then(unwrap),
};
