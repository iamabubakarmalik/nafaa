import { apiClient } from '@/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const dispatchApi = {
  suggest: (jobId: string) => apiClient.get('/services-biz/dispatch/suggest/' + jobId).then(unwrap<any[]>),
  liveMap: () => apiClient.get('/services-biz/dispatch/live-map').then(unwrap<{ technicians: any[]; activeJobs: any[] }>),
};
