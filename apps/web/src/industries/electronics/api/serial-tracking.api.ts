import { apiClient } from '@core/api/client';

/**
 * Ye dono Prisma ke enums se BILKUL match karte hain.
 * Pehle yahan 'RMA' aur 'DAMAGED' likhe the jo database me hain hi nahi
 * (filter lagate hi khali list aati thi), aur IN_TRANSIT / IN_REPAIR / LOST
 * gayab the — is wajah se un units ka badge undefined ho kar page tor deta tha.
 */
export type SerialStatus =
  | 'IN_STOCK' | 'IN_TRANSIT' | 'SOLD' | 'RESERVED'
  | 'RETURNED' | 'IN_REPAIR' | 'DEFECTIVE' | 'LOST';

export type WarrantyStatus =
  | 'ACTIVE' | 'EXPIRED' | 'VOID' | 'CLAIMED' | 'IN_REPAIR' | 'NO_WARRANTY';

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

/** List se aane wala serial — sath me product ka naam bhi */
export interface SerialWithProduct extends ElectronicsSerial {
  product?: {
    id: string; name: string; sku?: string | null;
    unit?: string; price?: number; costPrice?: number;
    images?: { id: string; url: string }[];
  } | null;
}

export const serialTrackingApi = {
  create: (data: Partial<ElectronicsSerial>) =>
    apiClient.post('/electronics/serial-tracking', data).then(unwrap<ElectronicsSerial>),

  /**
   * Bulk serials. `entries` bhejo to IMEI/MAC bhi usi call me set ho jate hain —
   * pehle har serial par alag search+update chalti thi (N+1).
   */
  bulkCreate: (data: {
    productId: string;
    shopId?: string;
    serialNumbers?: string[];
    entries?: { serialNumber: string; imei?: string; imei2?: string; macAddress?: string }[];
    purchasePrice?: number;
    supplierRef?: string;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
  }) =>
    apiClient.post('/electronics/serial-tracking/bulk', data)
      .then(unwrap<{ created: number; skipped: number; duplicatesInRequest: number }>),

  list: (params?: { productId?: string; status?: string; imei?: string; search?: string; shopId?: string }) =>
    apiClient.get('/electronics/serial-tracking', { params }).then(unwrap<SerialWithProduct[]>),

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
