import { apiClient } from '@core/api/client';

export interface CropAdvisory {
  id: string;
  advisoryNumber: string;
  farmerId?: string;
  advisorId?: string;
  advisorName?: string;
  cropName: string;
  cropVariety?: string;
  season?: string;
  landAreaAcres?: number;
  stage?: string;
  sowingDate?: string;
  expectedHarvest?: string;
  currentIssues?: string;
  soilTestResult?: any;
  waterTestResult?: any;
  recommendations?: any;
  productSuggestions?: any;
  followUpDate?: string;
  completed: boolean;
  notes?: string;
  attachmentUrls: string[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const advisoryApi = {
  create: (data: any) => apiClient.post('/agri/advisory', data).then(unwrap<CropAdvisory>),
  list: (params?: any) => apiClient.get('/agri/advisory', { params }).then(unwrap<CropAdvisory[]>),
  getOne: (id: string) => apiClient.get('/agri/advisory/' + id).then(unwrap<CropAdvisory>),
  update: (id: string, data: any) => apiClient.patch('/agri/advisory/' + id, data).then(unwrap<CropAdvisory>),
  complete: (id: string) => apiClient.post('/agri/advisory/' + id + '/complete').then(unwrap<CropAdvisory>),
};
