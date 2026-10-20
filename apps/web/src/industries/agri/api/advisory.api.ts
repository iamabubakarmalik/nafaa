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
  /** Advice lines (older rows may hold other shapes). */
  recommendations?: unknown;
  /** Products advised: [{ productId, name }]. */
  productSuggestions?: unknown;
  followUpDate?: string;
  completed: boolean;
  notes?: string;
  attachmentUrls: string[];
  createdAt: string;
  updatedAt: string;
  farmer?: { id: string; fullName: string; phone: string; village?: string | null } | null;
}

export interface AdvisoryInput {
  farmerId?: string | null; advisorName?: string; cropName: string; cropVariety?: string; season?: string; landAreaAcres?: number | null; stage?: string;
  sowingDate?: string | null; expectedHarvest?: string | null; currentIssues?: string; recommendations?: string[]; productSuggestions?: Array<{ productId: string; name: string }>;
  followUpDate?: string | null; notes?: string; completed?: boolean;
}

export type AdvisoryTab = 'open' | 'due' | 'done' | 'all';

export interface AdvisoryPage {
  items: CropAdvisory[];
  total: number;
  page: number;
  limit: number;
  counts: Record<AdvisoryTab, number>;
  analytics: { crops: Array<{ crop: string; notes: number }>; stages: Array<{ stage: string; notes: number }> };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const advisoryApi = {
  create: (data: AdvisoryInput) => apiClient.post('/agri/advisory', data).then(unwrap<CropAdvisory>),
  page: (params: { farmerId?: string; season?: string; search?: string; tab?: AdvisoryTab; page?: number; limit?: number }) => apiClient.get('/agri/advisory/page', { params }).then(unwrap<AdvisoryPage>),
  update: (id: string, data: Partial<AdvisoryInput>) => apiClient.patch('/agri/advisory/' + id, data).then(unwrap<CropAdvisory>),
  complete: (id: string) => apiClient.post('/agri/advisory/' + id + '/complete').then(unwrap<CropAdvisory>),
};
