import { apiClient } from '@core/api/client';

export type ExchangeType = 'OLD_GOLD_EXCHANGE' | 'OLD_SILVER_EXCHANGE' | 'BROKEN_JEWELRY'
  | 'PURE_METAL_DEPOSIT' | 'COIN_EXCHANGE' | 'RESIZING' | 'REPAIR' | 'RENOVATION' | 'MELT_AND_REMAKE';

export interface Exchange {
  id: string;
  exchangeNumber: string;
  exchangeType: ExchangeType;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerCnic?: string;
  exchangeDate: string;
  itemDescription: string;
  metalType: string;
  claimedPurity: string;
  grossWeight: number;
  testedPurity?: string;
  netWeight?: number;
  stoneWeight: number;
  fineGoldEquivalent?: number;
  ratePerGram: number;
  grossValue: number;
  deductions: number;
  netValue: number;
  meltingCharges: number;
  testingCharges: number;
  saleId?: string;
  usedAgainstOrderId?: string;
  purpose?: string;
  testingMethod?: string;
  testedBy?: string;
  witnessedBy?: string;
  photoUrls: string[];
  cnicPhotoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExchangeKind = 'buy' | 'repair' | 'repair-open' | 'all';
export interface ExchangePage {
  kind: ExchangeKind; page: number; limit: number; total: number; pages: number; items: Exchange[];
  totals: { grams: number; fine: number; value: number; deductions: number };
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const exchangesApi = {
  create: (data: any) => apiClient.post('/jewelry/exchanges', data).then(unwrap<Exchange & { paidFromDrawer?: boolean }>),
  page: (params: { kind?: ExchangeKind; search?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    apiClient.get('/jewelry/exchanges/page', { params }).then(unwrap<ExchangePage>),
  deliverRepair: (id: string, data: { charge: number; paidAmount: number; paymentMethod: string }) =>
    apiClient.post('/jewelry/exchanges/' + id + '/deliver', data).then(unwrap<Exchange>),
};
