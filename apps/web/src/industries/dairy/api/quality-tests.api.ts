import { apiClient } from '@core/api/client';

export interface QualityTest {
  id: string;
  testNumber: string;
  testedAt: string;
  sourceType: string;
  sourceId?: string;
  sourceName?: string;
  fatContent?: number;
  snfContent?: number;
  proteinContent?: number;
  lactoseContent?: number;
  waterContent?: number;
  phLevel?: number;
  temperature?: number;
  adulterationDetected: boolean;
  adulterationTypes: string[];
  quality?: string;
  passed: boolean;
  actionTaken?: string;
  testMethod?: string;
  notes?: string;
  imageUrls: string[];
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export interface QualitySummary { total: number; passed: number; failed: number; adulteration: number; avgFat: number | null; avgSnf: number | null }

export const qualityTestsApi = {
  all: (params: { from?: string; to?: string; failed?: boolean; sourceType?: string; search?: string }) =>
    apiClient.get('/dairy/quality-tests', { params }).then(unwrap<QualityTest[]>),
  totals: (params: { from?: string; to?: string }) => apiClient.get('/dairy/quality-tests/summary', { params }).then(unwrap<QualitySummary>),
  create: (data: Partial<QualityTest>) => apiClient.post('/dairy/quality-tests', data).then(unwrap<QualityTest>),
  list: (params?: any) => apiClient.get('/dairy/quality-tests', { params }).then(unwrap<QualityTest[]>),
  summary: () => apiClient.get('/dairy/quality-tests/summary').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/dairy/quality-tests/' + id).then(unwrap<QualityTest>),
};
