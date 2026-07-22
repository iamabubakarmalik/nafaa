import { apiClient } from '@/api/client';

export type JobStatus = 'DRAFT' | 'ENQUIRY' | 'QUOTED' | 'CONFIRMED' | 'SCHEDULED' | 'ASSIGNED'
  | 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'PAUSED' | 'AWAITING_PARTS'
  | 'AWAITING_APPROVAL' | 'QUALITY_CHECK' | 'COMPLETED' | 'UNABLE_TO_COMPLETE'
  | 'RESCHEDULED' | 'CANCELLED' | 'WARRANTY_HOLD' | 'DISPUTED';

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';
export type LocationType = 'CUSTOMER_HOME' | 'CUSTOMER_OFFICE' | 'CUSTOMER_SHOP' | 'IN_SHOP' | 'ONLINE_REMOTE' | 'FIELD_SITE' | 'OTHER';

export interface JobPart {
  id?: string;
  productId?: string;
  partName: string;
  partNumber?: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  total: number;
  isCustomerSupplied: boolean;
  isUnderWarranty: boolean;
  warrantyDays: number;
  serialNumber?: string;
  notes?: string;
}

export interface ServiceJob {
  id: string;
  jobNumber: string;
  ticketNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAltPhone?: string;
  customerEmail?: string;
  customerType: string;
  serviceId?: string;
  serviceName: string;
  category: string;
  businessType?: string;
  priority: Priority;
  status: JobStatus;
  problemDescription: string;
  customerReportedIssue?: string;
  urgencyReason?: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  yearPurchased?: number;
  purchasedFrom?: string;
  underWarranty: boolean;
  warrantyType?: string;
  warrantyExpiryDate?: string;
  amcId?: string;
  locationType: LocationType;
  serviceAddress?: string;
  city?: string;
  area?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  entryInstructions?: string;
  requestedDate?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  preferredTimeSlot?: string;
  assignedAt?: string;
  dispatchedAt?: string;
  enRouteAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  primaryTechnicianId?: string;
  assistantTechnicianIds: string[];
  supervisorId?: string;
  visitCharge: number;
  labourCharge: number;
  partsCharge: number;
  transportCharge: number;
  emergencyCharge: number;
  discountAmount: number;
  taxAmount: number;
  totalCharge: number;
  paidAmount: number;
  paymentStatus: string;
  advanceRequired: boolean;
  advanceAmount: number;
  advanceCollected: number;
  jobWarrantyDays: number;
  jobWarrantyExpiryDate?: string;
  jobWarrantyTerms?: string;
  needsReturnVisit: boolean;
  returnVisitReason?: string;
  returnVisitDate?: string;
  parentJobId?: string;
  workCompletionSignatureUrl?: string;
  customerSatisfaction?: string;
  customerRating?: number;
  customerFeedback?: string;
  wouldRecommend?: boolean;
  beforePhotoUrls: string[];
  duringPhotoUrls: string[];
  afterPhotoUrls: string[];
  documentUrls: string[];
  technicianNotes?: string;
  internalNotes?: string;
  cancellationReason?: string;
  followUpDate?: string;
  followUpDone: boolean;
  followUpNotes?: string;
  parts: JobPart[];
  timeLog?: any[];
  statusHistory?: any[];
  customer?: any;
  technician?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const jobsApi = {
  create: (data: any) => apiClient.post('/services-biz/jobs', data).then(unwrap<ServiceJob>),
  list: (params?: any) => apiClient.get('/services-biz/jobs', { params }).then(unwrap<ServiceJob[]>),
  summary: (from?: string, to?: string) => apiClient.get('/services-biz/jobs/summary', { params: { from, to } }).then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/services-biz/jobs/' + id).then(unwrap<ServiceJob>),
  updateStatus: (id: string, data: { status: string; reason?: string; notes?: string; lat?: number; lng?: number }) =>
    apiClient.patch('/services-biz/jobs/' + id + '/status', data).then(unwrap<ServiceJob>),
  assign: (id: string, primaryTechnicianId: string, assistantIds?: string[]) =>
    apiClient.post('/services-biz/jobs/' + id + '/assign', { primaryTechnicianId, assistantIds }).then(unwrap<ServiceJob>),
  addPart: (id: string, data: any) => apiClient.post('/services-biz/jobs/' + id + '/parts', data).then(unwrap<JobPart>),
  removePart: (id: string, partId: string) => apiClient.patch('/services-biz/jobs/' + id + '/parts/' + partId + '/remove').then(unwrap<ServiceJob>),
  addPayment: (id: string, amount: number, isAdvance?: boolean) =>
    apiClient.post('/services-biz/jobs/' + id + '/payments', { amount, isAdvance }).then(unwrap<ServiceJob>),
  rate: (id: string, data: any) => apiClient.post('/services-biz/jobs/' + id + '/rating', data).then(unwrap<ServiceJob>),
  signature: (id: string, signatureUrl: string) =>
    apiClient.post('/services-biz/jobs/' + id + '/signature', { signatureUrl }).then(unwrap<ServiceJob>),
  addPhotos: (id: string, stage: 'before' | 'during' | 'after', urls: string[]) =>
    apiClient.post('/services-biz/jobs/' + id + '/photos/' + stage, { urls }).then(unwrap<ServiceJob>),
  returnVisit: (id: string, data: any) => apiClient.post('/services-biz/jobs/' + id + '/return-visit', data).then(unwrap<ServiceJob>),
  cancel: (id: string, reason: string) => apiClient.post('/services-biz/jobs/' + id + '/cancel', { reason }).then(unwrap<ServiceJob>),
};
