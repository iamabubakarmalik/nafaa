import { apiClient } from '@core/api/client';

export type ApplianceInstallationStatus =
  | 'PENDING' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'FAILED';

export type ApplianceServiceType =
  | 'INSTALLATION' | 'DEMO' | 'INSPECTION' | 'REPAIR' | 'MAINTENANCE'
  | 'DEEP_CLEANING' | 'GAS_REFILL' | 'WARRANTY_CLAIM' | 'AMC_VISIT'
  | 'RELOCATION' | 'UNINSTALLATION' | 'OTHER';

export interface Installation {
  id: string;
  installationNumber: string;
  serialTrackingId?: string;
  saleId?: string;
  productId?: string;
  productName: string;
  serialNumber?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  serviceType: ApplianceServiceType;
  status: ApplianceInstallationStatus;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  technicianId?: string;
  technicianName?: string;
  technicianPhone?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  hasProperElectricConnection?: boolean;
  hasProperPlumbing?: boolean;
  hasProperGasConnection?: boolean;
  wallSpaceAvailable?: boolean;
  drainageAvailable?: boolean;
  additionalMaterialUsed?: any;
  materialsCharge: number;
  laborCharge: number;
  visitCharge: number;
  totalCharge: number;
  paidByCustomer: number;
  covered_underWarranty: boolean;
  demoGiven: boolean;
  demoNotes?: string;
  customerSignatureUrl?: string;
  photosBeforeUrls: string[];
  photosAfterUrls: string[];
  customerRating?: number;
  customerFeedback?: string;
  installationCertificateNumber?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const installationsApi = {
  create: (data: any) =>
    apiClient.post('/appliances/installations', data).then(unwrap<Installation>),
  list: (params?: {
    status?: string; serviceType?: string; technicianId?: string;
    customerId?: string; from?: string; to?: string; search?: string;
  }) => apiClient.get('/appliances/installations', { params }).then(unwrap<Installation[]>),
  today: () =>
    apiClient.get('/appliances/installations/today').then(unwrap<Installation[]>),
  summary: () =>
    apiClient.get('/appliances/installations/summary').then(unwrap<any>),
  getOne: (id: string) =>
    apiClient.get('/appliances/installations/' + id).then(unwrap<Installation>),
  assignTechnician: (id: string, data: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) =>
    apiClient.post('/appliances/installations/' + id + '/assign-technician', data).then(unwrap<Installation>),
  updateStatus: (id: string, data: { status: ApplianceInstallationStatus; cancellationReason?: string; notes?: string }) =>
    apiClient.patch('/appliances/installations/' + id + '/status', data).then(unwrap<Installation>),
  complete: (id: string, data: any) =>
    apiClient.post('/appliances/installations/' + id + '/complete', data).then(unwrap<Installation>),
  reschedule: (id: string, data: { newDate: string; reason?: string }) =>
    apiClient.post('/appliances/installations/' + id + '/reschedule', data).then(unwrap<Installation>),
};
