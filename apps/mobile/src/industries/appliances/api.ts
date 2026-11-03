/**
 * Appliance shop endpoints (same paths and shapes as
 * apps/web/src/industries/appliances/api): installations, repairs,
 * technicians, AMC contracts, heavy deliveries, the serial register,
 * warranty claims to the brand, old appliances taken in trade, qist plans
 * and the product profile. They need the server; screens show the last
 * saved data offline.
 */

import { apiClient } from '@/core/api/client';

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const put = <T>(path: string, body?: object) => apiClient.put<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

export interface Paged<T> { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }
/** The shape the shared paged-list hook reads. */
export const asPages = <T>(p: Paged<T>) => ({ items: p.items, page: p.meta.page, pages: Math.max(p.meta.totalPages, 1), total: p.meta.total });

/* ── Installations ── */

export type InstallStatus = 'PENDING' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'FAILED';
export type ServiceType = 'INSTALLATION' | 'DEMO' | 'INSPECTION' | 'REPAIR' | 'MAINTENANCE' | 'DEEP_CLEANING' | 'GAS_REFILL' | 'WARRANTY_CLAIM' | 'AMC_VISIT' | 'RELOCATION' | 'UNINSTALLATION' | 'OTHER';

export interface Installation {
  id: string; installationNumber: string; serialTrackingId?: string; saleId?: string; productId?: string; productName: string; serialNumber?: string;
  customerId?: string; customerName: string; customerPhone: string; customerAddress: string; city?: string; area?: string; landmark?: string;
  serviceType: ServiceType; status: InstallStatus; scheduledDate?: string; scheduledTimeSlot?: string;
  technicianId?: string; technicianName?: string; technicianPhone?: string; completedAt?: string; cancellationReason?: string;
  materialsCharge: number; laborCharge: number; visitCharge: number; totalCharge: number; paidByCustomer: number; covered_underWarranty: boolean;
  demoGiven: boolean; customerRating?: number; customerFeedback?: string; internalNotes?: string; createdAt: string;
  dueAmount?: number; isOverdue?: boolean; waitingDays?: number;
}
export interface InstallationDetail extends Installation {
  history: Array<{ id: string; installationNumber: string; productName: string; serviceType: ServiceType; status: InstallStatus; scheduledDate?: string; completedAt?: string; totalCharge: number; technicianName?: string }>;
  serial: { id: string; serialNumber: string; modelNumber?: string; status: string; warrantyStartDate?: string; warrantyEndDate?: string; compressorWarrantyEndDate?: string; motorWarrantyEndDate?: string } | null;
}
export interface InstallationSummary {
  pending: number; scheduled: number; inProgress: number; completed: number; cancelled: number; open: number; unassigned: number; overdue: number; todayJobs: number;
  month: { jobs: number; revenue: number; collected: number; outstanding: number; materialCost: number; profit: number; avgTicket: number; demosGiven: number; avgRating: number | null };
}
export interface InstallListParams { saleId?: string; status?: string; open?: boolean; serviceType?: string; technicianId?: string; customerId?: string; unpaidOnly?: boolean; from?: string; to?: string; search?: string; page?: number; limit?: number }

export const installationsApi = {
  create: (data: object) => post<Installation>('/appliances/installations', data),
  list: (params?: InstallListParams) => get<Paged<Installation>>('/appliances/installations', params),
  queue: () => get<Installation[]>('/appliances/installations/queue'),
  today: () => get<Installation[]>('/appliances/installations/today'),
  summary: () => get<InstallationSummary>('/appliances/installations/summary'),
  getOne: (id: string) => get<InstallationDetail>(`/appliances/installations/${id}`),
  assignTechnician: (id: string, data: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) => post<Installation>(`/appliances/installations/${id}/assign-technician`, data),
  updateStatus: (id: string, data: { status: InstallStatus; cancellationReason?: string; notes?: string }) => patch<Installation>(`/appliances/installations/${id}/status`, data),
  complete: (id: string, data: object) => post<Installation>(`/appliances/installations/${id}/complete`, data),
  reschedule: (id: string, data: { newDate: string; reason?: string }) => post<Installation>(`/appliances/installations/${id}/reschedule`, data),
  addPayment: (id: string, data: { amount: number; note?: string; paymentMethod?: string }) => post<Installation>(`/appliances/installations/${id}/payment`, data),
};

/* ── Repairs (service requests) ── */

export type ServiceStatus = 'REQUESTED' | 'SCHEDULED' | 'TECHNICIAN_ASSIGNED' | 'EN_ROUTE' | 'ON_SITE' | 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_PARTS' | 'CANCELLED' | 'UNRESOLVED';

export interface ServiceRequest {
  id: string; requestNumber: string; serialTrackingId?: string; serialNumber?: string; productId?: string; productName: string;
  customerId?: string; customerName: string; customerPhone: string; customerAddress: string; city?: string; area?: string;
  serviceType: ServiceType; status: ServiceStatus; priority: string; reportedIssue: string; issueCategory?: string; requestedAt: string;
  scheduledDate?: string; scheduledTimeSlot?: string; technicianId?: string; technicianName?: string; technicianPhone?: string; completedAt?: string;
  diagnosedIssue?: string; workDone?: string; visitCharge: number; laborCharge: number; partsCharge: number; totalCharge: number; paidAmount: number;
  coveredUnderWarranty: boolean; coveredUnderAmc: boolean; warrantyClaimNumber?: string; amcContractNumber?: string;
  requiresFollowUp: boolean; followUpDate?: string; customerRating?: number; internalNotes?: string; createdAt: string;
  dueAmount?: number; isOverdue?: boolean; waitingHours?: number;
}
export interface ServiceRequestDetail extends ServiceRequest {
  history: Array<{ id: string; requestNumber: string; productName: string; serviceType: ServiceType; status: ServiceStatus; reportedIssue: string; workDone?: string; requestedAt: string; completedAt?: string; totalCharge: number; paidAmount: number; technicianName?: string }>;
  amc: { id: string; contractNumber: string; amcType: string; status: string; expiryDate: string; freeVisitsAllowed: number; freeVisitsUsed: number } | null;
}
export interface ServiceSummary {
  requested: number; scheduled: number; inProgress: number; completed: number; unresolved: number; pendingFollowUps: number; pendingParts: number; cancelled: number;
  open: number; unassigned: number; overdue: number; urgent: number; completedToday: number;
  month: { jobs: number; revenue: number; collected: number; outstanding: number; partsCost: number; profit: number; avgTicket: number; avgResolutionHours: number; avgRating: number | null };
}
export interface ServiceListParams { status?: string; open?: boolean; serviceType?: string; technicianId?: string; customerId?: string; priority?: string; coveredUnderWarranty?: boolean; coveredUnderAmc?: boolean; unpaidOnly?: boolean; from?: string; to?: string; search?: string; page?: number; limit?: number }

export const serviceRequestsApi = {
  create: (data: object) => post<ServiceRequest>('/appliances/service-requests', data),
  list: (params?: ServiceListParams) => get<Paged<ServiceRequest>>('/appliances/service-requests', params),
  queue: () => get<ServiceRequest[]>('/appliances/service-requests/queue'),
  summary: () => get<ServiceSummary>('/appliances/service-requests/summary'),
  getOne: (id: string) => get<ServiceRequestDetail>(`/appliances/service-requests/${id}`),
  assignTechnician: (id: string, data: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) => post<ServiceRequest>(`/appliances/service-requests/${id}/assign-technician`, data),
  updateStatus: (id: string, data: { status: ServiceStatus; notes?: string }) => patch<ServiceRequest>(`/appliances/service-requests/${id}/status`, data),
  complete: (id: string, data: object) => post<ServiceRequest>(`/appliances/service-requests/${id}/complete`, data),
  addPayment: (id: string, data: { amount: number; note?: string; paymentMethod?: string }) => post<ServiceRequest>(`/appliances/service-requests/${id}/payment`, data),
  cancel: (id: string, data?: { reason?: string }) => post<ServiceRequest>(`/appliances/service-requests/${id}/cancel`, data ?? {}),
};

/* ── Technicians ── */

export interface Technician {
  id: string; employeeCode: string; name: string; phone: string; cnic?: string; address?: string; specializations: string[]; brandsExpertise: string[];
  categoriesExpertise: string[]; experienceYears?: number; certifications: string[]; workingDays: number[]; workStartTime: string; workEndTime: string;
  currentZone?: string; visitChargeRate: number; hourlyRate: number; commissionPct: number; totalJobs: number; completedJobs: number; totalRevenue: number;
  totalCommission: number; avgRating?: number; totalReviews: number; isActive: boolean; notes?: string;
}
export interface TechnicianRow extends Technician { openServices: number; openInstallations: number; openJobs: number; completionRate: number }
export interface TechnicianSummary {
  total: number; active: number; inactive: number; free: number; overloaded: number; openJobs: number; avgTeamRating: number | null;
  month: { jobs: number; revenue: number; commission: number };
  leaderboard: Array<{ id: string; name: string; isActive: boolean; zone: string | null; avgRating: number | null; totalReviews: number; openJobs: number; monthJobs: number; monthRevenue: number; monthCommission: number; lifetimeRevenue: number; completionRate: number }>;
}
export interface TechnicianDetail extends Technician {
  recentJobs: Array<{ id: string; installationNumber?: string; productName?: string; status?: string; totalCharge?: number; customerName?: string }>;
  recentServices: Array<{ id: string; requestNumber?: string; productName?: string; status?: string; totalCharge?: number; customerName?: string; reportedIssue?: string }>;
  activeServiceRequests: Array<{ id: string; requestNumber?: string; productName?: string; status?: string; customerName?: string }>;
  openJobs: number; completionRate: number;
  month: { jobs: number; revenue: number; cost: number; profit: number; commission: number; avgRating: number | null; avgResolutionHours: number };
}
export type TechnicianInput = Partial<Omit<Technician, 'id' | 'employeeCode' | 'totalJobs' | 'completedJobs' | 'totalRevenue' | 'totalCommission' | 'avgRating' | 'totalReviews'>>;

export const techniciansApi = {
  create: (data: TechnicianInput) => post<Technician>('/appliances/technicians', data),
  list: (params?: { active?: boolean; zone?: string; category?: string; brand?: string; search?: string }) => get<TechnicianRow[]>('/appliances/technicians', params),
  summary: () => get<TechnicianSummary>('/appliances/technicians/summary'),
  getOne: (id: string) => get<TechnicianDetail>(`/appliances/technicians/${id}`),
  update: (id: string, data: TechnicianInput) => patch<Technician>(`/appliances/technicians/${id}`, data),
  remove: (id: string) => del<unknown>(`/appliances/technicians/${id}`),
};

/* ── AMC contracts ── */

export type AmcType = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'COMPREHENSIVE';
export type AmcStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'RENEWED' | 'SUSPENDED';

export interface AmcContract {
  id: string; contractNumber: string; amcType: AmcType; status: AmcStatus; customerId?: string; customerName: string; customerPhone: string; customerAddress?: string;
  productId?: string; productName?: string; serialNumber?: string; serialTrackingId?: string; startDate: string; expiryDate: string; durationMonths: number;
  contractValue: number; paidAmount: number; freeVisitsAllowed: number; freeVisitsUsed: number; freePartsAllowed: boolean; laborCovered: boolean; gasRefillCovered: boolean;
  exclusions?: string; autoRenew: boolean; notes?: string; totalVisitsUsed: number; totalLaborSaved: number;
  relatedRequests?: Array<{ id: string; requestNumber: string; status: string; reportedIssue?: string; requestedAt?: string }>;
  computed?: { daysRemaining: number; visitsRemaining: number; isExpired: boolean; isExpiringSoon: boolean };
}
export interface AmcSummary {
  active: number; expiringSoon: number; expired: number; cancelled: number; totalContractValue: number; totalCollected: number; renewed: number; suspended: number;
  pendingAmount: number; staleActive: number; visitsExhausted: number; autoRenewCount: number; customerSaved: number;
  month: { newContracts: number; billed: number; collected: number };
  byType: Array<{ type: string; count: number; value: number; collected: number }>;
  expiringList: Array<{ id: string; contractNumber: string; amcType: string; customerName: string; customerPhone: string; expiryDate: string; contractValue: number; paidAmount: number; freeVisitsAllowed: number; freeVisitsUsed: number; daysLeft: number; visitsLeft: number; pending: number; autoRenew: boolean }>;
}

export const amcContractsApi = {
  create: (data: object) => post<AmcContract>('/appliances/amc-contracts', data),
  list: (params?: { status?: string; amcType?: string; customerId?: string; expiringSoon?: boolean; expired?: boolean; search?: string }) => get<AmcContract[]>('/appliances/amc-contracts', params),
  summary: () => get<AmcSummary>('/appliances/amc-contracts/summary'),
  getOne: (id: string) => get<AmcContract>(`/appliances/amc-contracts/${id}`),
  update: (id: string, data: object) => patch<AmcContract>(`/appliances/amc-contracts/${id}`, data),
  updateStatus: (id: string, data: { status: AmcStatus; reason?: string }) => patch<AmcContract>(`/appliances/amc-contracts/${id}/status`, data),
  renew: (id: string, data: { durationMonths: number; contractValue: number; paidAmount?: number; paymentMethod?: string; freeVisitsAllowed?: number }) => post<AmcContract>(`/appliances/amc-contracts/${id}/renew`, data),
  addPayment: (id: string, data: { amount: number; paymentMethod?: string; note?: string }) => post<AmcContract>(`/appliances/amc-contracts/${id}/payment`, data),
  sendReminder: (id: string) => post<AmcContract>(`/appliances/amc-contracts/${id}/send-reminder`),
};

/* ── Deliveries ── */

export interface ApplianceDelivery {
  id: string; deliveryNumber: string; saleId?: string; serialTrackingIds: string[]; customerId?: string; customerName: string; customerPhone: string;
  deliveryAddress: string; city?: string; area?: string; landmark?: string; floorNumber?: number; hasLift?: boolean; scheduledDate?: string; scheduledSlot?: string;
  vehicleNumber?: string; driverName?: string; driverPhone?: string; helperCount?: number; dispatchedAt?: string; deliveredAt?: string; status: string;
  deliveryCharge: number; loadingCharge: number; unloadingCharge: number; floorCharge: number; totalCharge: number; requiresInstallation: boolean;
  receivedByName?: string; notes?: string; paidAmount?: number; dueAmount?: number;
}
export type DeliveryView = 'open' | 'today' | 'novehicle' | 'late' | 'unpaid' | 'delivered' | 'closed' | 'all';
export interface DeliveryPage { items: ApplianceDelivery[]; total: number; page: number; limit: number; totalPages: number; totals: { charges: number } }
export interface DeliveryDetail extends ApplianceDelivery {
  serials?: Array<{ id: string; serialNumber: string; modelNumber?: string | null; productId: string; status: string }>;
  installation?: { id: string; installationNumber: string; status: string; scheduledDate?: string | null } | null;
  sale?: { id: string; saleNumber: string; total: number } | null;
  chargedAtCounter?: boolean;
}
export interface DeliverySummary {
  pending: number; scheduled: number; dispatched: number; delivered: number; todayScheduled: number; arrived: number; cancelled: number; open: number;
  noVehicle: number; overdue: number; installationPending: number;
  month: { trips: number; revenue: number; avgTrip: number; breakdown: { delivery: number; loading: number; unloading: number; floor: number } };
}

export const deliveriesApi = {
  /** Deliveries made for one bill. */
  list: (params: { saleId: string }) => get<ApplianceDelivery[]>('/appliances/deliveries', params),
  create: (data: object) => post<ApplianceDelivery>('/appliances/deliveries', data),
  page: (params: { view?: DeliveryView; search?: string; from?: string; to?: string; page: number; limit?: number }) => get<DeliveryPage>('/appliances/deliveries', params),
  summary: () => get<DeliverySummary>('/appliances/deliveries/summary'),
  getOne: (id: string) => get<DeliveryDetail>(`/appliances/deliveries/${id}`),
  updateStatus: (id: string, data: { status: string; notes?: string }) => patch<ApplianceDelivery>(`/appliances/deliveries/${id}/status`, data),
  assignVehicle: (id: string, data: { vehicleNumber: string; driverName: string; driverPhone?: string; helperCount?: number; scheduledDate?: string; scheduledSlot?: string }) => post<ApplianceDelivery>(`/appliances/deliveries/${id}/assign-vehicle`, data),
  confirm: (id: string, data: { receivedByName?: string; receivedByCnic?: string; paidAmount?: number; paymentMethod?: string }) => post<ApplianceDelivery>(`/appliances/deliveries/${id}/confirm`, data),
  addPayment: (id: string, data: { amount: number; paymentMethod?: string; note?: string }) => post<ApplianceDelivery>(`/appliances/deliveries/${id}/payment`, data),
};

/* ── Serial register ── */

export interface ApplianceSerial {
  id: string; productId: string; shopId?: string | null; shopName?: string | null; serialNumber: string; modelNumber?: string; batchNumber?: string; status: string;
  purchasePrice?: number; purchaseDate?: string; supplierRef?: string; soldPrice?: number; soldAt?: string; soldToCustomerId?: string; customerName?: string; customerPhone?: string;
  saleId?: string; invoiceNumber?: string; deliveryAddress?: string; installationRequired: boolean; installationStatus: string; installedAt?: string;
  warrantyStartDate?: string; warrantyEndDate?: string; compressorWarrantyEndDate?: string; motorWarrantyEndDate?: string; shopWarrantyEndDate?: string | null; notes?: string;
  product?: { id: string; name: string; sku: string | null; price: number; costPrice: number; unit: string; categoryType: string | null; brand: string | null; modelNumber: string | null; capacity: string | null; warrantyMonths: number | null; shopWarrantyMonths: number | null; requiresInstallation: boolean; installationCharge: number } | null;
  warranty?: { mainDaysLeft: number | null; compressorDaysLeft: number | null; motorDaysLeft: number | null; shopDaysLeft: number | null; isUnderWarranty: boolean; soonestKind: string | null; soonestDays: number | null };
}
export interface ApplianceSerialDetail extends ApplianceSerial {
  installations: Array<{ id: string; installationNumber: string; serviceType: string; status: string; scheduledDate?: string; completedAt?: string; technicianName?: string; totalCharge: number }>;
  services: Array<{ id: string; requestNumber: string; serviceType: string; status: string; reportedIssue: string; workDone?: string; requestedAt: string; completedAt?: string; technicianName?: string; totalCharge: number; coveredUnderWarranty: boolean }>;
  serviceCost: number;
}
export interface SerialWarrantyCheck {
  found: boolean; serial?: ApplianceSerial;
  warranty?: { isValid: boolean; endDate: string | null; daysRemaining: number; compressorValid: boolean; compressorEndDate: string | null; compressorDaysRemaining: number | null; motorValid: boolean; motorEndDate: string | null; motorDaysRemaining: number | null; shopValid: boolean; shopEndDate: string | null; shopDaysRemaining: number | null; soonestKind: string | null; soonestDays: number | null };
  amc?: { id: string; contractNumber: string; amcType: string; expiryDate: string; freeVisitsAllowed: number; freeVisitsUsed: number; visitsLeft: number; laborCovered: boolean; freePartsAllowed: boolean; gasRefillCovered: boolean } | null;
}
export interface SerialSummary {
  total: number; byStatus: Record<string, number>; inStock: { units: number; value: number }; sold: { units: number; revenue: number; cost: number; profit: number };
  installation: Record<string, number>; warrantyExpiringSoon: number;
}
export interface CounterUnit { id: string; productId: string; serialNumber: string; modelNumber?: string | null; batchNumber?: string | null; purchaseDate?: string | null; createdAt: string }
export interface SerialBranches {
  shops: Array<{ id: string; name: string; isMain: boolean }>;
  transfers: Array<{ id: string; transferNumber: string; fromShopId: string; toShopId: string; receivedAt: string; fromShop: { name: string }; toShop: { name: string }; items: Array<{ productId: string; receivedQty: number }> }>;
}

export const applianceSerialApi = {
  create: (data: object) => post<ApplianceSerial>('/appliances/serial-tracking', data),
  bulkCreate: (data: { productId: string; serialNumbers: string[]; modelNumber?: string; batchNumber?: string; purchasePrice?: number; purchaseDate?: string; supplierRef?: string; shopId?: string }) =>
    post<{ created: number; skipped: number; skippedSerials: string[]; message: string }>('/appliances/serial-tracking/bulk', data),
  list: (params?: { productId?: string; status?: string; installationStatus?: string; warranty?: 'active' | 'expiring' | 'expired'; search?: string; page?: number; limit?: number }) => get<Paged<ApplianceSerial>>('/appliances/serial-tracking', params),
  summary: () => get<SerialSummary>('/appliances/serial-tracking/summary'),
  lookup: (code: string) => get<ApplianceSerial | null>(`/appliances/serial-tracking/lookup/${encodeURIComponent(code)}`),
  warrantyCheck: (code: string) => get<SerialWarrantyCheck>(`/appliances/serial-tracking/warranty-check/${encodeURIComponent(code)}`),
  getOne: (id: string) => get<ApplianceSerialDetail>(`/appliances/serial-tracking/${id}`),
  update: (id: string, data: object) => patch<ApplianceSerial>(`/appliances/serial-tracking/${id}`, data),
  remove: (id: string) => del<{ message: string }>(`/appliances/serial-tracking/${id}`),
  forSale: (saleId: string) => get<ApplianceSerial[]>(`/appliances/serial-tracking/for-sale/${saleId}`),
  counter: (productId?: string) => get<CounterUnit[]>('/appliances/serial-tracking/counter', productId ? { productId } : undefined),
  counterLookup: (code: string) => get<{ id: string; productId: string; serialNumber: string; status: string; invoiceNumber?: string | null; otherBranch: string | null } | null>(`/appliances/serial-tracking/counter/lookup/${encodeURIComponent(code)}`),
  branches: () => get<SerialBranches>('/appliances/serial-tracking/branches'),
  move: (data: { serialIds?: string[]; serialNumbers?: string[]; transferId?: string; toShopId?: string }) => post<{ moved: number; message: string }>('/appliances/serial-tracking/move', data),
  assignSale: (saleId: string, serialIds: string[]) => post<unknown>('/appliances/serial-tracking/assign-sale', { saleId, units: serialIds.map((serialId) => ({ serialId })) }),
};

/* ── Warranty claims to the brand ── */

export type ClaimStatus = 'DRAFT' | 'SUBMITTED' | 'BRAND_REVIEWING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'SETTLED';

export interface WarrantyClaim {
  id: string; claimNumber: string; serialTrackingId?: string | null; serialNumber?: string | null; productId?: string | null; productName: string; brandId?: string | null; brandName?: string | null;
  modelNumber?: string | null; serviceRequestNumber?: string | null; customerName: string; customerPhone?: string | null; purchaseDate?: string | null; invoiceNumber?: string | null;
  claimDate: string; issue: string; warrantyKind?: string | null; status: ClaimStatus; brandRef?: string | null; brandContact?: string | null; brandResponse?: string | null;
  partsCost: number; laborCost: number; otherCost: number; claimedAmount: number; approvedAmount: number; receivedAmount: number; settledAt?: string | null;
  rejectionReason?: string | null; replacementSerialNumber?: string | null; notes?: string | null; pendingAmount?: number; shortfall?: number; ageDays?: number;
}
export interface WarrantyClaimDetail extends WarrantyClaim {
  service: { id: string; requestNumber: string; reportedIssue: string; diagnosedIssue?: string | null; workDone?: string | null; technicianName?: string | null; partsCharge: number; laborCharge: number; visitCharge: number; totalCharge: number } | null;
  serial: { id: string; serialNumber: string; modelNumber?: string | null; soldAt?: string | null; warrantyEndDate?: string | null; compressorWarrantyEndDate?: string | null; motorWarrantyEndDate?: string | null } | null;
  brandHistory: Array<{ id: string; claimNumber: string; productName: string; status: ClaimStatus; claimDate: string; claimedAmount: number; receivedAmount: number }>;
}
export interface ClaimSummary {
  total: number; byStatus: Record<string, number>; draft: number; submitted: number; reviewing: number; approved: number; rejected: number; settled: number; open: number;
  money: { claimed: number; approved: number; received: number; pending: number; shortfall: number; recoveryRate: number };
  stale: number; avgSettleDays: number; month: { claims: number; claimed: number; received: number };
  byBrand: Array<{ brand: string; claims: number; claimed: number; received: number; recoveryRate: number }>;
  missing: { count: number; recoverable: number };
}
export interface MissingClaim { id: string; requestNumber: string; productName: string; serialNumber?: string | null; customerName: string; customerPhone: string; completedAt?: string | null; reportedIssue: string; recoverable: number; ageDays: number }

export const warrantyClaimsApi = {
  create: (data: object) => post<WarrantyClaim>('/appliances/warranty-claims', data),
  fromService: (serviceRequestId: string) => post<WarrantyClaim>(`/appliances/warranty-claims/from-service/${serviceRequestId}`),
  list: (params?: { status?: string; open?: boolean; brandId?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }) => get<Paged<WarrantyClaim>>('/appliances/warranty-claims', params),
  summary: () => get<ClaimSummary>('/appliances/warranty-claims/summary'),
  missing: () => get<{ items: MissingClaim[]; totalRecoverable: number }>('/appliances/warranty-claims/missing'),
  getOne: (id: string) => get<WarrantyClaimDetail>(`/appliances/warranty-claims/${id}`),
  update: (id: string, data: object) => patch<WarrantyClaim>(`/appliances/warranty-claims/${id}`, data),
  submit: (id: string, data?: { brandRef?: string; brandContact?: string; notes?: string }) => post<WarrantyClaim>(`/appliances/warranty-claims/${id}/submit`, data ?? {}),
  brandResponse: (id: string, data: { status: ClaimStatus; approvedAmount?: number; brandResponse?: string; rejectionReason?: string; replacementSerialNumber?: string }) => post<WarrantyClaim>(`/appliances/warranty-claims/${id}/brand-response`, data),
  settle: (id: string, data: { receivedAmount: number; paymentMethod?: string; notes?: string }) => post<WarrantyClaim>(`/appliances/warranty-claims/${id}/settle`, data),
  remove: (id: string) => del<{ message: string }>(`/appliances/warranty-claims/${id}`),
};

/* ── Old appliances taken in trade ── */

export type TradeInStatus = 'HELD' | 'SOLD' | 'SCRAPPED' | 'RETURNED';
export type TradeInView = TradeInStatus | 'all';
export type TradeInCondition = 'WORKING' | 'NEEDS_REPAIR' | 'SCRAP';

export interface ApplianceTradeIn {
  id: string; code: string; description: string; brand?: string | null; model?: string | null; condition?: TradeInCondition | null; value: number; status: TradeInStatus;
  saleId?: string | null; customerId?: string | null; createdAt: string;
  sale?: { id: string; saleNumber: string; status: string } | null; customer?: { id: string; name: string; phone?: string | null } | null;
  resale?: { id: string; saleNumber: string; total: number; createdAt: string } | null;
}
export interface TradeInPage { items: ApplianceTradeIn[]; total: number; page: number; limit: number; totalPages: number; counts: Record<TradeInView, { count: number; value: number }> }
export interface TradeInInput { description: string; brand?: string; model?: string; condition?: TradeInCondition; value: number; customerId?: string }

export const tradeInsApi = {
  /** Held units the counter can take toward a bill. */
  counter: () => get<Array<{ code: string; label: string; value: number }>>('/appliances/trade-ins/counter'),
  page: (params: { view?: TradeInView; search?: string; page?: number; limit?: number }) => get<TradeInPage>('/appliances/trade-ins', params),
  create: (data: TradeInInput) => post<ApplianceTradeIn>('/appliances/trade-ins', data),
  update: (id: string, data: Partial<Omit<TradeInInput, 'customerId'>>) => patch<ApplianceTradeIn>(`/appliances/trade-ins/${id}`, data),
  setStatus: (id: string, status: Exclude<TradeInStatus, 'SOLD'>) => patch<ApplianceTradeIn>(`/appliances/trade-ins/${id}/status`, { status }),
  sell: (id: string, data: { price: number; paymentMethod?: string; buyer?: string }) => post<{ saleId: string | null; saleNumber: string | null }>(`/appliances/trade-ins/${id}/sell`, data),
};

/* ── Qist plans ── */

export interface QistGuarantor { guarantorName: string; guarantorPhone?: string; guarantorCnic: string; guarantorAddress?: string }
export interface QistPlanInput {
  saleId: string; customerId: string; customerName: string; customerPhone?: string; totalAmount: number; downPayment: number; installmentCount: number; startDate: string; notes?: string;
}
export interface QistPlan extends Partial<QistGuarantor> {
  id: string; planNumber: string; status: string; customerName?: string; customerPhone?: string; totalAmount?: number; downPayment?: number; financedAmount?: number;
  installmentCount?: number; paidAmount?: number; remainingAmount?: number; startDate?: string;
  customer?: { id?: string; name?: string; phone?: string | null };
  installments?: Array<{ id: string; installmentNumber: number; dueDate: string; amount: number; paidAmount?: number; status?: string }>;
}

export const qistApi = {
  create: (data: QistPlanInput) => post<{ id: string; planNumber: string }>('/emi-plans', data),
  getPlan: (id: string) => get<QistPlan>(`/emi-plans/${id}`),
  setGuarantor: (planId: string, data: QistGuarantor) => put<QistGuarantor & { id: string; planNumber: string }>(`/appliances/qist-plans/${planId}/guarantor`, data),
};

/* ── Product profile ── */

export interface ApplianceProfile {
  id: string; productId: string; brandId?: string; categoryType?: string; modelNumber?: string; modelYear?: number; colorName?: string; capacity?: string; powerConsumption?: string;
  voltage?: string; weightKg?: number; dimensions?: string; energyRating?: string; isInverter: boolean; acTonnage?: string; refrigerantType?: string; fridgeCapacityLiters?: number;
  doorCount?: number; washingCapacityKg?: number; screenSizeInch?: number; resolution?: string; warrantyMonths: number; compressorWarrantyMonths?: number; motorWarrantyMonths?: number;
  warrantyType?: string; shopWarrantyMonths?: number | null; requiresInstallation: boolean; installationCharge: number; installationCovered: boolean; installationTimeHours?: number;
  requiresPlumbing: boolean; requiresGasConnection: boolean; requiresElectrician: boolean; requiresLargeVehicle: boolean; freeDelivery: boolean; features: string[];
  mrp?: number; cashDiscount: number; requiresSerial: boolean; isFeatured: boolean; isBestSeller: boolean; isNewArrival: boolean; notes?: string;
  brand?: { id: string; name: string } | null;
}

export const applianceProductsApi = {
  upsert: (data: Partial<ApplianceProfile> & { productId: string }) => post<ApplianceProfile>('/appliances/products', data),
  list: () => get<ApplianceProfile[]>('/appliances/products'),
  byProduct: (productId: string) => get<ApplianceProfile | null>(`/appliances/products/by-product/${productId}`),
};

/* ── Profit by stream (dashboard) ── */

export interface AppliancesProfit {
  totals?: { revenue: number; profit: number; margin: number };
  streams?: Array<{ key: string; label?: string; revenue: number; profit?: number }>;
}
export const appliancesAnalyticsApi = { profit: (params: { from?: string; to?: string }) => get<AppliancesProfit>('/appliances/analytics/profit', params) };
