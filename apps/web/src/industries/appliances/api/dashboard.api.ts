import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const appliancesDashboardApi = {
  overview: () =>
    apiClient.get('/appliances/dashboard/overview').then(unwrap<any>),
  salesReport: (from: string, to: string) =>
    apiClient.get('/appliances/dashboard/sales-report', { params: { from, to } }).then(unwrap<any>),
  technicianPerformance: (from: string, to: string) =>
    apiClient.get('/appliances/dashboard/technician-performance', { params: { from, to } }).then(unwrap<any>),
};
