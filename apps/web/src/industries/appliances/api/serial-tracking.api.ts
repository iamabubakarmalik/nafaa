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
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const applianceSerialApi = {
  create: (data: Partial<ApplianceSerial>) =>
    apiClient.post('/appliances/serial-tracking', data).then(unwrap<ApplianceSerial>),
  list: (params?: { productId?: string; status?: string; installationStatus?: string; search?: string }) =>
    apiClient.get('/appliances/serial-tracking', { params }).then(unwrap<ApplianceSerial[]>),
  lookup: (code: string) =>
    apiClient.get('/appliances/serial-tracking/lookup/' + code).then(unwrap<ApplianceSerial | null>),
  warrantyCheck: (code: string) =>
    apiClient.get('/appliances/serial-tracking/warranty-check/' + code).then(unwrap<any>),
  getOne: (id: string) =>
    apiClient.get('/appliances/serial-tracking/' + id).then(unwrap<ApplianceSerial>),
  update: (id: string, data: Partial<ApplianceSerial>) =>
    apiClient.patch('/appliances/serial-tracking/' + id, data).then(unwrap<ApplianceSerial>),
  remove: (id: string) =>
    apiClient.delete('/appliances/serial-tracking/' + id).then(unwrap),
};
