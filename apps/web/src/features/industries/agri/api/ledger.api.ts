import { apiClient } from '@/api/client';

export interface LedgerEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  entryType: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
  farmerId: string;
  saleId?: string;
  paymentId?: string;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const ledgerApi = {
  addEntry: (data: any) => apiClient.post('/agri/ledger', data).then(unwrap<LedgerEntry>),
  byFarmer: (farmerId: string, params?: { from?: string; to?: string }) =>
    apiClient.get('/agri/ledger/by-farmer/' + farmerId, { params }).then(unwrap<LedgerEntry[]>),
  summary: (farmerId: string) => apiClient.get('/agri/ledger/summary/' + farmerId).then(unwrap<any>),
};
