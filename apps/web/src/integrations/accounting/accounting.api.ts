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

export interface TallySettings {
  mapping: AccountMapping; includeCogs: boolean; includeExpenses: boolean; companyName: string; includeMasters: boolean;
}
export interface TallyPreview {
  days: number; vouchers: number; ledgers: { name: string; group: string }[];
  totals: { sales: number; refunds: number; collections: number; expenses: number; cogs: number };
}

async function download(path: string, params: Record<string, string>, fallbackName: string) {
  const r = await apiClient.get(path, { params, responseType: 'blob' }).catch(async (e: any) => {
    const data = e?.response?.data;
    if (data instanceof Blob) { try { e.response.data = JSON.parse(await data.text()); } catch { /* jaisa hai */ } }
    throw e;
  });
  const cd = String(r.headers?.['content-disposition'] ?? '');
  const name = cd.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(r.data as Blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const tallyApi = {
  settings: () => apiClient.get('/accounting/tally').then((r) => unwrap<TallySettings>(r)),
  save: (b: Partial<TallySettings>) => apiClient.patch('/accounting/tally', b).then((r) => unwrap<TallySettings>(r)),
  preview: (from: string, to: string) => apiClient.get('/accounting/tally/preview', { params: { from, to } }).then((r) => unwrap<TallyPreview>(r)),
  download: (from: string, to: string, format: 'vouchers' | 'masters' | 'csv') =>
    download('/accounting/tally/export', { from, to, format }, `nafaa-tally-${format}.${format === 'csv' ? 'csv' : 'xml'}`),
};
