import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { CustomerVehicle } from './customer-vehicles.api';
import type { PartCondition } from './part-profiles.api';

export type JobStatus = 'DRAFT' | 'QUOTED' | 'APPROVED' | 'IN_PROGRESS' | 'WAITING_PARTS'
  | 'WAITING_APPROVAL' | 'READY_FOR_TEST' | 'QUALITY_CHECK' | 'COMPLETED' | 'DELIVERED'
  | 'CANCELLED' | 'ON_HOLD';

export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';

export type JobType = 'GENERAL_SERVICE' | 'OIL_CHANGE' | 'TUNE_UP' | 'MAJOR_SERVICE'
  | 'MINOR_SERVICE' | 'REPAIR' | 'DIAGNOSTIC' | 'BODY_WORK' | 'PAINT' | 'ELECTRICAL'
  | 'AC_SERVICE' | 'TIRE_CHANGE' | 'BATTERY_CHANGE' | 'BRAKE_SERVICE' | 'ENGINE_REBUILD'
  | 'TRANSMISSION_REPAIR' | 'DENTING_PAINTING' | 'WHEEL_ALIGNMENT' | 'ACCIDENT_REPAIR'
  | 'INSPECTION' | 'MODIFICATION' | 'DETAILING' | 'WASHING' | 'OTHER';

export type JobView = 'open' | 'working' | 'waiting' | 'ready' | 'late' | 'unpaid' | 'closed' | 'all';
export type JobSort = 'due' | 'new' | 'old' | 'amount';

export interface JobLabor {
  id: string; description: string; mechanicId?: string | null; mechanicName?: string | null;
  hours: number; ratePerHour: number; total: number; notes?: string | null;
}

export interface JobPart {
  id: string; productId?: string | null; variantId?: string | null; partName: string; partNumber?: string | null;
  quantity: number; unitPrice: number; discount: number; total: number; condition: PartCondition;
  isCustomerSupplied: boolean; warrantyMonths: number; installedAt?: string | null; notes?: string | null;
}

export interface JobExternal {
  id: string; description: string; vendorName?: string | null; vendorPhone?: string | null;
  cost: number; markup: number; total: number; status: string; notes?: string | null;
}

export interface JobPayment { id: string; amount: number; paymentMethod: string; reference?: string | null; notes?: string | null; paidAt: string }
export interface JobStatusLog { id: string; fromStatus?: JobStatus | null; toStatus: JobStatus; notes?: string | null; createdAt: string }

export interface WorkshopJob {
  id: string;
  shopId?: string | null;
  jobNumber: string;
  status: JobStatus;
  priority: JobPriority;
  jobType: JobType;
  vehicleId?: string | null;
  registrationNumber?: string | null;
  makeName?: string | null;
  modelName?: string | null;
  year?: number | null;
  odometerKm?: number | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerComplaint?: string | null;
  diagnosis?: string | null;
  workDescription?: string | null;
  recommendations?: string | null;
  primaryMechanicId?: string | null;
  assistantMechanicIds: string[];
  bayNumber?: string | null;
  receivedAt: string;
  promisedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  fuelLevel?: string | null;
  hasSpareTire: boolean;
  hasToolkit: boolean;
  externalDamages?: string | null;
  laborTotal: number;
  partsTotal: number;
  externalTotal: number;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  warrantyStatus: string;
  warrantyMonths: number;
  warrantyKm?: number | null;
  warrantyExpiry?: string | null;
  isInsuranceClaim: boolean;
  insuranceProvider?: string | null;
  insuranceClaimNumber?: string | null;
  internalNotes?: string | null;
  laborItems: JobLabor[];
  partsUsed: JobPart[];
  externalWork?: JobExternal[];
  payments?: JobPayment[];
  statusLogs?: JobStatusLog[];
  createdAt: string;
  updatedAt: string;
  /** List and detail add these. */
  mechanicName?: string | null;
  due?: number;
  isLate?: boolean;
}

export interface WorkshopJobDetail extends WorkshopJob {
  externalWork: JobExternal[];
  payments: JobPayment[];
  statusLogs: JobStatusLog[];
  due: number;
  /** Advances and payments held on the khata for this job. */
  advanceOnKhata: number;
  customer?: { id: string; name: string; phone?: string | null; balance: number } | null;
  vehicle?: CustomerVehicle | null;
  /** The bill made when the vehicle was handed back. */
  sale?: { id: string; saleNumber: string; total: number; creditAmount: number; status: string } | null;
}

export interface JobPage {
  items: WorkshopJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totals: { bill: number; paid: number; due: number };
}

export interface JobStats {
  open: number; working: number; waiting: number; ready: number; late: number; readyDue: number;
  todayIn: number; todayOut: number; monthDelivered: number; monthRevenue: number; monthLabour: number; monthParts: number;
  unpaidJobs: number; unpaidDue: number; byStatus: Array<{ status: JobStatus; count: number }>;
}

export interface JobListParams {
  view?: JobView; status?: JobStatus; priority?: JobPriority; jobType?: JobType; mechanicId?: string; vehicleId?: string; customerId?: string;
  shopId?: string; from?: string; to?: string; search?: string; sort?: JobSort; page?: number; limit?: number;
}

export interface LaborInput { description: string; hours?: number; ratePerHour?: number; mechanicId?: string; notes?: string }
export interface PartInput {
  productId?: string; variantId?: string; partName: string; partNumber?: string; quantity?: number; unitPrice?: number; discount?: number;
  condition?: PartCondition; isCustomerSupplied?: boolean; warrantyMonths?: number; notes?: string;
}
export interface ExternalInput { description: string; vendorName?: string; vendorPhone?: string; cost?: number; markup?: number }

export interface JobCreateInput {
  vehicleId?: string; registrationNumber?: string; makeName?: string; modelName?: string; year?: number; odometerKm?: number;
  customerId?: string; customerName?: string; customerPhone?: string; priority?: JobPriority; jobType?: JobType;
  customerComplaint?: string; diagnosis?: string; primaryMechanicId?: string; bayNumber?: string; promisedAt?: string;
  fuelLevel?: string; hasSpareTire?: boolean; hasToolkit?: boolean; externalDamages?: string; discount?: number;
  isInsuranceClaim?: boolean; insuranceProvider?: string; insuranceClaimNumber?: string; internalNotes?: string; shopId?: string;
  advance?: number; advanceMethod?: PaymentMethod;
  laborItems?: LaborInput[]; partsUsed?: PartInput[]; externalWork?: ExternalInput[];
}

export type JobUpdateInput = Partial<Pick<JobCreateInput,
  'odometerKm' | 'customerName' | 'customerPhone' | 'priority' | 'jobType' | 'customerComplaint' | 'diagnosis' | 'primaryMechanicId'
  | 'bayNumber' | 'promisedAt' | 'fuelLevel' | 'hasSpareTire' | 'hasToolkit' | 'externalDamages' | 'discount' | 'isInsuranceClaim'
  | 'insuranceProvider' | 'insuranceClaimNumber' | 'internalNotes'>> & { recommendations?: string; workDescription?: string; taxAmount?: number };

export interface DeliverInput {
  amount: number; paymentMethod: PaymentMethod; notes?: string; nextServiceKm?: number; nextServiceDate?: string; warrantyMonths?: number; warrantyKm?: number;
}

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;
const base = '/autoparts/workshop-jobs';

export const workshopJobsApi = {
  create: (data: JobCreateInput) => apiClient.post(base, data).then(unwrap<WorkshopJobDetail>),
  page: (params: JobListParams) => apiClient.get(base, { params: { ...params, page: params.page ?? 1 } }).then(unwrap<JobPage>),
  stats: (shopId?: string) => apiClient.get(`${base}/stats`, { params: { shopId } }).then(unwrap<JobStats>),
  getOne: (id: string) => apiClient.get(`${base}/${id}`).then(unwrap<WorkshopJobDetail>),
  update: (id: string, data: JobUpdateInput) => apiClient.patch(`${base}/${id}`, data).then(unwrap<WorkshopJob>),
  updateStatus: (id: string, status: JobStatus, opts?: { notes?: string; cancellationReason?: string }) =>
    apiClient.patch(`${base}/${id}/status`, { status, ...opts }).then(unwrap<WorkshopJobDetail>),
  deliver: (id: string, data: DeliverInput) => apiClient.post(`${base}/${id}/deliver`, data).then(unwrap<WorkshopJobDetail>),
  addLabor: (id: string, data: LaborInput) => apiClient.post(`${base}/${id}/labor`, data).then(unwrap<WorkshopJob>),
  removeLabor: (id: string, laborId: string) => apiClient.delete(`${base}/${id}/labor/${laborId}`).then(unwrap<WorkshopJob>),
  addPart: (id: string, data: PartInput) => apiClient.post(`${base}/${id}/parts`, data).then(unwrap<WorkshopJob>),
  removePart: (id: string, partId: string) => apiClient.delete(`${base}/${id}/parts/${partId}`).then(unwrap<WorkshopJob>),
  addExternal: (id: string, data: ExternalInput) => apiClient.post(`${base}/${id}/external`, data).then(unwrap<WorkshopJob>),
  removeExternal: (id: string, externalId: string) => apiClient.delete(`${base}/${id}/external/${externalId}`).then(unwrap<WorkshopJob>),
  addPayment: (id: string, data: { amount: number; paymentMethod: PaymentMethod; reference?: string; notes?: string }) =>
    apiClient.post(`${base}/${id}/payments`, data).then(unwrap<WorkshopJobDetail>),
};
