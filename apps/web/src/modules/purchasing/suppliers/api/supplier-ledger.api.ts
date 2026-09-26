import { apiClient } from '@core/api/client';

/**
 * Supplier ka khata.
 *
 * Customer ke ulat yahan balance ka matlab hai: HUM supplier ko kitna
 * DETE hain. Kharidari balance barhati hai, adaigi ghatati hai.
 */

/** Supplier ko adaigi kis zariye — golak ka hisab isi par tikta hai */
export type SupplierPaymentMethod =
  | 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

export type SupplierLedgerType =
  | 'OPENING_BALANCE' | 'PURCHASE_CREDIT' | 'PAYMENT_MADE'
  | 'PURCHASE_RETURN' | 'ADJUSTMENT';

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  shopId?: string | null;
  createdById?: string | null;
  type: SupplierLedgerType;
  amount: number;
  /** Is entry ke baad hum supplier ko kitna dete hain */
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  /** Sirf PAYMENT_MADE par — purani entriyon par null */
  paymentMethod?: SupplierPaymentMethod | null;
  entryDate: string;
  createdAt: string;
}

export interface SupplierStatement {
  supplier: {
    id: string; name: string; phone?: string | null;
    contactPerson?: string | null; address?: string | null; city?: string | null;
    outstandingDue: number; totalPurchased: number;
  };
  entries: SupplierLedgerEntry[];
  purchases: Array<{
    id: string; purchaseNumber: string; purchasedAt: string;
    subtotal: number; discount: number; total: number; paidAmount: number; status: string;
    items: Array<{ quantity: number; productId: string; product?: { name: string } | null }>;
  }>;
  totals: {
    added: number; paid: number; balance: number;
    openingBalance: number; entryCount: number; purchaseCount: number;
  };
}

export interface SupplierDebtor {
  id: string; name: string; phone?: string | null; city?: string | null;
  due: number; totalPurchased: number; paymentTerms?: string | null;
  lastPaymentAt?: string | null;
  /** Kitne din se paisa nahi diya */
  daysSincePayment: number | null;
}

export interface SupplierLedgerSummary {
  totalSuppliers: number;
  activeSuppliers: number;
  withDue: number;
  totalDue: number;
  biggestDue: number;
  /** 60 din se jinhe paisa nahi diya */
  staleCount: number;
  neverPaidCount: number;
  month: { added: number; paid: number; net: number };
  debtors: SupplierDebtor[];
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const supplierLedgerApi = {
  summary: () =>
    apiClient.get('/supplier-ledger/summary').then(unwrap<SupplierLedgerSummary>),

  statement: (supplierId: string, params?: { from?: string; to?: string }) =>
    apiClient.get(`/supplier-ledger/${supplierId}`, { params }).then(unwrap<SupplierStatement>),

  /** Purana khata — system se pehle ka dena */
  setOpeningBalance: (supplierId: string, data: { amount: number; entryDate?: string; note?: string }) =>
    apiClient.post(`/supplier-ledger/${supplierId}/opening-balance`, data).then(unwrap<any>),

  /** Udhaar par maal liya (bina purchase bill) */
  addDue: (supplierId: string, data: { amount: number; entryDate?: string; reference?: string; note?: string }) =>
    apiClient.post(`/supplier-ledger/${supplierId}/due`, data).then(unwrap<SupplierLedgerEntry>),

  /** Supplier ko paisa diya */
  recordPayment: (supplierId: string, data: {
    amount: number; entryDate?: string; reference?: string; note?: string;
    /** Cash diya to golak se nikalta hai; bank/cheque se nahi. Default CASH. */
    paymentMethod?: SupplierPaymentMethod;
  }) =>
    apiClient.post(`/supplier-ledger/${supplierId}/payment`, data).then(unwrap<SupplierLedgerEntry>),

  /** Maal wapas kiya */
  recordReturn: (supplierId: string, data: { amount: number; entryDate?: string; reference?: string; note?: string }) =>
    apiClient.post(`/supplier-ledger/${supplierId}/return`, data).then(unwrap<SupplierLedgerEntry>),

  /** Haath se durusti — musbat = dena barha, manfi = kam hua */
  adjust: (supplierId: string, data: { amount: number; entryDate?: string; note: string }) =>
    apiClient.post(`/supplier-ledger/${supplierId}/adjustment`, data).then(unwrap<SupplierLedgerEntry>),

  removeEntry: (supplierId: string, entryId: string) =>
    apiClient.delete(`/supplier-ledger/${supplierId}/entry/${entryId}`).then(unwrap<any>),
};

/* ═══════════ LABELS ═══════════ */
export const LEDGER_TYPE_META: Record<SupplierLedgerType, {
  label: string; emoji: string; cls: string; /** balance par asar */ sign: 1 | -1;
}> = {
  OPENING_BALANCE: { label: 'Purana hisab',   emoji: '📖', sign: 1,  cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/40' },
  PURCHASE_CREDIT: { label: 'Maal liya',      emoji: '📦', sign: 1,  cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40' },
  PAYMENT_MADE:    { label: 'Paisa diya',     emoji: '💸', sign: -1, cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40' },
  PURCHASE_RETURN: { label: 'Maal wapas',     emoji: '↩️', sign: -1, cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40' },
  ADJUSTMENT:      { label: 'Durusti',        emoji: '✏️', sign: 1,  cls: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/40' },
};

export const ledgerMeta = (t?: string | null) =>
  LEDGER_TYPE_META[(t ?? 'ADJUSTMENT') as SupplierLedgerType] ?? LEDGER_TYPE_META.ADJUSTMENT;

/** Ye entry balance kis taraf le gayi */
export const entryDelta = (e: { type: SupplierLedgerType; amount: number }) =>
  e.type === 'ADJUSTMENT' ? e.amount : ledgerMeta(e.type).sign * e.amount;
