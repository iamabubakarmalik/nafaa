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
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const subsidyApi = {
  create: (data: any) => apiClient.post('/agri/subsidy', data).then(unwrap<SubsidyClaim>),
  list: (params?: any) => apiClient.get('/agri/subsidy', { params }).then(unwrap<SubsidyClaim[]>),
  summary: () => apiClient.get('/agri/subsidy/summary').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/agri/subsidy/' + id).then(unwrap<SubsidyClaim>),
  approve: (id: string, approvedBy?: string) => apiClient.post('/agri/subsidy/' + id + '/approve', { approvedBy }).then(unwrap<SubsidyClaim>),
  reject: (id: string, reason: string) => apiClient.post('/agri/subsidy/' + id + '/reject', { reason }).then(unwrap<SubsidyClaim>),
  disburse: (id: string) => apiClient.post('/agri/subsidy/' + id + '/disburse').then(unwrap<SubsidyClaim>),
};
