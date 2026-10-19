import { apiClient } from '@core/api/client';
import type { Technician } from './technicians.api';

export type Suggestion = Technician & { matchScore: number; distanceKm: number | null; openJobs: number };

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const dispatchApi = {
  suggest: (jobId: string) => apiClient.get(`/services-biz/dispatch/suggest/${jobId}`).then(unwrap<Suggestion[]>),
};
