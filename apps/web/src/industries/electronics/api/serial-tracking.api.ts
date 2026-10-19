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

export type SerialView = 'all' | 'stock' | 'sold' | 'warranty' | 'expiring' | 'problem' | 'tradein';
export type SerialSort = 'new' | 'old' | 'warranty' | 'cost';

export interface SerialClaimRef { id: string; claimNumber: string; status: WarrantyStatus; resolvedAt?: string | null }

export interface SerialPage {
  items: Array<SerialWithProduct & { claims: SerialClaimRef[] }>;
  total: number;
  page: number;
  pages: number;
  counts: Record<SerialView, number>;
  /** Purchase cost of units on the shelf. */
  shelfCost: number;
}

export interface WarrantyCheck {
  found: boolean;
  serial?: SerialWithProduct & { customer?: { id: string; name: string; phone?: string | null } | null };
  claims?: SerialClaimRef[];
  warranty?: {
    status: WarrantyStatus; type: string | null; startDate: string | null; endDate: string | null;
    isExpired: boolean; daysRemaining: number; isValid: boolean;
  };
}

export interface TradeInPayload {
  productId?: string;
  name?: string;
  brandId?: string;
  categoryId?: string;
  serialNumber: string;
  imei?: string;
  condition?: 'OPEN_BOX' | 'REFURBISHED' | 'USED' | 'DAMAGED' | 'FOR_PARTS';
  value: number;
  salePrice?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  physicalCondition?: string;
  notes?: string;
}

export const serialTrackingApi = {
  /** Paged register with counts per view (serials page). */
  page: (params: { view?: SerialView; search?: string; productId?: string; sort?: SerialSort; page?: number; limit?: number }) =>
    apiClient.get('/electronics/serial-tracking/page', { params }).then(unwrap<SerialPage>),

  /** Used unit bought from a customer: stock in, cash out of the drawer. */
  tradeIn: (data: TradeInPayload) =>
    apiClient.post('/electronics/serial-tracking/trade-in', data)
      .then(unwrap<{ number: string; serial: ElectronicsSerial; productId: string; value: number; customerId: string | null }>),

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
    apiClient.get('/electronics/serial-tracking/lookup/' + encodeURIComponent(code)).then(unwrap<ElectronicsSerial | null>),

  warrantyCheck: (code: string) =>
    apiClient.get('/electronics/serial-tracking/warranty-check/' + encodeURIComponent(code)).then(unwrap<WarrantyCheck>),

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
