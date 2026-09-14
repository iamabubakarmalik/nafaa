import { apiClient } from '@core/api/client';
import type { ApplianceServiceType } from './installations.api';

export type ApplianceServiceStatus =
  | 'REQUESTED' | 'SCHEDULED' | 'TECHNICIAN_ASSIGNED'
  | 'EN_ROUTE' | 'ON_SITE' | 'IN_PROGRESS' | 'COMPLETED'
  | 'PENDING_PARTS' | 'CANCELLED' | 'UNRESOLVED';

export interface ServiceRequest {
  id: string;
  requestNumber: string;
  serialTrackingId?: string;
  serialNumber?: string;
  productId?: string;
  productName: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city?: string;
  area?: string;
  serviceType: ApplianceServiceType;
  status: ApplianceServiceStatus;
  priority: string;
  reportedIssue: string;
  issueCategory?: string;
  requestedAt: string;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  technicianId?: string;
  technicianName?: string;
  technicianPhone?: string;
  enRouteAt?: string;
  arrivedAt?: string;
  workStartedAt?: string;
  completedAt?: string;
  diagnosedIssue?: string;
  workDone?: string;
  partsReplaced?: any;
  visitCharge: number;
  laborCharge: number;
  partsCharge: number;
  totalCharge: number;
  paidAmount: number;
  coveredUnderWarranty: boolean;
  coveredUnderAmc: boolean;
  warrantyClaimNumber?: string;
  amcContractNumber?: string;
  requiresFollowUp: boolean;
  followUpDate?: string;
  followUpReason?: string;
  customerRating?: number;
  customerFeedback?: string;
  photosBeforeUrls: string[];
  photosAfterUrls: string[];
  customerSignatureUrl?: string;
  serviceCertificate?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  /** Kaam ho gaya lekin paisa baqi — backend se aata hai */
  dueAmount?: number;
  isOverdue?: boolean;
  waitingHours?: number;
}

/** Ek request khol kar dekhne par — purani history aur AMC bhi sath */
export interface ServiceRequestDetail extends ServiceRequest {
  history: Array<{
    id: string; requestNumber: string; productName: string;
    serviceType: ApplianceServiceType; status: ApplianceServiceStatus;
    reportedIssue: string; issueCategory?: string; workDone?: string;
    requestedAt: string; completedAt?: string;
    totalCharge: number; paidAmount: number;
    technicianName?: string; coveredUnderWarranty: boolean; coveredUnderAmc: boolean;
  }>;
  amc: {
    id: string; contractNumber: string; amcType: string; status: string;
    expiryDate: string; freeVisitsAllowed: number; freeVisitsUsed: number;
    laborCovered: boolean; freePartsAllowed: boolean; gasRefillCovered: boolean;
  } | null;
}

export interface ServiceRequestSummary {
  requested: number; scheduled: number; inProgress: number;
  completed: number; unresolved: number; pendingFollowUps: number;
  pendingParts: number; cancelled: number;
  open: number; unassigned: number; overdue: number; urgent: number;
  completedToday: number;
  month: {
    jobs: number; revenue: number; collected: number; outstanding: number;
    partsCost: number; profit: number; avgTicket: number;
    avgResolutionHours: number; avgRating: number | null;
  };
}

export interface Paged<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const serviceRequestsApi = {
  create: (data: any) =>
    apiClient.post('/appliances/service-requests', data).then(unwrap<ServiceRequest>),
  list: (params?: {
    status?: string; open?: boolean; serviceType?: string; technicianId?: string;
    customerId?: string; priority?: string; coveredUnderWarranty?: boolean;
    coveredUnderAmc?: boolean; unpaidOnly?: boolean;
    from?: string; to?: string; search?: string; page?: number; limit?: number;
  }) => apiClient.get('/appliances/service-requests', { params }).then(unwrap<Paged<ServiceRequest>>),
  /** Khula hua kaam — urgent aur late sab se upar */
  queue: () =>
    apiClient.get('/appliances/service-requests/queue').then(unwrap<ServiceRequest[]>),
  summary: () =>
    apiClient.get('/appliances/service-requests/summary').then(unwrap<ServiceRequestSummary>),
  getOne: (id: string) =>
    apiClient.get('/appliances/service-requests/' + id).then(unwrap<ServiceRequestDetail>),
  update: (id: string, data: any) =>
    apiClient.patch('/appliances/service-requests/' + id, data).then(unwrap<ServiceRequest>),
  assignTechnician: (id: string, data: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) =>
    apiClient.post('/appliances/service-requests/' + id + '/assign-technician', data).then(unwrap<ServiceRequest>),
  updateStatus: (id: string, data: { status: ApplianceServiceStatus; notes?: string }) =>
    apiClient.patch('/appliances/service-requests/' + id + '/status', data).then(unwrap<ServiceRequest>),
  complete: (id: string, data: any) =>
    apiClient.post('/appliances/service-requests/' + id + '/complete', data).then(unwrap<ServiceRequest>),
  /** Repair ka baqi paisa wusool hone par */
  addPayment: (id: string, data: { amount: number; note?: string }) =>
    apiClient.post('/appliances/service-requests/' + id + '/payment', data).then(unwrap<ServiceRequest>),
  cancel: (id: string, data?: { reason?: string }) =>
    apiClient.post('/appliances/service-requests/' + id + '/cancel', data ?? {}).then(unwrap<ServiceRequest>),
  remove: (id: string) =>
    apiClient.delete('/appliances/service-requests/' + id).then(unwrap<{ message: string }>),
};
