import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const petshopDashboardApi = {
  overview: () => apiClient.get('/petshop/dashboard/overview').then(unwrap<any>),
  salesReport: (from: string, to: string) =>
    apiClient.get('/petshop/dashboard/sales-report', { params: { from, to } }).then(unwrap<any>),
  groomerPerformance: (from: string, to: string) =>
    apiClient.get('/petshop/dashboard/groomer-performance', { params: { from, to } }).then(unwrap<any[]>),
  speciesAnalytics: () =>
    apiClient.get('/petshop/dashboard/species-analytics').then(unwrap<any>),
};
