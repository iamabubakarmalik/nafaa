import { apiClient } from '@core/api/client';

export type ExpiryBucket = 'expired' | '30' | '90' | '180' | 'all';
export type ExpirySort = 'soon' | 'value' | 'name';

export interface ExpiryRow {
  id: string;
  batchNumber: string;
  expiryDate: string;
  manufactureDate: string | null;
  daysLeft: number;
  quantity: number;
  unitCost: number;
  value: number;
  saleValue: number;
  notes: string | null;
  shop: { id: string; name: string } | null;
  product: { id: string; name: string; sku: string | null; barcode: string | null; unit: string; price: number; costPrice: number; isActive: boolean; image: string | null };
  medicine: { isNarcotic: boolean; requiresColdChain: boolean; requiresPrescription: boolean; dosageForm: string | null; manufacturer: string | null } | null;
  generic: string;
}

export interface ExpiryTotals { batches: number; qty: number; cost: number; sale: number }

export interface ExpiryPage {
  items: ExpiryRow[];
  total: number;
  page: number;
  limit: number;
  totals: Record<'expired' | 'd30' | 'd90' | 'd180', ExpiryTotals>;
}

/** Received purchase line a batch came from, with what can still go back. */
export interface BatchSourceLine {
  itemId: string;
  purchaseId: string;
  purchaseNumber: string;
  purchasedAt: string;
  supplier: { id: string; name: string; phone: string | null };
  unitName: string | null;
  conversionRate: number;
  unitCost: number;
  returnableBase: number;
  returnableUnits: number;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const expiryApi = {
  list: (params: { bucket?: ExpiryBucket; search?: string; sort?: ExpirySort; page?: number; limit?: number }) =>
    apiClient.get('/pharmacy/expiry', { params }).then(unwrap<ExpiryPage>),
  source: (batchId: string) =>
    apiClient.get('/pharmacy/expiry/' + batchId + '/source').then(unwrap<{ batch: { id: string; batchNumber: string; quantity: number }; lines: BatchSourceLine[] }>),
};
