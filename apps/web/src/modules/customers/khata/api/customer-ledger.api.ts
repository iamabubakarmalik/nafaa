import { apiClient } from '@core/api/client';

export type LedgerType =
  | 'SALE_CREDIT'
  | 'PAYMENT_RECEIVED'
  | 'ADJUSTMENT'
  | 'OPENING_BALANCE';

/** Kis branch ne ye entry lagayi */
export interface LedgerShop {
  id: string;
  name: string;
  isMain?: boolean;
}

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  amount: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  createdBy?: { id: string; fullName: string } | null;
  shop?: LedgerShop | null;
}

export interface LedgerCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  balance: number;
  creditLimit: number;
}

export interface Debtor {
  id: string;
  name: string;
  phone?: string | null;
  balance: number;
  creditLimit: number;
  totalSpent?: number;
  isVip?: boolean;
  updatedAt?: string;
  /** Sirf staleDebtors par aata hai */
  daysSinceActivity?: number;
  /**
   * Jab ek shop select ho: `balance` usi shop ka hissa hai aur
   * `totalBalance` sab branches ka mila hua. All Shops par dono barabar.
   */
  totalBalance?: number;
}

export interface LedgerActivity {
  id: string;
  type: LedgerType;
  amount: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  customer?: { id: string; name: string; phone?: string | null } | null;
  createdBy?: { id: string; fullName: string } | null;
  shop?: LedgerShop | null;
}

export interface LedgerSummary {
  totalOutstanding: number;
  totalCustomers: number;
  customersWithCredit: number;
  /** Jin customers ne advance de rakha hai (minus balance) */
  advance: { amount: number; count: number };
  thisMonth: { udhaar: number; wasooli: number };
  overLimitCount: number;
  staleCount: number;
  /** 30+ din se koi harkat nahi */
  staleDebtors: Debtor[];
  /** Poori list — pehle sirf 20 aate the */
  topDebtors: Debtor[];
  recentActivity: LedgerActivity[];
  /** true = sab branches ka mila hua view */
  isAllShops?: boolean;
}

export interface LedgerDetail {
  customer: LedgerCustomer;
  ledgers: LedgerEntry[];
  /** Jo is branch par baqi hai */
  shopBalance: number;
  /** Jo sab branches milakar baqi hai */
  totalBalance: number;
  isAllShops: boolean;
}

export interface ReceivePaymentPayload {
  amount: number;
  reference?: string;
  note?: string;
}

export interface AddUdhaarPayload {
  amount: number;
  reference?: string;
  note?: string;
}

export interface OpeningBalancePayload {
  balance: number;
  note?: string;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const customerLedgerApi = {
  summary: () =>
    apiClient.get<{ data: LedgerSummary }>('/customer-ledger/summary').then(unwrap),
  list: (customerId: string) =>
    apiClient
      .get<{ data: LedgerDetail }>(`/customer-ledger/${customerId}`)
      .then(unwrap),
  receivePayment: (customerId: string, payload: ReceivePaymentPayload) =>
    apiClient
      .post<{ data: any }>(`/customer-ledger/${customerId}/payment`, payload)
      .then(unwrap),
  // 🤝 Quick Udhaar — bina sale ke
  addUdhaar: (customerId: string, payload: AddUdhaarPayload) =>
    apiClient
      .post<{ data: any }>(`/customer-ledger/${customerId}/udhaar`, payload)
      .then(unwrap),

  /** Copy se software par aate waqt purana baqi set karna */
  setOpeningBalance: (customerId: string, payload: OpeningBalancePayload) =>
    apiClient
      .post<{ data: any }>(`/customer-ledger/${customerId}/opening-balance`, payload)
      .then(unwrap),
};
