import { apiClient } from '@core/api/client';
import type { JobStatus } from './jobs.api';

export type ClaimStatus = 'SUBMITTED' | 'APPROVED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type Resolution = 'REPAIR' | 'REPLACE' | 'REFUND' | 'NO_FAULT';
interface JobRef { id: string; jobNumber: string; serviceName: string; status: JobStatus; brand?: string | null; modelNumber?: string | null }

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  originalJobId?: string | null;
  customerName: string;
  customerPhone: string;
  issueDescription: string;
  claimDate: string;
  originalServiceDate?: string | null;
  warrantyExpiryDate?: string | null;
  status: ClaimStatus;
  resolutionType?: Resolution | null;
  resolutionNotes?: string | null;
  rejectionReason?: string | null;
  costToCompany: number;
  newJobId?: string | null;
  originalJob: JobRef | null;
  newJob: JobRef | null;
}

export interface WarrantyJob {
  id: string; jobNumber: string; serviceName: string; customerName?: string | null; customerPhone?: string | null; brand?: string | null;
  modelNumber?: string | null; serialNumber?: string | null; completedAt?: string | null; jobWarrantyDays: number; jobWarrantyExpiryDate: string;
  jobWarrantyTerms?: string | null; totalCharge: number;
}

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;
const base = '/services-biz/warranty';

export const warrantyApi = {
  register: (search?: string) => apiClient.get(`${base}/register`, { params: { search } }).then(unwrap<WarrantyJob[]>),
  claims: (params?: { status?: ClaimStatus; search?: string }) => apiClient.get(`${base}/claims`, { params }).then(unwrap<WarrantyClaim[]>),
  create: (data: { originalJobId?: string; customerName?: string; customerPhone?: string; issueDescription: string; allowExpired?: boolean }) =>
    apiClient.post(`${base}/claims`, data).then(unwrap<WarrantyClaim>),
  approve: (id: string, resolutionType: Resolution, notes?: string) => apiClient.post(`${base}/claims/${id}/approve`, { resolutionType, notes }).then(unwrap<WarrantyClaim>),
  reject: (id: string, reason: string) => apiClient.post(`${base}/claims/${id}/reject`, { reason }).then(unwrap<WarrantyClaim>),
};
