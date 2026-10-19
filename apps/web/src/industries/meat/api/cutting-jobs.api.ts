import { apiClient } from '@core/api/client';

export interface CuttingJob {
  id: string;
  jobNumber: string;
  slaughterLogId?: string;
  butcherId?: string;
  butcherName?: string;
  inputWeightKg: number;
  outputWeightKg?: number;
  wasteWeightKg?: number;
  yieldPct?: number;
  startedAt: string;
  completedAt?: string;
  durationMin?: number;
  status: string;
  cutsProduced?: CutsJson | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CutsJson {
  source?: { productId: string; name: string } | null;
  cuts?: Array<{ productId: string; name: string; qty: number; unitCost: number }>;
  value?: number;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const cuttingJobsApi = {
  create: (data: { inputWeightKg: number; sourceProductId: string; slaughterLogId?: string; butcherName?: string; notes?: string }) =>
    apiClient.post('/meat/cutting-jobs', data).then(unwrap<CuttingJob>),
  list: (params?: Record<string, string | undefined>) => apiClient.get('/meat/cutting-jobs', { params }).then(unwrap<CuttingJob[]>),
  complete: (id: string, data: { cuts: Array<{ productId: string; kg: number }>; wasteWeightKg?: number; notes?: string }) =>
    apiClient.post('/meat/cutting-jobs/' + id + '/complete', data).then(unwrap<CuttingJob>),
  cancel: (id: string, reason?: string) => apiClient.post('/meat/cutting-jobs/' + id + '/cancel', { reason }).then(unwrap<CuttingJob>),
};
