import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type JobStatus = 'DRAFT' | 'ENQUIRY' | 'QUOTED' | 'CONFIRMED' | 'SCHEDULED' | 'ASSIGNED'
  | 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'PAUSED' | 'AWAITING_PARTS'
  | 'AWAITING_APPROVAL' | 'QUALITY_CHECK' | 'COMPLETED' | 'UNABLE_TO_COMPLETE'
  | 'RESCHEDULED' | 'CANCELLED' | 'WARRANTY_HOLD' | 'DISPUTED';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';
export type LocationType = 'CUSTOMER_HOME' | 'CUSTOMER_OFFICE' | 'CUSTOMER_SHOP' | 'IN_SHOP' | 'ONLINE_REMOTE' | 'FIELD_SITE' | 'OTHER';
export type JobView = 'open' | 'booked' | 'working' | 'waiting' | 'ready' | 'late' | 'unpaid' | 'closed' | 'all';
export type JobSort = 'due' | 'new' | 'old' | 'amount';

export interface JobPart {
  id: string;
  productId?: string | null;
  partName: string;
  partNumber?: string | null;
  brand?: string | null;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  total: number;
  isCustomerSupplied: boolean;
  isUnderWarranty: boolean;
  warrantyDays: number;
  serialNumber?: string | null;
  notes?: string | null;
  /** Quantity and value (after the bill discount) returned on the bill. */
  returnedQty?: number;
  returnedAmount?: number;
}

export interface JobHistory { id: string; fromStatus?: JobStatus | null; toStatus: JobStatus; reason?: string | null; notes?: string | null; changedAt: string }

export interface ServiceJob {
  id: string;
  jobNumber: string;
  ticketNumber?: string | null;
  shopId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAltPhone?: string | null;
  serviceId?: string | null;
  serviceName: string;
  category: string;
  businessType?: string | null;
  priority: Priority;
  status: JobStatus;
  problemDescription: string;
  brand?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  underWarranty: boolean;
  amcId?: string | null;
  locationType: LocationType;
  serviceAddress?: string | null;
  city?: string | null;
  area?: string | null;
  landmark?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  preferredTimeSlot?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  primaryTechnicianId?: string | null;
  assistantTechnicianIds: string[];
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
  advanceAmount: number;
  advanceCollected: number;
  jobWarrantyDays: number;
  jobWarrantyExpiryDate?: string | null;
  jobWarrantyTerms?: string | null;
  parentJobId?: string | null;
  customerRating?: number | null;
  customerFeedback?: string | null;
  technicianNotes?: string | null;
  internalNotes?: string | null;
  parts: JobPart[];
  createdAt: string;
  /** List rows (paged) and the detail carry these. */
  technicianName?: string | null;
  due?: number;
  isLate?: boolean;
}

export interface JobDetail extends ServiceJob {
  statusHistory: JobHistory[];
  customer: { id: string; name: string; phone?: string | null; balance: number } | null;
  technician: { staff: { id: string; fullName: string; phone?: string | null }; profile: { id: string; commissionType: string; commissionPct: number; fixedPerJob: number } | null } | null;
  assistantNames: string[];
  billSale: { id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number; createdAt: string } | null;
  /** Money returned on the bill (Sales → Return). */
  returned: number;
  due: number;
  advanceOnKhata: number;
  isLate: boolean;
  amc: { id: string; amcNumber: string; includesParts: boolean; includesLabour: boolean; visitsRemaining: number } | null;
  warrantyClaim: { id: string; claimNumber: string } | null;
}

export interface JobPage {
  items: ServiceJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totals: { bill: number; paid: number; due: number };
}

export interface JobStats {
  open: number; booked: number; unassigned: number; working: number; onSite: number; onTheWay: number; waiting: number; ready: number;
  late: number; urgent: number; readyDue: number; todayIn: number; todayDone: number; todayBooked: number;
  monthDone: number; monthRevenue: number; monthLabour: number; monthParts: number; unpaidJobs: number; unpaidDue: number;
  byStatus: Array<{ status: JobStatus; count: number }>;
}

export interface JobListParams {
  view?: JobView; status?: JobStatus; priority?: Priority; customerId?: string; technicianId?: string; shopId?: string;
  from?: string; to?: string; search?: string; sort?: JobSort; page?: number; limit?: number;
}

export interface PartInput {
  productId?: string; partName: string; partNumber?: string; brand?: string; quantity?: number; unitPrice?: number; costPrice?: number;
  isCustomerSupplied?: boolean; isUnderWarranty?: boolean; warrantyDays?: number; serialNumber?: string; notes?: string;
}

export interface JobDetailsInput {
  customerId?: string; customerName?: string; customerPhone?: string; customerAltPhone?: string;
  serviceId?: string; serviceName?: string; category?: string; priority?: Priority; problemDescription?: string;
  brand?: string; modelNumber?: string; serialNumber?: string; underWarranty?: boolean;
  locationType?: LocationType; serviceAddress?: string; city?: string; area?: string; landmark?: string;
  scheduledStart?: string; scheduledEnd?: string; preferredTimeSlot?: string;
  visitCharge?: number; labourCharge?: number; transportCharge?: number; emergencyCharge?: number; discountAmount?: number; taxAmount?: number;
  advanceAmount?: number; jobWarrantyDays?: number; jobWarrantyTerms?: string; technicianNotes?: string; internalNotes?: string;
}

export interface JobCreateInput extends JobDetailsInput {
  shopId?: string; ticketNumber?: string; primaryTechnicianId?: string; assistantTechnicianIds?: string[]; amcId?: string;
  parts?: PartInput[]; advancePaid?: number; advanceMethod?: PaymentMethod;
}

export interface BillInput {
  paidAmount?: number; paymentMethod?: PaymentMethod; shopId?: string; jobWarrantyDays?: number;
  payments?: Array<{ method: PaymentMethod; amount: number; reference?: string }>;
}

export type BilledJob = JobDetail & { sale: { id: string; saleNumber: string } | null; change: number };

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;
const base = '/services-biz/jobs';

export const jobsApi = {
  create: (data: JobCreateInput) => apiClient.post(base, data).then(unwrap<JobDetail>),
  /** Without `page`: a plain list (up to 200). */
  list: (params?: Omit<JobListParams, 'page' | 'limit'>) => apiClient.get(base, { params }).then(unwrap<ServiceJob[]>),
  page: (params: JobListParams) => apiClient.get(base, { params: { page: 1, ...params } }).then(unwrap<JobPage>),
  stats: (shopId?: string) => apiClient.get(`${base}/stats`, { params: { shopId } }).then(unwrap<JobStats>),
  bySales: (ids: string[]) => apiClient.get(`${base}/by-sales`, { params: { ids: ids.join(',') } })
    .then(unwrap<Array<{ saleId: string; kind: 'job' | 'amc'; id: string; number: string; label: string }>>),
  getOne: (id: string) => apiClient.get(`${base}/${id}`).then(unwrap<JobDetail>),
  update: (id: string, data: JobDetailsInput) => apiClient.patch(`${base}/${id}`, data).then(unwrap<JobDetail>),
  updateStatus: (id: string, status: JobStatus, reason?: string) => apiClient.patch(`${base}/${id}/status`, { status, reason }).then(unwrap<JobDetail>),
  assign: (id: string, primaryTechnicianId: string, assistantIds?: string[]) =>
    apiClient.post(`${base}/${id}/assign`, { primaryTechnicianId, assistantIds }).then(unwrap<JobDetail>),
  addPart: (id: string, data: PartInput) => apiClient.post(`${base}/${id}/parts`, data).then(unwrap<JobDetail>),
  removePart: (id: string, partId: string) => apiClient.patch(`${base}/${id}/parts/${partId}/remove`).then(unwrap<JobDetail>),
  addPayment: (id: string, amount: number, paymentMethod: PaymentMethod) => apiClient.post(`${base}/${id}/payments`, { amount, paymentMethod }).then(unwrap<JobDetail>),
  bill: (id: string, data: BillInput) => apiClient.post(`${base}/${id}/bill`, data).then(unwrap<BilledJob>),
  rate: (id: string, data: { rating: number; feedback?: string; wouldRecommend?: boolean }) => apiClient.post(`${base}/${id}/rating`, data).then(unwrap<JobDetail>),
  returnVisit: (id: string, data: { returnVisitDate: string; reason: string }) => apiClient.post(`${base}/${id}/return-visit`, data).then(unwrap<JobDetail>),
  cancel: (id: string, reason: string) => apiClient.post(`${base}/${id}/cancel`, { reason }).then(unwrap<JobDetail>),
};
