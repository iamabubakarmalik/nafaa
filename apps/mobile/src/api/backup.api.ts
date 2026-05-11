import { apiClient } from './client';

export interface BackupSummary {
  meta: {
    version: string;
    exportedAt: string;
    tenantId: string;
    tenantName?: string;
  };
  counts: {
    shops: number;
    categories: number;
    products: number;
    customers: number;
    suppliers: number;
    expenses: number;
    sales: number;
    purchases: number;
    stockMovements: number;
    cashRegisters: number;
    transfers: number;
  };
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

export const backupApi = {
  summary: (): Promise<BackupSummary> =>
    apiClient.get('/backup/summary').then((r) => unwrapOne<BackupSummary>(r)),
  download: (): Promise<Blob> =>
    apiClient.get('/backup/download', { responseType: 'blob' }).then((r) => r.data),
};
