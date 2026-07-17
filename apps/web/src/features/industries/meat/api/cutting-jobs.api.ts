import { apiClient } from '@/api/client';

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
  cutsProduced?: any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const cuttingJobsApi = {
  create: (data: Partial<CuttingJob>) => apiClient.post('/meat/cutting-jobs', data).then(unwrap<CuttingJob>),
  list: (params?: any) => apiClient.get('/meat/cutting-jobs', { params }).then(unwrap<CuttingJob[]>),
  getOne: (id: string) => apiClient.get('/meat/cutting-jobs/' + id).then(unwrap<CuttingJob>),
  complete: (id: string, data: any) => apiClient.post('/meat/cutting-jobs/' + id + '/complete', data).then(unwrap<CuttingJob>),
};
