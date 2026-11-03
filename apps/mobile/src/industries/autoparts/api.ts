/** Auto parts endpoints (same paths and shapes as apps/web/src/industries/autoparts/api): workshop jobs, vehicles, makes and models, mechanics, reminders, core returns, part profiles. */

import { apiClient } from '@/core/api/client';
import type { PaymentMethod } from '@/core/offline';

export type { PaymentMethod };

const unwrap = <T,>(res: { data?: { data?: unknown } }): T => (res.data?.data ?? res.data) as T;

// customer-vehicles.api.ts
export type FuelType = 'PETROL' | 'DIESEL' | 'CNG' | 'LPG' | 'HYBRID' | 'ELECTRIC' | 'OTHER';
export type TransmissionType = 'MANUAL' | 'AUTOMATIC' | 'CVT' | 'DCT' | 'SEMI_AUTO';

export interface CustomerVehicle {
  id: string;
  customerId: string;
  registrationNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
  makeId?: string;
  modelId?: string;
  makeName?: string;
  modelName?: string;
  vehicleType: string;
  year?: number;
  color?: string;
  fuelType: FuelType;
  transmission: TransmissionType;
  engineCC?: number;
  odometerKm?: number;
  ownerName?: string;
  ownerPhone?: string;
  ownerCnic?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  tokenTaxExpiry?: string;
  fitnessExpiry?: string;
  documentUrls: string[];
  photoUrls: string[];
  preferredMechanicId?: string;
  notes?: string;
  totalServices: number;
  totalSpent: number;
  lastServiceAt?: string;
  lastOdometerKm?: number;
  isActive: boolean;
  customer?: { id: string; name: string; phone?: string | null; balance: number } | null;
  serviceHistory?: WorkshopJob[];
  reminders?: ServiceReminder[];
  createdAt: string;
  updatedAt: string;
}

export type VehicleView = 'all' | 'papers' | 'regular' | 'away' | 'inactive';
export type VehicleSort = 'recent' | 'name' | 'spent' | 'visits';

export interface VehiclePage { items: Array<CustomerVehicle & { openJobs: number }>; total: number; page: number; limit: number; totalPages: number }
export interface VehicleStats { total: number; papers: number; regular: number; away: number; inShop: number }
export interface VehicleInput {
  registrationNumber?: string; customerId?: string; chassisNumber?: string; engineNumber?: string; makeId?: string; modelId?: string;
  makeName?: string; modelName?: string; vehicleType?: string; year?: number; color?: string; fuelType?: FuelType; transmission?: TransmissionType;
  engineCC?: number; odometerKm?: number; ownerName?: string; ownerPhone?: string; ownerCnic?: string; insuranceProvider?: string;
  insurancePolicyNumber?: string; insuranceExpiry?: string; tokenTaxExpiry?: string; fitnessExpiry?: string; notes?: string; isActive?: boolean;
}

export const customerVehiclesApi = {
  create: (data: VehicleInput) => apiClient.post('/autoparts/customer-vehicles', data).then(unwrap<CustomerVehicle>),
  page: (params: { view?: VehicleView; search?: string; makeId?: string; vehicleType?: string; customerId?: string; sort?: VehicleSort; page?: number; limit?: number }) =>
    apiClient.get('/autoparts/customer-vehicles', { params: { ...params, page: params.page ?? 1 } }).then(unwrap<VehiclePage>),
  stats: () => apiClient.get('/autoparts/customer-vehicles/stats').then(unwrap<VehicleStats>),
  getOne: (id: string) => apiClient.get('/autoparts/customer-vehicles/' + id).then(unwrap<CustomerVehicle>),
  update: (id: string, data: VehicleInput) => apiClient.patch('/autoparts/customer-vehicles/' + id, data).then(unwrap<CustomerVehicle>),
  remove: (id: string) => apiClient.delete('/autoparts/customer-vehicles/' + id).then(unwrap<CustomerVehicle>),
};

// mechanics.api.ts
export interface MechanicProfile {
  id: string;
  staffId: string;
  specialization: string[];
  certifications: string[];
  yearsOfExperience?: number;
  bio?: string;
  photoUrl?: string;
  hourlyRate: number;
  commissionPct: number;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  isAvailable: boolean;
  currentJobId?: string;
  totalJobs: number;
  totalHours: number;
  totalRevenue: number;
  totalCommission: number;
  avgRating?: number;
  totalReviews: number;
  isActive: boolean;
  staff?: { id: string; fullName: string; phone?: string | null; designation?: string | null } | null;
  /** Added by the list. */
  openJobs?: number;
  monthJobs?: number;
  monthLabour?: number;
  monthHours?: number;
  monthCommission?: number;
  createdAt: string;
  updatedAt: string;
}

export const mechanicsApi = {
  upsert: (data: Partial<Omit<MechanicProfile, 'staff'>>) => apiClient.post('/autoparts/mechanics', data).then(unwrap<MechanicProfile>),
  list: (params?: { available?: boolean; search?: string }) => apiClient.get('/autoparts/mechanics', { params }).then(unwrap<MechanicProfile[]>),
  toggleAvailability: (id: string) => apiClient.post('/autoparts/mechanics/' + id + '/toggle-availability').then(unwrap<MechanicProfile>),
  remove: (id: string) => apiClient.delete('/autoparts/mechanics/' + id).then(unwrap<MechanicProfile>),
};

// part-profiles.api.ts
export type PartCategory = 'ENGINE' | 'TRANSMISSION' | 'BRAKES' | 'SUSPENSION' | 'ELECTRICAL'
  | 'BATTERY' | 'COOLING' | 'EXHAUST' | 'FUEL_SYSTEM' | 'BODY' | 'INTERIOR' | 'LIGHTING'
  | 'TIRES_WHEELS' | 'FILTERS' | 'OILS_FLUIDS' | 'BELTS_HOSES' | 'IGNITION' | 'AC_HEATING'
  | 'STEERING' | 'DRIVETRAIN' | 'BEARINGS' | 'GASKETS' | 'SENSORS' | 'ACCESSORIES'
  | 'TOOLS' | 'CONSUMABLES' | 'OTHER';

export type PartCondition = 'NEW' | 'USED' | 'REFURBISHED' | 'GENUINE' | 'OEM' | 'AFTERMARKET' | 'LOCAL';

export interface PartFitment { makeId?: string; makeName?: string; modelId?: string; modelName?: string; yearFrom?: number | null; yearTo?: number | null; notes?: string }

export interface PartProfile {
  id: string;
  productId: string;
  partNumber?: string;
  oemNumber?: string;
  alternateNumbers: string[];
  category: PartCategory;
  subCategory?: string;
  condition: PartCondition;
  brand?: string;
  countryOfOrigin?: string;
  manufacturer?: string;
  weightGrams?: number;
  dimensions?: string;
  color?: string;
  material?: string;
  warrantyMonths: number;
  warrantyKm?: number;
  warrantyNotes?: string;
  installationMinutes?: number;
  requiresSpecialTool: boolean;
  installationDifficulty?: string;
  compatibility?: { isUniversal?: boolean; fitments?: PartFitment[] } | null;
  minStockAlert: number;
  isFastMoving: boolean;
  isCritical: boolean;
  totalSold: number;
  totalInstalled: number;
  createdAt: string;
  updatedAt: string;
}

/** One light row per part: numbers, brand, condition and the vehicles it fits. */
export interface PartFacts {
  productId: string; partNumber?: string | null; oemNumber?: string | null; alternateNumbers: string[]; brand?: string | null;
  condition: PartCondition; category: PartCategory; warrantyMonths: number; isFastMoving: boolean; isCritical: boolean;
  universal: boolean; fitment: string;
  fits: Array<{ makeId: string | null; modelId: string | null; makeName: string | null; modelName: string | null; yearFrom: number | null; yearTo: number | null }>;
}

export const partProfilesApi = {
  upsert: (data: Partial<Omit<PartProfile, 'id' | 'product' | 'createdAt' | 'updatedAt' | 'totalSold' | 'totalInstalled'>> & { productId: string }) =>
    apiClient.post('/autoparts/part-profiles', data).then(unwrap<PartProfile>),
  facts: () => apiClient.get('/autoparts/part-profiles/facts').then(unwrap<PartFacts[]>),
  byProduct: (productId: string) => apiClient.get('/autoparts/part-profiles/by-product/' + productId).then(unwrap<PartProfile | null>),
};

// service-reminders.api.ts
export interface ServiceReminder {
  id: string;
  vehicleId: string;
  reminderType: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueOdometerKm?: number;
  status: string;
  sentAt?: string;
  acknowledgedAt?: string;
  doneAt?: string;
  autoCreated: boolean;
  fromJobId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderView = 'due' | 'overdue' | 'upcoming' | 'open' | 'done' | 'all';
export interface ReminderRow extends ServiceReminder {
  vehicle: { id: string; registrationNumber: string; makeName?: string | null; modelName?: string | null; ownerName?: string | null; ownerPhone?: string | null; customerId: string; odometerKm?: number | null; lastOdometerKm?: number | null } | null;
}
export interface ReminderPage { items: ReminderRow[]; total: number; page: number; limit: number; totalPages: number }
export interface ReminderStats { overdue: number; week: number; month: number; done: number }

export const serviceRemindersApi = {
  create: (data: { vehicleId: string; reminderType: string; title: string; description?: string; dueDate?: string; dueOdometerKm?: number; notes?: string }) =>
    apiClient.post('/autoparts/service-reminders', data).then(unwrap<ServiceReminder>),
  /** Plain list (dashboard). */
  list: (params?: { upcoming?: boolean; overdue?: boolean; vehicleId?: string }) => apiClient.get('/autoparts/service-reminders', { params }).then(unwrap<ReminderRow[]>),
  page: (params: { view?: ReminderView; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/autoparts/service-reminders', { params: { ...params, page: params.page ?? 1 } }).then(unwrap<ReminderPage>),
  stats: () => apiClient.get('/autoparts/service-reminders/stats').then(unwrap<ReminderStats>),
  updateStatus: (id: string, status: string) => apiClient.post('/autoparts/service-reminders/' + id + '/status', { status }).then(unwrap<ServiceReminder>),
  snooze: (id: string, until: string) => apiClient.post('/autoparts/service-reminders/' + id + '/snooze', { until }).then(unwrap<ServiceReminder>),
  autoGenerate: (vehicleId: string) => apiClient.post('/autoparts/service-reminders/auto-generate/' + vehicleId).then(unwrap<{ created: number }>),
};

// vehicle-makes.api.ts
export interface VehicleMake {
  id: string;
  name: string;
  country?: string | null;
  logoUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  _count?: { models: number };
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMakeInput { name?: string; country?: string; displayOrder?: number; isActive?: boolean }

export const vehicleMakesApi = {
  create: (data: VehicleMakeInput) => apiClient.post('/autoparts/vehicle-makes', data).then(unwrap<VehicleMake>),
  list: (params?: { search?: string; active?: boolean }) => apiClient.get('/autoparts/vehicle-makes', { params }).then(unwrap<VehicleMake[]>),
  seedPakistani: () => apiClient.post('/autoparts/vehicle-makes/seed-pakistani').then(unwrap<{ created: number; models: number; total: number }>),
  update: (id: string, data: VehicleMakeInput) => apiClient.patch('/autoparts/vehicle-makes/' + id, data).then(unwrap<VehicleMake>),
  remove: (id: string) => apiClient.delete('/autoparts/vehicle-makes/' + id).then(unwrap<VehicleMake>),
};

// vehicle-models.api.ts
export type VehicleType = 'CAR' | 'SUV' | 'VAN' | 'PICKUP' | 'TRUCK' | 'BUS'
  | 'MOTORCYCLE' | 'SCOOTER' | 'RICKSHAW' | 'TRACTOR' | 'BICYCLE' | 'ATV' | 'BOAT' | 'OTHER';

export interface VehicleModel {
  id: string;
  makeId: string;
  name: string;
  vehicleType: VehicleType;
  yearFrom?: number | null;
  yearTo?: number | null;
  engineOptions: string[];
  isActive: boolean;
  make?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleModelInput {
  makeId?: string; name?: string; vehicleType?: VehicleType; yearFrom?: number; yearTo?: number; engineOptions?: string[]; isActive?: boolean;
}

export const vehicleModelsApi = {
  create: (data: VehicleModelInput) => apiClient.post('/autoparts/vehicle-models', data).then(unwrap<VehicleModel>),
  list: (params?: { makeId?: string; vehicleType?: string; search?: string; active?: boolean }) =>
    apiClient.get('/autoparts/vehicle-models', { params }).then(unwrap<VehicleModel[]>),
  update: (id: string, data: VehicleModelInput) => apiClient.patch('/autoparts/vehicle-models/' + id, data).then(unwrap<VehicleModel>),
  remove: (id: string) => apiClient.delete('/autoparts/vehicle-models/' + id).then(unwrap<VehicleModel>),
};

// workshop-jobs.api.ts

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
  /** Old parts given back with this job; held ones without a bill go on the next hand-over bill. */
  coreReturns?: Array<{ id: string; description: string; value: number; status: string; saleId?: string | null }>;
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
  /** Old part the customer gives now; its value comes off the bill as a trade-in. */
  coreReturn?: { description: string; value: number };
}

const base = '/autoparts/workshop-jobs';

export const workshopJobsApi = {
  create: (data: JobCreateInput) => apiClient.post(base, data).then(unwrap<WorkshopJobDetail>),
  page: (params: JobListParams) => apiClient.get(base, { params: { ...params, page: params.page ?? 1 } }).then(unwrap<JobPage>),
  stats: (shopId?: string) => apiClient.get(`${base}/stats`, { params: { shopId } }).then(unwrap<JobStats>),
  getOne: (id: string) => apiClient.get(`${base}/${id}`).then(unwrap<WorkshopJobDetail>),
  /** The job behind each workshop bill, for links from sales history. */
  bySales: (saleIds: string[]) => apiClient.get(`${base}/by-sales`, { params: { ids: saleIds.join(',') } }).then(unwrap<Array<{ saleId: string; jobId: string; jobNumber: string }>>),
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

// core-returns.api.ts

/** An old part offered as a trade-in at checkout. */
export interface PosTradeIn { code: string; label: string; value: number }

export type CoreStatus = 'HELD' | 'SENT_TO_SUPPLIER' | 'SCRAPPED';
export type CoreView = CoreStatus | 'all';

/** An old part a customer gave back; its value was or will be taken off a bill as a trade-in. */
export interface CoreReturn {
  id: string;
  code: string;
  description: string;
  value: number;
  status: CoreStatus;
  createdAt: string;
  sale?: { id: string; saleNumber: string; status: string; customer?: { name: string } | null } | null;
  job?: { id: string; jobNumber: string; registrationNumber?: string | null; customerName?: string | null } | null;
  product?: { id: string; name: string } | null;
}

export interface CorePage {
  items: CoreReturn[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<CoreView, { count: number; value: number }>;
}

export interface CoreInput { description: string; value: number; productId?: string; jobId?: string }

const coreBase = '/autoparts/core-returns';

export const coreReturnsApi = {
  page: (params: { view?: CoreView; search?: string; page?: number; limit?: number }) => apiClient.get(coreBase, { params }).then(unwrap<CorePage>),
  tradeIns: () => apiClient.get(`${coreBase}/trade-ins`).then(unwrap<PosTradeIn[]>),
  create: (data: CoreInput) => apiClient.post(coreBase, data).then(unwrap<CoreReturn>),
  setStatus: (id: string, status: CoreStatus) => apiClient.patch(`${coreBase}/${id}/status`, { status }).then(unwrap<CoreReturn>),
};

// dashboard.api.ts
export const autoPartsDashboardApi = {
  overview: () => apiClient.get('/autoparts/dashboard/overview').then(unwrap<any>),
};
