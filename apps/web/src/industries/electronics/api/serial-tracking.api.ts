import { apiClient } from '@core/api/client';

export type SerialStatus = 'IN_STOCK' | 'RESERVED' | 'SOLD' | 'RETURNED' | 'DEFECTIVE' | 'RMA' | 'DAMAGED';
export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'VOID' | 'NO_WARRANTY';

export interface ElectronicsSerial {
  id: string;
  productId: string;
  serialNumber: string;
  imei?: string;
  imei2?: string;
  macAddress?: string;
  status: SerialStatus;
  purchasePrice?: number;
  purchaseDate?: string;
  supplierRef?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyStatus: WarrantyStatus;
  batteryHealthPct?: number;
  screenCondition?: string;
  physicalCondition?: string;
  functionalStatus?: string;
  soldPrice?: number;
  soldAt?: string;
  soldToCustomerId?: string;
  saleId?: string;
  invoiceNumber?: string;
  notes?: string;
  imageUrls: string[];
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const serialTrackingApi = {
  create: (data: Partial<ElectronicsSerial>) =>
    apiClient.post('/electronics/serial-tracking', data).then(unwrap<ElectronicsSerial>),

  bulkCreate: (data: { productId: string; serialNumbers: string[]; purchasePrice?: number; supplierRef?: string; warrantyStartDate?: string; warrantyEndDate?: string }) =>
    apiClient.post('/electronics/serial-tracking/bulk', data).then(unwrap<{ created: number; skipped: number }>),

  list: (params?: { productId?: string; status?: string; imei?: string; search?: string }) =>
    apiClient.get('/electronics/serial-tracking', { params }).then(unwrap<ElectronicsSerial[]>),

  lookup: (code: string) =>
    apiClient.get('/electronics/serial-tracking/lookup/' + code).then(unwrap<ElectronicsSerial | null>),

  warrantyCheck: (code: string) =>
    apiClient.get('/electronics/serial-tracking/warranty-check/' + code).then(unwrap<any>),

  getOne: (id: string) =>
    apiClient.get('/electronics/serial-tracking/' + id).then(unwrap<ElectronicsSerial>),

  update: (id: string, data: Partial<ElectronicsSerial>) =>
    apiClient.patch('/electronics/serial-tracking/' + id, data).then(unwrap<ElectronicsSerial>),

  sell: (id: string, data: { soldPrice: number; soldToCustomerId?: string; saleId?: string; invoiceNumber?: string }) =>
    apiClient.post('/electronics/serial-tracking/' + id + '/sell', data).then(unwrap<ElectronicsSerial>),

  returnSerial: (id: string, reason: string) =>
    apiClient.post('/electronics/serial-tracking/' + id + '/return', { reason }).then(unwrap<ElectronicsSerial>),

  markDefective: (id: string, reason: string) =>
    apiClient.post('/electronics/serial-tracking/' + id + '/defective', { reason }).then(unwrap<ElectronicsSerial>),

  remove: (id: string) =>
    apiClient.delete('/electronics/serial-tracking/' + id).then(unwrap),
};
