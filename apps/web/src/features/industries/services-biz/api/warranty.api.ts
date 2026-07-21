import { apiClient } from '@/api/client';

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  originalJobId?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  claimType: string;
  claimDate: string;
  issueDescription: string;
  originalServiceDate?: string;
  warrantyExpiryDate?: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  newJobId?: string;
  resolutionType?: string;
  resolutionNotes?: string;
  costToCompany: number;
  refundAmount: number;
  photoUrls: string[];
  documentUrls: string[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const warrantyApi = {
  createClaim: (data: any) => apiClient.post('/services-biz/warranty/claims', data).then(unwrap<WarrantyClaim>),
  listClaims: (params?: any) => apiClient.get('/services-biz/warranty/claims', { params }).then(unwrap<WarrantyClaim[]>),
  getClaim: (id: string) => apiClient.get('/services-biz/warranty/claims/' + id).then(unwrap<WarrantyClaim>),
  approve: (id: string, resolutionType: string, notes?: string) =>
    apiClient.post('/services-biz/warranty/claims/' + id + '/approve', { resolutionType, notes }).then(unwrap<WarrantyClaim>),
  reject: (id: string, reason: string) =>
    apiClient.post('/services-biz/warranty/claims/' + id + '/reject', { reason }).then(unwrap<WarrantyClaim>),
  createJob: (id: string) => apiClient.post('/services-biz/warranty/claims/' + id + '/create-job').then(unwrap<any>),
};
