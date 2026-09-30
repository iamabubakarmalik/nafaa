import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type PayMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';
export interface AccountMapping {
  sales?: string | null; discounts?: string | null; returns?: string | null; receivable?: string | null;
  cogs?: string | null; inventory?: string | null; expenseDefault?: string | null;
  methods?: Partial<Record<PayMethod, string | null>>;
  expenseByCategory?: Record<string, string | null>;
  collectionMethod?: PayMethod;
}
export interface SyncRecord { day: string; status: 'SUCCESS' | 'FAILED' | 'SKIPPED'; journalId?: string | null; error?: string | null; at: string; totals?: any }
export interface AccountingStatus {
  providers: { code: string; name: string; configured: boolean }[];
  connected: null | {
    provider: string; name: string; companyName: string | null; currency: string | null; connectedAt: string;
    mapping: AccountMapping; includeCogs: boolean; includeExpenses: boolean; autoSync: boolean; lastError: string | null; history: SyncRecord[];
  };
}
export interface AcctAccount { id: string; name: string; code?: string | null; type: string }
export interface JournalPreview {
  lines: { accountId: string; side: 'debit' | 'credit'; amount: number; description: string }[];
  totals: { sales: number; discount: number; credit: number; refunds: number; collections: number; cogs: number; expenses: number; bills: number };
  missing: string[];
}

export const accountingApi = {
  status: () => apiClient.get('/accounting').then((r) => unwrap<AccountingStatus>(r)),
  start: (provider: string) => apiClient.post(`/accounting/${provider}/start`, { returnOrigin: window.location.origin }).then((r) => unwrap<{ authUrl: string }>(r)),
  disconnect: () => apiClient.delete('/accounting').then((r) => unwrap<{ ok: true }>(r)),
  accounts: () => apiClient.get('/accounting/accounts').then((r) => unwrap<AcctAccount[]>(r)),
  settings: (body: { mapping?: AccountMapping; includeCogs?: boolean; includeExpenses?: boolean; autoSync?: boolean }) =>
    apiClient.patch('/accounting/settings', body).then((r) => unwrap<{ ok: true }>(r)),
  preview: (day: string) => apiClient.get('/accounting/preview', { params: { day } }).then((r) => unwrap<JournalPreview>(r)),
  sync: (day: string, force = false) => apiClient.post('/accounting/sync', { day, force }).then((r) => unwrap<SyncRecord>(r)),
};
