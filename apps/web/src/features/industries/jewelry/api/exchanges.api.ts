import { apiClient } from '@/api/client';

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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const exchangesApi = {
  create: (data: any) => apiClient.post('/jewelry/exchanges', data).then(unwrap<Exchange>),
  list: (params?: any) => apiClient.get('/jewelry/exchanges', { params }).then(unwrap<Exchange[]>),
  summary: (from?: string, to?: string) => apiClient.get('/jewelry/exchanges/summary', { params: { from, to } }).then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/jewelry/exchanges/' + id).then(unwrap<Exchange>),
  linkToSale: (id: string, saleId: string) => apiClient.post('/jewelry/exchanges/' + id + '/link-sale', { saleId }).then(unwrap<Exchange>),
};
