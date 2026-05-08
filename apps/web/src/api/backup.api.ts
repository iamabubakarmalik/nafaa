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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const backupApi = {
  summary: () => apiClient.get<{ data: BackupSummary }>('/backup/summary').then(unwrap),
};
