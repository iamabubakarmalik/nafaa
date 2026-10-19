import { apiClient } from '@core/api/client';

export interface MetalStockEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  entryType: string;
  metalType: string;
  purity: string;
  grams: number;
  balanceGrams: number;
  ratePerGram?: number;
  totalValue?: number;
  source?: string;
  reference?: string;
  karigarId?: string;
  saleId?: string;
  exchangeId?: string;
  notes?: string;
  createdAt: string;
}

export interface MetalBalance { metalType: string; purity: string; balanceGrams: number; lastEntryDate: string | null }
export interface MetalStockPage { page: number; limit: number; total: number; pages: number; items: MetalStockEntry[]; totals: { in: number; out: number } }

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const metalStockApi = {
  addEntry: (data: any) => apiClient.post('/jewelry/metal-stock', data).then(unwrap<MetalStockEntry>),
  page: (params: { metalType?: string; purity?: string; entryType?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/jewelry/metal-stock/page', { params }).then(unwrap<MetalStockPage>),
  balance: () => apiClient.get('/jewelry/metal-stock/balance').then(unwrap<MetalBalance[]>),
};
