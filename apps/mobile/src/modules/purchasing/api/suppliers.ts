/**
 * Suppliers and the supplier khata (same endpoints as the web). The
 * balance is what WE owe the supplier: purchases on credit raise it,
 * payments lower it.
 */

import { apiClient } from '@/core/api/client';
import { msg } from '@/core/i18n';

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  email?: string | null;
  cnic?: string | null;
  ntn?: string | null;
  address?: string | null;
  city?: string | null;
  area?: string | null;
  logoUrl?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  totalPurchased: number;
  outstandingDue: number;
  isActive: boolean;
  createdAt: string;
  lastPurchaseAt?: string | null;
  lastPaymentAt?: string | null;
  _count?: { purchases: number };
}

export interface SupplierDetail extends Supplier {
  _count: { purchases: number };
  stats: {
    totalPurchases: number; totalAmount: number; totalPaid: number; outstanding: number; averagePurchase: number;
    daysSinceLastPurchase: number | null; lastPurchaseDate: string | null;
  };
  trend30Days: Array<{ date: string; total: number; count: number }>;
  months12: Array<{ month: string; label: string; total: number; paid: number; count: number }>;
  ledger: {
    entryCount: number; openingBalance: number; purchaseCredit: number; paymentsMade: number; returns: number; adjustments: number;
    lastPaymentAmount: number | null; lastPaymentAt: string | null; lastPaymentRef: string | null; daysSincePayment: number | null;
  };
  priceHistory: Array<{
    productId: string; productName: string; unit: string;
    points: Array<{ date: string; purchaseNumber: string; costPrice: number; quantity: number }>;
    firstCost: number; lastCost: number; changePct: number;
  }>;
  paymentBreakdown: Array<{ paymentMethod: string; total: number; count: number }>;
  topProducts: Array<{ productId: string; product?: { id: string; name: string; unit: string }; quantity: number; total: number; orderCount: number }>;
}

export interface SuppliersResponse {
  items: Supplier[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface SuppliersSummary {
  totalSuppliers: number;
  activeSuppliers: number;
  suppliersWithDebt: number;
  totalPurchased: number;
  totalOutstanding: number;
  monthPurchases: number;
  monthCount: number;
  monthPaid: number;
  lastMonthPurchases: number;
  growthVsLastMonth: number;
  avgOrderValue: number;
  monthLedgerPaid: number;
  months12: Array<{ month: string; label: string; total: number; paid: number; count: number }>;
  dueAging: Array<{ bucket: string; amount: number; count: number }>;
  topDebtors: Array<{ id: string; name: string; phone?: string | null; city?: string | null; outstandingDue: number; totalPurchased: number; daysSincePayment: number | null; daysSincePurchase: number | null; orderCount: number }>;
  dormantSuppliers: Array<{ id: string; name: string; city?: string | null; totalPurchased: number; outstandingDue: number; daysSincePurchase: number | null }>;
  cityBreakdown: Array<{ city: string; count: number; totalPurchased: number; outstanding: number }>;
  topSuppliers: Array<{ supplierId: string; supplier?: { id: string; name: string; city?: string | null }; totalSpent: number; totalPaid: number; outstanding: number; orderCount: number }>;
}

export interface UpsertSupplierPayload {
  name: string;
  contactPerson?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  cnic?: string;
  ntn?: string;
  address?: string;
  city?: string;
  area?: string;
  logoUrl?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  paymentTerms?: string;
  notes?: string;
  isActive?: boolean;
}

export type SupplierDues = 'all' | 'due' | 'clear';
export type SupplierStatus = 'all' | 'active' | 'inactive';
export type SupplierSort = 'recent' | 'name' | 'purchased' | 'due' | 'orders';

export const suppliersApi = {
  list: (params?: { search?: string; dues?: SupplierDues; status?: SupplierStatus; city?: string; sort?: SupplierSort; page?: number; limit?: number }) =>
    apiClient.get<SuppliersResponse>('/suppliers', { params }).then((r) => r.data),
  summary: () => apiClient.get<SuppliersSummary>('/suppliers/summary').then((r) => r.data),
  getOne: (id: string) => apiClient.get<SupplierDetail>(`/suppliers/${id}`).then((r) => r.data),
  create: (payload: UpsertSupplierPayload) => apiClient.post<Supplier>('/suppliers', payload).then((r) => r.data),
  update: (id: string, payload: UpsertSupplierPayload) => apiClient.patch<Supplier>(`/suppliers/${id}`, payload).then((r) => r.data),
  remove: (id: string) => apiClient.delete<{ message: string }>(`/suppliers/${id}`).then((r) => r.data),
};

export type SupplierPaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';
export type SupplierLedgerType = 'OPENING_BALANCE' | 'PURCHASE_CREDIT' | 'PAYMENT_MADE' | 'PURCHASE_RETURN' | 'ADJUSTMENT';

export interface SupplierLedgerEntry {
  id: string;
  type: SupplierLedgerType;
  amount: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  paymentMethod?: SupplierPaymentMethod | null;
  entryDate: string;
  createdAt: string;
}

export interface SupplierStatement {
  supplier: { id: string; name: string; phone?: string | null; contactPerson?: string | null; address?: string | null; city?: string | null; outstandingDue: number; totalPurchased: number };
  entries: SupplierLedgerEntry[];
  totals: { added: number; paid: number; balance: number; openingBalance: number; entryCount: number; purchaseCount: number };
}

type Entry = { amount: number; entryDate?: string; reference?: string; note?: string };

export const supplierLedgerApi = {
  statement: (supplierId: string, params?: { from?: string; to?: string }) =>
    apiClient.get<SupplierStatement>(`/supplier-ledger/${supplierId}`, { params }).then((r) => r.data),
  setOpeningBalance: (supplierId: string, data: Omit<Entry, 'reference'>) => apiClient.post(`/supplier-ledger/${supplierId}/opening-balance`, data).then((r) => r.data),
  addDue: (supplierId: string, data: Entry) => apiClient.post(`/supplier-ledger/${supplierId}/due`, data).then((r) => r.data),
  recordPayment: (supplierId: string, data: Entry & { paymentMethod?: SupplierPaymentMethod }) => apiClient.post(`/supplier-ledger/${supplierId}/payment`, data).then((r) => r.data),
  recordReturn: (supplierId: string, data: Entry) => apiClient.post(`/supplier-ledger/${supplierId}/return`, data).then((r) => r.data),
  adjust: (supplierId: string, data: { amount: number; entryDate?: string; note: string }) => apiClient.post(`/supplier-ledger/${supplierId}/adjustment`, data).then((r) => r.data),
  removeEntry: (supplierId: string, entryId: string) => apiClient.delete(`/supplier-ledger/${supplierId}/entry/${entryId}`).then((r) => r.data),
};

/** How each khata entry reads and which way it moves the balance. Labels are raw text. */
export const LEDGER_TYPE_META: Record<SupplierLedgerType, { label: string; emoji: string; sign: 1 | -1 }> = {
  OPENING_BALANCE: { label: msg('Purana hisab'), emoji: '📖', sign: 1 },
  PURCHASE_CREDIT: { label: msg('Maal liya'), emoji: '📦', sign: 1 },
  PAYMENT_MADE: { label: msg('Paisa diya'), emoji: '💸', sign: -1 },
  PURCHASE_RETURN: { label: msg('Maal wapas'), emoji: '↩️', sign: -1 },
  ADJUSTMENT: { label: msg('Correction'), emoji: '✏️', sign: 1 },
};

export const ledgerMeta = (type?: string | null) => LEDGER_TYPE_META[(type ?? 'ADJUSTMENT') as SupplierLedgerType] ?? LEDGER_TYPE_META.ADJUSTMENT;

/** Signed change of the balance for an entry. */
export const entryDelta = (e: { type: SupplierLedgerType; amount: number }) => (e.type === 'ADJUSTMENT' ? e.amount : ledgerMeta(e.type).sign * e.amount);

/** Aging buckets the server sends as raw text (translated at render). */
msg('0-30 din'); msg('31-60 din'); msg('61-90 din'); msg('90+ din');
