import { apiClient } from './client';

export const exportsApi = {
  salesExcel: (): Promise<Blob> =>
    apiClient.get('/exports/sales/excel', { responseType: 'blob' }).then((r) => r.data),
  productsExcel: (): Promise<Blob> =>
    apiClient.get('/exports/products/excel', { responseType: 'blob' }).then((r) => r.data),
  customersExcel: (): Promise<Blob> =>
    apiClient.get('/exports/customers/excel', { responseType: 'blob' }).then((r) => r.data),
  salesPdf: (): Promise<Blob> =>
    apiClient.get('/exports/sales/pdf', { responseType: 'blob' }).then((r) => r.data),

  // For mobile, get URL with token
  getDownloadUrl: (path: string, token: string) => {
    const baseUrl = (apiClient.defaults.baseURL || '').replace(/\/$/, '');
    return `${baseUrl}${path}?token=${token}`;
  },
};
