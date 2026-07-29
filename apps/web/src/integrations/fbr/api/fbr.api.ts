import { apiClient } from '@core/api/client';
import type {
  FbrConfig, FbrInvoice, FbrInvoiceStatus, FbrMonthlyReport,
} from './fbr.types';

function unwrap<T>(r: any): T {
  if (r?.data?.data !== undefined) return r.data.data as T;
  if (r?.data !== undefined) return r.data as T;
  return r as T;
}

export const fbrApi = {
  getConfig: () =>
    apiClient.get('/integrations/fbr/config').then((r) => unwrap<FbrConfig>(r)),

  updateConfig: (dto: Partial<FbrConfig>) =>
    apiClient.put('/integrations/fbr/config', dto).then((r) => unwrap<FbrConfig>(r)),

  testConnection: () =>
    apiClient.post('/integrations/fbr/test-connection').then((r) => unwrap<{
      success: boolean;
      message: string;
      missing?: string[];
      statusCode?: number;
      environment?: string;
    }>(r)),

  submit: (saleId: string, forceResubmit = false) =>
    apiClient.post('/integrations/fbr/submit', { saleId, forceResubmit }).then((r) => unwrap<any>(r)),

  skip: (saleId: string, reason: string) =>
    apiClient.post('/integrations/fbr/skip', { saleId, reason }).then((r) => unwrap<any>(r)),

  retryPending: () =>
    apiClient.post('/integrations/fbr/retry-pending').then((r) => unwrap<{
      retried: number;
      results: Array<{ saleId: string; success: boolean; error?: string }>;
    }>(r)),

  listInvoices: (params: {
    status?: FbrInvoiceStatus;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) =>
    apiClient
      .get('/integrations/fbr/invoices', { params })
      .then((r) => unwrap<{ items: FbrInvoice[]; total: number }>(r)),

  getInvoice: (id: string) =>
    apiClient.get(`/integrations/fbr/invoices/${id}`).then((r) => unwrap<FbrInvoice>(r)),

  monthlyReport: (year: number, month: number) =>
    apiClient
      .get('/integrations/fbr/reports/monthly', { params: { year, month } })
      .then((r) => unwrap<FbrMonthlyReport>(r)),

  bulkSubmit: (params: { saleIds?: string[]; dateFrom?: string; dateTo?: string; onlyPending?: boolean }) =>
    apiClient.post('/integrations/fbr/bulk-submit', params).then((r) => {
      const d = r?.data?.data ?? r?.data ?? r;
      return d as { total: number; success: number; failed: number; results: Array<{ saleId: string; success: boolean; error?: string }> };
    }),


  getAnalytics: () =>
    apiClient.get('/integrations/fbr/analytics').then((r) => {
      const d = r?.data?.data ?? r?.data ?? r;
      return d as {
        monthlyTrend: Array<{ period: string; gross: number; tax: number; count: number }>;
        statusCounts: Record<string, number>;
        rejectionRate: number;
        totalSubmitted: number;
        totalRejected: number;
        totalPending: number;
        totalSkipped: number;
        topErrors: Array<{ error: string; count: number }>;
        today: { count: number; gross: number; tax: number };
        yesterday: { count: number; gross: number; tax: number };
      };
    }),

};
