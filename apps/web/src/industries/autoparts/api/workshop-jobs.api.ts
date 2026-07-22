import { apiClient } from '@core/api/client';

export type JobStatus = 'DRAFT' | 'QUOTED' | 'APPROVED' | 'IN_PROGRESS' | 'WAITING_PARTS'
  | 'WAITING_APPROVAL' | 'READY_FOR_TEST' | 'QUALITY_CHECK' | 'COMPLETED' | 'DELIVERED'
  | 'CANCELLED' | 'ON_HOLD';

export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';

export type JobType = 'GENERAL_SERVICE' | 'OIL_CHANGE' | 'TUNE_UP' | 'MAJOR_SERVICE'
  | 'MINOR_SERVICE' | 'REPAIR' | 'DIAGNOSTIC' | 'BODY_WORK' | 'PAINT' | 'ELECTRICAL'
  | 'AC_SERVICE' | 'TIRE_CHANGE' | 'BATTERY_CHANGE' | 'BRAKE_SERVICE' | 'ENGINE_REBUILD'
  | 'TRANSMISSION_REPAIR' | 'DENTING_PAINTING' | 'WHEEL_ALIGNMENT' | 'ACCIDENT_REPAIR'
  | 'INSPECTION' | 'MODIFICATION' | 'DETAILING' | 'WASHING' | 'OTHER';

export interface WorkshopJob {
  id: string;
  jobNumber: string;
  status: JobStatus;
  priority: JobPriority;
  jobType: JobType;
  vehicleId?: string;
  registrationNumber?: string;
  makeName?: string;
  modelName?: string;
  year?: number;
  odometerKm?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerComplaint?: string;
  diagnosis?: string;
  workDescription?: string;
  recommendations?: string;
  primaryMechanicId?: string;
  assistantMechanicIds: string[];
  bayNumber?: string;
  receivedAt: string;
  promisedAt?: string;
  startedAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  fuelLevel?: string;
  hasSpareTire: boolean;
  hasToolkit: boolean;
  externalDamages?: string;
  inspectionImageUrls: string[];
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
  warrantyKm?: number;
  warrantyExpiry?: string;
  warrantyNotes?: string;
  isInsuranceClaim: boolean;
  insuranceProvider?: string;
  insuranceClaimNumber?: string;
  insuranceApproved: boolean;
  insuranceAmount: number;
  customerRating?: number;
  customerFeedback?: string;
  internalNotes?: string;
  imageUrls: string[];
  documentUrls: string[];
  laborItems: any[];
  partsUsed: any[];
  externalWork: any[];
  payments?: any[];
  statusLogs?: any[];
  customer?: any;
  vehicle?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const workshopJobsApi = {
  create: (data: any) => apiClient.post('/autoparts/workshop-jobs', data).then(unwrap<WorkshopJob>),
  list: (params?: any) => apiClient.get('/autoparts/workshop-jobs', { params }).then(unwrap<WorkshopJob[]>),
  getOne: (id: string) => apiClient.get('/autoparts/workshop-jobs/' + id).then(unwrap<WorkshopJob>),
  updateStatus: (id: string, status: string, opts?: { notes?: string; cancellationReason?: string }) =>
    apiClient.patch('/autoparts/workshop-jobs/' + id + '/status', { status, ...opts }).then(unwrap<WorkshopJob>),
  addPayment: (id: string, data: { amount: number; paymentMethod: string; reference?: string; notes?: string }) =>
    apiClient.post('/autoparts/workshop-jobs/' + id + '/payments', data).then(unwrap<WorkshopJob>),
  setWarranty: (id: string, data: any) => apiClient.post('/autoparts/workshop-jobs/' + id + '/warranty', data).then(unwrap<WorkshopJob>),
  rate: (id: string, rating: number, feedback?: string) =>
    apiClient.post('/autoparts/workshop-jobs/' + id + '/rating', { rating, feedback }).then(unwrap<WorkshopJob>),
  recalculate: (id: string) => apiClient.post('/autoparts/workshop-jobs/' + id + '/recalculate').then(unwrap<WorkshopJob>),
};
