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
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const serviceRequestsApi = {
  create: (data: any) =>
    apiClient.post('/appliances/service-requests', data).then(unwrap<ServiceRequest>),
  list: (params?: any) =>
    apiClient.get('/appliances/service-requests', { params }).then(unwrap<ServiceRequest[]>),
  summary: () =>
    apiClient.get('/appliances/service-requests/summary').then(unwrap<any>),
  getOne: (id: string) =>
    apiClient.get('/appliances/service-requests/' + id).then(unwrap<ServiceRequest>),
  assignTechnician: (id: string, data: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) =>
    apiClient.post('/appliances/service-requests/' + id + '/assign-technician', data).then(unwrap<ServiceRequest>),
  updateStatus: (id: string, data: { status: ApplianceServiceStatus; notes?: string }) =>
    apiClient.patch('/appliances/service-requests/' + id + '/status', data).then(unwrap<ServiceRequest>),
  complete: (id: string, data: any) =>
    apiClient.post('/appliances/service-requests/' + id + '/complete', data).then(unwrap<ServiceRequest>),
};
