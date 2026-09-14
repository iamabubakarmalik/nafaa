import { apiClient } from '@core/api/client';

export type ApplianceInstallationStatus =
  | 'PENDING' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'FAILED';

export interface ApplianceSerial {
  id: string;
  productId: string;
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
    requiresInstallation: boolean;
    installationCharge: number;
  } | null;
  /** Teen warranty — main, compressor, motor. Jo pehle khatam ho wahi asal */
  warranty?: {
    mainDaysLeft: number | null;
    compressorDaysLeft: number | null;
    motorDaysLeft: number | null;
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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const applianceSerialApi = {
  create: (data: Partial<ApplianceSerial>) =>
    apiClient.post('/appliances/serial-tracking', data).then(unwrap<ApplianceSerial>),
  /** Aik shipment ke saare serial ek sath — 20 AC ek ek kar ke nahi */
  bulkCreate: (data: {
    productId: string; serialNumbers: string[];
    modelNumber?: string; batchNumber?: string;
    purchasePrice?: number; purchaseDate?: string; supplierRef?: string;
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
};
