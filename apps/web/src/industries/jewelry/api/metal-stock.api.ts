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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const metalStockApi = {
  addEntry: (data: any) => apiClient.post('/jewelry/metal-stock', data).then(unwrap<MetalStockEntry>),
  list: (params?: any) => apiClient.get('/jewelry/metal-stock', { params }).then(unwrap<MetalStockEntry[]>),
  balance: () => apiClient.get('/jewelry/metal-stock/balance').then(unwrap<any[]>),
  summary: (from?: string, to?: string) => apiClient.get('/jewelry/metal-stock/summary', { params: { from, to } }).then(unwrap<any[]>),
};
