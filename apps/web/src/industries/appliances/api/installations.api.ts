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
  /** Kaam ho gaya lekin paisa baqi — backend se aata hai */
  dueAmount?: number;
  isOverdue?: boolean;
  waitingDays?: number;
}

export interface InstallationDetail extends Installation {
  history: Array<{
    id: string; installationNumber: string; productName: string;
    serviceType: ApplianceServiceType; status: ApplianceInstallationStatus;
    scheduledDate?: string; completedAt?: string; totalCharge: number;
    technicianName?: string;
  }>;
  serial: {
    id: string; serialNumber: string; modelNumber?: string; status: string;
    warrantyStartDate?: string; warrantyEndDate?: string;
    compressorWarrantyEndDate?: string; motorWarrantyEndDate?: string;
  } | null;
}

export interface InstallationSummary {
  pending: number; scheduled: number; inProgress: number;
  completed: number; cancelled: number;
  open: number; unassigned: number; overdue: number; todayJobs: number;
  month: {
    jobs: number; revenue: number; collected: number; outstanding: number;
    materialCost: number; profit: number; avgTicket: number;
    demosGiven: number; avgRating: number | null;
  };
}

export interface Paged<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const installationsApi = {
  create: (data: any) =>
    apiClient.post('/appliances/installations', data).then(unwrap<Installation>),
  list: (params?: {
    status?: string; open?: boolean; serviceType?: string; technicianId?: string;
    customerId?: string; unpaidOnly?: boolean; from?: string; to?: string;
    search?: string; page?: number; limit?: number;
  }) => apiClient.get('/appliances/installations', { params }).then(unwrap<Paged<Installation>>),
  /** Khula hua kaam — late sab se upar */
  queue: () =>
    apiClient.get('/appliances/installations/queue').then(unwrap<Installation[]>),
  today: () =>
    apiClient.get('/appliances/installations/today').then(unwrap<Installation[]>),
  summary: () =>
    apiClient.get('/appliances/installations/summary').then(unwrap<InstallationSummary>),
  getOne: (id: string) =>
    apiClient.get('/appliances/installations/' + id).then(unwrap<InstallationDetail>),
  assignTechnician: (id: string, data: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) =>
    apiClient.post('/appliances/installations/' + id + '/assign-technician', data).then(unwrap<Installation>),
  updateStatus: (id: string, data: { status: ApplianceInstallationStatus; cancellationReason?: string; notes?: string }) =>
    apiClient.patch('/appliances/installations/' + id + '/status', data).then(unwrap<Installation>),
  complete: (id: string, data: any) =>
    apiClient.post('/appliances/installations/' + id + '/complete', data).then(unwrap<Installation>),
  reschedule: (id: string, data: { newDate: string; reason?: string }) =>
    apiClient.post('/appliances/installations/' + id + '/reschedule', data).then(unwrap<Installation>),
  /** Installation ka baqi paisa wusool hone par */
  addPayment: (id: string, data: { amount: number; note?: string }) =>
    apiClient.post('/appliances/installations/' + id + '/payment', data).then(unwrap<Installation>),
  remove: (id: string) =>
    apiClient.delete('/appliances/installations/' + id).then(unwrap<{ message: string }>),
};
