import { apiClient } from '@/api/client';

export interface TemperatureLog {
  id: string;
  logDate: string;
  temperature: number;
  humidity?: number;
  unit: string;
  location?: string;
  isWithinRange: boolean;
  minLimit?: number;
  maxLimit?: number;
  recordedBy?: string;
  automated: boolean;
  notes?: string;
  alertSent: boolean;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const temperatureApi = {
  create: (data: Partial<TemperatureLog>) =>
    apiClient.post('/pharmacy/temperature-log', data).then(unwrap<TemperatureLog>),
  list: (params?: { location?: string; withinRange?: boolean; from?: string; to?: string }) =>
    apiClient.get('/pharmacy/temperature-log', { params }).then(unwrap<TemperatureLog[]>),
  summary: (days = 7) =>
    apiClient.get('/pharmacy/temperature-log/summary', { params: { days } }).then(unwrap<any>),
};
