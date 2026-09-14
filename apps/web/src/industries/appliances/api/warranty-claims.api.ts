import { apiClient } from '@core/api/client';

/**
 * Brand se paisa wapas lene ka record.
 * Backend: apps/api/src/industries/appliances/warranty-claims/
 */

export type ApplianceClaimStatus =
  | 'DRAFT' | 'SUBMITTED' | 'BRAND_REVIEWING'
  | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'SETTLED';

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  serialTrackingId?: string | null;
  serialNumber?: string | null;
  productId?: string | null;
  productName: string;
  brandId?: string | null;
  brandName?: string | null;
  modelNumber?: string | null;
  serviceRequestId?: string | null;
  serviceRequestNumber?: string | null;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  purchaseDate?: string | null;
  invoiceNumber?: string | null;
  claimDate: string;
  issue: string;
  issueCategory?: string | null;
  /** MAIN / COMPRESSOR / MOTOR */
  warrantyKind?: string | null;
  status: ApplianceClaimStatus;
  submittedAt?: string | null;
  brandRef?: string | null;
  brandContact?: string | null;
  brandRespondedAt?: string | null;
  brandResponse?: string | null;
  partsCost: number;
  laborCost: number;
  otherCost: number;
  claimedAmount: number;
  approvedAmount: number;
  receivedAmount: number;
  settledAt?: string | null;
  rejectionReason?: string | null;
  replacementSerialNumber?: string | null;
  documentUrls: string[];
  imageUrls: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;

  /** Backend se computed */
  pendingAmount?: number;
  shortfall?: number;
  ageDays?: number;
}

export interface WarrantyClaimDetail extends WarrantyClaim {
  service: {
    id: string; requestNumber: string; serviceType: string; status: string;
    reportedIssue: string; diagnosedIssue?: string | null; workDone?: string | null;
    partsReplaced?: any; technicianName?: string | null;
    requestedAt: string; completedAt?: string | null;
    visitCharge: number; laborCharge: number; partsCharge: number; totalCharge: number;
  } | null;
  serial: {
    id: string; serialNumber: string; modelNumber?: string | null;
    soldAt?: string | null; invoiceNumber?: string | null;
    warrantyEndDate?: string | null;
    compressorWarrantyEndDate?: string | null;
    motorWarrantyEndDate?: string | null;
  } | null;
  brandHistory: Array<{
    id: string; claimNumber: string; productName: string; status: ApplianceClaimStatus;
    claimDate: string; claimedAmount: number; receivedAmount: number; settledAt?: string | null;
  }>;
}

export interface ClaimSummary {
  total: number;
  byStatus: Record<string, number>;
  draft: number; submitted: number; reviewing: number;
  approved: number; rejected: number; settled: number; open: number;
  money: {
    claimed: number; approved: number; received: number;
    /** Brand ke paas atka hua paisa */
    pending: number;
    /** Brand ne jitna kaat diya */
    shortfall: number;
    recoveryRate: number;
  };
  /** 30 din se latke claims */
  stale: number;
  avgSettleDays: number;
  month: { claims: number; claimed: number; received: number };
  byBrand: { brand: string; claims: number; claimed: number; received: number; recoveryRate: number }[];
  /** Jin repairs ka claim banaya hi nahi gaya */
  missing: { count: number; recoverable: number };
}

export interface MissingClaim {
  id: string;
  requestNumber: string;
  productName: string;
  serialNumber?: string | null;
  customerName: string;
  customerPhone: string;
  completedAt?: string | null;
  partsCharge: number;
  laborCharge: number;
  visitCharge: number;
  totalCharge: number;
  issueCategory?: string | null;
  reportedIssue: string;
  technicianName?: string | null;
  /** Brand se jitna wapas mil sakta hai */
  recoverable: number;
  ageDays: number;
}

export interface Paged<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const warrantyClaimsApi = {
  create: (data: any) =>
    apiClient.post('/appliances/warranty-claims', data).then(unwrap<WarrantyClaim>),

  /** Mukammal warranty repair se claim khud bhar kar banayein */
  fromService: (serviceRequestId: string) =>
    apiClient.post(`/appliances/warranty-claims/from-service/${serviceRequestId}`).then(unwrap<WarrantyClaim>),

  list: (params?: {
    status?: string; open?: boolean; brandId?: string;
    search?: string; from?: string; to?: string; page?: number; limit?: number;
  }) => apiClient.get('/appliances/warranty-claims', { params }).then(unwrap<Paged<WarrantyClaim>>),

  summary: () =>
    apiClient.get('/appliances/warranty-claims/summary').then(unwrap<ClaimSummary>),

  /** Jin warranty repairs ka claim banaya hi nahi gaya — zaya hota paisa */
  missing: () =>
    apiClient.get('/appliances/warranty-claims/missing')
      .then(unwrap<{ items: MissingClaim[]; totalRecoverable: number }>),

  getOne: (id: string) =>
    apiClient.get(`/appliances/warranty-claims/${id}`).then(unwrap<WarrantyClaimDetail>),

  update: (id: string, data: any) =>
    apiClient.patch(`/appliances/warranty-claims/${id}`, data).then(unwrap<WarrantyClaim>),

  submit: (id: string, data?: { brandRef?: string; brandContact?: string; notes?: string }) =>
    apiClient.post(`/appliances/warranty-claims/${id}/submit`, data ?? {}).then(unwrap<WarrantyClaim>),

  brandResponse: (id: string, data: {
    status: ApplianceClaimStatus; approvedAmount?: number;
    brandResponse?: string; rejectionReason?: string; replacementSerialNumber?: string;
  }) => apiClient.post(`/appliances/warranty-claims/${id}/brand-response`, data).then(unwrap<WarrantyClaim>),

  settle: (id: string, data: { receivedAmount: number; notes?: string }) =>
    apiClient.post(`/appliances/warranty-claims/${id}/settle`, data).then(unwrap<WarrantyClaim>),

  remove: (id: string) =>
    apiClient.delete(`/appliances/warranty-claims/${id}`).then(unwrap<{ message: string }>),
};
