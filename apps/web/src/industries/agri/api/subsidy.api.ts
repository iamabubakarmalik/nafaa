import { apiClient } from '@core/api/client';

export interface SubsidyClaim {
  id: string;
  claimNumber: string;
  farmerId: string;
  schemeName: string;
  govtScheme?: string;
  productType: string;
  quantity: number;
  originalPrice: number;
  subsidyAmount: number;
  finalPrice: number;
  farmerCnic?: string;
  cropTarget?: string;
  landAreaAcres?: number;
  documentsSubmitted: string[];
  approvedBy?: string;
  approvalDate?: string;
  disbursementDate?: string;
  status: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  farmer?: { id: string; fullName: string; phone: string; village?: string | null } | null;
}


export interface ClaimInput { farmerId: string; schemeName: string; govtScheme?: string; productType: string; quantity: number; originalPrice: number; subsidyAmount: number; farmerCnic?: string; cropTarget?: string; landAreaAcres?: number; documentsSubmitted?: string[]; notes?: string }

export interface SubsidyPage {
  items: SubsidyClaim[];
  total: number;
  page: number;
  limit: number;
  counts: Record<string, number>;
  amounts: Record<string, number>;
  analytics: { schemes: Array<{ scheme: string; claims: number; amount: number }> };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const subsidyApi = {
  create: (data: ClaimInput) => apiClient.post('/agri/subsidy', data).then(unwrap<SubsidyClaim>),
  list: (params?: { status?: string; farmerId?: string; search?: string }) => apiClient.get('/agri/subsidy', { params }).then(unwrap<SubsidyClaim[]>),
  page: (params: { status?: string; farmerId?: string; search?: string; page?: number; limit?: number }) => apiClient.get('/agri/subsidy/page', { params }).then(unwrap<SubsidyPage>),
  approve: (id: string, approvedBy?: string) => apiClient.post('/agri/subsidy/' + id + '/approve', { approvedBy }).then(unwrap<SubsidyClaim>),
  reject: (id: string, reason: string) => apiClient.post('/agri/subsidy/' + id + '/reject', { reason }).then(unwrap<SubsidyClaim>),
  disburse: (id: string) => apiClient.post('/agri/subsidy/' + id + '/disburse').then(unwrap<SubsidyClaim>),
};
