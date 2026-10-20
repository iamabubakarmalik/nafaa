import { apiClient } from '@core/api/client';

export type ApplianceInstallationStatus =
  | 'PENDING' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'FAILED';

export interface ApplianceSerial {
  id: string;
  productId: string;
  /** Branch the unit sits in; empty for units entered before branches were tracked. */
  shopId?: string | null;
  shopName?: string | null;
  serialNumber: string;
  modelNumber?: string;
  batchNumber?: string;
  manufactureDate?: string;
  status: string;
  purchasePrice?: number;
  purchaseDate?: string;
  supplierRef?: string;
  soldPrice?: number;
  soldAt?: string;
  soldToCustomerId?: string;
  customerName?: string;
  customerPhone?: string;
  saleId?: string;
  invoiceNumber?: string;
  deliveryAddress?: string;
  deliveredAt?: string;
  deliveredBy?: string;
  installationRequired: boolean;
  installationStatus: ApplianceInstallationStatus;
  installationScheduledFor?: string;
  installedAt?: string;
  installedByTechnicianId?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  compressorWarrantyEndDate?: string;
  motorWarrantyEndDate?: string;
  /** End of the shop's own warranty (from the warranty start and the product's shop months). */
  shopWarrantyEndDate?: string | null;
  notes?: string;
  imageUrls: string[];
  product?: {
    id: string; name: string; sku: string | null; price: number; costPrice: number;
    image: string | null; unit: string;
    categoryType: string | null; brand: string | null; modelNumber: string | null;
    capacity: string | null; energyRating: string | null;
    warrantyMonths: number | null;
    compressorWarrantyMonths: number | null;
    motorWarrantyMonths: number | null;
    shopWarrantyMonths: number | null;
    requiresInstallation: boolean;
    installationCharge: number;
  } | null;
  /** Company warranty (main, compressor, motor) and the shop's own; the one ending first is shown on lists. */
  warranty?: {
    mainDaysLeft: number | null;
    compressorDaysLeft: number | null;
    motorDaysLeft: number | null;
    shopDaysLeft: number | null;
    isUnderWarranty: boolean;
    soonestKind: string | null;
    soonestDays: number | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApplianceSerialDetail extends ApplianceSerial {
  installations: Array<{
    id: string; installationNumber: string; serviceType: string; status: string;
    scheduledDate?: string; completedAt?: string; technicianName?: string; totalCharge: number;
  }>;
  services: Array<{
    id: string; requestNumber: string; serviceType: string; status: string;
    reportedIssue: string; issueCategory?: string; workDone?: string;
    requestedAt: string; completedAt?: string; technicianName?: string;
    totalCharge: number; coveredUnderWarranty: boolean;
  }>;
  /** Is unit par ab tak kitna kharcha aaya */
  serviceCost: number;
}

export interface SerialWarrantyCheck {
  found: boolean;
  serial?: ApplianceSerial;
  warranty?: {
    isValid: boolean;
    endDate: string | null;
    daysRemaining: number;
    compressorValid: boolean;
    compressorEndDate: string | null;
    compressorDaysRemaining: number | null;
    motorValid: boolean;
    motorEndDate: string | null;
    motorDaysRemaining: number | null;
    shopValid: boolean;
    shopEndDate: string | null;
    shopDaysRemaining: number | null;
    soonestKind: string | null;
    soonestDays: number | null;
  };
  amc?: {
    id: string; contractNumber: string; amcType: string; expiryDate: string;
    freeVisitsAllowed: number; freeVisitsUsed: number; visitsLeft: number;
    laborCovered: boolean; freePartsAllowed: boolean; gasRefillCovered: boolean;
  } | null;
}

export interface SerialSummary {
  total: number;
  byStatus: Record<string, number>;
  inStock: { units: number; value: number };
  sold: { units: number; revenue: number; cost: number; profit: number };
  installation: Record<string, number> & { pending: number; completed: number };
  warrantyExpiringSoon: number;
}

export interface Paged<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** An in-stock unit the counter can sell. */
export interface CounterUnit { id: string; productId: string; serialNumber: string; modelNumber?: string | null; batchNumber?: string | null; purchaseDate?: string | null; createdAt: string }

/** Branches and recently received stock transfers, for putting units in a branch. */
export interface SerialBranches {
  shops: Array<{ id: string; name: string; isMain: boolean }>;
  transfers: Array<{
    id: string; transferNumber: string; fromShopId: string; toShopId: string; receivedAt: string;
    fromShop: { name: string }; toShop: { name: string };
    items: Array<{ productId: string; receivedQty: number }>;
  }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const applianceSerialApi = {
  create: (data: Partial<ApplianceSerial>) =>
    apiClient.post('/appliances/serial-tracking', data).then(unwrap<ApplianceSerial>),
  /** Aik shipment ke saare serial ek sath — 20 AC ek ek kar ke nahi */
  bulkCreate: (data: {
    productId: string; serialNumbers: string[];
    modelNumber?: string; batchNumber?: string;
    purchasePrice?: number; purchaseDate?: string; supplierRef?: string; shopId?: string;
  }) => apiClient.post('/appliances/serial-tracking/bulk', data)
    .then(unwrap<{ created: number; skipped: number; skippedSerials: string[]; message: string }>),
  list: (params?: {
    productId?: string; status?: string; installationStatus?: string;
    warranty?: 'active' | 'expiring' | 'expired';
    search?: string; page?: number; limit?: number;
  }) => apiClient.get('/appliances/serial-tracking', { params }).then(unwrap<Paged<ApplianceSerial>>),
  summary: () =>
    apiClient.get('/appliances/serial-tracking/summary').then(unwrap<SerialSummary>),
  lookup: (code: string) =>
    apiClient.get('/appliances/serial-tracking/lookup/' + code).then(unwrap<ApplianceSerial | null>),
  warrantyCheck: (code: string) =>
    apiClient.get('/appliances/serial-tracking/warranty-check/' + code).then(unwrap<SerialWarrantyCheck>),
  getOne: (id: string) =>
    apiClient.get('/appliances/serial-tracking/' + id).then(unwrap<ApplianceSerialDetail>),
  update: (id: string, data: Partial<ApplianceSerial>) =>
    apiClient.patch('/appliances/serial-tracking/' + id, data).then(unwrap<ApplianceSerial>),
  remove: (id: string) =>
    apiClient.delete('/appliances/serial-tracking/' + id).then(unwrap<{ message: string }>),
  /** In-stock units this counter's branch can sell (one product, or all). */
  counter: (productId?: string) =>
    apiClient.get('/appliances/serial-tracking/counter', { params: productId ? { productId } : undefined }).then(unwrap<CounterUnit[]>),
  /** A serial scanned at the counter; `otherBranch` names the branch when it sits elsewhere. */
  counterLookup: (code: string) =>
    apiClient.get('/appliances/serial-tracking/counter/lookup/' + encodeURIComponent(code))
      .then(unwrap<{ id: string; productId: string; serialNumber: string; status: string; invoiceNumber?: string | null; otherBranch: string | null } | null>),
  branches: () => apiClient.get('/appliances/serial-tracking/branches').then(unwrap<SerialBranches>),
  /** Puts units in a branch: by a received transfer, or a first placement for units with no branch. */
  move: (data: { serialIds?: string[]; serialNumbers?: string[]; transferId?: string; toShopId?: string }) =>
    apiClient.post('/appliances/serial-tracking/move', data).then(unwrap<{ moved: number; message: string }>),
  /** Marks the units that left on a counter bill as sold (warranty starts on the bill date). */
  assignSale: (saleId: string, serialIds: string[]) =>
    apiClient.post('/appliances/serial-tracking/assign-sale', { saleId, units: serialIds.map((serialId) => ({ serialId })) }).then(unwrap),
  /** Units sold on many bills, for the sales history. */
  forSales: (saleIds: string[]) =>
    apiClient.get('/appliances/serial-tracking/for-sales', { params: { ids: saleIds.join(',') } })
      .then(unwrap<Array<{ id: string; saleId: string; productId: string; serialNumber: string; warrantyEndDate?: string | null; shopWarrantyEndDate?: string | null; installationStatus: string }>>),
  /** Units sold on one bill, for the warranty card. */
  forSale: (saleId: string) =>
    apiClient.get('/appliances/serial-tracking/for-sale/' + saleId).then(unwrap<SaleUnit[]>),
};

export interface SaleUnit {
  id: string; productId: string; serialNumber: string; modelNumber?: string | null;
  warrantyStartDate?: string | null; warrantyEndDate?: string | null; compressorWarrantyEndDate?: string | null; motorWarrantyEndDate?: string | null;
  shopWarrantyEndDate?: string | null;
}
