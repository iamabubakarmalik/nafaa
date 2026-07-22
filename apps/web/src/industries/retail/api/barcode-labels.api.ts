import { apiClient } from '@core/api/client';

export interface BarcodeLabelItem {
  productId: string;
  variantId?: string;
  unitId?: string;
  quantity: number;
  customPrice?: number;
  product?: any;
  unit?: any;
}

export interface BarcodeLabelBatch {
  id: string;
  name: string;
  layout: string;
  paperSize: string;
  includePrice: boolean;
  includeName: boolean;
  includeShop: boolean;
  includeMrp: boolean;
  fontFamily: string;
  items: BarcodeLabelItem[];
  enrichedItems?: BarcodeLabelItem[];
  totalLabels: number;
  printedAt?: string;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const barcodeLabelsApi = {
  create: (data: Partial<BarcodeLabelBatch>) =>
    apiClient.post('/retail/barcode-labels', data).then(unwrap<BarcodeLabelBatch>),

  list: () =>
    apiClient.get('/retail/barcode-labels').then(unwrap<BarcodeLabelBatch[]>),

  getOne: (id: string) =>
    apiClient.get('/retail/barcode-labels/' + id).then(unwrap<BarcodeLabelBatch>),

  markPrinted: (id: string) =>
    apiClient.post('/retail/barcode-labels/' + id + '/mark-printed').then(unwrap<BarcodeLabelBatch>),

  remove: (id: string) =>
    apiClient.delete('/retail/barcode-labels/' + id).then(unwrap),
};
